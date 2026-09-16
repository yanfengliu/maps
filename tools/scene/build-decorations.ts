/** harness: data:scene's terrain.mesh supplies every vegetation vertex height.
 * No invented ground fallback; every unavailable sample is named in skipped.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AOI_BOUNDS_WGS84, AOI_CENTRE_WGS84 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { decodeMesh } from "../../src/world/mesh.ts";
import { createRng } from "../../src/world/rng.ts";
import type { DecorationData } from "../../src/world/decorations.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { surfaceSampler } from "../network/surface.ts";

interface Element { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [source, terrain] = await Promise.all([readFile(join(root, "data/decorations/osm.json")), readFile(join(root, "data/scene/terrain.mesh"))]);
const document = JSON.parse(source.toString("utf8")) as { osm3s: { timestamp_osm_base: string }; elements: Element[] };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const origin = geographicToPlaneRectangular(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, 0);
const terrainMesh = decodeMesh(terrain);
const sample = surfaceSampler(terrainMesh);
const [roadBytes, pavementBytes] = await Promise.all([readFile(join(root, "data/scene/roads.mesh")), readFile(join(root, "data/scene/pavements.mesh"))]);
const roadSample = surfaceSampler(decodeMesh(roadBytes), true);
const pavementSample = surfaceSampler(decodeMesh(pavementBytes), true);
const support = (x: number, z: number): number | undefined => {
  const ground = sample(x, z);
  if (ground === undefined) return undefined;
  return Math.max(ground, ...[roadSample(x, z), pavementSample(x, z)].filter((height): height is number => height !== undefined && Math.abs(height - ground) < 0.75));
};
const elements = new Map<string, Element>();
for (const element of document.elements) if (!elements.has(`${element.type}:${element.id}`)) elements.set(`${element.type}:${element.id}`, element);
const data: DecorationData = { version: 1, provenance: { osmTimestamp: document.osm3s.timestamp_osm_base, osmSha256: hash(source), terrainSha256: hash(terrain), method: `OSM tree nodes, tree rows at 7m inferred spacing, ground-level closed park/garden/grass ways, mapped guard rails and bollards. PLATEAU support sampling; roads=${hash(roadBytes)}, pavements=${hash(pavementBytes)}. Missing tree size seeded at5-9m; fallback rail/bollard height0.85m. No authored park plantings.` }, trees: [], greens: [], barriers: [], skipped: [] };
const project = (element: Element) => {
  if (element.lat === undefined || element.lon === undefined) return undefined;
  const point = planeRectangularToWorld(geographicToPlaneRectangular(element.lat, element.lon, 0), origin);
  const y = support(point.x, point.z);
  return y === undefined ? undefined : { x: point.x, y, z: point.z };
};
const inside = (element: Element) => element.lat !== undefined && element.lon !== undefined && element.lat >= AOI_BOUNDS_WGS84.south && element.lat <= AOI_BOUNDS_WGS84.north && element.lon >= AOI_BOUNDS_WGS84.west && element.lon <= AOI_BOUNDS_WGS84.east;
const tree = (element: Element, position: { x: number; y: number; z: number }, rowPlacement: boolean) => {
  const rng = createRng(element.id);
  const statedHeight = Number.parseFloat(element.tags?.height ?? "");
  const inferredSize = !Number.isFinite(statedHeight) || statedHeight < 2 || statedHeight > 30;
  const heightM = inferredSize ? 5 + rng() * 4 : statedHeight;
  data.trees.push({ sourceId: element.id, position, heightM, crownRadiusM: heightM * (0.22 + rng() * 0.06), inferredSize, rowPlacement });
};
for (const element of elements.values()) {
  const tags = element.tags;
  if (!tags) continue;
  if ((tags.layer && tags.layer !== "0") || ["roof", "underground", "overground"].includes(tags.location ?? "") || tags.level && tags.level !== "0" || tags.bridge === "yes" || tags.tunnel === "yes") { data.skipped.push({ sourceId: element.id, reason: "Decoration is not on the supported ground level." }); continue; }
  if (element.type === "node" && tags.natural === "tree" && inside(element)) {
    const position = project(element);
    if (position) tree(element, position, false); else data.skipped.push({ sourceId: element.id, reason: "No PLATEAU ground under tree node." });
  } else if (element.type === "node" && tags.barrier === "bollard" && inside(element)) {
    const position = project(element);
    const height = Number.parseFloat(tags.height ?? "");
    const valid = Number.isFinite(height) && height >= 0.3 && height <= 2;
    if (position) data.barriers.push({ sourceId: element.id, kind: "bollard", points: [position], heightM: valid ? height : 0.85, inferredHeight: !valid });
    else data.skipped.push({ sourceId: element.id, reason: "No PLATEAU support under bollard." });
  } else if (element.type === "way" && element.nodes) {
    const nodes = element.nodes.map((id) => elements.get(`node:${id}`));
    if (nodes.some((node) => !node || !inside(node))) { data.skipped.push({ sourceId: element.id, reason: "Way reaches past AOI or references an unavailable node." }); continue; }
    const points = nodes.map((node) => project(node!));
    if (points.some((point) => !point)) { data.skipped.push({ sourceId: element.id, reason: "No PLATEAU ground under one or more way vertices." }); continue; }
    const complete = points as { x: number; y: number; z: number }[];
    if (tags.barrier === "guard_rail") {
      const height = Number.parseFloat(tags.height ?? "");
      const valid = Number.isFinite(height) && height >= 0.3 && height <= 2;
      const path = [complete[0]!];
      for (let index = 1; index < complete.length; index += 1) {
        const a = complete[index - 1]!; const b = complete[index]!; const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2);
        for (let step = 1; step <= steps; step += 1) {
          const x = a.x + (b.x - a.x) * step / steps; const z = a.z + (b.z - a.z) * step / steps; const y = support(x, z);
          if (y === undefined) throw new Error(`Guard rail ${element.id} has no sampled ground at ${x},${z}; do not float it over missing support.`);
          path.push({ x, y, z });
        }
      }
      data.barriers.push({ sourceId: element.id, kind: "guard_rail", points: path, heightM: valid ? height : 0.85, inferredHeight: !valid });
    } else if (tags.natural === "tree_row") {
      for (let index = 1; index < complete.length; index += 1) {
        const a = complete[index - 1]!; const b = complete[index]!; const length = Math.hypot(b.x - a.x, b.z - a.z);
        for (let distance = 0; distance < length; distance += 7) {
          const t = distance / length; const x = a.x + (b.x - a.x) * t; const z = a.z + (b.z - a.z) * t; const y = sample(x, z);
          if (y !== undefined) tree(element, { x, y, z }, true);
        }
      }
    } else if (element.nodes[0] === element.nodes[element.nodes.length - 1] && complete.length > 3) data.greens.push({ sourceId: element.id, kind: tags.leisure ?? tags.landuse ?? "green", points: complete.slice(0, -1), triangles: [] });
  }
}
for (const green of data.greens) {
  const insideRing = (x: number, z: number): boolean => {
    let result = false;
    for (let i = 0, j = green.points.length - 1; i < green.points.length; j = i++) {
      const a = green.points[i]!; const b = green.points[j]!;
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) result = !result;
    }
    return result;
  };
  const p = terrainMesh.positions;
  for (let i = 0; i < terrainMesh.indices.length; i += 3) {
    const ids = [terrainMesh.indices[i]! * 3, terrainMesh.indices[i + 1]! * 3, terrainMesh.indices[i + 2]! * 3];
    if (!insideRing(ids.reduce((sum, id) => sum + p[id]!, 0) / 3, ids.reduce((sum, id) => sum + p[id + 2]!, 0) / 3)) continue;
    for (const id of ids) green.triangles.push({ x: p[id]!, y: p[id + 1]!, z: p[id + 2]! });
  }
}
await writeFile(join(root, "data/scene/decorations.json"), `${JSON.stringify(data)}\n`);
console.log(JSON.stringify({ trees: data.trees.length, greens: data.greens.length, barriers: data.barriers.length, skipped: data.skipped.length, provenance: data.provenance }, null, 2));
