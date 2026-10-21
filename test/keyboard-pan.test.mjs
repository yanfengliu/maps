import test from 'node:test';
import assert from 'node:assert/strict';
import { enableHeldKeyboardPan } from '../src/keyboard-pan.ts';

// Bound: DOM input lifecycle and screen-pixel offsets; projection is checked in a real browser.
function harness() {
  let now = 0;
  let nextFrame = 1;
  let nextTimer = 1;
  const frames = new Map();
  const timers = new Map();
  const window = Object.assign(new EventTarget(), {
    performance: { now: () => now },
    requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, time: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const document = Object.assign(new EventTarget(), { defaultView: window, hidden: false });
  const canvas = Object.assign(new EventTarget(), { ownerDocument: document });
  const calls = [];
  let stops = 0;
  const dispose = enableHeldKeyboardPan({ getCanvas: () => canvas, panBy: (offset, options) => calls.push({ offset, options }), stop: () => stops++ });
  const key = (type, value, props = {}, target = type === 'keyup' ? window : canvas) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { key: value, altKey: false, ctrlKey: false, metaKey: false, repeat: false, isComposing: false }, props);
    target.dispatchEvent(event);
    return event;
  };
  const elapse = milliseconds => {
    now += milliseconds;
    for (const [id, timer] of [...timers]) if (timer.time <= now) { timers.delete(id); timer.callback(); }
  };
  const step = milliseconds => {
    elapse(milliseconds);
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  };
  const pointer = (type, pointerId, target = type === 'pointerdown' ? canvas : window) => target.dispatchEvent(Object.assign(new Event(type), { pointerId }));
  const wheel = () => canvas.dispatchEvent(new Event('wheel'));
  return { key, pointer, wheel, step, elapse, calls, frames, timers, window, document, canvas, dispose, get stops() { return stops; } };
}

test('one keydown keeps moving across later frames without repeat, then keyup stops immediately', () => {
  const h = harness();
  assert.equal(h.frames.size, 0);
  assert.equal(h.key('keydown', 'w').defaultPrevented, true);
  for (let n = 0; n < 90; n++) h.step(1000 / 60);
  assert.equal(h.calls.length, 90);
  const total = h.calls.reduce((sum, { offset }) => sum + offset[1], 0);
  assert.ok(Math.abs(total + 840) < 1e-8);
  assert.ok(h.calls.every(({ offset, options }) => offset[0] === 0 && options.animate === false));
  assert.equal(h.stops, 1);
  h.key('keyup', 'w');
  h.step(1000);
  assert.equal(h.calls.length, 90);
  assert.equal(h.frames.size, 0);
  h.dispose();
});

test('frame rate does not change travel, and suspension never catches up in a jump', () => {
  for (const hz of [30, 60, 120]) {
    const h = harness();
    h.key('keydown', 'd');
    for (let n = 0; n < hz; n++) h.step(1000 / hz);
    assert.ok(Math.abs(h.calls.reduce((sum, { offset }) => sum + offset[0], 0) - 560) < 1e-8);
    h.step(5000);
    assert.equal(h.calls.at(-1).offset[0], 28);
    h.dispose();
  }
});

test('diagonals are normalized, opposite keys cancel with no idle frame, and remaining key resumes', () => {
  const h = harness();
  h.key('keydown', 'W'); h.key('keydown', 'D'); h.step(20);
  assert.ok(Math.abs(Math.hypot(...h.calls.at(-1).offset) - 11.2) < 1e-10);
  assert.ok(h.calls.at(-1).offset[0] > 0 && h.calls.at(-1).offset[1] < 0);
  h.key('keydown', 's'); h.key('keydown', 'a');
  assert.equal(h.frames.size, 0);
  h.step(3000);
  assert.equal(h.calls.length, 1);
  h.key('keyup', 'a'); h.step(20);
  assert.deepEqual(h.calls.at(-1).offset, [11.2, 0]);
  h.dispose();
});

test('repeat does not add loops; shortcut modifiers and composition neither start nor leave held movement', () => {
  const h = harness();
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'isComposing']) {
    h.key('keydown', 'w', { [modifier]: true });
    assert.equal(h.frames.size, 0);
    h.key('keydown', 'w'); h.step(10);
    h.key('keydown', modifier, { [modifier]: true });
    assert.equal(h.frames.size, 0);
    h.key('keydown', 'w', { repeat: true });
    assert.equal(h.frames.size, 0);
    h.key('keyup', 'w');
  }
  h.key('keydown', 'w');
  for (let n = 0; n < 10; n++) h.key('keydown', 'w', { repeat: true });
  assert.equal(h.frames.size, 1);
  h.dispose();
});

