/** Numerical candidate only. Native drawing and population integration are absent. */
import { Camera, DataTexture, FloatType, GLSL3, Mesh, NearestFilter, PlaneGeometry, RawShaderMaterial, RGBAFormat, Scene, Vector2, Vector3, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { packPose, type Packed, type Pose } from './data.ts';
export const PASS_NAMES = ['local-positions', 'triangle-areas', 'joined-normals', 'world-diagnostic'] as const;
const vertex = 'precision highp float;in vec3 position;void main(){gl_Position=vec4(position.xy,0.0,1.0);}';
const common = `precision highp float;precision highp int;precision highp sampler2D;
out vec4 result;uniform ivec2 dimensions;uniform int count;
vec4 lookup(highp sampler2D source,int id){ivec2 s=textureSize(source,0);return texelFetch(source,ivec2(id%s.x,id/s.x),0);}
int recordId(){return int(gl_FragCoord.y)*dimensions.x+int(gl_FragCoord.x);}
vec3 rotateYaw(vec3 p,vec2 q){float tx=2.0*(q.x*p.z);float tz=-2.0*(q.x*p.x);return vec3((p.x+q.y*tx)+q.x*tz,p.y,(p.z+q.y*tz)-q.x*tx);}
vec3 transformedDelta(highp sampler2D palette,int j,vec4 h){vec4 c0=lookup(palette,j*4),c1=lookup(palette,j*4+1),c2=lookup(palette,j*4+2),c3=lookup(palette,j*4+3);return ((c0.xyz*h.x+c1.xyz*h.y)+c2.xyz*h.z)+c3.xyz*h.w;}`;
/** Exported for source-layout checks; constructing strings does not compile shaders. */
export function shaders(data: Pick<Packed, 'maxVertexTerms' | 'maxEdgeTerms' | 'maxIncidences'>) {
  for (const n of Object.values(data)) if (!Number.isInteger(n) || n < 0) throw Error('Shader loop counts require complete nonnegative source bounds');
  return {
    local: common + `uniform highp sampler2D vertexHeader,vertexBase,vertexTerms,palette;
void main(){int id=recordId();if(id>=count){result=vec4(0);return;}vec4 base=lookup(vertexBase,id);if(base.w==0.0){result=vec4(0);return;}vec4 h=lookup(vertexHeader,id);vec3 p=base.xyz;for(int k=0;k<${data.maxVertexTerms};k++){if(k>=int(h.y))break;int row=(int(h.x)+k)*2;vec4 value=lookup(vertexTerms,row);int j=int(lookup(vertexTerms,row+1).x);p+=transformedDelta(palette,j,value);}result=vec4(p,1);}`,
    area: common + `uniform highp sampler2D triangleHeader,edgeBase,edgeTerms,palette;
vec3 edge(int start,int n,vec3 base){vec3 p=base;for(int k=0;k<${data.maxEdgeTerms};k++){if(k>=n)break;int row=(start+k)*2;vec4 value=lookup(edgeTerms,row);int j=int(lookup(edgeTerms,row+1).x);p+=transformedDelta(palette,j,value);}return p;}
void main(){int id=recordId();if(id>=count){result=vec4(0);return;}vec4 h=lookup(triangleHeader,id*2);vec3 u=edge(int(h.x),int(h.y),lookup(edgeBase,id*2).xyz);vec3 v=edge(int(h.z),int(h.w),lookup(edgeBase,id*2+1).xyz);result=vec4(cross(u,v),1);}`,
    normal: common + `uniform highp sampler2D vertexHeader,vertexBase,incidence,areas;uniform vec2 rotation;
void main(){int id=recordId();if(id>=count||lookup(vertexBase,id).w==0.0){result=vec4(0);return;}vec4 h=lookup(vertexHeader,id);vec3 n=vec3(0);for(int k=0;k<${data.maxIncidences};k++){if(k>=int(h.w))break;int face=int(lookup(incidence,int(h.z)+k).x);n+=lookup(areas,face).xyz;}if(dot(n,n)<=0.0){result=vec4(0);return;}result=vec4(rotateYaw(normalize(n),rotation),1);}`,
    world: common + `uniform highp sampler2D localPositions;uniform vec2 rotation;uniform vec3 body,origin;uniform float scale;
void main(){int id=recordId();if(id>=count){result=vec4(0);return;}vec4 local=lookup(localPositions,id);if(local.w==0.0){result=vec4(0);return;}result=vec4((rotateYaw(local.xyz,rotation)+body)*scale+origin,1);}`,
  };
}
export interface Diagnostic { readonly wrongNormalYaw?: number }
export interface Frame {
  readonly serial: number; readonly localPositions: WebGLRenderTarget; readonly triangleAreas: WebGLRenderTarget;
  readonly normals: WebGLRenderTarget; readonly worldPositions: WebGLRenderTarget; readonly uploadMs: number; readonly submissionMs: number;
  readonly passNames: typeof PASS_NAMES;
}
/** The constructor allocates resources; only render submits or compiles a shader. */
export class DifferentialGpu {
  private readonly textures: DataTexture[] = []; private readonly materials: RawShaderMaterial[] = [];
  private readonly targets: WebGLRenderTarget[] = []; private readonly scene = new Scene(); private readonly camera = new Camera();
  private readonly quad: Mesh; private readonly palette: DataTexture; private serial = 0; private disposed = false;
  private readonly local: WebGLRenderTarget; private readonly areas: WebGLRenderTarget; private readonly normals: WebGLRenderTarget; private readonly world: WebGLRenderTarget;
  constructor(private readonly renderer: WebGLRenderer, readonly data: Packed) {
    if (!renderer.capabilities.isWebGL2 || !renderer.extensions.has('EXT_color_buffer_float')) throw Error('Differential GPU requires WebGL2 and complete RGBA32F color targets');
    const width = Math.min(256, renderer.capabilities.maxTextureSize);
    const texture = (values: Float32Array, fixedWidth?: number) => {
      const w = fixedWidth ?? Math.min(width, Math.max(1, values.length / 4)), h = Math.max(1, Math.ceil(values.length / 4 / w));
      if (h > renderer.capabilities.maxTextureSize) throw Error('Complete differential source texture exceeds this adapter limit');
      const bytes = new Float32Array(w * h * 4); bytes.set(values); const t = new DataTexture(bytes, w, h, RGBAFormat, FloatType);
      t.minFilter = t.magFilter = NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; this.textures.push(t); return t;
    };
    const target = (count: number) => { const h = Math.ceil(count / width); if (h > renderer.capabilities.maxTextureSize) throw Error('Complete differential target exceeds this adapter limit'); const t = new WebGLRenderTarget(width, h, { type: FloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false }); this.targets.push(t); return t; };
    const header = texture(data.vertexHeader, width), base = texture(data.vertexBase, width), terms = texture(data.vertexTerms), triangleHeader = texture(data.triangleHeader), edgeBase = texture(data.edgeBase), edgeTerms = texture(data.edgeTerms), incidence = texture(data.incidence);
    this.palette = texture(new Float32Array(53 * 16), 4);
    this.local = target(data.capacity); this.areas = target(data.triangleCount); this.normals = target(data.capacity); this.world = target(data.capacity);
    const source = shaders({ maxVertexTerms: data.maxVertexTerms, maxEdgeTerms: data.maxEdgeTerms, maxIncidences: data.maxIncidences });
    const palette = { value: this.palette }, rotation = { value: new Vector2() };
    const material = (fragmentShader: string, t: WebGLRenderTarget, count: number, uniforms: Record<string, { value: unknown }>) => { const m = new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: vertex, fragmentShader, depthTest: false, depthWrite: false, uniforms: { dimensions: { value: new Vector2(t.width, t.height) }, count: { value: count }, ...uniforms } }); this.materials.push(m); return m; };
    material(source.local, this.local, data.capacity, { vertexHeader: { value: header }, vertexBase: { value: base }, vertexTerms: { value: terms }, palette });
    material(source.area, this.areas, data.triangleCount, { triangleHeader: { value: triangleHeader }, edgeBase: { value: edgeBase }, edgeTerms: { value: edgeTerms }, palette });
    material(source.normal, this.normals, data.capacity, { vertexHeader: { value: header }, vertexBase: { value: base }, incidence: { value: incidence }, areas: { value: this.areas.texture }, rotation: { value: new Vector2() } });
    material(source.world, this.world, data.capacity, { localPositions: { value: this.local.texture }, rotation, body: { value: new Vector3() }, origin: { value: new Vector3() }, scale: { value: 1 } });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.materials[0]); this.quad.frustumCulled = false; this.scene.add(this.quad);
  }
  render(pose: Pose, diagnostic: Diagnostic = {}): Frame {
    if (this.disposed) throw Error('Differential GPU adapter was disposed');
    if (Object.keys(diagnostic).some(k => k !== 'wrongNormalYaw') || (diagnostic.wrongNormalYaw !== undefined && !Number.isFinite(diagnostic.wrongNormalYaw))) throw Error('Diagnostic supports only an explicitly finite normal-yaw offset');
    const started = performance.now(), packed = packPose(pose, this.data.referencePalette); (this.palette.image.data as Float32Array).set(packed.delta); this.palette.needsUpdate = true;
    const normal = this.materials[2]!.uniforms, world = this.materials[3]!.uniforms;
    world.rotation!.value.set(...packed.rotation); world.body!.value.set(...packed.body); world.origin!.value.set(...packed.origin); world.scale!.value = packed.scale;
    const normalYaw = pose.yaw + (diagnostic.wrongNormalYaw ?? 0); normal.rotation!.value.set(Math.sin(normalYaw / 2), Math.cos(normalYaw / 2));
    const uploadMs = performance.now() - started, previous = this.renderer.getRenderTarget(), serial = ++this.serial;
    try { for (let i = 0; i < PASS_NAMES.length; i++) { this.quad.material = this.materials[i]!; this.renderer.setRenderTarget([this.local, this.areas, this.normals, this.world][i]!); const gl = this.renderer.getContext(); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error(PASS_NAMES[i] + ' RGBA32F framebuffer is incomplete'); this.renderer.render(this.scene, this.camera); } } finally { this.renderer.setRenderTarget(previous); }
    return Object.freeze({ serial, localPositions: this.local, triangleAreas: this.areas, normals: this.normals, worldPositions: this.world, uploadMs, submissionMs: performance.now() - started - uploadMs, passNames: PASS_NAMES });
  }
  readback(frame: Frame) {
    if (this.disposed || frame.serial !== this.serial) throw Error('Differential frame was disposed or replaced before full readback');
    const read = (target: WebGLRenderTarget) => { const a = new Float32Array(target.width * target.height * 4); this.renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, a); return a; };
    return { localPositions: read(frame.localPositions), triangleAreas: read(frame.triangleAreas), normals: read(frame.normals), worldPositions: read(frame.worldPositions) };
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const t of this.textures) t.dispose(); for (const t of this.targets) t.dispose(); for (const m of this.materials) m.dispose(); this.quad.geometry.dispose(); }
}
