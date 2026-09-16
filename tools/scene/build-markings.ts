/** PLATEAU's published lane, edge and stop-line polygons. Crossing stripes are
 * owned by the separate OSM physical crossing inventory, so function 1110 is
 * deliberately excluded. No movement graph edge becomes paint here.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ShapeUtils, Vector2 } from "three";
import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { decodeMesh, encodeMesh, type MeshData } from "../../src/world/mesh.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { surfaceSampler } from "../network/surface.ts";
import { heroPaint } from "./hero-paint.ts";

type Point = { x: number; y: number; z: number };
type HeightAt = (x: number, z: number) => number | undefined;
const PAINT_FUNCTIONS = new Set([1010, 1020, 1030, 1040, 1120]);

export function markingPolygons(xml: string): { id: string; functionCode: number; rings: Point[][] }[] {
  const result: ReturnType<typeof markingPolygons> = [];
  for (const object of xml.matchAll(/<frn:CityFurniture\b[^>]*gml:id="([^"]+)"[^>]*>([\s\S]*?)<\/frn:CityFurniture>/g)) {
    const functionCode = Number(/<frn:function\b[^>]*>(\d+)<\/frn:function>/.exec(object[2]!)?.[1]);
    if (!PAINT_FUNCTIONS.has(functionCode)) continue;
    const geometry = /<frn:lod3Geometry>([\s\S]*?)<\/frn:lod3Geometry>/.exec(object[2]!)?.[1];
    if (!geometry) continue;
    for (const polygon of geometry.matchAll(/<gml:Polygon\b[^>]*>([\s\S]*?)<\/gml:Polygon>/g)) {
      const rings: Point[][] = [];
      for (const ring of polygon[1]!.matchAll(/<gml:(exterior|interior)>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>[\s\S]*?<\/gml:\1>/g)) {
        const values = ring[2]!.trim().split(/\s+/).map(Number);
        if (values.length < 12 || values.length % 3 || values.some((n) => !Number.isFinite(n))) throw new Error(`PLATEAU marking ${object[1]} has an invalid polygon ring; require finite latitude/longitude/height triples.`);
        const points: Point[] = [];
        for (let i = 0; i < values.length - 3; i += 3) points.push(planeRectangularToWorld(geographicToPlaneRectangular(values[i]!, values[i + 1]!, values[i + 2]!), AOI_ORIGIN_EPSG6677));
        rings.push(points);
      }
      if (rings.length) result.push({ id: object[1]!, functionCode, rings });
    }
  }
  return result;
}

export async function buildMarkings(sourceDirectory: string, terrain: HeightAt, road: HeightAt): Promise<{ bytes: Uint8Array; provenance: object }> {
  const positions: number[] = []; const indices: number[] = [];
  const sources: { file: string; sha256: string }[] = [];
  const retained = new Map<string, { id: string; functionCode: number; polygons: number }>();
  let droppedUnsupported = 0;
  for (const file of (await readdir(sourceDirectory)).filter((name) => name.endsWith(".gml")).sort()) {
    const bytes = await readFile(resolve(sourceDirectory, file));
    sources.push({ file, sha256: createHash("sha256").update(bytes).digest("hex") });
    for (const feature of markingPolygons(bytes.toString("utf8"))) {
      const rings: Point[][] = []; let unsupported = false;
      for (const sourceRing of feature.rings) {
        const ring: Point[] = [];
        for (const point of sourceRing) {
          const ground = terrain(point.x, point.z); const surface = road(point.x, point.z);
          // Paint belongs on a physical road surface. Reject missing coverage
          // and different elevation layers instead of flattening onto terrain.
          if (ground === undefined || surface === undefined || Math.abs(point.y - surface) > 1.5) { unsupported = true; break; }
          ring.push({ ...point, y: surface + 0.035 });
        }
        if (unsupported) break;
        rings.push(ring);
      }
      if (unsupported) { droppedUnsupported++; continue; }
      const base = positions.length / 3;
      for (const point of rings.flat()) positions.push(point.x, point.y, point.z);
      const flat = rings.map((ring) => ring.map((point) => new Vector2(point.x, point.z)));
      for (const face of ShapeUtils.triangulateShape(flat[0]!, flat.slice(1))) indices.push(base + face[2]!, base + face[1]!, base + face[0]!);
      const record = retained.get(feature.id) ?? { id: feature.id, functionCode: feature.functionCode, polygons: 0 };
      record.polygons++; retained.set(feature.id, record);
    }
  }
  if (!indices.length) throw new Error(`PLATEAU furniture at ${sourceDirectory} produced no supported lane or stop-line polygon; fetch the AOI frn files and build road surfaces first.`);
  const min: [number, number, number] = [Infinity, Infinity, Infinity]; const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  positions.forEach((value, index) => { const axis = index % 3; min[axis] = Math.min(min[axis]!, value); max[axis] = Math.max(max[axis]!, value); });
  const normals = new Float32Array(positions.length); for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const mesh: MeshData = { header: { version: 1, name: "markings", vertexCount: positions.length / 3, triangleCount: indices.length / 3, bounds: { min, max }, note: "PLATEAU CityFurniture functions 1010/1020/1030/1040/1120. Published horizontal rings, draped to road support +0.035m. Pedestrian stripes excluded; OSM physical crossings own them." }, positions: new Float32Array(positions), normals, indices: new Uint32Array(indices) };
  return { bytes: encodeMesh(mesh), provenance: { sources, codelist: "plateau/codelists/CityFurniture_function.xml", functions: [...PAINT_FUNCTIONS], features: [...retained.values()], droppedUnsupported, triangleCount: indices.length / 3 } };
}

export async function writeMarkings(includeAuthored = false): Promise<void> {
  const terrain = surfaceSampler(decodeMesh(new Uint8Array(await readFile("data/scene/terrain.mesh"))));
  const road = surfaceSampler(decodeMesh(new Uint8Array(await readFile("data/scene/roads.mesh"))));
  const result = await buildMarkings("data/plateau/udx/frn", terrain, road);
  if (includeAuthored) {
    const authored = await heroPaint(road);
    const mesh = decodeMesh(result.bytes); const base = mesh.positions.length / 3;
    const positions = new Float32Array([...mesh.positions, ...authored.positions]);
    const normals = new Float32Array(positions.length); normals.set(mesh.normals);
    for (let i = mesh.positions.length + 1; i < normals.length; i += 3) normals[i] = 1;
    const indices = new Uint32Array([...mesh.indices, ...authored.positions.filter((_, i) => i % 3 === 0).map((_, i) => base + i)]);
    for (let i = mesh.positions.length; i < positions.length; i++) { const axis = i % 3; mesh.header.bounds.min[axis] = Math.min(mesh.header.bounds.min[axis]!, positions[i]!); mesh.header.bounds.max[axis] = Math.max(mesh.header.bounds.max[axis]!, positions[i]!); }
    result.bytes = encodeMesh({ header: { ...mesh.header, vertexCount: positions.length / 3, triangleCount: indices.length / 3, note: mesh.header.note + " Plus bounded authored west Scramble approach paint; see markings-provenance.json." }, positions, normals, indices });
    result.provenance = { published: result.provenance, authored: authored.provenance };
  }
  await writeFile("data/scene/markings.mesh", result.bytes);
  await writeFile("data/scene/markings-provenance.json", JSON.stringify(result.provenance, null, 2) + "\n");
  console.log(JSON.stringify({ output: "data/scene/markings.mesh", bytes: result.bytes.length, sha256: createHash("sha256").update(result.bytes).digest("hex"), includeAuthored, provenance: "data/scene/markings-provenance.json" }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await writeMarkings(true);
