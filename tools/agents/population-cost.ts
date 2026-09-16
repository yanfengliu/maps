/**
 * harness: the real network graph, the real admission authority, the real pose
 * buffers, `writePoseMatrix` from `src/agents/render/pose.ts` and real three.js
 * `InstancedMesh.setMatrixAt`. No browser, no GPU, no Playwright lane.
 *
 * Bound: 3,000 pedestrian slots + 200 vehicle slots; 12 warmup + 120 measured
 * ticks at exactly 1/60 s; one seed; one process; no GPU frame, no motion model.
 *
 * WHAT THIS MEASURES
 *
 * 1. `admission` — the REAL `JunctionAdmissions.resolve(stepSeconds, requests)`
 *    plus the REAL `JunctionAdmissions.observe(actorId, observation)`, driven at
 *    full 3,200-actor scale. Every `RoutePassage` is factory-issued by
 *    `createRoutePassage` from the delivered network and walks real `nextIds` to
 *    a real AOI exit portal. Every footprint is real, every `stoppedSeconds` is
 *    continuously measured by the probe, and no actor moves into a conflict
 *    section on anything but a grant the authority returned. `observe` is inside
 *    the batch because the design's tick order requires one observation per
 *    committed actor per tick, not because it is convenient.
 *
 * 2. `poseComposition` — the real `writePoseMatrix` once per active slot, plus
 *    the real `InstancedMesh.setMatrixAt` once per draw part per active
 *    instance, plus the real per-slot motion-attribute write, against real
 *    `InstancedMesh` objects sized to the design's per-level instance budgets.
 *    Draw-part counts are read from the delivered GLBs' own JSON chunks.
 *
 * 3. `simulation` — the per-tick population step that EXISTS, and no more. There
 *    is no IDM, no MOBIL and no ORCA in this repository, so no complete
 *    population step can be measured. What is measured is the substrate a fixed
 *    step has to run every tick: per-actor distance integration over a real
 *    planned route, the real `projectVehicleFootprint` collision-envelope
 *    projection per vehicle, and the read/write of the real dense
 *    `AgentPoseBuffers` the renderer interpolates. No car following, no lane
 *    change, no avoidance, no spatial hash, no queueing model.
 *
 * So `simulation` is a LOWER BOUND on a real step and `admission` is the real
 * thing. Neither one alone is the answer; the report says which is which.
 *
 * WHAT IS DELIBERATELY EXCLUDED, AND WHY
 *
 * - `HumanRenderer.update` from `src/agents/render/humans.ts` is NOT called.
 *   `src/agents/render/**` imports its siblings with `.js` specifiers that bare
 *   Node does not map to the `.ts` file beside it, so this probe registers a
 *   `node:module` resolve hook rewriting only that case; with it, `pose.ts` and
 *   `humans.ts` both import. `humans.ts` is still not called because its
 *   `load()` needs `GLTFLoader`, `fetch` and WebGL before an `InstancedMesh`
 *   exists, so the class cannot be constructed in Node at all. Its per-slot body
 *   is therefore reproduced call for call on real three.js objects, using the
 *   real `writePoseMatrix`; every statement of that body is measured except the
 *   `level.count++` counter and the GPU `instanceMatrix` upload it triggers.
 * - The delivered human manifests are version 1 with no `drawParts`, while
 *   `admitHumanDraws` requires the version-2 draw set, so the shipped renderer
 *   cannot load the assets on disk today. Part counts come from the GLBs, which
 *   is what `drawParts` is generated from.
 * - No GPU cost: no shadow pass, no post chain, no draw-call submission, no
 *   `instanceMatrix`/`instanceColor` upload and no vertex skinning.
 * - No route choice: one breadth-first route per entry portal, so demand is
 *   synthetic even though every passage, junction, control and footprint is real.
 *
 * RUN IT:
 *
 *   node tools/agents/population-cost.ts                 # writes artifacts/population-cost
 *   node tools/agents/population-cost.ts --out <dir>     # writes <dir> instead
 *   POPULATION_COST_OUT=<dir> node tools/agents/population-cost.ts
 *   POPULATION_COST_SEED=<n> node tools/agents/population-cost.ts --out <dir>
 *
 * Plain Node 24 runs it: type stripping covers the probe and `pose.ts`, and the
 * resolve hook exists only because nothing in `src/agents/render/**` can be
 * reached otherwise. `--experimental-transform-types` is not required and adding
 * it does not change the measurement. A relative `--out` resolves against the
 * repository root, not the working directory, so the probe reads the same files
 * and writes the same place from any directory. An unknown argument is an error
 * rather than being ignored.
 *
 * OUTPUT: `raw.json`, `summary.json` and `probe-output.txt` in the output
 * directory, plus a summary on stdout. The probe fails loudly on a missing
 * module or a missing input file and never substitutes a fixture.
 *
 * A RUN NEVER CLOBBERS EVIDENCE. Before it measures anything, the probe checks
 * the three output files and refuses to run at all if any of them already
 * exists, naming them and the override that would send this run elsewhere. A
 * refused run measures nothing and writes nothing, so the existing evidence is
 * left byte-identical. The three writes are `wx` as well, so a collision that
 * appears after the check still fails instead of overwriting. To measure twice,
 * name two directories.
 *
 * WHAT A RE-RUN PROVES, AND WHAT ONLY A FIRST RUN PROVES
 *
 * The numbers in `summary.json` are two kinds of thing, and a re-run answers
 * them differently.
 *
 * A re-run with the same seed over the same inputs, on a tree that did not
 * move, must reproduce these EXACTLY: `digest.finalMeasuredState`, every field
 * of `totals` and `measuredTickCounts`, `graph`, `drawSet`, `composition`,
 * `inputSha256`, the instance counts in `nearBudgetControl`, and
 * `lastCompleteTick`. Any difference is a defect — nondeterminism somewhere in
 * the probe, the graph, the admission authority or the pose path — and it is
 * checkable only because a second run can write to a directory of its own. That
 * is what `--out` is for.
 *
 * A re-run CANNOT reproduce `statistics`, `elapsedMs`, `runWindowMs`, the
 * `passMs` of `nearBudgetControl`, or `startedAtUtc`, and those fields are not
 * claims about determinism. They are wall-clock times on a shared machine;
 * another process on the box moves them. A re-run that reports faster numbers
 * than a first run does not show the code got faster, and a re-run reporting
 * slower ones does not show a regression. Compare the timing fields only as
 * orders of magnitude against the 16.667 ms frame interval, and never across
 * machines.
 *
 * What only a first run proves is that the measurement exists at all: the
 * inputs were on disk, the graph planned a route, the authority granted
 * something, and 120 measured ticks ran over a population that moved. `advanced`
 * is that claim, and the tick count and the positive totals are the clauses that
 * carry it — its `finalDigest !== sha256 of nothing` clause is close to a
 * tautology, because the digest always absorbs at least one byte. A first run is
 * the only run that can establish that liveness, because a re-run inherits a
 * tree the first run already bootstrapped. What a re-run adds is the one claim a
 * first run cannot make for itself: that the same inputs produce the same
 * measured state.
 *
 * The digest is a weaker instrument than it looks, and its bound is worth
 * knowing: it hashes pedestrian pose buffers only, never the 200 vehicle slots,
 * and it hashes them as float32 bytes, so it proves float32-level equality of
 * those buffers rather than bit-exact equality of the simulation. It is also
 * mostly gate positions by the end of the window, because a slot that has
 * reached its gate is clamped there; the seed-sensitive content is the moving
 * minority. The counts, not the digest, are what show the population was alive.
 *
 * What no run of this probe proves is listed above under the exclusions: it says
 * nothing about pixels, GPU cost, driver behaviour or whether the population
 * behaves like traffic.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { InstancedMesh, Matrix4, PerspectiveCamera } from "three";
import { RenderLoop } from "../../src/render/loop.ts";
import { JunctionAdmissions, type ActorFootprint, type AdmissionRequest } from "../../src/network/admissions.ts";
import { createRoutePassage, type RoutePassage } from "../../src/network/passages.ts";
import { projectVehicleFootprint } from "../../src/network/footprints.ts";
import { headingAt, sampleEdge } from "../../src/network/geometry.ts";
import { createRng, DEFAULT_SEED } from "../../src/world/rng.ts";
import { assertAgentPoseBuffers, assertVehiclePoseBuffers, type AgentPoseBuffers, type VehiclePoseBuffers } from "../../src/world/agent-poses.ts";
import { HUMAN_ASSET_URLS, VEHICLE_CLASSES, type AgentAssetManifest, type VehicleAsset, type VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import type { NetworkData, NetworkEdge } from "../../src/world/network-data.ts";

/* ------------------------------------------------------------- the bound */

