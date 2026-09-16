/** Bounds: local planar/stacked support, measured body projection, logical node
 * separation and artifact accounting. The discrete city recipe and actual
 * rendered pole/arm clearances also need the named native east/low views.
 * Malformed fleet records/vectors must fail before geometry is queried; the
 * original null-record and missing-vector producer paths threw raw TypeErrors.
 */
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import type { VehicleAsset } from "../src/world/agent-assets.js";
import type { MeshData } from "../src/world/mesh.js";
import type { NetworkData } from "../src/world/network-data.js";
import type { ControlHardwareData } from "../src/world/control-hardware.js";
import { validateControlHardware } from "../src/world/control-hardware.js";
import { loadControlHardware } from "../src/scene/control-hardware.js";
import { createStreetDetails } from "../src/scene/street-details.js";
import { worldStyle } from "../src/world/styles.js";
import { contactQuery, supportedVehicle, type ContactQuery } from "../tools/scene/hardware-support.js";
import { placeControlHardware } from "../tools/scene/control-hardware.js";

// Independent geometric fixture with the measured bus dimensions; no source
// assertion is inferred from synthetic route or plane coordinates.
const bus: VehicleAsset = { id: "bus", length: 10.5, width: 2.5, height: 3.3, wheelRadius: .45, model: "fixture.glb", sha256: "fixture", bytes: 1, vertexCount: 8, wheelObjects: ["front-right", "front-left", "rear-right", "rear-left"], bounds: { min: [-1.64, 0, -5.2775], max: [1.64, 3.3245, 5.2825] }, collision: { width: 3.28, length: 10.565 }, axles: { frontZ: 3.276, rearZ: -2.86, trackMetres: 2.4 } };
const fleet = [bus, { ...bus, id: "kei" }, { ...bus, id: "taxi" }] as VehicleAsset[];
const plane = (grade = 0, height = 15): ContactQuery => (x, z) => ({ point: { x, y: height + z * grade, z }, normal: { x: 0, y: 1 / Math.hypot(1, grade), z: -grade / Math.hypot(1, grade) }, triangle: 0 });
const control = { id: "logical", sourceNodeId: 6219685053, position: { x: 0, y: 15, z: 0 }, kind: "traffic_signals", travelDirection: { x: 0, z: 1 }, sourceTags: {}, approachEdgeIds: ["road"], entryEdgeIds: ["road"], controllerId: "controller", sourceWayIds: [10] };
const network = { lanes: [{ id: "road", widthM: 3.5, points: [{ x: 0, y: 15, z: -10 }, { x: 0, y: 15, z: 10 }] }], walks: [], junctions: [], physical: { trafficControls: [control], crossings: [], tactilePaths: [] } } as unknown as NetworkData;
const pavement: ContactQuery = (x, z) => x >= 3 && x <= 6 && Math.abs(z) < 12 ? plane(0, 15.1)(x, z, 15) : undefined;
const roads: ContactQuery = (x, z) => Math.abs(x) < 2.5 && Math.abs(z) < 20 ? plane()(x, z, 15) : undefined;

it("names malformed fleet records and vectors before querying support", () => {
  const query = vi.fn<ContactQuery>(() => undefined);
  const malformed: unknown[] = [null, false, 7, "vehicle", {}, { ...bus, bounds: null }, { ...bus, bounds: {} }, { ...bus, bounds: { min: null, max: bus.bounds.max } }, { ...bus, bounds: { min: [0, 0], max: bus.bounds.max } }, { ...bus, bounds: { min: [0, NaN, 0], max: bus.bounds.max } }, { ...bus, axles: null }, { ...bus, collision: null }];
  for (const record of malformed) {
    const values = [record, fleet[1], fleet[2]] as VehicleAsset[];
    expect(() => placeControlHardware(network, values, query, query)).toThrow(/vehicles.json.*data:vehicles.*data:vehicles:verify/);
  }
  for (const values of [null, {}, [], [bus, bus, bus]]) {
    expect(() => placeControlHardware(network, values as VehicleAsset[], query, query)).toThrow(/vehicles.json.*data:vehicles.*data:vehicles:verify/);
  }
  expect(query).not.toHaveBeenCalled();
});

