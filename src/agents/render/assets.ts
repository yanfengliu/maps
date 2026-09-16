import { DataTexture, HalfFloatType, NearestFilter, RGBAFormat, Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { AGENT_ASSET_VERSION, type AgentAssetManifest, type VehicleAssetManifest } from "../../world/agent-assets.js";

const loader = new GLTFLoader();

export async function fetchAsset(url: string, sha256?: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Agent asset ${url} returned HTTP ${response.status}. Run npm run data:agents to build the local fleet.`);
  const buffer = await response.arrayBuffer();
  if (sha256) {
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    if (actual !== sha256) throw new Error(`Agent asset ${url} SHA-256 is ${actual}; its manifest requires ${sha256}. Finish the asset build and reload.`);
  }
  return buffer;
}

export async function loadManifest<T extends AgentAssetManifest | VehicleAssetManifest>(url: string): Promise<T> {
  const value = JSON.parse(new TextDecoder().decode(await fetchAsset(url))) as T;
  const expectedVersion = "lods" in value ? AGENT_ASSET_VERSION : 1;
  if (value.version !== expectedVersion || value.units !== "metres" || value.up !== "+Y" || value.forward !== "+Z" || value.yawAxis !== "+Y" || ("lods" in value && value.vatSpace !== "world-baked")) {
    throw new Error(`Agent manifest ${url} must use ${"lods" in value ? "human" : "vehicle"} version ${expectedVersion}, metres, +Y up/yaw and +Z forward${"lods" in value ? ", with world-baked VAT and required drawParts" : ""}. Run npm run data:agents to rebuild the fleet.`);
  }
  return value;
}

export async function loadModel(url: string, digest: string): Promise<GLTF> {
  return loader.parseAsync(await fetchAsset(url, digest), url.slice(0, url.lastIndexOf("/") + 1));
}

export async function loadVat(url: string, digest: string, width: number, height: number): Promise<DataTexture> {
  const bytes = await fetchAsset(url, digest);
  if (bytes.byteLength !== width * height * 8) {
    throw new Error(`Agent texture ${url} has ${bytes.byteLength} bytes; ${width}×${height} RGBA16F needs ${width * height * 8}. Rebuild this asset.`);
  }
  const texture = new DataTexture(new Uint16Array(bytes), width, height, RGBAFormat, HalfFloatType);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Close decoded bitmaps as well as GPU handles, once per shared texture. */
export function disposeTextures(textures: Iterable<Texture>): void {
  for (const texture of new Set(textures)) {
    texture.dispose();
    const bitmap = texture.image as { close?: () => void } | undefined;
    bitmap?.close?.();
  }
}
