/**
 * harness: reads a V8 `.cpuprofile` and aggregates self time by call path, with
 * the total under a named ancestor. A reading aid for `node --cpu-prof`.
 *
 * `cpuprofile-top.ts` answers "which function is hot". This answers the next
 * question, which decides whether a hot function is worth fixing: "hot under
 * what". `buildPassage` is expensive exactly once per route plan, so its total
 * says nothing until it is divided by the ticks it was spread over; a per-tick
 * query that is cheaper but runs 3,000 times a tick is the one that costs the
 * frame. Self time in that subtree is what a fix there removes.
 *
 * RUN IT:
 *
 *   node tools/frame-budget/cpuprofile-subtree.ts <file.cpuprofile> [ticks] [count]
 *
 * `ticks` is the number of fixed steps the profile covers, so the report can give
 * milliseconds per tick beside the total. Pass 0 to omit that column.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/frame-budget/cpuprofile-subtree.ts <file.cpuprofile> [ticks] [count]");
const ticks = Number(process.argv[3] ?? 0);
const limit = Number(process.argv[4] ?? 20);

const profile = JSON.parse(readFileSync(file, "utf8")) as {
  nodes: {
    id: number;
    callFrame: { functionName: string; url: string; lineNumber: number };
    children?: number[];
    parent?: number;
  }[];
  samples: number[];
  timeDeltas: number[];
};

interface Node {
  id: number;
  name: string;
  where: string;
  parent: number | null;
  children: number[];
  selfMs: number;
}

const nodes = new Map<number, Node>();
for (const raw of profile.nodes) {
  const url = raw.callFrame.url ?? "";
  const short = url.includes("/maps/") ? url.slice(url.indexOf("/maps/") + 6) : basename(url);
  nodes.set(raw.id, {
    id: raw.id,
    name: raw.callFrame.functionName || "(anonymous)",
    where: `${short}:${raw.callFrame.lineNumber + 1}`,
    parent: null,
    children: raw.children ?? [],
    selfMs: 0,
  });
}
for (const raw of profile.nodes) {
  for (const child of raw.children ?? []) {
    const node = nodes.get(child);
    if (node) node.parent = raw.id;
  }
}

let sampledMs = 0;
for (let index = 0; index < profile.samples.length; index += 1) {
  const node = nodes.get(profile.samples[index]!);
  const delta = (profile.timeDeltas[index] ?? 0) / 1000;
  sampledMs += delta;
  if (node) node.selfMs += delta;
}

/**
 * The ancestors of a sampled frame, root first. V8 emits one node per call path,
 * so a function reachable two ways has two nodes and both are reported; that is
 * the point, because the two paths have different fixes.
 */
function pathOf(node: Node): Node[] {
  const path: Node[] = [];
  let current: Node | undefined = node;
  const guard = new Set<number>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = current.parent === null ? undefined : nodes.get(current.parent);
  }
  return path;
}

/** Self time under each named ancestor, so setup and per-tick work separate. */
const INTERESTING = ["update", "stepPedestrians", "assembleRequests", "integrate", "lifecycle", "planSlot", "plan", "resolve", "observeCommitted"];

const roots: { name: string; where: string; selfMs: number; subtreeMs: number; calls: number; selfId: number }[] = [];
for (const node of nodes.values()) {
  if (!INTERESTING.includes(node.name)) continue;
  const path = pathOf(node);
  // Keep the shallowest occurrence: a nested `plan` inside `lifecycle` is already
  // inside the `lifecycle` entry, and counting it twice would double its cost.
  if (path.slice(0, -1).some((ancestor) => INTERESTING.includes(ancestor.name))) continue;
  let subtreeMs = 0;
  let calls = 0;
  const stack = [node.id];
  const seen = new Set<number>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const current = nodes.get(id)!;
    subtreeMs += current.selfMs;
    calls += 1;
    for (const child of current.children) stack.push(child);
  }
  roots.push({ name: node.name, where: node.where, selfMs: node.selfMs, subtreeMs, calls, selfId: node.id });
}
roots.sort((a, b) => b.subtreeMs - a.subtreeMs);

const perTick = (ms: number): string => (ticks > 0 ? `${Math.round((ms / ticks) * 1000) / 1000}`.padStart(8) : "       -");

console.log(`${file}: ${Math.round(sampledMs)} ms sampled${ticks > 0 ? ` over ${ticks} ticks` : ""}\n`);
console.log(`${"entry".padEnd(20)} ${"self".padStart(9)} ${ticks > 0 ? "ms/tick".padStart(8) : ""} ${"subtree".padStart(9)} ${ticks > 0 ? "ms/tick".padStart(8) : ""}  where`);
for (const root of roots.slice(0, limit)) {
  console.log(
    `${root.name.padEnd(20)} ${String(Math.round(root.selfMs * 10) / 10).padStart(9)} ${perTick(root.selfMs)} ${String(Math.round(root.subtreeMs * 10) / 10).padStart(9)} ${perTick(root.subtreeMs)}  ${root.where}`,
  );
}

/** The heaviest leaves under each entry, so the next fix is named rather than guessed. */
console.log("");
for (const root of roots.slice(0, 8)) {
  const under = new Map<string, number>();
  const stack = [root.selfId];
  const seen = new Set<number>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodes.get(id)!;
    if (node.selfMs > 0) {
      const key = `${node.name}  ${node.where}`;
      under.set(key, (under.get(key) ?? 0) + node.selfMs);
    }
    for (const child of node.children) stack.push(child);
  }
  const top = [...under.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(`${root.name}  (${ticks > 0 ? `${perTick(root.subtreeMs).trim()} ms/tick` : `${Math.round(root.subtreeMs)} ms`})`);
  for (const [key, ms] of top) console.log(`    ${String(Math.round(ms * 10) / 10).padStart(8)} ms  ${perTick(ms)}  ${key}`);
  console.log("");
}