test('focus loss, hidden document and disposal clear held keys and remove pending work', () => {
  const h = harness();
  for (const target of [h.canvas, h.window, h.document]) {
    h.key('keydown', 'a'); h.step(10);
    if (target === h.document) { h.document.hidden = true; target.dispatchEvent(new Event('visibilitychange')); }
    else target.dispatchEvent(new Event('blur'));
    assert.equal(h.frames.size, 0);
    const count = h.calls.length;
    h.step(500);
    assert.equal(h.calls.length, count);
    h.document.hidden = false;
  }
  h.key('keydown', 's');
  h.dispose(); h.dispose();
  assert.equal(h.frames.size, 0);
  assert.equal(h.key('keydown', 's').defaultPrevented, false);
  h.step(20);
  assert.equal(h.frames.size, 0);
});

test('unrelated keys and other focused elements never start panning', () => {
  const h = harness();
  assert.equal(h.key('keydown', 'ArrowUp').defaultPrevented, false);
  assert.equal(h.key('keydown', 'w', {}, new EventTarget()).defaultPrevented, false);
  h.step(20);
  assert.equal(h.calls.length, 0);
  h.dispose();
});

test('native pointer gestures take priority until every pointer ends, then held keys resume', () => {
  const h = harness();
  h.key('keydown', 'w'); h.step(10);
  h.pointer('pointerdown', 1); h.pointer('pointerdown', 2);
  assert.equal(h.frames.size, 0);
  h.step(2000);
  assert.equal(h.calls.length, 1);
  h.pointer('pointerup', 1);
  assert.equal(h.frames.size, 0);
  h.pointer('pointercancel', 2); h.step(20);
  assert.deepEqual(h.calls.at(-1).offset, [0, -11.2]);
  h.pointer('pointerdown', 3); h.key('keyup', 'w'); h.pointer('pointerup', 3);
  assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 4); h.key('keydown', 'd');
  assert.equal(h.frames.size, 0);
  h.key('keydown', 'Control', { ctrlKey: true });
  h.key('keydown', 'd');
  assert.equal(h.frames.size, 0, 'modifier release must not forget an active pointer');
  h.window.dispatchEvent(new Event('blur')); h.pointer('pointerup', 4);
  assert.equal(h.frames.size, 0);
  h.dispose();
});

test('wheel gestures finish before held panning resumes, including a zoom limit with no zoom event', () => {
  const h = harness();
  h.key('keydown', 'w'); h.step(10);
  h.wheel();
  assert.equal(h.frames.size, 0);
  h.elapse(400); h.wheel(); h.elapse(499);
  assert.equal(h.frames.size, 0, 'each wheel event extends the native settle window');
  assert.equal(h.timers.size, 1);
  h.elapse(1); h.step(20);
  assert.deepEqual(h.calls.at(-1).offset, [0, -11.2]);
  assert.equal(h.timers.size, 0);
  h.wheel(); h.pointer('pointerdown', 1); h.elapse(500);
  assert.equal(h.frames.size, 0, 'a wheel ending must still respect pointer priority');
  h.pointer('pointerup', 1);
  assert.equal(h.frames.size, 1);
  h.dispose();
});

test('wheel settlement cannot restart released keys or survive blur, hidden visibility or disposal', () => {
  const h = harness();
  h.wheel(); h.key('keydown', 'd');
  assert.equal(h.frames.size, 0, 'a key pressed during native zoom must wait');
  h.key('keyup', 'd'); h.elapse(500);
  assert.equal(h.frames.size, 0);
  for (const target of [h.canvas, h.window, h.document]) {
    h.key('keydown', 'w'); h.wheel();
    if (target === h.document) { h.document.hidden = true; target.dispatchEvent(new Event('visibilitychange')); }
    else target.dispatchEvent(new Event('blur'));
    assert.equal(h.timers.size, 0);
    h.elapse(1000);
    assert.equal(h.frames.size, 0);
    h.document.hidden = false;
  }
  h.key('keydown', 's'); h.wheel();
  const queuedCallback = [...h.timers.values()][0].callback;
  h.dispose(); queuedCallback();
  assert.equal(h.timers.size, 0);
  assert.equal(h.frames.size, 0);
  h.wheel(); h.elapse(1000);
  assert.equal(h.timers.size, 0, 'disposal removes wheel listeners');
  assert.equal(h.frames.size, 0);
});
