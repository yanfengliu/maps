/**
 * Reading and rewriting MLIT's `.b3dm` tiles.
 *
 * A b3dm is a 28-byte header, a feature table, a batch table and a GLB. This
 * module opens that envelope, hands the pipeline the batch table and the glTF
 * JSON, and puts a modified one back together.
 *
 * The pipeline changes exactly one thing inside a tile: where it sits. MLIT's
 * build states that with the `CESIUM_RTC` glTF extension, whose centre is an ECEF
 * position around seven million metres from the earth's centre, and the world
 * frame forbids a number like that reaching the browser. So the offline step
 * replaces the extension with an ordinary glTF root node carrying a placement
 * matrix in world metres, and drops `CESIUM_RTC` from `extensionsUsed` and
 * `extensionsRequired`. The result is plain glTF 2.0 plus Draco: any loader can
 * read it, and nothing in the scene graph is more than about a kilometre from the
 * origin.
 *
 * Nothing else is touched. The Draco payload, the WebP atlas and the 63-key batch
 * table are copied through byte for byte, so the tiles keep MLIT's geometry and
 * their per-building attributes exactly as published.
 */

/**
 * glTF is Y-up; the frame `CESIUM_RTC` translates in is Z-up.
 *
 * This is the single most damaging thing to get wrong about a b3dm, and it is
 * invisible in the file: the extension states a centre in ECEF metres, and the
 * vertices next to it are in the glTF convention where +Y is up. Everything in
 * 3D Tiles applies a Y-up to Z-up rotation between the two, and a pipeline that
 * does not still produces a city — the tiles land in the right place, the
 * buildings stand the right height above their own local origin, and every one of
 * them is rotated ninety degrees about an axis nobody thinks to check.
 *
 * Measured on `data503.b3dm`, the tile over the Scramble Crossing: without this
 * rotation each building sat a median of 68 m from where its own batch table puts
 * it, up to 122 m. With it, 1 cm, up to 2 cm.
 *
 * Column-major, mapping glTF (x, y, z) to (x, −z, y).
 */
export const GLTF_Y_UP_TO_Z_UP: readonly number[] = Object.freeze([
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
  0, 0, 0, 1,
]);

const B3DM_MAGIC = 0x6d643362; // 'b3dm' little-endian
const GLB_MAGIC = 0x46546c67; // 'glTF' little-endian
const CHUNK_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_BIN = 0x004e4942; // 'BIN\0'

export interface B3dm {
  version: number;
  featureTableJson: Record<string, unknown>;
  featureTableBinary: Uint8Array;
  batchTableJson: Record<string, unknown>;
  batchTableBinary: Uint8Array;
  glb: Uint8Array;
}

export interface Glb {
  json: GltfJson;
  binary: Uint8Array | undefined;
}

/** Only the parts of the glTF JSON this pipeline reads or writes. */
export interface GltfJson {
  asset: { version: string; [key: string]: unknown };
  scene?: number;
  scenes?: { nodes?: number[]; [key: string]: unknown }[];
  nodes?: { mesh?: number; children?: number[]; matrix?: number[]; [key: string]: unknown }[];
  meshes?: { primitives: GltfPrimitive[]; [key: string]: unknown }[];
  images?: { bufferView?: number; mimeType?: string; [key: string]: unknown }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; [key: string]: unknown }[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
  extensions?: {
    KHR_draco_mesh_compression?: { bufferView: number; attributes: Record<string, number> };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function fail(what: string, detail: string): never {
  throw new Error(
    `${what} ${detail} This reader handles the b3dm files MLIT publishes for PLATEAU; if the ` +
      "upstream build has changed shape, `npm run data:tiles` re-downloads them and " +
      "`docs/work/0_shibuya-1km/design.md` records what they looked like when this was written.",
  );
}

/** Split a b3dm container into its four parts and the GLB it wraps. */
export function parseB3dm(bytes: Uint8Array): B3dm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 28) {
    fail("A b3dm is at least 28 bytes of header;", `this file is ${bytes.byteLength} bytes.`);
  }
  if (view.getUint32(0, true) !== B3DM_MAGIC) {
    fail(
      "This file does not start with the four bytes 'b3dm';",
      `it starts with ${JSON.stringify(new TextDecoder().decode(bytes.subarray(0, 4)))}.`,
    );
  }

  const version = view.getUint32(4, true);
  const byteLength = view.getUint32(8, true);
  if (byteLength !== bytes.byteLength) {
    fail(
      "The b3dm header says the file is",
      `${byteLength} bytes but ${bytes.byteLength} bytes are on disk — a truncated download.`,
    );
  }

  const featureTableJsonLength = view.getUint32(12, true);
  const featureTableBinaryLength = view.getUint32(16, true);
  const batchTableJsonLength = view.getUint32(20, true);
  const batchTableBinaryLength = view.getUint32(24, true);

  let offset = 28;
  const featureTableJson = readJson(bytes, offset, featureTableJsonLength, "feature table");
  offset += featureTableJsonLength;
  const featureTableBinary = bytes.subarray(offset, offset + featureTableBinaryLength);
  offset += featureTableBinaryLength;
  const batchTableJson = readJson(bytes, offset, batchTableJsonLength, "batch table");
  offset += batchTableJsonLength;
  const batchTableBinary = bytes.subarray(offset, offset + batchTableBinaryLength);
  offset += batchTableBinaryLength;

  return {
    version,
    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,
    glb: bytes.subarray(offset, byteLength),
  };
}

