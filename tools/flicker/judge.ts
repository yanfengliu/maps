/**
 * Does the dusk preset hold still while the camera moves?
 *
 * The deliverable's criterion is that the dusk preset renders with ACES tone
 * mapping, bloom, SSAO and TAA "and holds still - no flicker or crawl over a
 * moving sequence". The first half is answered elsewhere: `tools/post-chain/`
 * measures whether the accumulator is engaged, and `src/app.ts` feeds
 * `cameraStill` into `post.setStill`, so **TAA cannot accumulate while the camera
 * moves, in any run**. The second half therefore has to be judged on the
 * non-accumulating path - consecutive rendered frames of a moving camera,
 * compared for high-frequency change that the motion does not explain - and
 * until this lane existed no run had captured two consecutive rendered frames of
 * a moving camera, so it had never been judged at all.
 *
 * This module is the judge and it is pure: frames arrive as decoded pixels
 * beside their metadata, so `test/flicker-judge.test.ts` can drive every
 * predicate over synthetic records and watch each one go red without a browser.
 * The capture specification next door writes the records; this file is the only
 * thing that decides whether a record holds still.
 *
 * ## What it reports, per adjacent pair
 *
 * - `changedFraction` - the fraction of pixels whose largest per-channel
 *   difference exceeds 8 of 255. Reported, and the raw material of `crawl`.
 * - `digestDiffers` - whether the two PNGs are different files at all. A pair
 *   that is byte-identical while the camera moved is flicker's opposite - a
 *   frozen picture - and is failed by name rather than read as "no change to
 *   report".
 * - `cameraTravelM` and `cameraRotationRad` - what the controls did between the
 *   two shots, measured from the read-only bridge on either side of each
 *   capture. This is what makes a change motion-explained or not: with the
 *   travel at zero, every changed pixel is the scene's own.
 * - `crawl` - the crawl indicator. See below.
 *
 * ## The crawl indicator, and exactly what it can see
 *
 * `crawl` counts the pixels where one frame of the pair draws a **hard local
 * feature** and the other does not, after the earlier frame has been shifted onto
 * the later one by the best rigid translation the estimator can find, as a
 * fraction of the frame per rendered frame of camera motion.
 *
 * A hard local feature is a pixel more than 24 of 255 brighter or darker than its
 * own 3x3 neighbourhood - a sign edge, a window mullion, a lane marking. The test
 * is persistence rather than a luminance residual, and that is the whole design:
 * a camera translation moves a picture without changing it, so after the shift
 * every feature is still a feature at the same point of the picture, while what
 * does not survive a shift is detail that *appears, disappears or jumps one pixel
 * against its neighbours* - a temporal sample re-jittering, a bloom, SSAO or LOD
 * threshold flipping between two frames, a shader's own stochastic term
 * resampling. Counting luminance residuals instead would have counted every
 * feature that moved by less than a whole pixel, which is every feature in a
 * slow crawl, and the indicator would have measured the camera rather than the
 * picture.
 *
 * **One bound, stated rather than implied.** The estimator finds one rigid
 * translation for the whole frame. Real camera motion also rotates, dollies and
 * changes occlusion, and none of those is explained by a translation, so their
 * residuals land in `crawl` too. The indicator therefore reports an upper bound
 * on crawl, and it separates "the change is a shift" from "the change is not
 * only a shift". `cameraRotationRad` is reported beside it so a reader can see
 * how much of the number the estimator was never able to explain in the first
 * place, and a run whose poses turn between frames should be read with that in
 * hand.
 *
 * The second bound is that nothing here knows what caused an unexplained change:
 * a car crossing the frame at speed is an unexplained high-frequency change and
 * is not a crawl. This lane captures with the population switched off by design
 * for that reason, and a run that turns it on has changed what the number means.
 */

import { measureFrame, signatureDistance, type DecodedPng } from "../visual/png.js";

/**
 * The largest per-channel difference, 0-255, at which two pixels count as the
 * same colour.
 *
 * 8 is above the dither and quantisation noise a flat surface shows between two
 * renders of the same pose and far below the 24 used for a hard local feature,
 * so it separates "this pixel changed colour" from "this pixel is within noise
 * of itself" without the two bars being the same number.
 */
export const CHANGED_CHANNEL_DELTA = 8;

/**
 * How far a pixel must sit from its own neighbourhood before it counts as a hard
 * local feature, 0-255.
 *
 * 24 is roughly a display level and a half at the darker end of the dusk preset,
 * so a flat surface with dither does not qualify however the dither falls, while
 * a sign edge, a window frame or a road marking clears it by a wide margin. The
 * flythrough's structure metric uses a deviation of 12 for a different question
 * (does this cell show structure at all); this bar is higher because it decides
 * whether one *pixel* is a feature, where a 16x9 cell average would have been
 * the wrong instrument.
 */
export const LOCAL_MEAN_DELTA = 24;

/**
 * The most the crawl indicator may read, as a fraction of the mean frame's
 * pixels per rendered frame of camera motion.
 *
 * Per rendered frame and not per pair: the capture's frame gap is a property of
 * how long a screenshot costs on this machine, not of the scene, so a threshold
 * on a pair's total would make the verdict a function of the capture harness. A
 * pair's bound is this value times its own measured frame gap.
 *
 * **Measured on 2026-09-18 against two synthetic controls, and never yet met by
 * a real frame set.** A pure 3 px per-step translation over ten frames of the
 * synthetic field - the negative control - measures 1.2e-4 to 1.6e-3 per frame,
 * and a field with its detail collapsed on alternate frames - the positive
 * control - measures 3.7e-2 to 3.9e-2. This bar sits between them: 3.1x above
 * the worst the pure shift reached and 7.4x below the least the crawl reached.
 * Both numbers are in `test/flicker-judge.test.ts`, which asserts the separation
 * rather than only the two individual verdicts.
 *
 * It is deliberately loose. The first real run's numbers are what should set it:
 * a real frame carries noise, anti-aliasing and sub-pixel motion that the
 * synthetic field has none of, so a bar tuned on the synthetic controls would be
 * tuned on the easier of the two populations.
 */