describe("hardware uses actual local support", () => {
  it("projects all body corners on a slope and includes wheel travel without a global spherical top", () => {
    const flat = supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, plane())!;
    expect(flat.maxY).toBeCloseTo(18.3745, 8);
    const tilted = supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, plane(.1))!;
    // Collision length 10.565 adds 2.5 mm at each end of the 10.56 m box.
    const expected = 15 + (3.3245 + .05) / Math.hypot(1, .1) + (5.2825 + .0025) * .1 / Math.hypot(1, .1);
    expect(tilted.maxY).toBeCloseTo(expected, 8);
    expect(tilted.maxY).toBeLessThan(19);
    expect(tilted.wheelResidualM).toBeLessThan(1e-10);
    expect(supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, plane(), 1.1)!.maxY).toBeCloseTo(15 + 3.3745 * 1.1, 8);
  });

  it("rejects missing contacts and an interior step beyond real wheel travel", () => {
    const gap: ContactQuery = (x, z, y) => x > 1 ? undefined : plane()(x, z, y);
    expect(supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, gap)).toBeUndefined();
    const step: ContactQuery = (x, z, y) => plane(0, x > 1 ? 15.08 : 15)(x, z, y);
    expect(supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, step)).toBeUndefined();
    const within: ContactQuery = (x, z, y) => plane(0, x > 1 ? 15.04 : 15)(x, z, y);
    expect(supportedVehicle(bus, { x: 0, y: 15, z: 0 }, 0, within)!.wheelResidualM).toBeCloseTo(.04, 8);
  });

  it("keeps stacked layers separate and rejects genuine missing interiors", () => {
    const positions = new Float32Array([-10, 15, -10, 10, 15, -10, 0, 15, 10, -10, 20, -10, 10, 20, -10, 0, 20, 10]);
    const mesh = { positions, indices: new Uint32Array([0, 2, 1, 3, 5, 4]) } as MeshData;
    const sample = contactQuery(mesh);
    expect(sample(0, 0, 15)?.point.y).toBe(15); expect(sample(0, 0, 20)?.point.y).toBe(20);
    expect(sample(0, 0, 17.5)).toBeUndefined(); expect(sample(8, 8, 15)).toBeUndefined();
  });

  it("moves a logical carriageway node to supported pavement and keeps incomplete support explicit", () => {
    const original = structuredClone(network);
    const [placed] = placeControlHardware(network, fleet, pavement, roads);
    expect(placed!.status).toBe("placed"); expect(placed!.base!.x).toBeGreaterThan(3);
    expect(placed!.base!.y).toBe(15.1); expect(placed!.sourcePosition).toEqual(control.position);
    expect(placed!.evidence.vehiclePoseCount).toBeGreaterThan(0);
    expect(placed!.head!.y - .175 - placed!.evidence.maxVehicleTopY!).toBeGreaterThanOrEqual(.6);
    expect(network).toEqual(original);
    const [unknown] = placeControlHardware(network, fleet, pavement, () => undefined);
    expect(unknown!.status).toBe("unplaced"); expect(unknown!.base).toBeNull(); expect(unknown!.reason).toMatch(/four supported wheel contacts/);
    const walk = { id: "walk:f", widthM: 20, points: [{ x: 4, y: 15.1, z: -12 }, { x: 4, y: 15.1, z: 12 }] };
    const [blocked] = placeControlHardware({ ...network, walks: [walk as NetworkData["walks"][number]] }, fleet, pavement, roads);
    expect(blocked!.status).toBe("unplaced");
  });
});