function readJson(
  bytes: Uint8Array,
  offset: number,
  length: number,
  what: string,
): Record<string, unknown> {
  if (length === 0) return {};
  const text = new TextDecoder().decode(bytes.subarray(offset, offset + length));
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    fail(
      `The ${what} JSON in this b3dm does not parse:`,
      `${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

/** Split a GLB into its JSON and binary chunks. */
export function parseGlb(bytes: Uint8Array): Glb {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    fail("The payload inside this b3dm is not a GLB;", "it does not start with 'glTF'.");
  }
  const total = view.getUint32(8, true);

  let json: GltfJson | undefined;
  let binary: Uint8Array | undefined;
  let offset = 12;
  while (offset + 8 <= total) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(chunk)) as GltfJson;
    else if (chunkType === CHUNK_BIN) binary = chunk;
    offset += 8 + chunkLength;
  }

  if (json === undefined) fail("This GLB has no JSON chunk,", "so there is no glTF in it.");
  return { json, binary };
}

/**
 * Replace `CESIUM_RTC` with an ordinary glTF root node carrying `matrix`.
 *
 * The extension's whole effect is to translate the scene by its centre, so a root
 * node with a matrix does strictly more: it can rotate as well, which is what
 * moving between the ECEF frame the vertices are in and this project's world
 * frame needs.
 *
 * Throws if the tile has no `CESIUM_RTC`. Silently placing such a tile at the
 * origin is exactly the failure three.js's own `GLTFLoader` has — it warns about
 * the unimplemented extension and carries on, and one tile ends up in the middle
 * of the crossing.
 */
export function applyPlacement(json: GltfJson, matrix: readonly number[]): GltfJson {
  const centre = (json.extensions?.CESIUM_RTC as { center?: number[] } | undefined)?.center;
  if (centre === undefined) {
    fail(
      "This tile's glTF has no CESIUM_RTC extension,",
      "so there is nothing saying where in the world it belongs.",
    );
  }
  if (matrix.length !== 16) {
    throw new Error(`A placement matrix has 16 elements; this one has ${matrix.length}.`);
  }

  const nodes = json.nodes ?? [];
  const scenes = json.scenes ?? [];
  const sceneIndex = json.scene ?? 0;
  const scene = scenes[sceneIndex];
  if (scene === undefined) {
    fail("This tile's glTF names a scene that is not in its scene list;", "it cannot be placed.");
  }

  const rootIndex = nodes.length;
  nodes.push({ matrix: [...matrix], children: [...(scene.nodes ?? [])] });
  scene.nodes = [rootIndex];

  const rebuilt: GltfJson = { ...json, nodes, scenes };
  rebuilt.extensions = { ...(json.extensions ?? {}) };
  delete (rebuilt.extensions as Record<string, unknown>).CESIUM_RTC;
  if (Object.keys(rebuilt.extensions).length === 0) delete rebuilt.extensions;
  rebuilt.extensionsUsed = (json.extensionsUsed ?? []).filter((name) => name !== "CESIUM_RTC");
  rebuilt.extensionsRequired = (json.extensionsRequired ?? []).filter(
    (name) => name !== "CESIUM_RTC",
  );
  if (rebuilt.extensionsUsed.length === 0) delete rebuilt.extensionsUsed;
  if (rebuilt.extensionsRequired.length === 0) delete rebuilt.extensionsRequired;

  return rebuilt;
}

/** The RTC centre a tile declares, as three ECEF metres. */
export function readRtcCentre(json: GltfJson): [number, number, number] {
  const centre = (json.extensions?.CESIUM_RTC as { center?: number[] } | undefined)?.center;
  if (centre === undefined || centre.length !== 3 || centre.some((n) => !Number.isFinite(n))) {
    fail(
      "This tile's glTF has no usable CESIUM_RTC centre;",
      `it reads ${JSON.stringify(centre)} where three finite ECEF metres are expected.`,
    );
  }
  return [centre[0]!, centre[1]!, centre[2]!];
}

function padTo(length: number, multiple: number): number {
  return (multiple - (length % multiple)) % multiple;
}

/** Rebuild a GLB from a JSON chunk and an untouched binary chunk. */
export function serialiseGlb(json: GltfJson, binary: Uint8Array | undefined): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  // The JSON chunk pads with spaces and the binary chunk pads with zeros, both to
  // four bytes, and the whole file is then nudged to eight so the b3dm around it
  // keeps its own alignment.
  let jsonPad = padTo(jsonBytes.length, 4);
  const binaryLength = binary?.length ?? 0;
  const binaryPad = binary === undefined ? 0 : padTo(binaryLength, 4);
  let total =
    12 + 8 + jsonBytes.length + jsonPad + (binary === undefined ? 0 : 8 + binaryLength + binaryPad);
  if (total % 8 !== 0) {
    jsonPad += 4;
    total += 4;
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  let offset = 12;
  view.setUint32(offset, jsonBytes.length + jsonPad, true);
  view.setUint32(offset + 4, CHUNK_JSON, true);
  out.set(jsonBytes, offset + 8);
  out.fill(0x20, offset + 8 + jsonBytes.length, offset + 8 + jsonBytes.length + jsonPad);
  offset += 8 + jsonBytes.length + jsonPad;

  if (binary !== undefined) {
    view.setUint32(offset, binaryLength + binaryPad, true);
    view.setUint32(offset + 4, CHUNK_BIN, true);
    out.set(binary, offset + 8);
  }

  return out;
}

/** Rebuild a b3dm around a new GLB, keeping both tables byte for byte. */
export function serialiseB3dm(tile: B3dm, glb: Uint8Array): Uint8Array {
  const featureTableJsonBytes = padJson(tile.featureTableJson);
  const batchTableJsonBytes = padJson(tile.batchTableJson);
  const total =
    28 +
    featureTableJsonBytes.length +
    tile.featureTableBinary.length +
    batchTableJsonBytes.length +
    tile.batchTableBinary.length +
    glb.length;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, B3DM_MAGIC, true);
  view.setUint32(4, tile.version, true);
  view.setUint32(8, total, true);
  view.setUint32(12, featureTableJsonBytes.length, true);
  view.setUint32(16, tile.featureTableBinary.length, true);
  view.setUint32(20, batchTableJsonBytes.length, true);
  view.setUint32(24, tile.batchTableBinary.length, true);

  let offset = 28;
  out.set(featureTableJsonBytes, offset);
  offset += featureTableJsonBytes.length;
  out.set(tile.featureTableBinary, offset);
  offset += tile.featureTableBinary.length;
  out.set(batchTableJsonBytes, offset);
  offset += batchTableJsonBytes.length;
  out.set(tile.batchTableBinary, offset);
  offset += tile.batchTableBinary.length;
  out.set(glb, offset);

  return out;
}

/** JSON padded with spaces to eight bytes, which is what the b3dm spec asks for. */
function padJson(value: Record<string, unknown>): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const pad = padTo(bytes.length, 8);
  const out = new Uint8Array(bytes.length + pad);
  out.set(bytes);
  out.fill(0x20, bytes.length);
  return out;
}

/** Component sizes for a binary batch-table property, from the 3D Tiles spec. */
const COMPONENT_ARRAYS = {
  BYTE: Int8Array,
  UNSIGNED_BYTE: Uint8Array,
  SHORT: Int16Array,
  UNSIGNED_SHORT: Uint16Array,
  INT: Int32Array,
  UNSIGNED_INT: Uint32Array,
  FLOAT: Float32Array,
  DOUBLE: Float64Array,
} as const;

const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as const;

/**
 * Read one batch-table column, whichever of the two shapes it takes.
 *
 * A property is either a JSON array or a reference into the binary block, and
 * which one it is varies **between tiles for the same property**:
 * `bldg:measuredHeight` is a binary column in 37 of the AOI's 67 tiles and a JSON
 * array in the other 30, because a column holding a null cannot be binary. A
 * reader that handles only one shape works on most of Shibuya and silently
 * returns nothing on the rest.
 */
export function readBatchColumn(
  batchTableJson: Record<string, unknown>,
  batchTableBinary: Uint8Array,
  key: string,
  batchLength: number,
): (number | string | null)[] {
  const property = batchTableJson[key];
  if (property === undefined) return new Array<null>(batchLength).fill(null);
  if (Array.isArray(property)) return property as (number | string | null)[];

  const { byteOffset = 0, componentType, type } = property as {
    byteOffset?: number;
    componentType?: keyof typeof COMPONENT_ARRAYS;
    type?: keyof typeof TYPE_COMPONENTS;
  };
  if (componentType === undefined || type === undefined) {
    fail(
      `The batch-table property ${JSON.stringify(key)} is neither an array nor a binary reference;`,
      `it reads ${JSON.stringify(property)}.`,
    );
  }
  const Ctor = COMPONENT_ARRAYS[componentType];
  const count = TYPE_COMPONENTS[type] * batchLength;
  // Copied into a fresh buffer rather than viewed in place: a typed-array view
  // needs its offset aligned to the component size, and a DOUBLE column at an
  // offset that is a multiple of 8 within the batch table is not necessarily at
  // one within the whole file.
  const slice = batchTableBinary.subarray(byteOffset, byteOffset + count * Ctor.BYTES_PER_ELEMENT);
  const copy = new Uint8Array(slice.length);
  copy.set(slice);
  return Array.from(new Ctor(copy.buffer, 0, count)) as number[];
}