export const CRAWL_FRACTION_PER_FRAME = 0.005;

/**
 * The cadence the capture asked for, and the bound it is checked against.
 *
 * `cadenceFrames` is the number of rendered frames between one still and the
 * next that the capture *asked* for, and it is the criterion's own number: two.
 * `maxPairGapFrames` is the most it will accept, and it is a real bound rather
 * than a formality.
 *
 * **It is 26, and the reading it bounds is the mid-shutter one.** A
 * native-resolution screenshot costs about 250 to 400 ms on this renderer, so the
 * shutter is open for most of the interval between one still and the next and the
 * closest two stills this instrument can take are one still cycle apart. That
 * cycle is the bound. Measured on RUN-02's two runs: **19.5 to 23 rendered frames
 * between midpoints**, with the shutters themselves spanning 27 to 34 frames each
 * and 5 to 7 frames of idle time between them. 26 is one frame of jitter above the
 * worst of that, which is deliberately tight: the bound's job is to refuse a pair
 * that has drifted out of the walk, and a pair at 23 frames still describes one
 * gesture. If a future scene or renderer pushes the cycle past 26 the instrument
 * should fail and be re-bounded deliberately rather than absorb it.
 *
 * **The number this replaces was 18 and it was bounding the wrong reading.** The
 * first version measured a pair's span from the earlier shot's close to the later
 * shot's open, which is the 6-8 frames of *idle* time between two shutters, and
 * divided a full shutter-to-shutter motion by it. 18 was a loose bound on an
 * interval that excluded most of the motion, so the cadence check passed without
 * saying anything about the span the crawl number was computed over. Both
 * intervals are now in the record: `frameGap` is the mid-to-mid span this bound
 * applies to, and `idleGapFrames` is the old reading, reported rather than used.
 *
 * The gap that was actually achieved is recorded per pair and in the report, so
 * the instrument's own cadence is visible in its evidence instead of implied.
 */
export const FLICKER_CADENCE = Object.freeze({
  cadenceFrames: 2,
  maxPairGapFrames: 26,
});

/**
 * The fewest frames a judged record may hold.
 *
 * A record of two frames has one pair, and one pair cannot tell a still picture
 * from a held one: an instrument that reports "holds still" from a pair is
 * reporting "did not run" as "passed". Eight frames is four pairs at the cadence
 * above - a quarter of a second of motion - which is the least that can show a
 * camera that was moving and a scene that kept up with it.
 */
export const MINIMUM_FLICKER_FRAMES = 8;

/** One captured frame: the bytes' digest, what the app said, and the pixels. */
export interface FlickerFrame {
  /** The file's path relative to the lane root, for messages. */
  file: string;
  /** SHA-256 of the PNG on disk. */
  sha256: string;
  /**
   * Frames drawn since boot at the **midpoint of the shutter**.
   *
   * This is the reading a pair's span is measured between, and the instrument's
   * own cadence is why: a native-resolution screenshot spans 16-18 rendered
   * frames, so a pose and a counter read before the shutter describe a picture
   * that no longer exists by the time the bytes are taken. The capture reads the
   * counter on both sides of the shutter and this is their midpoint, which is the
   * instant the recorded pixels are nearest to. `shutterOpenedAtFrame` and
   * `shutterClosedAtFrame` carry the real edges beside it, so what the midpoint
   * stands in for is visible in the record rather than modelled.
   */
  frameCountMid: number;
  /** Frames drawn since boot immediately before the shutter opened. */
  shutterOpenedAtFrame: number;
  /** Frames drawn since boot immediately after the shutter closed. */
  shutterClosedAtFrame: number;
  /**
   * Fixed simulation step index the frame was drawn at, from the page's own
   * clock, or null when the capture could name no step at all.
   *
   * **Read this as a clock, not as a reading of the simulation.** The harness
   * bridge publishes no fixed-step clock, and the substitute a populated lane
   * would use - `population().ticks` - is not available to this one: the flicker
   * lane captures `?agents=`-free on purpose so that a vehicle crossing the frame
   * cannot be read as a crawl, and with no `?agents=` there is no population at
   * all (`createAgents` holds `population === null`), so those ticks read **0 for
   * the whole run**. What the capture derives instead is
   * `(performance.now() - startedAtMs) * 60`, clamped to the frame counter,
   * because `RenderLoop` advances one fixed step per rendered frame of wall time.
   * `startedAtMs` is `performance.now()` read once when the capture began, and
   * **not** `performance.timeOrigin`: the origin is an epoch timestamp, so
   * subtracting it measures minus fifty-six years and wrote `-1.07e11` into every
   * frame of the first run. `tools/flicker/step.ts` carries the derivation and
   * `test/flicker-step.test.ts` drives it.
   *
   * Its bound, stated where the field is read: it cannot see a run whose
   * fixed-step clock stopped while frames kept being drawn - the clock is the
   * thing being assumed - and that is why the sequence's aliveness rests on the
   * render counter's own predicate rather than on this. `null` is recorded
   * rather than 0 so an absent step is never read as a step of zero.
   */
  tick: number | null;
  /** The camera, read beside the frame counter. */
  pose: FramePose;
  /** The decoded PNG. */
  image: DecodedPng;
}

