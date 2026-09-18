/**
 * Boundary loops in the terrain mesh, and what it costs to close them.
 *
 * A closed surface uses every directed edge in both directions. An edge traversed
 * one way and never the other is a rim: either the mesh's own outer edge, or the
 * rim of a hole. PLATEAU's 2.5 m TIN is a triangulated *relief*, not a surveyed
 * surface, and the scene's own clip keeps whole triangles — so the clipped ground
 * carries one outer rim plus whatever holes the source itself has. The `F1`
 * terrain hole is one of fourteen.
 *
 * **How the outer rim is told from a hole.** Not by position and not by size: the
 * ground is clipped to a box, and a hole that sits outside the area of interest —
 * most of these do — would be called part of the edge by any rule that reads the
 * box. The outer rim is identified structurally instead. It is the one rim whose
 * projection onto the ground plane contains every other rim: a hole's vertices all
 * lie inside the ground that surrounds them, and the edge's do not. `censusBoundaries`
 * asserts that exactly one rim has that property, so a mesh where the test cannot
 * decide says so instead of picking the biggest loop.
 *
 * This module is the census, the cap and the refusal in one place, because the
 * three have to agree: `build-terrain.ts` caps with `capInteriorLoops`, and
 * `build.ts` — the `npm run data:scene` gate — re-reads the *written* mesh and
 * refuses to publish it while any hole survives.
 *
 * **What that refusal claims, and what it does not.** The claim is topological: a
 * closed surface uses every directed edge in both directions, and this census counts
 * the ones that are used once and identifies the single rim that bounds the mesh. So
 * what it establishes is that the ground is closed — every rim but the outer one is
 * gone — and nothing more. It does **not** claim the added surface resembles the
 * source: the fan invents one vertex per rim, at that rim's own vertex mean, and the
 * triangles between it and the rim need not lie on the TIN. It does not check that
 * the projection is covered, it cannot see a hole whose rim was welded into a seam
 * or a T-junction, and the mesh's outer silhouette is outside its scope. The manifest
 * carries `closedRims` so the invention is nameable in the payload.
 */

/** One rim of the mesh: a closed ring of directed boundary edges. */
export interface BoundaryLoop {
  /** Vertex indices, in traversal order, with no repeat of the first at the end. */
  vertices: number[];
  /** Closed length of the ring, metres. */
  perimeterM: number;
  /** Mean of the rim vertices, world metres. */
  centroidX: number;
  centroidY: number;
  centroidZ: number;
  /**
   * Signed area of the rim projected onto XZ, m². A hole in a height field turns
   * one way and the outer rim the other; `capInteriorLoops` reads the sign.
   */
  signedAreaXZ: number;
  /** Lowest and highest rim vertex, metres. */
  minimumY: number;
  maximumY: number;
}

export interface BoundaryCensus {
  triangleCount: number;
  vertexCount: number;
  /** Directed edges with no opposite: every rim edge of the mesh. */
  boundaryEdgeCount: number;
  /** Every rim, worst first by perimeter. */
  loops: BoundaryLoop[];
  /** The one rim that bounds the mesh rather than a hole in it. */
  outerLoop: BoundaryLoop;
  /** Rims of holes: every rim except the outer one. */
  interiorLoops: BoundaryLoop[];
}

export interface TerrainArrays {
  positions: Float32Array;
  indices: Uint32Array;
}

/**
 * Every rim of the mesh, walked into closed rings, and the outer one identified.
 *
 * The edge `(a, b)` found by the walk belongs to the triangle that uses it, so the
 * surface it bounds lies to the left of `a -> b`; the ring accumulates in that
 * direction, with each directed edge followed by the one rim edge leaving `b`. The
 * successor is keyed by the vertex the edge leaves rather than by the edge, because
 * that is the step the walk takes; two rims meeting at a single vertex would
 * collide there, and that is reported rather than silently overwritten.
 */
