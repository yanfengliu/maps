/** Authored rail surface detail. Standard PBR maps only: no vertex shader,
 * displacement, opacity, geometry edits or source-photo processing. */
import { BufferAttribute, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, type BufferGeometry, type MeshStandardMaterial } from "three";
import { createRng } from "../world/rng.js";

type Family = "ballast" | "concrete" | "sleeper" | "steel";
export type RailFinishKind = "rails" | "sleepers" | "supports" | "ballast" | "shaft" | "truss" | "portal";
const families: Record<RailFinishKind, Family> = { rails: "steel", sleepers: "sleeper", supports: "concrete", ballast: "ballast", shaft: "concrete", truss: "steel", portal: "concrete" };
const settings = {
  ballast: { size: 256, metres: [2, 2], contrast: .58, bump: .018, seed: 0x5241494c },
  concrete: { size: 256, metres: [4, 2], contrast: .22, bump: .006, seed: 0x434f4e43 },
  sleeper: { size: 128, metres: [.6, .6], contrast: .25, bump: .003, seed: 0x534c4545 },
  steel: { size: 128, metres: [1, 1], contrast: .13, bump: .0008, seed: 0x53544545 },
} as const;
interface Detail { texture: DataTexture; height: Float32Array; family: Family; satellite: boolean | null; mean: number }
const materialDetails = new WeakMap<MeshStandardMaterial, Detail>();

/** Overlapping angular grains, not a tessellation. Independent footprints,
 * slopes and heights leave broken crevices rather than closed paving outlines.
 * Authored diameters span roughly 20–52 mm on the existing two-metre tile. */
function looseAggregate(size: number, rng: () => number): Float32Array {
  const result = Float32Array.from({ length: size * size }, () => .20 + rng() * .20);
  const pixelsPerMetre = size / 2;
  for (let grain = 0; grain < 12000; grain++) {
    const cx = rng() * size, cy = rng() * size;
    const rx = (.010 + rng() * .016) * pixelsPerMetre, ry = rx * (.45 + rng() * .5);
    const angle = rng() * Math.PI * 2, cosine = Math.cos(angle), sine = Math.sin(angle);
    const cornerA = .55 + rng() * .35, cornerB = .55 + rng() * .35;
    const height = .42 + rng() * .45, slopeX = (rng() - .5) * .22, slopeY = (rng() - .5) * .18;
    const radius = Math.ceil(rx);
    for (let y = Math.floor(cy) - radius; y <= Math.ceil(cy) + radius; y++) for (let x = Math.floor(cx) - radius; x <= Math.ceil(cx) + radius; x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy;
      const u = (dx * cosine + dy * sine) / rx, v = (-dx * sine + dy * cosine) / ry;
      const edge = Math.max(Math.abs(u), Math.abs(v), Math.abs(u + v) * cornerA, Math.abs(u - v) * cornerB);
      if (edge >= 1) continue;
      const bevel = Math.min(1, (1 - edge) / .22);
      const value = .22 + (height + u * slopeX + v * slopeY - .22) * bevel;
      const index = ((y % size + size) % size) * size + ((x % size + size) % size);
      result[index] = Math.max(result[index]!, Math.min(.98, value));
    }
  }
  return result;
}

/** One fixed periodic mineral field, with individually shaded angular stones.
 * Concrete has fine pores and restrained formwork impressions, not slab gaps. */
function heights(family: Family, size: number): Float32Array {
  const rng = createRng(settings[family].seed);
  if (family === "ballast") return looseAggregate(size, rng);
  const result = new Float32Array(size * size), cells = 16;
  const points = Array.from({ length: cells * cells }, () => [rng(), rng(), rng()] as const);
  const at = (x: number, y: number) => points[((y + cells) % cells) * cells + ((x + cells) % cells)]!;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * cells, v = y / size * cells, ix = Math.floor(u), iy = Math.floor(v);
    let first = Infinity, second = Infinity, shade = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const p = at(ix + dx, iy + dy), d = Math.hypot(u - ix - dx - p[0], v - iy - dy - p[1]);
      if (d < first) { second = first; first = d; shade = p[2]; } else second = Math.min(second, d);
    }
    const grain = rng();
    if (family === "concrete") {
      const seam = Math.min(x, size - x, y, size - y) < 1 ? .16 : 0;
      result[y * size + x] = Math.max(0, .35 + shade * .18 + grain * .38 - seam);
    } else if (family === "sleeper") result[y * size + x] = .25 + shade * .18 + grain * .48;
    else result[y * size + x] = .35 + shade * .12 + grain * .30;
  }
  return result;
}

