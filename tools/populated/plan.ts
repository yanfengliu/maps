/**
 * What the populated capture lane photographs, and the measurements behind each
 * number.
 *
 * Every tick here comes from `tools/populated/probe.ts`, which runs the real
 * population against the real network with the same seed and the same fixed
 * step the browser uses. The population is deterministic in ticks, so a tick
 * measured there is the same tick here; what the probe cannot say is what any
 * frame looks like, and nothing in this file is offered as an observation of
 * pixels.
 *
 * ## What the probe found, and why the poses are where they are
 *
 * Measured 2026-09-15/16 on the delivered network against `388a73c`
 * (`artifacts/populated-capture/aiming*.json`, `positions-t900.json`):
 *
 * - **No agent comes near the crossing.** Over 360 simulated seconds of the
 *   vehicle population the closest any car got to the world origin was 426 m,
 *   and the count within 150 m was zero at every 5-second sample. Over 90
 *   seconds of the full population no pedestrian came within 149 m of it.
 * - The reason is geometric: `MAXIMUM_ROUTE_LENGTH_M` is 700 m, both
 *   populations enter at the AOI boundary, and the nearest pedestrian portal is
 *   505 m of walking from the scramble. A route that reached the crossing would
 *   need more than 1,000 m and is refused, so the population lives in a band
 *   along the boundary.
 * - Pedestrians bunch where the portals are: at 15 simulated seconds the
 *   densest 50 m cell held 193 walkers at (-475, 425) on the west edge, 330 at
 *   the north-west corner and 188 on the north edge, while the south edge around
 *   x = -60 held almost none. The first run of this lane aimed at that empty
 *   stretch and produced eight frames of pavement with nothing on it, which is
 *   why the poses below are at the portals rather than at the boundary in
 *   general.
 * - Vehicles are heaviest on the south and east edges: the busiest boundary
 *   portal measured is the south-east corner around (490, 490), with 14
 *   creations and 6 retirements in 90 s, and 133 pedestrians in the cell beside
 *   it.
 *
 * ## The clock
 *
 * Windows are expressed in **population ticks**, not wall clock. The browser
 * advances at most five fixed steps per frame, so the simulated clock runs at
 * whatever rate the machine can pay for — about 44 ms per tick measured on
 * 2026-09-15 with 3,000 pedestrians under the verdict lane's own load
 * (`artifacts/populated-capture/population-run-1800.json`), which is roughly
 * 0.4x real time. A wall-clock window would capture a different slice of the
 * simulation on every machine.
 *
 * ## Height
 *
 * `standHeightM` is how far above the ground at the target the camera should
 * stand. It is not a polar angle because the ground is not flat: it runs from
 * about 11 m to about 36 m across this AOI, while the controls' target stays at
 * the crossing's own 15.2 m for the whole run, since both of `OrbitControls`'
 * pan axes are horizontal. A fixed polar angle therefore puts the camera at a
 * different height above the street at every pose — at the first boundary pose
 * it stood one metre above the pavement — so the angle is derived from the
 * measured ground instead.
 */

export interface CaptureSequence {
  /** Directory under the lane root, and the prefix of every frame in it. */
  name: string;
  /** The acceptance criterion this sequence exists to cover. */
  purpose: string;
  /** Where the controls' target is panned to, world metres. */
  target: { x: number; z: number };
  /** Radians clockwise from north. */
  azimuth: number;
  /** Metres from the camera to the target. */
  distance: number;
  /** How far above the ground at the target the camera should stand, metres. */
  standHeightM: number;
  /** Earliest population tick to capture at. Capturing starts here or later. */
  fromTick: number;
  /** Ticks between captures. At 60 ticks per simulated second, 120 is 2 s. */
  intervalTicks: number;
  /** How many frames the sequence writes. */
  frames: number;
  /**
   * Whether the first capture must wait for a scramble pedestrian green.
   *
   * Set where the criterion is about a signal phase, and only there: a capture
   * that started in a vehicle phase and called itself the pedestrian phase would
   * be the appearance of coverage without the thing itself.
   */
  alignToPedestrianPhase?: boolean;
  /** What the probe says should be moving through this pose, and when. */
  expectation: string;
}

const GROUND_AT_TARGET_M = 15.2;

