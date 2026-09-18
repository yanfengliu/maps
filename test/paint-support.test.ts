/** F10: real createStreetDetails triangles, every mapped zebra/tactile path in
 * the pinned cached graph, plus synthetic stacked/ambiguous/unsupported controls.
 * Finite support only: <=0.25m grid, edge midpoints/centroids, <=0.5 rise/run,
 * <=0.04m sampled plane residual. No whole-area or agent-contact claim.
 * The 0.10m top allowance is presentation thickness, not source level authority.
 * Cached source prerequisites fail actionably; tests never fetch or skip them.
 */
import { describe, expect, it } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Mesh } from "three";
import { createPaintSupport } from "../src/scene/paint-support.js";
import { createStreetDetails, type PaintPlacement } from "../src/scene/street-details.js";
import { worldStyle } from "../src/world/styles.js";
import { decodeMesh, type MeshData } from "../src/world/mesh.js";
import type { NetworkData } from "../src/world/network-data.js";
import { surfaceSampler } from "../src/world/surface-sampler.js";

function planes(heights: number[]): MeshData {
  const positions = new Float32Array(heights.flatMap(y => [-10, y, -10, -10, y, 10, 10, y, 10, 10, y, -10]));
  const indices = new Uint32Array(heights.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map(v => i * 4 + v)));
  return { header: { version: 1, name: "paint fixture", vertexCount: positions.length / 3, triangleCount: indices.length / 3, bounds: { min: [-10, 0, -10], max: [10, 30, 10] } }, positions, indices, normals: new Float32Array(positions.length) };
}
function rectangle(minX: number, maxX: number, minZ: number, maxZ: number, y = 15): MeshData {
  const mesh = planes([y]);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    mesh.positions[i] = mesh.positions[i]! < 0 ? minX : maxX;
    mesh.positions[i + 2] = mesh.positions[i + 2]! < 0 ? minZ : maxZ;
  }
  return mesh;
}
const fixture = { lanes: [], junctions: [], walks: [], physical: { crossings: [{ id: "fixture", source: "osm", sourceWayId: 1, paths: [[{ x: 0, y: 15, z: 0 }, { x: 4, y: 15, z: 0 }]], markings: "zebra", sourceMarkings: "zebra", control: "unknown", widthM: 3, widthSource: "osm" }], tactilePaths: [], trafficControls: [] } } as unknown as NetworkData;

describe("paint source elevation selects a bounded presentation layer", () => {
  it("keeps stacked levels separate and uses the nearby top presentation surface", () => {
    const query = createPaintSupport(planes([15, 22]), planes([15.08]));
    expect(query(0, 0, 15.01)).toBeCloseTo(15.08, 5); // Pure-nearest mutation buries this paint.
    expect(query(0, 0, 22)).toBe(22);
    expect(query(0, 0, 18)).toBeUndefined();
    expect(query(0, 0, Number.NaN)).toBeUndefined();
    expect(query(100, 100, 15)).toBeUndefined();
    expect(createPaintSupport(planes([14.75]), planes([15.25]))(0, 0, 15)).toBeUndefined();
    expect(createPaintSupport(planes([15]), planes([15.2]))(0, 0, 15)).toBe(15);
  });
  it("omits complete stripes for missing, nonfinite, wrong-level or discontinuous support", () => {
    for (const query of [undefined, () => undefined, () => NaN, () => Infinity, () => 22, (_x: number, z: number) => z < 0 ? 14.7 : 15.3]) {
      const streets = createStreetDetails(fixture, worldStyle("satellite"), query);
      try {
        expect(streets.counts.stripes).toBe(0);
        expect(streets.paintPlacements).toHaveLength(3);
        expect(streets.paintPlacements.every(p => p.status === "unplaced" && p.vertexCount === 0 && p.sourceId === "fixture" && !!p.reason)).toBe(true);
        expect((streets.root.getObjectByName("streets:paint") as Mesh).geometry.getAttribute("position").count).toBe(0);
      } finally { streets.dispose(); }
    }
  });
  it("bridges only a <=10mm gap bracketed by parallel agreeing edges", () => {
    const left = rectangle(-10, -.004, -10, 10);
    const valid = createPaintSupport(left, rectangle(.004, 10, -10, 10));
    expect(valid(0, 0, 15)).toBeCloseTo(15, 6);
    expect(valid.seamUses).toHaveLength(1);
    expect(valid.seamUses![0]!.widthM).toBeCloseTo(.008, 6);
    const bad = [
      [left, planes([])], // one-sided external boundary
      [rectangle(-10, -.00501, -10, 10), rectangle(.00501, 10, -10, 10)], // just above10mm
      [left, rectangle(.004, 10, -10, 10, 15.01)], // incompatible heights
      [left, rectangle(-10, -.003, -10, 10)], // both edges on the same side
      [left, rectangle(-10, 10, .004, 10)], // perpendicular edges
    ];
    for (const [a, b] of bad) {
      const query = createPaintSupport(a!, b!);
      expect(query(0, 0, 15)).toBeUndefined(); expect(query.seamUses).toHaveLength(0);
    }
  });
  it("checks an interior hole and ridge missed by the stripe corners", () => {
    // First triangle centroid at (0.4+0.25/3, -1.5+0.25*2/3).
    for (const bad of [undefined, 15.12]) {
      const streets = createStreetDetails(fixture, worldStyle("satellite"), (x, z) => Math.hypot(x - (.4 + .25 / 3), z - (-1.5 + .25 * 2 / 3)) < .02 ? bad : 15);
      try {
        expect(streets.paintPlacements[0]!.status).toBe("unplaced");
        expect(streets.paintPlacements[0]!.reason).toMatch(/interior/);
        expect(streets.counts.stripes).toBe(2);
      } finally { streets.dispose(); }
    }
  });
});

