/**
 * Pedestrians: cadence-locked walking over the frozen sidewalk graph, ORCA-style
 * local avoidance over a uniform spatial hash, and a crossing obligation that
 * makes an actor wait at a curb until the shared admission authority grants it.
 *
 * Three decisions are load-bearing and come from `design.md` and the
 * coordinator's recorded qualifications:
 *
 *  - Speed is locked to the baked cadence times the actor's scale, so planted
 *    feet are a property of the speed. Variety comes from scale and from the
 *    surge, not from a per-actor speed that would trade slide for it.
 *  - Avoidance is ORCA over a four-metre-grid spatial hash with a neighbour cap,
 *    and the neighbour set is ordered by slot index, so it never depends on hash
 *    iteration order or insertion order.
 *  - A crossing is a released queue, not a per-actor decision. The actor stops
 *    at the curb with a real footprint and a continuously measured dwell, asks
 *    the authority once, and moves only on a grant. The surge is what that queue
 *    does when the pedestrian phase opens.
 */

import type { ActorFootprint } from "../../network/footprints.ts";
import { PEDESTRIAN_DYNAMICS } from "./config.ts";
import { sampleRoute, type PlannedRoute } from "./routes.ts";
import type { SlotTable } from "./slots.ts";
import { placeSlot } from "./slots.ts";
import { CellGrid } from "./cell-grid.ts";

/** The authored pedestrian footprint: 0.5 m by 0.5 m at scale 1, per decision 10. */
export function pedestrianFootprint(at: { x: number; y: number; z: number }, heading: number, scale: number): ActorFootprint {
  const size = 2 * PEDESTRIAN_DYNAMICS.radiusM * scale;
  return { position: { x: at.x, y: at.y, z: at.z }, headingRadians: heading, lengthM: size, widthM: size };
}

/* ------------------------------------------------------------------ spatial hash */

/*
 * The neighbour index the crowd is built on.
 *
 * `CellGrid` is the shipped structure: a direct-indexed counting-sort grid over
 * world XZ. It replaced the hash that lived here because that hash's lookup walked
 * 750,057 bodies to return 8 — 96.5% of what it walked failed its own cell-identity
 * test, since its bucket array held about 256 slots for about 88 occupied cells and
 * the empty cells a query asked for kept hashing onto the crowded ones. The grid
 * visits 100 bodies per query and returns the same eight, measured bit-identical
 * against the hash over 1,200 ticks with the pose buffers compared every tick.
 *
 * `SpatialHash` stays exported and is still used by its own test, because that test
 * is what pins the cell-key defect the hash carried.
 */
/**
 * The three-method contract the tick uses to find a body's neighbours. `CellGrid`
 * implements it as the shipped structure and `SpatialHash` implements it so its own
 * test can keep pinning the cell-key defect the hash carried; the tick cannot tell
 * which one it holds.
 */
export interface NeighbourIndex {
  rebuild(count: number, position: Float32Array, active: Uint8Array): void;
  neighbours(x: number, z: number, radius: number, limit: number, out: Int32Array): number;
  slotAt(index: number): number;
  readonly size: number;
}

function createNeighbourIndex(cellSizeM: number): NeighbourIndex {
  return new CellGrid({ cellSizeM, halfExtentM: 520 });
}

/**
 * Uniform grid in world XZ. Cell contents live in flat arrays and every query
 * sorts its candidates by slot index, so the neighbour set is a pure function of
 * the population's positions.
 */
/**
 * The packing that turns a cell's column and row into the integer key the hash
 * stores and queries. Both the rebuild and the query have to reach the *same*
 * function, and the stored value has to be the key.
 *
 * The revision before this one wrote `(column + 0x8000) * 0x10000 + (row + 0x8000)`.
 * For every column >= 0 that product exceeds `2**31 - 1`, so the `Int32Array` write
 * wrapped the value while `neighbours` compared the stored slot against the
 * *unwrapped* number: the identity test `this.cells[index] === cell` was false for
 * every cell in the eastern half of the world and for the western half of the
 * northern band. Measured on the delivered crowd at 3,000 pedestrians and the
 * delivered 4 m cell edge, the test was true for 56.3 % of bodies and false for
 * the other 43.7 %: the rest were found only when their cell happened to hash into
 * the same open-addressed bucket as the query, which is why the structure still
 * looked like it worked.
 *
 * The row is therefore the high half and the column the low half, packed with
 * int32 shifts so the stored value is the key. Columns and rows here run to the
 * low hundreds, so +/-32767 covers 262 km at the delivered 4 m cell edge, and a
 * coordinate past that names itself instead of wrapping in silence.
 */
