/**
 * Fetch every source the Shibuya AOI is built from. Plan items 5, 6 and 7.
 *
 *   npm run data:fetch
 *
 * Everything lands under `data/`, which is gitignored. About 620 MiB downloads
 * and about 1.4 GiB unpacks. Re-running is cheap: a file already on disk that
 * matches its pinned length and SHA-256 is left alone.
 *
 * Why a script and not a page of instructions: a hand-run download has no way to
 * tell a truncated file from a good one. This one checks the length first — a
 * short file is the common failure and saying "short by 4,096 bytes" is more use
 * than "hash mismatch" — and then the hash.
 *
 *   npm run data:fetch -- --force     re-download even if the file verifies
 *   npm run data:fetch -- --skip-osm  leave the Overpass extract alone
 *
 * Overpass has a usage policy. The AOI extract is 1.2 MB and the guidance for a
 * regular application is under 10 MB a day, so this caches on disk and re-fetches
 * on a schedule, never per build.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { fileURLToPath } from "node:url";

import {
  GSI_TILES,
  OVERPASS,
  PLATEAU_AOI_MEMBERS,
  PLATEAU_CITYGML,
  type ChecksummedDownload,
} from "./manifest.ts";
import { buildOverpassQuery } from "./overpass-query.ts";
import { AOI_BOUNDS_WGS84, AOI_MESH_CODES } from "../../src/world/aoi.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_ROOT = join(REPO_ROOT, "data");
const PLATEAU_ROOT = join(DATA_ROOT, "plateau");

interface Options {
  force: boolean;
  skipOsm: boolean;
}

function parseOptions(argv: readonly string[]): Options {
  const known = new Set(["--force", "--skip-osm"]);
  for (const argument of argv) {
    if (!known.has(argument)) {
      throw new Error(
        `Unknown option ${argument}. This script takes --force (re-download files that already ` +
          "verify) and --skip-osm (leave the Overpass extract alone) and nothing else.",
      );
    }
  }
  return { force: argv.includes("--force"), skipOsm: argv.includes("--skip-osm") };
}

async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

async function sizeOf(path: string): Promise<number | undefined> {
  try {
    return (await stat(path)).size;
  } catch {
    return undefined;
  }
}

/**
 * Check a file against its pinned length and hash.
 *
 * Returns the reason it is not good, or undefined when it is. Length first, on
 * purpose: an interrupted download is short, and "short by N bytes" names the
 * failure where a hash mismatch only says something is wrong.
 */
async function verify(path: string, pin: ChecksummedDownload): Promise<string | undefined> {
  const size = await sizeOf(path);
  if (size === undefined) return "it is not on disk";
  if (size !== pin.bytes) {
    const difference = pin.bytes - size;
    return difference > 0
      ? `it is ${difference} bytes short of the expected ${pin.bytes} — a truncated download`
      : `it is ${-difference} bytes longer than the expected ${pin.bytes}`;
  }
  const digest = await sha256OfFile(path);
  if (digest !== pin.sha256) {
    return `its SHA-256 is ${digest}, not the pinned ${pin.sha256} — the right length, wrong bytes`;
  }
  return undefined;
}

async function download(url: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  const partial = `${destination}.part`;
  await rm(partial, { force: true });

  const response = await fetch(url, { headers: { "user-agent": OVERPASS.userAgent } });
  if (!response.ok) {
    throw new Error(
      `Fetching ${url} returned HTTP ${response.status} ${response.statusText}. ` +
        "Nothing was written. If this is a PLATEAU asset URL, check the dataset page listed in " +
        "tools/data/manifest.ts — asset URLs change when a new fiscal year lands.",
    );
  }
  if (!response.body) throw new Error(`Fetching ${url} returned no body at all.`);

  // Streamed to disk rather than buffered: the CityGML archive is 619 MiB and
  // `await response.arrayBuffer()` would hold all of it in memory at once.
  //
  // The cast is the one place this file needs one. `tsconfig.json` includes the
  // DOM lib for the app's sake, so `fetch` here is typed with the DOM's
  // `ReadableStream`, while `Readable.fromWeb` wants the identical stream typed
  // as `node:stream/web`'s. Same object, two declarations of it.
  await pipeline(
    Readable.fromWeb(response.body as unknown as NodeReadableStream),
    createWriteStream(partial),
  );
  await rename(partial, destination);
}

/** Fetch when missing or when the pin does not match; report either way. */
async function fetchPinned(pin: ChecksummedDownload, options: Options): Promise<void> {
  const destination = join(DATA_ROOT, pin.path);
  const complaint = await verify(destination, pin);

  if (complaint === undefined && !options.force) {
    console.log(`ok    ${pin.path} — ${pin.bytes} bytes, SHA-256 matches`);
    return;
  }
  if (complaint !== undefined) {
    console.log(`fetch ${pin.path} — ${complaint}`);
  } else {
    console.log(`fetch ${pin.path} — --force given, re-downloading a file that already verifies`);
  }

  console.log(`      ${pin.url}`);
  await download(pin.url, destination);

  const afterwards = await verify(destination, pin);
  if (afterwards !== undefined) {
    throw new Error(
      `${pin.path} still does not verify after downloading: ${afterwards}.\n` +
        "Either the download was interrupted, or upstream republished the archive under the same " +
        "name. Re-run once; if it fails the same way, compare against the dataset page and update " +
        "the pin in tools/data/manifest.ts deliberately rather than to make this pass.",
    );
  }
  console.log(`ok    ${pin.path} — ${pin.bytes} bytes, SHA-256 matches`);
}

