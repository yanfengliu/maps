/**
 * The area of interest, in one place.
 *
 * Plan item 4. Every phase that clips, fetches, tiles or culls reads the box from
 * here rather than restating the numbers, because a box restated in three files
 * is three boxes as soon as one of them is edited.
 *
 * The world frame in `frame.ts` sits on top of this: the AOI centre *is* the
 * world origin, so `ORIGIN_WGS84` there is this file's `AOI_CENTRE_WGS84`.
 *
 * The projected numbers below were measured, not assumed — see
 * `docs/work/0_shibuya-1km/design.md` for where each one comes from, and
 * `test/aoi.test.ts` for the check that recomputes them from the projection
 * rather than trusting the constants.
 */

/** Degrees of latitude and longitude, WGS84 / JGD2011 — the same to well under a metre here. */
export interface GeographicPoint {
  latitude: number;
  longitude: number;
}

/**
 * The 1 km box, in degrees.
 *
 * It covers Hachikō Square, Shibuya 109, Center Gai, Shibuya Scramble Square,
 * Miyashita Park and lower Dōgenzaka.
 */
export const AOI_BOUNDS_WGS84 = Object.freeze({
  south: 35.655,
  north: 35.664,
  west: 139.695,
  east: 139.706,
});

/** The centre of the box, which is the Shibuya Scramble Crossing and the world origin. */
export const AOI_CENTRE_WGS84: Readonly<GeographicPoint> = Object.freeze({
  latitude: 35.6595,
  longitude: 139.7005,
});

/**
 * How big the box actually is once projected, in metres.
 *
 * A 0.009° by 0.011° box is only nominally 1 km. Projected into EPSG:6677 it
 * measures 997.1 m north to south and 997.3 m east to west, so anything sizing a
 * grid or a tile budget should use these rather than 1000.
 */
export const AOI_EXTENT_M = Object.freeze({
  northSouth: 997.1,
  eastWest: 997.3,
});

/**
 * The AOI centre in JGD2011 / Japan Plane Rectangular CS IX (EPSG:6677), metres.
 *
 * This is the local origin the offline pipeline subtracts, so nothing carrying a
 * global coordinate reaches the browser. That CRS is northing-first — it calls
 * the northing X and the easting Y — which is why the fields are named and not
 * ordered.
 *
 * Height is zero on purpose: PLATEAU heights are orthometric metres above Tokyo
 * Bay mean sea level, and leaving the origin at zero keeps scene Y readable as a
 * real elevation. Ground at the crossing is about 15.2 m.
 */
export const AOI_ORIGIN_EPSG6677 = Object.freeze({
  northing: -37768.561,
  easting: -12026.817,
  height: 0,
});

/**
 * The JIS X 0410 grid squares the AOI needs, which is how PLATEAU names its files.
 *
 * The AOI straddles four 1 km cells. The 10 km cell is what the terrain file is
 * named by — one `533935_dem_6697_op.gml` covers the whole box.
 */
export const AOI_MESH_CODES = Object.freeze({
  /** 80 km cell. */
  level1: "5339",
  /** 10 km cell — names the single DEM file. */
  level2: "533935",
  /** 1 km cells — name the building, road and furniture files. */
  level3: Object.freeze(["53393585", "53393586", "53393595", "53393596"] as const),
});

/**
 * The bbox string Overpass wants, which is south, west, north, east.
 *
 * Overpass orders it differently from almost everything else, so it is written
 * once here instead of being reassembled at each call site.
 */
export const AOI_OVERPASS_BBOX = `${AOI_BOUNDS_WGS84.south.toFixed(4)},${AOI_BOUNDS_WGS84.west.toFixed(4)},${AOI_BOUNDS_WGS84.north.toFixed(4)},${AOI_BOUNDS_WGS84.east.toFixed(4)}`;

/** Whether a geographic point falls inside the box. Edges count as inside. */
export function isInsideAoi(point: GeographicPoint): boolean {
  return (
    point.latitude >= AOI_BOUNDS_WGS84.south &&
    point.latitude <= AOI_BOUNDS_WGS84.north &&
    point.longitude >= AOI_BOUNDS_WGS84.west &&
    point.longitude <= AOI_BOUNDS_WGS84.east
  );
}
