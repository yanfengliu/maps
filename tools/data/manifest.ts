/**
 * What Phase 1 fetches, where it comes from, and what it must hash to.
 *
 * Plan items 5, 6, 7 and 8. This is the provenance record in executable form:
 * `fetch.ts` reads it, and `docs/work/0_shibuya-1km/design.md` says in prose why
 * each source was chosen.
 *
 * Nothing this file names goes into Git. `data/` is ignored and everything under
 * it is regenerable by `npm run data:fetch`.
 */

import { AOI_MESH_CODES } from "../../src/world/aoi.ts";

export interface ChecksummedDownload {
  /** What the fetch script calls it and where it lands under `data/`. */
  path: string;
  url: string;
  /**
   * Exact byte count. A short file is a truncated download, and saying so by
   * length is cheaper and clearer than saying so by hash.
   */
  bytes: number;
  /** SHA-256 of the whole file, lowercase hex. */
  sha256: string;
  note: string;
}

/**
 * PLATEAU Shibuya-ku FY2025 CityGML, the geometry and terrain of record.
 *
 * Plan item 5 originally named the Tokyo 23-ku bundle; that is FY2020, spec v2/v4
 * and 4.97 GiB. This one is FY2025, spec v5, 619 MiB, and it adds LOD3 roads and
 * LOD3 street furniture.
 *
 * The byte count and hash below were measured on the file this repo actually
 * downloaded on 2026-09-06, not copied from a listing. There is a second build of
 * the same-named archive behind the `13113-latest` alias which differs by 2,465
 * bytes, so the URL here is the citable geospatial.jp resource and the hash pins
 * which build we mean.
 */
export const PLATEAU_CITYGML: ChecksummedDownload = {
  path: "raw/13113_shibuya-ku_pref_2025_citygml_1_op.zip",
  url: "https://assets.cms.plateau.reearth.io/assets/48/e684f3-fb86-44d4-b7e3-a3d72d54582d/13113_shibuya-ku_pref_2025_citygml_1_op.zip",
  bytes: 649_322_807,
  sha256: "f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d",
  note: "PLATEAU 3D City Model, Shibuya-ku FY2025, CityGML 2.0 with i-UR uro 3.2. Dataset page: https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025",
};

/**
 * MLIT's own 3D Tiles build of the same dataset, which is where buildings come from.
 *
 * Plan item 10, decided in Phase 1: the pre-converted tiles win over running the
 * PLATEAU GIS Converter, because they carry per-building attributes in a form with
 * no known bug and an already-built spatial hierarchy, and because the converter's
 * Windows CLI is never CI-tested upstream. `docs/work/0_shibuya-1km/design.md` has
 * the full comparison.
 *
 * The entry URL is a two-line redirect: this tileset holds a single child whose
 * content is the real tileset on the asset CDN. `resolvedTilesetUrl` is where that
 * pointed when the pins in `tiles-pins.json` were taken, and the fetch fails
 * loudly rather than quietly following a moved alias, because a different build
 * would invalidate every hash next to it.
 */
export const PLATEAU_3DTILES = Object.freeze({
  entryUrl:
    "https://api.plateauview.mlit.go.jp/datacatalog/3dtiles/13113-bldg-lod2-texture-latest/tileset.json",
  resolvedTilesetUrl:
    "https://assets.cms.plateau.reearth.io/assets/16/b016d3-42ef-4428-ad99-d229310b39fd/13113_shibuya-ku_pref_2025_citygml_1_op_bldg_3dtiles_13113_shibuya-ku_lod2/tileset.json",
  /** Where the mirror lands under `data/`. */
  root: "3dtiles/bldg-lod2",
  note:
    "PLATEAU 3D Tiles, Shibuya-ku FY2025 buildings, LOD2 with texture. 730 content tiles in a " +
    "five-level REPLACE hierarchy; 67 of them intersect the area of interest. Despite the name " +
    "the set also carries the ward's LOD1 buildings, in untextured tiles of their own.",
});