it("rejects the actual legacy highest-layer callback at the source crossing", async () => {
  const paths = ["data/network/network.json", "data/scene/roads.mesh", "data/scene/pavements.mesh", "data/scene/terrain.mesh"];
  const inputs = await Promise.all(paths.map(path => readFile(path).catch(cause => { throw new Error(`Paint regression requires ${path}; restore the recorded cached data with data:fetch, data:scene and data:network before npm test.`, { cause }); })));
  expect(inputs.map(bytes => createHash("sha256").update(bytes).digest("hex"))).toEqual([
    "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677",
    "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc",
    "3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62",
    "c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773",
  ]);
  const network = JSON.parse(inputs[0]!.toString()) as NetworkData;
  const feature = network.physical.crossings.find(c => c.id === "osm:way:1419311959:crossing");
  if (!feature) throw new Error("Paint regression source crossing1419311959 is absent; review changed network source before updating its standing fixture.");
  const road = surfaceSampler(decodeMesh(inputs[1]!), true), pavement = surfaceSampler(decodeMesh(inputs[2]!), true), terrain = surfaceSampler(decodeMesh(inputs[3]!));
  // The original App callback ignored source elevation and chose upper28.9m.
  const legacy = (x: number, z: number): number | undefined => { const r = road(x, z), p = pavement(x, z); return r === undefined ? p ?? terrain(x, z) : p === undefined ? r : Math.max(r, p); };
  const streets = createStreetDetails({ ...network, physical: { crossings: [feature], tactilePaths: [], trafficControls: [] } }, worldStyle("satellite"), legacy);
  try {
    const p = (streets.root.getObjectByName("streets:paint") as Mesh).geometry.getAttribute("position");
    let maximumSpan = 0;
    for (let i = 0; i < p.count; i += 3) maximumSpan = Math.max(maximumSpan, Math.max(p.getY(i), p.getY(i + 1), p.getY(i + 2)) - Math.min(p.getY(i), p.getY(i + 1), p.getY(i + 2)));
    expect(p.count).toBeGreaterThan(0);
    expect(maximumSpan).toBeLessThan(.25);
  } finally { streets.dispose(); }
});

