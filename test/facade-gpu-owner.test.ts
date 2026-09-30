import { expect, it, vi, afterEach } from "vitest";
import { BoxGeometry, DataTexture, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { PLATEAU_DELIGHT } from "../src/scene/delight.js";
import { writeSignMask } from "../src/scene/signage.js";

function canvasStub() {
  return class {
    constructor(private readonly width: number, private readonly height: number) {}
    getContext() {
      return {
        drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4).fill(127) }),
      };
    }
  };
}

function sceneWithTexture(width = 1, height = 1) {
  const texture = new Texture({ width, height } as never);
  texture.flipY = false;
  const material = new MeshStandardMaterial({ map: texture });
  const geometry = new BoxGeometry();
  const scene = new Group();
  scene.add(new Mesh(geometry, material));
  return { scene, texture, material, geometry };
}

function plugin(delighter: { apply: ReturnType<typeof vi.fn> } | null, isClosed: () => boolean = () => false) {
  return new FacadeTexturePlugin({
    ...DEFAULT_FACADE_OPTIONS,
    patchMaterials: false,
    signageIntensity: { value: 1 },
    style: createFacadeStyle(worldStyle("satellite")),
  }, delighter as never, isClosed);
}

afterEach(() => vi.unstubAllGlobals());

it("writes the original-RGB mask before invoking the injected de-light processor", async () => {
  vi.stubGlobal("OffscreenCanvas", canvasStub());
  const source = new Uint8ClampedArray([127, 127, 127, 127]);
  const expected = source.slice();
  writeSignMask(expected, DEFAULT_FACADE_OPTIONS.signMask!);
  let observed: Uint8ClampedArray | undefined;
  const delighter = { apply: vi.fn((pixels: Uint8ClampedArray, _width: number, _height: number, settings: typeof PLATEAU_DELIGHT) => {
    observed = pixels.slice();
    expect(settings).toBe(PLATEAU_DELIGHT);
    pixels[0] = 23;
  }) };
  const f = sceneWithTexture();
  const instance = plugin(delighter);
  try {
    await instance.processTileModel(f.scene, { content: { uri: "data/data001.b3dm" } });
    expect(delighter.apply).toHaveBeenCalledOnce();
    expect(observed?.[3]).toBe(expected[3]);
    expect(f.material.map).not.toBe(f.texture);
    expect((f.material.map as Texture & { image: { data: Uint8ClampedArray } }).image.data[0]).toBe(23);
  } finally {
    f.geometry.dispose(); f.material.map?.dispose(); f.texture.dispose(); f.material.dispose();
  }
});

it("keeps the published map when no GPU processor is configured instead of using a CPU fallback", async () => {
  vi.stubGlobal("OffscreenCanvas", canvasStub());
  const f = sceneWithTexture();
  try {
    await expect(plugin(null).processTileModel(f.scene, { content: { uri: "data/data001.b3dm" } }))
      .rejects.toThrow(/requires the buildings-owned GPU processor; no CPU fallback/);
    expect(f.material.map).toBe(f.texture);
  } finally {
    f.geometry.dispose(); f.texture.dispose(); f.material.dispose();
  }
});

it("cancels after awaited resize without calling the GPU processor or adopting an atlas", async () => {
  vi.stubGlobal("OffscreenCanvas", canvasStub());
  let releaseBitmap!: (image: { width: number; height: number; close(): void }) => void;
  const bitmap = new Promise<{ width: number; height: number; close(): void }>(resolve => { releaseBitmap = resolve; });
  vi.stubGlobal("createImageBitmap", vi.fn(() => bitmap));
  let closed = false;
  const delighter = { apply: vi.fn() };
  const f = sceneWithTexture(1025, 1);
  const processing = plugin(delighter, () => closed).processTileModel(f.scene, { content: { uri: "data/data001.b3dm" } });
  await Promise.resolve();
  closed = true;
  let bitmapClosed = false;
  releaseBitmap({ width: 1024, height: 1, close: () => { bitmapClosed = true; } });
  try {
    await expect(processing).rejects.toMatchObject({ name: "AbortError" });
    expect(bitmapClosed).toBe(true);
    expect(delighter.apply).not.toHaveBeenCalled();
    expect(f.material.map).toBe(f.texture);
  } finally {
    f.geometry.dispose(); f.texture.dispose(); f.material.dispose();
  }
});

it("disposes a prepared default-path replacement if a later atlas in the tile fails", async () => {
  vi.stubGlobal("OffscreenCanvas", canvasStub());
  const first = sceneWithTexture();
  const second = sceneWithTexture();
  first.scene.add(second.scene);
  let calls = 0;
  const delighter = { apply: vi.fn(() => { calls += 1; if (calls === 2) throw new Error("controlled GPU failure"); }) };
  const disposeReplacement = vi.spyOn(DataTexture.prototype, "dispose");
  try {
    await expect(plugin(delighter).processTileModel(first.scene, { content: { uri: "data/data001.b3dm" } }))
      .rejects.toThrow(/controlled GPU failure/);
    expect(first.material.map).toBe(first.texture);
    expect(second.material.map).toBe(second.texture);
    expect(disposeReplacement).toHaveBeenCalledOnce();
  } finally {
    first.geometry.dispose(); first.texture.dispose(); first.material.dispose();
    second.geometry.dispose(); second.texture.dispose(); second.material.dispose();
  }
});
