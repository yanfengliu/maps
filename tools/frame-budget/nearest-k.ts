/**
 * harness: the real crowd's own positions, run through the shipped neighbour query
 * and through a prototype nearest-k query, both against the same bodies. No browser,
 * no GPU, no tick.
 *
 * **Why it exists.** `tools/frame-budget/avoid-cost.ts` measures that each body's
 * avoidance solve costs about 1.9 microseconds and that its neighbour query alone is
 * about 1.7 of them, and `tools/frame-budget/phases-baseline.json` measures that
 * this phase is 44% of a tick. The cause is not the grid's traversal: it is that the
 * query returns **every** body within the 8 m neighbour radius — about 98 of them at
 * the acceptance population — while ORCA uses a limit of 8. The shipped query keeps
 * the eight **lowest slot indices** inside the radius, so it cannot stop early.
 *
 * This tool measures what the alternatives would cost and what they would return, so
 * the choice is made on numbers:
 *
 *  - `shipped` — the grid's own `neighbours`, today's answer and today's cost;
 *  - `nearestK` — the same grid storage, walking cells outward from the query cell
 *    and stopping once the k-th nearest distance is smaller than the nearest
 *    possible body in any cell not yet visited. Returns the k nearest, ascending by
 *    slot;
 *  - `radiusK` — the same walk, stopped as soon as k bodies are inside the radius.
 *    Cheaper than `nearestK` and returns a *different* set, so it is here as the
 *    lower bound on the walk's cost rather than as a candidate.
 *
 * **What this is not.** It is not a change to the tick, and the numbers are not a
 * tick measurement: it replays one settled crowd's positions through three query
 * implementations and times each. Whether a different neighbour *set* is a better
 * crowd is a question about behavior, not cost, and this tool does not answer it —
 * it reports how many of the eight bodies the two policies disagree about, which is
 * the size of the behavioral change a reader would be accepting.
 *
 * RUN IT:
 *
 *   node tools/frame-budget/nearest-k.ts --settle 600 --rounds 7
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings, PEDESTRIAN_DYNAMICS } from "../../src/agents/population/config.ts";
import type { NetworkData } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STEP = 1 / 60;

function argument(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number after it; received ${process.argv[at + 1]}`);
  return value;
}

function readRequired<T>(path: string, label: string): T {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`The nearest-k probe needs ${label} at ${full} and it is missing. Build it with npm run data:network and npm run data:setup; this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const settle = argument("settle", 600);
const rounds = argument("rounds", 7);
const seed = argument("seed", 0x5b1b0a);

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network);
const population = createPopulation({ network, fleet, admissions, settings });

const loop = new RenderLoop({ render: () => {} });
loop.onFixedStep((step, simulatedSeconds) => population.update(step, simulatedSeconds));
for (let index = 0; index < settle; index += 1) loop.advance((index + 1) * STEP * 1000 + 0.001);
loop.stop();

const crowd = population.pedestrianCrowd();
const shipped = crowd.hash;
const poses = population.poses.pedestrians;
const agents = crowd.agents;
const active: number[] = [];
for (let slot = 0; slot < pedestrians; slot += 1) if (poses.active[slot]) active.push(slot);

const radius = PEDESTRIAN_DYNAMICS.neighbourRadiusM;
const limit = PEDESTRIAN_DYNAMICS.neighbours;
const cellSize = PEDESTRIAN_DYNAMICS.cellSizeM;

/**
 * The prototype, on its own copy of the grid's storage.
 *
 * It is a separate structure rather than a patch to `CellGrid` because this tool
 * measures a proposal; the proposal's own numbers come out of here and its code
 * would move into `cell-grid.ts` only if it is accepted.
 */
class NearestK {
  private readonly columns: number;
  private readonly offset: number;
  private readonly cell: Int32Array;
  private bodyX = new Float64Array(0);
  private bodyZ = new Float64Array(0);
  private slot = new Int32Array(0);
  private next = new Int32Array(0);
  private count = 0;

  constructor(halfExtentM: number) {
    this.columns = 2 * Math.ceil(halfExtentM / cellSize) + 3;
    this.offset = this.columns >> 1;
    this.cell = new Int32Array(this.columns * this.columns).fill(-1);
  }

