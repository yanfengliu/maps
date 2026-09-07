/**
 * The 3D Tiles tileset: which tiles the area of interest needs, and how to say
 * where they are once they are in the world frame.
 *
 * MLIT publishes Shibuya-ku as a five-level `REPLACE` hierarchy of 730 content
 * tiles whose bounding volumes are `region`s — longitude, latitude and
 * **ellipsoidal** height. 67 of those intersect the AOI. That hierarchy is plan
 * item 12's culling and LOD unit, already built and already carrying meaningful
 * geometric errors, which is why this pipeline clips it rather than rebuilding it.
 *
 * Two conversions happen here.
 *
 * **Clip.** A tile is kept when its own content bounding volume overlaps the AOI
 * box. Parents are kept whenever any descendant is, because a `REPLACE` hierarchy
 * without its parents has no coarse level to show and would pop the whole city in
 * at once.
 *
 * **Reframe.** `region` is replaced by `box`, the 3D Tiles oriented-box form, in
 * world metres. That is what lets the browser side hold no global coordinate at
 * all: the renderer culls and picks levels of detail in the same metres the scene
 * is drawn in.
 */

import { AOI_BOUNDS_WGS84 } from "../../src/world/aoi.ts";
import { ecefToWorld, geodeticToEcef, type WorldPoint } from "../geo/ecef.ts";

export interface BoundingVolume {
  region?: number[];
  box?: number[];
  sphere?: number[];
}

export interface TileContent {
  uri: string;
  boundingVolume?: BoundingVolume;
}

export interface TilesetTile {
  boundingVolume: BoundingVolume;
  geometricError: number;
  refine?: "ADD" | "REPLACE";
  transform?: number[];
  content?: TileContent;
  children?: TilesetTile[];
}

export interface Tileset {
  asset: { version: string; [key: string]: unknown };
  properties?: Record<string, unknown>;
  geometricError: number;
  root: TilesetTile;
  [key: string]: unknown;
}

const DEGREES_PER_RADIAN = 180 / Math.PI;

/** Where a tile sits, in the degrees the AOI box is stated in. */
export interface RegionDegrees {
  west: number;
  south: number;
  east: number;
  north: number;
  minimumHeight: number;
  maximumHeight: number;
}

export function regionToDegrees(region: readonly number[]): RegionDegrees {
  if (region.length !== 6) {
    throw new Error(
      `A 3D Tiles region has six numbers — west, south, east, north, minimum and maximum height. ` +
        `This one has ${region.length}: ${JSON.stringify(region)}.`,
    );
  }
  return {
    west: region[0]! * DEGREES_PER_RADIAN,
    south: region[1]! * DEGREES_PER_RADIAN,
    east: region[2]! * DEGREES_PER_RADIAN,
    north: region[3]! * DEGREES_PER_RADIAN,
    minimumHeight: region[4]!,
    maximumHeight: region[5]!,
  };
}

/** Whether a tile's region overlaps the area of interest at all. */
export function overlapsAoi(region: readonly number[]): boolean {
  const { west, south, east, north } = regionToDegrees(region);
  return !(
    east < AOI_BOUNDS_WGS84.west ||
    west > AOI_BOUNDS_WGS84.east ||
    north < AOI_BOUNDS_WGS84.south ||
    south > AOI_BOUNDS_WGS84.north
  );
}

export interface SelectedTile {
  /** Content URI exactly as the tileset states it. */
  uri: string;
  /** How deep in the hierarchy, root being 0. */
  depth: number;
  /**
   * Whether this tile has no children.
   *
   * The hierarchy refines by `REPLACE`, so a tile with children holds a decimated
   * stand-in for what its children hold in full — a tower reduced to twenty-four
   * vertices at the root. Only a leaf carries the survey geometry, and anything
   * measuring geometry rather than counting tiles has to know which it has.
   */
  isLeaf: boolean;
  geometricError: number;
  region: number[];
}

/**
 * Walk a tileset and pick out the tiles the AOI needs.
 *
 * The returned list is in traversal order, which is coarse first, so a caller
 * downloading them gets something showable early.
 */
export function selectAoiTiles(tileset: Tileset): SelectedTile[] {
  const selected: SelectedTile[] = [];

  const walk = (tile: TilesetTile, depth: number): void => {
    const region = tile.content?.boundingVolume?.region ?? tile.boundingVolume.region;
    if (region === undefined) {
      throw new Error(
        "A tile in this tileset has no `region` bounding volume. MLIT's PLATEAU build states every " +
          "tile as a region, so a tileset without one is a different build and the clip below " +
          "would silently keep everything.",
      );
    }
    if (tile.content !== undefined && overlapsAoi(region)) {
      selected.push({
        uri: tile.content.uri,
        depth,
        isLeaf: (tile.children ?? []).length === 0,
        geometricError: tile.geometricError,
        region: [...region],
      });
    }
    for (const child of tile.children ?? []) walk(child, depth + 1);
  };

  walk(tileset.root, 0);
  return selected;
}