export function cellKey(column: number, row: number): number {
  if (!Number.isInteger(column) || !Number.isInteger(row)) {
    throw new Error(`Spatial hash cell coordinates must be integers; the tick produced column ${column}, row ${row}. A fractional coordinate means the caller floored the wrong quantity, and a key built from it would name a cell half a cell away from the body.`);
  }
  if (column < -0x8000 || column > 0x7fff) {
    throw new Error(`Spatial hash column ${column} is outside the +/-32767 the cell key can hold. That is a body ${column * PEDESTRIAN_DYNAMICS.cellSizeM} m east of the world origin at the ${PEDESTRIAN_DYNAMICS.cellSizeM} m cell edge, so the world frame has grown past the grid rather than the population having moved; widening the packing is the fix, not clamping here.`);
  }
  if (row < -0x8000 || row > 0x7fff) {
    throw new Error(`Spatial hash row ${row} is outside the +/-32767 the cell key can hold. That is a body ${row * PEDESTRIAN_DYNAMICS.cellSizeM} m south of the world origin at the ${PEDESTRIAN_DYNAMICS.cellSizeM} m cell edge, so the world frame has grown past the grid rather than the population having moved; widening the packing is the fix, not clamping here.`);
  }
  /*
   * Both halves fit in 16 bits by the guards above, and `<<` and `|` are int32
   * operations, so the key IS an int32 and the Int32Array round trip is lossless.
   * This is the part worth stating twice: an earlier attempt at this fix wrote
   * `(row + 0x8000) * 0x10000 + (column + 0x8000)` with the multiplication in
   * doubles, which reaches 2**31 + 2**15 and is therefore stored one way and
   * compared another — the same defect in the other half of the grid.
   */
  return ((row + 0x8000) << 16) | (column + 0x8000);
}

export class SpatialHash {
  private readonly cellSize: number;
  private readonly index = new Map<number, number[]>();
  private cells: Int32Array = new Int32Array(0);
  private coords: Float64Array = new Float64Array(0);
  private head: Int32Array = new Int32Array(0);
  private next: Int32Array = new Int32Array(0);
  private live: Int32Array = new Int32Array(0);
  private count = 0;
  private mask = 0;

