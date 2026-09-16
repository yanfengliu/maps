/** Small, bounded GSI aerial reference around the hero crossing. These source
 * images support authored road paint review; they are never a basemap texture.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { AOI_CENTRE_WGS84 } from "../../src/world/aoi.ts";
const root = "data/decorations/paint-reference";
const z = 18; const n = 2 ** z;
const x0 = Math.floor((AOI_CENTRE_WGS84.longitude + 180) / 360 * n);
const lat = AOI_CENTRE_WGS84.latitude * Math.PI / 180;
const y0 = Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n);
await mkdir(root, { recursive: true });
const records: object[] = [];
for (let y = y0 - 1; y <= y0 + 1; y++) for (let x = x0 - 1; x <= x0 + 1; x++) {
  const url = `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/${z}/${x}/${y}.jpg`;
  const file = `${z}_${x}_${y}.jpg`;
  let bytes: Uint8Array;
  try { bytes = await readFile(`${root}/${file}`); } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GSI aerial reference ${url} returned HTTP ${response.status}; source imagery is required before authoring hero paint.`);
    bytes = new Uint8Array(await response.arrayBuffer());
    await writeFile(`${root}/${file}`, bytes);
  }
  records.push({ file, url, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
}
await writeFile(`${root}/provenance.json`, JSON.stringify({ checkedAt: new Date().toISOString(), source: "Geospatial Information Authority of Japan (GSI), seamless aerial photography", sourceIndex: "https://maps.gsi.go.jp/development/ichiran.html", use: "https://web2.gsi.go.jp/kikakuchousei/kikakuchousei40182.html", centre: AOI_CENTRE_WGS84, zoom: z, records }, null, 2) + "\n");
console.log(JSON.stringify({ root, centreTile: { z, x: x0, y: y0 }, count: records.length }));
