/**
 * Mirror the 67 PLATEAU 3D Tiles the area of interest needs. Plan item 10.
 *
 * Run from `npm run data:fetch`, which calls `fetchTiles` below; it can also be
 * run on its own with `node tools/data/fetch-tiles.ts`.
 *
 * The tileset is 730 content tiles over the whole ward and the AOI needs 67 of
 * them, about 137 MB. They land in a gitignored `data/3dtiles/bldg-lod2/`, and
 * `tools/data/tiles-pins.json` records the exact length and SHA-256 of every one,
 * checked on each run.
 *
 * Why pin 67 files individually rather than trust the CDN: MLIT publishes this
 * behind a `-latest` alias that will move when FY2026 lands, and the pipeline
 * downstream reads per-building attributes and geometry bounds out of these bytes
 * and bakes them into the scene. A build that silently changed underneath would
 * produce a scene that still renders, so the failure has to be at fetch time.
 *
 *   node tools/data/fetch-tiles.ts --write-pins   take the pins from what is on disk
 *
 * `--write-pins` is how the file was first made and how it is deliberately moved
 * to a new upstream build. It is never what a normal run does, because a pin
 * regenerated to make a run pass is not a pin.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OVERPASS, PLATEAU_3DTILES } from "./manifest.ts";
import { selectAoiTiles, type Tileset } from "../tiles/tileset.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_ROOT = join(REPO_ROOT, "data");
const PINS_PATH = join(REPO_ROOT, "tools", "data", "tiles-pins.json");

export interface TilePin {
  uri: string;
  bytes: number;
  sha256: string;
}

export interface TilesPins {
  resolvedTilesetUrl: string;
  tilesetBytes: number;
  tilesetSha256: string;
  tileCount: number;
  totalBytes: number;
  tiles: TilePin[];
}

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

async function get(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { "user-agent": OVERPASS.userAgent } });
  if (!response.ok) {
    throw new Error(
      `Fetching ${url} returned HTTP ${response.status} ${response.statusText}. PLATEAU asset URLs ` +
        "move when a new fiscal year lands; check the dataset page named in tools/data/manifest.ts.",
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function readIfPresent(path: string): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(path));
  } catch {
    return undefined;
  }
}

/**
 * Follow the `-latest` alias to the tileset that actually holds the tiles.
 *
 * The entry document is a one-child tileset whose content URI is an absolute URL
 * on the asset CDN. Resolving it here rather than hardcoding only the CDN URL
 * keeps the citable alias in the manifest, and comparing the result against the
 * pinned URL is what turns "upstream republished" into a message rather than into
 * 67 hash mismatches.
 */
async function resolveTilesetUrl(): Promise<string> {
  const entry = JSON.parse(new TextDecoder().decode(await get(PLATEAU_3DTILES.entryUrl))) as Tileset;
  const child = entry.root.children?.[0];
  const uri = child?.content?.uri;
  if (uri === undefined) {
    throw new Error(
      `${PLATEAU_3DTILES.entryUrl} no longer looks like the one-child redirect it was: its root ` +
        "child has no content URI. Open it and see what MLIT publishes there now.",
    );
  }
  return new URL(uri, PLATEAU_3DTILES.entryUrl).toString();
}

export interface FetchTilesOptions {
  writePins?: boolean;
  force?: boolean;
}