function artifact(): ControlHardwareData {
  return { version: 1, method: "Fixture", bounds: { vehicleScale: 1, routeStepM: .5, clearanceM: .6, searchRadiusM: 18 }, inputs: { network: "a".repeat(64), networkCanonical: createHash("sha256").update(JSON.stringify(network)).digest("hex"), roads: "b".repeat(64), pavements: "c".repeat(64), vehicles: "d".repeat(64) }, records: placeControlHardware(network, fleet, pavement, roads) };
}
it("requires all logical records and rejects stale surfaces or source positions", () => {
  const good = artifact(); expect(validateControlHardware(good, network, good.inputs)).toBe(good);
  expect(() => validateControlHardware({ ...good, records: [] }, network, good.inputs)).toThrow(/accounts for 0 of 1/);
  expect(() => validateControlHardware({ ...good, records: [good.records[0], good.records[0]] }, network, good.inputs)).toThrow(/duplicate source control/);
  expect(() => validateControlHardware(good, network, { ...good.inputs, pavements: "f".repeat(64) })).toThrow(/different road or pavement bytes/);
  expect(() => validateControlHardware(good, network, { ...good.inputs, networkCanonical: "e".repeat(64) })).toThrow(/different network geometry, widths or control metadata/);
  const stale = structuredClone(good); stale.records[0]!.sourcePosition.x += 1;
  expect(() => validateControlHardware(stale, network, good.inputs)).toThrow(/stale source geometry/);
});

it("names malformed record objects, points and evidence instead of throwing property errors", () => {
  const good = artifact(), record = good.records[0]!;
  for (const bad of [null, false, 7, "control", {}, { sourceId: null }, { ...record, sourcePosition: null }, { ...record, sourcePosition: { x: 0 } }, { ...record, evidence: null }, { ...record, evidence: { ...record.evidence, supportTriangles: [null] } }, { ...record, direction: { x: 0, y: 0, z: 0 } }]) {
    expect(() => validateControlHardware({ ...good, records: [bad] }, network, good.inputs)).toThrow(/control-hardware.json.*rebuild with npm run data:hardware/);
  }
});

it("renders the authored base, arm and head without reusing the logical node position", () => {
  const records = artifact().records, placed = records[0]!;
  const streets = createStreetDetails(network, worldStyle("satellite"), undefined, records);
  try {
    const posts = streets.root.getObjectByName("streets:posts") as InstancedMesh;
    const heads = streets.root.getObjectByName("streets:signal-heads") as InstancedMesh;
    expect(posts.count).toBe(2); expect(heads.count).toBe(1);
    const matrix = new Matrix4(); posts.getMatrixAt(0, matrix);
    const bottom = new Vector3(0, -.5, 0).applyMatrix4(matrix);
    expect(bottom.distanceTo(new Vector3(placed.base!.x, placed.base!.y, placed.base!.z))).toBeLessThan(1e-5);
    heads.getMatrixAt(0, matrix);
    expect(new Vector3().setFromMatrixPosition(matrix).distanceTo(new Vector3(placed.head!.x, placed.head!.y, placed.head!.z))).toBeLessThan(1e-5);
    expect(streets.counts).toMatchObject({ placedControls: 1, unplacedControls: 0, signalHeads: 1 });
  } finally { streets.dispose(); }
  expect(() => createStreetDetails(network, worldStyle("satellite"))).toThrow(/incomplete source accounting/);
});

it("names missing, malformed and incompatible artifact rebuilds at the consumer", async () => {
  const good = artifact();
  try {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 404 })));
    await expect(loadControlHardware(network, good.inputs)).rejects.toThrow(/control-hardware.json returned HTTP 404.*data:hardware/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>")));
    await expect(loadControlHardware(network, good.inputs)).rejects.toThrow(/is not JSON.*data:hardware/);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...good, version: 2 })));
    await expect(loadControlHardware(network, good.inputs)).rejects.toThrow(/unsupported presentation format.*data:hardware/);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(good)));
    expect((await loadControlHardware(network, good.inputs)).records).toEqual(good.records);
  } finally { vi.unstubAllGlobals(); }
});
