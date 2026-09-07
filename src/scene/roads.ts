/**
 * The road network. Owned by Phases 4 and 6.
 *
 * Two separate things end up here and they should not be confused:
 *
 * - The road *surface* — asphalt, markings, the scramble's diagonals, kerbs,
 *   signals and street furniture. That is rendered geometry, Phase 4's work.
 * - The road *graph* — lanes, sidewalks, crossings and the signal phase model.
 *   That is simulation data, Phase 6's work, and Phase 6 freezes its schema
 *   before Phases 7 and 8 build against it in parallel.
 *
 * Nothing is here yet. The placeholder paving in `terrain.ts` stands in for the
 * surface so an overhead frame has a street grid to read; it is a texture, not a
 * network, and Phase 4 deletes it.
 *
 * The file exists so both of those have an obvious address before anyone writes
 * them, rather than landing in whichever module was open at the time.
 */

import { Group } from "three";

export function createRoads(): Group {
  const group = new Group();
  group.name = "roads";
  return group;
}
