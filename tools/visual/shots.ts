/**
 * The sweep the visual gate walks.
 *
 * One framing is not a check: a defect that the chosen view happens to hide is
 * the normal case, so the gate looks from six azimuths at three distances — eye
 * level on the crossing, a block back, and high enough to hold the whole square
 * kilometre.
 *
 * The three distances are not decoration now that the scene is real map data.
 * They exercise three different levels of the building tileset's `REPLACE`
 * hierarchy, so a sweep that comes back clean has watched tiles refine and unload
 * rather than watched one resolution of the city. The overhead shot in particular
 * is the one that would show the whole ward trying to be resident at once.
 *
 * Every frame is written as its own file at the capture resolution and reviewed
 * on its own. There is deliberately no contact sheet: an aggregate view answers
 * "is there one of each" and never "is each one right", and it answers the first
 * just as confidently when the second answer is no.
 */

/** Capture size in CSS pixels. Fixed, so a frame is comparable across runs. */
export const CAPTURE_VIEWPORT = Object.freeze({ width: 1280, height: 720 });

export interface Shot {
  name: string;
  /** Radians down from straight up, as OrbitControls measures it. */
  polar: number;
  /** Metres from the camera to the crossing. */
  distance: number;
  description: string;
}

export const SHOTS: readonly Shot[] = Object.freeze([
  Object.freeze({
    name: "plaza",
    // 86 degrees from vertical: about 3 m above the crossing at this distance,
    // which is a person's eye level looking across it.
    polar: 1.5,
    distance: 45,
    description: "on the crossing, eye level, close enough to read a facade",
  }),
  Object.freeze({
    name: "block",
    // 73 degrees from vertical: about 65 m up, above most of the roofs around
    // the crossing but well under the towers. A first attempt put this at 12 m
    // and 115 m out, which is below the roofline and inside the block — half of
    // every frame was the ground twenty metres in front of the camera.
    polar: 1.28,
    distance: 220,
    description: "above the rooftops a block back, the crossing and the towers in frame",
  }),
  Object.freeze({
    name: "overhead",
    // 36 degrees from vertical: high enough to hold the whole 1 km box.
    polar: 0.62,
    distance: 950,
    description: "high oblique, the full area of interest in frame",
  }),
]);

/**
 * The two poses the hero frames are taken from, and the two times of day.
 *
 * Azimuth 45 degrees puts the camera south-east of the crossing looking
 * north-west across it, which is the framing every photograph of this place is
 * taken from: the tall block on the north side fills the top of the frame,
 * Centre Gai runs away behind it, and the station is at the camera's back. The
 * compass comes out of the building index — `渋谷駅` sits 93 m east and 126 m
 * south of the crossing and the Hachikō-mae police box 64 m east and 48 m south —
 * so this is not a guess about which way is which.
 */
export const HERO_POSES: readonly Shot[] = Object.freeze([
  Object.freeze({
    name: "crossing",
    // The same pose as the sweep's `plaza` shot, on purpose: 3.2 m above the
    // crossing at 45 m out, a person's eye level, and directly comparable with
    // the eighteen frames of the sweep.
    //
    // A first attempt put the polar angle at 1.545 to lift the horizon towards
    // the middle of the frame — the target is the crossing at ground level and
    // the polar angle is the only thing that decides where the horizon sits. It
    // works geometrically and it is wrong: at 1.545 the camera is 1.4 m above the
    // crossing, which at 45 m out is **inside the building on that corner**. The
    // frame came back as a wall filling the screen. Where the horizon sits in
    // these frames is a property of the camera rig, and moving it is item 14's
    // business, not this wave's.
    polar: 1.5,
    distance: 45,
    description: "on the crossing at eye level, looking north-west",
  }),
  Object.freeze({
    name: "approach",
    // The sweep's `block` shot: 65 m up and 220 m back, above the roofs around
    // the crossing and well under the towers. Anything nearer the horizontal at
    // this distance puts the camera inside a building, as above.
    polar: 1.28,
    distance: 220,
    description: "a block back and above the roofline, the whole crossing in frame",
  }),
]);

