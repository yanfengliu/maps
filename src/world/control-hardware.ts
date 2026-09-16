import type { NetworkData, WorldPoint } from "./network-data.ts";

export const CONTROL_HARDWARE_FILE = "/scene/control-hardware.json";
export const CONTROL_HARDWARE_REBUILD = "npm run data:hardware (after data:network, data:pavements, data:vehicles and data:vehicles:verify)";
export interface ControlHardwarePlacement {
  sourceId: string;
  sourceNodeId: number;
  sourcePosition: WorldPoint;
  status: "placed" | "unplaced";
  reason: string;
  /** Authored presentation, never a surveyed physical pole or head location. */
  base: WorldPoint | null;
  head: WorldPoint | null;
  direction: WorldPoint | null;
  evidence: {
    pavementTriangles: number[];
    vehiclePoseCount: number;
    maxVehicleTopY: number | null;
    pedestrianGapM: number | null;
    supportTriangles: number[];
  };
}
export interface ControlHardwareData {
  version: 1;
  method: string;
  bounds: { vehicleScale: number; routeStepM: number; clearanceM: number; searchRadiusM: number };
  inputs: { network: string; networkCanonical: string; roads: string; pavements: string; vehicles: string };
  records: ControlHardwarePlacement[];
}

/** Consumer rejects incomplete accounting and stale physical facts. The road
 * and pavement hashes are verified against the exact bytes already loaded.
 */
export function validateControlHardware(value: unknown, network: NetworkData, inputs: { roads: string; pavements: string; networkCanonical: string }): ControlHardwareData {
  const data = value as ControlHardwareData;
  const fail = (reason: string): never => { throw new Error(`${CONTROL_HARDWARE_FILE} ${reason}; rebuild with ${CONTROL_HARDWARE_REBUILD}.`); };
  if (!data || data.version !== 1 || !Array.isArray(data.records) || !data.inputs || typeof data.method !== "string" || !data.bounds) fail("has an unsupported presentation format");
  for (const key of ["network", "networkCanonical", "roads", "pavements", "vehicles"] as const) if (!/^[a-f0-9]{64}$/.test(data.inputs[key])) fail(`has no valid ${key} input digest`);
  if (data.inputs.roads !== inputs.roads || data.inputs.pavements !== inputs.pavements) fail("was generated against different road or pavement bytes");
  if (data.inputs.networkCanonical !== inputs.networkCanonical) fail("was generated against different network geometry, widths or control metadata");
  if (data.bounds.vehicleScale !== 1 || data.bounds.routeStepM !== .5 || data.bounds.clearanceM !== .6 || data.bounds.searchRadiusM !== 18) fail("has incompatible clearance bounds");
  const source = new Map(network.physical.trafficControls.map(c => [c.id, c])), seen = new Set<string>();
  const point = (p: WorldPoint | null): boolean => !!p && [p.x, p.y, p.z].every(Number.isFinite);
  for (const record of data.records) {
    if (!record || typeof record !== "object" || typeof record.sourceId !== "string") fail("contains a malformed control record without a source ID");
    const control = source.get(record.sourceId);
    if (!control || seen.has(record.sourceId)) fail(`contains an unknown or duplicate source control ${record.sourceId}`);
    seen.add(record.sourceId);
    if (record.sourceNodeId !== control!.sourceNodeId || !point(record.sourcePosition) || ["x", "y", "z"].some(k => record.sourcePosition[k as keyof WorldPoint] !== control!.position[k as keyof WorldPoint])) fail(`has stale source geometry for ${record.sourceId}`);
    if (typeof record.reason !== "string" || !record.reason.length || !record.evidence || !Array.isArray(record.evidence.pavementTriangles) || !Array.isArray(record.evidence.supportTriangles) || !Number.isInteger(record.evidence.vehiclePoseCount) || record.evidence.vehiclePoseCount < 0 || [...record.evidence.pavementTriangles, ...record.evidence.supportTriangles].some(v => !Number.isInteger(v) || v < 0) || (record.evidence.maxVehicleTopY !== null && !Number.isFinite(record.evidence.maxVehicleTopY)) || (record.evidence.pedestrianGapM !== null && !Number.isFinite(record.evidence.pedestrianGapM))) fail(`has no valid placement evidence for ${record.sourceId}`);
    if (record.status === "placed") {
      if (!point(record.base) || !point(record.head) || !point(record.direction) || Math.abs(Math.hypot(record.direction!.x, record.direction!.z) - 1) > 1e-6 || record.direction!.y !== 0 || record.head!.y <= record.base!.y || record.evidence.pavementTriangles.length === 0) fail(`has invalid authored geometry for ${record.sourceId}`);
    } else if (record.status !== "unplaced" || record.base !== null || record.head !== null) fail(`has an invalid placement status for ${record.sourceId}`);
  }
  if (seen.size !== source.size) fail(`accounts for ${seen.size} of ${source.size} source controls`);
  return data;
}
