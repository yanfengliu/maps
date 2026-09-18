/**
 * The chunked TIN reader must not read a triangle twice.
 *
 * `streamTinTriangles` is how `buildTerrain` reads the 360.6 MB
 * `533935_dem_6697_op.gml`, and between chunks it keeps a tail of text that has not
 * been parsed yet. It used to cut that tail back to the last `<gml:Triangle>`
 * opening tag the chunk held — which is a triangle that has **already been
 * yielded** whenever the chunk ends on its closing tag. The real document holds
 * 1,101,033 `<gml:Triangle>` elements and the old reader yielded 1,101,417, so 384
 * of them were parsed twice, and 65 exact duplicate triangles survived the clip into
 * `data/scene/terrain.mesh` (measured with `artifacts/terrain-holes/mesh-doctor.mjs`;
 * the full before/after counts are in the handoff for this lane).
 *
 * The defect needs one thing to happen that the caller cannot see: a read that ends
 * exactly on `</gml:Triangle>`. `StreamTinOptions.chunkSize` exists so this file can
 * put the boundary there instead of hoping a 64 KiB read lands on it.
 *
 * **The bound.** The document here is synthetic and small. It pins the buffer rule
 * and the exact boundary that reproduces the defect; it says nothing about the real
 * file's own counts, which are the mesh-doctor measurement quoted above and are not
 * re-derived here. The first case carries its own red control — the pre-fix tail
 * rule, copied verbatim — so the case cannot pass by the fixture quietly stopping
 * to reproduce the defect.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseTin, streamTinTriangles, type TinTriangle } from "../tools/geo/plateau-tin.js";

const TRIANGLE_OPEN = "<gml:Triangle>";
const TRIANGLE_CLOSE = "</gml:Triangle>";

/** One triangle in PLATEAU's shape: a closed four-vertex ring of 12 numbers. */
function triangleElement(index: number): string {
  const latitude = 35.65 + index * 0.0001;
  const longitude = 139.7 + index * 0.0001;
  const height = 15 + index * 0.1;
  const corners = [
    `${latitude.toFixed(5)} ${longitude.toFixed(5)} ${height.toFixed(1)}`,
    `${(latitude + 0.00001).toFixed(5)} ${longitude.toFixed(5)} ${height.toFixed(1)}`,
    `${latitude.toFixed(5)} ${(longitude + 0.00001).toFixed(5)} ${height.toFixed(1)}`,
  ];
  const ring = [...corners, corners[0]].join(" ");
  return (
    `${TRIANGLE_OPEN}<gml:exterior><gml:LinearRing>` +
    `<gml:posList srsDimension="3">${ring}</gml:posList>` +
    `</gml:LinearRing></gml:exterior>${TRIANGLE_CLOSE}\n`
  );
}

const DOCUMENT_HEADER =
  '<?xml version="1.0" encoding="UTF-8"?>\n<gml:FeatureCollection><gml:featureMember>' +
  "<gml:trianglePatches>\n";
const DOCUMENT_FOOTER = "</gml:trianglePatches></gml:featureMember></gml:FeatureCollection>\n";

const TRIANGLE_COUNT = 3;

function tinDocument(triangleCount: number = TRIANGLE_COUNT): string {
  const elements = Array.from({ length: triangleCount }, (_, index) => triangleElement(index));
  return `${DOCUMENT_HEADER}${elements.join("")}${DOCUMENT_FOOTER}`;
}

/**
 * The pre-fix tail rule, verbatim: cut back to the last opening tag the chunk held,
 * whether or not that triangle was already parsed. Used as this case's red control.
 */