  constructor(cellSize: number) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error(`Spatial hash cell size ${cellSize} must be positive metres.`);
    this.cellSize = cellSize;
  }

  get size(): number {
    return this.count;
  }

  /** Ascending slot index of the `index`-th live actor. */
  slotAt(index: number): number {
    return this.live[index]!;
  }

  rebuild(count: number, position: Float32Array, active: Uint8Array): void {
    if (this.live.length < count) {
      this.live = new Int32Array(count);
      this.cells = new Int32Array(count);
      this.coords = new Float64Array(count * 2);
      this.next = new Int32Array(count);
    }
    let live = 0;
    for (let slot = 0; slot < count; slot += 1) {
      if (!active[slot]) continue;
      this.live[live] = slot;
      live += 1;
    }
    this.count = live;
    if (live * 2 > this.coords.length) this.coords = new Float64Array(live * 2);
    if (live > this.cells.length) {
      this.cells = new Int32Array(live);
      this.next = new Int32Array(live);
    }
    this.index.clear();
    for (let i = 0; i < live; i += 1) {
      const x = position[this.live[i]! * 3]!;
      const z = position[this.live[i]! * 3 + 2]!;
      this.coords[i * 2] = x;
      this.coords[i * 2 + 1] = z;
      const column = Math.floor(x / this.cellSize);
      const row = Math.floor(z / this.cellSize);
      const cell = cellKey(column, row);
      this.cells[i] = cell;
      let bucket = this.index.get(cell);
      if (!bucket) {
        bucket = [];
        this.index.set(cell, bucket);
      }
      bucket.push(i);
    }
    let buckets = 1;
    while (buckets < this.index.size * 2) buckets <<= 1;
    this.mask = buckets - 1;
    if (this.head.length !== buckets) {
      this.head = new Int32Array(buckets);
      this.next = new Int32Array(Math.max(live, 1));
    }
    this.head.fill(-1);
    for (let i = 0; i < live; i += 1) {
      const bucket = Math.imul(this.cells[i]!, 0x9e3779b1) & this.mask;
      this.next[i] = this.head[bucket]!;
      this.head[bucket] = i;
    }
  }

  /** Ascending slot indices within `radius` of (x, z), capped at `limit`. */
  neighbours(x: number, z: number, radius: number, limit: number, out: Int32Array): number {
    const radiusSquared = radius * radius;
    const maximum = Math.min(limit, out.length);
    let found = 0;
    for (let column = Math.floor((x - radius) / this.cellSize); column <= Math.floor((x + radius) / this.cellSize); column += 1) {
      for (let row = Math.floor((z - radius) / this.cellSize); row <= Math.floor((z + radius) / this.cellSize); row += 1) {
        const cell = cellKey(column, row);
        let index = this.head[Math.imul(cell, 0x9e3779b1) & this.mask]!;
        while (index >= 0) {
          if (this.cells[index] === cell) {
            const dx = this.coords[index * 2]! - x;
            const dz = this.coords[index * 2 + 1]! - z;
            if (dx * dx + dz * dz <= radiusSquared) {
              const slot = this.live[index]!;
              if (found === maximum && slot > out[maximum - 1]!) {
                index = this.next[index]!;
                continue;
              }
              // Insert in slot order, which is the neighbour-set contract.
              let at = Math.min(found, maximum - 1);
              while (at > 0 && out[at - 1]! > slot) {
                out[at] = out[at - 1]!;
                at -= 1;
              }
              out[at] = slot;
              if (found < maximum) found += 1;
            }
          }
          index = this.next[index]!;
        }
      }
    }
    return found;
  }
}

/* --------------------------------------------------------------------- ORCA */

interface Line { readonly pointX: number; readonly pointZ: number; readonly w: number }

export interface OrcaAgent {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  radius: number;
}

function det(a: Line, b: Line): number {
  return a.pointX * b.pointZ - a.pointZ * b.pointX;
}

/** RVO2's linearProgram1. `lineNumber < 0` tests the unconstrained optimum. */
function solveOnLine(lines: readonly Line[], lineNumber: number, radius: number, optX: number, optZ: number, result: { x: number; z: number }): boolean {
  if (lineNumber < 0) {
    if (optX * optX + optZ * optZ > radius * radius + 1e-9) return false;
    for (const line of lines) {
      if (line.pointX * optX + line.pointZ * optZ < line.w - 1e-9) return false;
    }
    result.x = optX;
    result.z = optZ;
    return true;
  }
  const line = lines[lineNumber]!;
  const dot = optX * line.pointX + optZ * line.pointZ;
  const discriminant = dot * dot + radius * radius - (line.pointX * line.pointX + line.pointZ * line.pointZ);
  if (discriminant < 0) return false;
  const root = Math.sqrt(discriminant);
  const tLeft = -dot + root;
  const tRight = -dot - root;
  const x = line.pointX * tLeft - line.pointZ * tRight;
  const z = line.pointZ * tLeft + line.pointX * tRight;
  if (x * x + z * z > radius * radius + 1e-9) return false;
  for (let i = 0; i < lineNumber; i += 1) if (det(lines[i]!, line) < 0) return false;
  for (let i = lineNumber + 1; i < lines.length; i += 1) {
    if (det(lines[i]!, { pointX: -line.pointZ, pointZ: line.pointX, w: 0 }) < 0) return false;
    if (det(line, lines[i]!) < 0) return false;
  }
  result.x = x;
  result.z = z;
  return true;
}

