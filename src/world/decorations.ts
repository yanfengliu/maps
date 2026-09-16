/** Separate OSM-derived vegetation data; never embedded in PLATEAU tile bytes. */
import type { WorldPoint } from "./network-data.ts";
export const DECORATIONS_FILE = "/scene/decorations.json";
export interface DecorationData {
  version: 1;
  provenance: { osmTimestamp: string; osmSha256: string; terrainSha256: string; method: string };
  trees: { sourceId: number; position: WorldPoint; heightM: number; crownRadiusM: number; inferredSize: boolean; rowPlacement: boolean }[];
  greens: { sourceId: number; kind: string; points: WorldPoint[]; triangles: WorldPoint[] }[];
  barriers: { sourceId: number; kind: "guard_rail" | "bollard"; points: WorldPoint[]; heightM: number; inferredHeight: boolean }[];
  skipped: { sourceId: number; reason: string }[];
}
