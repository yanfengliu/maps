/**
 * Population counts and budgets — the one place they are written down.
 *
 * Every number here is either an accepted design decision (`design.md`,
 * `decisions-needed.md`) or a measured constant from the delivered assets. The
 * instance caps and the shadow radius are the coordinator's recorded
 * qualifications and stay hypotheses: they are named here so a hardware
 * measurement can move them without touching the simulation.
 */

export interface PopulationSettings {
  readonly pedestrians: number;
  readonly vehicles: number;
  readonly seed: number;
  /** Fixed steps between spawn attempts for one kind. */
  readonly spawnIntervalTicks: number;
}

/** The acceptance default: 3,000 pedestrians and 200 vehicles. */
export const DEFAULT_POPULATION_SETTINGS: Readonly<PopulationSettings> = Object.freeze({
  pedestrians: 3_000,
  vehicles: 200,
  seed: 0x5b1b0a,
  spawnIntervalTicks: 1,
});

/**
 * Rendering budgets. Hypotheses, not measurements: `population-cost/report.md`
 * never put a camera inside the crowd, so what the surge actually asks of the
 * near level is unmeasured. They cap instances by demotion, never by dropping,
 * so the active count the harness reads stays honest.
 */
export const POPULATION_LIMITS = Object.freeze({
  nearInstances: 160,
  mediumInstances: 640,
  nearThresholdM: 18,
  mediumThresholdM: 60,
  shadowRadiusM: 25,
  /** The authored pedestrian collision footprint and the ORCA personal radius are one number. */
  pedestrianRadiusM: 0.25,
  neighboursPerPedestrian: 8,
});

/**
 * The walking-cadence lock. The delivered walk clip is 32 frames over 1.0 s
 * with a 1.1 m stride and the renderer advances phase by travelled metres over
 * stride, so a pedestrian travelling at exactly this speed times its scale has
 * planted feet by construction. Variety comes from scale and from the surge.
 */
export const PEDESTRIAN_CADENCE_MPS = 1.1;

export const PEDESTRIAN_DYNAMICS = Object.freeze({
  /** Measured cadence, metres per second at scale 1. */
  cadenceMps: PEDESTRIAN_CADENCE_MPS,
  /** The authored collision radius; ORCA and the admission footprint share it. */
  radiusM: POPULATION_LIMITS.pedestrianRadiusM,
  /** Time constant of the speed ramp, seconds. Bounded slide lives on this ramp. */
  accelerationSeconds: 0.4,
  /** Scale range; the walk clip's stride scales with it. */
  minimumScale: 0.92,
  maximumScale: 1.08,
  /** ORCA neighbours are gathered within this radius and capped for determinism and cost. */
  neighbourRadiusM: 8,
  neighbours: POPULATION_LIMITS.neighboursPerPedestrian,
  /** ORCA time horizon and safety margin, seconds. */
  timeHorizonSeconds: 2,
  /**
   * How fast an already-overlapping pair is told to separate, and over how long.
   *
   * `separationSpeed = min(maximumSeparationMps, penetration / separationSeconds)`,
   * so the bound is a speed and never a force or a displacement: one metre per
   * second for at most half a second's worth of penetration, and a pair that is
   * merely touching is asked to part at a walking pace rather than shoved.
   */
  maximumSeparationMps: 1,
  separationSeconds: 0.5,
  /**
   * The body-ahead gate the walking step applies, metres. A walker may close to
   * within the sum of the two collision radii of the body in front of it and no
   * further, which is the collision envelope's own bound rather than a comfort
   * spacing; the query radius is how far ahead that gate looks, and one tick's
   * advance at the fastest cadence is under two centimetres.
   */
  spacingQueryRadiusM: 1.5,
  /**
   * How far apart two walkers must be for a second one to materialize at a portal.
   * The bound is the two collision envelopes: a body may not appear inside another
   * body. Measured on the revision before this, 3,000 pedestrians spawned at 33
   * portals piled an average of 65 neighbours inside 2 m of every walker.
   */
  spawnClearanceM: 0.5,
  /** Spatial hash cell edge, metres. */
  cellSizeM: 4,
  /** How far short of a governed gate an unadmitted actor halts, metres. */
  gateMarginM: 0.05,
});

