/**
 * Versioned OSM movement database. It stays separate from PLATEAU scene meshes.
 * Coordinates are world metres, +X east, +Z south and Y above Tokyo Bay mean sea level.
 * Lane dimensions and signal timings are simulation estimates, not a traffic survey.
 */
export const NETWORK_VERSION = 1;
export const NETWORK_FILE = "/network/network.json";

export interface WorldPoint { x: number; y: number; z: number }

export interface NetworkNode {
  id: string;
  position: WorldPoint;
  boundary: boolean;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  points: WorldPoint[];
  lengthM: number;
  widthM: number;
  sourceWayId: number | null;
  nextIds: string[];
  /** Entry permission only. An actor already inside must continue clearing on red. */
  signalGroupId: string | null;
  /** Physical conflict section only; null internal gaps can still belong to an actor's committed RoutePassage. */
  junctionId: string | null;
}

export interface LaneEdge extends NetworkEdge {
  kind: "lane" | "turn";
  speedMps: number;
  /** Same-direction neighbours on the same road segment; null across a junction. */
  leftLaneId: string | null;
  rightLaneId: string | null;
  /** Mapped stop/yield survives grouping. RoutePassage locates its physical obligation separately from outer admission. */
  entryRule: "signal" | "stop" | "yield" | "priority" | "none";
  sourceControlNodeIds: number[];
}

export interface WalkEdge extends NetworkEdge {
  kind: "sidewalk" | "crossing" | "connector";
}

export interface Junction {
  id: string;
  controlKind: "signal" | "reservation";
  controlSource: "mapped" | "authored" | "inferred";
  /** Original authorities grouped for footprint clearance; physical disks and mapped hardware remain unchanged. */
  memberIds?: string[];
  position: WorldPoint;
  /** Authored conflict envelope from crossing extents; approaches split at its boundary. */
  radiusM: number;
  /** Original disks after overlapping/nearby controls share authority; radiusM is only a display bound. */
  conflictAreas?: { position: WorldPoint; radiusM: number }[];
  vehicleGroups: string[];
  pedestrianGroup: string;
  clearanceSeconds: number;
  vehicleGreenSeconds: number;
  pedestrianGreenSeconds: number;
}

export interface PhysicalCrossing {
  id: string;
  source: "osm" | "authored";
  sourceWayId: number | null;
  paths: WorldPoint[][];
  markings: "zebra" | "none" | "unknown" | "other";
  sourceMarkings: string | null;
  control: "signals" | "uncontrolled" | "unknown";
  widthM: number;
  widthSource: "osm" | "inferred" | "authored";
}

export interface PhysicalTactilePath {
  id: string;
  sourceWayId: number;
  paths: WorldPoint[][];
  sourceReason: "tactile_paving_tag" | "source_note";
  /** A paving=yes tag alone is not evidence of a continuous tactile strip. */
  extent: "path" | "endpoints" | "unspecified";
}

export interface PhysicalTrafficControl {
  id: string;
  sourceNodeId: number;
  position: WorldPoint;
  kind: "traffic_signals" | "stop" | "give_way";
  direction: "forward" | "backward" | "both" | "unknown";
  /** Vehicle travel vector where source direction and connected approaches agree. */
  travelDirection: { x: number; z: number } | null;
  sourceWayIds: number[];
  approachEdgeIds: string[];
  entryEdgeIds: string[];
  controllerId: string | null;
  sourceTags: Record<string,string>;
}

export interface NetworkDiagnostics {
  sourceElements: number;
  uniqueElements: number;
  surfaceWays: number;
  surfaceSignalNodes: number;
  excludedWays: Record<string, number>;
  inferredLaneWays: number[];
  inferredWidthWays: number[];
  /** Unsupported restrictions are conservatively blocked, never permission. */
  conservativeRestrictions: { relationId: number; reason: string }[];
  clippedSegments: number;
  droppedShortSegments: number;
  undrapableSegments: { sourceWayId: number; segmentId: string; x: number; z: number; lostLengthM: number; reason: string }[];
  authoredEdges: string[];
  vehicleComponents: number;
  pedestrianComponents: number;
  vehicleEdgesReachingExit: number;
  vehicleEdgesReachableFromEntry: number;
  vehicleEntriesWithoutExit: string[];
}

export interface NetworkData {
  version: 1;
  admissionBounds: { maxFootprintDiagonalM:number; stopGapM:number; routeGroupingGapM:number };
  boundary: { polygon:WorldPoint[]; provenance:"projected-aoi-bounds"; maxEgressDistanceM:number };
  provenance: {
    osmTimestamp: string;
    osmSha256: string;
    terrainSha256: string;
    roadsSha256: string;
    method: string;
  };
  nodes: NetworkNode[];
  lanes: LaneEdge[];
  walks: WalkEdge[];
  junctions: Junction[];
  /** Physical source facts. Movement corridor widths do not authorize pavement, paint or poles. */
  physical: { crossings: PhysicalCrossing[]; tactilePaths: PhysicalTactilePath[]; trafficControls: PhysicalTrafficControl[] };
  /** Edge IDs. Entry/exit lanes touch the geographic AOI border, not an interior dead end. */
  portals: { vehicleEntry: string[]; vehicleExit: string[]; pedestrian: string[] };
  diagnostics: NetworkDiagnostics;
}