export interface FramePose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** Radians, as OrbitControls reports it. */
  azimuth: number;
  /** Radians down from straight up, as OrbitControls reports it. */
  polar: number;
  /** Metres from the camera to the controls' target. */
  distance: number;
}

/** The crawl bar and the cadence the capture was asked for. */
export interface FlickerContract {
  /** The most crawl a pair may show, as a fraction of pixels per rendered frame. */
  crawlFractionPerFrame: number;
  /** The largest per-channel difference at which two pixels count as the same. */
  changedChannelDelta: number;
  /** How far a pixel must sit from its own neighbourhood to be a hard feature. */
  localMeanDelta: number;
  /** The rendered frames the capture asked for between one still and the next. */
  cadenceFrames: number;
  /** The most rendered frames a judged pair may span. */
  maxPairGapFrames: number;
  /** The fewest frames a judged record may hold. */
  minimumFrames: number;
}

export interface FlickerPair {
  from: string;
  to: string;
  /**
   * Rendered frames between the two stills, measured **shutter midpoint to
   * shutter midpoint**.
   *
   * The midpoint is the one reading that stands in the same relation to both
   * frames: it is the instant the recorded pixels are nearest to, and
   * `cameraTravelM` and `cameraRotationRad` are measured between the same two
   * midpoints, so the motion and the span it is divided by describe the same
   * window. Measuring the span between the idle gaps instead - which is what the
   * first version did - divides a full shutter-to-shutter motion by the 6-8
   * frames of idle time between two shutters, and the resulting rate is not a
   * rate of anything.
   */
  frameGap: number;
  /**
   * Rendered frames the two shutters themselves were open, added together. The
   * cadence the pair cannot see below, reported so it is a number in the record
   * rather than a caveat in the prose.
   */
  shutterFrames: number;
  /**
   * Rendered frames the two stills were apart with neither shutter open, i.e.
   * the idle time between the previous shot's close and the next shot's open.
   * Reported because it is what the first version mistook for the pair's span.
   */
  idleGapFrames: number;
  /**
   * Fixed simulation steps between the two shots, or null when either frame's
   * capture could not name the step it was drawn at.
   *
   * Null is reported rather than defaulted to zero: a gap of zero and an
   * unrecorded gap are different statements, and only one of them is a
   * measurement.
   */
  tickGap: number | null;
  digestDiffers: boolean;
  /** Fraction of the frame's pixels whose largest per-channel difference exceeds the bar. */
  changedFraction: number;
  /** Mean absolute difference between the two 32x32 luminance signatures. */
  signatureDistance: number;
  /** Fraction of pixels that are a hard local feature in one frame and changed anyway. */
  unexplainedFraction: number;
  /** The crawl indicator: pixels that changed after the motion is taken out, as a fraction per rendered frame. */
  crawl: number;
  /** Metres the camera itself travelled between the two shots. */
  cameraTravelM: number;
  /** Radians of azimuth and polar the pose moved between the two shots. */
  cameraRotationRad: number;
  /** Metres the controls' target travelled. Zero for a pure orbit, which is the normal case. */
  targetTravelM: number;
  /** The rigid translation the crawl indicator estimated and took out, in pixels. */
  estimatedShift: { dx: number; dy: number };
  /**
   * Whether the best translation the estimator found sits on the edge of the
   * region it searched, which means the true shift may lie outside it.
   *
   * A failed estimate and a still picture both answer `0, 0`, so a pair the
   * estimator could not follow is not merely imprecise - it is indistinguishable
   * from the criterion being satisfied. The first run was nine pairs of exactly
   * that: a ~30 px picture move against a ±12 px search, four pairs reported at
   * `0, 0`, and the run labelled clean. This flag is what turns that into a
   * named failure.
   */
  shiftAtSearchBoundary: boolean;
  /**
   * The pixels past the coarse answer that the fine pass searched, so a reader
   * can see how far the estimator actually reached for this pair rather than
   * reading the radius and assuming it.
   */
  refineWindowPx: number;
}

export interface FlickerReport {
  frames: number;
  pairs: number;
  /** Pairs whose span met the cadence bound, and the worst span seen. */
  cadence: { withinBound: number; worstGapFrames: number };
  /** True when at least one pair's camera travel cleared the motion bar. */
  cameraMoved: boolean;
  /** The null when the record holds still, as a list of failures in the record's own terms. */
  failures: string[];
  pairs_: FlickerPair[];
}

/**
 * The travel at which a pair counts as a moving camera, metres.
 *
 * Half a millimetre. It is well above the round-trip noise an
 * `OrbitControls.update()` leaves on an identical pose and far below anything a
 * driven camera does over even one rendered frame, so it separates "the input
 * path moved the camera" from "the two shots are the same pose". A pair above
 * this bar is one where the picture was required to change and therefore one
 * where a byte-identical pair is a defect rather than a hold.
 */
export const MOTION_BAR_M = 0.0005;

/**
 * Judge a record of consecutive frames.
 *
 * Everything the decision rests on is measured here from the frames and their
 * metadata: nothing is taken from the capture's own opinion of itself, because a
 * check built from the same symbol as the thing it checks proves only that the
 * code agrees with itself.
 */
