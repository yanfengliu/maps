/**
 * Emissive signage and neon. Plan item 16, the highest-value item in the plan.
 *
 * Shibuya is defined by illuminated signage and **PLATEAU structurally cannot
 * supply it**: there is no emissive channel anywhere in the dataset, at any level
 * of detail. Every lit sign in this scene is therefore either derived from the
 * albedo or authored by hand, and this file keeps the two apart so that nobody
 * later mistakes one for the other.
 *
 * ## Source colour — modulation inside admitted panels
 *
 * `writeSignMask` runs over every facade atlas as it loads, at the same moment as
 * the de-lighting of item 35, and writes a per-pixel mask into the texture's
 * **alpha channel**. Every material in these tiles is `alphaMode: OPAQUE` — all
 * 132 of them, checked against the built tiles — so the channel is unused and the
 * mask costs no extra texture memory. The shader may use this colour candidate
 * only after facade-emission.ts admits an explicitly source-bound sign polygon.
 *
 * Brightness and saturation cannot distinguish a sign from a cyan photographic
 * wall or pale roof fascia. Candidate 5 visibly made those surfaces glow. The
 * colour mask is not a detector, and its atlas coverage is not emitted area.
 *
 * Eligibility requires source tile bytes, GML identity, normalized UV0, observed
 * plane and outward normal. Other photographic surfaces have zero emission.
 *
 * Illumination is authored; PLATEAU supplies no surveyed emissive channel. The
 * first registry covers three observed sign interiors, not the whole city.
 *
 * ## Authored — the hero boards and the street-level light
 *
 * `createAuthoredSignage` places a small number of emissive panels and warm point
 * lights **by hand**, in world metres, tuned by looking at the rendered frame.
 * They are not derived from anything. The positions in `HERO_BOARDS` were chosen
 * against the building index — `渋谷駅` at (93, 126), `マークシティ` at (-169, 137)
 * and the Hachikō-mae police box at (64, 48) fix the compass — and then moved
 * until they sat on a facade in the plaza frames.
 *
 * They carry no wordmark, no logo and no brand. A board here is an abstract lit
 * panel: colour fields and horizontal light rows, which is what a real board
 * looks like from across a street once you stop being able to read it.
 */

import {
  BoxGeometry,
  CanvasTexture,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Vector3,
  Matrix3,
  SRGBColorSpace,
  type Texture,
  type Object3D,
} from "three";

import { createRng, DEFAULT_SEED } from "../world/rng.js";
import type { TimeOfDayLighting } from "./time-of-day.js";

// ---------------------------------------------------------------------------
// Derived: the mask taken off the albedo.
// ---------------------------------------------------------------------------

export interface SignMaskSettings {
  /** HSV saturation where the strong term starts and where it saturates. */
  saturationLow: number;
  saturationHigh: number;
  /** HSV value where the strong term starts and where it saturates. */
  valueLow: number;
  valueHigh: number;
  /** HSV value band for the weaker near-white term, which catches LED panels. */
  whiteLow: number;
  whiteHigh: number;
  /** How much of the mask the near-white term may contribute, 0-1. */
  whiteWeight: number;
}

/**
 * The thresholds this project ships.
 *
 * Set from `SignMaskDistribution`, which is measured over every atlas in the
 * scene and published in the sweep manifest, and then moved against the plaza
 * frames until the street looked like a street rather than a fairground. The
 * colour-candidate coverage in `SignMaskStats` no longer estimates signage
 * area; the admitted source polygons make that separate decision.
 *
 * The first attempt asked for saturation above 0.34 with value above 0.42 and
 * selected three pixels in a million, which is why the measurement exists.
 */
export const PLATEAU_SIGN_MASK: SignMaskSettings = Object.freeze({
  saturationLow: 0.16,
  saturationHigh: 0.34,
  valueLow: 0.3,
  valueHigh: 0.55,
  whiteLow: 0.76,
  whiteHigh: 0.94,
  whiteWeight: 0.3,
});

export interface SignMaskStats {
  /** Pixels the mask was written over. */
  pixels: number;
  /** Mean mask value, 0-1. */
  meanMask: number;
  /** Fraction above a half before spatial eligibility; not actual glowing area. */
  coverage: number;
}

/** Saturation thresholds the coverage table is reported at. */
export const COVERAGE_SATURATIONS: readonly number[] = Object.freeze([
  0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5,
]);

/** Value thresholds the coverage table is reported at. */
export const COVERAGE_VALUES: readonly number[] = Object.freeze([
  0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
]);

