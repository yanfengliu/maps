/**
 * The one binary format the offline pipeline writes and the scene reads.
 *
 * Terrain and road surfaces are plain indexed triangle meshes already in world
 * metres, so they need none of glTF's materials, scenes, animations or node
 * hierarchy. This is a header and three typed arrays:
 *
 * ```
 *   0  8 bytes  magic "MAPSMSH1"
 *   8  4 bytes  uint32 JSON header length
 *  12  n bytes  JSON header, padded with spaces to a multiple of 4
 *      ...      float32 positions, float32 normals, uint32 indices
 * ```
 *
 * Written as its own format rather than as GLB for one reason: what it holds has
 * to be checkable. The header states the counts and the bounding box, and the
 * decoder refuses a file whose arrays do not match them, so a truncated terrain
 * mesh says so instead of rendering as a smaller piece of Shibuya.
 */

export interface MeshBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface MeshHeader {
  /** Bumped when the layout changes; the decoder refuses anything else. */
  version: 1;
  /** What this mesh is, for error messages: "terrain", "roads". */
  name: string;
  vertexCount: number;
  triangleCount: number;
  /** World-frame bounding box, metres. */
  bounds: MeshBounds;
  /** Anything the builder wants to record about how it was made. */
  note?: string;
}

export interface MeshData {
  header: MeshHeader;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

const MAGIC = "MAPSMSH1";

export function encodeMesh(data: MeshData): Uint8Array {
  const { header, positions, normals, indices } = data;
  if (positions.length !== header.vertexCount * 3) {
    throw new Error(
      `Mesh "${header.name}" says it has ${header.vertexCount} vertices but carries ` +
        `${positions.length} position floats, which is ${positions.length / 3} vertices.`,
    );
  }
  if (normals.length !== positions.length) {
    throw new Error(
      `Mesh "${header.name}" has ${positions.length} position floats and ${normals.length} normal ` +
        "floats; there must be one normal per position.",
    );
  }
  if (indices.length !== header.triangleCount * 3) {
    throw new Error(
      `Mesh "${header.name}" says it has ${header.triangleCount} triangles but carries ` +
        `${indices.length} indices.`,
    );
  }

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const pad = (4 - (headerBytes.length % 4)) % 4;
  const headerLength = headerBytes.length + pad;
  const offset = 12 + headerLength;

  const out = new Uint8Array(
    offset + positions.byteLength + normals.byteLength + indices.byteLength,
  );
  out.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(8, headerLength, true);
  out.set(headerBytes, 12);
  out.fill(0x20, 12 + headerBytes.length, offset);
  out.set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), offset);
  out.set(
    new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength),
    offset + positions.byteLength,
  );
  out.set(
    new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength),
    offset + positions.byteLength + normals.byteLength,
  );
  return out;
}

export function decodeMesh(bytes: Uint8Array): MeshData {
  if (bytes.byteLength < 12 || new TextDecoder().decode(bytes.subarray(0, 8)) !== MAGIC) {
    throw new Error(
      `This is not a scene mesh: it does not start with ${JSON.stringify(MAGIC)}. Re-run ` +
        "`npm run data:scene` to rebuild the derived scene data under data/scene/.",
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(8, true);
  const header = JSON.parse(
    new TextDecoder().decode(bytes.subarray(12, 12 + headerLength)),
  ) as MeshHeader;
  if (header.version !== 1) {
    throw new Error(
      `Scene mesh "${header.name}" is version ${header.version}; this build reads version 1 only.`,
    );
  }

  const offset = 12 + headerLength;
  const positionBytes = header.vertexCount * 3 * 4;
  const indexBytes = header.triangleCount * 3 * 4;
  const expected = offset + positionBytes * 2 + indexBytes;
  if (bytes.byteLength !== expected) {
    throw new Error(
      `Scene mesh "${header.name}" should be ${expected} bytes for ${header.vertexCount} vertices ` +
        `and ${header.triangleCount} triangles, but is ${bytes.byteLength}. A short file is a ` +
        "truncated download, and it would render as a smaller piece of Shibuya rather than as an " +
        "error.",
    );
  }

  // Copied rather than viewed: the byte offset here is only 4-aligned, and a
  // Float32Array view needs 4 while a Uint32Array view needs 4 — but the caller
  // may also hand in a Uint8Array that is itself offset inside a larger buffer.
  const copy = bytes.slice(offset).buffer;
  return {
    header,
    positions: new Float32Array(copy, 0, header.vertexCount * 3),
    normals: new Float32Array(copy, positionBytes, header.vertexCount * 3),
    indices: new Uint32Array(copy, positionBytes * 2, header.triangleCount * 3),
  };
}