/** Per-vehicle-class scale, drawn once per spawn so a lane never reshuffles. */
export const VEHICLE_DYNAMICS = Object.freeze({
  minimumScale: 0.96,
  maximumScale: 1.04,
  /**
   * IDM, with one constant that is this fleet's own and one that is not.
   *
   * `standstillClearanceM` is the gap held **between two bodies** when they are
   * stopped: the free distance from the front face of the follower's collision
   * envelope to the rear face of the leader's, on the vehicles the manifests
   * author (kei 1.920 x 3.573, taxi 2.140 x 4.573, bus 3.280 x 10.565 m). Two
   * metres is IDM's own published standstill distance and it is a *clearance*: for
   * the 4.573 m taxi it is 2 m of air between two bumpers, not 2 m between two
   * origins. The constant it replaced was 0.5 m measured origin to origin, which
   * for every class in this fleet is a negative clearance, so a queue at rest was a
   * stack of overlapping bodies — measured on the revision before this change at
   * 200 vehicles and 3,600 ticks: 120 oriented-box overlapping pairs among 71
   * active bodies, deepest longitudinal overlap 4.691 m.
   *
   * The network contract's own 0.5 m `admissionBounds.stopGapM` is a different
   * quantity and is not changed here: it is the room a body leaves in front of a
   * conflict area it is waiting to enter, the route planner applies it to the
   * body's own hull, and the car-following law reads it from the network for a halt
   * (see `haltLeader` in `vehicles.ts`). It is never used as spacing between bodies.
   */
  idm: Object.freeze({
    standstillClearanceM: 2,
    headwaySeconds: 1.2,
    maximumAccelerationMps2: 1.5,
    comfortableBrakingMps2: 2,
    /** The fastest a car in this network is allowed to brake; IDM is clamped to it. */
    emergencyBrakingMps2: 4.5,
    /** Free-flow speed is the edge limit times this per-actor factor. */
    minimumSpeedFactor: 0.85,
    maximumSpeedFactor: 1,
    /** A stationary actor's speed below this counts as stopped for measured dwell. */
    stoppedSpeedMps: 0.05,
  }),
  /** MOBIL, with the standard published constants. */
  mobil: Object.freeze({
    politeness: 0.2,
    /** Required improvement in the follower's acceleration, m/s^2. */
    safeBrakingMps2: 3,
    minimumAdvantageMps2: 0.2,
    /** Lateral shift speed when changing lanes, metres per second. */
    lateralRateMps: 1.2,
  }),
});

export function populationSettings(overrides: Partial<PopulationSettings> = {}): PopulationSettings {
  const settings: PopulationSettings = { ...DEFAULT_POPULATION_SETTINGS, ...overrides };
  for (const key of ["pedestrians", "vehicles", "seed", "spawnIntervalTicks"] as const) {
    if (!Number.isInteger(settings[key]) || settings[key] < 0) {
      throw new Error(`Population setting ${key}=${settings[key]} must be a non-negative integer; it comes from the URL query (?agents=) or the app default.`);
    }
  }
  if (settings.spawnIntervalTicks < 1) {
    throw new Error("Population setting spawnIntervalTicks must be at least 1; a spawn schedule cannot run more often than the fixed step.");
  }
  if (settings.pedestrians > 65_535 || settings.vehicles > 65_535) {
    throw new Error(`Population counts ${settings.pedestrians}/${settings.vehicles} exceed the 65,535 slots one instanced draw can address.`);
  }
  return Object.freeze(settings);
}

/**
 * `?agents=` — the same URL path `?time=` and `?seed=` already use.
 *
 * Absent means population off, so a run with no query parameter renders exactly
 * what it rendered before this module existed and the existing appearance
 * evidence is not invalidated. `?agents=0` is the population-free appearance
 * sweep and `?agents=1` is the default populated run.
 */
export function populationFromQuery(query: string): PopulationSettings {
  const requested = new URLSearchParams(query).get("agents");
  if (requested === null) return populationSettings({ pedestrians: 0, vehicles: 0 });
  if (requested !== "0" && requested !== "1") {
    throw new Error(`"${requested}" is not a population setting this scene knows. ?agents= takes 0 (population off, the appearance sweep) or 1 (the default populated run).`);
  }
  return populationSettings(requested === "0" ? { pedestrians: 0, vehicles: 0 } : {});
}