/**
 * RVO2's linearProgram2 with linearProgram3's fallback. The feasible region can
 * genuinely be empty in a dense crowd, so when no half-plane boundary yields a
 * solution the velocity is projected onto the violated half-planes in turn and
 * the result stops early rather than searching without a bound.
 */
function linearProgram(lines: readonly Line[], radius: number, preferredX: number, preferredZ: number, out: { x: number; z: number }): void {
  if (lines.length === 0) {
    out.x = preferredX;
    out.z = preferredZ;
    return;
  }
  const result = { x: 0, z: 0 };
  if (solveOnLine(lines, -1, radius, preferredX, preferredZ, result)) {
    out.x = result.x;
    out.z = result.z;
    return;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const candidate = { x: 0, z: 0 };
    if (solveOnLine(lines, i, radius, preferredX, preferredZ, candidate)) {
      out.x = candidate.x;
      out.z = candidate.z;
      return;
    }
  }
  // No admissible velocity inside the preferred-speed disc. Rather than
  // projecting onto the violated half-planes, which is what RVO2's
  // linearProgram3 does and which can leave a crowd with no forward velocity at
  // all, the velocity is reduced along the preferred direction until every
  // half-plane is satisfied. A blocked pedestrian then slows to a stop instead of
  // standing still with no admissible direction.
  let scale = 1;
  for (const line of lines) {
    const value = preferredX * line.pointX + preferredZ * line.pointZ;
    if (value >= line.w) continue;
    scale = Math.min(scale, line.w / value);
  }
  out.x = preferredX * Math.max(0, scale);
  out.z = preferredZ * Math.max(0, scale);
}

/**
 * ORCA(u, v) for equal-time-horizon agents, as the half-plane
 * `dot(v_self, n) >= dot(u, n)` where `u` is the smallest change to the relative
 * velocity that clears the collision cone.
 */
export function orcaHalfPlane(agent: OrcaAgent, other: OrcaAgent, timeHorizon: number): Line {
  const relativeX = other.x - agent.x;
  const relativeZ = other.z - agent.z;
  const relativeVelocityX = agent.velocityX - other.velocityX;
  const relativeVelocityZ = agent.velocityZ - other.velocityZ;
  const combinedRadius = agent.radius + other.radius;
  const combinedRadiusSquared = combinedRadius * combinedRadius;
  const distanceSquared = relativeX * relativeX + relativeZ * relativeZ;
  const inverseTimeHorizon = 1 / timeHorizon;
  // `w` is the relative velocity seen from the apex of the truncated velocity
  // obstacle: the point `relativePosition / timeHorizon` in relative-velocity space.
  const wX = relativeVelocityX - inverseTimeHorizon * relativeX;
  const wZ = relativeVelocityZ - inverseTimeHorizon * relativeZ;
  const wSquared = wX * wX + wZ * wZ;
  // A body this walker already overlaps is not an obstacle it can steer around;
  // this population resolves a stack of bodies at one point by leaving them be,
  // and the walking step's own overlap rule is the same one.
  if (distanceSquared <= combinedRadiusSquared) return { pointX: 0, pointZ: 0, w: 0 };
  const cutOffSquared = combinedRadiusSquared * inverseTimeHorizon * inverseTimeHorizon;
  if (wSquared <= cutOffSquared) {
    // Inside the disc of velocities that can no longer avoid contact within the
    // horizon. The shortest way out is radial, and a body at rest inside its own
    // cut-off disc is the one case where a walker must be told to move at all.
    const wLength = Math.sqrt(wSquared);
    if (wLength <= 1e-12) return { pointX: 0, pointZ: 0, w: 0 };
    const unitX = wX / wLength;
    const unitZ = wZ / wLength;
    return {
      pointX: unitX,
      pointZ: unitZ,
      w: combinedRadius * inverseTimeHorizon - wLength + other.velocityX * unitX + other.velocityZ * unitZ,
    };
  }
  // Otherwise only the cone itself can contain the relative velocity. The cone is
  // spanned by the two tangents from the origin of relative-velocity space to the
  // disc of radius `combinedRadius` about `relativePosition`, and a velocity
  // outside it is not a collision course at all: two bodies at rest relative to
  // one another never touch, however close they stand.
  const along = wX * relativeX + wZ * relativeZ;
  const cross = wX * relativeZ - wZ * relativeX;
  if (along <= 0 || cross * cross >= combinedRadiusSquared * wSquared) return { pointX: 0, pointZ: 0, w: 0 };
  const leg = Math.sqrt(Math.max(0, distanceSquared - combinedRadiusSquared));
  const side = cross >= 0 ? 1 : -1;
  // Unit direction of the nearer tangent; the outward normal is perpendicular to
  // it, on the far side from the cone's axis.
  const tangentX = (leg * relativeX - side * combinedRadius * relativeZ) / distanceSquared;
  const tangentZ = (leg * relativeZ + side * combinedRadius * relativeX) / distanceSquared;
  let normalX = tangentZ;
  let normalZ = -tangentX;
  if (normalX * relativeX + normalZ * relativeZ > 0) {
    normalX = -normalX;
    normalZ = -normalZ;
  }
  // The smallest change projects the relative velocity onto that leg, so the
  // half-plane's boundary is the leg itself and its right-hand side is the
  // projection the change lands on, carried into the walker's own velocity space.
  const projection = wX * normalX + wZ * normalZ;
  if (projection >= 0) return { pointX: 0, pointZ: 0, w: 0 };
  return {
    pointX: normalX,
    pointZ: normalZ,
    w: -projection + other.velocityX * normalX + other.velocityZ * normalZ,
  };
}

