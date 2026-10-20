import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl';
import { MERCATOR_ORIGIN, METERS_TO_MERCATOR, VERTEX_FLOATS, projectLocal, type CampusData, type DetailGeometry } from './building-geometry.ts';
export { prepareBuildingDetails } from './building-geometry.ts';

export interface BuildingDetailStats {
  ready: boolean;
  buildingCount: number;
  roofTriangles: number;
  facadeTriangles: number;
  triangles: number;
  bytes: number;
  /** CPU geometry generation runs in the dedicated worker. */
  buildMs: number;
  /** Longest observed main-thread shader setup or mesh upload slice. */
  maxSliceMs: number;
  shaderReady: boolean;
  /** Asynchronous compiler wall time; not a main-thread blocking duration. */
  compileMs: number;
  uploadMs: number;
  drawCalls: number;
  lastDrawDetail: 'none' | 'roofs' | 'facades';
  error: string | null;
}

export interface BuildingDetailsLayer extends CustomLayerInterface {
  setSelected(id: string | null): void;
  readonly stats: Readonly<BuildingDetailStats>;
}

const cachedGeometry = new WeakMap<CampusData, { geometry: DetailGeometry; buildMs: number }>();
const SHADER_APPROACH_ZOOM = 12;
const vertexShader = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec3 a_color;
layout(location=3) in vec2 a_uv;
layout(location=4) in float a_kind;
layout(location=5) in float a_building;
uniform mat4 u_matrix;
uniform float u_selected;
out vec3 v_color;
out vec2 v_uv;
out vec2 v_position;
flat out float v_kind;
void main() {
  gl_Position = u_matrix * vec4(a_position, 1.0);
  float illumination = 0.76 + 0.24 * abs(dot(normalize(a_normal), normalize(vec3(-0.45,0.6,0.85))));
  vec3 tint = abs(a_building - u_selected) < 0.1 ? mix(a_color, vec3(0.90,0.65,0.35),0.6) : a_color;
  v_color = tint * illumination;
  v_uv = a_uv;
  v_kind = a_kind;
  v_position = a_position.xy;
}`;
const fragmentShader = `#version 300 es
precision highp float;
in vec3 v_color;
in vec2 v_uv;
in vec2 v_position;
flat in float v_kind;
uniform vec2 u_focus;
uniform float u_radius;
out vec4 outColor;
void main() {
  vec3 tint = v_color;
  if (v_kind < 0.5) {
    // Shallow tile courses, kept quiet and anti-aliased as they recede.
    float frequency = 1.45;
    float footprint = max(fwidth(v_uv.x),fwidth(v_uv.y)) * frequency;
    float course = abs(fract(v_uv.y * frequency) - 0.5);
    float seam = 1.0 - smoothstep(0.015,0.055 + footprint,course);
    tint *= 1.0 - 0.065 * seam * (1.0-smoothstep(0.3,0.8,footprint));
  } else if (abs(v_kind - 2.0) > 0.1) {
    // Nearby elevations use meter-sized bays, recessed glazing and stone
    // surrounds. Main Quad's lower storey reads as a shaded arcade.
    float distanceToFocus = distance(v_position,u_focus);
    float detail = 1.0-smoothstep(u_radius*0.72,u_radius,distanceToFocus);
    vec2 cell = fract(v_uv / vec2(3.8,3.6));
    vec2 edge = abs(cell - vec2(0.5,0.53));
    vec2 aa = max(fwidth(cell),vec2(0.008));
    float opening = (1.0-smoothstep(0.21-aa.x,0.21+aa.x,edge.x)) * (1.0-smoothstep(0.26-aa.y,0.26+aa.y,edge.y));
    float surround = (1.0-smoothstep(0.245-aa.x,0.245+aa.x,edge.x)) * (1.0-smoothstep(0.29-aa.y,0.29+aa.y,edge.y));
    vec3 recess = mix(vec3(0.42,0.46,0.43),vec3(0.55,0.57,0.51),smoothstep(0.34,0.7,cell.y));
    if (v_kind > 2.5 && v_uv.y < 3.6) {
      float x = (cell.x-0.5)*3.8;
      float y = v_uv.y;
      float arch = max(abs(x)-1.12, y>2.1 ? length(vec2(x,y-2.1))-1.12 : -1.0);
      opening = (1.0-smoothstep(-0.04,0.04,arch))*smoothstep(0.08,0.18,y);
      surround = (1.0-smoothstep(0.10,0.20,arch))*smoothstep(0.03,0.1,y);
      recess = vec3(0.48,0.43,0.34);
    }
    tint = mix(tint,tint*1.035,surround*detail);
    float recessStrength = v_kind > 2.5 && v_uv.y >= 3.6 ? 0.48 : 0.75;
    tint = mix(tint,recess,opening*recessStrength*detail);
    // A thin light sill and dark upper reveal supply depth without separate
    // per-window objects or draw calls.
    float sill = (1.0-smoothstep(0.018,0.035,abs(cell.y-0.27))) * step(edge.x,0.245);
    tint = mix(tint,v_color*1.08,sill*detail);
  }
  outColor = vec4(tint,1.0);
}`;

interface GpuMesh { vao: WebGLVertexArrayObject; buffer: WebGLBuffer; vertices: number }

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const result = gl.createShader(type);
  if (!result) throw new Error('Campus detail shader could not be allocated.');
  gl.shaderSource(result, source); gl.compileShader(result);
  return result;
}

interface PendingProgram { program: WebGLProgram; shaders: WebGLShader[]; parallel: KHR_parallel_shader_compile | null; started: number }

function beginProgram(gl: WebGL2RenderingContext): PendingProgram {
  // Request the extension before compilation. Reading COMPILE_STATUS or
  // LINK_STATUS here would synchronously wait for the GPU compiler.
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const started = performance.now();
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexShader);
  let fragment: WebGLShader | undefined;
  let result: WebGLProgram | null = null;
  try {
    fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    result = gl.createProgram();
    if (!result) throw new Error('Campus detail GPU program could not be allocated.');
    gl.attachShader(result, vertex); gl.attachShader(result, fragment); gl.linkProgram(result);
    return { program: result, shaders: [vertex, fragment], parallel, started };
  } catch (error) {
    if (result) gl.deleteProgram(result);
    gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment);
    throw error;
  }
}

function upload(gl: WebGL2RenderingContext, values: Float32Array): GpuMesh {
  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  if (!vao || !buffer) {
    if (vao) gl.deleteVertexArray(vao); if (buffer) gl.deleteBuffer(buffer);
    throw new Error('Campus detail GPU buffers could not be allocated.');
  }
  try {
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
    for (const [attribute, size, offset] of [[0,3,0],[1,3,3],[2,3,6],[3,2,9],[4,1,11],[5,1,12]]) {
      gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, VERTEX_FLOATS * 4, offset * 4);
    }
    return { vao, buffer, vertices: values.length / VERTEX_FLOATS };
  } catch (error) {
    gl.deleteVertexArray(vao); gl.deleteBuffer(buffer); throw error;
  } finally { gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null); }
}

/** Mercator-only native layer: two batched draws, shared depth, no animation loop. */
export function createBuildingDetailsLayer(data: CampusData, onError?: (message: string) => void): BuildingDetailsLayer {
  let map: MapLibreMap | undefined, context: WebGL2RenderingContext | undefined;
  let gpuProgram: WebGLProgram | undefined, roofs: GpuMesh | undefined, facades: GpuMesh | undefined;
  let compiling: PendingProgram | undefined;
  let idleCompile: number | undefined, compileTimer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | undefined, removed = false, selected = -1;
  let pending = cachedGeometry.get(data);
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const matrix = new Float32Array(16);
  const indices = new Map(data.features.map((feature, index) => [String(feature.properties?.id), index]));
  const state: BuildingDetailStats = { ready: false, buildingCount: data.features.length, roofTriangles: 0, facadeTriangles: 0, triangles: 0, bytes: 0, buildMs: 0, maxSliceMs: 0, shaderReady: false, compileMs: 0, uploadMs: 0, drawCalls: 0, lastDrawDetail: 'none', error: null };
  const destroyGpu = () => {
    if (idleCompile !== undefined) { window.cancelIdleCallback(idleCompile); idleCompile = undefined; }
    if (compileTimer !== undefined) { clearTimeout(compileTimer); compileTimer = undefined; }
    if (context) {
      for (const mesh of [roofs, facades]) if (mesh) { context.deleteVertexArray(mesh.vao); context.deleteBuffer(mesh.buffer); }
      if (gpuProgram) context.deleteProgram(gpuProgram);
      if (compiling) { context.deleteProgram(compiling.program); compiling.shaders.forEach(value => context!.deleteShader(value)); }
    }
    compiling = undefined; roofs = undefined; facades = undefined; gpuProgram = undefined; state.ready = false; state.shaderReady = false;
  };
  const fail = (message: string) => {
    state.error = message; worker?.terminate(); worker = undefined; destroyGpu(); onError?.(message);
  };
  const finishProgram = () => {
    if (!context || !compiling || removed) return;
    if (compiling.parallel && !context.getProgramParameter(compiling.program, compiling.parallel.COMPLETION_STATUS_KHR)) { map?.triggerRepaint(); return; }
    const started = performance.now();
    if (!context.getProgramParameter(compiling.program, context.LINK_STATUS)) {
      fail(`Campus detail GPU program could not link: ${context.getProgramInfoLog(compiling.program) ?? 'no GPU diagnostic'}`); return;
    }
    gpuProgram = compiling.program;
    compiling.shaders.forEach(value => context!.deleteShader(value));
    state.compileMs = performance.now() - compiling.started;
    compiling = undefined; state.shaderReady = true;
    for (const name of ['u_matrix','u_selected','u_focus','u_radius']) uniforms[name] = context.getUniformLocation(gpuProgram, name);
    state.maxSliceMs = Math.max(state.maxSliceMs, performance.now() - started);
    map?.triggerRepaint();
  };
  const warmProgram = () => {
    // Regional startup needs only the basemap. Begin the extra GPU work while
    // approaching campus, ahead of geometry generation at zoom 14.
    if (!context || !map || map.getZoom() < SHADER_APPROACH_ZOOM || compiling || gpuProgram || removed || state.error) return;
    const started = performance.now();
    try {
      compiling = beginProgram(context);
      state.maxSliceMs = Math.max(state.maxSliceMs, performance.now() - started);
      if (!compiling.parallel) {
        // Older WebGL2 implementations lack nonblocking completion polling.
        // Finish during approach idle time rather than blocking a detail draw.
        if (typeof window.requestIdleCallback === 'function') idleCompile = window.requestIdleCallback(() => { idleCompile = undefined; finishProgram(); }, { timeout: 800 });
        else compileTimer = setTimeout(() => { compileTimer = undefined; finishProgram(); }, 0);
      }
    } catch (error) { fail(error instanceof Error ? error.message : 'Campus detail shaders could not initialize.'); }
  };
  const lost = () => { destroyGpu(); };
  const restored = () => { if (!removed) { warmProgram(); map?.triggerRepaint(); } };
  return {
    id: 'stanford-architectural-details', type: 'custom', renderingMode: '3d',
    get stats() { return Object.freeze({ ...state }); },
    setSelected(id) { selected = id === null ? -1 : (indices.get(id) ?? -1); map?.triggerRepaint(); },
    onAdd(owner, gl) { map = owner; context = gl; removed = false; owner.on('webglcontextlost', lost); owner.on('webglcontextrestored', restored); warmProgram(); },
    onRemove() {
      removed = true; worker?.terminate(); worker = undefined; pending = undefined;
      map?.off('webglcontextlost', lost); map?.off('webglcontextrestored', restored);
      destroyGpu(); map = undefined; context = undefined;
    },
    render(gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
      state.drawCalls = 0; state.lastDrawDetail = 'none';
      if (!map || removed || state.error) return;
      warmProgram();
      if (compiling?.parallel) finishProgram();
      if (state.error || map.getZoom() < 14) return;
      if (!state.ready) {
        if (!pending) {
          if (!worker) {
            worker = new Worker(new URL('./building-worker.ts', import.meta.url), { type: 'module' });
            worker.onmessage = (event: MessageEvent<{ geometry?: DetailGeometry; buildMs?: number; error?: string }>) => {
              if (removed) return;
              worker?.terminate(); worker = undefined;
              if (event.data.error || !event.data.geometry) { fail(event.data.error ?? 'Campus geometry worker returned no mesh.'); return; }
              pending = { geometry: event.data.geometry, buildMs: event.data.buildMs ?? 0 };
              cachedGeometry.set(data, pending); map?.triggerRepaint();
            };
            worker.onerror = () => fail('Campus architectural detail could not load. Reload to retry its geometry worker.');
            worker.postMessage(data);
          }
          return;
        }
        if (!state.shaderReady) return;
        const started = performance.now();
        try {
          roofs = upload(gl, pending.geometry.roofs); facades = upload(gl, pending.geometry.facades);
          state.uploadMs = performance.now() - started;
          Object.assign(state, { ready: true, roofTriangles: pending.geometry.roofTriangles, facadeTriangles: pending.geometry.facadeTriangles,
            triangles: pending.geometry.triangles, bytes: pending.geometry.bytes, buildMs: pending.buildMs, maxSliceMs: Math.max(state.maxSliceMs, state.uploadMs) });
        } catch (error) { fail(error instanceof Error ? error.message : 'Campus GPU detail could not initialize.'); return; }
      }
      const main = options.defaultProjectionData.mainMatrix;
      // Compose in double precision before sending a local matrix to the GPU.
      // Sending large global coordinates in the float32 vertex buffer loses the
      // centimetres needed by window planes and eaves.
      for (let row = 0; row < 4; row++) {
        matrix[row] = main[row] * METERS_TO_MERCATOR;
        matrix[4 + row] = -main[4 + row] * METERS_TO_MERCATOR;
        matrix[8 + row] = main[8 + row] * METERS_TO_MERCATOR;
        matrix[12 + row] = main[row] * MERCATOR_ORIGIN[0] + main[4 + row] * MERCATOR_ORIGIN[1] + main[12 + row];
      }
      const focus = projectLocal(map.getCenter().toArray());
      gl.useProgram(gpuProgram!); gl.uniformMatrix4fv(uniforms.u_matrix, false, matrix); gl.uniform1f(uniforms.u_selected, selected);
      gl.uniform2f(uniforms.u_focus, focus[0], focus[1]); gl.uniform1f(uniforms.u_radius, Math.max(450, 1600 / Math.pow(1.35, map.getZoom() - 16)));
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      gl.bindVertexArray(roofs!.vao); gl.drawArrays(gl.TRIANGLES, 0, roofs!.vertices);
      state.drawCalls = 1; state.lastDrawDetail = 'roofs';
      if (map.getZoom() >= 15.5) { gl.bindVertexArray(facades!.vao); gl.drawArrays(gl.TRIANGLES, 0, facades!.vertices); state.drawCalls = 2; state.lastDrawDetail = 'facades'; }
      gl.bindVertexArray(null);
    },
  };
}