async function streamWithTheOldTailRule(
  path: string,
  chunkSize: number,
): Promise<TinTriangle[]> {
  const { createReadStream } = await import("node:fs");
  const seen: TinTriangle[] = [];
  let tail = "";
  for await (const chunk of createReadStream(path, { encoding: "utf8", highWaterMark: chunkSize })) {
    tail += chunk as string;
    let searchFrom = 0;
    for (;;) {
      const open = tail.indexOf(TRIANGLE_OPEN, searchFrom);
      if (open === -1) break;
      const close = tail.indexOf(TRIANGLE_CLOSE, open);
      if (close === -1) break;
      const end = close + TRIANGLE_CLOSE.length;
      for (const triangle of parseTin(tail.slice(open, end))) seen.push(triangle);
      searchFrom = end;
    }
    const lastOpen = tail.lastIndexOf(TRIANGLE_OPEN);
    tail = lastOpen === -1 ? tail.slice(-TRIANGLE_OPEN.length) : tail.slice(lastOpen);
  }
  return seen;
}

/** A key that treats a triangle as its three source vertices, order included. */
function triangleKey(triangle: TinTriangle): string {
  return triangle.vertices.map((vertex) => vertex.join(",")).join("|");
}

async function stream(path: string, chunkSize?: number): Promise<TinTriangle[]> {
  const seen: TinTriangle[] = [];
  await streamTinTriangles(path, (triangle) => seen.push(triangle), chunkSize === undefined ? {} : { chunkSize });
  return seen;
}

let root = "";
let documentPath = "";
let documentText = "";
/** A chunk that ends exactly on the first triangle's closing tag. */
let boundaryOnClosingTag = 0;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "maps-tin-stream-"));
  documentPath = join(root, "tin.gml");
  documentText = tinDocument();
  await writeFile(documentPath, documentText, "utf8");
  boundaryOnClosingTag = documentText.indexOf(TRIANGLE_CLOSE) + TRIANGLE_CLOSE.length;
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the TIN reader's chunk tail", () => {
  it("yields a triangle once when the chunk ends exactly on its closing tag", async () => {
    // The red control first: the pre-fix rule must still double-count on this
    // boundary, or this fixture no longer reproduces the defect the case is about.
    const before = await streamWithTheOldTailRule(documentPath, boundaryOnClosingTag);
    expect(
      before.length,
      "the pre-fix tail rule no longer double-counts on this fixture, so this case would pass " +
        "without the fix and proves nothing about the chunk boundary",
    ).toBe(TRIANGLE_COUNT + 1);

    const bytes = await readFile(documentPath);
    expect(boundaryOnClosingTag).toBeLessThan(bytes.byteLength);

    const seen = await stream(documentPath, boundaryOnClosingTag);
    expect(
      seen.length,
      `the stream yielded ${seen.length} triangles from a document holding ${TRIANGLE_COUNT}`,
    ).toBe(TRIANGLE_COUNT);
    const keys = seen.map(triangleKey);
    expect(new Set(keys).size, `the stream yielded a duplicate triangle: ${keys.join(" ; ")}`).toBe(
      TRIANGLE_COUNT,
    );
  });

  it("keeps a triangle whose opening tag is split across a chunk boundary", async () => {
    // The other side of the same rule: cutting the tail back too far loses a
    // triangle, which is the failure a fix for the double count could introduce.
    const splitInside = documentText.indexOf(TRIANGLE_OPEN, DOCUMENT_HEADER.length) + 4;
    const seen = await stream(documentPath, splitInside);
    expect(
      seen.length,
      `a chunk boundary inside <gml:Triangle> lost triangles: the document holds ` +
        `${TRIANGLE_COUNT} and the stream yielded ${seen.length}`,
    ).toBe(TRIANGLE_COUNT);
    expect(seen).toEqual(parseTin(documentText));
  });

  it("reads the same document as parseTin at every awkward chunk size", async () => {
    const expected = parseTin(documentText);
    for (const chunkSize of [1, 2, 3, 5, 8, 13, 14, 29, 64, documentText.length - 1]) {
      const seen = await stream(documentPath, chunkSize);
      expect(
        seen.map(triangleKey),
        `at chunkSize ${chunkSize} the stream disagrees with parseTin over the same document`,
      ).toEqual(expected.map(triangleKey));
    }
  });
});
