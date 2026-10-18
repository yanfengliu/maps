/** Authored northern station turnback; this is not a real railway timetable. */
export const TRAIN_CAR_COUNT = 4;
export const TRAIN_CAR_PITCH = 20.35;
export const TRAIN_CAR_LENGTH = 19.6;
export const TRAIN_MAX_SPEED = 12;
export const TRAIN_ACCELERATION = 0.8;
export const TRAIN_DWELL_SECONDS = 12;

export function createTrainSchedule(from: number, to: number) {
  const distance = to - from, rampSeconds = TRAIN_MAX_SPEED / TRAIN_ACCELERATION;
  const rampDistance = TRAIN_MAX_SPEED * rampSeconds / 2;
  if (!Number.isFinite(distance) || distance <= 2 * rampDistance) throw Error(`Train interval ${from}..${to} needs more than ${2 * rampDistance} source metres for its acceleration and braking.`);
  const travelSeconds = distance / TRAIN_MAX_SPEED + rampSeconds;
  const period = 2 * (travelSeconds + TRAIN_DWELL_SECONDS);
  const travel = (t: number): { distance: number; speed: number } => {
    if (t < rampSeconds) return { distance: TRAIN_ACCELERATION * t * t / 2, speed: TRAIN_ACCELERATION * t };
    if (t > travelSeconds - rampSeconds) { const remaining = travelSeconds - t; return { distance: distance - TRAIN_ACCELERATION * remaining * remaining / 2, speed: TRAIN_ACCELERATION * remaining }; }
    return { distance: rampDistance + TRAIN_MAX_SPEED * (t - rampSeconds), speed: TRAIN_MAX_SPEED };
  };
  return {
    period, travelSeconds,
    /** Select startup phase without changing the continuous turnback path. */
    initialPhase(station: number, direction: 1 | -1 = 1): number {
      const d = direction === 1 ? station - from : to - station;
      if (d < 0 || d > distance) throw Error(`Train initial station ${station} is outside ${from}..${to}.`);
      const t = d < rampDistance ? Math.sqrt(2 * d / TRAIN_ACCELERATION) : d > distance - rampDistance ? travelSeconds - Math.sqrt(2 * (distance - d) / TRAIN_ACCELERATION) : rampSeconds + (d - rampDistance) / TRAIN_MAX_SPEED;
      return direction === 1 ? t : travelSeconds + TRAIN_DWELL_SECONDS + t;
    },
    sample(seconds: number) {
      const t = ((seconds % period) + period) % period;
      if (t < travelSeconds) { const p = travel(t); return { station: from + p.distance, speed: p.speed, direction: 1 as const, dwelling: false }; }
      if (t < travelSeconds + TRAIN_DWELL_SECONDS) return { station: to, speed: 0, direction: 1 as const, dwelling: true };
      if (t < 2 * travelSeconds + TRAIN_DWELL_SECONDS) { const p = travel(t - travelSeconds - TRAIN_DWELL_SECONDS); return { station: to - p.distance, speed: p.speed, direction: -1 as const, dwelling: false }; }
      return { station: from, speed: 0, direction: -1 as const, dwelling: true };
    },
  };
}
