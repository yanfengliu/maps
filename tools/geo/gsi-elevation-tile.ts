/**
 * Reading a height out of a GSI elevation tile.
 *
 * GSI publishes elevation as ordinary XYZ PNG tiles, 256 px, Web Mercator, and
 * packs metres into the RGB triple. This is offline and test-only code: terrain
 * comes from PLATEAU's own TIN, and GSI is here as the independent survey that
 * says whether that TIN is right.
 *
 * Two traps this module exists to keep closed.
 *
 * The encoding is GSI's own and is NOT Mapbox Terrain-RGB and NOT Terrarium. It
 * has a two's-complement branch for land below sea level and a `(128, 0, 0)`
 * no-data sentinel. Decoding it with MapLibre's linear `encoding: "custom"` form
 * reads the sentinel as 83,886 m and a -1.00 m pixel as 167,771 m.
 *
 * And the `.txt` form of the same tiles, which needs no PNG decoding and is
 * therefore tempting, has been frozen since October 2024. It now disagrees with
 * the PNG by up to 3.10 m while the specification still claims the two are
 * identical. Only the PNG is current.
 *
 * Source: https://maps.gsi.go.jp/development/demtile.html
 */

/** Where a geographic point falls in the XYZ tile grid. */
export interface TileAddress {
  zoom: number;
  /** Tile column. */
  x: number;
  /** Tile row. */
  y: number;
  /** Column within the tile, 0-255. */
  pixelX: number;
  /** Row within the tile, 0-255. */
  pixelY: number;
}

export const TILE_SIZE = 256;

/**
 * Locate a latitude and longitude in the Web Mercator tile grid.
 *
 * Spherical Web Mercator, which is what every XYZ tile scheme uses regardless of
 * the datum the data behind it is on. The difference from an ellipsoidal
 * Mercator is metres of northing at this latitude and irrelevant at 3.9 m per
 * pixel, but it is the reason this is written out rather than borrowed from a
 * projection library that would do it ellipsoidally.
 */
export function tileAddress(
  latitudeDegrees: number,
  longitudeDegrees: number,
  zoom: number,
): TileAddress {
  const tiles = 2 ** zoom;
  const latitude = (latitudeDegrees * Math.PI) / 180;

  const gridX = ((longitudeDegrees + 180) / 360) * tiles;
  const gridY =
    ((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * tiles;

  const x = Math.floor(gridX);
  const y = Math.floor(gridY);
  return {
    zoom,
    x,
    y,
    pixelX: Math.min(TILE_SIZE - 1, Math.floor((gridX - x) * TILE_SIZE)),
    pixelY: Math.min(TILE_SIZE - 1, Math.floor((gridY - y) * TILE_SIZE)),
  };
}

/**
 * Turn one RGB triple into metres, or `undefined` where the tile has no data.
 *
 * ```
 * x = 2^16 R + 2^8 G + B,  one unit is 0.01 m
 * x <  2^23  ->  h = x / 100
 * x == 2^23  ->  no data, which is RGB (128, 0, 0)
 * x >  2^23  ->  h = (x - 2^24) / 100, i.e. below sea level
 * ```
 *
 * `undefined` rather than 0 or NaN on purpose: a no-data pixel read as zero is a
 * hole in the terrain at sea level, and this returns something a caller has to
 * handle.
 */
export function decodeElevation(red: number, green: number, blue: number): number | undefined {
  const packed = 65536 * red + 256 * green + blue;
  const sentinel = 2 ** 23;
  if (packed === sentinel) return undefined;
  return (packed < sentinel ? packed : packed - 2 ** 24) / 100;
}

/** Read the height at one pixel of a decoded tile. */
export function elevationAtPixel(
  tile: { width: number; height: number; rgba: Uint8Array },
  pixelX: number,
  pixelY: number,
): number | undefined {
  if (pixelX < 0 || pixelY < 0 || pixelX >= tile.width || pixelY >= tile.height) {
    throw new Error(
      `Pixel (${pixelX}, ${pixelY}) is outside the ${tile.width}x${tile.height} tile. ` +
        "Either the tile address is wrong or the point is not on this tile.",
    );
  }
  const at = (pixelY * tile.width + pixelX) * 4;
  return decodeElevation(tile.rgba[at]!, tile.rgba[at + 1]!, tile.rgba[at + 2]!);
}