it("censuses all actual zebra and continuous tactile triangles without upper-layer jumps", async () => {
  const pins = [
    ["data/network/network.json", "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"],
    ["data/scene/roads.mesh", "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc"],
    ["data/scene/pavements.mesh", "3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62"],
  ] as const;
  const inputs = await Promise.all(pins.map(async ([path, pin]) => {
    const bytes = await readFile(path).catch(cause => { throw new Error(`Paint regression requires cached ${path}; run npm run data:fetch, npm run data:scene and npm run data:network using the recorded source before npm test. No input is fetched or skipped by this test.`, { cause }); });
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== pin) throw new Error(`Paint regression input ${path} changed from its Review10 pin (${pin} to ${digest}); review the new source and update this standing regression deliberately.`);
    return bytes;
  }));
  const network = JSON.parse(inputs[0]!.toString()) as NetworkData;
  const support = createPaintSupport(decodeMesh(inputs[1]!), decodeMesh(inputs[2]!));
  const seams = JSON.parse(await readFile("test/fixtures/paint-road-seams.json", "utf8")) as { roadsSha256: string; probes: { x: number; z: number; expectedY: number; edges: { mesh: string; triangle: number; edge: number }[]; gapWidthM: number }[] };
  expect(seams.roadsSha256).toBe(pins[1][1]); expect(seams.probes).toHaveLength(11);
  for (const probe of seams.probes) {
    expect(support(probe.x, probe.z, probe.expectedY)).toBeDefined();
    const use = support.seamUses!.find(s => s.x === probe.x && s.z === probe.z)!;
    expect(use).toBeDefined(); expect(use.widthM).toBeCloseTo(probe.gapWidthM, 6);
    expect(use.edges.map(({ mesh, triangle, edge }) => ({ mesh, triangle, edge })).sort((a, b) => a.triangle - b.triangle)).toEqual([...probe.edges].sort((a, b) => a.triangle - b.triangle));
  }
  const rows: { id: string; triangles: number; maximumRiseRun: number; maximumSourceDeviationM: number; placements: readonly PaintPlacement[] }[] = [];
  let totalTriangles = 0, heroTriangles = 0;
  for (const feature of [...network.physical.crossings.filter(c => c.markings === "zebra"), ...network.physical.tactilePaths.filter(p => p.extent === "path")]) {
    const crossing = "markings" in feature;
    const selected = { ...network, physical: { crossings: crossing ? [feature] : [], tactilePaths: crossing ? [] : [feature], trafficControls: [] } } as NetworkData;
    const streets = createStreetDetails(selected, worldStyle("satellite"), support);
    try {
      const p = (streets.root.getObjectByName(crossing ? "streets:paint" : "streets:tactile-paving") as Mesh).geometry.getAttribute("position");
      let maximumRiseRun = 0, maximumSourceDeviationM = 0;
      for (const placement of streets.paintPlacements) {
        if (placement.status === "unplaced") { expect(placement.vertexCount).toBe(0); continue; }
        const a = placement.start, b = placement.end, length2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
        for (let i = placement.vertexStart; i < placement.vertexStart + placement.vertexCount; i += 3) {
          for (let j = 0; j < 3; j++) {
            const v = i + j, w = i + (j + 1) % 3;
            const rise = Math.abs(p.getY(v) - p.getY(w)), run = Math.hypot(p.getX(v) - p.getX(w), p.getZ(v) - p.getZ(w));
            maximumRiseRun = Math.max(maximumRiseRun, rise / run);
            const t = Math.max(0, Math.min(1, ((p.getX(v) - a.x) * (b.x - a.x) + (p.getZ(v) - a.z) * (b.z - a.z)) / length2));
            maximumSourceDeviationM = Math.max(maximumSourceDeviationM, Math.abs(p.getY(v) - (crossing ? .06 : .07) - (a.y + (b.y - a.y) * t)));
          }
        }
      }
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      rows.push({ id: feature.id, triangles: p.count / 3, maximumRiseRun, maximumSourceDeviationM, placements: structuredClone(streets.paintPlacements) });
      totalTriangles += p.count / 3;
      if (feature.paths.some(path => path.some(point => Math.hypot(point.x, point.z) < 40))) heroTriangles += p.count / 3;
    } finally { streets.dispose(); }
  }
  await mkdir("artifacts/paint-support", { recursive: true });
  await writeFile("artifacts/paint-support/census.json", JSON.stringify({ pins, totalTriangles, heroTriangles, rows, seamQueries: support.seamUses }, null, 2) + "\n");
  expect(rows.length).toBe(100); // Pinned source: every marked crossing and continuous tactile feature.
  expect(totalTriangles).toBeGreaterThan(10000);
  expect(heroTriangles).toBeGreaterThan(1000);
  const named = rows.find(r => r.id === "osm:way:1419311959:crossing")!;
  expect(named).toBeDefined(); expect(named.triangles).toBeGreaterThan(0);
  const diagonal = rows.find(r => r.id === "authored:scramble-diagonal")!;
  expect(diagonal.placements).toHaveLength(46);
  expect(diagonal.placements.filter(p => p.status === "placed")).toHaveLength(43);
  expect(diagonal.placements.filter(p => p.status === "unplaced").map(p => p.partIndex)).toEqual([0, 44, 45]);
  for (const row of rows) {
    expect(row.maximumRiseRun, row.id).toBeLessThanOrEqual(.5005); // Float32 output tolerance, not support expansion.
    expect(row.maximumSourceDeviationM, row.id).toBeLessThanOrEqual(.5001);
  }
}, 30_000);
