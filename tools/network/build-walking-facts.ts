/** Offline review artifact only: no production data writer or browser import. */
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deriveHistoricalWalkingFacts, WALKING_FACT_MEMBERS, type WalkingFactInputs } from "./historical-walking-facts.ts";

const checkout = fileURLToPath(new URL("../../", import.meta.url));
const usage = "Use --lineage <reviewed bundle directory> --freeze-sha256 <externally reviewed SHA-256> --out artifacts/<task>/<new file>.";
const inputRecovery = "Supply the complete, readable reviewed lineage bundle matching --freeze-sha256.";
const outputRecovery = "Choose a writable real directory below this checkout's artifacts directory and a new filename; retain any existing output.";
function filesystem<T>(operation: string, path: string, recovery: string, action: () => T): T {
  try { return action(); }
  catch (cause) {
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    const reason = typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : "filesystem error";
    const displayedPath = path.length <= 320 ? path : `${path.slice(0,120)}…${path.slice(-160)}`;
    throw new Error(`Walking facts cannot ${operation} ${JSON.stringify(displayedPath)} (${reason}). ${recovery}`, { cause });
  }
}
function destination(value: string): string {
  const root = resolve(checkout, "artifacts"), target = resolve(checkout, value), local = relative(root, target);
  if (!local || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) throw new Error(`Walking facts output ${value} must be a new file below this checkout's artifacts directory. ${usage}`);
  // Inspect each existing component before creating directories; never follow a junction.
  let current = resolve(checkout);
  for (const part of relative(current, target).split(sep)) {
    current = resolve(current, part);
    if (!filesystem("inspect output path", current, outputRecovery, () => existsSync(current))) continue;
    const stat = filesystem("inspect output path", current, outputRecovery, () => lstatSync(current));
    if (stat.isSymbolicLink() || relative(current, filesystem("resolve output path", current, outputRecovery, () => realpathSync(current))) !== "") throw new Error(`Walking facts output ${current} crosses a link or junction; choose a real artifacts directory.`);
    if (current === target) throw new Error(`Walking facts output ${target} already exists; retain it and choose a new artifact path.`);
    if (!stat.isDirectory()) throw new Error(`Walking facts output parent ${current} is not a directory; choose a real artifacts directory.`);
  }
  return target;
}

export function buildWalkingFacts(argv: readonly string[]): string {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]!, value = argv[i + 1];
    if (!["--lineage", "--freeze-sha256", "--out"].includes(key) || args.has(key) || !value || value.startsWith("--")) throw new Error(`Walking facts arguments contain a missing, repeated or unknown option ${key}. ${usage}`);
    args.set(key, value);
  }
  if (args.size !== 3) throw new Error(`Walking facts arguments are incomplete. ${usage}`);
  const target = destination(args.get("--out")!);
  const bundle = resolve(args.get("--lineage")!);
  const readMember = (path: string) => filesystem("read reviewed bundle member", path, inputRecovery, () => readFileSync(path));
  const inputs: WalkingFactInputs = {
    expectedLineageFreezeSha256: args.get("--freeze-sha256")!,
    freeze: readMember(resolve(bundle, "freeze.json")),
    members: Object.fromEntries(Object.entries(WALKING_FACT_MEMBERS).map(([key, path]) => [key, readMember(resolve(bundle, path))])) as unknown as WalkingFactInputs["members"],
  };
  const serialized = `${JSON.stringify(deriveHistoricalWalkingFacts(inputs))}\n`;
  destination(target);
  filesystem("create output directory", dirname(target), outputRecovery, () => mkdirSync(dirname(target), { recursive: true }));
  destination(target);
  filesystem("create output file exclusively", target, outputRecovery, () => writeFileSync(target, serialized, { flag: "wx" }));
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(`${buildWalkingFacts(process.argv.slice(2))}\n`); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
