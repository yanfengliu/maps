/** Bounds: the public mesh decoder accepts actual Node Buffer bytes and offset Uint8Arrays, not only browser ArrayBuffers. */
import { describe, expect, it } from "vitest";
import { decodeMesh, encodeMesh, type MeshData } from "../src/world/mesh.ts";

describe("mesh byte views", () => {
  const mesh: MeshData = { header: { version: 1, name: "terrain", vertexCount: 3, triangleCount: 1, bounds: { min: [0, 14, 0], max: [3, 17, 3] } }, positions: new Float32Array([0,14,0,3,17,0,0,14,3]), normals: new Float32Array([0,1,0,0,1,0,0,1,0]), indices: new Uint32Array([0,1,2]) };
  const bytes = encodeMesh(mesh);
  it.each(["browser", "offset", "buffer"])("decodes exact geometry from %s byte semantics", (kind) => {
    const padded = new Uint8Array(bytes.length + 31); padded.set(bytes, 13);
    const input = kind === "buffer" ? Buffer.from(bytes) : kind === "offset" ? padded.subarray(13,13+bytes.length) : bytes;
    const decoded = decodeMesh(input);
    expect([...decoded.positions]).toEqual([...mesh.positions]);
    expect([...decoded.normals]).toEqual([...mesh.normals]);
    expect([...decoded.indices]).toEqual([0,1,2]);
  });
});
