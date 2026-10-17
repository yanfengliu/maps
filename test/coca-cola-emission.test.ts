/** Bound: byte/GML binding and seven manually inspected original-photo points.
 * The complete artwork, border and native block appearance need browser review.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { emissionAt } from "../src/scene/facade-emission.js";
import { FACADE_EMISSION_REGIONS } from "../src/scene/facade-emission-regions.js";
import { parseB3dm, readBatchColumn } from "../tools/tiles/b3dm.js";

it("binds the retained Coca-Cola script and excludes adjacent roof and glazing", async () => {
  const bytes = await readFile(new URL("../data/scene/buildings/data/data518.b3dm", import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b");
  const tile = parseB3dm(bytes);
  expect(readBatchColumn(tile.batchTableJson, tile.batchTableBinary, "gml_id", Number(tile.featureTableJson.BATCH_LENGTH))[63]).toBe("bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27");
  const region = FACADE_EMISSION_REGIONS.find(r => r.id === "coca-cola-source-panel")!;
  expect(region.gmlId).toBe("bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27");
  // Literal observations from the original4096px atlas, crop(266,3072)-(394,3584),
  // projected through decoded front faces494/495. No point derives from the mask.
  const samples = [
    { expected: 0.65, uv: [0.0673828125, 0.758544921875], p: [-14.295462106136224, 63.70827575207313, -28.45478372516571] },
    { expected: 0.65, uv: [0.07763671875, 0.7626953125], p: [-8.699715634466804, 61.97386688297036, -29.1196413165891] },
    { expected: 0.65, uv: [0.086669921875, 0.76953125], p: [-3.770139270098265, 59.11737207583622, -29.705318457314377] },
    { expected: 0, uv: [0.07666015625, 0.7509765625], p: [-9.232608923190758, 66.87038521223963, -29.05643100945142] },
    { expected: 0, uv: [0.09033203125, 0.76318359375], p: [-1.7716342224881851, 61.76955753855954, -29.942843288740665] },
    { expected: 0, uv: [0.07666015625, 0.7763671875], p: [-9.23268728410875, 56.261310277587974, -29.056185559525993] },
    { expected: 0, uv: [0.0859375, 0.75732421875], p: [-4.169798688056115, 64.21790552552974, -29.657943768297226] },
  ] as const;
  const normal = [0.11799791387083103, 0.000021249116341441976, 0.9930138427386634] as const;
  for (const s of samples) expect(emissionAt(region, s.p, normal, s.uv)).toBe(s.expected);
});
