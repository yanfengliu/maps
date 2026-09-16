/** Offline full-input audit of the fixed priority texture policy. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseB3dm, parseGlb } from "../tiles/b3dm.ts";
import { webpSize } from "../scene/build-buildings.ts";
import { HERO_FRONTAGE_M, textureLimitForTile } from "../../src/scene/texture-budget.ts";

interface Tile { boundingVolume?: { box?: number[] }; content?: { uri: string }; children?: Tile[] }
const root = JSON.parse(await readFile("data/scene/buildings/tileset.json", "utf8")).root as Tile;
const entries: { tile: string; sourceSha256: string; cap: number; atlasCount: number; textureBytes: number; geometryBytes: number }[] = [];
async function visit(tile: Tile): Promise<void> {
  if (tile.content) {
    const bytes = new Uint8Array(await readFile(`data/scene/buildings/${tile.content.uri}`));
    const gltf = parseGlb(parseB3dm(bytes).glb);
    const cap = textureLimitForTile(tile);
    let textureBytes = 0; let atlasCount = 0;
    for (const image of gltf.json.images ?? []) {
      const view = image.bufferView === undefined ? undefined : gltf.json.bufferViews?.[image.bufferView];
      if (!view || !gltf.binary) throw new Error(`Missing embedded atlas for ${tile.content.uri}`);
      const size = webpSize(gltf.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
      if (!size) throw new Error(`Unknown atlas encoding for ${tile.content.uri}`);
      const scale = Math.min(1, cap / Math.max(size.width, size.height));
      textureBytes += Math.ceil(Math.round(size.width * scale) * Math.round(size.height * scale) * 4 * 4 / 3); atlasCount++;
    }
    const accessors = gltf.json["accessors"] as { count: number; type: string; componentType: number }[];
    let geometryBytes = accessors.reduce((sum, accessor) => sum + accessor.count * ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type] ?? 16) * ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType] ?? 4), 0);
    for (const mesh of gltf.json.meshes ?? []) for (const primitive of mesh.primitives) geometryBytes += (accessors[primitive.attributes["POSITION"]!]?.count ?? 0) * 12;
    entries.push({ tile: tile.content.uri, sourceSha256: createHash("sha256").update(bytes).digest("hex"), cap, atlasCount, textureBytes, geometryBytes });
  }
  for (const child of tile.children ?? []) await visit(child);
}
await visit(root);
const hero = entries.filter((entry) => entry.cap === 4096);
if (hero.length !== 1 || hero[0]!.atlasCount !== 1) throw new Error(`Native frontage texture policy selected ${hero.length} tiles and ${hero.map((entry) => entry.atlasCount).join(",")} atlases. The approved budget supports exactly one leaf tile and one atlas; inspect source bounds before using this changed tileset.`);
const report = { policy: "One final-detail leaf containing the observed crossing frontage:4096; other tile bounds intersecting160m around crossing:2048; all others:1024", heroFrontageM: HERO_FRONTAGE_M, nativeTile: hero[0]!.tile, tiles: entries.length, priorityTiles: entries.filter((entry) => entry.cap > 1024).length, decodedTextureBytesWithMipmaps: entries.reduce((sum, entry) => sum + entry.textureBytes, 0), geometryAndFacadeAttributeBytes: entries.reduce((sum, entry) => sum + entry.geometryBytes, 0), entries };
await mkdir("artifacts/texture-budget", { recursive: true });
await writeFile("artifacts/texture-budget/manifest.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, entries: undefined }));
