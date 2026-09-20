/** Historical admitted source facts only. They select no current surface or gait. */
export type WalkingSourceField = "highway" | "footway" | "foot" | "area" | "access" | "indoor" | "tunnel" | "bridge" | "layer" | "level";
/** Missing level stays absent; a steps class does not authorize step locomotion. */
export type WalkingSourceFields = Readonly<Partial<Record<WalkingSourceField, string>>>;
export type HistoricalWalkFact =
  | Readonly<{ edgeId: string; kind: "sidewalk" | "crossing"; sourceWayId: number; origin: "osm"; fields: WalkingSourceFields }>
  | Readonly<{ edgeId: "walk:authored:scramble-diagonal:f" | "walk:authored:scramble-diagonal:r"; kind: "crossing"; sourceWayId: null; origin: "authored"; rule: "scramble-diagonal-v1" }>;

export interface HistoricalWalkingFacts {
  readonly version: 1;
  readonly filter: "surface-walk-v1";
  readonly binding: Readonly<{
    acceptedNetworkSha256: string;
    originalNetworkOsmSha256: string;
    replayNetworkSha256: string;
    replaySourceSha256: string;
    querySha256: string;
    queryCutoff: string;
    responseWatermark: string;
    lineageFreezeSha256: string;
    /** The historical replay generator, not the current facts implementation. */
    producerRevision: string;
    /** Current imported osm.ts must match this reviewed helper after CRLF to LF. */
    filterHelperNormalizedSha256: string;
    oldTerrainSha256: string;
    oldRoadsSha256: string;
    orderedPayloadSha256: string;
    originalRawRecovered: false;
  }>;
  readonly edges: readonly HistoricalWalkFact[];
}
