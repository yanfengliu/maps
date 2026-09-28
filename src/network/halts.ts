import type { NetworkData, NetworkEdge } from "../world/network-data.ts";
import { createRoutePassage, type ActorKind, type RouteControl, type RoutePassage } from "./passages.ts";
import { isCurrentHaltAuthorityView, type HaltAuthorityView } from "./admissions.ts";

/** Immutable body-specific first approach; source passage/gate identities stay intact. */
export interface ApproachHalt { readonly entryIndex:number; readonly distanceM:number; readonly sourceGateDistanceM:number; readonly originRadiusM:number }

/** Body-specific final visit only; source passage identity and end remain unchanged. */
export interface VehicleFinalRelease { readonly passage:RoutePassage; readonly distanceM:number }

/** Logical route progress only. Body projection and movement remain caller policies. */
export interface HaltRoute {
  readonly approachHalts?:readonly ApproachHalt[];
  readonly vehicleFinalRelease?:VehicleFinalRelease;
  readonly edges: readonly NetworkEdge[];
  readonly starts: readonly number[];
  readonly passages: readonly RoutePassage[];
}
export interface AdmissionHalt { readonly passage: RoutePassage; readonly entryIndex: number; readonly distanceM: number }
export interface ControlHalt { readonly passage: RoutePassage; readonly control: RouteControl; readonly distanceM: number }

/** Preserve complete source order and let the real factory define each visit window. */
export function createRouteVisits(network: NetworkData, kind: ActorKind, edgeIds: readonly string[]): readonly RoutePassage[] {
  const edges = new Map((kind === "vehicle" ? network.lanes : network.walks).map(edge => [edge.id, edge]));
  const visits: RoutePassage[] = [];
  for (let index = 0; index < edgeIds.length; index++) {
    const edge = edges.get(edgeIds[index]!);
    if (!edge) throw new Error(`Route occurrence ${index} names missing ${kind} edge ${edgeIds[index]}.`);
    if (index > 0 && !edges.get(edgeIds[index - 1]!)!.nextIds.includes(edge.id)) throw new Error(`Route occurrence ${index} jumps to ${edge.id}; retain legal source nextIds.`);
    const previous = visits.at(-1);
    if (!edge.junctionId || previous && edge.junctionId === previous.junctionId && index <= previous.lastConflictIndex) continue;
    visits.push(createRoutePassage(network, kind, edgeIds, index));
  }
  return Object.freeze(visits);
}

/** Exact visits, including a retained boundary prefix, never owner-name equality. */
export function passageCovers(held: RoutePassage, visit: RoutePassage): boolean {
  return held === visit || held.boundaryEntry && held.lastConflictIndex >= 0 &&
    held.junctionId === visit.junctionId && held.entryIndex <= visit.entryIndex && held.lastConflictIndex >= visit.lastConflictIndex &&
    held.edges.length === visit.edges.length && held.edges.every((edge, i) => edge === visit.edges[i]);
}

/** One obligation per factory visit/control. Used by complete planning and the live query. */
export function routeHaltObligations(route: HaltRoute, radiusM: number, held?: RoutePassage, completedThroughIndex = -1,
  unclearedControls: readonly RouteControl[] = held?.controls ?? []) {
  const admissions: AdmissionHalt[] = [], controls: ControlHalt[] = [];
  if (held) for (const control of unclearedControls) controls.push(Object.freeze({ passage: held, control, distanceM: held.starts[control.routeIndex]! + control.distanceM - radiusM }));
  for (const passage of route.passages) {
    if (passage.lastConflictIndex <= completedThroughIndex || held && passageCovers(held, passage)) continue;
    admissions.push(Object.freeze({ passage, entryIndex: passage.entryIndex, distanceM: route.approachHalts?.find(h=>h.entryIndex===passage.entryIndex)?.distanceM ?? passage.starts[passage.entryIndex]! - radiusM }));
    for (const control of passage.controls) controls.push(Object.freeze({ passage, control, distanceM: passage.starts[control.routeIndex]! + control.distanceM - radiusM }));
  }
  return { admissions, controls };
}

/** No mutation, inferred clearance or backwards correction: a missed obligation is a refusal. */
export function queryRouteHalts(input: { route: HaltRoute; actorId: string; generation: number; progressM: number; radiusM: number; authority?: HaltAuthorityView | null }) {
  const { route, actorId, generation, progressM, radiusM } = input;
  if (!Number.isFinite(progressM) || progressM < 0 || !Number.isFinite(radiusM) || radiusM <= 0) throw new Error(`Halt query for ${actorId} needs finite nonnegative progress and a positive authority radius.`);
  const supplied = input.authority;
  const authority = supplied && supplied.actorId === actorId && supplied.routeIdentity === route && supplied.generation === generation && isCurrentHaltAuthorityView(supplied) ? supplied : null;
  const obligations = routeHaltObligations(route, radiusM, authority?.held?.passage, authority?.completedThroughIndex ?? -1, authority?.held?.unclearedControls);
  const admission = obligations.admissions[0] ?? null;
  const control = obligations.controls.reduce<ControlHalt | null>((nearest, candidate) => !nearest || candidate.distanceM < nearest.distanceM ? candidate : nearest, null);
  const missed = [admission, control].find(halt => halt && halt.distanceM < progressM - 1e-6);
  const refusal = missed ? `Actor ${actorId} passed uncleared ${"control" in missed ? `mapped ${missed.control.rule} node/${missed.control.nodeIds.join(",")}` : "admission"} at route occurrence ${"control" in missed ? missed.control.routeIndex : missed.entryIndex}; stop and restore valid authority before advancing.` : null;
  return Object.freeze({ admission, control, refusal, stopDistanceM: refusal ? progressM : Math.max(0, Math.min(admission?.distanceM ?? Infinity, control?.distanceM ?? Infinity)) });
}