export function censusBoundaries(arrays: TerrainArrays): BoundaryCensus {
  const { positions, indices } = arrays;
  const vertexCount = positions.length / 3;
  const triangleCount = indices.length / 3;

  // Directed edge -> the count of times it appears. A key of
  // `from * vertexCount + to` is exact for index buffers below 2^32 vertices and
  // far cheaper than a string per edge on a 275,000-edge mesh.
  const appearances = new Map<number, number>();
  const key = (from: number, to: number): number => from * vertexCount + to;

  for (let corner = 0; corner < indices.length; corner += 3) {
    const a = indices[corner]!;
    const b = indices[corner + 1]!;
    const c = indices[corner + 2]!;
    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) {
      const id = key(from, to);
      appearances.set(id, (appearances.get(id) ?? 0) + 1);
    }
  }

  // A directed edge is on a rim when nothing traverses it the other way. Asking
  // about the *opposite* rather than about this direction's own count is what makes
  // a seam visible: an edge used twice in the same direction is two triangles that
  // do not share a winding, which is a different defect and not a rim.
  const openings: number[] = [];
  for (const id of appearances.keys()) {
    const from = Math.floor(id / vertexCount);
    const to = id - from * vertexCount;
    if (!appearances.has(key(to, from))) openings.push(id);
  }

  const successor = new Map<number, number>();
  for (const id of openings) {
    const from = Math.floor(id / vertexCount);
    if (successor.has(from)) {
      throw new Error(
        `The terrain mesh has two rim edges leaving vertex ${from}, so its rims cannot be walked as ` +
          "rings. That is a pinch point where two rims meet at one vertex, and capping them apart from " +
          "each other would need that vertex split first.",
      );
    }
    successor.set(from, id);
  }

  const visited = new Set<number>();
  const loops: BoundaryLoop[] = [];
  for (const start of openings) {
    if (visited.has(start)) continue;
    const vertices: number[] = [];
    let current: number | undefined = start;
    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      const from = Math.floor(current / vertexCount);
      vertices.push(from);
      current = successor.get(current - from * vertexCount);
      if (current === start) break;
    }
    if (vertices.length < 3) continue; // Degenerate rim: not an area to cap.
    loops.push(describeLoop(vertices, positions));
  }

  // Worst first: the largest hole is the one a reader needs named.
  loops.sort((a, b) => b.perimeterM - a.perimeterM);

  const outer = findOuterLoop(loops, positions);
  const interiorLoops = loops.filter((loop) => loop !== outer);
  return {
    triangleCount,
    vertexCount,
    boundaryEdgeCount: openings.length,
    loops,
    outerLoop: outer,
    interiorLoops,
  };
}

/**
 * The rim that bounds the mesh: the one whose projection contains every rim.
 *
 * A hole's rim is surrounded by ground, so its vertices project inside the outer
 * rim; the outer rim's do not. Exactly one rim must satisfy that, and if none or
 * several do, this fails rather than falling back on the largest loop — a census
 * that guesses which rim is the edge would cap the edge and leave the holes.
 */
function findOuterLoop(loops: readonly BoundaryLoop[], positions: Float32Array): BoundaryLoop {
  const contains = (candidate: BoundaryLoop, loop: BoundaryLoop): boolean =>
    loop.vertices.every((vertex) => pointInRing(positions[vertex * 3]!, positions[vertex * 3 + 2]!, candidate.vertices, positions));
  // A ring does not contain itself by this test (its own vertices are on the ring,
  // where the crossing count is undefined), so each loop is compared against the
  // others only.
  const outer = loops.filter((candidate) => loops.every((other) => other === candidate || contains(candidate, other)));
  if (outer.length !== 1) {
    const named = outer.length === 0 ? "no rim" : `${outer.length} rims`;
    throw new Error(
      `The terrain mesh has ${loops.length} rims and ${named} whose projection contains every other ` +
        "rim, so which one is the mesh's edge cannot be decided. A mesh with one rim inside another is " +
        "a height field with holes; anything else needs its rims read by hand before a cap is safe.",
    );
  }
  return outer[0]!;
}

/**
 * Crossing-number point-in-polygon on the XZ projection.
 *
 * Points exactly on the ring are the ambiguous case and this returns false for
 * them, which is why `findOuterLoop` never tests a ring against itself.
 */
function pointInRing(x: number, z: number, vertices: readonly number[], positions: Float32Array): boolean {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
    const current = vertices[index]! * 3;
    const last = vertices[previous]! * 3;
    const currentX = positions[current]!;
    const currentZ = positions[current + 2]!;
    const lastX = positions[last]!;
    const lastZ = positions[last + 2]!;
    if (currentZ > z !== lastZ > z) {
      const crossingX = ((lastX - currentX) * (z - currentZ)) / (lastZ - currentZ) + currentX;
      if (x < crossingX) inside = !inside;
    }
  }
  return inside;
}

