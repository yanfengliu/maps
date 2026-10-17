/** Own parsed resources across the installed parser's pre-accounting boundary.
 * Each parse has a private staging tile. A fulfilled parse explicitly transfers
 * its scene to the original tile; rejection/cancellation never transfers it. */
import { BufferGeometry, Material, Mesh, Texture, type Object3D } from "three";
import type { Tile } from "3d-tiles-renderer/core";
import type { TilesRenderer } from "3d-tiles-renderer";
import type { FacadeTextureLifetime } from "./facade-textures.js";

class ParsedResources implements FacadeTextureLifetime {
  readonly geometries = new Set<BufferGeometry>();
  readonly materials = new Set<Material>();
  readonly textures = new Set<Texture>();
  private readonly released = new Set<object>();
  private readonly cleanups = new Set<() => void>();
  onRelease(cleanup: () => void): void { this.cleanups.add(cleanup); }
  capture(root: Object3D): void {
    root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      for (const material of [...(Array.isArray(object.material) ? object.material : [object.material]), object.customDepthMaterial, object.customDistanceMaterial]) {
        if (!material) continue;
        this.materials.add(material);
        for (const value of Object.values(material)) if (value instanceof Texture) this.trackTexture(value);
      }
    });
  }
  trackTexture(texture: Texture): void { this.textures.add(texture); }
  releaseTexture(texture: Texture): void {
    // A source map may also remain in another slot on a retained material.
    if ([...this.materials].some(material => Object.values(material).includes(texture))) return;
    this.disposeTexture(texture);
  }
  private disposeTexture(texture: Texture): void {
    if (this.released.has(texture)) return;
    this.released.add(texture);
    // Distinct texture views can refer to the same parser-owned bitmap.
    const images: unknown[] = Array.isArray(texture.image) ? texture.image : [texture.image];
    for (const image of images) if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap && !this.released.has(image) && ![...this.textures].some(other => !this.released.has(other) && (Array.isArray(other.image) ? other.image : [other.image]).includes(image))) {
      this.released.add(image); image.close();
    }
    texture.dispose();
  }
  release(): void {
    for (const cleanup of this.cleanups) { this.cleanups.delete(cleanup); cleanup(); }
    for (const texture of this.textures) this.disposeTexture(texture);
    for (const resource of [...this.geometries, ...this.materials]) if (!this.released.has(resource)) {
      this.released.add(resource); resource.dispose();
    }
  }
}

type Engine = { scene?: Object3D | null; metadata?: unknown; geometry?: BufferGeometry[] | null; materials?: Material[] | null; textures?: Texture[] | null };
type ParsedTile = Tile & { engineData: Engine };
type Parser = { parseTile(buffer: ArrayBuffer, tile: Tile, extension: string, url: string, signal: AbortSignal): Promise<void>; disposeTile(tile: Tile): void };
interface Pending { original: Tile; resources: ParsedResources; scene?: Object3D; commit?: () => void }

export function installTileTransactions(tiles: TilesRenderer, disposed: () => boolean): {
  process(scene: Object3D, tile: Tile, work: (original: Tile, lifetime: FacadeTextureLifetime, capture: (root: Object3D) => void) => Promise<() => void>): Promise<void>;
} {
  const renderer = tiles as unknown as Parser;
  const parse = renderer.parseTile.bind(tiles), dispose = renderer.disposeTile.bind(tiles);
  const pending = new WeakMap<Tile, Pending>(), transferred = new WeakMap<Tile, ParsedResources>();
  renderer.parseTile = async (buffer, tile, extension, url, signal) => {
    // Isolate simultaneous old/new attempts for one tile. Never publish an
    // aborted attempt into its successor's engineData or section bookkeeping.
    const original = tile as ParsedTile;
    const staged = { ...tile, engineData: { ...original.engineData, scene: null, geometry: null, materials: null, textures: null, metadata: null } } as ParsedTile;
    const item: Pending = { original: tile, resources: new ParsedResources() };
    pending.set(staged, item);
    try {
      // Upstream cancellation releases only textures and repeats shared ones.
      // Keep its private transaction live, then settle the real signal here.
      await parse(buffer, staged, extension, url, new AbortController().signal);
      if (!item.scene || staged.engineData.scene !== item.scene) throw new Error(`Building tile ${url} completed without its owned parsed scene.`);
      item.resources.capture(item.scene);
      if (signal.aborted || disposed()) return;
      if (original.engineData.scene) throw new Error(`Building tile ${url} cannot replace an undisposed parsed scene.`);
      item.scene.traverse(object => { object.userData.tile = tile; });
      Object.assign(original.engineData, { scene: item.scene, metadata: staged.engineData.metadata,
        geometry: [...item.resources.geometries], materials: [...item.resources.materials], textures: [...item.resources.textures] });
      transferred.set(tile, item.resources);
      item.commit?.();
    } finally {
      pending.delete(staged);
      if (transferred.get(tile) !== item.resources) {
        if (item.scene) item.resources.capture(item.scene);
        item.resources.release(); item.scene?.removeFromParent(); item.scene?.clear();
      }
    }
  };
  renderer.disposeTile = tile => {
    const resources = transferred.get(tile);
    if (resources) {
      transferred.delete(tile); resources.release();
      // Let the installed renderer retain its visibility/metadata/event cleanup,
      // but it must not repeat disposal of our unique resource union.
      Object.assign((tile as ParsedTile).engineData, { geometry: [], materials: [], textures: [] });
    }
    dispose(tile);
  };
  return { async process(scene, tile, work) {
    const item = pending.get(tile);
    if (!item) throw new Error(`Building tile ${tile.content?.uri ?? "unknown"} was processed outside its parse transaction.`);
    item.scene = scene; item.resources.capture(scene);
    if (disposed()) return;
    item.commit = await work(item.original, item.resources, root => item.resources.capture(root));
  } };
}