/**
 * The eight corners of a region, in world metres.
 *
 * `region` heights are ellipsoidal, so the conversion runs through the same
 * geoid-corrected chain the tile placement does and comes out as scene Y —
 * metres above Tokyo Bay mean sea level.
 */
function regionCornersInWorld(region: readonly number[], geoidUndulationM: number): WorldPoint[] {
  const { west, south, east, north, minimumHeight, maximumHeight } = regionToDegrees(region);
  const corners: WorldPoint[] = [];
  for (const latitude of [south, north]) {
    for (const longitude of [west, east]) {
      for (const height of [minimumHeight, maximumHeight]) {
        corners.push(ecefToWorld(geodeticToEcef(latitude, longitude, height), geoidUndulationM));
      }
    }
  }
  return corners;
}

/**
 * A region as an axis-aligned 3D Tiles `box` in world metres.
 *
 * Axis-aligned rather than oriented: over a kilometre the region's own axes and
 * the world frame's differ by the meridian convergence, 0.077 degrees, so an
 * axis-aligned box around the eight converted corners is at most a few tens of
 * centimetres larger than the tightest oriented one. A slightly loose bounding
 * volume makes the renderer occasionally load a tile it did not need; a tight but
 * wrong one makes it cull a tile that was on screen, which is a hole in the city.
 */
export function regionToWorldBox(region: readonly number[], geoidUndulationM: number): number[] {
  const corners = regionCornersInWorld(region, geoidUndulationM);
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
    maxZ = Math.max(maxZ, corner.z);
  }
  return [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
    (maxX - minX) / 2, 0, 0,
    0, (maxY - minY) / 2, 0,
    0, 0, (maxZ - minZ) / 2,
  ];
}

export interface ClipResult {
  tileset: Tileset;
  /** Content URIs kept, in traversal order. */
  uris: string[];
}

/**
 * Prune a tileset to the AOI and restate every bounding volume in world metres.
 *
 * A node is kept when it or any descendant has content overlapping the AOI. The
 * geometric errors, the refinement mode and the content URIs are left exactly as
 * MLIT published them: this step moves the tileset into the world frame and
 * throws away what is out of the box, and changes nothing about how it refines.
 */
export function clipTilesetToAoi(tileset: Tileset, geoidUndulationM: number): ClipResult {
  const uris: string[] = [];

  const rewrite = (tile: TilesetTile): TilesetTile | undefined => {
    const contentRegion = tile.content?.boundingVolume?.region;
    const tileRegion = tile.boundingVolume.region;
    if (tileRegion === undefined) {
      throw new Error("A tile in this tileset has no `region` bounding volume; see selectAoiTiles.");
    }

    const children = (tile.children ?? [])
      .map(rewrite)
      .filter((child): child is TilesetTile => child !== undefined);

    const keepContent =
      tile.content !== undefined && overlapsAoi(contentRegion ?? tileRegion);
    if (!keepContent && children.length === 0) return undefined;

    const rebuilt: TilesetTile = {
      boundingVolume: { box: regionToWorldBox(tileRegion, geoidUndulationM) },
      geometricError: tile.geometricError,
    };
    if (tile.refine !== undefined) rebuilt.refine = tile.refine;
    if (keepContent && tile.content !== undefined) {
      uris.push(tile.content.uri);
      rebuilt.content = { uri: tile.content.uri };
      if (contentRegion !== undefined) {
        rebuilt.content.boundingVolume = {
          box: regionToWorldBox(contentRegion, geoidUndulationM),
        };
      }
    }
    if (children.length > 0) rebuilt.children = children;
    return rebuilt;
  };

  const root = rewrite(tileset.root);
  if (root === undefined) {
    throw new Error(
      "Clipping this tileset to the area of interest kept nothing at all. Either the tileset does " +
        "not cover Shibuya or the AOI in `src/world/aoi.ts` has moved away from it.",
    );
  }

  return {
    tileset: {
      // `gltfUpAxis: "z"` is the whole reason the tiles below can be plain glTF.
      //
      // 3D Tiles content is Y-up by default, and a runtime is expected to rotate
      // it into the Z-up frame the tile transforms live in — `3d-tiles-renderer`
      // does exactly that, from this very field. This pipeline has already folded
      // that rotation into each tile's own root node matrix, along with the
      // projection, so the tiles arrive Z-up and the runtime must not turn them
      // again. Saying so here is what stops it: leaving the field out cost a run
      // where every building lay on its side at a convincing angle, because the
      // rotation was applied twice and the offline reconciliation, which used the
      // composed matrix, had no way to see it.
      asset: { ...tileset.asset, gltfUpAxis: "z" },
      ...(tileset.properties === undefined ? {} : { properties: tileset.properties }),
      geometricError: tileset.geometricError,
      root,
    },
    uris,
  };
}