/**
 * How often each body's avoidance is re-solved, in ticks. `1` is every tick (the shipped
 * behaviour); `N` solves on the tick where `tickCount % N === slot % N` and holds the
 * resulting velocity direction between solves, scaled by each tick's own speed ramp.
 *
 * This is the measured candidate for §3, not shipped code. What it changes about the
 * motion, stated where it is made rather than in prose elsewhere: a body reacts to its
 * neighbours' positions at up to N-1 ticks of age (at 1/60 s a tick, 16.7 ms per step), so
 * the crowd's response to a closing gap is delayed by up to that much. The stagger is by
 * slot, so neighbours do not all refresh on the same tick and the crowd does not pulse.
 */
const AVOIDANCE_INTERVAL = (() => {
  const raw = typeof process === "undefined" ? undefined : process.env?.DSH_AVOIDANCE_INTERVAL;
  const value = raw === undefined ? 1 : Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`DSH_AVOIDANCE_INTERVAL must be an integer of at least 1, not ${String(raw)}`);
  return value;
})();

let orcaTick = 0;
const heldDirection = new Float64Array(65_536 * 2);

/** Set by the probe to prove which path ran. */
export const orcaStats = { solved: 0, held: 0 };

export interface OrcaScratch {
  readonly neighbours: Int32Array;
  readonly lines: Line[];
  readonly result: { x: number; z: number };
}

export function createOrcaScratch(): OrcaScratch {
  return { neighbours: new Int32Array(PEDESTRIAN_DYNAMICS.neighbours), lines: [], result: { x: 0, z: 0 } };
}

