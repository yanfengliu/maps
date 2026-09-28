/** Bound: CPU source decoding and exact panel classification. These controls do
 * not admit the candidate's support/cut topology or its unrendered appearance.
 * The cached tiles are required, pinned inputs; this test never fetches them. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Matrix3, Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { parseB3dm, parseGlb, readBatchColumn } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { volumeTriangles, wrap, type Face, type P3 } from "../tools/scene/rail-geometry.js";
import { admitStoredPlan, storedOrientation } from "../tools/scene/rail-plan.js";
import { refineStored, admitStoredCut, storedEdges } from "../tools/scene/rail-stored.js";
import { foundationHeight, generateTruss } from "../tools/scene/rail-trusses.js";

function tile(name: string, sha256: string) {
  const file = new URL(`../data/scene/buildings/data/${name}.b3dm`, import.meta.url);
  let bytes: Buffer;
  try { bytes = readFileSync(file); }
  catch (cause) { throw new Error(`Rail source controls need the reviewed cached ${name}.b3dm. Restore its reviewed scene bytes; this test does not download or skip the source.`, { cause }); }
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== sha256) throw new Error(`Rail source control ${name}.b3dm has SHA-256 ${actual}, expected ${sha256}. Restore or review the changed source before updating this pin.`);
  const b3dm = parseB3dm(bytes), glb = parseGlb(b3dm.glb);
  if (!glb.binary) throw new Error(`Rail source control ${name}.b3dm has no binary chunk.`);
  return { b3dm, json: glb.json, binary: glb.binary };
}
const crossing = tile("data503", "e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d");
const textured = crossing.json.meshes![0]!.primitives[1]!;

describe("offline source-preserving Draco surface decode", () => {
  it("reads the exact Buffer subarray and preserves default Uint8Array results", async () => {
    // Reintroducing Buffer.slice().buffer fails this real offset payload before
    // geometry decoding. decoder-proof.json also records the observed old failure.
    expect(Buffer.isBuffer(crossing.binary)).toBe(true);
    expect(crossing.binary.byteOffset).toBeGreaterThan(0);
    const plain = await decodePrimitive(crossing.json, Uint8Array.from(crossing.binary), textured);
    const offset = await decodePrimitive(crossing.json, crossing.binary, textured);
    expect(offset).toEqual(plain);
    expect(offset).not.toHaveProperty("surface");
    expect(offset.triangleCount).toBe(4625);
    expect(offset.vertexCount).toBe(13875);
    expect(createHash("sha256").update(offset.positions).digest("hex")).toBe("96d3cc21ed06ff2468f7b65f0e5519aac670617bf3e0f634ef4a930ff24c02ba");
  });

  it("retains actual indices, material identity, UV and placed normals", async () => {
    const decoded = await decodePrimitive(crossing.json, crossing.binary, textured, true);
    const surface = decoded.surface!;
    expect(surface.indices).toHaveLength(decoded.triangleCount * 3);
    expect(surface.normals).toHaveLength(decoded.vertexCount * 3);
    expect(surface.uv).toHaveLength(decoded.vertexCount * 2);
    expect(surface.indices.every(i => i < decoded.vertexCount)).toBe(true);
    expect(createHash("sha256").update(surface.indices).digest("hex")).toBe("aecdedb53ffb5c598a2657f7d883d807be570b5176dfe4c541ff56b36c234ed5");
    expect(createHash("sha256").update(surface.uv!).digest("hex")).toBe("475a83fcdb57e827e4bef0114ae2dc9e24efff0cce04fdfa59027d1fcb0e4b98");
    // Frozen Review130 source.json: data503 node0 / primitive1 / face3949.
    // This pre-existing source witness includes the placement, not just local UV.
    const ids = Array.from(surface.indices.slice(3949 * 3, 3949 * 3 + 3));
    expect(ids.every(i => decoded.batchIds![i] === 8)).toBe(true);
    expect(textured.material).toBe(1);
    expect(readBatchColumn(crossing.b3dm.batchTableJson, crossing.b3dm.batchTableBinary, "gml_id", Number(crossing.b3dm.featureTableJson.BATCH_LENGTH))[8]).toBe("bldg_5db01781-54dc-4dbb-b392-cae3696fe8e2");
    const transforms = new Map<number, Matrix4>();
    function visit(index: number, parent: Matrix4): void {
      const node = crossing.json.nodes![index]!, matrix = new Matrix4();
      expect(node.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
      expect(node.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
      expect(node.scale ?? [1, 1, 1]).toEqual([1, 1, 1]);
      if (node.matrix) matrix.fromArray(node.matrix);
      matrix.premultiply(parent); transforms.set(index, matrix);
      for (const child of node.children ?? []) visit(child, matrix);
    }
    for (const index of crossing.json.scenes![crossing.json.scene ?? 0]!.nodes!) visit(index, new Matrix4());
    const matrix = transforms.get(0)!, normal = new Matrix3().getNormalMatrix(matrix);
    const positions = ids.map(i => new Vector3().fromArray(decoded.positions, i * 3).applyMatrix4(matrix).toArray());
    const normals = ids.map(i => new Vector3().fromArray(surface.normals, i * 3).applyNormalMatrix(normal).toArray());
    expect(positions).toEqual([[72.68209101336114,21.990965452830068,49.4217429021683],[72.68209019782364,21.79196749692844,49.42174222782273],[70.60709701544496,21.792657336366958,39.381773595323125]]);
    expect(normals).toEqual(new Array(3).fill([0.9793037745883486,0.00000622926928679781,-0.20239594125922916]));
    expect(ids.map(i => Array.from(surface.uv!.slice(i * 2, i * 2 + 2)))).toEqual([[0.7215166091918945,0.12009386718273163],[0.7215166091918945,0.12009386718273163],[0.7450504302978516,0.12009386718273163]]);
  });

  it("represents the actual untextured primitive without invented UV", async () => {
    const result = await decodePrimitive(crossing.json, crossing.binary, crossing.json.meshes![0]!.primitives[0]!, true);
    expect(result.surface!.uv).toBeNull();
    expect(result.surface!.indices).toHaveLength(685 * 3);
  });
});

describe("Review145 stored cut admission", () => {
  it("subdivides the real 5db01781 vertical T edge using its existing Float32 point", () => {
    const A:P3=[65.73247528076172,16.91387176513672,48.12944412231445];
    const B:P3=[65.99287414550781,18.159921646118164,50.627323150634766];
    const C:P3=[65.99287414550781,21.792160034179688,50.627323150634766];
    const P:P3=[65.99287414550781,18.54864501953125,50.627323150634766];
    const subject:Face={source:17,material:2,vertices:wrap([A,B,C])};
    const neighbour:Face={source:18,material:3,vertices:wrap([P,[66,21.792160034179688,51],C])};
    const before=structuredClone([subject,neighbour]),result=refineStored(before,"5db01781 frozen145 T edge");
    expect(result.inserted).toBe(1);expect(result.changed).toBe(1);
    expect(before).toEqual([subject,neighbour]);
    expect(result.faces.filter(f=>f.source===17)).toHaveLength(2);
    const inserted=result.faces.filter(f=>f.source===17).flatMap(f=>f.vertices).filter(v=>v.p.every((x,i)=>x===P[i]));
    expect(inserted).toHaveLength(2);
    const t=(P[1]-B[1])/(C[1]-B[1]);expect(inserted[0]!.weights).toEqual([0,1-t,t]);
    expect(new Set(result.faces.flatMap(f=>f.vertices.map(v=>v.p.join(','))))).toEqual(new Set(before.flatMap(f=>f.vertices.map(v=>v.p.join(',')))));
    const near=structuredClone(neighbour);near.vertices[0]!.p[0]=Math.fround(P[0]+.00001);
    expect(refineStored([subject,near],"near-edge negative control").inserted).toBe(0);
  });
  it("rejects absence and displaced inherited edge keys even when counts agree", () => {
    const source:Face[]=[{source:1,material:0,vertices:wrap([[0,0,0],[1,0,0],[0,1,0]])}];
    expect(admitStoredCut(source,source,"unchanged open source")).toEqual(storedEdges(source));
    const moved=structuredClone(source);moved[0]!.vertices[0]!.p[0]=.25;
    expect(storedEdges(moved).boundary).toHaveLength(3);
    expect(()=>admitStoredCut(source,moved,"relocated hole")).toThrow(/edge keys/);
    expect(()=>admitStoredCut(source,[],"missing output")).toThrow(/absent/);
  });
});

describe("Review150 finite structural generation", () => {
  it("rounds a shaft bottom outward without moving the source floor", () => {
    for(const y of[14.833389,12.164311,-.000001,0,14,20.25]){
      const actual=foundationHeight(y);expect(actual).toBeLessThanOrEqual(y);
      expect(Math.fround(actual)).toBe(actual);expect(y-actual).toBeLessThan(.000002);
    }
    expect(foundationHeight(14)).toBe(14);
    expect(()=>foundationHeight(NaN)).toThrow(/not finite/);
  });
  it("keeps a bent 85m span open and closed with source-node breaks and short panels", () => {
    const chain={id:1,points:[{x:0,z:-10},{x:0,z:40},{x:20,z:90}]};
    const from={track:1,end:"from",z:0,lateral:0,foundation:"terrain",poly:[]};
    const to={...from,end:"to",z:80};const a=generateTruss(chain,from,to,-1);
    const p=a.faces.flatMap(f=>f.vertices.map(v=>v.p));
    expect(p.every(p=>p[1]>=20.25&&p[1]<=Math.fround(23.85))).toBe(true);
    // A ray along X passes through an actual open web but crosses both sides
    // of the lower chord. An opaque side wall fails the first assertion.
    const crossings=(y:number,z:number):number=>a.faces.filter(f=>{
      const [a,b,c]=f.vertices.map(v=>[v.p[1],v.p[2]]) as [[number,number],[number,number],[number,number]];
      const d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(d===0)return false;
      const u=((y-a[0])*(c[1]-a[1])-(z-a[1])*(c[0]-a[0]))/d,v=((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(y-a[0]))/d;
      return u>=0&&v>=0&&u+v<=1;
    }).length;
    expect(crossings(22.8,2)).toBe(0);expect(crossings(20.4,2)).toBe(2);
    expect(()=>generateTruss(chain,to,from,1)).toThrow();
  });
});

describe("the reviewed zero-volume source panel exception", () => {
  it("classifies only the exact opposite source faces and preserves their inputs", async () => {
    const source = tile("data505", "26e4f738abdb87aa742ee0ee060d006c8a9f6e8f48b1d6ba79c45ab3f432ba0a");
    const decoded = await decodePrimitive(source.json, source.binary, source.json.meshes![0]!.primitives[1]!, true);
    const s = decoded.surface!;
    const triangles = [5850, 5920].map(face => Array.from(s.indices.slice(face * 3, face * 3 + 3)).map(i => Array.from(decoded.positions.slice(i * 3, i * 3 + 3)) as P3));
    const before = structuredClone(triangles);
    expect(volumeTriangles(triangles)).toEqual({ triangles: [], panels: [[0, 1]] });
    expect(triangles).toEqual(before);
    // Equal winding is a duplicated solid face, not the approved two-sided panel.
    expect(() => volumeTriangles([triangles[0]!, triangles[0]!.map(p => [...p] as P3)])).toThrow(/equal winding/);
    // A separated parallel face must remain a solid input, even only 1 nm away.
    const separated = triangles[1]!.map(p => [p[0] + 1e-9, p[1], p[2]] as P3);
    expect(volumeTriangles([triangles[0]!, separated])).toEqual({ triangles: [triangles[0]!, separated], panels: [] });
  });
});

describe("stored authored-plan admission", () => {
  const face = (points: P3[]): Face => ({ source: 1, material: 0, vertices: wrap(points) });
  it("retessellates the real Review142 inverted star without moving its boundary", () => {
    const centre: P3 = [102.20594787597656,0,-425.2619323730469];
    const ring: P3[] = [[103.11360931396484,0,-425.2390441894531],[100.37800598144531,0,-425],[99.76991271972656,0,-425.60809326171875],[102.84040832519531,0,-425.2691955566406],[103.11308288574219,0,-425.2391052246094],[103.113525390625,0,-425.2390441894531]];
    const original = ring.map((p, i) => face([centre, p, ring[(i + 1) % ring.length]!]));
    expect(original.some(f => storedOrientation(...f.vertices.map(v => v.p) as [P3, P3, P3]) < 0n)).toBe(true);
    const before = structuredClone(original), admitted = admitStoredPlan(original);
    expect(original).toEqual(before);
    expect(admitted.changes).toHaveLength(1);
    expect(admitted.faces).toHaveLength(4);
    expect(admitted.faces.every(f => storedOrientation(...f.vertices.map(v => v.p) as [P3, P3, P3]) > 0n)).toBe(true);
    expect(new Set(admitted.faces.flatMap(f => f.vertices.map(v => v.p.join(","))))).toEqual(new Set(ring.map(p => p.join(","))));
  });
  it("rejects absent, duplicated and interior-overlapping generated plans", () => {
    const a = face([[0,0,0],[2,0,0],[0,0,2]]);
    expect(() => admitStoredPlan([])).toThrow(/absent/);
    expect(() => admitStoredPlan([a, structuredClone(a)])).toThrow(/duplicates/);
    expect(() => admitStoredPlan([a, face([[.25,0,.25],[.75,0,.25],[.25,0,.75]])])).toThrow(/overlap/);
    expect(() => admitStoredPlan([a, face([[0,0,0],[2,0,0],[1,0,1]])])).toThrow(/same side/);
    expect(() => admitStoredPlan([face([[0,0,0],[0,0,2],[2,0,0]])])).toThrow(/retessellate/);
  });
});