const PEDESTRIANS = 3_000;
const VEHICLES = 200;
const STEP_SECONDS = 1 / 60;
const WARMUP_TICKS = 12;
const MEASURED_TICKS = 120;
/** The design proposal's per-level instance budgets (`src/agents/population/config.ts` in the proposal). */
const NEAR_INSTANCES = 160;
const MEDIUM_INSTANCES = 640;
const NEAR_THRESHOLD_M = 18;
const MEDIUM_THRESHOLD_M = 60;
const SEED = Number(process.env.POPULATION_COST_SEED ?? DEFAULT_SEED);
/** Measured walk cadence: 1.1 m stride over a 1.0 s clip. Not a motion model, a constant. */
const PEDESTRIAN_SPEED_MPS = 1.1;
/** A constant, not a car-following law: the vehicle class speed limit is never consulted here. */
const VEHICLE_SPEED_MPS = 8;

const round = (value: number): number => Math.round(value * 1000) / 1000;

/* ------------------------------------------------- where the evidence goes */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PROBE_PATH = "tools/agents/population-cost.ts";
const DEFAULT_OUT_DIR = resolve(ROOT, "artifacts/population-cost");
/** The three files one run owns. Nothing here is ever written twice. */
const OUTPUT_FILES = ["raw.json", "summary.json", "probe-output.txt"] as const;

/**
 * `--out <dir>` beats `POPULATION_COST_OUT` beats the default documented path.
 * A relative directory is resolved against the repository root rather than the
 * working directory, so the documented command writes the documented place from
 * anywhere. An argument this probe does not know is an error: a silently ignored
 * flag measures something other than what the caller asked for.
 */
function resolveOutDir(argv: readonly string[]): { dir: string; source: string } {
  let fromArg: string | null = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!;
    if (arg === "--out" || arg.startsWith("--out=")) {
      const value = arg === "--out" ? argv[index + 1] : arg.slice("--out=".length);
      if (!value || value.startsWith("--")) {
        throw new Error(`Population cost probe was given ${arg} with no directory after it, so it would have written into the repository root. Usage: node ${PROBE_PATH} --out <dir>, where a relative <dir> is resolved against ${ROOT}.`);
      }
      if (fromArg !== null) {
        throw new Error(`Population cost probe was given the output directory twice (${fromArg} and ${value}); name one. Usage: node ${PROBE_PATH} --out <dir>.`);
      }
      fromArg = value;
      if (arg === "--out") index += 1;
    } else {
      throw new Error(`Population cost probe does not know the argument ${arg}. Usage: node ${PROBE_PATH} [--out <dir>]. The seed comes from POPULATION_COST_SEED, not from a flag, and there is no other option.`);
    }
  }
  if (fromArg !== null) return { dir: resolve(ROOT, fromArg), source: "--out" };
  const fromEnv = process.env.POPULATION_COST_OUT;
  if (fromEnv) return { dir: resolve(ROOT, fromEnv), source: "POPULATION_COST_OUT" };
  return { dir: DEFAULT_OUT_DIR, source: "default" };
}

const OUT = resolveOutDir(process.argv.slice(2));
const OUT_DIR = OUT.dir;
const command = ["node", PROBE_PATH, ...process.argv.slice(2)].join(" ");

/**
 * Refuse before measuring, not after: a run that finds evidence in its way must
 * leave that evidence exactly as it found it, and a run that dies on EEXIST at
 * the end has already spent a minute of CPU and may already have overwritten
 * part of what it found. This probe once wrote `raw.json` unconditionally and
 * then threw on the exclusive `summary.json`, so a re-run destroyed the retained
 * `raw.json` and still exited non-zero: it is only checkable, never re-runnable.
 */
const existing = OUTPUT_FILES.filter(name => existsSync(resolve(OUT_DIR, name)));
if (existing.length) {
  throw new Error(`Population cost probe will not write into ${OUT_DIR} (from ${OUT.source}) because ${existing.join(", ")} ${existing.length === 1 ? "is" : "are"} already there. A run owns the files it creates and never overwrites evidence from another run, so this one stops now, having measured nothing and written nothing. Point it at an empty or new directory with "node ${PROBE_PATH} --out <dir>" (or POPULATION_COST_OUT=<dir>), or move the existing evidence first.`);
}
mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------- the `.js` specifier resolve hook */

const RESOLVE_HOOK = [
  "export async function resolve(specifier, context, nextResolve) {",
  "  try { return await nextResolve(specifier, context); }",
  "  catch (error) {",
  "    if (specifier.endsWith('.js') && context.parentURL) {",
  "      try { return await nextResolve(new URL(specifier.slice(0, -3) + '.ts', context.parentURL).href, context); } catch {}",
  "    }",
  "    throw error;",
  "  }",
  "}",
].join("\n");

const { register } = await import("node:module");
register(`data:text/javascript,${encodeURIComponent(RESOLVE_HOOK)}`);

let writePoseMatrix: typeof import("../../src/agents/render/pose.ts").writePoseMatrix;
try {
  ({ writePoseMatrix } = await import("../../src/agents/render/pose.ts"));
} catch (error) {
  throw new Error(`Population cost probe cannot import src/agents/render/pose.ts, which carries the shipped writePoseMatrix, so the pose composition batch could not be measured against the real code. The module resolves src/world/agent-poses with a .js specifier that bare Node does not map to the .ts file beside it; run this probe through the node:module resolve hook registered above, i.e. "node tools/agents/population-cost.ts". Cause: ${(error as Error).message}`);
}
if (typeof writePoseMatrix !== "function") {
  throw new Error("Population cost probe imported src/agents/render/pose.ts but it did not export writePoseMatrix as a function; the shipped pose path changed and this probe no longer measures it.");
}

/* ------------------------------------------------------- inputs on disk */

function readRequired(path: string, label: string): Buffer {
  if (!existsSync(path)) {
    throw new Error(`Population cost probe needs ${label} at ${path} and it is missing. Build it with the repository's own data commands (npm run data:network for the movement graph, npm run data:setup for the agent assets) before measuring; this probe measures the delivered inputs and will not substitute a fixture.`);
  }
  return readFileSync(path);
}
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const networkBytes = readRequired(resolve(ROOT, "data/network/network.json"), "the delivered movement network");
const network = JSON.parse(networkBytes.toString("utf8")) as NetworkData;
assert.equal(network.version, 1, "Delivered network version changed; this probe pins version 1.");

const HUMAN_IDS = ["commuter-male", "office-male", "commuter-female"] as const;
assert.equal(HUMAN_IDS.length, HUMAN_ASSET_URLS.length, "Human manifests loaded here must match HUMAN_ASSET_URLS one for one.");
const humanManifests = HUMAN_IDS.map(id => {
  const bytes = readRequired(resolve(ROOT, `data/scene/agents/${id}.json`), `the delivered human manifest ${id}.json`);
  return { id, sha256: sha256(bytes), manifest: JSON.parse(bytes.toString("utf8")) as AgentAssetManifest };
});
const vehicleManifestBytes = readRequired(resolve(ROOT, "data/scene/agents/vehicles.json"), "the delivered vehicle manifest");
const vehicleManifest = JSON.parse(vehicleManifestBytes.toString("utf8")) as VehicleAssetManifest;
assert.deepEqual(vehicleManifest.vehicles.map(v => v.id), [...VEHICLE_CLASSES], "Delivered vehicle classes must be exactly VEHICLE_CLASSES in order.");

