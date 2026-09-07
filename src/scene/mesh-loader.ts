/**
 * Fetch one of the offline pipeline's meshes and turn it into geometry.
 *
 * Shared by the terrain and the road surfaces, which are the same shape of
 * thing: an indexed triangle mesh already in world metres, built by
 * `npm run data:scene` and served from `data/scene/` — see
 * `tools/vite/serve-scene-data.ts`.
 *
 * Every failure here is named. A scene that draws with no ground is the failure
 * a screenshot cannot tell from a scene that drew, so a missing or malformed
 * mesh has to stop the app rather than leave a hole in it.
 */

import { BufferAttribute, BufferGeometry } from "three";

import { decodeMesh, type MeshData } from "../world/mesh.js";

export async function loadMesh(url: string): Promise<MeshData> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `Could not fetch ${url}: ${String(cause)}. The derived scene data is built by ` +
        "`npm run data:scene` into a gitignored data/scene/, and served from there.",
      { cause },
    );
  }
  if (!response.ok) {
    throw new Error(
      `${url} returned HTTP ${response.status} ${response.statusText}. Run \`npm run data:fetch\` ` +
        "and then `npm run data:scene` to build the derived scene data; it is gitignored, so a " +
        "fresh checkout has none of it.",
    );
  }
  return decodeMesh(new Uint8Array(await response.arrayBuffer()));
}

/** A `MeshData` as three.js geometry, with its bounds taken from the header. */
export function toGeometry(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  // Computed rather than derived from the header's bounds: the header is what the
  // decoder checked the file against, and using it here as well would make one
  // number vouch for itself.
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