export function judgeFlicker(
  frames: readonly FlickerFrame[],
  contract: FlickerContract = {
    crawlFractionPerFrame: CRAWL_FRACTION_PER_FRAME,
    changedChannelDelta: CHANGED_CHANNEL_DELTA,
    localMeanDelta: LOCAL_MEAN_DELTA,
    cadenceFrames: FLICKER_CADENCE.cadenceFrames,
    maxPairGapFrames: FLICKER_CADENCE.maxPairGapFrames,
    minimumFrames: MINIMUM_FLICKER_FRAMES,
  },
): FlickerReport {
  const failures: string[] = [];

  if (frames.length === 0) {
    return {
      frames: 0,
      pairs: 0,
      cadence: { withinBound: 0, worstGapFrames: 0 },
      cameraMoved: false,
      failures: [
        "the record is empty: no frame was captured at all, so this record is a run that did not happen " +
          "rather than a sequence that held still",
      ],
      pairs_: [],
    };
  }

  if (frames.length < contract.minimumFrames) {
    failures.push(
      `${frames.length} frame(s) is fewer than the ${contract.minimumFrames} a judged record needs: at the ` +
        `${contract.cadenceFrames}-frame cadence a record this short is at most ${frames.length - 1} pair(s), and one ` +
        "pair cannot tell a still picture from a held one. This is the check reporting 'did not run' as 'passed', which " +
        "is the one outcome a flicker instrument must never have.",
    );
  }

  const wrongSize: string[] = [];
  const first = frames[0]!;
  for (const frame of frames) {
    if (frame.image.width !== first.image.width || frame.image.height !== first.image.height) {
      wrongSize.push(`${frame.file}: ${frame.image.width}x${frame.image.height}`);
    }
  }
  if (wrongSize.length > 0) {
    failures.push(
      `${wrongSize.length} frame(s) are not at ${first.image.width}x${first.image.height} ` +
        `(${wrongSize.slice(0, 3).join(", ")}${wrongSize.length > 3 ? ", ..." : ""}), so they cannot be compared ` +
        "pixel for pixel with the frames beside them and every pair involving them would be a comparison of two " +
        "different rectangles.",
    );
  }

  const pairs: FlickerPair[] = [];
  let withinBound = 0;
  let worstGapFrames = 0;
  let cameraMoved = false;

  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]!;
    const frame = frames[index]!;
    const comparable =
      previous.image.width === first.image.width &&
      previous.image.height === first.image.height &&
      frame.image.width === first.image.width &&
      frame.image.height === first.image.height;
    if (!comparable) continue;

    const pair = comparePair(previous, frame, contract);
    pairs.push(pair);

    // The cadence, measured rather than asked for. The span is midpoint to
    // midpoint, which is the window `cameraTravelM` and `cameraRotationRad` are
    // measured over as well: a screenshot spans 16-18 rendered frames, so the
    // frames between two shutters is 6-8 and is *not* the span the motion
    // describes. Both numbers are reported - `idleGapFrames` is the old one -
    // because the difference between them is the instrument's own cadence.
    const gap = pair.frameGap;
    if (gap <= contract.maxPairGapFrames) withinBound += 1;
    if (gap > worstGapFrames) worstGapFrames = gap;

    const digestDiffers = previous.sha256 !== frame.sha256;
    const moved = pair.cameraTravelM > MOTION_BAR_M || pair.cameraRotationRad > MOTION_BAR_M;
    if (moved) cameraMoved = true;

    // 1. A byte-identical pair from a moving camera. The criterion asks for a
    //    picture that holds still, and this is not a hold: the camera moved and
    //    the frame did not. It is either a capture that photographed the same
    //    buffer twice or a render loop that stopped between the two shots, and
    //    both are named rather than counted as zero change.
    if (!digestDiffers && moved) {
      failures.push(
        `${frame.file} is byte-identical to ${previous.file} (sha256 ${frame.sha256.slice(0, 12)}) while the camera ` +
          `moved ${pair.cameraTravelM.toFixed(4)} m and turned ${pair.cameraRotationRad.toFixed(4)} rad between the two ` +
          "shots. A held camera drawing the same bytes twice is the criterion satisfied; a *moving* camera drawing the " +
          "same bytes twice is a stale buffer photographed again, and no change between the frames can be judged " +
          "because there is none. The frames are bound by digest, so this is a statement about the file on disk and not " +
          "about the shutter.",
      );
    }

    // 2. A render counter that stopped advancing. A stopped loop makes every
    //    later frame a stale buffer, so it takes the whole record with it. The
    //    reading compared is the shutter edges rather than the midpoints: a
    //    midpoint that does not advance still means the loop stopped, and the
    //    edges are the two readings that say *when* it stopped.
    if (frame.shutterOpenedAtFrame <= previous.shutterOpenedAtFrame) {
      failures.push(
        `the render counter did not advance between ${previous.file} and ${frame.file} ` +
          `(${previous.shutterOpenedAtFrame} before the first shutter to ${frame.shutterOpenedAtFrame} before the second) ` +
          `while ${pair.tickGap === null ? "the simulation step was not recorded" : `${pair.tickGap} simulation step(s) passed`}. ` +
          "A stopped render loop photographs the same buffer under a new filename, so every frame after the first is " +
          "not a frame of the sequence at all and the crawl figures below are computed over a picture that was never " +
          "redrawn.",
      );
    }

    // 3. The estimator could not follow the picture. Checked before the crawl
    //    indicator, because a crawl figure computed under a shift that ran into
    //    the search edge is a statement about the estimator and not about the
    //    scene, and the two must not be read as the same kind of number.
    if (pair.shiftAtSearchBoundary) {
      failures.push(
        `the pair ${previous.file} -> ${frame.file} could not be modelled: the best rigid translation the estimator ` +
          `found is (${pair.estimatedShift.dx}, ${pair.estimatedShift.dy}) px, which sits on the edge of the ` +
          `±${SEARCH_RADIUS} px region it searches, so the true shift may lie outside what was searched and the ` +
          `figures below are not a measurement of the picture. ${pair.changedFraction.toFixed(4)} of the frame's ` +
          `sampled pixels differ by more than ${contract.changedChannelDelta} of 255 at that shift - a number that ` +
          "says how badly the alignment fits and not how much the picture changed - and the camera moved " +
          `${pair.cameraTravelM.toFixed(4)} m ` +
          `and turned ${pair.cameraRotationRad.toFixed(4)} rad over this pair's ${pair.frameGap}-frame span. An ` +
          "estimator that cannot model the pair has to say so: a shift of (0, 0) from a failed search and a shift of " +
          "(0, 0) from a picture that did not move are the same two numbers, and only one of them is the criterion " +
          "satisfied. This pair is reported as unmodelable rather than as clean.",
      );
    }

    // 4. The crawl indicator, with its own arithmetic in the message. The number
    //    is always computed and always reported on the pair; what is suppressed
    //    for an unmodelable pair is the *failure*, because a crawl figure under a
    //    shift that ran into the search edge is a consequence of the misalignment
    //    and failing twice for one cause reads as two defects. This is the
    //    "report changedFraction alongside the shift rather than only after it"
    //    half of the same fix: the record keeps the number, and only the verdict
    //    declines to read it.
    const allowed = contract.crawlFractionPerFrame * Math.max(1, pair.frameGap);
    if (!pair.shiftAtSearchBoundary && pair.crawl > allowed) {
      failures.push(
        `the crawl indicator reads ${pair.crawl.toExponential(3)} of the frame's pixels per rendered frame between ` +
          `${previous.file} and ${frame.file}, above the contract's ${allowed.toExponential(3)} (the bar of ` +
          `${contract.crawlFractionPerFrame.toExponential(3)} per frame over this pair's measured ${pair.frameGap}-frame ` +
          `span). ${pair.unexplainedFraction.toExponential(3)} of the frame's pixels are a hard local feature - more than ` +
          `${contract.localMeanDelta} of 255 from their own 3x3 neighbourhood - in one frame of the pair and not in the ` +
          `other, after the earlier frame was shifted onto the later one by the best rigid translation the estimator could ` +
          `find (${pair.estimatedShift.dx}, ${pair.estimatedShift.dy} px), at which ${pair.changedFraction.toFixed(4)} of ` +
          `the frame's sampled pixels differ by more than ${contract.changedChannelDelta} of 255. The camera travelled ` +
          `${pair.cameraTravelM.toFixed(4)} m and turned ${pair.cameraRotationRad.toFixed(4)} rad over that span. ` +
          "Detail that appears, disappears or jumps against its own neighbours - a temporal sample re-jittering, a bloom, " +
          "SSAO or LOD threshold flipping - is what this number is for. Geometry that genuinely moved, or an estimator " +
          "beaten by a rotation it cannot model, reads the same way: this is an upper bound on crawl and not a " +
          "measurement of it alone.",
      );
    }
  }

  if (pairs.length === 0) {
    failures.push(
      "no pair of frames could be compared: every adjacent pair either had no predecessor at the same size or the " +
        "record holds a single frame, so the sequence claims below are claims about a sequence that does not exist.",
    );
  }

  // A record whose camera never moved has not exercised the one thing this lane
  // exists for. The frames may still be a correct photograph of a city.
  if (!cameraMoved && pairs.length > 0) {
    failures.push(
      `no pair of the ${pairs.length} shows camera travel above ${(MOTION_BAR_M * 1000).toFixed(1)} mm, so the camera ` +
        "never moved and this record is a sequence of stills. The criterion this lane judges is about a picture that " +
        "holds still *while the camera moves*, and a held camera is the case the criterion is already satisfied by - " +
        "the input path that moves the camera is the thing being exercised, and it was not exercised here.",
    );
  }

  return {
    frames: frames.length,
    pairs: pairs.length,
    cadence: { withinBound, worstGapFrames },
    cameraMoved,
    failures,
    pairs_: pairs,
  };
}

