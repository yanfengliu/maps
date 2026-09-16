/** harness: builds and inspects offline crowd assets; the city sweep tests their runtime use. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCES = [
  {
    file: "mpfb2-80919fa.zip",
    url: "https://codeload.github.com/makehumancommunity/mpfb2/zip/80919fa4682335c41847f761a4d79dcad4124732",
    bytes: 44851738,
    sha256: "038e9f01ae3900ad11f24af887e184c0bfa20a00abe4411f750d09b21efaaadc",
  },
  {
    file: "makehuman-system-assets.zip",
    url: "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip",
    bytes: 280737770,
    sha256: "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107",
  },
] as const;

const sourceRoot = resolve(ROOT, "data/agents/source");
await mkdir(sourceRoot, { recursive: true });
for (const source of SOURCES) {
  const path = resolve(sourceRoot, source.file);
  let bytes: Buffer;
  if (existsSync(path)) {
    bytes = await readFile(path);
  } else {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`Agent asset ${source.file} download failed with HTTP ${response.status}: ${source.url}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== source.bytes || digest !== source.sha256) {
    throw new Error(`Agent asset ${source.file} does not match its pinned source: expected ${source.bytes} bytes / ${source.sha256}, found ${bytes.length} / ${digest}. Restore the pinned archive before building.`);
  }
  if (!existsSync(path)) await writeFile(path, bytes);
}

const blender = process.env["MAPS_BLENDER_PATH"] ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
if (!existsSync(blender)) throw new Error(`Blender was not found at ${blender}. Set MAPS_BLENDER_PATH to a Blender 5.2 executable.`);
const userRoot = resolve(ROOT, "data/agents/blender-user");
await mkdir(userRoot, { recursive: true });
const scripts = process.argv.includes("--vehicles-only") ? ["build-vehicles.py"]
  : process.argv.includes("--bake-only") ? ["bake-human.py"] : ["build-human.py", "bake-human.py", "build-vehicles.py"];
for (const script of scripts) {
const child = spawn(blender, ["--background", "--factory-startup", "--offline-mode", "--python-exit-code", "1", "--python", resolve(ROOT, "tools/agents", script), "--", ROOT, ...process.argv.slice(2).filter((arg) => arg !== "--bake-only")], {
  cwd: ROOT,
  windowsHide: true,
  stdio: "inherit",
  env: {
    ...process.env,
    BLENDER_USER_RESOURCES: userRoot,
    BLENDER_USER_CONFIG: resolve(userRoot, "config"),
    BLENDER_USER_SCRIPTS: resolve(userRoot, "scripts"),
    BLENDER_USER_DATAFILES: resolve(userRoot, "datafiles"),
    BLENDER_USER_EXTENSIONS: resolve(userRoot, "extensions"),
  },
});
console.log(`Offline agent builder owns Blender PID ${child.pid ?? "not-started"} (${script}).`);
const stop = () => {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
  else child.kill("SIGTERM");
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  await new Promise<void>((done, fail) => {
    child.once("error", fail);
    child.once("exit", (code) => code === 0 ? done() : fail(new Error(`Offline human build failed (Blender exit ${code}). Read the preceding asset or export error.`)));
  });
} finally {
  stop();
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
}
if (!process.argv.includes("--inspect-gait")) await import("./verify.ts");
