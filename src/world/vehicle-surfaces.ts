/** Bounded physical vehicle support, separate from the OSM movement graph.
 * The producer assigns source areas to a physical layer before triangles are
 * queried. LOD2 heights are authored drapes, never surveyed zero elevations.
 */
export const VEHICLE_SURFACES_URL = "/scene/vehicle-surfaces.json";
export const VEHICLE_SUPPORT_OVERLAY_URL = "/scene/vehicle-support-overlay.mesh";
export type PlanPoint = readonly [number, number];
export type SurfaceVertex = readonly [number, number, number];
export interface VehicleSurfaceSource {
  readonly roadId: string;
  readonly areaId: string;
  readonly polygonId: string;
  readonly functionCode: number;
  readonly lod: 2 | 3;
}
export interface VehicleSurfaceTriangle {
  readonly id: string;
  readonly layerId: string;
  readonly vertices: readonly [SurfaceVertex, SurfaceVertex, SurfaceVertex];
  readonly source: VehicleSurfaceSource;
  readonly provenance: "displayed-road" | "authored-seam-reconciliation";
  /** Original displayed road triangle, or the adjacent triangles used by a seam. */
  readonly roadTriangleIds: readonly number[];
}
export interface VehicleCorridor {
  readonly id: string;
  readonly layerId: string;
  readonly routeEdgeIds: readonly string[];
  /** Non-overlapping or overlapping convex carriageway pieces, with holes removed. */
  readonly allowed: readonly (readonly PlanPoint[])[];
  readonly sourceAreas: readonly VehicleSurfaceSource[];
  readonly triangleIds: readonly string[];
  /** Authored supported orientation bound for this increment, not a city-wide limit. */
  readonly maximumTiltRadians: number;
}
export interface VehicleSurfaces {
  readonly version: 1;
  readonly scope: "named-vehicle-trajectory-increment";
  readonly inputs: {
    readonly network: string;
    readonly vehicles: string;
    readonly roads: string;
    readonly pavementSource: string;
    readonly sourceFiles: readonly { readonly path: string; readonly sha256: string }[];
  };
  readonly overlay: { readonly url: typeof VEHICLE_SUPPORT_OVERLAY_URL; readonly sha256: string; readonly triangles: number };
  readonly corridors: readonly VehicleCorridor[];
  readonly triangles: readonly VehicleSurfaceTriangle[];
  readonly reconciliation: readonly {
    readonly corridorId: string;
    readonly source: VehicleSurfaceSource;
    readonly kind?: "source-carriageway-seam";
    readonly pairedEdges?: readonly {readonly source:VehicleSurfaceSource;readonly a:PlanPoint;readonly b:PlanPoint}[];
    readonly lowerSource?: VehicleSurfaceSource;
    readonly areaM2: number;
    readonly maximumWidthM: number;
    readonly maximumAdjacentHeightDifferenceM: number;
    readonly triangleIds: readonly string[];
  }[];
}