/**
 * Everything one adjacent pair has to say, measured from the pixels.
 *
 * The order of the work is the order of the argument: bound the region the
 * shift is valid over, find the shift, count changed pixels, then count the ones
 * the shift does not explain.
 */
function comparePair(previous: FlickerFrame, frame: FlickerFrame, contract: FlickerContract): FlickerPair {
  const width = frame.image.width;
  const height = frame.image.height;
  const previousLuma = luminance(previous.image);
  const frameLuma = luminance(frame.image);

  const estimate = estimateShift(previousLuma, frameLuma, width, height, SEARCH_RADIUS);
  const shift = estimate.shift;
  const valid = validRegion(width, height, shift);

  let changed = 0;
  let pixels = 0;
  for (let y = valid.y0; y <= valid.y1; y += SAMPLE_STRIDE) {
    const row = y * width;
    for (let x = valid.x0; x <= valid.x1; x += SAMPLE_STRIDE) {
      const at = row + x;
      const source = at + shift.dy * width + shift.dx;
      // Four bytes a pixel, on both sides: `at` and `source` are pixel indices
      // and `channelDelta` reads bytes. See its own docstring for what happened
      // when this multiplication was missing on one of them.
      const delta = channelDelta(frame.image.rgba, previous.image.rgba, at * 4, source * 4);
      if (delta > contract.changedChannelDelta) changed += 1;
      pixels += 1;
    }
  }

  const full = countUnexplained(previousLuma, frameLuma, width, height, shift, contract);

  const motion = motionBetween(previous.pose, frame.pose);
  const frameGap = frame.frameCountMid - previous.frameCountMid;

  return {
    from: previous.file,
    to: frame.file,
    frameGap,
    shutterFrames:
      previous.shutterClosedAtFrame - previous.shutterOpenedAtFrame + (frame.shutterClosedAtFrame - frame.shutterOpenedAtFrame),
    idleGapFrames: frame.shutterOpenedAtFrame - previous.shutterClosedAtFrame,
    tickGap: previous.tick === null || frame.tick === null ? null : frame.tick - previous.tick,
    digestDiffers: previous.sha256 !== frame.sha256,
    changedFraction: pixels === 0 ? 0 : changed / pixels,
    signatureDistance: signatureDistance(measureFrame(previous.image), measureFrame(frame.image)),
    unexplainedFraction: full.validPixels === 0 ? 0 : full.unexplained / full.validPixels,
    crawl: full.validPixels === 0 ? 0 : full.unexplained / full.validPixels / Math.max(1, frameGap),
    cameraTravelM: motion.travelM,
    cameraRotationRad: motion.rotationRad,
    targetTravelM: motion.targetTravelM,
    estimatedShift: shift,
    shiftAtSearchBoundary: estimate.atBoundary,
    refineWindowPx: estimate.refineWindow,
  };
}

