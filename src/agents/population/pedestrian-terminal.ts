import { footprintOccupies, type ActorFootprint } from "../../network/footprints.ts";
import { headingAt, sampleEdge } from "../../network/geometry.ts";
import type { NetworkData, NetworkEdge } from "../../world/network-data.ts";
import type { MovementGraph } from "./graph.ts";

/** Under 1 km from zero, float32 position/yaw rounding moves this body's hull by less than 0.1 mm. */
const TERMINAL_POSE_CLEARANCE_M = 0.0001;

/**
 * The terminal sample keeps its source tangent and seeded right offset. This
 * rectangle contains the actual square body at every allowed right offset,
 * including zero. A null junction ID does not imply physical clearance.
 */
export function pedestrianTerminalEnvelope(edge: NetworkEdge, radiusM: number): ActorFootprint {
  const at = sampleEdge(edge, edge.lengthM);
  const heading = headingAt(edge, edge.lengthM);
  const room = Math.max(0, (edge.widthM - 2 * radiusM) / 2);
  return {
    position: { x: at.x + Math.cos(heading) * room / 2, y: at.y, z: at.z - Math.sin(heading) * room / 2 },
    headingRadians: heading,
    lengthM: 2 * radiusM + 2 * TERMINAL_POSE_CLEARANCE_M,
    widthM: room + 2 * radiusM + 2 * TERMINAL_POSE_CLEARANCE_M,
  };
}

export function pedestrianTerminalIsClear(network: Pick<NetworkData, "junctions">, edge: NetworkEdge, radiusM: number): boolean {
  if (edge.junctionId !== null) return false;
  const envelope = pedestrianTerminalEnvelope(edge, radiusM);
  return !network.junctions.some(junction => footprintOccupies(junction, envelope));
}

/**
 * Preserve the chosen central route and append the shortest directed tail whose
 * terminal body envelope clears every original conflict disk. The search draws
 * no randomness and keeps the caller's complete-route length/edge budgets.
 * Cost/depth Pareto records keep a shorter but deeper path from hiding a legal
 * shallower path. Positive or zero-length cycles cannot improve those records.
 */
export function clearPedestrianTerminal(
  network: Pick<NetworkData, "junctions">,
  graph: Pick<MovementGraph, "edge" | "next">,
  prefix: readonly string[],
  radiusM: number,
  maxEdges: number,
  maxLengthM: number,
  viable?: (edgeId: string) => boolean,
): readonly string[] | null {
  const last = prefix.at(-1);
  if (last === undefined) return null;
  if (viable && prefix.some(id => !viable(id))) return null;
  const prefixLength = prefix.reduce((total, id) => total + graph.edge(id).lengthM, 0);
  if (prefix.length > maxEdges || prefixLength > maxLengthM + 1e-9) return null;
  if (pedestrianTerminalIsClear(network, graph.edge(last), radiusM)) return prefix;
  type Candidate = { ids: string[]; lengthM: number };
  const queue: Candidate[] = [];
  const costs = new Map<string, { depth: number; lengthM: number }[]>();
  const add = (ids: string[], lengthM: number): void => {
    if (prefix.length + ids.length > maxEdges || prefixLength + lengthM > maxLengthM + 1e-9) return;
    const id = ids.at(-1)!;
    if (viable && !viable(id)) return;
    const previous = costs.get(id) ?? [];
    if (previous.some(value => value.depth <= ids.length && value.lengthM <= lengthM)) return;
    costs.set(id, [...previous.filter(value => value.depth < ids.length || value.lengthM < lengthM), { depth: ids.length, lengthM }]);
    queue.push({ ids, lengthM });
  };
  for (const id of [...graph.next(last)].sort()) add([id], graph.edge(id).lengthM);
  while (queue.length) {
    queue.sort((a, b) => a.lengthM - b.lengthM || a.ids.join("\0").localeCompare(b.ids.join("\0")));
    const candidate = queue.shift()!;
    const id = candidate.ids.at(-1)!;
    if (pedestrianTerminalIsClear(network, graph.edge(id), radiusM)) return [...prefix, ...candidate.ids];
    for (const next of [...graph.next(id)].sort()) add([...candidate.ids, next], candidate.lengthM + graph.edge(next).lengthM);
  }
  return null;
}