function describeLoop(vertices: number[], positions: Float32Array): BoundaryLoop {
  let perimeterM = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let signedAreaXZ = 0;
  let minimumY = Infinity;
  let maximumY = -Infinity;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index]! * 3;
    const following = vertices[(index + 1) % vertices.length]! * 3;
    const x = positions[current]!;
    const y = positions[current + 1]!;
    const z = positions[current + 2]!;
    const nextX = positions[following]!;
    const nextZ = positions[following + 2]!;

    perimeterM += Math.hypot(nextX - x, nextZ - z);
    // Shoelace on the XZ projection: the ground is a height field, so its rims
    // project to simple polygons and the sign says which way the ring turns.
    signedAreaXZ += x * nextZ - nextX * z;
    sumX += x;
    sumY += y;
    sumZ += z;
    if (y < minimumY) minimumY = y;
    if (y > maximumY) maximumY = y;
  }

  return {
    vertices,
    perimeterM,
    centroidX: sumX / vertices.length,
    centroidY: sumY / vertices.length,
    centroidZ: sumZ / vertices.length,
    signedAreaXZ: signedAreaXZ / 2,
    minimumY,
    maximumY,
  };
}

/** A rim named the way a failure message needs it: size, position and turn. */
export function describeLoopForFailure(loop: BoundaryLoop): string {
  return (
    `${loop.vertices.length} rim vertices, ${loop.perimeterM.toFixed(1)} m perimeter, centroid ` +
    `(${loop.centroidX.toFixed(1)}, ${loop.centroidZ.toFixed(1)}) at ${loop.centroidY.toFixed(2)} m, ` +
    `XZ area ${loop.signedAreaXZ.toFixed(1)} m²`
  );
}

export interface CapResult {
  positions: Float32Array;
  indices: Uint32Array;
  /** Holes that were capped, worst first. */
  capped: BoundaryLoop[];
  /** Vertices the cap added: one centroid per hole. */
  addedVertexCount: number;
  /** Triangles the cap added: one per rim edge, summed over the holes capped. */
  addedTriangleCount: number;
  /**
   * Cap triangles whose computed normal points up, against the ground's own
   * normals, which all point up. Equal to the rim's length on the twelve holes whose
   * rim does not double back on itself; see `capInteriorLoops`.
   */
  capTrianglesFacingUp: number;
  /** Cap triangles whose computed normal points down, on the two rims that do double back. */
  capTrianglesFacingDown: number;
}

/**
 * Close every hole with a triangle fan around that rim's own centroid.
 *
 * The fan is one triangle per rim edge, so a rim of `n` vertices costs `n` triangles
 * and one new vertex. Capping with the rim's own vertices rather than retriangulating
 * the hole is deliberate: the rim vertices are the TIN's survey points, and
 * re-deriving the interior would invent ground the survey never measured.
 *
 * **The fan walks the rim's own order, reversed, and that is forced.** A hole's rim
 * is a cycle of directed edges, each of them a boundary because no triangle in the
 * ground uses it the other way. The cap closes one only by walking it the opposite
 * way, so the fan has to visit the rim's vertices in the rim's own order and emit
 * `next -> current` rather than `current -> next`. Emitting the other winding — which
 * is the same triangle, wound the other way — puts every rim edge into the index
 * buffer a second time *in the direction the rim already walks it*, so nothing
 * cancels and the mesh comes out exactly as holed as it went in. This is why there is
 * no order to choose here: any other order replaces the rim's edges with chords and
 * closes nothing, and an order search cannot fix a winding.
 *
 * The winding also settles which way the cap faces, and the answer is the right one
 * without being told: 218 of the 227 cap triangles come out with the ground's own
 * upward normal. The nine that do not are all in `hole 1` and `hole 2`, whose rims
 * double back on themselves — a 110 m serpentine of 2.5 m facets and its 60 m
 * neighbour — so their fans overlap in plan. Both sit in the south-east corner well
 * outside the area of interest, and the count is reported rather than hidden.
 */
