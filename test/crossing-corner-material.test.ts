/** Bound: exact cached518 decode, original mesh/UV preservation, emitted scalar
 * eligibility arithmetic and complete plugin fetch. No pixel/reflectance claim. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { BackSide, DoubleSide, BufferAttribute, BufferGeometry, Group, Matrix3, Material, Mesh, MeshNormalMaterial, MeshStandardMaterial, Scene, ShaderLib, Texture, Vector3 } from "three";
import { parseB3dm, parseGlb, readBatchColumn } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { CROSSING_CORNER, CROSSING_CORNER_GLSL, prepareCrossingCorner } from "../src/scene/crossing-corner-material.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { delightInPlace } from "../src/scene/delight.js";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";

const bytes = readFileSync(new URL("../data/scene/buildings/data/data518.b3dm", import.meta.url));
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
expect(sha(bytes), "Restore the reviewed cached data518; no remote fetch or substituted source").toBe("5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b");
const b3dm = parseB3dm(bytes), glb = parseGlb(b3dm.glb);
const decoded = await decodePrimitive(glb.json, glb.binary!, glb.json.meshes![0]!.primitives[1]!, true);
const untextured = await decodePrimitive(glb.json, glb.binary!, glb.json.meshes![0]!.primitives[0]!, true);
const gml = readBatchColumn(b3dm.batchTableJson, b3dm.batchTableBinary, "gml_id", b3dm.featureTableJson.BATCH_LENGTH as number);
const geometry = new BufferGeometry();
geometry.setAttribute("position", new BufferAttribute(decoded.positions, 3));
geometry.setAttribute("normal", new BufferAttribute(decoded.surface!.normals, 3));
geometry.setAttribute("uv", new BufferAttribute(decoded.surface!.uv!, 2));
geometry.setAttribute("_batchid", new BufferAttribute(decoded.batchIds!, 1));
geometry.setIndex(new BufferAttribute(decoded.surface!.indices, 1));
afterAll(() => geometry.dispose());
function fixture(identity = true) {
  const scene = new Group() as Group & { batchTable: { getDataFromId(id: number): Record<string, unknown> } };
  scene.batchTable = { getDataFromId: id => ({ gml_id: identity ? gml[id] : "bldg_wrong" }) };
  const texture = new Texture({ width: 1, height: 1 } as never); texture.flipY = false;
  const material = new MeshStandardMaterial({ map: texture });
  const mesh = new Mesh(geometry.clone(), material);
  const plainGeometry = new BufferGeometry(); plainGeometry.setAttribute("position", new BufferAttribute(untextured.positions, 3)); plainGeometry.setAttribute("normal", new BufferAttribute(untextured.surface!.normals, 3)); plainGeometry.setAttribute("_batchid", new BufferAttribute(untextured.batchIds!, 1)); plainGeometry.setIndex(new BufferAttribute(untextured.surface!.indices, 1));
  const plainMaterial = new MeshStandardMaterial(), plain = new Mesh(plainGeometry, plainMaterial); scene.add(plain);
  scene.matrix.fromArray(glb.json.nodes![1]!.matrix!); scene.matrixAutoUpdate = false; scene.add(mesh); scene.updateMatrixWorld(true);
  return { scene, mesh, plain, material, texture, dispose() { const owned = new Set<{ dispose(): void }>(); scene.getObjectByName("crossing-frontage-surround")?.traverse(object => { if (object instanceof Mesh) { owned.add(object.geometry); owned.add(object.material as MeshStandardMaterial); if(object.customDepthMaterial)owned.add(object.customDepthMaterial);if(object.customDistanceMaterial)owned.add(object.customDistanceMaterial); } }); for (const resource of owned) resource.dispose(); plainGeometry.dispose(); plainMaterial.dispose(); mesh.geometry.dispose(); material.map?.dispose(); if (material.map !== texture) texture.dispose(); material.dispose(); } };
}
function sample(mesh: Mesh, face: number, weights: number[]) {
  const p = new Vector3(), n = new Vector3(), uv = [0, 0];
  for (let i = 0; i < 3; i++) {
    const id = mesh.geometry.index!.getX(face * 3 + i), weight = weights[i]!;
    p.addScaledVector(new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), id).applyMatrix4(mesh.matrixWorld), weight);
    n.addScaledVector(new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("normal"), id).applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld)), weight);
    uv[0]! += mesh.geometry.getAttribute("uv").getX(id) * weight; uv[1]! += mesh.geometry.getAttribute("uv").getY(id) * weight;
  }
  return [...p.toArray(), ...n.normalize().toArray(), ...uv, 1];
}
// Evaluate the actual emitted scalar predicate, not a duplicate CPU classifier.
const scalar = CROSSING_CORNER_GLSL.split("float mapsCrossingCorner(")[0]!.replace(/float (mapsCorner\w+)\(/g, "function $1(").replace(/float (\w+)(?=\s*[,\)])/g, "$1").replace(/(?:float|bool) (\w+)\s*=/g, "let $1 =");
const smoothstep = (lo: number, hi: number, v: number) => { const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return t*t*(3-2*t); };
const predicate = new Function("abs", "smoothstep", scalar + "return mapsCornerWeight;")(Math.abs, smoothstep) as (...values: number[]) => number;
const cpuDelighter = { apply(pixels: Uint8ClampedArray, _width: number, _height: number, settings: Parameters<typeof delightInPlace>[1]) { delightInPlace(pixels, settings); } };

describe("source-bound lower crossing frontage", () => {
  it("admits both decoded lower triangles and excludes upper, side, wrong UV/normal/plane", () => {
    const f = fixture();
    try {
      const lower = sample(f.mesh, 494, [.6, .08, .32]); expect(predicate(...lower)).toBe(1);
      expect(predicate(...sample(f.mesh, 495, [.05, .05, .9]))).toBe(1);
      expect(predicate(...sample(f.mesh, 494, [.15, .7, .15]))).toBe(0);
      expect(predicate(...sample(f.mesh, 481, [.6, .08, .32]))).toBe(0);
      for (const mutate of [(v: number[]) => { v[7] = .8; }, (v: number[]) => { v[8] = 0; }, (v: number[]) => { v[3]! *= -1; v[4]! *= -1; v[5]! *= -1; }, (v: number[]) => { v[2]! += .02; }]) {
        const v = lower.slice(); mutate(v); expect(predicate(...v)).toBe(0);
      }
      const y0 = sample(f.mesh, 494, [1,0,0])[1]!, y1 = sample(f.mesh, 494, [0,1,0])[1]!;
      const t = (27.2-y0)/(y1-y0); const transition = sample(f.mesh,494,[.8-t,t,.2]);
      expect(predicate(...transition)).toBeGreaterThan(0); expect(predicate(...transition)).toBeLessThan(1);
    } finally { f.dispose(); }
  });
  it.each(["good", "wrong-bytes", "wrong-gml", "wrong-uv", "other-lod"])("checks %s through actual tile fetch/plugin, retaining source arrays", async mode => {
    const f = fixture(mode !== "wrong-gml"); const oldArrays = ["position","normal","uv","_batchid"].map(n => sha(new Uint8Array(f.mesh.geometry.getAttribute(n).array.buffer))); const indices = sha(new Uint8Array(f.mesh.geometry.index!.array.buffer));
    const plugin = new FacadeTexturePlugin({ ...DEFAULT_FACADE_OPTIONS, signageIntensity: { value: 1 }, style: createFacadeStyle(worldStyle("satellite")) }, cpuDelighter);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(mode === "wrong-bytes" ? new Uint8Array([1,2,3]) : Uint8Array.from(bytes))));
    vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([150,150,150,255]) }; } }; } });
    try {
      if (mode === "wrong-bytes") { await expect(plugin.fetchData("/scene/buildings/data/data518.b3dm", {})).rejects.toThrow(/SHA-256/); return; }
      if (mode === "other-lod") { prepareCrossingCorner(f.scene,"data/data517.b3dm",undefined); expect(f.mesh.geometry.getAttribute("mapsCornerEligible")).toBeUndefined(); return; }
      await plugin.fetchData("/scene/buildings/data/data518.b3dm", {});
      if (mode === "wrong-uv") { f.texture.offset.set(.1,.2); await expect(plugin.processTileModel(f.scene,{ content: { uri: CROSSING_CORNER.tileUri } })).rejects.toThrow(/UV0-orientation/); expect(f.material.map).toBe(f.texture); return; }
      await plugin.processTileModel(f.scene,{ content: { uri: CROSSING_CORNER.tileUri } });
      const sections = buildingSections(f.scene,CROSSING_CORNER.tileUri); for (const section of sections) section.geometry.dispose();
      expect(f.plain.geometry.getAttribute("mapsCornerEligible")).toBeUndefined();
      const attribute = f.mesh.geometry.getAttribute("mapsCornerEligible");
      if (mode === "wrong-gml") { expect(attribute).toBeUndefined(); expect(f.material.userData.mapsCrossingCorner).toBeUndefined(); }
      else {
        expect(attribute.count).toBe(decoded.vertexCount); // Exactly4 bytes per vertex on this bound mesh.
        expect(attribute.array.byteLength).toBe(decoded.vertexCount*4);
        const faceVertex = f.mesh.geometry.index!.getX(494*3); expect(attribute.getX(faceVertex)).toBe(1);
        expect(Array.from(attribute.array).some(v=>v===0)).toBe(true);
        const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader }; f.material.onBeforeCompile(shader as never,{} as never);
        expect(shader.vertexShader).toContain("mapsCornerBinding = mapsCornerEligible");
        expect(shader.fragmentShader).toContain("mapsCrossingCorner(mapsWorld, mapsNormal, mapsSourceUv, mapsCornerBinding)");
        expect(shader.fragmentShader).toContain("* (1.0 - corner)");
        expect(shader.fragmentShader).toContain("metalnessFactor = mix(metalnessFactor, 0.0, corner)");
        expect(shader.fragmentShader.indexOf("float corner =")).toBeGreaterThan(shader.fragmentShader.indexOf("} else if (mapsGrid > 0.5)"));
      }
      expect(["position","normal","uv","_batchid"].map(n=>sha(new Uint8Array(f.mesh.geometry.getAttribute(n).array.buffer)))).toEqual(oldArrays);
      expect(sha(new Uint8Array(f.mesh.geometry.index!.array.buffer))).toBe(indices);
    } finally { vi.unstubAllGlobals(); f.dispose(); }
  });
});
import { buildingSections } from "../src/scene/cutout-sections.js";
import { addCrossingFrontage, getCrossingFrontageNormalMaterial } from "../src/scene/crossing-frontage.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";
import { decodeMesh } from "../src/world/mesh.js";
import { surfaceSampler } from "../src/world/surface-sampler.js";
import type { NetworkData } from "../src/world/network-data.js";
import type { Tile } from "3d-tiles-renderer/core";
import type { TilesRenderer } from "3d-tiles-renderer";

// Bound: actual pinned photo + accepted pavement + preserved walking polylines.
// The conservative whole surround footprint clears a 0.4 m body envelope; this
// static check makes no crowd, route completion or animation claim.
it("grounds the source-aligned surround above preserved pavement, clear of walking bodies", () => {
  const f = fixture();
  try {
    prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    const group = f.scene.getObjectByName("crossing-frontage-surround")!; expect(group).toBeDefined();
    addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256); expect(f.scene.children.filter(o=>o.name===group.name)).toHaveLength(1);
    f.scene.updateMatrixWorld(true);
    const pavementBytes=readFileSync(new URL("../data/scene/pavements.mesh",import.meta.url));
    expect(sha(pavementBytes)).toBe("841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6");
    const support=surfaceSampler(decodeMesh(pavementBytes),true);
    const points: Vector3[]=[];
    group.traverse(object=>{if(!(object instanceof Mesh))return;const p=object.geometry.getAttribute("position");for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);points.push(v);if(v.y<16){const y=support(v.x,v.z);expect(y, `No pavement beneath jamb foot ${v.toArray()}`).toBeDefined();expect(v.y-y!).toBeGreaterThanOrEqual(-.00001);expect(v.y-y!).toBeLessThan(.002);}}});
    const n=new Vector3(...CROSSING_CORNER.normal),o=new Vector3(...CROSSING_CORNER.origin),u=new Vector3(n.z,0,-n.x);
    const local=(p:{x:number;z:number})=>{const d=new Vector3(p.x,0,p.z).sub(o);return [d.dot(u),d.dot(n)] as const;};
    const planar=points.map(local),lo=Math.min(...planar.map(p=>p[0])),hi=Math.max(...planar.map(p=>p[0]));
    expect(Math.min(...planar.map(p=>p[1]))).toBeCloseTo(.01,4);expect(Math.max(...planar.map(p=>p[1]))).toBeCloseTo(.35,4);
    expect(Math.max(...points.map(p=>p.y))).toBeLessThan(19);
    const networkBytes=readFileSync(new URL("../data/network/network.json",import.meta.url));expect(sha(networkBytes)).toBe("314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677");
    const network=JSON.parse(networkBytes.toString()) as NetworkData;
    // Intersect every polyline segment with the surround rectangle expanded by
    // 0.4 m. This overstates its occupied volume and needs no sampling interval.
    for(const walk of network.walks)for(let i=1;i<walk.points.length;i++){
      const a=local(walk.points[i-1]!),b=local(walk.points[i]!);let enter=0,leave=1;
      for(const [axis,min,max] of [[0,lo-.4,hi+.4],[1,.01-.4,.35+.4]] as const){const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-12){if(a[axis]<min||a[axis]>max){leave=-1;break;}}else{const p=(min-a[axis])/delta,q=(max-a[axis])/delta;enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));}}
      expect(enter>leave,`Walking envelope ${walk.id}:${i} intersects surround`).toBe(true);
    }
  } finally { f.dispose(); }
});

it.each(["transfer","cancel","reject"])("uses existing tile ownership to release new frontage resources on %s", async mode => {
  const f=fixture(),abort=new AbortController();let transactions: ReturnType<typeof installTileTransactions>;
  const counts=new Map<object,number>();
  const tile={content:{uri:CROSSING_CORNER.tileUri},engineData:{}} as Tile & {engineData:Record<string,unknown>};
  const renderer={
    async parseTile(_buffer:ArrayBuffer,staged:typeof tile){staged.engineData.scene=f.scene;await transactions.process(f.scene,staged,async()=>{
      prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
      f.scene.getObjectByName("crossing-frontage-surround")!.traverse(object=>{if(object instanceof Mesh)for(const resource of [object.geometry,object.material as MeshStandardMaterial,object.customDepthMaterial!,object.customDistanceMaterial!,getCrossingFrontageNormalMaterial(object)!])if(!counts.has(resource)){counts.set(resource,0);resource.addEventListener("dispose",()=>counts.set(resource,counts.get(resource)!+1));}});
      if(mode==="cancel")abort.abort();if(mode==="reject")throw Error("controlled after-frontage failure");return ()=>{};
    });},disposeTile() {},
  };
  transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
  const parse=renderer.parseTile as unknown as (bytes:ArrayBuffer,t:Tile,ext:string,url:string,signal:AbortSignal)=>Promise<void>;
  if(mode==="reject")await expect(parse(new ArrayBuffer(0),tile,"b3dm","fixture",abort.signal)).rejects.toThrow(/controlled/);else await parse(new ArrayBuffer(0),tile,"b3dm","fixture",abort.signal);
  if(mode==="transfer"){expect(tile.engineData.scene).toBe(f.scene);expect([...counts.values()]).toEqual(Array(9).fill(0));(renderer.disposeTile as (t:Tile)=>void)(tile);(renderer.disposeTile as (t:Tile)=>void)(tile);}
  else expect(tile.engineData.scene).toBeUndefined();
  expect(counts.size).toBe(9);expect([...counts.values()]).toEqual(Array(9).fill(1));
});

// Bound: source-sided authored relief. These controls must fail on the closed
// 348 boxes; they inspect the actual material shader, not a parallel predicate.
it.each([BackSide, DoubleSide])("refuses changed source sidedness %s before adding relief", side => {
  const f=fixture();
  try {
    prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    f.material.side=side;
    expect(()=>addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256)).toThrow(/frontside/i);
    expect(f.scene.getObjectByName("crossing-frontage-surround")).toBeUndefined();
  } finally { f.dispose(); }
});
it("emits the source-facing discard for relief beauty and depth",()=>{
  const f=fixture();
  try {
    prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    const mesh=f.scene.getObjectByName("crossing-frontage-surround")!.children[0] as Mesh;
    const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
    (mesh.material as MeshStandardMaterial).onBeforeCompile(shader as never,{} as never);
    expect(shader.vertexShader).toContain("mapsFrontageFacing = mapsFrontageSide");
    expect(shader.fragmentShader).toContain("if (mapsFrontageFacing <= 0.0) discard;");
    expect(mesh.customDepthMaterial).toBeDefined();
    expect(mesh.customDistanceMaterial).toBeDefined();
  } finally { f.dispose(); }
});

import { withNormalMaterials } from "../src/render/normal-pass.js";
it("applies the same actual source half-space in beauty, GTAO and both shadow shaders",()=>{
  const f=fixture(),ordinary=new MeshNormalMaterial();
  try {
    // The decoded glTF material is single-sided, and its transformed triangle
    // winding independently establishes the sign the emitted predicate uses.
    const primitive=glb.json.meshes![0]!.primitives[1]!;
    expect((glb.json.materials as {doubleSided?:boolean}[])[primitive.material!]!.doubleSided ?? false).toBe(false);
    prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    const meshes=f.scene.getObjectByName("crossing-frontage-surround")!.children as Mesh[];
    const mesh=meshes[0]!,normal=getCrossingFrontageNormalMaterial(mesh)!;
    const materials:[Material,keyof typeof ShaderLib][]=[[mesh.material as Material,"standard"],[normal,"normal"],[mesh.customDepthMaterial!,"depth"],[mesh.customDistanceMaterial!,"distanceRGBA"]];
    const corners=[0,1,2].map(k=>new Vector3().fromBufferAttribute(f.mesh.geometry.getAttribute("position"),f.mesh.geometry.index!.getX(494*3+k)).applyMatrix4(f.mesh.matrixWorld));
    const winding=corners[1]!.clone().sub(corners[0]!).cross(corners[2]!.clone().sub(corners[0]!)).normalize(),origin=corners[0]!;
    for(const [material,kind] of materials){
      const shader={uniforms:{},vertexShader:ShaderLib[kind]!.vertexShader,fragmentShader:ShaderLib[kind]!.fragmentShader};material.onBeforeCompile(shader as never,{} as never);
      expect(shader.fragmentShader).toContain("if (mapsFrontageFacing <= 0.0) discard;");
      const fn=shader.vertexShader.match(/float mapsFrontageSide\(([^)]*)\) \{ return ([^;]*); \}/)!;
      expect(fn).not.toBeNull();
      const side=new Function(fn[1]!.replace(/float /g,""),"return "+fn[2]+";") as (...v:number[])=>number;
      for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){
        const camera=origin.clone().add(new Vector3(Math.cos(angle)*45,3,Math.sin(angle)*45));
        const actual=camera.clone().sub(origin).dot(winding);
        expect(side(0,999,...camera.toArray())).toBeCloseTo(actual,4);
      }
      // Orthographic front/back depends on direction even if its camera lies
      // across the plane. This covers directional-light and normal/depth passes.
      const behind=origin.clone().addScaledVector(winding,-14.6),front=origin.clone().addScaledVector(winding,3.0665);
      expect(side(0,999,...behind.toArray())).toBeLessThan(0);
      expect(side(0,-999,...front.toArray())).toBeGreaterThan(0);
      expect(side(1,1,...behind.toArray())).toBe(1);
      expect(side(1,-1,...front.toArray())).toBe(-1);
      expect(side(1,0,...front.toArray())).toBe(0);
      expect(shader.vertexShader).toContain("projectionMatrix[3][3]");
      expect(shader.vertexShader).toContain("(viewMatrix * vec4(");
    }
    for(const child of meshes){expect(child.customDepthMaterial).toBe(mesh.customDepthMaterial);expect(child.customDistanceMaterial).toBe(mesh.customDistanceMaterial);expect(getCrossingFrontageNormalMaterial(child)).toBe(normal);}
    const renderScene=new Scene();renderScene.add(f.scene);
    withNormalMaterials(renderScene,ordinary,getCrossingFrontageNormalMaterial,()=>{
      for(const child of meshes)expect(child.material).toBe(normal);
      expect(f.mesh.material).toBe(ordinary);expect(f.plain.material).toBe(ordinary);
    });
    for(const child of meshes)expect(child.material).toBe(mesh.material);
    expect(f.mesh.material).toBe(f.material);
  }finally{ordinary.dispose();f.dispose();}
});
it.each(["winding","plane"])("refuses changed transformed source %s before allocation", mode=>{
  const f=fixture();
  try{
    prepareCrossingCorner(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    if(mode==="plane"){f.scene.matrix.elements[14]!+=.1;}
    else {const index=f.mesh.geometry.index!,a=index.getX(494*3);index.setX(494*3,index.getX(494*3+1));index.setX(494*3+1,a);}
    expect(()=>addCrossingFrontage(f.scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256)).toThrow(mode==="plane"?/front plane/:/winding/);
    expect(f.scene.getObjectByName("crossing-frontage-surround")).toBeUndefined();
  }finally{f.dispose();}
});