/** Luminance of every pixel, Rec.709, 0-255. */
function luminance(png: DecodedPng): Float32Array {
  const out = new Float32Array(png.width * png.height);
  for (let pixel = 0; pixel < out.length; pixel += 1) {
    const at = pixel * 4;
    out[pixel] = 0.2126 * png.rgba[at]! + 0.7152 * png.rgba[at + 1]! + 0.0722 * png.rgba[at + 2]!;
  }
  return out;
}

/**
 * How far the estimator looks for the rigid translation between two frames.
 *
 * 24 px, on a 1280x720 frame, doubled from the 12 the lane first shipped. The
 * reason is measured rather than defensive: the first run's record
 * (`artifacts/flicker/RUN-01-REPORT.md`) had the picture moving ~30-35 px
 * between adjacent stills, and with a 12 px radius the coarse pass returns its
 * own edge and reports `0, 0` on four pairs out of nine - a failed search and a
 * still picture, written identically. The gesture is now cut to a few pixels per
 * pair (see `GESTURE_PX` in `motion.ts`), so 24 px is several times the motion
 * this lane is built for and the boundary is a backstop rather than a working
 * edge.
 *
 * The cost of a wider search is real and is why it is not wider still: a 32x32
 * cell-mean pass can lock onto the wrong periodicity in a facade or a fence, and
 * a confident wrong shift is worse than an honest failure. So the pair is
 * *checked* as well as searched - `shiftAtSearchBoundary` fails a pair whose
 * answer sits on this radius, which is what makes widening safe: past the edge
 * the estimator now says it could not follow the picture instead of saying the
 * picture did not move.
 */
const SEARCH_RADIUS = 24;

/**
 * The cells each axis of the coarse pass's mean grid is divided into.
 *
 * 32, so a cell is 40x22 px on a 1280x720 frame. The fine pass's window is
 * derived from this rather than fixed, because a cell mean's quantisation error
 * is half the smaller cell dimension and a window narrower than that cannot reach
 * a shift the coarse pass located.
 */
const COARSE_CELLS = 32;

/**
 * The pixel step the changed-pixel fraction is counted over.
 *
 * 2, so every other pixel in both directions - a quarter of the frame. The
 * fraction is a report rather than a threshold, and a sample of 230,000 pixels
 * at 1280x720 estimates a fraction to well under a tenth of a percent, which is
 * far finer than anything a verdict rests on. The crawl count is not sampled:
 * it visits every pixel in the valid region, because it is the number the
 * verdict is made on.
 */
const SAMPLE_STRIDE = 2;

/**
 * The largest per-channel difference between two pixels of two frames.
 *
 * A function rather than an inline expression so the same arithmetic is used by
 * both the changed-pixel count and the unexplained count: two copies of it could
 * disagree while both look correct.
 */
/**
 * The largest per-channel difference between two pixels of two frames.
 *
 * A function rather than an inline expression so the same arithmetic is used by
 * both the changed-pixel count and the unexplained count: two copies of it could
 * disagree while both look correct.
 *
 * **`leftAt` and `rightAt` are byte offsets, not pixel indices, and the first
 * version's caller passed pixel indices.** Every index was therefore read at a
 * quarter of its intended position - inside the buffer for a 192x108 synthetic
 * frame, where the whole array is 82,944 bytes and a pixel index cannot leave it,
 * and out of bounds for a 1280x720 frame, whose pixel indices run to 921,599
 * against a 3,686,400-byte array. `Uint8Array` returns `undefined` past its end
 * rather than throwing, `Math.abs(undefined - undefined)` is `NaN`, and the
 * comparisons that follow are all false, so the largest difference came back as
 * the *later* of the three channels' byte reads. The synthetic cases never
 * noticed, because every index stayed inside the buffer; the real orbit pair
 * measured `changedFraction` 0.9703 where the true figure at the same estimated
 * shift is 0.1871. Named as bytes in the signature below so the unit is not a
 * thing a caller has to guess.
 */
function channelDelta(left: Uint8Array, right: Uint8Array, leftByte: number, rightByte: number): number {
  const dr = Math.abs(left[leftByte]! - right[rightByte]!);
  const dg = Math.abs(left[leftByte + 1]! - right[rightByte + 1]!);
  const db = Math.abs(left[leftByte + 2]! - right[rightByte + 2]!);
  return dr > dg ? (dr > db ? dr : db) : dg > db ? dg : db;
}

