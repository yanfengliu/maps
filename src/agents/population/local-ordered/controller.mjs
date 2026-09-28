import {Vector3,Quaternion,Matrix4} from 'three';
import {solveLeg} from './solve-leg.mjs';
// Retained ordered support controller with bounded walking width/clearance authoring.
export function createOrderedFootEngine(normalizedFloor){
// harness: frozen contact-f7-selection analytic leg solve; independent causal contact clock replaces its controller entirely.
// Authoring choices: 70mm walking / 35mm stopped-turn clearance, 60ms target freeze,
// at most35mm extra lowering below the existing idle source.
const up = new Vector3(0, 1, 0), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const xyz = m => new Vector3().setFromMatrixPosition(m);
const policy = Object.freeze({ name: 'v2', height: .035, walkingHeight: .070, maxExtraDrop: .035, targetFreeze: .06, supportLagTrigger: .065, maxSwing: .40, minSwing: .27 });
const duration = speed => clamp(.33 - .03 * speed, policy.minSwing, policy.maxSwing);
function local(p, body, yaw) { return new Vector3(...p).sub(new Vector3(...body)).applyAxisAngle(up, -yaw); }
function predict(input, rate, seconds) {
  if (input.bodyForecast) return input.bodyForecast(input.time + seconds);
  const [x, y, z] = input.body, angle = input.yaw, v = input.speed;
  if (input.stationaryTurnGoal !== undefined && v === 0) {
    const goal = input.stationaryTurnGoal, projected = angle + rate * seconds;
    return { body: [...input.body], yaw: goal >= angle ? clamp(projected, angle, goal) : clamp(projected, goal, angle) };
  }
  return { body: Math.abs(rate) < 1e-7 ? [x + Math.sin(angle) * v * seconds, y, z + Math.cos(angle) * v * seconds] : [x + v * (Math.cos(angle) - Math.cos(angle + rate * seconds)) / rate, y, z + v * (Math.sin(angle + rate * seconds) - Math.sin(angle)) / rate], yaw: angle + rate * seconds };
}
function requiredDrop(foot, body, yaw, point = foot.p) {
  const t = local(point, body, yaw), dx = t.x - foot.hip[0], dz = t.z - foot.hip[2];
  const square = (foot.length - .002) ** 2 - dx * dx - dz * dz;
  return square < 0 ? Infinity : foot.hip[1] - t.y - Math.sqrt(square);
}
function endpoint(f, input, rate, remaining, swingT) {
  const future = predict(input, rate, remaining);
  const lead = input.speed * swingT * .4;
  // Only a future walking landing narrows; existing anchors and stopped turns keep their contract.
  const lateral = input.speed > 0 ? f.hip[0] : f.home[0];
  const offset = new Vector3(lateral, 0, f.home[2] + lead).applyAxisAngle(up, future.yaw);
  const x = future.body[0] + offset.x, z = future.body[2] + offset.z, floor = normalizedFloor(x, z);
  return { p: [x, f.ground + floor.y, z], yaw: future.yaw, patch: floor.patch };
}
// Exact quintic boundary interpolation, returning position, velocity and acceleration.
function advance(p, v, a, target, T, dt) {
  if (!(T > 0)) return { p: target, v: 0, a: 0 };
  const t = Math.min(dt, T), delta = target - p, t2 = T * T, t3 = t2 * T;
  const c3 = (10 * delta - 6 * v * T - 1.5 * a * t2) / t3;
  const c4 = (-15 * delta + 8 * v * T + 1.5 * a * t2) / (t3 * T);
  const c5 = (6 * delta - 3 * v * T - .5 * a * t2) / (t3 * t2);
  return { p: p + v * t + .5 * a * t * t + c3 * t ** 3 + c4 * t ** 4 + c5 * t ** 5,
    v: v + a * t + 3 * c3 * t ** 2 + 4 * c4 * t ** 3 + 5 * c5 * t ** 4,
    a: a + 6 * c3 * t + 12 * c4 * t ** 2 + 20 * c5 * t ** 3 };
}

// At most four-by-four duration pairs. Preserve the inherited nine ground-height
// samples, and reserve a next departure plus one60Hz observation interval.
// This is current-command extrapolation, not a future-command guarantee.
function flightEnvelope(f, support, input, rate, T) {
  const target = endpoint(f, input, rate, T, T); let maximum = -Infinity, worst = null;
  for (let j = 0; j <= 8; j++) {
    const seconds = T * j / 8, future = predict(input, rate, seconds);
    const p = [advance(f.p[0], f.v[0], f.a[0], target.p[0], T, seconds).p, f.ground + future.body[1], advance(f.p[2], f.v[2], f.a[2], target.p[2], T, seconds).p];
    for (const [which, drop] of [['swing', requiredDrop(f, future.body, future.yaw, p)], ['support', requiredDrop(support, future.body, future.yaw)]]) {
      if (drop > maximum) { maximum = drop; worst = { which, seconds, sample: j, drop }; }
    }
  }
  return { T, target, predictedMaximumDrop: maximum, worst };
}
function chooseDuration(f, state, input, rate, baseT, ratio = 1) {
  if (ratio !== 1 || f.mode !== 'plant' || state.feet[1 - f.side].mode !== 'plant') throw Error('Next-departure selection requires two actual planted feet and a complete flight.');
  const support = state.feet[1 - f.side], delay = Math.max(1 / 60, input.time - state.previous.time), candidates = [];
  let bestFailure = null;
  for (const factor of [1, .85, .70, .55]) {
    const T = baseT * factor, first = flightEnvelope(f, support, input, rate, T);
    const landed = { ...f, p: first.target.p, v: [0, 0, 0], a: [0, 0, 0] };
    let waitingMaximum = -Infinity;
    for (let j = 0; j <= 8; j++) {
      const future = predict(input, rate, T + delay * j / 8);
      waitingMaximum = Math.max(waitingMaximum, requiredDrop(support, future.body, future.yaw), requiredDrop(landed, future.body, future.yaw));
    }
    const nextPose = predict(input, rate, T + delay), nextInput = { ...input, ...nextPose, time: input.time + T + delay }, successors = [];
    for (const nextFactor of [1, .85, .70, .55]) {
      const next = flightEnvelope(support, landed, nextInput, rate, baseT * nextFactor);
      const maximum = Math.max(first.predictedMaximumDrop, waitingMaximum, next.predictedMaximumDrop);
      const pair = { T, remaining: T, successorT: next.T, delay, predictedMaximumDrop: maximum, first, waitingMaximum, next };
      successors.push(pair);
      if (!bestFailure || maximum < bestFailure.predictedMaximumDrop) bestFailure = pair;
      if (maximum + .003 <= policy.maxExtraDrop) {
        state.departureSelection = { time: input.time, side: f.side, selected: pair, rejected: candidates, prediction: 'constant current speed and yaw rate; next-departure condition only' };
        return { T, remaining: T, predictedMaximumDrop: maximum };
      }
    }
    candidates.push({ T, first, waitingMaximum, successors });
  }
  state.departureSelection = { time: input.time, side: f.side, selected: null, rejected: candidates, prediction: 'constant current speed and yaw rate; next-departure condition only' };
  state.failure = { kind: 'bounded-next-departure-selection', time: input.time, side: f.side, bestFailure, candidates: 16, samplesPerFlight: 9, delay, body: [...input.body], anchors: state.feet.map(foot => [...foot.p]) };
  return null;
}


function swing(f, state, input, rate, T, remaining = T, initial = false) {
  f.mode = 'swing'; f.start = input.time - (T - remaining); f.end = input.time + remaining;
  f.apex = f.start + T / 2; f.swingT = T; f.frozen = false;
  const target = endpoint(f, input, rate, remaining, T); f.target = target.p; f.targetYaw = target.yaw; f.targetPatch = target.patch; f.swingHeight = input.speed > 0 ? policy.walkingHeight : policy.height; f.apexY = Math.max(f.p[1], f.target[1]) + f.swingHeight;
  if (!initial) { f.v = [0, 0, 0]; f.a = [0, 0, 0]; f.yawV = 0; f.yawA = 0; }
  state.events.push({ time: input.time, event: 'liftoff', side: f.side, initial, end: f.end, anchor: [...f.p], target: [...f.target] });
}
// Own-spawn only: each candidate is a synthetic constant-speed, zero-yaw-rate
// world flight. Sample its full p/v/a trajectory at the supplied phase; this
// does not claim an observed body history before this controller was created.
function spawnQuintic(from, to, T, elapsed) {
  const u = elapsed / T, r = u <= .5 ? u : 1 - u, delta = to - from;
  const q = r ** 3 * (10 - 15 * r + 6 * r * r);
  const q1 = 30 * r * r * (1 - r) ** 2;
  const q2 = 60 * r * (1 - r) * (1 - 2 * r) * (u <= .5 ? 1 : -1);
  return { p: u <= .5 ? from + delta * q : to - delta * q, v: delta * q1 / T, a: delta * q2 / (T * T) };
}
function spawnFlight(f, input, T) {
  const progress = 2 * f.seedCycle - 1, elapsed = progress * T;
  const past = predict(input, 0, -elapsed), future = predict(input, 0, T - elapsed);
  const startOffset = new Vector3(f.home[0], f.ground, f.home[2] - .6 * input.speed * T).applyAxisAngle(up, input.yaw);
  const endOffset = new Vector3(f.home[0], f.ground, f.home[2] + .4 * input.speed * T).applyAxisAngle(up, input.yaw);
  const from = startOffset.add(new Vector3(...past.body)).toArray(), target = endOffset.add(new Vector3(...future.body)).toArray();
  return { from, target, elapsed, T, start: input.time - elapsed, apex: input.time - elapsed + T / 2, end: input.time + (1 - progress) * T, yaw: input.yaw };
}
function sampleSpawnFlight(flight, elapsed) {
  const axes = [0, 1, 2].map(k => spawnQuintic(flight.from[k], flight.target[k], flight.T, elapsed));
  const rising = elapsed <= flight.T / 2;
  axes[1] = spawnQuintic(flight.from[1] + (rising ? 0 : policy.height), flight.target[1] + (rising ? policy.height : 0), flight.T / 2, rising ? elapsed : elapsed - flight.T / 2);
  return { p: axes.map(a => a.p), v: axes.map(a => a.v), a: axes.map(a => a.a), yaw: flight.yaw, yawV: 0, yawA: 0 };
}
function spawnCandidate(templates, input, T) {
  return templates.map(base => {
    const f = structuredClone(base);
    if (input.speed === 0) {
      f.p = new Vector3(...f.home).applyAxisAngle(up, input.yaw).add(new Vector3(...input.body)).toArray();
    } else if (f.seedCycle < .5) {
      f.p = new Vector3(f.home[0], f.ground, f.home[2] + input.speed * T * (.4 - 2 * f.seedCycle)).applyAxisAngle(up, input.yaw).add(new Vector3(...input.body)).toArray();
    } else {
      const flight = spawnFlight(f, input, T);
      Object.assign(f, sampleSpawnFlight(flight, flight.elapsed), { mode: 'swing', start: flight.start, apex: flight.apex, end: flight.end, swingT: T, frozen: false, target: flight.target, targetYaw: flight.yaw, spawnFlight: flight });
    }
    return f;
  });
}
// Initialization only: bound both rig legs over a full constant-speed periodic
// stance/swing cycle. This selector reads neither seedCycle nor world placement.
// The derivative of g(u)=2Q(u)-u-.6 is 60u^2(1-u)^2-1.
function spawnEnvelope(templates, speed, T) {
  const r = (1 - Math.sqrt(1 - 4 / Math.sqrt(60))) / 2;
  const g = u => 2 * u ** 3 * (10 - 15 * u + 6 * u * u) - u - .6;
  const values = [0, r, 1-r, 1].map(g), range = [Math.min(...values), Math.max(...values)];
  const legs = templates.map(f => {
    const dx = f.home[0] - f.hip[0];
    const extremes = range.map(c => {
      const dz = f.home[2] - f.hip[2] + c * speed * T;
      const square = (f.length - .002) ** 2 - dx * dx - dz * dz;
      return { c, square, requiredDrop: square < 0 ? Infinity : f.hip[1] - f.ground - Math.sqrt(square) };
    });
    return { side: f.side, extremes, maximum: Math.max(...extremes.map(e => e.requiredDrop)) };
  });
  return { T, range, legs, predictedMaximumDrop: Math.max(...legs.map(f => f.maximum)) };
}

function init(d, phase, input) {
  if (![phase, input.time, ...input.body, input.yaw, input.speed].every(Number.isFinite) || input.speed < 0) throw Error('Gait spawn requires finite phase/current body XYZ/yaw/time and nonnegative speed.');
  const baseT = duration(input.speed), templates = d.bones.map((b, side) => {
    const home = xyz(d.worlds[b.foot]), hip = xyz(d.worlds[b.thigh]), knee = xyz(d.worlds[b.calf]);
    const raw = phase + side * .5, seedCycle = raw - Math.floor(raw);
    return { side, home: home.toArray(), hip: hip.toArray(), length: hip.distanceTo(knee) + knee.distanceTo(home), ground: home.y, p: home.toArray(), v: [0, 0, 0], a: [0, 0, 0], yaw: input.yaw, yawV: 0, yawA: 0, mode: 'plant', seedCycle, target: null, end: input.time };
  });
  let feet = spawnCandidate(templates, input, baseT), selectionFailure = null, selectedT = input.speed === 0 ? null : undefined;
  const candidates = [];
  if (input.speed > 0) {
    let bestFailure = null;
    for (const factor of [1, .85, .70, .55]) {
      const envelope = spawnEnvelope(templates, input.speed, baseT * factor);
      candidates.push(envelope);
      if (!bestFailure || envelope.predictedMaximumDrop < bestFailure.predictedMaximumDrop) bestFailure = envelope;
      if (envelope.predictedMaximumDrop + .003 <= policy.maxExtraDrop) { selectedT = envelope.T; feet = spawnCandidate(templates, input, selectedT); break; }
    }
    if (selectedT === undefined) { selectedT = null; selectionFailure = { kind: 'bounded-periodic-spawn-envelope', time: input.time, bestFailure, candidates: 4, assumption: 'constant speed, zero yaw rate, fixed level plane; every phase and both legs' }; }
  }
  for (const f of feet) { const floor = normalizedFloor(f.p[0], f.p[2]); f.p[1] = f.ground + floor.y; f.patch = floor.patch; }
  const state = { feet, walkPhase: input.speed > 0 ? ((phase % 1) + 1) % 1 : .75, walkPhaseFlight: null, sourcePhase: phase, sourceBlend: input.speed > 0 ? 1 : 0, drop: 0, requiredDrop: 0, previous: { time: input.time, yaw: input.yaw, speed: input.speed }, events: [], failure: selectionFailure, spawnSelection: { selectedT, candidates, assumption: 'constant current speed and zero yaw rate; synthetic history; one selected duration for both phase placements' } };
  for (const f of feet) if (f.mode === 'swing') state.events.push({ time: input.time, event: 'liftoff', side: f.side, initial: true, end: f.end, anchor: [...f.p], target: [...f.target] });
  const needed = Math.max(0, ...feet.map(f => requiredDrop(f, input.body, input.yaw) + .003));
  state.requiredDrop = needed; state.drop = Math.min(policy.maxExtraDrop, needed);
  if (needed > policy.maxExtraDrop) state.failure ??= { kind: 'spawn-posture-envelope', time: input.time, requiredDrop: needed };
  return state;
}

// Source walk phase 0 has the left foot forward; .5 has the right forward.
// Start a stopped actor at the neutral quarter before its first left landing.
// Only accepted foot flights advance this unwrapped clock; planted gaps hold it.
function updateWalkPhase(state, input) {
  const foot = state.feet.find(f => f.mode === 'swing');
  if (foot && (state.walkPhaseFlight?.side !== foot.side || state.walkPhaseFlight.start !== foot.start)) {
    const phase = state.walkPhase, landing = foot.side === 0 ? 0 : .5;
    state.walkPhaseFlight = { side: foot.side, start: foot.start, fromTime: Math.max(foot.start, state.previous.time), end: foot.end,
      from: phase, to: phase + ((landing - phase % 1 + 1) % 1) };
  }
  const flight = state.walkPhaseFlight;
  if (flight) state.walkPhase = flight.from + (flight.to - flight.from) * clamp((input.time - flight.fromTime) / (flight.end - flight.fromTime), 0, 1);
}

function updateWalking(state, input, evaluatedFlights) {
  if (state.failure) return;
  const dt = input.time - state.previous.time;
  if (!(dt > 0) || ![...input.body, input.yaw, input.speed, input.time].every(Number.isFinite)) throw Error('Gait update requires finite current body XYZ/yaw/speed and strictly increasing time.');
  const rate = (input.yaw - state.previous.yaw) / dt;
  const wasMoving = state.feet.some(f => f.mode === 'swing');
  for (const f of state.feet) {
    if (f.mode === 'plant') continue;
    const remaining = f.end - state.previous.time;
    if (!f.frozen && remaining > policy.targetFreeze) { const target = endpoint(f, input, rate, Math.max(0, f.end - input.time), f.swingT); f.target = target.p; f.targetYaw = target.yaw; f.targetPatch = target.patch; }
    else f.frozen = true;
    if (evaluatedFlights) evaluatedFlights.push(describeFootTrajectory(f, input, state.previous.time, input.time, 'evaluated-update'));
    for (const axis of [0, 2]) { const next = advance(f.p[axis], f.v[axis], f.a[axis], f.target[axis], remaining, dt); f.p[axis] = next.p; f.v[axis] = next.v; f.a[axis] = next.a; }
    // Split exactly at the apex so a validation tick does not skip the C2 vertical event.
    let left = dt, now = state.previous.time;
    while (left > 1e-12) {
      const rising = now < f.apex - 1e-12, deadline = rising ? f.apex : f.end, step = Math.min(left, Math.max(0, deadline - now));
      if (step <= 1e-12) break;
      const next = advance(f.p[1], f.v[1], f.a[1], rising ? f.apexY : f.target[1], deadline - now, step);
      f.p[1] = next.p; f.v[1] = next.v; f.a[1] = next.a; now += step; left -= step;
    }
    const turn = advance(f.yaw, f.yawV, f.yawA, f.targetYaw, remaining, dt); f.yaw = turn.p; f.yawV = turn.v; f.yawA = turn.a;
    if (input.time >= f.end - 1e-10) { f.mode = 'plant'; f.p[1] = f.target[1]; f.patch = f.targetPatch; f.v = [0, 0, 0]; f.a = [0, 0, 0]; f.yawV = f.yawA = 0; state.events.push({ time: input.time, exactEnd: f.end, event: 'plant', side: f.side, anchor: [...f.p] }); }
  }
  if (!wasMoving && state.feet.every(f => f.mode === 'plant') && input.speed > 0) {
    const order = state.feet.map(f => ({ f, lag: f.home[2] - local(f.p, input.body, input.yaw).z, yawError: Math.abs(f.yaw - input.yaw) })).sort((a, b) => b.lag - a.lag || a.f.side - b.f.side);
    const chosen = order[0];
    if (chosen.lag > policy.supportLagTrigger || chosen.yawError > .25) {
      const selected = chooseDuration(chosen.f, state, input, rate, duration(input.speed));
      if (selected) swing(chosen.f, state, input, rate, selected.T);
    }
  }
  const needed = Math.max(0, ...state.feet.map(f => requiredDrop(f, input.body, input.yaw) + .003));
  state.requiredDrop = needed;
  if (needed > policy.maxExtraDrop) state.failure ??= { kind: 'posture-envelope', time: input.time, requiredDrop: needed };
  state.drop = Math.min(policy.maxExtraDrop, needed);
  const moving = state.feet.some(f => f.mode === 'swing');
  if (moving || wasMoving) state.sourcePhase = (state.sourcePhase + dt / (2 * duration(Math.max(input.speed, .1)))) % 1;
  state.sourceBlend = clamp(state.sourceBlend + (moving || input.speed > 0 ? 1 : -1) * dt / .25, 0, 1);
  updateWalkPhase(state, input);
  state.previous = { time: input.time, yaw: input.yaw, speed: input.speed };
}
function scenePose(d, source, state, input) {
  const body = new Vector3(...input.body), inverse = new Quaternion().setFromAxisAngle(up, -input.yaw);
  const solves = state.feet.map((f, side) => solveLeg(d, side, new Vector3(...f.p).sub(body).applyQuaternion(inverse), f.yaw - input.yaw, state.drop));
  if (solves.some(s => !s.valid)) return { valid: false, solves, reachError: Math.max(...solves.map(s => s.reachError)) };
  const mats = d.worlds.map(m => new Matrix4().makeTranslation(0, -state.drop, 0).multiply(m));
  for (const solve of solves) for (let i = 0; i < d.g.nodes.length; i++) { let a = i; while (a !== undefined && !solve.transforms.has(a)) a = d.parents[a]; if (a !== undefined) mats[i] = solve.transforms.get(a).clone().multiply(d.worlds[i]); }
  const walk = source.worldsAt('walk', state.walkPhase ?? state.sourcePhase).worlds, idle = source.worldsAt('idle', state.sourcePhase).worlds;
  const pelvis = d.g.nodes.findIndex(n => n.name === 'pelvis'), spine = d.g.nodes.findIndex(n => n.name === 'spine_01');
  const alignWalk = mats[pelvis].clone().multiply(walk[pelvis].clone().invert()), alignIdle = mats[pelvis].clone().multiply(idle[pelvis].clone().invert());
  for (const n of source.jointNodes) { let a = n; while (a !== undefined && a !== spine) a = d.parents[a]; if (a === spine) { const w = alignWalk.clone().multiply(walk[n]), i = alignIdle.clone().multiply(idle[n]); mats[n] = new Matrix4().fromArray(i.elements.map((v, k) => v + state.sourceBlend * (w.elements[k] - v))); } }
  return { valid: true, solves, mats, reachError: 0, point(v) { return d.sample(0, v.id, 'idle').add(d.skin(v, mats)).sub(d.skin(v)).applyAxisAngle(up, input.yaw).add(body); } };
}

// Explicit stationary-turn extension. This is an ignored finite prototype.
// The no-turn state path calls the original update unchanged. Source/physical
// travel and body authority are never owned or written by this controller.
const ALIGN_NUMERIC = 1e-8;
function turnFootError(f, input, heading) {
  const offset = new Vector3(f.home[0], 0, f.home[2]).applyAxisAngle(up, heading);
  return { heading: Math.abs(f.yaw - heading), anchor: Math.hypot(f.p[0] - input.body[0] - offset.x, f.p[1] - normalizedFloor(f.p[0], f.p[2]).y - f.ground, f.p[2] - input.body[2] - offset.z) };
}
// A polynomial is anchored at originTime; its domain ends at deadline. The
// coefficient order is constant through quintic. Keep advance() unchanged so
// the no-turn path retains its original floating-point evaluation order.
function describePolynomial(p, v, a, target, originTime, deadline) {
  const T = deadline - originTime, t2 = T * T, t3 = t2 * T, delta = target - p;
  return { originTime, deadline, target, coefficients: [p, v, .5 * a,
    (10 * delta - 6 * v * T - 1.5 * a * t2) / t3,
    (-15 * delta + 8 * v * T + 1.5 * a * t2) / (t3 * T),
    (6 * delta - 3 * v * T - .5 * a * t2) / (t3 * t2)] };
}
function footState(f) { return { p: [...f.p], yaw: f.yaw, v: [...f.v], a: [...f.a], yawV: f.yawV, yawA: f.yawA }; }
function describeFootTrajectory(f, input, fromTime, throughTime, scope) {
  const endTime = Math.min(throughTime, f.end), vertical = [];
  let now = fromTime, p = f.p[1], v = f.v[1], a = f.a[1];
  while (now < endTime - 1e-12) {
    const rising = now < f.apex - 1e-12, deadline = rising ? f.apex : f.end;
    const target = rising ? f.apexY : f.target[1];
    const segmentEnd = Math.min(endTime, deadline);
    vertical.push({ ...describePolynomial(p, v, a, target, now, deadline), throughTime: segmentEnd });
    const next = advance(p, v, a, target, deadline - now, segmentEnd - now);
    p = next.p; v = next.v; a = next.a; now = segmentEnd;
  }
  return { scope, side: f.side, fromTime, throughTime, evaluatedThroughTime: endTime,
    from: footState(f), target: { p: [...f.target], yaw: f.targetYaw },
    flight: { start: f.start, apex: f.apex, end: f.end, height: f.swingHeight ?? policy.height, frozen: f.frozen },
    x: describePolynomial(f.p[0], f.v[0], f.a[0], f.target[0], fromTime, f.end),
    z: describePolynomial(f.p[2], f.v[2], f.a[2], f.target[2], fromTime, f.end),
    yaw: describePolynomial(f.yaw, f.yawV, f.yawA, f.targetYaw, fromTime, f.end),
    vertical, holdAfterEnd: throughTime > f.end ? { fromTime: f.end, throughTime, p: [...f.target], yaw: f.targetYaw } : null };
}
function turnProposal(before, after, state, input, kind, trajectory) {
  return { kind, requestId: state.turnControl?.id ?? 'walking', side: after.side, time: input.time, end: after.end, body: [...input.body], bodyYaw: input.yaw, speed: input.speed,
    from: { p: [...before.p], yaw: before.yaw, v: [...before.v], a: [...before.a], yawV: before.yawV, yawA: before.yawA },
    observedNext: footState(after), trajectory, target: { p: [...after.target], yaw: after.targetYaw },
    swing: { start: after.start, apex: after.apex, end: after.end, height: after.swingHeight ?? policy.height, frozen: after.frozen },
    sourceSurface: before.patch.id, landingSurface: after.targetPatch.id };
}
function update(state, input, admitFootMotion) {
  if (!input.turn && !state.turnControl) {
    const draft = structuredClone(state), flights = []; updateWalking(draft, input, flights); draft.lastIntervals = [];
    if (!draft.failure) for (let side = 0; side < 2; side++) {
      const a = state.feet[side], b = draft.feet[side]; if (a.mode !== 'swing' && b.mode !== 'swing') continue;
      const kind = a.mode === 'plant' ? 'departure' : 'advance';
      const trajectory = kind === 'departure' ? describeFootTrajectory(b, input, input.time, b.end, 'proposed-flight') : flights.find(f => f.side === side);
      const proposal = turnProposal(a, b, draft, input, kind, trajectory); draft.lastIntervals.push(proposal);
      const admission = admitFootMotion(structuredClone(proposal), structuredClone(draft), input);
      if (!admission?.ok) { state.failure = { kind: 'walking-foot-admission', time: input.time, proposal, admission }; return; }
    }
    Object.assign(state, draft); return;
  }
  if (state.failure) return;
  if (input.speed !== 0 || (input.turn && (typeof input.turn.id !== 'string' || !input.turn.id || !Number.isFinite(input.turn.targetYaw)))) throw Error('Stationary turn requires zero actual speed and a finite named turn request.');
  if (typeof admitFootMotion !== 'function') throw Error('Stationary turn requires an explicit support and swept-foot admission fixture.');
  const before = structuredClone(state), draft = structuredClone(state), rate = (input.yaw - state.previous.yaw) / (input.time - state.previous.time);
  const changed = draft.turnControl && (!input.turn || input.turn.id !== draft.turnControl.id || input.turn.targetYaw !== draft.turnControl.targetYaw);
  const goal = input.turn?.targetYaw ?? input.yaw;
  draft.turnControl = { id: input.turn?.id ?? draft.turnControl.id, targetYaw: goal, cancelled: !input.turn, status: 'waiting', admissions: draft.turnControl?.admissions ?? [], proposals: draft.turnControl?.proposals ?? [] };
  // Cancellation/replacement preserves an already admitted landing rather than
  // snapping the airborne foot to a new command or changing its flight time.
  if (changed) for (const f of draft.feet) if (f.mode === 'swing') f.frozen = true;
  const effective = { ...input, stationaryTurnGoal: goal };
  draft.lastIntervals = [];
  const beganAirborne = before.feet.some(f => f.mode === 'swing'), evaluatedFlights = [];
  updateWalking(draft, effective, evaluatedFlights);
  // Landing commits by itself. A new flight needs a later planted-begin update.
  if (!beganAirborne && !draft.failure && draft.feet.every(f => f.mode === 'plant')) {
    const desired = endpoint(draft.feet[0], effective, rate, duration(0), duration(0)).yaw;
    const order = draft.feet.map(f => ({ f, error: turnFootError(f, input, desired) })).sort((a,b) => b.error.heading - a.error.heading || b.error.anchor - a.error.anchor || a.f.side - b.f.side);
    const chosen = order[0];
    if (chosen.error.heading > ALIGN_NUMERIC || chosen.error.anchor > ALIGN_NUMERIC) {
      const selected = chooseDuration(chosen.f, draft, effective, rate, duration(0));
      if (selected) swing(chosen.f, draft, effective, rate, selected.T);
    }
  }
  if (!draft.failure) for (let side = 0; side < 2; side++) {
    const a = before.feet[side], b = draft.feet[side];
    if (a.mode !== 'swing' && b.mode !== 'swing') continue;
    const kind = a.mode === 'plant' ? 'departure' : 'advance';
    const trajectory = kind === 'departure' ? describeFootTrajectory(b, effective, input.time, b.end, 'proposed-flight') : evaluatedFlights.find(f => f.side === side);
    const proposal = turnProposal(a, b, draft, input, kind, trajectory); draft.lastIntervals.push(proposal);
    const admission = admitFootMotion(structuredClone(proposal), structuredClone(draft), effective);
    draft.turnControl.proposals.push(proposal);
    if (!admission?.ok || !admission.evidence || admission.sourceSurface !== proposal.sourceSurface || admission.landingSurface !== proposal.landingSurface) {
      state.turnControl = { ...draft.turnControl, status: 'refused' };
      state.failure = { kind: 'stationary-turn-foot-admission', time: input.time, side, proposal, admission: admission ?? null };
      return;
    }
    draft.turnControl.admissions.push(admission);
  }
  const aligned = draft.feet.every(f => { const e = turnFootError(f, input, goal); return f.mode === 'plant' && e.heading <= ALIGN_NUMERIC && e.anchor <= ALIGN_NUMERIC; }) && Math.abs(input.yaw - goal) <= ALIGN_NUMERIC;
  draft.turnControl.status = draft.failure ? 'refused' : aligned ? 'aligned' : draft.feet.some(f => f.mode === 'swing') ? 'stepping' : 'waiting';
  Object.assign(state, draft);
}

function resumeWalking(state) { if (state.turnControl?.status !== 'aligned' || state.feet.some(f=>f.mode!=='plant')) throw Error('Planted and aligned feet are required before walking handback'); delete state.turnControl; }

return {init,update,resumeWalking,scenePose,advance,policy};
}