export async function fetchTiles(options: FetchTilesOptions = {}): Promise<TilesPins> {
  const root = join(DATA_ROOT, PLATEAU_3DTILES.root);
  await mkdir(join(root, "data"), { recursive: true });

  const pins = options.writePins
    ? undefined
    : (JSON.parse(await readFile(PINS_PATH, "utf8")) as TilesPins);

  const resolvedUrl = await resolveTilesetUrl();
  if (pins !== undefined && resolvedUrl !== pins.resolvedTilesetUrl) {
    throw new Error(
      `${PLATEAU_3DTILES.entryUrl} now points at\n  ${resolvedUrl}\nbut the pins in ` +
        `tools/data/tiles-pins.json were taken from\n  ${pins.resolvedTilesetUrl}\n` +
        "That is a different upstream build, so every hash below it would fail. Look at what " +
        "changed, then re-take the pins deliberately with `node tools/data/fetch-tiles.ts " +
        "--write-pins` rather than to make this pass.",
    );
  }

  const tilesetPath = join(root, "tileset.json");
  let tilesetBytes = options.force ? undefined : await readIfPresent(tilesetPath);
  if (tilesetBytes === undefined || (pins !== undefined && sha256(tilesetBytes) !== pins.tilesetSha256)) {
    console.log(`fetch ${PLATEAU_3DTILES.root}/tileset.json — ${resolvedUrl}`);
    tilesetBytes = await get(resolvedUrl);
    await writeFile(tilesetPath, tilesetBytes);
  }

  const tileset = JSON.parse(new TextDecoder().decode(tilesetBytes)) as Tileset;
  const selected = selectAoiTiles(tileset);
  console.log(
    `      ${PLATEAU_3DTILES.root}: ${countContentTiles(tileset)} content tiles in the ward, ` +
      `${selected.length} over the area of interest`,
  );

  if (pins !== undefined && selected.length !== pins.tileCount) {
    throw new Error(
      `Clipping the tileset to the area of interest selected ${selected.length} tiles, but the ` +
        `pins expect ${pins.tileCount}. Either the AOI in src/world/aoi.ts moved or upstream ` +
        "re-tiled the ward.",
    );
  }

  const written: TilePin[] = [];
  let fetched = 0;
  let total = 0;

  for (const tile of selected) {
    const destination = join(root, tile.uri);
    await mkdir(dirname(destination), { recursive: true });
    const pin = pins?.tiles.find((candidate) => candidate.uri === tile.uri);

    let bytes = options.force ? undefined : await readIfPresent(destination);
    if (bytes !== undefined && pin !== undefined) {
      if (bytes.byteLength !== pin.bytes) {
        console.log(
          `fetch ${tile.uri} — ${pin.bytes - bytes.byteLength} bytes short of the expected ` +
            `${pin.bytes}, a truncated download`,
        );
        bytes = undefined;
      } else if (sha256(bytes) !== pin.sha256) {
        console.log(`fetch ${tile.uri} — right length, wrong bytes`);
        bytes = undefined;
      }
    }

    if (bytes === undefined) {
      const url = new URL(tile.uri, resolvedUrl).toString();
      await rm(destination, { force: true });
      bytes = await get(url);
      await writeFile(destination, bytes);
      fetched += 1;
      if (pin !== undefined) {
        if (bytes.byteLength !== pin.bytes || sha256(bytes) !== pin.sha256) {
          throw new Error(
            `${tile.uri} still does not match its pin after downloading: got ${bytes.byteLength} ` +
              `bytes, SHA-256 ${sha256(bytes)}; expected ${pin.bytes} bytes and ${pin.sha256}. ` +
              "Upstream has republished this tile.",
          );
        }
      }
    }

    total += bytes.byteLength;
    written.push({ uri: tile.uri, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }

  console.log(
    `ok    ${PLATEAU_3DTILES.root}: ${written.length} tiles, ${(total / 1e6).toFixed(1)} MB ` +
      `(${fetched} downloaded this run)`,
  );

  const result: TilesPins = {
    resolvedTilesetUrl: resolvedUrl,
    tilesetBytes: tilesetBytes.byteLength,
    tilesetSha256: sha256(tilesetBytes),
    tileCount: written.length,
    totalBytes: total,
    tiles: written,
  };

  if (options.writePins) {
    await writeFile(PINS_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`ok    tools/data/tiles-pins.json written with ${written.length} pins`);
  }

  return result;
}

function countContentTiles(tileset: Tileset): number {
  let count = 0;
  const walk = (tile: { content?: unknown; children?: unknown[] }): void => {
    if (tile.content !== undefined) count += 1;
    for (const child of (tile.children ?? []) as { content?: unknown; children?: unknown[] }[]) {
      walk(child);
    }
  };
  walk(tileset.root);
  return count;
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("fetch-tiles.ts")) {
  await fetchTiles({
    writePins: process.argv.includes("--write-pins"),
    force: process.argv.includes("--force"),
  });
}