const SEQUENCE_LIST: readonly CaptureSequence[] = [
  {
    name: "crossing",
    purpose:
      "The signature shot: pedestrians surging diagonally across the scramble on the signal phase, and " +
      "no frame showing traffic moving through the scramble while pedestrians are on it.",
    target: { x: 0, z: 0 },
    // The hero pose: 45 m south-east of the crossing at 3.2 m above the ground,
    // the framing every photograph of this place is taken from.
    azimuth: Math.PI / 4,
    distance: 45,
    standHeightM: 3.2,
    // The scramble's pedestrian phase opens at tick 5,280 and runs 25 s, after
    // four 16 s vehicle groups and their amber and clearance. The sequence opens
    // in the clearance before it and runs past the end of the phase, so the
    // transition into the phase is watched rather than sampled.
    fromTick: 5_100,
    intervalTicks: 120,
    frames: 14,
    alignToPedestrianPhase: true,
    expectation:
      "28 simulated seconds from the clearance before the scramble's pedestrian phase (phase: ticks " +
      "5,280-6,780). Whether anybody is on the crossing is the open question this sequence exists to " +
      "answer: the probe says no pedestrian can reach the scramble before 505 m of walking, and none " +
      "was within 149 m of it in the first 90 simulated seconds.",
  },
  {
    name: "walkers",
    purpose:
      "Pedestrians as a crowd rather than as scattered props, where the population actually is: how " +
      "they share the footway, whether they are on the ground at a human scale, whether they avoid each " +
      "other, and whether their feet slide or float.",
    // The centroid of the 40 pedestrians nearest (380, 470) at tick 900 of a full
    // 3,000-pedestrian run, measured from the probe's position dump: they stood
    // within 15 m of (377.0, 484.8), which is itself a point on the south-east
    // footway `walk:1086844871:4:0:ground0:f`. The camera stands on that same
    // footway, which is why it is not inside a building: the first attempt at this
    // sequence aimed the same way at the west edge and came back as a photograph
    // of the inside of a facade.
    target: { x: 377, z: 484.8 },
    // Along the footway, looking back at the corner the walkers came from, so
    // they walk towards the camera down a footway the camera is also standing on.
    azimuth: -2.6725,
    distance: 25,
    standHeightM: 3,
    fromTick: 2_400,
    intervalTicks: 120,
    frames: 8,
    expectation:
      "16 simulated seconds of a footway 25 m from a measured knot of walkers, at 3 m above the ground " +
      "and 6.7 degrees below the horizontal: several people in frame at once, at a scale where a foot and " +
      "the paving are in the same few pixels.",
  },
  {
    name: "corridor",
    purpose:
      "A vehicle corridor where one car can be watched holding its lane through at least one signal.",
    // The mapped signal junction with the most measured vehicle holds in the band
    // the population uses: four 12 s vehicle groups at (-475, 409) with a 55 m
    // conflict envelope, 20 m from the crowd pose so the two sequences share one
    // neighbourhood and the second aim is nearly free.
    target: { x: -470, z: 421 },
    // Looking west along the approach road: the cars travel away from the camera
    // into the junction, so a car that stops at the line stays in frame with its
    // lane visible under it.
    azimuth: Math.PI / 2,
    distance: 70,
    standHeightM: 8,
    fromTick: 12_000,
    intervalTicks: 120,
    frames: 8,
    expectation:
      "16 simulated seconds of the west-edge signalised junction, whose groups are 12 s green with 3 s " +
      "amber and 3 s clearance: a car approaching in its lane, holding at the line, and moving off. Six " +
      "vehicles stood within 50 m of here at tick 12,600, so the lane should not be empty; whether one of " +
      "them is *held by the signal* rather than by its own queue is what the frames have to show.",
  },
  {
    name: "boundary",
    purpose:
      "A vehicle spawns or despawns at the AOI boundary: the criterion that the population spawns and " +
      "despawns at the boundary, watched over a run rather than sampled in one frame.",
    // The busiest boundary corner measured over 360 s: 14 vehicles were created
    // around (500, 490) and 6 retired around (440, 500) in 90 s, with entry lanes
    // at (497, 489) and (436, 500) turning north-west into the map. It is also low
    // ground — 14.8 m, against the crossing's own 15.2 m — so the controls' pinned
    // target height frames it at eye level. The first boundary pose, on the west
    // edge, could not be panned to at all: the controls stopped 35 m short after 8
    // corrections, and it sat on 26 m ground.
    target: { x: 470, z: 495 },
    // Looking south-east from inside the map at the corner the cars arrive from,
    // so a car appears at the edge of the mapped area and drives towards the
    // camera rather than away from it.
    azimuth: Math.PI * 1.25,
    // High, on purpose. Every pose that stood a few metres above this corner put
    // the camera inside a building: the first was inside the facade, the second
    // 3.6 m from a lane centreline and still indoors, because a building can
    // overhang a street in this scene. At 150 m out and 55 m above the ground the
    // camera stands 16 m clear of the tallest roof within 30 m of it (checked
    // against `data/scene/buildings/buildings.json`), which is a pose a building
    // cannot swallow. The cost is scale: a car is about 18 pixels long.
    distance: 150,
    standHeightM: 55,
    fromTick: 2_400,
    intervalTicks: 120,
    frames: 8,
    expectation:
      "16 simulated seconds at a boundary portal: vehicles arriving on the road at the edge of the " +
      "mapped area and vehicles leaving it, with pedestrians walking in beside them. The AOI edge is not " +
      "a wall: a vehicle that spawns there appears on an empty road at the edge of the mapped data.",
  },
];