/** Real drawable primitive and node counts, read from the GLB container's own JSON chunk. */
function readGlbShape(path: string, label: string): { nodes: number; primitives: number; meshes: number } {
  const bytes = readRequired(path, label);
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${label} at ${path} is not a binary glTF container; the delivered asset changed shape.`);
  let offset = 12;
  let json: { scenes: { nodes?: number[] }[]; scene?: number; nodes: { mesh?: number; children?: number[] }[]; meshes: { primitives: unknown[] }[] } | null = null;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) { json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString("utf8")); break; }
    offset += 8 + length;
  }
  if (!json) throw new Error(`${label} at ${path} has no glTF JSON chunk, so its drawable primitive count cannot be read.`);
  const scene = json.scenes[json.scene ?? 0];
  if (!scene?.nodes) throw new Error(`${label} at ${path} has no selected scene, so the shipped draw set cannot be derived.`);
  const document = json;
  let nodes = 0, primitives = 0;
  const visit = (index: number): void => {
    nodes += 1;
    const node = document.nodes[index];
    if (!node) throw new Error(`${label} at ${path} references absent node ${index}.`);
    if (node.mesh !== undefined) primitives += document.meshes[node.mesh]!.primitives.length;
    for (const child of node.children ?? []) visit(child);
  };
  for (const index of scene.nodes) visit(index);
  return { nodes, primitives, meshes: document.meshes.length };
}

const humanLodShape = humanManifests.flatMap(({ id, manifest }) => manifest.lods.map(lod => {
  const shape = readGlbShape(resolve(ROOT, `data/scene/agents/${lod.model}`), `${id}/${lod.id} GLB`);
  return {
    id, lod: lod.id, model: lod.model, primitives: shape.primitives, nodes: shape.nodes,
    textureWidth: lod.textureWidth, textureHeight: lod.textureHeight,
    strideMetres: manifest.clips.find(clip => clip.id === "walk")!.strideMetres,
    idleSeconds: manifest.clips.find(clip => clip.id === "idle")!.durationSeconds,
  };
}));
const partsFor = (lod: "near" | "medium" | "far"): number => Math.max(...humanLodShape.filter(row => row.lod === lod).map(row => row.primitives));
const nearParts = partsFor("near"), mediumParts = partsFor("medium"), farParts = partsFor("far");
const cadence = humanLodShape[0]!;

const vehicleShapes = vehicleManifest.vehicles.map(asset => {
  const shape = readGlbShape(resolve(ROOT, `data/scene/agents/${asset.model}`), `${asset.id} GLB`);
  return { id: asset.id, primitives: shape.primitives, nodes: shape.nodes, wheelObjects: asset.wheelObjects.length, collision: asset.collision };
});
const maxVehiclePrimitives = Math.max(...vehicleShapes.map(shape => shape.primitives));
/** Half the longest delivered collision envelope; see the vehicle stop-line exclusion. */
const longestVehicleHalfLengthM = Math.max(...vehicleShapes.map(shape => shape.collision.length)) / 2;

/* ---------------------------------------------------------- route planning */

const edgeById = new Map<string, NetworkEdge>([...network.lanes, ...network.walks].map(edge => [edge.id, edge]));

interface PlannedRoute { readonly edgeIds: string[]; readonly compounds: number; readonly entryIndex: number }

/**
 * Deterministic breadth-first search from a real entry portal to a real AOI exit
 * portal. `compounds` counts the conflict authorities the route enters, which is
 * the demand knob: a route that enters none never asks the authority anything.
 * `createRoutePassage` rejects the route itself if it is not legal, so a wrong
 * plan fails loudly here rather than being silently measured.
 */
function planRoutes(entryEdgeId: string, exitPortalIds: readonly string[], maxCompounds: number, maxEdges: number): PlannedRoute[] {
  const exits = new Set(exitPortalIds);
  const results: PlannedRoute[] = [];
  const seen = new Set<string>([entryEdgeId]);
  const queue: PlannedRoute[] = [{ edgeIds: [entryEdgeId], compounds: edgeById.get(entryEdgeId)!.junctionId ? 1 : 0, entryIndex: 0 }];
  for (const node of queue) {
    const head = edgeById.get(node.edgeIds.at(-1)!)!;
    if (exits.has(head.id) && node.compounds > 0) {
      const entryIndex = node.edgeIds.findIndex(id => edgeById.get(id)!.junctionId !== null);
      results.push({ edgeIds: node.edgeIds, compounds: node.compounds, entryIndex: Math.max(0, entryIndex) });
      continue;
    }
    for (const next of [...head.nextIds].sort()) {
      if (seen.has(next) || node.edgeIds.length >= maxEdges) continue;
      const edge = edgeById.get(next);
      if (!edge) continue;
      const compounds = node.compounds + (edge.junctionId ? 1 : 0);
      if (compounds > maxCompounds) continue;
      seen.add(next);
      queue.push({ edgeIds: [...node.edgeIds, next], compounds, entryIndex: 0 });
    }
  }
  return results;
}

function buildRouteTable(kind: "vehicle" | "pedestrian"): PlannedRoute[] {
  const entries = kind === "vehicle" ? network.portals.vehicleEntry : network.portals.pedestrian;
  const exits = kind === "vehicle" ? network.portals.vehicleExit : network.portals.pedestrian;
  const known = new Set((kind === "vehicle" ? network.lanes : network.walks).map(edge => edge.id));
  const table: PlannedRoute[] = [];
  for (const entry of [...entries].sort()) {
    if (!known.has(entry)) continue;
    // The search returns as soon as this many qualifying routes are found, so
    // most portals contribute fewer. A low cap is what makes the population queue
    // at a handful of gates rather than spread thinly over every junction.
    for (const route of planRoutes(entry, exits, 6, 12)) table.push(route);
  }
  if (!table.length) {
    throw new Error(`Population cost probe planned no ${kind} route from the ${entries.length} delivered ${kind} entry portals to a true AOI exit that enters at least one conflict authority, so it cannot build the ${kind} admission batch from the real graph.`);
  }
  return table;
}

/**
 * Keep only the planned routes the real passage builder accepts, and keep the
 * passage it built. `createRoutePassage` is the authority on whether a route is
 * a legal compound occurrence, so a plan that fails it is a plan defect and is
 * dropped here rather than being smuggled past admission later.
 */
function buildPassages(kind: "vehicle" | "pedestrian", routes: PlannedRoute[]): { routes: PlannedRoute[]; passages: RoutePassage[]; rejected: { edgeIds: string[]; reason: string }[] } {
  const keptRoutes: PlannedRoute[] = [];
  const passages: RoutePassage[] = [];
  const rejected: { edgeIds: string[]; reason: string }[] = [];
  for (const route of routes) {
    try {
      const passage = createRoutePassage(network, kind, route.edgeIds, route.entryIndex);
      // A vehicle stops with its front at the line, not its origin. Where a
      // mapped stop sits closer to the gate than half a vehicle length, any
      // zero-length probe body crosses the line by arriving at the gate, and the
      // authority then correctly refuses its own progress. Those geometries need
      // the stop-line offset policy that does not exist yet, so they are excluded
      // by name rather than driven wrongly.
      const tooTight = kind === "vehicle" && passage.controls.some(control => control.routeIndex === passage.entryIndex && control.distanceM < longestVehicleHalfLengthM);
      if (tooTight) {
        rejected.push({ edgeIds: route.edgeIds, reason: `stop line ${passage.controls.find(control => control.routeIndex === passage.entryIndex)!.distanceM.toFixed(3)} m into the entry segment is nearer the gate than half the longest vehicle (${longestVehicleHalfLengthM.toFixed(3)} m), and no stop-line offset policy exists` });
        continue;
      }
      keptRoutes.push(route);
      passages.push(passage);
    } catch (error) {
      rejected.push({ edgeIds: route.edgeIds, reason: (error as Error).message.split(";")[0]! });
    }
  }
  if (!passages.length) {
    throw new Error(`Population cost probe built no legal ${kind} route passage out of ${routes.length} planned routes; the delivered ${kind} graph and the real passage builder disagree about every route, so no ${kind} admission batch can be measured.`);
  }
  return { routes: keptRoutes, passages, rejected };
}
const vehiclePlan = buildPassages("vehicle", buildRouteTable("vehicle"));
const pedestrianPlan = buildPassages("pedestrian", buildRouteTable("pedestrian"));
/* ------------------------------------------------ crowd state and passages */

interface Crowd {
  readonly kind: "vehicle" | "pedestrian";
  readonly count: number;
  readonly poses: AgentPoseBuffers;
  readonly passages: RoutePassage[];
  readonly passageIndexOf: Uint16Array;
  readonly travelledM: Float64Array;
  readonly speedMps: Float64Array;
  readonly stoppedSeconds: Float64Array;
  readonly committed: Uint8Array;
  /** Set while an actor stands on the gate; only a grant clears it. */
  readonly gateCleared: Uint8Array;
  /** The tick this actor joins the queue at its gate. The probe's only demand schedule. */
  readonly entryTick: Int32Array;
  readonly requests: (AdmissionRequest | null)[];
}

/**
 * A passage's conflict entry occurrence is the gate itself. Every actor starts
 * queued at that gate; `entryTick` staggers when each one walks up to it, which
 * is the probe's only demand schedule.
 */
function allocate(kind: "vehicle" | "pedestrian", count: number, passages: RoutePassage[], speed: number, rng: () => number, entryTickStride: number, entryTickSteps: number): Crowd {
  const makesSnapshot = () => ({ position: new Float32Array(count * 3), supportNormal: new Float32Array(count * 3), yaw: new Float32Array(count), travelledMetres: new Float64Array(count), generation: new Uint32Array(count) });
  const vehiclePoses: VehiclePoseBuffers = {
    count,
    previous: { ...makesSnapshot(), wheelOffsets: new Float32Array(count * 4), frontSteeringRadians: new Float32Array(count) },
    current: { ...makesSnapshot(), wheelOffsets: new Float32Array(count * 4), frontSteeringRadians: new Float32Array(count) },
    active: new Uint8Array(count),
    speedMps: new Float32Array(count),
    scale: new Float32Array(count),
    variant: new Uint8Array(count),
  };
  const poses: AgentPoseBuffers = kind === "vehicle" ? vehiclePoses : {
    count,
    previous: makesSnapshot(),
    current: makesSnapshot(),
    active: new Uint8Array(count),
    speedMps: new Float32Array(count),
    scale: new Float32Array(count),
    variant: new Uint8Array(count),
  };
  const committed = new Uint8Array(count);
  const gateCleared = new Uint8Array(count);
  const entryTick = new Int32Array(count);
  const requests = new Array<AdmissionRequest | null>(count).fill(null);
  const crowd: Crowd = {
    kind, count, poses, passages,
    passageIndexOf: new Uint16Array(count),
    travelledM: new Float64Array(count),
    speedMps: new Float64Array(count),
    stoppedSeconds: new Float64Array(count),
    committed,
    gateCleared,
    entryTick,
    requests,
  };
  const rotations = count / passages.length;
  for (let slot = 0; slot < count; slot++) {
    const index = slot % passages.length;
    crowd.passageIndexOf[slot] = index;
    poses.active[slot] = 1;
    poses.scale[slot] = 1;
    poses.variant[slot] = slot % (kind === "vehicle" ? VEHICLE_CLASSES.length : HUMAN_ASSET_URLS.length);
    crowd.speedMps[slot] = speed;
    crowd.travelledM[slot] = entryStartOf(passages[index]!) - 0.5 * speed * STEP_SECONDS;
    // Deterministic staggering in the same seeded stream, spread across a fixed
    // number of ticks so the queue forms instead of all 3,200 asking at once.
    const rotation = Math.floor(slot / passages.length);
    entryTick[slot] = 1 + Math.floor((0.5 + rotation + rng()) * (entryTickStride / rotations)) % entryTickSteps;
    for (const snapshot of [poses.current, poses.previous]) {
      const at = sampleEdge(passages[index]!.edges[passages[index]!.entryIndex]!, 0);
      snapshot.position[slot * 3] = at.x; snapshot.position[slot * 3 + 1] = at.y; snapshot.position[slot * 3 + 2] = at.z;
      snapshot.supportNormal[slot * 3 + 1] = 1;
      snapshot.yaw[slot] = headingAt(passages[index]!.edges[passages[index]!.entryIndex]!, 0);
    }
  }
  // The real validators, so a malformed probe population fails here and not later.
  if (kind === "vehicle") assertVehiclePoseBuffers(vehiclePoses, "Probe vehicle");
  else assertAgentPoseBuffers(poses, "Probe pedestrian");
  return crowd;
}

/**
 * Every distance in this probe is route-absolute metres, the unit `RoutePassage`
 * and `JunctionAdmissions.observe` use: `starts[i]` is where occurrence `i`
 * begins and `entryStart` is where the compound's gate stands. Mixing this with
 * a distance measured from the entry occurrence makes the authority read an
 * actor as already far inside the compound, which is exactly the bug this
 * comment exists to prevent.
 */
const entryStartOf = (passage: RoutePassage): number => passage.starts[passage.entryIndex]!;
const routeTotalOf = (passage: RoutePassage): number => passage.starts.at(-1)! + passage.edges.at(-1)!.lengthM;

function routeOccurrence(passage: RoutePassage, travelled: number): number {
  let index = passage.entryIndex;
  while (index + 1 < passage.edges.length && travelled >= passage.starts[index + 1]!) index += 1;
  return index;
}

const actorId = (crowd: Crowd, slot: number): string => `${crowd.kind}:${slot}`;

/** Move a slot's displayed pose onto its current route position. No allocation. */
function alignSlot(crowd: Crowd, slot: number): void {
  const passage = crowd.passages[crowd.passageIndexOf[slot]!]!;
  const travelled = Math.max(0, Math.min(crowd.travelledM[slot]!, routeTotalOf(passage) - 1e-9));
  const index = routeOccurrence(passage, travelled);
  const edge = passage.edges[index]!;
  const local = Math.min(edge.lengthM, Math.max(0, travelled - passage.starts[index]!));
  const at = sampleEdge(edge, local);
  crowd.poses.current.position[slot * 3] = at.x;
  crowd.poses.current.position[slot * 3 + 1] = at.y;
  crowd.poses.current.position[slot * 3 + 2] = at.z;
  crowd.poses.current.yaw[slot] = headingAt(edge, local);
}

/* ------------------------------------------------------------- CPU batches */

function elapsed(run: () => void): number {
  const started = performance.now();
  run();
  return performance.now() - started;
}

interface Stats { n: number; median: number; p95: number; max: number; totalMs: number }
function statsOf(values: readonly number[]): Stats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    median: sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
    max: sorted.at(-1)!,
    totalMs: values.reduce((sum, value) => sum + value, 0),
  };
}

const startedAtUtc = new Date().toISOString();
const processStarted = performance.now();

const vehiclePassages = vehiclePlan.passages;
const pedestrianPassages = pedestrianPlan.passages;
const vehicleRouteTable = vehiclePlan.routes;
const pedestrianRouteTable = pedestrianPlan.routes;
const rejectedRoutes = { vehicle: vehiclePlan.rejected, pedestrian: pedestrianPlan.rejected };

const rng = createRng(SEED);
const pedestrianEntryTicks = 90;
const vehicleEntryTicks = 45;
const pedestrians = allocate("pedestrian", PEDESTRIANS, pedestrianPassages, PEDESTRIAN_SPEED_MPS, rng, pedestrianEntryTicks, pedestrianEntryTicks);
const vehicles = allocate("vehicle", VEHICLES, vehiclePassages, VEHICLE_SPEED_MPS, rng, vehicleEntryTicks, vehicleEntryTicks);
const admissions = new JunctionAdmissions(network);

const vehicleAssetById = new Map<string, VehicleAsset>(vehicleManifest.vehicles.map(asset => [asset.id, asset]));
const upNormal = { x: 0, y: 1, z: 0 };
/**
 * A real-sized supported rectangle for one actor. A degenerate footprint has no
 * radius, so the authority cannot tell that a body which has physically entered
 * a compound is inside it, and `observe` then refuses the actor's own progress.
 * Vehicle dimensions are the delivered manifest's measured collision envelope.
 */
function sizedRectangle(kind: "vehicle" | "pedestrian", variant: number, at: { x: number; y: number; z: number }, headingRadians: number, scale: number): ActorFootprint {
  if (kind === "pedestrian") return { position: { x: at.x, y: at.y, z: at.z }, headingRadians, lengthM: 0.5 * scale, widthM: 0.5 * scale };
  const collision = vehicleAssetById.get(VEHICLE_CLASSES[variant]!)!.collision;
  return { position: { x: at.x, y: at.y, z: at.z }, headingRadians, lengthM: collision.length * scale, widthM: collision.width * scale };
}

/**
 * Real collision-envelope projection for vehicles, via the shipped
 * `projectVehicleFootprint`; the supported-rectangle path for pedestrians. A
 * vehicle envelope is projected from the actor's own displayed pose, so the
 * footprint really does move with the actor.
 */
function buildFootprint(crowd: Crowd, slot: number, at: { x: number; y: number; z: number }, heading: number): ActorFootprint {
  if (crowd.kind === "pedestrian") return sizedRectangle("pedestrian", crowd.poses.variant[slot]!, at, heading, crowd.poses.scale[slot]!);
  return projectVehicleFootprint(vehicleAssetById.get(VEHICLE_CLASSES[crowd.poses.variant[slot]!]!)!, { x: at.x, y: at.y, z: at.z }, heading, upNormal, crowd.poses.scale[slot]!);
}

interface TickCounts { requests: number; grants: number; observations: number; releases: number; retargets: number; active: number; queued: number; insideCompound: number; free: number }

let releaseSet = new Set<string>();

/**
 * The probe's own precondition on the batch, checked before the authority sees
 * it: a request must belong to the live passage at an occurrence the compound
 * owns. A failure here is a defect in this probe, not in the graph, and it names
 * the slot so the defect is one read away.
 */
function assertRequestBatchShape(crowd: Crowd, requests: readonly AdmissionRequest[]): void {
  for (const request of requests) {
    if (request.kind !== crowd.kind) continue;
    const slot = Number(request.actorId.slice(request.actorId.indexOf(":") + 1));
    const live = crowd.passages[crowd.passageIndexOf[slot]!]!;
    const index = request.routeIndex ?? request.passage.entryIndex;
    const edge = request.passage.edges[index];
    if (live !== request.passage) {
      throw new Error(`Population cost probe built an admission request for ${request.actorId} against passage ${crowd.passages.indexOf(request.passage)}, but that slot is on passage ${crowd.passageIndexOf[slot]}. The probe left a stale request behind; fix the probe before trusting any number it reports.`);
    }
    if (!edge || edge.id !== request.entryEdgeId || index < request.passage.entryIndex || index > Math.max(request.passage.entryIndex, request.passage.lastConflictIndex)) {
      throw new Error(`Population cost probe built an admission request for ${request.actorId} at route occurrence ${index} (entry ${request.passage.entryIndex}, last conflict ${request.passage.lastConflictIndex}) with entry edge ${request.entryEdgeId}; the authority would reject the batch and no measurement would be taken. Fix the probe.`);
    }
    if (index !== request.passage.entryIndex && edge.junctionId !== request.passage.junctionId) {
      throw new Error(`Population cost probe asked the authority for ${request.actorId} at route occurrence ${index}, which is an internal gap rather than an occurrence of ${request.passage.junctionId}. Fix the probe.`);
    }
  }
}

/**
 * The population substrate, in the design's tick order: integrate only the
 * motion the previous tick's grants allow, then write the dense pose buffers.
 */
function stepCrowd(crowd: Crowd, counts: TickCounts, tick: number): void {
  const buffers = crowd.poses;
  const position = buffers.current.position, previousPosition = buffers.previous.position;
  for (let slot = 0; slot < crowd.count; slot++) {
    const i = slot * 3;
    previousPosition[i] = position[i]!; previousPosition[i + 1] = position[i + 1]!; previousPosition[i + 2] = position[i + 2]!;
    buffers.previous.yaw[slot] = buffers.current.yaw[slot]!;
    buffers.previous.travelledMetres[slot] = buffers.current.travelledMetres[slot]!;
    buffers.previous.generation[slot] = buffers.current.generation[slot]!;
    if (!buffers.active[slot]) continue;

    const passage = crowd.passages[crowd.passageIndexOf[slot]!]!;
    const entryStart = entryStartOf(passage);
    // An actor waits behind the gate until it is its turn to queue, then crosses
    // only once a grant has cleared the gate. It never walks into a compound.
    const mayMove = crowd.gateCleared[slot] === 1 || tick < crowd.entryTick[slot]!;
    if (mayMove) {
      crowd.travelledM[slot] = crowd.travelledM[slot]! + crowd.speedMps[slot]! * STEP_SECONDS;
      crowd.stoppedSeconds[slot] = 0;
    } else {
      crowd.stoppedSeconds[slot] = crowd.stoppedSeconds[slot]! + STEP_SECONDS;
      // Hold on the gate itself; this is what makes stoppedSeconds a measurement.
      crowd.travelledM[slot] = Math.min(crowd.travelledM[slot]!, entryStart);
    }

    if (crowd.travelledM[slot]! >= routeTotalOf(passage)) {
      const nextIndex = (crowd.passageIndexOf[slot]! + 1) % crowd.passages.length;
      crowd.passageIndexOf[slot] = nextIndex;
      crowd.travelledM[slot] = entryStartOf(crowd.passages[nextIndex]!) - 0.5 * crowd.speedMps[slot]! * STEP_SECONDS;
      // A generation change is what makes the renderer snap instead of flying
      // across the city when a slot respawns; travelled metres stay route-absolute
      // in the new passage's own coordinate.
      buffers.current.generation[slot] = buffers.current.generation[slot]! + 1;
      buffers.previous.generation[slot] = buffers.current.generation[slot]!;
      crowd.committed[slot] = 0;
      crowd.gateCleared[slot] = 0;
      crowd.entryTick[slot] = tick + 1;
      crowd.requests[slot] = null;
      counts.retargets += 1;
    }
    alignSlot(crowd, slot);
    buffers.current.travelledMetres[slot] = crowd.travelledM[slot]!;
    buffers.speedMps[slot] = mayMove ? crowd.speedMps[slot]! : 0;
    counts.active += 1;
    if (mayMove) counts.free += 1;
    else if (crowd.committed[slot] === 1) counts.insideCompound += 1;
    else counts.queued += 1;
  }
}
/**
 * Build the admission request batch from the actors' actual measured state. The
 * `AdmissionRequest` objects are retained between ticks and their measured
 * fields rewritten, which is the design's step 2; that mutation is inside the
 * timed admission batch on purpose.
 */
function buildRequests(crowd: Crowd, counts: TickCounts): void {
  for (let slot = 0; slot < crowd.count; slot++) {
    const request = crowd.requests[slot];
    if (!request) continue;
    const passage = request.passage;
    // The request carries the occurrence the actor is actually on, not the one
    // it was created with: admission rejects a passed or skipped occurrence. An
    // actor that has not been admitted yet always asks at the planned entry
    // occurrence, which is the only one it is allowed to enter at.
    const absolute = crowd.travelledM[slot]!;
    const index = crowd.committed[slot] === 1 ? routeOccurrence(passage, absolute) : passage.entryIndex;
    if (index > passage.lastConflictIndex && crowd.committed[slot] === 1) {
      // Integration this tick carried the actor clear of the compound, so it is
      // no longer an occurrence the authority may act on.
      crowd.requests[slot] = null;
      continue;
    }
    const edge = passage.edges[index]!;
    if (crowd.committed[slot] === 1 && index !== passage.entryIndex && edge.junctionId !== passage.junctionId) {
      // Integration this tick carried the actor into a null-junction internal
      // gap. `observe` still reports progress there; `resolve` may not see it.
      crowd.requests[slot] = null;
      continue;
    }
    const local = Math.min(edge.lengthM, Math.max(0, absolute - passage.starts[index]!));
    const at = sampleEdge(edge, local);
    const heading = headingAt(edge, local);
    request.routeIndex = index;
    request.entryEdgeId = edge.id;
    request.footprint = buildFootprint(crowd, slot, at, heading);
    request.stoppedSeconds = crowd.stoppedSeconds[slot]!;
    request.yieldSatisfied = true;
    request.receivingSpace = true;
    counts.requests += 1;
  }
}

/** Decide which actors ask the authority this tick. A grant is never implied by position. */
function refreshRequestSet(crowd: Crowd, tick: number): number {
  let live = 0;
  for (let slot = 0; slot < crowd.count; slot++) {
    const passage = crowd.passages[crowd.passageIndexOf[slot]!]!;
    const travelled = crowd.travelledM[slot]!;
    const index = routeOccurrence(passage, travelled);
    // An actor asks once it has reached its gate and until it has passed the
    // last conflict occurrence; a committed actor keeps asking so the authority
    // sees it through the compound.
    const atGate = crowd.gateCleared[slot] !== 1 && tick >= crowd.entryTick[slot]! && travelled >= entryStartOf(passage);
    // A committed actor asks only on an occurrence the compound actually owns:
    // `RoutePassage` may span a null-junction internal gap, and `resolve`
    // rejects a request made at one. A first entry is always at the planned
    // entry occurrence, which the passage builder guarantees is an authority edge.
    const edge = passage.edges[index]!;
    const ownsOccurrence = index === passage.entryIndex || edge.junctionId === passage.junctionId;
    const wants = crowd.committed[slot] === 1
      ? index <= passage.lastConflictIndex && ownsOccurrence
      : atGate;
    if (!wants) { crowd.requests[slot] = null; continue; }
    const existing = crowd.requests[slot];
    if (!existing || existing.passage !== passage || existing.routeIndex !== index) {
      crowd.requests[slot] = {
        actorId: actorId(crowd, slot), kind: crowd.kind, entryEdgeId: passage.edges[index]!.id, passage,
        routeIndex: index, footprint: { position: { x: 0, y: 0, z: 0 }, headingRadians: 0, lengthM: 0, widthM: 0 },
        stoppedSeconds: crowd.stoppedSeconds[slot]!, yieldSatisfied: true, receivingSpace: true,
      };
    }
    live += 1;
  }
  return live;
}

/**
 * Drop a request that no longer belongs to the live passage. A request whose
 * passage the slot has already left cannot be re-pointed at the new one, so it
 * is discarded rather than being handed to the authority against the wrong route.
 */
function dropStaleRequest(crowd: Crowd, slot: number): void {
  const request = crowd.requests[slot];
  if (request && crowd.passages[crowd.passageIndexOf[slot]!] !== request.passage) crowd.requests[slot] = null;
}

/**
 * One real observation per committed actor per tick, which the contract requires
 * and which is also what releases the actor. A footprint here is a supported
 * rectangle at the actor's own position, built inline rather than retained.
 */
function observeCrowd(crowd: Crowd, counts: TickCounts, tick: number): void {
  assert(Number.isInteger(tick), "Observation needs the tick it belongs to.");
  for (let slot = 0; slot < crowd.count; slot++) {
    dropStaleRequest(crowd, slot);
    if (crowd.committed[slot] !== 1) continue;
    const passage = crowd.passages[crowd.passageIndexOf[slot]!]!;
    const travelled = Math.max(0, Math.min(crowd.travelledM[slot]!, routeTotalOf(passage) - 1e-9));
    const index = routeOccurrence(passage, travelled);
    const edge = passage.edges[index]!;
    const local = Math.min(edge.lengthM, travelled - passage.starts[index]!);
    const at = sampleEdge(edge, local);
    counts.observations += 1;
    if (admissions.observe(actorId(crowd, slot), {
      routeIndex: index, distanceM: local,
      footprint: sizedRectangle(crowd.kind, crowd.poses.variant[slot]!, at, headingAt(edge, local), crowd.poses.scale[slot]!),
    })) {
      crowd.committed[slot] = 0;
      counts.releases += 1;
    }
  }
}

/* ---------------------------------------------- real three.js draw artifacts */

interface DrawLevel { readonly id: "near" | "medium" | "far"; readonly parts: InstancedMesh[]; readonly capacity: number; count: number; readonly motion: MotionAttribute; readonly strideMetres: number; readonly idleSeconds: number }

class MotionAttribute {
  readonly array: Float32Array;
  constructor(count: number) { this.array = new Float32Array(count * 3); }
  setXYZ(index: number, x: number, y: number, z: number): void {
    const offset = index * 3;
    this.array[offset] = x; this.array[offset + 1] = y; this.array[offset + 2] = z;
  }
}

function makeInstanced(parts: number, capacity: number, label: string): InstancedMesh[] {
  const meshes: InstancedMesh[] = [];
  for (let part = 0; part < parts; part++) {
    // Real InstancedMesh, real instanceMatrix BufferAttribute; only the GPU
    // upload needs a renderer and is therefore absent.
    const mesh = new InstancedMesh(undefined, undefined, capacity);
    mesh.name = `${label}-part${part}`;
    mesh.frustumCulled = false;
    mesh.count = 0;
    meshes.push(mesh);
  }
  return meshes;
}

function makeLevel(id: "near" | "medium" | "far", parts: number, capacity: number): DrawLevel {
  return { id, parts: makeInstanced(parts, capacity, `pedestrian-${id}`), capacity, count: 0, motion: new MotionAttribute(capacity), strideMetres: cadence.strideMetres, idleSeconds: cadence.idleSeconds };
}
const nearLevel = makeLevel("near", nearParts, NEAR_INSTANCES);
const mediumLevel = makeLevel("medium", mediumParts, MEDIUM_INSTANCES);
const farLevel = makeLevel("far", farParts, PEDESTRIANS);
const humanLevels = [nearLevel, mediumLevel, farLevel];
const vehicleInstances = makeInstanced(maxVehiclePrimitives, VEHICLES, "vehicle");

const scratchMatrix = new Matrix4();
const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 2000);
camera.position.set(0, 1.6, 0);
camera.updateMatrixWorld(true);
const cameraPosition = camera.position;

interface CompositionCounts { poseMatrixWrites: number; setMatrixCalls: number; motionWrites: number; near: number; medium: number; far: number; ticks: number }

/**
 * The real `HumanRenderer.update` per-slot body: `writePoseMatrix` once, the
 * distance LOD selection, one motion-attribute write, and `setMatrixAt` once per
 * draw part. The per-level budgets demote rather than drop, so the rendered
 * instance count never falls below the active population.
 */
function composeHumans(alpha: number, elapsedSeconds: number, counts: CompositionCounts): void {
  for (const level of humanLevels) level.count = 0;
  const buffers = pedestrians.poses;
  for (let slot = 0; slot < buffers.count; slot++) {
    if (!buffers.active[slot]) continue;
    const travelled = writePoseMatrix(buffers, slot, alpha, scratchMatrix);
    counts.poseMatrixWrites += 1;
    const elements = scratchMatrix.elements;
    const distanceSquared = (elements[12]! - cameraPosition.x) ** 2 + (elements[13]! - cameraPosition.y) ** 2 + (elements[14]! - cameraPosition.z) ** 2;
    let level = humanLevels[distanceSquared < NEAR_THRESHOLD_M ** 2 ? 0 : distanceSquared < MEDIUM_THRESHOLD_M ** 2 ? 1 : 2]!;
    if (level.count >= level.capacity) level = level === nearLevel ? mediumLevel : farLevel;
    if (level.count >= level.capacity) level = farLevel;
    const instance = level.count++;
    const stride = level.strideMetres * buffers.scale[slot]!;
    level.motion.setXYZ(instance, (travelled / stride) % 1, (elapsedSeconds / level.idleSeconds + slot * 0.61803398875) % 1, Math.min(1, buffers.speedMps[slot]! / 0.2));
    counts.motionWrites += 1;
    for (const part of level.parts) { part.setMatrixAt(instance, scratchMatrix); counts.setMatrixCalls += 1; }
  }
  counts.near += nearLevel.count; counts.medium += mediumLevel.count; counts.far += farLevel.count;
  counts.ticks += 1;
}

/** The real `VehicleRenderer.update` core: one `writePoseMatrix` and one `setMatrixAt` per draw part. */
function composeVehicles(alpha: number, counts: CompositionCounts): void {
  const buffers = vehicles.poses;
  for (let slot = 0; slot < buffers.count; slot++) {
    if (!buffers.active[slot]) continue;
    writePoseMatrix(buffers, slot, alpha, scratchMatrix);
    counts.poseMatrixWrites += 1;
    for (const part of vehicleInstances) { part.setMatrixAt(slot, scratchMatrix); counts.setMatrixCalls += 1; }
  }
}

/* -------------------------------------------------------------- the ticks */

const digest = createHash("sha256");
const measured: { tick: number; simulation: number; admission: number; poseComposition: number; sameTickTotal: number }[] = [];
const tickCounts: TickCounts[] = [];
const compositionCounts: CompositionCounts = { poseMatrixWrites: 0, setMatrixCalls: 0, motionWrites: 0, near: 0, medium: 0, far: 0, ticks: 0 };
let renderNoops = 0;
let pendingTick = 0;
let lastCompleteTick = 0;
let stage = "setup";
const loop = new RenderLoop({ render: () => { renderNoops += 1; } });

const unregister = loop.onFixedStep((step, simulatedSeconds) => {
  assert.equal(step, STEP_SECONDS, "The fixed step must be exactly 1/60 s.");
  const tick = ++pendingTick;
  const warm = tick <= WARMUP_TICKS;
  const tickStarted = performance.now();
  const counts: TickCounts = { requests: 0, grants: 0, observations: 0, releases: 0, retargets: 0, active: 0, queued: 0, insideCompound: 0, free: 0 };

  stage = "simulation";
  const simulation = elapsed(() => {
    stepCrowd(pedestrians, counts, tick);
    stepCrowd(vehicles, counts, tick);
  });
  releaseSet = new Set<string>();

  stage = "admission";
  const admission = elapsed(() => {
    for (const crowd of [pedestrians, vehicles]) buildRequests(crowd, counts);
    const requests: AdmissionRequest[] = [];
    for (const crowd of [pedestrians, vehicles]) for (const request of crowd.requests) if (request) requests.push(request);
    for (const crowd of [pedestrians, vehicles]) assertRequestBatchShape(crowd, requests);
    // `resolve` validates the whole batch before it mutates anything, so a probe
    // defect throws here and the batch is not silently half-applied. The probe
    // keeps every request it hands over inside the shape `resolve` documents:
    // live passage, an occurrence the compound owns, and a measured footprint.
    const granted = admissions.resolve(STEP_SECONDS, requests);
    counts.grants = granted.length;
    const grantedSet = new Set(granted);
    for (const crowd of [pedestrians, vehicles]) {
      for (let slot = 0; slot < crowd.count; slot++) {
        const request = crowd.requests[slot];
        if (!request || !grantedSet.has(request.actorId)) continue;
        // A grant is the only way an actor becomes committed to a compound.
        releaseSet.add(request.actorId);
        crowd.committed[slot] = 1;
        crowd.gateCleared[slot] = 1;
      }
    }
    observeCrowd(pedestrians, counts, tick);
    observeCrowd(vehicles, counts, tick);
  });

  stage = "poseComposition";
  const poseComposition = elapsed(() => {
    composeHumans(0.5, simulatedSeconds, compositionCounts);
    composeVehicles(0.5, compositionCounts);
  });

  const sameTickTotal = performance.now() - tickStarted;
  tickCounts.push(counts);
  if (!warm) {
    measured.push({ tick, simulation, admission, poseComposition, sameTickTotal });
    const position = pedestrians.poses.current.position;
    const yaw = pedestrians.poses.current.yaw;
    const generation = pedestrians.poses.current.generation;
    digest.update(new Uint8Array(position.buffer, position.byteOffset, position.byteLength));
    digest.update(new Uint8Array(yaw.buffer, yaw.byteOffset, yaw.byteLength));
    digest.update(new Uint8Array(generation.buffer, generation.byteOffset, generation.byteLength));
  }
  lastCompleteTick = tick;
});

/**
 * Control, not part of the measured table: the same 3,000-slot composition with
 * the camera moved to the crowd's own centroid, which saturates the near and
 * medium instance budgets. It bounds how much more the setMatrixAt loop can cost
 * than the anchor-camera run does. It re-composes poses that were already
 * composed, so its timings are the composition cost and nothing else.
 */
function measuredControl(passes: number): { passMs: Stats | null; near: number; medium: number; far: number } {
  const position = pedestrians.poses.current.position;
  let sumX = 0, sumZ = 0, active = 0;
  for (let slot = 0; slot < pedestrians.count; slot++) {
    if (!pedestrians.poses.active[slot]) continue;
    sumX += position[slot * 3]!; sumZ += position[slot * 3 + 2]!; active += 1;
  }
  cameraPosition.set(active ? sumX / active : 0, 1.6, active ? sumZ / active : 0);
  camera.updateMatrixWorld(true);
  const before = { near: compositionCounts.near, medium: compositionCounts.medium, far: compositionCounts.far, ticks: compositionCounts.ticks };
  const samples: number[] = [];
  for (let pass = 0; pass < passes; pass++) samples.push(elapsed(() => composeHumans(0.5, 12 * STEP_SECONDS, compositionCounts)));
  const drawn = compositionCounts.ticks - before.ticks;
  const control = {
    passMs: statsOf(samples),
    near: drawn ? round((compositionCounts.near - before.near) / drawn) : 0,
    medium: drawn ? round((compositionCounts.medium - before.medium) / drawn) : 0,
    far: drawn ? round((compositionCounts.far - before.far) / drawn) : 0,
  };
  cameraPosition.set(0, 1.6, 0);
  camera.updateMatrixWorld(true);
  return control;
}

const failures: string[] = [];
let runWindowMs = 0;
let nearBudgetControl: { passMs: Stats | null; near: number; medium: number; far: number } | null = null;
try {
  let nextEntryTick = 1;
  refreshRequestSet(pedestrians, nextEntryTick);
  refreshRequestSet(vehicles, nextEntryTick);
  const runStarted = performance.now();
  for (let tick = 1; tick <= WARMUP_TICKS + MEASURED_TICKS; tick++) {
    refreshRequestSet(pedestrians, tick);
    refreshRequestSet(vehicles, tick);
    const before = lastCompleteTick;
    loop.advance(tick * STEP_SECONDS * 1000 + 0.001);
    assert.equal(lastCompleteTick, before + 1, `Fixed step ${tick} did not run exactly once.`);
  }
  runWindowMs = performance.now() - runStarted;
  // Only meaningful once the population has actually moved and posed.
  if (!failures.length) nearBudgetControl = measuredControl(30);
} catch (error) {
  failures.push(`${stage}: ${(error as Error).message}`);
}
unregister();
loop.stop();

const finalDigest = digest.digest("hex");
const totals = tickCounts.reduce((sum, counts) => ({
  requests: sum.requests + counts.requests, grants: sum.grants + counts.grants, observations: sum.observations + counts.observations,
  releases: sum.releases + counts.releases, retargets: sum.retargets + counts.retargets, active: sum.active + counts.active,
  queued: sum.queued + counts.queued, insideCompound: sum.insideCompound + counts.insideCompound, free: sum.free + counts.free,
}), { requests: 0, grants: 0, observations: 0, releases: 0, retargets: 0, active: 0, queued: 0, insideCompound: 0, free: 0 });
const measuredTotals = tickCounts.slice(WARMUP_TICKS);

const statistics = {
  simulationMs: statsOf(measured.map(t => t.simulation)),
  admissionMs: statsOf(measured.map(t => t.admission)),
  poseCompositionMs: statsOf(measured.map(t => t.poseComposition)),
  sameTickTotalMs: statsOf(measured.map(t => t.sameTickTotal)),
};
const drawSet = {
  humanLodShape, vehicleShapes, nearParts, mediumParts, farParts, maxVehiclePrimitives,
  partsPerHumanLod: Object.fromEntries(humanLodShape.map(row => [`${row.id}/${row.lod}`, row.primitives])),
};
const composition = {
  poseMatrixWrites: compositionCounts.poseMatrixWrites,
  setMatrixCalls: compositionCounts.setMatrixCalls,
  motionWrites: compositionCounts.motionWrites,
  meanNearInstances: compositionCounts.ticks ? round(compositionCounts.near / compositionCounts.ticks) : null,
  meanMediumInstances: compositionCounts.ticks ? round(compositionCounts.medium / compositionCounts.ticks) : null,
  meanFarInstances: compositionCounts.ticks ? round(compositionCounts.far / compositionCounts.ticks) : null,
  meanSetMatrixCallsPerTick: compositionCounts.ticks ? Math.round(compositionCounts.setMatrixCalls / compositionCounts.ticks) : null,
};
const advanced = failures.length === 0
  && measured.length === MEASURED_TICKS
  && totals.requests > 0
  && totals.grants > 0
  && totals.observations > 0
  && totals.retargets > 0
  && finalDigest !== createHash("sha256").digest("hex");

const result = {
  probe: "tools/agents/population-cost.ts",
  startedAtUtc, elapsedMs: Math.round(performance.now() - processStarted), runWindowMs: round(runWindowMs),
  command, outDir: OUT_DIR, outDirSource: OUT.source,
  seed: SEED,
  seedSource: process.env.POPULATION_COST_SEED === undefined ? `DEFAULT_SEED (${DEFAULT_SEED})` : "POPULATION_COST_SEED",
  bound: {
    pedestrians: PEDESTRIANS, vehicles: VEHICLES, stepSeconds: STEP_SECONDS, warmupTicks: WARMUP_TICKS, measuredTicks: MEASURED_TICKS,
    nearInstances: NEAR_INSTANCES, mediumInstances: MEDIUM_INSTANCES, nearThresholdM: NEAR_THRESHOLD_M, mediumThresholdM: MEDIUM_THRESHOLD_M,
  },
  machine: {
    cpuModels: [...new Set(os.cpus().map(cpu => cpu.model))], logicalCpus: os.cpus().length, availableParallelism: os.availableParallelism(),
    platform: process.platform, arch: process.arch, release: os.release(), totalMemoryBytes: os.totalmem(), node: process.version,
  },
  inputs: {
    network: { path: "data/network/network.json", sha256: sha256(networkBytes), nodes: network.nodes.length, lanes: network.lanes.length, walks: network.walks.length, junctions: network.junctions.length },
    humanManifests: humanManifests.map(({ id, sha256: sha }) => ({ id, sha256: sha })),
    vehicleManifest: { path: "data/scene/agents/vehicles.json", sha256: sha256(vehicleManifestBytes) },
  },
  graph: {
    vehicleEntryPortals: network.portals.vehicleEntry.length, vehicleExitPortals: network.portals.vehicleExit.length, pedestrianPortals: network.portals.pedestrian.length,
    vehicleRoutesPlanned: vehicleRouteTable.length, pedestrianRoutesPlanned: pedestrianRouteTable.length,
    vehicleRoutesRejectedByPassageBuilder: rejectedRoutes.vehicle.length, pedestrianRoutesRejectedByPassageBuilder: rejectedRoutes.pedestrian.length,
    vehicleRoutesRejectedSample: rejectedRoutes.vehicle.slice(0, 3), pedestrianRoutesRejectedSample: rejectedRoutes.pedestrian.slice(0, 3),
    vehiclePassagesBuilt: vehiclePassages.length, pedestrianPassagesBuilt: pedestrianPassages.length,
    vehicleMeanCompoundsPerRoute: round(vehicleRouteTable.reduce((sum, route) => sum + route.compounds, 0) / vehicleRouteTable.length),
    pedestrianMeanCompoundsPerRoute: round(pedestrianRouteTable.reduce((sum, route) => sum + route.compounds, 0) / pedestrianRouteTable.length),
    vehicleMaxCompoundsPerRoute: Math.max(...vehicleRouteTable.map(route => route.compounds)),
    pedestrianMaxCompoundsPerRoute: Math.max(...pedestrianRouteTable.map(route => route.compounds)),
    junctions: network.junctions.length, signalJunctions: network.junctions.filter(junction => junction.controlKind === "signal").length,
    reservationJunctions: network.junctions.filter(junction => junction.controlKind === "reservation").length,
    distinctPassagesSeenByAuthority: new Set([...vehiclePassages, ...pedestrianPassages]).size,
  },
  drawSet, statistics, composition, nearBudgetControl,
  measuredTickCounts: {
    requests: statsOf(measuredTotals.map(counts => counts.requests)),
    grants: statsOf(measuredTotals.map(counts => counts.grants)),
    observations: statsOf(measuredTotals.map(counts => counts.observations)),
    releases: statsOf(measuredTotals.map(counts => counts.releases)),
    active: statsOf(measuredTotals.map(counts => counts.active)),
    queued: statsOf(measuredTotals.map(counts => counts.queued)),
    insideCompound: statsOf(measuredTotals.map(counts => counts.insideCompound)),
    free: statsOf(measuredTotals.map(counts => counts.free)),
    queueRatio: statsOf(measuredTotals.map(counts => counts.active ? counts.queued / counts.active : 0)),
  },
  totals,
  digest: {
    algorithm: "sha256 over the measured ticks' final pedestrian current position (float32), yaw (float32) and generation (uint32) bytes",
    finalMeasuredState: finalDigest, advanced, lastCompleteTick, renderNoops,
    commitmentsOutstanding: admissions.snapshot().length, signalControllers: admissions.signalSnapshot().length,
  },
  failures,
  measuredTicks: measured.map((tick, index) => ({ ...tick, requests: measuredTotals[index]!.requests, grants: measuredTotals[index]!.grants, observations: measuredTotals[index]!.observations, releases: measuredTotals[index]!.releases })),
};

writeFileSync(resolve(OUT_DIR, "raw.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });

const line = (label: string, stats: Stats | null): string =>
  stats ? `${label} median=${round(stats.median)}ms p95=${round(stats.p95)}ms max=${round(stats.max)}ms n=${stats.n}` : `${label} none`;

/**
 * The retained evidence: a human-readable log and a machine-readable summary,
 * written by `fs` rather than shell redirection so the run cannot lose its own
 * output. All three files are created exclusively, so this probe never
 * overwrites a previous run's evidence even if one appears after the pre-flight
 * check above; the check is what turns that collision into a message before a
 * minute of measurement rather than an `EEXIST` after it.
 */
const summary = {
  probe: result.probe, command, outDir: OUT_DIR, outDirSource: OUT.source, startedAtUtc, seed: SEED, seedSource: result.seedSource,
  frameIntervalMs: round(STEP_SECONDS * 1000),
  machine: result.machine, bound: result.bound,
  inputSha256: { network: sha256(networkBytes), vehicleManifest: sha256(vehicleManifestBytes), humanManifests: humanManifests.map(({ id, sha256: sha }) => ({ id, sha256: sha })) },
  graph: result.graph, drawSet: { nearParts, mediumParts, farParts, maxVehiclePrimitives, vehicleShapes },
  statistics, composition, nearBudgetControl,
  measuredTickCounts: result.measuredTickCounts, totals,
  digest: result.digest, failures, advanced,
  insideFrameInterval: statistics.sameTickTotalMs ? statistics.sameTickTotalMs.p95 < STEP_SECONDS * 1000 : null,
  verdictScope: "CPU populations only: the probe's own per-actor substrate plus the real admission authority plus the real pose composition path. No GPU, no rendering, no motion model.",
};
writeFileSync(resolve(OUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });

const log = [
  `Population cost probe - ${result.probe}`,
  `command: ${command}`,
  `output: ${OUT_DIR} (from ${OUT.source})`,
  `started: ${startedAtUtc}`,
  `seed: ${SEED} (${result.seedSource})   frame interval: ${round(STEP_SECONDS * 1000)} ms   warmup ticks: ${WARMUP_TICKS}   measured ticks: ${MEASURED_TICKS}`,
  `machine: ${result.machine.cpuModels.join(", ")}; ${result.machine.logicalCpus} logical CPUs; ${result.machine.platform} ${result.machine.release} ${result.machine.arch}; Node ${result.machine.node}; ${result.machine.totalMemoryBytes} bytes memory`,
  `inputs: network.json ${sha256(networkBytes)}; vehicles.json ${sha256(vehicleManifestBytes)}`,
  `bound: ${PEDESTRIANS} pedestrian slots + ${VEHICLES} vehicle slots at exactly 1/${Math.round(1 / STEP_SECONDS)} s per tick`,
  "",
  "Measured batch wall time, milliseconds",
  line("  simulation      ", statistics.simulationMs),
  line("  admission       ", statistics.admissionMs),
  line("  poseComposition ", statistics.poseCompositionMs),
  line("  sameTickTotal   ", statistics.sameTickTotalMs),
  "",
  `per-tick requests   ${JSON.stringify(result.measuredTickCounts.requests)}`,
  `per-tick grants     ${JSON.stringify(result.measuredTickCounts.grants)}`,
  `per-tick queued     ${JSON.stringify(result.measuredTickCounts.queued)}`,
  `per-tick free       ${JSON.stringify(result.measuredTickCounts.free)}`,
  "",
  `composition: ${JSON.stringify(composition)}`,
  `near-budget control: ${JSON.stringify(nearBudgetControl)}`,
  `digest: ${finalDigest}   advanced: ${advanced}   completed ticks: ${lastCompleteTick}`,
  `failures: ${failures.length ? failures.join(" | ") : "none"}`,
  "",
].join("\n");
writeFileSync(resolve(OUT_DIR, "probe-output.txt"), log, { flag: "wx" });

console.log(log);
console.log(JSON.stringify({
  seed: SEED, outDir: OUT_DIR, command, completedTicks: lastCompleteTick, elapsedMs: result.elapsedMs, failures,
  simulation: line("simulation", statistics.simulationMs),
  admission: line("admission", statistics.admissionMs),
  poseComposition: line("poseComposition", statistics.poseCompositionMs),
  sameTickTotal: line("sameTickTotal", statistics.sameTickTotalMs),
  totals, composition, advanced, finalDigest,
}, null, 2));