export function capInteriorLoops(
  arrays: TerrainArrays,
  census: BoundaryCensus,
  refuse: (message: string) => Error = (message) => new Error(message),
  log: (line: string) => void = () => {},
): CapResult {
  const rimEdges = census.interiorLoops.reduce((total, loop) => total + loop.vertices.length, 0);
  const positions = new Float32Array(arrays.positions.length + census.interiorLoops.length * 3);
  positions.set(arrays.positions);
  const indices = new Uint32Array(arrays.indices.length + rimEdges * 3);
  indices.set(arrays.indices);

  let nextVertex = arrays.positions.length / 3;
  let cursor = arrays.indices.length;
  let capTrianglesFacingUp = 0;
  let capTrianglesFacingDown = 0;
  const capped: BoundaryLoop[] = [];

  for (const loop of census.interiorLoops) {
    const apex = nextVertex;
    positions[apex * 3] = loop.centroidX;
    positions[apex * 3 + 1] = loop.centroidY;
    positions[apex * 3 + 2] = loop.centroidZ;
    nextVertex += 1;

    const rim = loop.vertices;
    let facingUp = 0;
    for (let corner = 0; corner < rim.length; corner += 1) {
      const current = rim[corner]!;
      const next = rim[(corner + 1) % rim.length]!;
      indices[cursor] = next;
      indices[cursor + 1] = current;
      indices[cursor + 2] = apex;
      cursor += 3;
      if (crossUp(positions, next, current, apex) > 0) facingUp += 1;
    }
    capTrianglesFacingUp += facingUp;
    capTrianglesFacingDown += rim.length - facingUp;
    log(
      `        closed ${describeLoopForFailure(loop)} — centroid fan, ` +
        `${facingUp}/${rim.length} triangles facing up`,
    );
    capped.push(loop);
  }

  const reserved = rimEdges * 3;
  if (cursor - arrays.indices.length !== reserved) {
    throw refuse(
      `The terrain cap wrote ${cursor - arrays.indices.length} indices where it reserved ${reserved} for ` +
        `${census.interiorLoops.length} holes, so the mesh it returns would carry uninitialised vertices at the ` +
        "end of its index buffer. That is a defect in the cap rather than in the data, and the cap is refused " +
        "instead of published.",
    );
  }

  return {
    positions,
    indices,
    capped,
    addedVertexCount: capped.length,
    addedTriangleCount: rimEdges,
    capTrianglesFacingUp,
    capTrianglesFacingDown,
  };
}

/** What closing the terrain's holes found and did, for the build's own log line. */
export interface CapSummary {
  /** Rims away from the mesh's edge, worst first. Empty when the ground has no holes. */
  holes: BoundaryLoop[];
  outerLoopVertices: number;
  outerLoopPerimeterM: number;
  boundaryEdgeCount: number;
  addedVertexCount: number;
  addedTriangleCount: number;
  capTrianglesFacingUp: number;
  capTrianglesFacingDown: number;
}

/**
 * Census the ground's rims and close its holes, in one step.
 *
 * This is the shape both callers need — `build-terrain.ts` caps with it before it
 * encodes, and the `npm run data:scene` gate re-reads the written mesh and calls it
 * again to refuse a scene that still carries a hole — so the two cannot end up
 * counting differently.
 */
export function capTerrainHoles(
  arrays: TerrainArrays,
  refuse?: (message: string) => Error,
  log?: (line: string) => void,
): { positions: Float32Array; indices: Uint32Array; summary: CapSummary } {
  const census = censusBoundaries(arrays);
  const cap = capInteriorLoops(arrays, census, refuse, log);
  return {
    positions: cap.positions,
    indices: cap.indices,
    summary: {
      holes: cap.capped,
      outerLoopVertices: census.outerLoop.vertices.length,
      outerLoopPerimeterM: census.outerLoop.perimeterM,
      boundaryEdgeCount: census.boundaryEdgeCount,
      addedVertexCount: cap.addedVertexCount,
      addedTriangleCount: cap.addedTriangleCount,
      capTrianglesFacingUp: cap.capTrianglesFacingUp,
      capTrianglesFacingDown: cap.capTrianglesFacingDown,
    },
  };
}

/**
 * The Y component of the cross product `computeNormals` in `build-terrain.ts`
 * uses, for a triangle whose third vertex is a point rather than an index.
 *
 * It is the same expression that file's `ny` is, and `y` is the component that
 * matters: the ground is a height field, so facing up means a positive Y.
 */
function crossUp(positions: Float32Array, a: number, b: number, c: number): number {
  const ia = a * 3;
  const ib = b * 3;
  const ic = c * 3;
  return (
    (positions[ib + 2]! - positions[ia + 2]!) * (positions[ic]! - positions[ia]!) -
    (positions[ib]! - positions[ia]!) * (positions[ic + 2]! - positions[ia + 2]!)
  );
}