  rebuild(count: number, position: Float32Array, active: Uint8Array): void {
    if (this.bodyX.length < count) {
      this.bodyX = new Float64Array(count);
      this.bodyZ = new Float64Array(count);
      this.slot = new Int32Array(count);
    }
    this.cell.fill(-1);
    let live = 0;
    for (let index = 0; index < count; index += 1) {
      if (!active[index]) continue;
      this.bodyX[live] = position[index * 3]!;
      this.bodyZ[live] = position[index * 3 + 2]!;
      this.slot[live] = index;
      live += 1;
    }
    this.count = live;
    // A linked list per cell, which is enough for a prototype whose only job is to
    // answer "how many cells must a nearest-k walk open".
    const next = new Int32Array(live).fill(-1);
    for (let entry = 0; entry < live; entry += 1) {
      const at = this.index(this.bodyX[entry]!, this.bodyZ[entry]!);
      next[entry] = this.cell[at]!;
      this.cell[at] = entry;
    }
    this.next = next;
  }

  private index(x: number, z: number): number {
    return (Math.floor(z / cellSize) + this.offset) * this.columns + Math.floor(x / cellSize) + this.offset;
  }

  /** Bodies in the structure, for the record. */
  get live(): number {
    return this.count;
  }

  /**
   * The k nearest bodies, ascending by slot.
   *
   * Cells are opened in rings outward from the query's own cell. The walk stops
   * once it has k bodies and the k-th nearest is closer than the nearest point of
   * the next ring, which is what makes the answer exactly the k nearest rather than
   * the k that happened to be found first.
   */
  nearest(x: number, z: number, k: number, out: Int32Array): number {
    const radiusSquared = radius * radius;
    const column = Math.floor(x / cellSize) + this.offset;
    const row = Math.floor(z / cellSize) + this.offset;
    const found: number[] = [];
    const distances: number[] = [];
    let cellsOpened = 0;
    let bodiesOpened = 0;
    const maxRing = Math.max(this.columns, this.columns);
    for (let ring = 0; ring <= maxRing; ring += 1) {
      // Once k bodies are held, the next ring's nearest possible point is
      // `(ring - 1) * cellSize` away from the query on the axis; if the k-th
      // distance is below that, no later ring can hold anything nearer.
      if (found.length >= k && ring > 0) {
        const nearestPossible = (ring - 1) * cellSize;
        if (nearestPossible > 0 && distances[distances.length - 1]! <= nearestPossible * nearestPossible) break;
      }
      let opened = 0;
      for (let dc = -ring; dc <= ring; dc += 1) {
        for (let dr = -ring; dr <= ring; dr += 1) {
          // Only the ring's own border; the interior was opened by earlier rings.
          if (ring > 0 && Math.abs(dc) !== ring && Math.abs(dr) !== ring) continue;
          const at = this.index2(column + dc, row + dr);
          if (at < 0) continue;
          opened += 1;
          for (let entry = this.cell[at]!; entry >= 0; entry = this.next[entry]!) {
            bodiesOpened += 1;
            const dx = this.bodyX[entry]! - x;
            const dz = this.bodyZ[entry]! - z;
            const distance = dx * dx + dz * dz;
            if (distance > radiusSquared) continue;
            const slot = this.slot[entry]!;
            if (found.length < k) {
              found.push(slot);
              distances.push(distance);
              if (found.length === k) sortByDistance(found, distances);
            } else if (distance < distances[distances.length - 1]!) {
              found[found.length - 1] = slot;
              distances[distances.length - 1] = distance;
              sortByDistance(found, distances);
            }
          }
        }
      }
      cellsOpened += opened;
      if (ring > 0 && opened === 0 && found.length >= k) break;
    }
    found.sort((a, b) => a - b);
    const count = Math.min(k, found.length);
    for (let index = 0; index < count; index += 1) out[index] = found[index]!;
    this.lastCells = cellsOpened;
    this.lastBodies = bodiesOpened;
    return count;
  }

  /** The same walk, stopped as soon as k bodies are inside the radius. */
  radiusK(x: number, z: number, k: number, out: Int32Array): number {
    const radiusSquared = radius * radius;
    const column = Math.floor(x / cellSize) + this.offset;
    const row = Math.floor(z / cellSize) + this.offset;
    const found: number[] = [];
    const maxRing = Math.max(this.columns, this.columns);
    for (let ring = 0; ring <= maxRing && found.length < k; ring += 1) {
      for (let dc = -ring; dc <= ring; dc += 1) {
        for (let dr = -ring; dr <= ring; dr += 1) {
          if (ring > 0 && Math.abs(dc) !== ring && Math.abs(dr) !== ring) continue;
          const at = this.index2(column + dc, row + dr);
          if (at < 0) continue;
          for (let entry = this.cell[at]!; entry >= 0; entry = this.next[entry]!) {
            const dx = this.bodyX[entry]! - x;
            const dz = this.bodyZ[entry]! - z;
            if (dx * dx + dz * dz > radiusSquared) continue;
            found.push(this.slot[entry]!);
            if (found.length >= k) break;
          }
          if (found.length >= k) break;
        }
        if (found.length >= k) break;
      }
    }
    found.sort((a, b) => a - b);
    const count = Math.min(k, found.length);
    for (let index = 0; index < count; index += 1) out[index] = found[index]!;
    return count;
  }

