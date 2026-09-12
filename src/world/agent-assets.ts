/** Offline agent asset contract. Positions are metres, feet at zero, +Y up, +Z forward. */
/** Human VAT format; original vehicle manifests independently remain version 1. */
export const AGENT_ASSET_VERSION = 2 as const;
export const HUMAN_ASSET_URLS = Object.freeze([
  "/scene/agents/commuter-male.json",
  "/scene/agents/office-male.json",
  "/scene/agents/commuter-female.json",
]);
export const VEHICLE_ASSET_URL = "/scene/agents/vehicles.json";
/** Indices are the simulation's stable class indices, shared with the recipe. */
export const VEHICLE_CLASSES = Object.freeze(["kei", "taxi", "bus"] as const);

export interface VehicleAsset {
  readonly id: typeof VEHICLE_CLASSES[number];
  /** Nominal body dimensions; protruding mirrors and bumpers are in bounds. */
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly wheelRadius: number;
  readonly collision: { readonly width: number; readonly length: number };
  readonly bounds: { readonly min: readonly number[]; readonly max: readonly number[] };
  readonly axles: { readonly frontZ: number; readonly rearZ: number; readonly trackMetres: number };
  readonly model: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly vertexCount: number;
  readonly wheelObjects: readonly string[];
}

export interface VehicleAssetManifest {
  readonly version: 1;
  readonly units: "metres";
  readonly up: "+Y";
  readonly forward: "+Z";
  readonly origin: "ground-centre";
  readonly yawAxis: "+Y";
  readonly licence: string;
  readonly source: string;
  readonly vehicles: readonly VehicleAsset[];
}

export interface AgentAnimationClip {
  readonly id: "idle" | "walk";
  readonly firstFrame: number;
  readonly frameCount: number;
  readonly durationSeconds: number;
  /** One full two-step cycle. Phase advances by travelled metres / strideMetres. */
  readonly strideMetres: number;
  readonly loop: true;
}

export interface AgentAssetLod {
  readonly id: "near" | "medium" | "far";
  readonly model: string;
  readonly modelSha256: string;
  /** Count before glTF splits vertices at UV seams; _VAT_ID keeps the lookup stable. */
  readonly vertexCount: number;
  /** Required drawable primitives in the GLB's selected scene, never its orphan mesh pool. */
  readonly drawParts: readonly AgentDrawPart[];
  readonly bounds: { readonly min: readonly number[]; readonly max: readonly number[] };
  readonly positions: string;
  readonly normals: string;
  readonly positionSha256: string;
  readonly normalSha256: string;
  readonly textureWidth: number;
  readonly textureHeight: number;
  readonly rowsPerFrame: number;
  readonly bytes: number;
  readonly maxAnkleTargetErrorMetres: number;
  readonly maxStanceWorldDriftMetres: number;
}

export interface AgentDrawPart {
  readonly node: string;
  readonly primitive: number;
  readonly vertexCount: number;
  readonly indexCount: number;
  /** Column-major selected-scene bind transform. VAT already includes this transform. */
  readonly bindMatrix: readonly number[];
}

export interface AgentAssetManifest {
  readonly version: typeof AGENT_ASSET_VERSION;
  readonly id: string;
  readonly units: "metres";
  readonly up: "+Y";
  readonly forward: "+Z";
  readonly origin: "feet";
  readonly yawAxis: "+Y";
  readonly vertexAttribute: "_VAT_ID";
  /** Raw little-endian half floats. Each frame occupies rowsPerFrame whole rows. */
  readonly textureFormat: "rgba16f-le";
  readonly vatSpace: "world-baked";
  readonly clips: readonly AgentAnimationClip[];
  readonly lods: readonly AgentAssetLod[];
  readonly sources: readonly {
    readonly id: string;
    readonly url: string;
    readonly licence: string;
    readonly licenceUrl?: string;
    readonly sha256?: string;
  }[];
  readonly animation: string;
  readonly qualityStatus: string;
}
