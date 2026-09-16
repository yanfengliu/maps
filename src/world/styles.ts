/** Rendering styles share one geometry, camera and simulation. Add a registry
 * entry to offer a future style in the UI; IDs are persisted in the URL.
 */
export interface WorldStyle {
  id: string;
  label: string;
  description: string;
  facade: "photographic" | "procedural";
  palette: { ground: number; road: number; sidewalk: number; building: number; roof: number; window: number; vegetation: number };
  signage: number;
  bloom: number;
  wetness: number;
}

export const WORLD_STYLES: readonly WorldStyle[] = Object.freeze([
  Object.freeze({
    id: "cartographic", label: "Cartographic", description: "A clear, detailed city in a quiet map palette.",
    facade: "procedural" as const,
    palette: Object.freeze({ ground: 0xd8dfcb, road: 0xa4adb1, sidewalk: 0xe6e4d9, building: 0xe1e1dc, roof: 0xc1c8cb, window: 0xa9bdc4, vegetation: 0x7da78a }),
    signage: 0.35, bloom: 0.3, wetness: 0.12,
  }),
  Object.freeze({
    id: "satellite", label: "Satellite", description: "Photographic facades, atmospheric light and detailed streets.",
    facade: "photographic" as const,
    palette: Object.freeze({ ground: 0x737868, road: 0x32363c, sidewalk: 0x999991, building: 0xc4c0b7, roof: 0x646b70, window: 0x344e5a, vegetation: 0x3c5e44 }),
    signage: 1, bloom: 1, wetness: 0.72,
  }),
]);

export const DEFAULT_WORLD_STYLE_ID = "satellite";

export function worldStyle(id: string): WorldStyle {
  const style = WORLD_STYLES.find((entry) => entry.id === id);
  if (!style) throw new Error(`World style "${id}" is unavailable. Choose ${WORLD_STYLES.map((entry) => entry.id).join(" or ")}.`);
  return style;
}

export function isWorldStyleId(id: string): boolean { return WORLD_STYLES.some((entry) => entry.id === id); }
