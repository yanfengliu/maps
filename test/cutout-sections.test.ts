/** Bound: authored section topology and exact triangle/plane profiles, including
 * reviewed source witnesses. Rendered edge/pass correctness needs GPU views.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { AOI_BOUNDS_WGS84, AOI_CORNERS_WORLD, AOI_ORIGIN_EPSG6677 } from "../src/world/aoi.js";
import { geographicToPlaneRectangular } from "../tools/geo/plane-rectangular.js";
import { buildingSections, closeSection, sectionGeometry, sectionRegion, sliceTriangle, terrainSectionGeometry, type SectionSegment } from "../src/scene/cutout-sections.js";
import { CITY_CLIP_PLANES, CUTOUT_SIDES, FinalLeafReadiness } from "../src/scene/aoi-cutout.js";
import { decodeMesh } from "../src/world/mesh.js";

const rectangle = (x0 = 2, x1 = 6, y0 = 2, y1 = 6): SectionSegment[] => [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];

describe("canonical presentation footprint", () => {
  it("matches four independent projected geographic corners and inward half-planes", () => {
    const { north, south, west, east } = AOI_BOUNDS_WGS84;
    [[north, west], [north, east], [south, east], [south, west]].forEach(([lat, lon], index) => {
      const projected = geographicToPlaneRectangular(lat!, lon!);
      expect(AOI_CORNERS_WORLD[index]![0]).toBeCloseTo(projected.easting - AOI_ORIGIN_EPSG6677.easting, 8);
      expect(AOI_CORNERS_WORLD[index]![1]).toBeCloseTo(AOI_ORIGIN_EPSG6677.northing - projected.northing, 8);
      const side = CUTOUT_SIDES[index]!, plane = CITY_CLIP_PLANES[index]!;
      expect(plane.constant).toBeGreaterThan(490);
      const inside = { x: side.x + side.dx * side.length / 2 - side.dz, y: 10, z: side.z + side.dz * side.length / 2 + side.dx };
      expect(plane.normal.x * inside.x + plane.normal.z * inside.z + plane.constant).toBeCloseTo(1, 8);
      const outside = new Vector3(side.x + side.dx * side.length / 2 + side.dz, 10, side.z + side.dz * side.length / 2 - side.dx);
      expect(plane.distanceToPoint(outside)).toBeCloseTo(-1, 8);
    });
  });
  it("bounds geographic edge midpoints against the projected straight corner chords", () => {
    const { north, south, west, east } = AOI_BOUNDS_WGS84;
    const midpoints = [[north, (west + east) / 2], [(north + south) / 2, east], [south, (west + east) / 2], [(north + south) / 2, west]];
    const departures = midpoints.map(([lat, lon], index) => {
      const projected = geographicToPlaneRectangular(lat!, lon!);
      const world = new Vector3(projected.easting - AOI_ORIGIN_EPSG6677.easting, 0, AOI_ORIGIN_EPSG6677.northing - projected.northing);
      return Math.abs(CITY_CLIP_PLANES[index]!.distanceToPoint(world));
    });
    // Independent geometry review measured 0.01393432 m. This is a projected
    // straight square; a geographic curve is bounded, not silently substituted.
    expect(Math.max(...departures)).toBeGreaterThan(0.013);
    expect(Math.max(...departures)).toBeLessThan(0.014);
  });
});

describe("source-coincident section regions", () => {
  it("preserves closed components, cavities, floating mass and touching contacts", () => {
    expect(sectionRegion(rectangle(), "closed").area).toBeCloseTo(16, 8);
    expect(sectionRegion([...rectangle(), ...rectangle(3, 5, 3, 5)], "cavity").area).toBeCloseTo(12, 8);
    expect(sectionRegion([...rectangle(), ...rectangle(8, 10, 4, 6)], "separate").area).toBeCloseTo(20, 8);
    expect(sectionRegion([...rectangle(), ...rectangle(6, 8, 6, 8)], "touching").area).toBeCloseTo(20, 8);
    expect(sectionRegion(rectangle(2, 6, 10, 12), "floating").area).toBeCloseTo(8, 8);
  });
  it("preserves the independently checked concave L contour area", () => {
    const points = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]] as const;
    const segments: SectionSegment[] = points.map((point, index) => [point, points[(index + 1) % points.length]!]);
    expect(sectionRegion(segments, "concave L").area).toBe(7);
  });
  it("adds exactly one bounded connector and moves no input endpoint", () => {
    const segments = rectangle(); const changed: SectionSegment[] = [...segments];
    changed[2] = [segments[2]![0], [2.00055, 6]];
    const before = structuredClone(changed), region = sectionRegion(changed, "tiny gap");
    expect(region.connector).not.toBeNull(); expect(changed).toEqual(before);
    const closed = closeSection(changed, "tiny gap");
    changed.forEach((segment, index) => expect(closed.segments[index]).toBe(segment));
    expect(closed.segments).toHaveLength(changed.length + 1);
    expect(region.area).toBeCloseTo(16, 8);
  });
  it("rejects unsupported openings and duplicate zero-volume inputs", () => {
    expect(() => sectionRegion(rectangle().slice(1), "missing edge")).toThrow(/exceeds/);
    expect(() => sectionRegion([...rectangle().slice(1), ...rectangle(8, 10).slice(1)], "two openings")).toThrow(/open components/);
    const wide = rectangle(); wide[2] = [wide[2]![0], [2.002, 6]];
    expect(() => sectionRegion(wide, "wide gap")).toThrow(/exceeds/);
    expect(() => sectionRegion([[[0, 2], [3, 2]], [[0, 2], [3, 2]]], "duplicate roof")).toThrow(/duplicate/);
  });
  it("keeps the actual degree-4 source contact and connects only the reviewed leaf gap", () => {
    const fixture = JSON.parse(readFileSync(new URL("./fixtures/cutout-sections.json", import.meta.url), "utf8")) as { cases: { tile: string; segments: SectionSegment[] }[] };
    for (const row of fixture.cases) {
      const before = structuredClone(row.segments), region = sectionRegion(row.segments, row.tile);
      expect(region.area).toBeGreaterThan(0); expect(row.segments).toEqual(before);
      expect(Boolean(region.connector)).toBe(row.tile === "data533.b3dm");
      if (row.tile === "data510.b3dm") expect(closeSection(row.segments, row.tile).segments).toBe(row.segments);
    }
  });
  it("slices transformed geometry without changing its source buffers", () => {
    const side = CUTOUT_SIDES[0]!;
    const geometry = new BoxGeometry(8, 10, 8);
    geometry.setAttribute("_batchid", geometry.getAttribute("position").clone());
    const ids = geometry.getAttribute("_batchid"); for (let i = 0; i < ids.count; i++) ids.setX(i, 0);
    const root = new Group(), source = new Mesh(geometry, new MeshStandardMaterial());
    source.position.set(side.x + side.dx * 50, 40, side.z + side.dz * 50); source.rotation.y = 0.23; root.add(source);
    const positions = [...geometry.getAttribute("position").array];
    const caps = buildingSections(root, "transformed box");
    expect(caps).toHaveLength(1); expect(caps[0]!.side).toBe(0);
    expect([...geometry.getAttribute("position").array]).toEqual(positions);
    for (const cap of caps) cap.geometry.dispose(); geometry.dispose(); source.material.dispose();
  });
  it("interpolates a terrain triangle on its actual edge", () => {
    const side = { name: "test", x: 0, z: 0, dx: 1, dz: 0, length: 10 };
    expect(sliceTriangle([[0, 10, -1], [4, 14, 1], [8, 18, -1]], side)).toEqual([[2, 12], [6, 16]]);
  });
  it("distinguishes coplanar faces, point contact, plane edges and vertex crossings", () => {
    const side = { name: "test", x: 0, z: 0, dx: 1, dz: 0, length: 10 };
    expect(sliceTriangle([[0, 0, 0], [1, 0, 0], [0, 1, 0]], side)).toBeNull();
    expect(sliceTriangle([[0, 0, 0], [1, 1, 1], [-1, 1, 1]], side)).toBeNull();
    expect(sliceTriangle([[0, 0, 0], [2, 2, 0], [1, 1, 1]], side)).toEqual([[0, 0], [2, 2]]);
    expect(sliceTriangle([[0, 0, 0], [2, 2, 1], [2, 4, -1]], side)).toEqual([[0, 0], [2, 3]]);
  });
  it("reconstructs outward section normals under a rotated nonuniform root scale", () => {
    const transform = new Matrix4().makeRotationY(0.73).scale(new Vector3(2, 3, 0.5));
    transform.setPosition(31, 7, -18);
    const worldToLocal = transform.clone().invert(), normalToWorld = new Matrix3().getNormalMatrix(transform);
    for (const side of CUTOUT_SIDES) {
      const geometry = sectionGeometry([[[5, 2], [7, 8], [7, 2]]], side, worldToLocal);
      try {
        const local = new Vector3().fromBufferAttribute(geometry.getAttribute("normal"), 0);
        expect(local.length()).toBeCloseTo(1, 7);
        expect(local.applyNormalMatrix(normalToWorld).distanceTo(new Vector3(side.dz, 0, -side.dx))).toBeLessThan(1e-7);
      } finally { geometry.dispose(); }
    }
  });
  it("retains every representable cap triangle and uses unit plane normals after final coordinate quantization", () => {
    const side = { name: "quantized side", x: 500, z: 500, dx: 1, dz: 0, length: 10 };
    const triangles = [[[0, 10], [1, 12], [1, 10]], [[0, 10], [1e-8, 12], [1e-8, 10]]] as const;
    const world = sectionGeometry(triangles, side), local = sectionGeometry(triangles, side, new Matrix4().makeTranslation(-500, 0, -500));
    try {
      expect(world.getAttribute("position").count).toBe(3);
      expect(local.getAttribute("position").count).toBe(6);
      for (const geometry of [world, local]) {
        const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal");
        for (let i = 0; i < p.count; i += 3) {
          const a = new Vector3().fromBufferAttribute(p, i), b = new Vector3().fromBufferAttribute(p, i + 1), c = new Vector3().fromBufferAttribute(p, i + 2);
          expect(b.sub(a).cross(c.sub(a)).lengthSq()).toBeGreaterThan(0);
        }
        for (let i = 0; i < n.count; i++) expect(new Vector3().fromBufferAttribute(n, i).length()).toBeCloseTo(1, 7);
      }
    } finally { world.dispose(); local.dispose(); }
  });
  it("omits the independently observed data458 north triangle that collapses in Float32", () => {
    const witness = JSON.parse(readFileSync(new URL("./fixtures/cutout-sections.json", import.meta.url), "utf8")).quantization as { sectionTriangle: [number, number][]; float32Positions: [number, number, number][] };
    expect(witness.float32Positions[0]).toEqual(witness.float32Positions[2]);
    const geometry = sectionGeometry([witness.sectionTriangle, [[20, 1], [22, 5], [22, 1]]], CUTOUT_SIDES[0]!);
    try { expect(geometry.getAttribute("position").count).toBe(3); } finally { geometry.dispose(); }
  });
  it("covers all cached terrain sides and refuses a missing source region", () => {
    const mesh = decodeMesh(new Uint8Array(readFileSync(new URL("../data/scene/terrain.mesh", import.meta.url))));
    const caps = terrainSectionGeometry(mesh, mesh.header.bounds.min[1] - 12);
    expect(caps).toHaveLength(4); caps.forEach(geometry => { expect(geometry.getAttribute("position").count).toBeGreaterThan(1000); geometry.dispose(); });
    expect(() => terrainSectionGeometry({ ...mesh, indices: new Uint32Array() }, -10)).toThrow(/terrain ends/);
  });
});

it("holds the whole scene until all final leaves are prepared and closes admission on loss or failure", () => {
  const a = { content: { uri: "a.b3dm" } }, b = { content: { uri: "b.b3dm" } }, root = { children: [a, b], content: { uri: "coarse.b3dm" } };
  const state = new FinalLeafReadiness(); state.register(root, 2);
  expect(state.canDisplay([root])).toBe(false); state.loaded(a); expect(state.warming).toBe(true);
  state.loaded(b); expect(state.canDisplay([a])).toBe(true); expect(state.canDisplay([root])).toBe(false);
  state.removed(b); expect(state.canDisplay([a])).toBe(false); state.loaded(b); expect(state.canDisplay([b])).toBe(true);
  state.fail("b.b3dm could not load"); expect(state.canDisplay([a, b])).toBe(false); expect(state.message()).toContain("b.b3dm");
});