function styleTexture(detail: Detail, satellite: boolean): void {
  if (detail.satellite === satellite) return;
  const bytes = detail.texture.image.data as Uint8Array, contrast = settings[detail.family].contrast * (satellite ? 1 : .28);
  let sum = 0;
  for (let i = 0; i < detail.height.length; i++) {
    const value = Math.round(255 * (1 - contrast + detail.height[i]! * contrast)); sum += value / 255;
    bytes[i * 4] = bytes[i * 4 + 1] = bytes[i * 4 + 2] = value; bytes[i * 4 + 3] = 255;
  }
  detail.mean = sum / detail.height.length; detail.satellite = satellite; detail.texture.needsUpdate = true;
}

/** Call after setting the existing palette color and PBR tuple. Normalizing
 * the map's mean retains that palette instead of darkening every new surface. */
export function applyRailFinishStyle(material: MeshStandardMaterial, satellite: boolean): boolean {
  const detail = materialDetails.get(material); if (!detail) return false;
  styleTexture(detail, satellite);
  material.color.multiplyScalar(1 / detail.mean);
  material.bumpScale = settings[detail.family].bump * (satellite ? 1 : .2);
  return true;
}

/** At most four maps in the authored scene and one concrete map per source
 * tile. Caller owns disposal; tile transactions see ordinary map slots. */
export function createRailFinishSet(portalOnly = false): {
  textures: Set<DataTexture>;
  dress(kind: RailFinishKind, geometry: BufferGeometry, material: MeshStandardMaterial): void;
} {
  const textures = new Set<DataTexture>(), details = new Map<Family, Detail>();
  return { textures, dress(kind, geometry, material) {
    const family = families[kind]; let detail = details.get(family);
    if (!detail) {
      const size = portalOnly ? 128 : settings[family].size;
      const texture = new DataTexture(new Uint8Array(size * size * 4), size, size);
      texture.name = `rail-finish:${family}`; texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.magFilter = LinearFilter; texture.minFilter = LinearMipmapLinearFilter; texture.generateMipmaps = true;
      texture.colorSpace = NoColorSpace; texture.anisotropy = 8;
      detail = { texture, family, height: heights(family, size), satellite: null, mean: 1 };
      styleTexture(detail, true); details.set(family, detail); textures.add(texture);
    }
    const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
    if (!positions || !normals || positions.count !== normals.count) throw Error(`Rail ${kind} finish needs matching authored position and normal attributes.`);
    const uv = new Float32Array(positions.count * 2), color = kind === "rails" ? new Float32Array(positions.count * 3) : null;
    for (let i = 0; i < positions.count; i++) {
      const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i), x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      // Projection onto the face's horizontal tangent preserves metres on
      // vertical faces; roofs/bed use X/Z. No source atlas reaches this path.
      const horizontal = Math.abs(ny) >= .7, length = Math.hypot(nx, nz) || 1;
      uv[i * 2] = (horizontal ? x : (-nz * x + nx * z) / length) / settings[family].metres[0];
      uv[i * 2 + 1] = (horizontal ? z : y) / settings[family].metres[1];
      if (color) {
        const top = Math.max(0, ny), side = 1 - top;
        color[i * 3] = top * 1.25 + side * .75;
        color[i * 3 + 1] = top * 1.25 + side * .63;
        color[i * 3 + 2] = top * 1.21 + side * .51;
      }
    }
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    if (color) { geometry.setAttribute("color", new BufferAttribute(color, 3)); material.vertexColors = true; }
    material.map = material.bumpMap = detail.texture; materialDetails.set(material, detail);
  } };
}