/**
 * The rigid translation that best aligns the earlier frame with the later one,
 * and whether the search ran into its own edge finding it.
 *
 * Two stages, because one cell grid cannot do both jobs. A coarse pass on a
 * 32x32 grid of cell means finds the neighbourhood of the shift - cell means are
 * what makes a search this wide affordable, and pixel noise is not part of the
 * picture the estimator is trying to follow. A second pass then searches every
 * whole-pixel offset in a small window around that answer, scored on the mean
 * absolute luminance difference over every fourth pixel, because a 32x32 grid on
 * a 1280x720 frame quantises the answer to 40 px and a quantised shift leaves
 * the crawl indicator counting the quantisation as unexplained change.
 *
 * **Why the edge is reported rather than merely searched.** A search that finds
 * nothing returns its best cell, and a search whose answer is against the wall
 * returns the wall. Neither is distinguishable from a zero shift by its return
 * value alone, and zero is exactly what the criterion's satisfied case looks
 * like. Reporting the edge is the difference between "the picture did not move"
 * and "the estimator could not follow the picture", and only one of those is a
 * verdict.
 */
function estimateShift(
  previous: Float32Array,
  frame: Float32Array,
  width: number,
  height: number,
  radius: number,
): { shift: { dx: number; dy: number }; atBoundary: boolean; refineWindow: number } {
  // The fine pass's window is the coarse grid's own resolution plus one, so the
  // coarse pass only has to be right about which cell the shift is in - it does
  // not have to be right about the cell's boundary - and a correct shift inside
  // the search radius is always reachable. On a 1280x720 frame that is 41 px; on
  // the 192x108 synthetic field it is 7. Measuring it from the frame rather than
  // fixing it is what keeps a smaller unit frame from searching with a window
  // wider than its own picture.
  const refineWindow = Math.floor(Math.min(width, height) / COARSE_CELLS) + 1;
  const coarse = coarseShift(previous, frame, width, height, radius);
  const refined = refineShift(previous, frame, width, height, coarse, refineWindow);
  // The failure signal is the answer itself sitting on the radius, and nothing
  // else. The coarse pass reaching its outermost cell is *not* enough: with a
  // 40 px cell on 1280x720, a true shift of 22 px against a 24 px radius lands
  // there and is perfectly reachable, so refusing it would fail a pair the
  // estimator modelled. What the fine pass does or does not reach is likewise not
  // a signal - with a window at or above the coarse error it cannot fail. So the
  // question asked is the only one that is well posed: does the shift this
  // estimator is prepared to report end exactly at the edge of what it searched?
  const atBoundary = Math.abs(refined.dx) >= radius || Math.abs(refined.dy) >= radius;
  return { shift: refined, atBoundary, refineWindow };
}

/** The coarse pass: cell means on a 32x32 grid, over the interior only. */
function coarseShift(
  previous: Float32Array,
  frame: Float32Array,
  width: number,
  height: number,
  radius: number,
): { dx: number; dy: number } {
  const cells = COARSE_CELLS;
  const cellW = Math.max(1, Math.floor(width / cells));
  const cellH = Math.max(1, Math.floor(height / cells));

  const previousCells = cellMeans(previous, width, height, cells, cellW, cellH);
  const frameCells = cellMeans(frame, width, height, cells, cellW, cellH);

  const shiftCells = Math.max(1, Math.round(radius / Math.min(cellW, cellH)));
  const margin = shiftCells + 1;

  let best = { dx: 0, dy: 0, cost: Number.POSITIVE_INFINITY };
  for (let dy = -shiftCells; dy <= shiftCells; dy += 1) {
    for (let dx = -shiftCells; dx <= shiftCells; dx += 1) {
      let cost = 0;
      let count = 0;
      for (let cy = margin; cy < cells - margin; cy += 1) {
        for (let cx = margin; cx < cells - margin; cx += 1) {
          const at = cy * cells + cx;
          const source = (cy + dy) * cells + (cx + dx);
          const difference = previousCells[source]! - frameCells[at]!;
          cost += difference * difference;
          count += 1;
        }
      }
      if (count === 0) continue;
      const mean = cost / count;
      if (mean < best.cost) best = { dx, dy, cost: mean };
    }
  }

  return { dx: best.dx * cellW, dy: best.dy * cellH };
}

/** The fine pass: every whole-pixel offset in a small window, on real pixels. */
function refineShift(
  previous: Float32Array,
  frame: Float32Array,
  width: number,
  height: number,
  start: { dx: number; dy: number },
  window: number,
): { dx: number; dy: number } {
  let best = { ...start, cost: Number.POSITIVE_INFINITY };
  for (let dy = start.dy - window; dy <= start.dy + window; dy += 1) {
    for (let dx = start.dx - window; dx <= start.dx + window; dx += 1) {
      const cost = alignedCost(previous, frame, width, height, dx, dy);
      if (cost < best.cost) best = { dx, dy, cost };
    }
  }
  return { dx: best.dx, dy: best.dy };
}

/** Mean absolute luminance difference over the region two frames share at this shift. */
function alignedCost(
  previous: Float32Array,
  frame: Float32Array,
  width: number,
  height: number,
  dx: number,
  dy: number,
): number {
  const valid = validRegion(width, height, { dx, dy });
  let total = 0;
  let count = 0;
  for (let y = valid.y0; y <= valid.y1; y += 4) {
    const row = y * width;
    for (let x = valid.x0; x <= valid.x1; x += 4) {
      const at = row + x;
      total += Math.abs(frame[at]! - previous[at + dy * width + dx]!);
      count += 1;
    }
  }
  return count === 0 ? Number.POSITIVE_INFINITY : total / count;
}

