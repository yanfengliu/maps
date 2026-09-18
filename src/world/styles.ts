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
    // The road is 0x474d55 rather than the 0x32363c it was. As an albedo, 0x32363c is
    // linear 0.032 — a tenth of this style's pavement (0x999991, linear 0.318) and below
    // the range dry-to-wet asphalt occupies, which is why at dusk the carriageway
    // rendered as black: the certified satellite `plaza-az000` frame measures median
    // luminance 10.4 over its near-field road, 66.6% of those pixels under 12 and 98.3%
    // of 8x8 blocks dead flat, on the pose where a viewer's eye spends most of its time.
    // The near field there is the PLATEAU `tran` road surface, not the pavement whose
    // joint grid is legible on the other side of the same frame (median 51.3); the
    // difference is the two meshes' albedos, and `lighting.ts` switches shadows off below
    // 8 degrees of solar elevation, so no shadow can fall differently across one
    // horizontal plane.
    //
    // 0x474d55 is linear 0.063: dry asphalt, and 1.98x the old value. What that buys is
    // measured, not assumed — `test/road-tone.test.ts` fits the two certified near-field
    // road measurements (this style at 10.4, cartographic at 52.4, same pose and hour) to
    // radiance = A + K * albedo and gets A 0.0052, K 0.0736, where A is the
    // albedo-independent part: the wet road's specular reflection of the dusk sky and the
    // bloom this style turns up. A is 66% of the satellite road's radiance, so the lift
    // predicts **15.6 to 24.6 of 255** depending on how much of A is really albedo-free —
    // 24.6 from the single-point fit, 15.6 from the two-point one. Both improve on 10.4
    // and only the higher one clears a 20 floor, so which holds is settled by
    // re-capturing these poses with only the palette changed and measuring the
    // albedo-driven sensitivity. If it comes back near the lower end, the palette is not
    // the lever here and the light on horizontal surfaces at dusk is.
    palette: Object.freeze({ ground: 0x737868, road: 0x474d55, sidewalk: 0x999991, building: 0xc4c0b7, roof: 0x646b70, window: 0x344e5a, vegetation: 0x3c5e44 }),
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

