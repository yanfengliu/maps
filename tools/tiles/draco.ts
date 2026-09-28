/**
 * Decoding the Draco geometry inside a PLATEAU tile, offline.
 *
 * Every one of the 67 tiles over the area of interest declares
 * `KHR_draco_mesh_compression` in `extensionsRequired`, so nothing in this project
 * sees a single triangle until a Draco decoder has run. Phase 1 observed the
 * extension and never exercised it, which left the most likely thing to fail at
 * load completely unchecked.
 *
 * This module runs the same decoder the browser runs — the one three.js ships in
 * `three/examples/jsm/libs/draco/` — under Node, so the pipeline can reconcile the
 * decoded geometry against what the tile's own batch table claims before anything
 * is written for the scene. It is the offline half of that check; the browser half
 * is that the tiles visibly draw.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

import type { GltfJson, GltfPrimitive } from "./b3dm.ts";

const require = createRequire(import.meta.url);

interface DracoAttribute {
  num_components(): number;
}

interface DracoMesh {
  num_faces(): number;
  num_points(): number;
}

interface DracoDecoderModuleInstance {
  Decoder: new () => DracoDecoder;
  DecoderBuffer: new () => DracoBuffer;
  DracoFloat32Array: new () => DracoTypedArray;
  DracoInt32Array: new () => DracoTypedArray;
  Mesh: new () => DracoMesh;
  TRIANGULAR_MESH: number;
  destroy(object: unknown): void;
}

interface DracoBuffer {
  Init(data: Int8Array, length: number): void;
}

interface DracoTypedArray {
  size(): number;
  GetValue(index: number): number;
}

interface DracoStatus {
  ok(): boolean;
  error_msg(): string;
}

interface DracoDecoder {
  GetFaceFromMesh(mesh: DracoMesh, index: number, out: DracoTypedArray): boolean;
  GetEncodedGeometryType(buffer: DracoBuffer): number;
  DecodeBufferToMesh(buffer: DracoBuffer, mesh: DracoMesh): DracoStatus;
  GetAttributeByUniqueId(mesh: DracoMesh, id: number): DracoAttribute;
  GetAttributeFloatForAllPoints(
    mesh: DracoMesh,
    attribute: DracoAttribute,
    out: DracoTypedArray,
  ): boolean;
  GetTrianglesUInt32Array(mesh: DracoMesh, byteLength: number, out: number): boolean;
}

let modulePromise: Promise<DracoDecoderModuleInstance> | undefined;

/**
 * Load the decoder once per process.
 *
 * three.js ships two builds: a WebAssembly one it prefers in a browser and a
 * plain JavaScript one. The JavaScript build is used here because it needs
 * nothing but Node, and because the point of this decode is to check the *bytes*
 * — a tile that decodes under one Draco build decodes under the other.
 *
 * It is run through `vm` rather than `require`d. The file is a UMD script that
 * exports itself through `module.exports`, but it lives under `three`, whose
 * package.json declares `"type": "module"`, so Node loads it as an ES module and
 * hands back an empty namespace object with no error at all. That is the
 * return-value failure the fleet canon names: a call that cannot do what was asked
 * quietly gives back something the next line accepts.
 */
async function decoderModule(): Promise<DracoDecoderModuleInstance> {
  if (modulePromise === undefined) {
    const path = require.resolve("three/examples/jsm/libs/draco/draco_decoder.js");
    const scope: { module: { exports: unknown }; exports: unknown; self?: unknown } = {
      module: { exports: {} },
      exports: {},
    };
    scope.self = scope;
    runInNewContext(readFileSync(path, "utf8"), scope, { filename: path });
    const factory = scope.module.exports as (() => Promise<DracoDecoderModuleInstance>) | undefined;
    if (typeof factory !== "function") {
      throw new Error(
        `Loading the Draco decoder from ${path} produced ${typeof factory} rather than a factory ` +
          "function. three.js changed how it ships that file.",
      );
    }
    modulePromise = factory();
  }
  return modulePromise;
}

export interface DecodedPrimitive {
  triangleCount: number;
  vertexCount: number;
  /** Interleaved x, y, z in the tile's own ECEF-parallel metres. */
  positions: Float32Array;
  /** One per vertex, or undefined when the primitive carries no `_BATCHID`. */
  batchIds: Float32Array | undefined;
  /** Explicit opt-in for offline source-preserving surface adaptations. */
  surface?: { indices: Uint32Array; normals: Float32Array; uv: Float32Array | null };
}

/**
 * Decode one primitive's positions and batch ids.
 *
 * Existing callers read positions and batch ids. Source-preserving offline
 * adaptations explicitly opt in to normals, UV0 and the original face indices.
 */