const [southWest, southEast, northWest, northEast] = AOI_MESH_CODES.level3;

/**
 * The archive members the AOI needs — about 280 MiB stored of the 619 MiB zip.
 *
 * `bldg` is the buildings, `dem` the terrain TIN, `tran` the road surfaces, `frn`
 * the street furniture. Only two of the four cells have an `frn` file at all;
 * that is the dataset, not a mistake here.
 *
 * `codelists` is not optional. Without it `bldg:usage` and the road function
 * codes are bare integers.
 */
export const PLATEAU_AOI_MEMBERS: readonly string[] = [
  ...AOI_MESH_CODES.level3.map((mesh) => `udx/bldg/${mesh}_bldg_6697_op.gml`),
  ...AOI_MESH_CODES.level3.map((mesh) => `udx/bldg/${mesh}_bldg_6697_appearance/*`),
  `udx/dem/${AOI_MESH_CODES.level2}_dem_6697_op.gml`,
  ...AOI_MESH_CODES.level3.map((mesh) => `udx/tran/${mesh}_tran_6697_op.gml`),
  `udx/frn/${southEast}_frn_6697_op.gml`,
  `udx/frn/${northEast}_frn_6697_op.gml`,
  ...AOI_MESH_CODES.level3.map((mesh) => `udx/brid/${mesh}_brid_6697_op.gml`),
  `udx/veg/${northEast}_veg_6697_op.gml`,
  `udx/veg/${northEast}_veg_6697_appearance/*`,
  `udx/ubld/${northEast}_ubld_6697_op.gml`,
  "codelists/*",
  "metadata/*",
];

/** Named so the unused-binding check does not fire on the destructure above. */
export const AOI_MESH_QUADRANTS = Object.freeze({
  southWest,
  southEast,
  northWest,
  northEast,
});

/**
 * OpenStreetMap, via Overpass. Plan item 6.
 *
 * Two operational notes that cost time if unknown. `overpass-api.de` answers 406
 * to any User-Agent containing a parenthesised comment, which is exactly the
 * format OSM convention asks for, and 406 is documented as meaning "rate
 * limited" — so it misleads twice. And the response is not pinnable by hash:
 * OSM changes daily, so provenance is the `osm3s.timestamp_osm_base` field the
 * script records instead.
 */
export const OVERPASS = Object.freeze({
  endpoint: "https://overpass-api.de/api/interpreter",
  userAgent: "maps-shibuya-1km/0.1",
  responsePath: "osm/shibuya-aoi.osm.json",
  queryPath: "osm/shibuya-aoi.overpassql",
});

export interface TileDownload {
  path: string;
  url: string;
  layer: string;
  zoom: number;
  x: number;
  y: number;
}

/**
 * GSI elevation tiles, for the cross-check only. Plan item 7.
 *
 * Terrain comes from PLATEAU's own 2.5 m TIN, which is in the archive above, in
 * the same CRS and on the same vertical datum as the buildings. GSI is here to
 * answer one question — does an independent survey agree with that TIN — and
 * `test/elevation.test.ts` is where the answer is checked.
 *
 * These are the PNG tiles, not the `.txt` ones: the text form has been frozen
 * since October 2024 and now disagrees with the PNG by up to 3.10 m while the
 * specification still claims they are identical.
 */
export const GSI_TILES: readonly TileDownload[] = [
  {
    path: "gsi/dem5a_15_29099_12905.png",
    url: "https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29099/12905.png",
    layer: "dem5a_png",
    zoom: 15,
    x: 29099,
    y: 12905,
  },
  {
    path: "gsi/dem1a_17_116399_51622.png",
    url: "https://cyberjapandata.gsi.go.jp/xyz/dem1a_png/17/116399/51622.png",
    layer: "dem1a_png",
    zoom: 17,
    x: 116399,
    y: 51622,
  },
];