/** The collision-free velocity nearest the preferred one. */
export function orcaVelocity(hash: NeighbourIndex, agents: readonly OrcaAgent[], self: number, preferredX: number, preferredZ: number, scratch: OrcaScratch): { x: number; z: number } {
  // The decimated path needs a tick counter and a per-slot held direction.
  orcaTick += 1;
  if (AVOIDANCE_INTERVAL !== 1 && orcaTick % AVOIDANCE_INTERVAL !== self % AVOIDANCE_INTERVAL && heldDirection[self * 2] !== undefined) {
    const length = Math.hypot(preferredX, preferredZ);
    const heldX = heldDirection[self * 2]!;
    const heldZ = heldDirection[self * 2 + 1]!;
    scratch.result.x = heldX * length;
    scratch.result.z = heldZ * length;
    return scratch.result;
  }
  const agent = agents[self]!;
  const count = hash.neighbours(agent.x, agent.z, PEDESTRIAN_DYNAMICS.neighbourRadiusM, PEDESTRIAN_DYNAMICS.neighbours, scratch.neighbours);
  scratch.lines.length = 0;
  for (let i = 0; i < count; i += 1) {
    const other = scratch.neighbours[i]!;
    if (other === self) continue;
    const line = orcaHalfPlane(agent, agents[other]!, PEDESTRIAN_DYNAMICS.timeHorizonSeconds);
    if (line.pointX !== 0 || line.pointZ !== 0) scratch.lines.push(line);
  }
  // The half-planes are `dot(v, point) >= w`; the solver also wants the
  // admissible velocity inside the preferred speed, which is the radius of the
  // disc it searches for the nearest point to the preferred velocity.
  linearProgram(scratch.lines, Math.hypot(preferredX, preferredZ), preferredX, preferredZ, scratch.result);
  orcaStats.solved += 1;
  if (AVOIDANCE_INTERVAL !== 1) {
    const solvedLength = Math.hypot(scratch.result.x, scratch.result.z);
    if (solvedLength > 1e-12) {
      heldDirection[self * 2] = scratch.result.x / solvedLength;
      heldDirection[self * 2 + 1] = scratch.result.z / solvedLength;
    } else {
      heldDirection[self * 2] = 0;
      heldDirection[self * 2 + 1] = 0;
    }
  }
  return scratch.result;
}

/* ------------------------------------------------------------ the walking step */

/** The occurrence index an actor at `travelledM` is on. */
export function occurrenceAt(route: PlannedRoute, travelledM: number): number {
  let index = 0;
  while (index + 1 < route.edges.length && travelledM >= route.starts[index + 1]!) index += 1;
  return index;
}

export interface PedestrianCrowd {
  readonly hash: NeighbourIndex;
  readonly agents: OrcaAgent[];
  readonly velocityX: Float64Array;
  readonly velocityZ: Float64Array;
  readonly scratch: OrcaScratch;
  readonly route: (PlannedRoute | null)[];
  readonly committed: Uint8Array;
}

export function createPedestrianCrowd(table: SlotTable): PedestrianCrowd {
  const count = table.pedestrians.length;
  const agents: OrcaAgent[] = Array.from({ length: count }, () => ({ x: 0, z: 0, velocityX: 0, velocityZ: 0, radius: PEDESTRIAN_DYNAMICS.radiusM }));
  return {
    hash: createNeighbourIndex(PEDESTRIAN_DYNAMICS.cellSizeM),
    agents,
    velocityX: new Float64Array(count),
    velocityZ: new Float64Array(count),
    scratch: createOrcaScratch(),
    route: new Array<PlannedRoute | null>(count).fill(null),
    committed: new Uint8Array(count),
  };
}

export function refreshPedestrianHash(crowd: PedestrianCrowd, table: SlotTable): void {
  const poses = table.poses.pedestrians;
  const position = poses.current.position;
  crowd.hash.rebuild(poses.count, position, poses.active);
  for (let index = 0; index < crowd.hash.size; index += 1) {
    const slot = crowd.hash.slotAt(index);
    const agent = crowd.agents[slot]!;
    agent.x = position[slot * 3]!;
    agent.z = position[slot * 3 + 2]!;
    // A stopped actor's radius is its collision footprint's; neighbours read the
    // same number, so the separation gate and ORCA agree by construction.
    agent.radius = PEDESTRIAN_DYNAMICS.radiusM * poses.scale[slot]!;
  }
}

/** Place a walking slot on its route at its current distance. */
export function placePedestrian(table: SlotTable, slot: number): void {
  const state = table.pedestrians[slot]!;
  const route = table.pedestrianRoutes[slot];
  if (!route) return;
  const occurrence = occurrenceAt(route, state.travelledM);
  const at = sampleRoute(route, occurrence, state.travelledM - route.starts[occurrence]!);
  placeSlot(table.poses.pedestrians, slot, at, at.heading);
  state.routeIndex = occurrence;
  table.poses.pedestrians.current.travelledMetres[slot] = state.travelledM;
  table.poses.pedestrians.speedMps[slot] = state.speedMps;
}