function cellMeans(
  luma: Float32Array,
  width: number,
  height: number,
  cells: number,
  cellW: number,
  cellH: number,
): Float64Array {
  const out = new Float64Array(cells * cells);
  const counts = new Float64Array(cells * cells);
  for (let y = 0; y < height; y += 2) {
    const cy = Math.min(cells - 1, Math.floor(y / cellH));
    const row = y * width;
    for (let x = 0; x < width; x += 2) {
      const cx = Math.min(cells - 1, Math.floor(x / cellW));
      const cell = cy * cells + cx;
      out[cell] = out[cell]! + luma[row + x]!;
      counts[cell] = counts[cell]! + 1;
    }
  }
  for (let cell = 0; cell < out.length; cell += 1) {
    const count = counts[cell]!;
    out[cell] = count === 0 ? 0 : out[cell]! / count;
  }
  return out;
}

/** The rectangle both frames still hold after a shift, so no pixel is invented. */
function validRegion(
  width: number,
  height: number,
  shift: { dx: number; dy: number },
): { x0: number; x1: number; y0: number; y1: number } {
  const x0 = Math.max(0, -shift.dx);
  const x1 = Math.min(width - 1, width - 1 - shift.dx);
  const y0 = Math.max(0, -shift.dy);
  const y1 = Math.min(height - 1, height - 1 - shift.dy);
  return { x0: Math.max(0, x0), x1: Math.max(0, x1), y0: Math.max(0, y0), y1: Math.max(0, y1) };
}

/**
 * Whether this pixel is a hard local feature: brighter or darker than its own
 * 3x3 neighbourhood by more than the bar.
 *
 * The local mean excludes the pixel itself, so a pixel that is exactly its own
 * neighbourhood's average is not a feature however bright the neighbourhood is.
 * A single absolute bar rather than a ratio, because a ratio leg needs a second
 * floor to keep quantisation dither on a dark surface from reading as detail:
 * one flat surface at luminance 3 with a level of dither has a deviation of 1,
 * which is a third of its own mean, and a ratio would call every pixel of it a
 * feature. The absolute contrast is what the eye reads as a feature, and it is
 * what the measured residual has to clear.
 */
function localFeature(
  luma: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  delta: number,
): boolean {
  let sum = 0;
  let count = 0;
  for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny += 1) {
    const row = ny * width;
    for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx += 1) {
      if (nx === x && ny === y) continue;
      sum += luma[row + nx]!;
      count += 1;
    }
  }
  if (count === 0) return false;
  return Math.abs(luma[y * width + x]! - sum / count) > delta;
}

/**
 * The pixels where one frame draws a hard local feature and the other does not.
 *
 * This is the crawl indicator, and it is a persistence test rather than a
 * residual: after the earlier frame is shifted by the best estimate of the
 * camera's own motion, a feature that is still there is the same feature, and a
 * feature that has appeared or vanished is detail the motion does not explain.
 * Counting *luminance* residuals would have counted every feature that moved by
 * less than a pixel as a change; counting whether the feature is still a feature
 * asks the question the eye asks.
 *
 * **The bound this carries.** The estimator finds one rigid translation, so a
 * rotation, a dolly or a newly-occluded edge moves features in ways no single
 * shift can follow and their pixels land here. This is an upper bound on crawl,
 * and `cameraRotationRad` is reported beside it so a reader can see how much of
 * the number the estimator was never going to explain.
 */
function countUnexplained(
  previousLuma: Float32Array,
  frameLuma: Float32Array,
  width: number,
  height: number,
  shift: { dx: number; dy: number },
  contract: FlickerContract,
): { unexplained: number; validPixels: number } {
  const valid = validRegion(width, height, shift);
  let unexplained = 0;
  let validPixels = 0;

  for (let y = valid.y0; y <= valid.y1; y += 1) {
    for (let x = valid.x0; x <= valid.x1; x += 1) {
      validPixels += 1;
      const here = localFeature(frameLuma, width, height, x, y, contract.localMeanDelta);
      const there = localFeature(previousLuma, width, height, x + shift.dx, y + shift.dy, contract.localMeanDelta);
      // One frame draws a feature at this point of the picture and the other
      // does not. XOR rather than difference: a feature that arrives and a
      // feature that leaves are the same defect read in two directions, and
      // counting them as one rather than two is what keeps the bar meaningful.
      if (here !== there) unexplained += 1;
    }
  }

  return { unexplained, validPixels };
}

/** How far the camera and its target moved between two shots, in metres and radians. */
function motionBetween(previous: FramePose, frame: FramePose): {
  travelM: number;
  targetTravelM: number;
  rotationRad: number;
} {
  const travelM = Math.hypot(
    frame.position.x - previous.position.x,
    frame.position.y - previous.position.y,
    frame.position.z - previous.position.z,
  );
  const targetTravelM = Math.hypot(
    frame.target.x - previous.target.x,
    frame.target.y - previous.target.y,
    frame.target.z - previous.target.z,
  );
  let azimuth = Math.abs(frame.azimuth - previous.azimuth);
  if (azimuth > Math.PI) azimuth = Math.abs(azimuth - 2 * Math.PI);
  const polar = Math.abs(frame.polar - previous.polar);
  return { travelM, targetTravelM, rotationRad: Math.hypot(azimuth, polar) };
}