/**
 * Extract just the AOI members.
 *
 * Shelling out to `unzip` rather than reading the zip in Node: the archive holds
 * 19,877 entries and one 378 MB member, and the system tool handles that without
 * this script growing a zip reader it would then have to be trusted about.
 */
function extractPlateauMembers(): void {
  const archive = join(DATA_ROOT, PLATEAU_CITYGML.path);
  const result = spawnSync(
    "unzip",
    ["-q", "-o", archive, ...PLATEAU_AOI_MEMBERS, "-d", PLATEAU_ROOT],
    { stdio: "inherit" },
  );
  if (result.error) {
    throw new Error(
      `Could not run \`unzip\`: ${result.error.message}. It ships with Git for Windows, so a Git ` +
        "Bash shell has it; a bare PowerShell may not.",
    );
  }
  // 11 is "no matching files", which here means the member list and the archive
  // have diverged — worth failing on rather than leaving an empty directory.
  if (result.status !== 0) {
    throw new Error(
      `\`unzip\` exited ${result.status} extracting ${PLATEAU_AOI_MEMBERS.length} member patterns ` +
        `from ${PLATEAU_CITYGML.path}. Status 11 means none of the patterns matched, which means ` +
        "the archive's layout changed; anything else is an I/O or disk-space failure.",
    );
  }
}

async function fetchOverpass(): Promise<void> {
  const query = buildOverpassQuery();
  const queryPath = join(DATA_ROOT, OVERPASS.queryPath);
  const responsePath = join(DATA_ROOT, OVERPASS.responsePath);
  await mkdir(dirname(responsePath), { recursive: true });
  await writeFile(queryPath, query, "utf8");

  console.log(`fetch ${OVERPASS.responsePath} — ${OVERPASS.endpoint}`);
  const response = await fetch(OVERPASS.endpoint, {
    method: "POST",
    // A bare token. A User-Agent carrying a parenthesised contact comment — the
    // form OSM convention asks for — makes overpass-api.de answer 406, which is
    // documented as "rate limited" and is not.
    headers: { "user-agent": OVERPASS.userAgent, "content-type": "text/plain" },
    body: query,
  });
  if (!response.ok) {
    throw new Error(
      `Overpass returned HTTP ${response.status} ${response.statusText}. 429 and 504 mean the ` +
        "public instance is busy: wait 30 s and re-run. 406 means the User-Agent was rejected.",
    );
  }
  const body = await response.text();
  await writeFile(responsePath, body, "utf8");

  const parsed = JSON.parse(body) as {
    elements?: unknown[];
    osm3s?: { timestamp_osm_base?: string };
  };
  const count = parsed.elements?.length ?? 0;
  const timestamp = parsed.osm3s?.timestamp_osm_base ?? "unknown";
  console.log(
    `ok    ${OVERPASS.responsePath} — ${Buffer.byteLength(body)} bytes, ${count} element records, ` +
      `osm_base ${timestamp}`,
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  console.log(
    `Shibuya AOI ${AOI_BOUNDS_WGS84.south}–${AOI_BOUNDS_WGS84.north} N, ` +
      `${AOI_BOUNDS_WGS84.west}–${AOI_BOUNDS_WGS84.east} E; ` +
      `mesh cells ${AOI_MESH_CODES.level3.join(", ")} plus DEM ${AOI_MESH_CODES.level2}.`,
  );
  console.log(`Data root: ${DATA_ROOT} (gitignored)\n`);

  await fetchPinned(PLATEAU_CITYGML, options);
  console.log(`extract ${PLATEAU_AOI_MEMBERS.length} member patterns into data/plateau/`);
  extractPlateauMembers();

  for (const tile of GSI_TILES) {
    const destination = join(DATA_ROOT, tile.path);
    if ((await sizeOf(destination)) !== undefined && !options.force) {
      console.log(`ok    ${tile.path} — already on disk`);
      continue;
    }
    console.log(`fetch ${tile.path} — ${tile.url}`);
    await download(tile.url, destination);
  }

  if (options.skipOsm) {
    console.log("skip  Overpass, --skip-osm given");
  } else {
    await fetchOverpass();
  }

  const provenance = {
    fetchedAt: new Date().toISOString(),
    aoi: AOI_BOUNDS_WGS84,
    meshCodes: AOI_MESH_CODES,
    plateau: PLATEAU_CITYGML,
    gsiTiles: GSI_TILES,
    overpass: {
      endpoint: OVERPASS.endpoint,
      note: "OSM changes daily, so this response is pinned by osm3s.timestamp_osm_base inside the JSON, not by hash.",
    },
  };
  await writeFile(
    join(DATA_ROOT, "provenance.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
    "utf8",
  );
  console.log("\nok    data/provenance.json written");
}

await main();