/**
 * The joint distribution of saturation and brightness over every atlas.
 *
 * This is the evidence behind `PLATEAU_SIGN_MASK`, and it is kept rather than
 * thrown away after the thresholds were chosen. Without it the numbers in that
 * constant are a guess that happens to look right, and the first guess made here
 * was wrong by four orders of magnitude: saturation above 0.34 and value above
 * 0.42 together selected **three pixels in a million**, so the derived signage
 * did not exist and the dusk frame had no neon in it at all.
 *
 * `coverageTable` reads as: what fraction of facade pixels are at least this
 * saturated and at least this bright. Rows are `COVERAGE_SATURATIONS`, columns
 * are `COVERAGE_VALUES`, values are parts per million.
 */
export class SignMaskDistribution {
  /** 32 saturation bins by 32 value bins. */
  private readonly bins = new Float64Array(32 * 32);
  private samples = 0;

  add(pixels: Uint8ClampedArray | Uint8Array, stride = 7): void {
    const pixelCount = Math.floor(pixels.length / 4);
    for (let index = 0; index < pixelCount; index += stride) {
      const offset = index * 4;
      const r = pixels[offset]!;
      const g = pixels[offset + 1]!;
      const b = pixels[offset + 2]!;
      const max = r > g ? (r > b ? r : b) : g > b ? g : b;
      const min = r < g ? (r < b ? r : b) : g < b ? g : b;
      const value = max / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;
      const sBin = Math.min(31, Math.floor(saturation * 32));
      const vBin = Math.min(31, Math.floor(value * 32));
      this.bins[sBin * 32 + vBin]! += 1;
      this.samples += 1;
    }
  }

  /** Parts per million at or above each (saturation, value) pair. */
  coverageTable(): number[][] {
    if (this.samples === 0) return COVERAGE_SATURATIONS.map(() => COVERAGE_VALUES.map(() => 0));
    return COVERAGE_SATURATIONS.map((saturation) =>
      COVERAGE_VALUES.map((value) => {
        const sFrom = Math.min(31, Math.floor(saturation * 32));
        const vFrom = Math.min(31, Math.floor(value * 32));
        let count = 0;
        for (let sBin = sFrom; sBin < 32; sBin += 1) {
          for (let vBin = vFrom; vBin < 32; vBin += 1) count += this.bins[sBin * 32 + vBin]!;
        }
        return Math.round((count / this.samples) * 1e6);
      }),
    );
  }
}

/**
 * Write the derived sign mask into the alpha channel of an RGBA buffer.
 *
 * **Run this before `delightInPlace`, never after.** The mask keys on how bright
 * and how saturated a pixel is relative to a daylight photograph, and de-lighting
 * deliberately compresses exactly that contrast: run afterwards, the same
 * thresholds find a third as much and find it in the wrong places.
 */
