/** Literal518 installed-loader fixture; synthetic image decoding only. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect} from 'vitest';
import {B3DMLoader} from '3d-tiles-renderer';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BufferAttribute,BufferGeometry,LoadingManager,Mesh,Texture,Triangle,Vector2,Vector3} from 'three';
import {parseB3dm,parseGlb} from '../../tools/tiles/b3dm.js';
import {decodePrimitive} from '../../tools/tiles/draco.js';
const digest='5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b';
const sha=(b:Uint8Array):string=>createHash('sha256').update(b).digest('hex');
const hash=(a:BufferAttribute):string=>sha(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
export async function loadData518() {
  const bytes = await readFile(new URL("../../data/scene/buildings/data/data518.b3dm", import.meta.url)).catch(cause => { throw Error(`Crossing-window checks need reviewed data/scene/buildings/data/data518.b3dm. Restore the reviewed scene cache; fresh npm run data:fetch and npm run data:scene need source review. ${String(cause)}`); });
  expect(sha(bytes)).toBe(digest);
  const tile = parseB3dm(bytes), glb = parseGlb(tile.glb), decoded = new Map<string, Awaited<ReturnType<typeof decodePrimitive>>>();
  for (const primitive of glb.json.meshes![0]!.primitives) { const v = glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!; decoded.set(sha(glb.binary!.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)), await decodePrimitive(glb.json, glb.binary!, primitive, true)); }
  const manager = new LoadingManager(), loader = new GLTFLoader(manager);
  loader.setDRACOLoader({ preload() {}, decodeDracoFile(buffer: ArrayBuffer, done: (g: BufferGeometry) => void) { const d = decoded.get(sha(new Uint8Array(buffer)))!, g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(d.positions.slice(), 3)); g.setAttribute("normal", new BufferAttribute(d.surface!.normals.slice(), 3)); g.setAttribute("_batchid", new BufferAttribute(d.batchIds!.slice(), 1)); if (d.surface!.uv) g.setAttribute("uv", new BufferAttribute(d.surface!.uv.slice(), 2)); g.setIndex(new BufferAttribute(d.surface!.indices.slice(), 1)); done(g); } } as never);
  loader.register(() => ({ name: "EXT_texture_webp", loadTexture: async () => { const t = new Texture({ width: 4096, height: 4096 } as never); t.flipY = false; return t; } })); manager.addHandler(/path\.gltf$/, loader);
  const scene = (await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer)).scene; scene.updateMatrixWorld(true);
  let source: Mesh | undefined; scene.traverse(o => { if (o instanceof Mesh && o.geometry.hasAttribute("uv")) source = o; }); if (!source) throw Error("Pinned518 has no photographic primitive");
  const p = source.geometry.getAttribute("position"), index = source.geometry.index!, uv = source.geometry.getAttribute("uv"), facets = [10574,10575].map(face => { const ids = [0,1,2].map(k => index.getX(face*3+k)); return { ids, points: ids.map(i => new Vector3().fromBufferAttribute(p,i).applyMatrix4(source!.matrixWorld)), uvs: ids.map(i => new Vector3(uv.getX(i),uv.getY(i),0)) }; });
  const normal = new Triangle(...facets[0]!.points as [Vector3,Vector3,Vector3]).getNormal(new Vector3());
  const fromPhoto = (x: number, y: number, depth = 0): Vector3 => { for (const f of facets) { const b = Triangle.getBarycoord(new Vector3(x/4096,y/4096,0), ...f.uvs as [Vector3,Vector3,Vector3], new Vector3())!; if (Math.min(b.x,b.y,b.z) >= -1e-7) return f.points.reduce((s,p,i) => s.addScaledVector(p,b.getComponent(i)),new Vector3()).addScaledVector(normal,depth); } throw Error("Outside literal photo face"); };
  const toPhoto = (p: Vector3): Vector2 => { for(const f of facets){const b=Triangle.getBarycoord(p,...f.points as [Vector3,Vector3,Vector3],new Vector3())!;if(Math.min(b.x,b.y,b.z)>=-1e-6)return new Vector2(...[0,1].map(k => f.ids.reduce((s,id,i) => s+b.getComponent(i)*uv.getComponent(id,k),0)*4096) as [number,number]);}throw Error("Outside literal source facets"); };
  const preserved: (() => void)[] = []; scene.traverse(o => { if (!(o instanceof Mesh)) return; const g=o.geometry, originalIndex=g.index!, indexBytes=hash(originalIndex), attrs=Object.entries(g.attributes).map(([name,raw])=>{const a=raw as BufferAttribute;return {name,a,array:a.array,sha:hash(a)};}); preserved.push(()=>{expect(o.geometry).toBe(g);expect(g.index).toBe(originalIndex);expect(hash(originalIndex)).toBe(indexBytes);for(const r of attrs){expect(g.getAttribute(r.name)).toBe(r.a);expect(g.getAttribute(r.name).array).toBe(r.array);expect(hash(r.a as BufferAttribute)).toBe(r.sha);}}); });
  return { bytes, scene, source, normal, fromPhoto, toPhoto, unchanged: () => preserved.forEach(f=>f()) };
}