  private index2(column: number, row: number): number {
    if (column < 0 || column >= this.columns || row < 0 || row >= this.columns) return -1;
    return row * this.columns + column;
  }

  lastCells = 0;
  lastBodies = 0;
}

function sortByDistance(slots: number[], distances: number[]): void {
  for (let index = 1; index < distances.length; index += 1) {
    const distance = distances[index]!;
    const slot = slots[index]!;
    let at = index - 1;
    while (at >= 0 && distances[at]! > distance) {
      distances[at + 1] = distances[at]!;
      slots[at + 1] = slots[at]!;
      at -= 1;
    }
    distances[at + 1] = distance;
    slots[at + 1] = slot;
  }
}

const prototype = new NearestK(520);
prototype.rebuild(poses.count, poses.current.position, poses.active);

const shippedOut = new Int32Array(limit);
const nearestOut = new Int32Array(limit);
const radiusOut = new Int32Array(limit);
const round = (value: number): number => Math.round(value * 1000) / 1000;

function timeIt(work: () => void): number {
  const before = performance.now();
  work();
  return performance.now() - before;
}

interface Arm { name: string; milliseconds: number; agreements: number; compared: number }
function runArm(name: string, query: (slot: number, out: Int32Array) => number): Arm {
  let agreements = 0;
  let compared = 0;
  const milliseconds = timeIt(() => {
    for (let index = 0; index < active.length; index += 1) {
      const slot = active[index]!;
      const agent = agents[slot]!;
      const count = query(slot, name === "shipped" ? shippedOut : name === "nearestK" ? nearestOut : radiusOut);
      const other = name === "shipped" ? shippedOut : name === "nearestK" ? nearestOut : radiusOut;
      // How much of the answer the policy shares with the shipped one.
      const shippedCount = shipped.neighbours(agent.x, agent.z, radius, limit, shippedOut);
      compared += Math.max(count, shippedCount);
      for (let i = 0; i < Math.min(count, shippedCount); i += 1) if (other[i] === shippedOut[i]) agreements += 1;
    }
  });
  return { name, milliseconds: round(milliseconds), agreements, compared };
}

// Warm up every arm on the same shapes.
for (let pass = 0; pass < 2; pass += 1) {
  for (let index = 0; index < active.length; index += 1) {
    const slot = active[index]!;
    const agent = agents[slot]!;
    shipped.neighbours(agent.x, agent.z, radius, limit, shippedOut);
    prototype.nearest(agent.x, agent.z, limit, nearestOut);
    prototype.radiusK(agent.x, agent.z, limit, radiusOut);
  }
}

const roundsOut: Arm[][] = [];
for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
  roundsOut.push([
    runArm("shipped", (slot, out) => shipped.neighbours(agents[slot]!.x, agents[slot]!.z, radius, limit, out)),
    runArm("nearestK", (slot, out) => prototype.nearest(agents[slot]!.x, agents[slot]!.z, limit, out)),
    runArm("radiusK", (slot, out) => prototype.radiusK(agents[slot]!.x, agents[slot]!.z, limit, out)),
  ]);
}

const names = ["shipped", "nearestK", "radiusK"];
const summary = Object.fromEntries(names.map((name, at) => {
  const values = roundsOut.map((rounds) => rounds[at]!.milliseconds);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const arm = roundsOut[0]![at]!;
  return [name, {
    medianMs: round(median),
    allMs: values.map(round),
    microsecondsPerBody: round((median * 1000) / active.length),
    agreementWithShipped: round(arm.agreements / Math.max(1, arm.compared)),
  }];
}));

process.stdout.write(`${JSON.stringify({
  tool: "tools/frame-budget/nearest-k.ts",
  bound: {
    pedestrians, vehicles, settleTicks: settle, rounds, seed, activeBodies: active.length,
    radiusM: radius, neighbourLimit: limit, cellSizeM: cellSize,
    positions: "the real crowd's own pose buffers after the settle ticks at the acceptance population",
    caveat: "cost of one query per active body, replayed; not a tick measurement, and not evidence that a different neighbour set is a better crowd",
  },
  machine: { cpu: [...new Set(os.cpus().map((cpu) => cpu.model))].join(", "), node: process.version },
  shippedWalk: { cellsOpened: 25, note: "the shipped query opens a fixed 5x5 cell box; see CellGrid.neighbours" },
  prototypeWalk: { cellsOpenedMedian: prototype.lastCells, bodiesOpenedMedian: prototype.lastBodies },
  arms: summary,
}, null, 2)}\n`);