export function writeSignMask(
  pixels: Uint8ClampedArray | Uint8Array,
  settings: SignMaskSettings = PLATEAU_SIGN_MASK,
): SignMaskStats {
  let maskSum = 0;
  let strong = 0;
  let count = 0;

  for (let offset = 0; offset < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const max = r > g ? (r > b ? r : b) : g > b ? g : b;
    const min = r < g ? (r < b ? r : b) : g < b ? g : b;
    const value = max / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;

    const coloured =
      smoothstep(settings.saturationLow, settings.saturationHigh, saturation) *
      smoothstep(settings.valueLow, settings.valueHigh, value);
    const white = smoothstep(settings.whiteLow, settings.whiteHigh, value) * settings.whiteWeight;
    const mask = coloured > white ? coloured : white;

    pixels[offset + 3] = Math.round(mask * 255);
    maskSum += mask;
    if (mask > 0.5) strong += 1;
    count += 1;
  }

  return {
    pixels: count,
    meanMask: count === 0 ? 0 : maskSum / count,
    coverage: count === 0 ? 0 : strong / count,
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Authored: hero boards and street-level light.
// ---------------------------------------------------------------------------

export interface HeroBoard {
  name: string;
  /** Metres east of the crossing. */
  x: number;
  /** Metres above Tokyo Bay mean sea level, at the centre of the board. */
  y: number;
  /** Metres south of the crossing. */
  z: number;
  widthM: number;
  heightM: number;
  /** Degrees clockwise from north, the direction the board faces. */
  facingDegrees: number;
  /** Base colour, sRGB hex. */
  colour: number;
  /** Emissive radiance multiplier at full signage intensity. */
  radiance: number;
  /** Which of the generated board faces to use. */
  style: BoardStyle;
}

export type BoardStyle = "rows" | "block" | "column";

/**
 * The authored boards. Hand-placed; not derived from any dataset.
 *
 * The crossing is the world origin, +X is east and +Z is south. `渋谷駅` sits at
 * (93, 126) and the Hachikō-mae police box at (64, 48), so the station side is
 * east and south-east, Centre Gai runs away to the north-west, and Dōgenzaka
 * climbs to the west. Each board is put a couple of metres proud of a **named
 * building in the scene index** — the 45.9 m block at (-12.3, -43.2), the 34.2 m
 * one at (38.8, -40.4) and the 35.1 m one at (-53.2, 33.0) — so the compass and
 * the heights are real even though the placement is by hand.
 *
 * **They are deliberately dim.** The first version ran them at radiance 2.2 to
 * 3.4, which is three to five times the bloom threshold at dusk: each board came
 * out as a blown white rectangle with a halo across half the frame, and the
 * eye-level frame was unusable. At 0.6 to 0.85 a board is a lit panel that blooms
 * a little at its edges, which is what one looks like from across a street.
 *
 * Additive blending is what makes a hand-placed board forgiving. A board that
 * ends up floating two metres off its facade reads as a glow in about the right
 * place rather than as a rectangle hanging in mid-air, and nothing here knows the
 * footprints — the building index carries centroids and heights, not extents.
 */
export const HERO_BOARDS: readonly HeroBoard[] = Object.freeze([
  Object.freeze({
    name: "north face, the 46 m block across the crossing",
    x: -13,
    y: 38,
    z: -31,
    widthM: 14,
    heightM: 9,
    facingDegrees: 160,
    colour: 0x9fd8ff,
    radiance: 0.85,
    style: "rows" as const,
  }),
  Object.freeze({
    name: "north face, lower panel",
    x: -12,
    y: 27,
    z: -31,
    widthM: 12,
    heightM: 5,
    facingDegrees: 160,
    colour: 0xff5a3c,
    radiance: 0.75,
    style: "block" as const,
  }),
  Object.freeze({
    name: "north-east, the 34 m block towards the station",
    x: 30,
    y: 34,
    z: -29,
    widthM: 11,
    heightM: 8,
    facingDegrees: 205,
    colour: 0xffd08a,
    radiance: 0.7,
    style: "rows" as const,
  }),
  Object.freeze({
    name: "west, the 35 m block towards Dogenzaka",
    x: -45,
    y: 40,
    z: 26,
    widthM: 9,
    heightM: 11,
    facingDegrees: 115,
    colour: 0x66ffc2,
    radiance: 0.62,
    style: "column" as const,
  }),
  Object.freeze({
    name: "north-west, above the Centre Gai mouth",
    x: -34,
    y: 26,
    z: -18,
    widthM: 10,
    heightM: 6,
    facingDegrees: 135,
    colour: 0xffa8e0,
    radiance: 0.6,
    style: "block" as const,
  }),
]);

/**
 * Warm lights standing in for shopfronts, at the four corners of the crossing.
 *
 * Authored, and there are four of them because each one costs a term in every
 * lit material's shader and this scene draws half a million triangles on a
 * software rasteriser in the gate. They are what stops the bottom eight metres of
 * every building being solid black at dusk: emissive geometry glows but lights
 * nothing, because there is no global illumination here.
 */
const STREET_LIGHTS: readonly { x: number; y: number; z: number }[] = Object.freeze([
  Object.freeze({ x: -26, y: 24, z: -26 }),
  Object.freeze({ x: 26, y: 24, z: -26 }),
  Object.freeze({ x: -26, y: 24, z: 26 }),
  Object.freeze({ x: 26, y: 24, z: 26 }),
]);

/** Colour of that light: a Tokyo street at dusk is warm white, not orange. */
const STREET_LIGHT_COLOUR = 0xffd9b0;

/**
 * Candela at full signage intensity, with quadratic decay out to the range below.
 *
 * three.js in physical mode gives a point light an irradiance of
 * `intensity / distance^2`, so this number has to be read against the sun's, which
 * peaks at about 3.1 in the same units. 70 puts 0.31 on a wall 15 m away and 0.019
 * on one 60 m away, keeping the authored fill subordinate to the environment.
 *
 * The first value here was 9,000, chosen with no such arithmetic behind it. That
 * is 22 of irradiance at 20 m — seven times the midday sun — and it turned the
 * whole eye-level frame white.
 */
const STREET_LIGHT_INTENSITY = 70;
const STREET_LIGHT_RANGE_M = 130;

export interface AuthoredSignage {
  root: Group;
  apply(lighting: TimeOfDayLighting): void;
  /** What was authored, for the harness and for anyone auditing the claim. */
  counts: { boards: number; lights: number };
  mount(buildings: Object3D): void;
  dispose(): void;
}

export function createAuthoredSignage(seed: number = DEFAULT_SEED): AuthoredSignage {
  const root = new Group();
  root.name = "signage:authored";

  const rng = createRng(seed);
  const textures = new Map<BoardStyle, Texture>();
  const materials: MeshBasicMaterial[] = [];
  const baseRadiance: number[] = [];
  const boards: Group[] = [];

  for (const board of HERO_BOARDS) {
    let texture = textures.get(board.style);
    if (texture === undefined) {
      texture = boardTexture(board.style, rng);
      textures.set(board.style, texture);
    }

    const material = new MeshBasicMaterial({
      map: texture,
      color: new Color(board.colour),
      // Opaque framed panel: its dark face belongs to the mounted object, while
      // the emissive texture remains below the old overexposed rectangle level.
      depthWrite: true,
      side: FrontSide,
      toneMapped: true,
      transparent: false,
    });
    materials.push(material);
    baseRadiance.push(board.radiance * 0.45);

    const mesh = new Mesh(new PlaneGeometry(board.widthM, board.heightM), material);
    mesh.name = `signage:board:${board.name}`;
    const mount = new Group();
    const back = new Mesh(new BoxGeometry(board.widthM + 0.25, board.heightM + 0.25, 0.22), new MeshBasicMaterial({ color: 0x161a20 }));
    back.position.z = -0.13;
    mount.add(back, mesh);
    mount.position.set(board.x, board.y, board.z);
    // A plane's normal is +Z before rotation, and +Z is south, so a board facing
    // due south needs no turn at all. Azimuth grows clockwise from north, which
    // is a left-handed turn about Y in this frame.
    mount.rotation.y = ((180 - board.facingDegrees) * Math.PI) / 180;
    mount.visible = false;
    boards.push(mount);
    root.add(mount);
  }

  const lights: PointLight[] = [];
  for (const position of STREET_LIGHTS) {
    const light = new PointLight(STREET_LIGHT_COLOUR, 0, STREET_LIGHT_RANGE_M, 2);
    light.name = "signage:street-light";
    light.position.set(position.x, position.y, position.z);
    root.add(light);
    lights.push(light);
  }

  return {
    root,
    apply(lighting: TimeOfDayLighting): void {
      const intensity = lighting.signageIntensity;
      for (let index = 0; index < materials.length; index += 1) {
        const radiance = Math.max(lighting.solar.elevationDegrees > 0 ? 0.7 : 0.15, baseRadiance[index]! * intensity);
        materials[index]!.color.setHex(HERO_BOARDS[index]!.colour).multiplyScalar(radiance);
        materials[index]!.visible = true;
      }
      for (const light of lights) {
        light.intensity = STREET_LIGHT_INTENSITY * Math.max(0, intensity - 0.15);
        light.visible = light.intensity > 1;
      }
    },
    counts: { get boards(): number { return boards.filter((board) => board.visible).length; }, lights: STREET_LIGHTS.length },
    mount(buildings: Object3D): void {
      // Fit panels to actual loaded facade planes. A board is hidden until a
      // wall exists behind its whole rectangle; additive glow cannot hide a
      // placement error or a panel that crosses a building corner.
      buildings.updateMatrixWorld(true);
      const surfaces: Object3D[] = [];
      buildings.traverseVisible((object) => { if (object instanceof Mesh) surfaces.push(object); });
      const ray = new Raycaster();
      const normalMatrix = new Matrix3();
      for (let index = 0; index < boards.length; index += 1) {
        const board = HERO_BOARDS[index]!;
        const mount = boards[index]!;
        const origin = new Vector3(0, board.y, 0);
        ray.set(origin, new Vector3(board.x, 0, board.z).normalize());
        ray.near = 4; ray.far = 120;
        const hits = ray.intersectObjects(surfaces, false);
        const hit = hits.find((entry) => entry.face !== null && entry.face !== undefined);
        if (!hit?.face) { mount.visible = false; continue; }
        const normal = hit.face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));
        if (Math.abs(normal.y) > 0.25) { mount.visible = false; continue; }
        if (normal.dot(origin.clone().sub(hit.point)) < 0) normal.negate();
        const tangent = new Vector3(normal.z, 0, -normal.x).normalize();
        let scale = 1;
        let fits = false;
        for (let attempt = 0; attempt < 7; attempt += 1) {
          fits = true;
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
            const corner = hit.point.clone().addScaledVector(tangent, sx * board.widthM * scale * 0.5);
            corner.y += sy * board.heightM * scale * 0.5;
            ray.set(corner.clone().addScaledVector(normal, 1), normal.clone().negate());
            ray.near = 0; ray.far = 1.3;
            const behind = ray.intersectObjects(surfaces, false)[0];
            if (!behind || Math.abs(behind.distance - 1) > 0.25) fits = false;
          }
          if (fits) break;
          scale *= 0.8;
        }
        mount.visible = fits;
        if (!fits) continue;
        mount.position.copy(hit.point).addScaledVector(normal, 0.26);
        mount.rotation.y = Math.atan2(normal.x, normal.z);
        mount.scale.set(scale, scale, 1);
      }
    },
    dispose(): void {
      root.traverse((object) => {
        if (object instanceof Mesh) { object.geometry.dispose(); const list = Array.isArray(object.material) ? object.material : [object.material]; for (const material of list) material.dispose(); }
      });
      for (const texture of textures.values()) texture.dispose();
      root.clear();
    },
  };
}

