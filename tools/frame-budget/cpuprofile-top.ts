/**
 * harness: reads a V8 `.cpuprofile` and prints the heaviest functions by self
 * time. A reading aid for `node --cpu-prof`, not part of any gate.
 *
 * RUN IT:
 *
 *   node tools/frame-budget/cpuprofile-top.ts <file.cpuprofile> [count]
 *
 * Self time is the time attributed to a function's own frames, so a wrapper that
 * only calls other functions does not appear here. That is deliberate: the
 * question is which line of arithmetic the tick spends its milliseconds in.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/frame-budget/cpuprofile-top.ts <file.cpuprofile> [count]");
const limit = Number(process.argv[3] ?? 25);

const profile = JSON.parse(readFileSync(file, "utf8")) as {
  nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number }[];
  samples: number[];
  timeDeltas: number[];
};

const byId = new Map(profile.nodes.map((node) => [node.id, node]));
const selfMicros = new Map<number, number>();
for (let index = 0; index < profile.samples.length; index += 1) {
  const id = profile.samples[index]!;
  selfMicros.set(id, (selfMicros.get(id) ?? 0) + (profile.timeDeltas[index] ?? 0));
}

const rows = [...selfMicros.entries()]
  .map(([id, micros]) => {
    const frame = byId.get(id)?.callFrame;
    const url = frame?.url ?? "";
    const short = url.includes("/maps/") ? url.slice(url.indexOf("/maps/") + 6) : basename(url);
    return {
      function: frame?.functionName || "(anonymous)",
      where: `${short}:${(frame?.lineNumber ?? 0) + 1}`,
      selfMs: Math.round(micros / 100) / 10,
    };
  })
  .sort((a, b) => b.selfMs - a.selfMs);

const total = rows.reduce((sum, row) => sum + row.selfMs, 0);
console.log(`${file}: ${Math.round(total)} ms of sampled self time across ${rows.length} frames\n`);
for (const row of rows.slice(0, limit)) {
  console.log(`${String(row.selfMs).padStart(9)} ms  ${String(Math.round((row.selfMs / total) * 1000) / 10).padStart(5)}%  ${row.function}  ${row.where}`);
}