export const SEQUENCES: readonly CaptureSequence[] = Object.freeze(SEQUENCE_LIST.map((sequence) => Object.freeze(sequence)));

/** Total frames the lane writes, which is what its ledger promises. */
export const TOTAL_FRAMES = SEQUENCES.reduce((sum, sequence) => sum + sequence.frames, 0);

/**
 * The scramble's pedestrian phase, in population ticks, and its repeat.
 *
 * The cycle is four 16 s vehicle groups with 3 s of amber and 3 s of clearance
 * each, then 25 s of pedestrian green and 3 s of clearance: 116 s, or 6,960
 * ticks. The windows repeat from the first one measured. Used by the spec to say,
 * per frame, whether the crossing sequence landed inside the phase it was aimed
 * at — and a phase can only start late, never early, because a clearance stage
 * that finds the junction occupied is held rather than cut short.
 */
export const SCRAMBLE_PEDESTRIAN_PHASE = Object.freeze({ fromTick: 5_280, cycleTicks: 6_960, greenTicks: 1_500 });

/** True when a tick falls inside a scramble pedestrian green. */
export function inPedestrianPhase(tick: number): boolean {
  if (tick < SCRAMBLE_PEDESTRIAN_PHASE.fromTick) return false;
  const offset = (tick - SCRAMBLE_PEDESTRIAN_PHASE.fromTick) % SCRAMBLE_PEDESTRIAN_PHASE.cycleTicks;
  return offset < SCRAMBLE_PEDESTRIAN_PHASE.greenTicks;
}

/** The first tick at or after `tick` that is inside a scramble pedestrian green. */
export function nextPedestrianPhase(tick: number): number {
  if (inPedestrianPhase(tick)) return tick;
  if (tick < SCRAMBLE_PEDESTRIAN_PHASE.fromTick) return SCRAMBLE_PEDESTRIAN_PHASE.fromTick;
  const elapsed = tick - SCRAMBLE_PEDESTRIAN_PHASE.fromTick;
  const cycles = Math.floor(elapsed / SCRAMBLE_PEDESTRIAN_PHASE.cycleTicks) + 1;
  return SCRAMBLE_PEDESTRIAN_PHASE.fromTick + cycles * SCRAMBLE_PEDESTRIAN_PHASE.cycleTicks;
}

/**
 * The URL query the lane captures from.
 *
 * `?agents=1` is the only way to ask for the population — the app refuses any
 * other value by name — and it is the acceptance population, 3,000 pedestrians
 * and 200 vehicles, from the module's default seed of 0x5b1b0a, which is not
 * reachable from the query string and is the seed the probe ran with.
 *
 * `noon` rather than the default dusk because this lane judges bodies and wheels
 * against the ground, and a silhouette at dusk cannot answer whether a foot is
 * planted or a wheel is touching. `satellite` because that is the style with
 * photographic materials, which is what a reviewer checking a pedestrian against
 * a real one needs.
 */
export const CAPTURE_QUERY = "?agents=1&seed=9137&style=satellite&time=noon";

/** The values `CAPTURE_QUERY` is expected to produce, checked before capture. */
export const EXPECTED_POPULATION = Object.freeze({ pedestrians: 3_000, vehicles: 200 });

/** The ground at the crossing, which is where the controls' target stays. */
export { GROUND_AT_TARGET_M };