/**
 * A board's face, drawn procedurally.
 *
 * Seeded from `createRng` like everything else generated in this scene, because
 * the visual gate compares frames across runs and a board that reshuffles itself
 * would make the gate measure the shuffle.
 */
function boardTexture(style: BoardStyle, rng: () => number): CanvasTexture {
  const width = 256;
  const height = style === "column" ? 512 : 160;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error(
      "A 2D canvas context was refused, so the authored signage boards cannot be drawn. " +
        "This needs a browser with 2D canvas; the scene renders without the boards otherwise.",
    );
  }

  context.fillStyle = "#102a40";
  context.fillRect(0, 0, width, height);

  if (style === "rows") {
    // Horizontal light rows, which is what a video board looks like once it is
    // too far away to read.
    const rows = 7;
    for (let row = 0; row < rows; row += 1) {
      const y = (row / rows) * height;
      const rowHeight = (height / rows) * (0.45 + 0.4 * rng());
      context.fillStyle = `rgba(150,218,242,${(0.10 + 0.14 * rng()).toFixed(3)})`;
      context.fillRect(0, y, width, rowHeight);
      // A few dark gaps, so the rows do not read as a single flat panel.
      const gaps = 2 + Math.floor(rng() * 3);
      for (let gap = 0; gap < gaps; gap += 1) {
        const gapX = rng() * width;
        context.fillStyle = "rgba(0,0,0,0.75)";
        context.fillRect(gapX, y, 6 + rng() * 22, rowHeight);
      }
    }
    context.fillStyle = "#e8f2ef";
    context.font = "bold 42px sans-serif";
    context.fillText("SHIBUYA", 20, 76);
    context.font = "18px sans-serif";
    context.fillText("CITY / LIGHT / PEOPLE", 22, 106);
  } else if (style === "block") {
    context.fillStyle = "#ac3357";
    context.fillRect(0, 0, width, height);
    const bands = 3;
    for (let band = 0; band < bands; band += 1) {
      const y = rng() * height;
      context.fillStyle = "rgba(0,0,0,0.55)";
      context.fillRect(0, y, width, 3 + rng() * 9);
    }
    context.fillStyle = "#ffd49b";
    context.beginPath(); context.arc(193, 54, 38, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#f5ede5";
    context.font = "bold 44px sans-serif";
    context.fillText("TOKYO", 18, 98);
    context.font = "17px sans-serif";
    context.fillText("EVERY DAY, A NEW STORY", 20, 128);
  } else {
    // A vertical projecting signboard: stacked bright cells with dark rules.
    const cells = 7;
    for (let cell = 0; cell < cells; cell += 1) {
      const y = (cell / cells) * height;
      const cellHeight = height / cells;
      context.fillStyle = "#d9e8cd";
      context.font = "bold 48px sans-serif";
      context.textAlign = "center";
      context.fillText("SHIBUYA"[cell]!, width / 2, y + cellHeight * 0.75);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