export async function decodePrimitive(
  json: GltfJson,
  binary: Uint8Array,
  primitive: GltfPrimitive,
  includeSurface = false,
): Promise<DecodedPrimitive> {
  const compression = primitive.extensions?.KHR_draco_mesh_compression;
  if (compression === undefined) {
    throw new Error(
      "This primitive is not Draco-compressed. Every AOI tile MLIT publishes is, so a tile that " +
        "is not means the upstream build changed and the pipeline's triangle reconciliation would " +
        "silently be measuring something else.",
    );
  }

  const draco = await decoderModule();
  const view = json.bufferViews?.[compression.bufferView];
  if (view === undefined) {
    throw new Error(
      `A Draco primitive names bufferView ${compression.bufferView}, which this glTF does not have.`,
    );
  }
  const payload = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);

  const buffer = new draco.DecoderBuffer();
  const decoder = new draco.Decoder();
  const mesh = new draco.Mesh();
  try {
    // Buffer.slice() retains the backing allocation and its offset. Copy the
    // exact payload for both Uint8Array and Buffer-backed source readers.
    buffer.Init(new Int8Array(Uint8Array.from(payload).buffer), payload.byteLength);
    if (decoder.GetEncodedGeometryType(buffer) !== draco.TRIANGULAR_MESH) {
      throw new Error(
        "This Draco payload is not a triangular mesh. PLATEAU's building tiles always are.",
      );
    }
    const status = decoder.DecodeBufferToMesh(buffer, mesh);
    if (!status.ok()) {
      throw new Error(`Draco refused to decode this primitive: ${status.error_msg()}`);
    }

    const positionIndex = compression.attributes.POSITION;
    if (positionIndex === undefined) {
      throw new Error(
        "This Draco primitive declares no POSITION attribute, so it has no geometry to place. " +
          "Every PLATEAU building tile does.",
      );
    }
    const positions = readFloatAttribute(draco, decoder, mesh, positionIndex, 3);
    const batchIdIndex = compression.attributes._BATCHID;
    const batchIds =
      batchIdIndex === undefined
        ? undefined
        : readFloatAttribute(draco, decoder, mesh, batchIdIndex, 1);

    const result: DecodedPrimitive = {
      triangleCount: mesh.num_faces(),
      vertexCount: mesh.num_points(),
      positions,
      batchIds,
    };
    if (includeSurface) {
      const normalIndex = compression.attributes.NORMAL;
      if (normalIndex === undefined) throw new Error("Rail source primitive has no NORMAL attribute; restore the reviewed tile before adapting its surfaces.");
      const normals = readFloatAttribute(draco, decoder, mesh, normalIndex, 3);
      const uvIndex = compression.attributes.TEXCOORD_0;
      const uv = uvIndex === undefined ? null : readFloatAttribute(draco, decoder, mesh, uvIndex, 2);
      const indices = new Uint32Array(mesh.num_faces() * 3);
      const face = new draco.DracoInt32Array();
      try {
        for (let i = 0; i < mesh.num_faces(); i++) {
          if (!decoder.GetFaceFromMesh(mesh, i, face)) throw new Error(`Draco could not read source face ${i}; no partial rail adaptation is allowed.`);
          for (let j = 0; j < 3; j++) indices[i * 3 + j] = face.GetValue(j);
        }
      } finally { draco.destroy(face); }
      result.surface = { indices, normals, uv };
    }
    return result;
  } finally {
    draco.destroy(mesh);
    draco.destroy(decoder);
    draco.destroy(buffer);
  }
}

function readFloatAttribute(
  draco: DracoDecoderModuleInstance,
  decoder: DracoDecoder,
  mesh: DracoMesh,
  uniqueId: number,
  expectedComponents: number,
): Float32Array {
  const attribute = decoder.GetAttributeByUniqueId(mesh, uniqueId);
  const components = attribute.num_components();
  if (components !== expectedComponents) {
    throw new Error(
      `Draco attribute ${uniqueId} has ${components} components where ${expectedComponents} were ` +
        "expected. Reading it anyway would interleave the wrong numbers and place the geometry " +
        "somewhere convincing.",
    );
  }
  const array = new draco.DracoFloat32Array();
  try {
    if (!decoder.GetAttributeFloatForAllPoints(mesh, attribute, array)) {
      throw new Error(`Draco could not read attribute ${uniqueId} as floats.`);
    }
    const out = new Float32Array(array.size());
    for (let index = 0; index < out.length; index += 1) out[index] = array.GetValue(index);
    return out;
  } finally {
    draco.destroy(array);
  }
}