/** Azimuth for the hero poses, radians. 45 degrees is south-east of the crossing. */
export const HERO_AZIMUTH = Math.PI / 4;

export interface HeroTime {
  /** What `?time=` takes. */
  id: string;
  /**
   * The band the sun's elevation must fall in, degrees, for this preset to be
   * the hour it claims. Checked against the real solar position, so a mistake in
   * the time zone — nine hours, and every frame still renders — is caught here.
   */
  elevationRange: readonly [number, number];
  /** The same for azimuth, degrees clockwise from north. */
  azimuthRange: readonly [number, number];
}

export const HERO_TIMES: readonly HeroTime[] = Object.freeze([
  // 2026-10-15 17:20 JST. Sunset at this latitude is 17:08, so the sun is under
  // the horizon and just north of due west.
  Object.freeze({ id: "dusk", elevationRange: [-8, -1] as const, azimuthRange: [255, 270] as const }),
  // 2026-10-15 11:27 JST, solar noon: 45.9 degrees up and due south.
  Object.freeze({ id: "noon", elevationRange: [40, 50] as const, azimuthRange: [175, 185] as const }),
]);

/** Six azimuths, 60 degrees apart, in radians. */
export const AZIMUTHS: readonly number[] = Object.freeze(
  [0, 60, 120, 180, 240, 300].map((degrees) => (degrees * Math.PI) / 180),
);

export function frameName(shot: Shot, azimuthRadians: number): string {
  const degrees = Math.round((azimuthRadians * 180) / Math.PI);
  return `${shot.name}-az${String(degrees).padStart(3, "0")}.png`;
}

/**
 * What counts as a frame worth looking at, and the bound each floor carries.
 *
 * **These floors only tell a rendered frame from an unrendered one.** They say
 * nothing about whether what rendered is correct, and a scene that is entirely
 * wrong clears every one of them comfortably. Only opening the files says that.
 *
 * Every number below is set from a measurement of the twelve placeholder frames
 * on the commit that introduced this file — the values are in the table on each
 * entry — and then dropped to roughly a third of the observed minimum. That
 * margin is what stops a legitimate change to lighting or materials turning the
 * gate red for no reason. It also means a real regression that halves a frame's
 * contrast passes here, so this is a floor and not a comparison.
 *
 * Recalibrate when the scene changes materially, and record the measurement in
 * the entry rather than adjusting a number to make a run pass.
 */
export const FRAME_FLOORS = Object.freeze({
  /**
   * Standard deviation of luminance, 0-255. A single flat colour scores 0.
   *
   * Placeholder frames measured 17.98 (street, azimuth 120) to 36.95 (overhead,
   * azimuth 120). A plain sky gradient with nothing in front of it would still
   * clear this, which is why it is not the only floor.
   */
  luminanceSpread: 6,
  /**
   * Distinct colours at 5 bits a channel. A flat fill scores 1.
   *
   * Placeholder frames measured 91 (overhead, azimuth 300) to 160 (street,
   * azimuth 60). The count is low for a rendered frame because the placeholder
   * scene is grey; it will rise a long way once Phase 4 puts materials on
   * anything.
   */
  distinctColours: 30,
  /**
   * Mean absolute difference between two 32x32 luminance signatures, 0-255.
   *
   * This is the check that the camera moved. Two captures of the same pose score
   * exactly 0. Across the placeholder frames the closest pair measured 8.04 (two
   * overhead azimuths), the closest street pair 15.88, and the closest
   * street-against-overhead pair 23.30.
   *
   * A sweep that silently writes one view under six names is the failure this
   * number exists to catch, so it is asserted between every pair of frames in a
   * shot, not only between neighbours.
   */
  signatureDistance: 3,
});
