import test from 'node:test';
import assert from 'node:assert/strict';
import { enableHeldKeyboardPan } from '../src/keyboard-pan.ts';
import { enableMiddleMouseTilt } from '../src/mouse-tilt.ts';
import { activeZoomAnchor, registerInputHandler } from '../src/input-handler.ts';
import { Point } from 'maplibre-gl';

// Bound: DOM lifecycle, handler registration and screen-pixel deltas. The real
// browser gate proves MapLibre's camera composition, projection and arbitration.
function harness() {
  let now = 0;
  let pending = false;
  let frameRequests = 0;
  const events = new Map();
  const counts = new Map();
  const target = () => {
    const result = new EventTarget();
    const add = result.addEventListener.bind(result), remove = result.removeEventListener.bind(result);
    result.addEventListener = (...args) => { counts.set(args[1], (counts.get(args[1]) || 0) + 1); add(...args); };
    result.removeEventListener = (...args) => { counts.set(args[1], (counts.get(args[1]) || 0) - 1); remove(...args); };
    return result;
  };
  const window = Object.assign(target(), { performance: { now: () => now } });
  const document = Object.assign(target(), { defaultView: window, hidden: false });
  const canvas = Object.assign(target(), { ownerDocument: document, focus: () => {}, clientWidth: 1200, clientHeight: 800, getBoundingClientRect: () => ({left: 0, top: 0, width: 1200, height: 800}) });
  const manager = {
    _handlers: [{ handlerName: 'nativeMouse', handler: { isActive: () => false }, allowed: undefined }],
    _handlersById: {},
    _add(name, handler, allowed) { this._handlers.push({ handlerName: name, handler, allowed }); this._handlersById[name] = handler; },
    _triggerRenderFrame() { pending = true; frameRequests++; },
  };
  const map = {
    getCanvas: () => canvas, _handlers: manager,
    getCenter: () => [0, 0], project: () => new Point(600, 400), scrollZoom: { isZooming: () => false }, dragPan: { isActive: () => false },
    once(type, fn) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(fn); return this; },
    off(type, fn) { events.get(type)?.delete(fn); return this; },
  };
  const emit = type => { const listeners = [...(events.get(type) || [])]; events.delete(type); for (const fn of listeners) fn(); };
  const results = [];
  const step = milliseconds => {
    now += milliseconds;
    if (!pending) return;
    pending = false;
    for (const { handler } of [...manager._handlers]) if (handler.isEnabled?.()) {
      const result = handler.renderFrame?.();
      if (result) results.push(result);
      if (result?.needsRenderFrame) manager._triggerRenderFrame();
    }
    emit('render');
  };
  const key = (type, value, props = {}, eventTarget = type === 'keyup' ? window : canvas) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { key: value, altKey: false, ctrlKey: false, metaKey: false, repeat: false, isComposing: false }, props);
    eventTarget.dispatchEvent(event);
    return event;
  };
  const native = (type, props = {}) => {
    const event = Object.assign(new Event(type.replace('Window', ''), { cancelable: true }), { button: 1, buttons: 4, clientY: 200 }, props);
    for (const { handler } of manager._handlers) if (handler.isEnabled?.()) {
      const result = handler[type]?.(event);
      if (result) results.push(result);
    }
    return event;
  };
  const dispose = enableHeldKeyboardPan(map);
  return { map, manager, key, native, step, emit, results, window, document, canvas, dispose, counts, events,
    get pending() { return pending; }, get frameRequests() { return frameRequests; } };
}

test('one keydown drives later native frames at 560px/s, then release drains one final frame', () => {
  const h = harness();
  assert.equal(h.key('keydown', 'w').defaultPrevented, true);
  for (let n = 0; n < 90; n++) h.step(1000 / 60);
  assert.equal(h.results.length, 90);
  assert.ok(Math.abs(h.results.reduce((sum, value) => sum + value.panDelta.y, 0) - 840) < 1e-8);
  assert.ok(h.results.every(value => value.panDelta.x === 0 && value.noInertia && value.needsRenderFrame));
  h.key('keyup', 'w'); h.step(16);
  assert.equal(h.pending, false);
  h.step(1000); assert.equal(h.results.length, 90);
  h.dispose(); h.step(16);
});

test('frame rate does not change travel and a suspended frame cannot catch up in a jump', () => {
  for (const hz of [30, 60, 120]) {
    const h = harness(); h.key('keydown', 'd');
    for (let n = 0; n < hz; n++) h.step(1000 / hz);
    assert.ok(Math.abs(h.results.reduce((sum, value) => sum + value.panDelta.x, 0) + 560) < 1e-8);
    h.step(5000); assert.equal(h.results.at(-1).panDelta.x, -28);
    h.dispose(); h.step(16);
  }
});

test('diagonals normalize, opposed keys stop idle frames and remaining key resumes without catch-up', () => {
  const h = harness(); h.key('keydown', 'W'); h.key('keydown', 'D'); h.step(20);
  assert.ok(Math.abs(h.results.at(-1).panDelta.mag() - 11.2) < 1e-10);
  h.key('keydown', 's'); h.key('keydown', 'a'); h.step(20);
  assert.equal(h.pending, false);
  h.step(3000); assert.equal(h.results.length, 1);
  h.key('keyup', 'a'); h.step(20);
  assert.equal(h.results.at(-1).panDelta.x, -11.2);
  assert.ok(h.results.at(-1).panDelta.y === 0);
  h.dispose(); h.step(16);
});

test('repeat never starts a second loop; modifiers and composition clear keys', () => {
  const h = harness();
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'isComposing']) {
    h.key('keydown', 'w', { [modifier]: true }); assert.equal(h.pending, false);
    h.key('keydown', 'w'); h.step(10);
    h.key('keydown', modifier, { [modifier]: true }); h.step(10); assert.equal(h.pending, false);
    h.key('keydown', 'w', { repeat: true }); assert.equal(h.pending, false);
    h.key('keyup', 'w');
  }
  h.key('keydown', 'w'); const requests = h.frameRequests;
  for (let n = 0; n < 10; n++) h.key('keydown', 'w', { repeat: true });
  assert.equal(h.frameRequests, requests);
  h.dispose(); h.step(16);
});

test('pointer and wheel input never pause held movement, in either input order', () => {
  const h = harness();
  for (const event of ['pointerdown', 'wheel']) {
    h.key('keydown', 'w'); h.step(20); h.canvas.dispatchEvent(new Event(event));
    for (let n = 0; n < 5; n++) h.step(20);
    assert.equal(h.results.slice(-5).every(value => value.panDelta.y === 11.2), true);
    h.key('keyup', 'w'); h.step(20);
    h.canvas.dispatchEvent(new Event(event)); h.key('keydown', 'd'); h.step(20);
    assert.equal(h.results.at(-1).panDelta.x, -11.2);
    h.key('keyup', 'd'); h.step(20);
  }
  h.dispose(); h.step(16);
});

test('focus loss, hidden visibility and native reset clear held input', () => {
  const h = harness();
  for (const target of [h.canvas, h.window, h.document]) {
    h.key('keydown', 'a'); h.step(10);
    if (target === h.document) { h.document.hidden = true; target.dispatchEvent(new Event('visibilitychange')); }
    else target.dispatchEvent(new Event('blur'));
    h.step(16); assert.equal(h.pending, false);
    const count = h.results.length; h.step(1000); assert.equal(h.results.length, count);
    h.document.hidden = false;
  }
  h.key('keydown', 'w'); h.manager._handlersById.heldKeyboardPan.reset(); h.step(16);
  assert.equal(h.pending, false);
  assert.equal(h.key('keydown', 'ArrowUp').defaultPrevented, false);
  assert.equal(h.key('keydown', 'w', {}, new EventTarget()).defaultPrevented, false);
  h.dispose(); h.step(16);
});

test('middle drag contributes incremental 0.25degree/pixel pitch while keys remain held', () => {
  const h = harness(); const disposeMiddle = enableMiddleMouseTilt(h.map);
  h.key('keydown', 'w'); h.step(20);
  assert.equal(h.native('mousedown').defaultPrevented, true);
  h.native('mousemoveWindow', { clientY: 240 }); h.step(20);
  assert.ok(h.results.some(value => value.pitchDelta === -10));
  assert.equal(h.results.at(-1).panDelta.y, 11.2);
  h.key('keyup', 'w'); h.step(20);
  h.native('mousemoveWindow', { clientY: 260 });
  assert.equal(h.results.at(-1).pitchDelta, -5, 'key release does not reset the drag');
  h.native('mouseupWindow'); h.key('keydown', 'w'); h.step(20);
  assert.equal(h.results.at(-1).panDelta.y, 11.2, 'drag release does not reset held keys');
  for (const type of ['auxclick']) {
    const event = Object.assign(new Event(type, { cancelable: true }), { button: 1 }); h.canvas.dispatchEvent(event); assert.equal(event.defaultPrevented, true);
  }
  disposeMiddle(); h.dispose(); h.step(16);
});

test('disposal drains handler identities before removal, removes listeners and cannot restart frames', () => {
  const h = harness(); const disposeMiddle = enableMiddleMouseTilt(h.map);
  h.key('keydown', 'w'); h.native('mousedown'); h.step(20);
  h.dispose(); h.dispose(); disposeMiddle(); disposeMiddle();
  assert.equal(h.manager._handlersById.heldKeyboardPan.isActive(), false);
  assert.equal(h.manager._handlersById.middleMouseTilt.isActive(), false);
  assert.ok([...h.counts.values()].every(count => count === 0));
  assert.equal(h.key('keydown', 'w').defaultPrevented, false);
  h.step(16); assert.equal(h.pending, false);
  assert.deepEqual(h.manager._handlers.map(entry => entry.handlerName), ['nativeMouse']);
  assert.deepEqual(Object.keys(h.manager._handlersById), []);
  assert.ok([...h.events.values()].every(listeners => listeners.size === 0));
  h.step(1000); assert.equal(h.pending, false);
});

test('map removal detaches registrations even when no final render can happen', () => {
  const h = harness(); h.key('keydown', 'w'); h.dispose(); h.emit('remove');
  assert.deepEqual(h.manager._handlers.map(entry => entry.handlerName), ['nativeMouse']);
  assert.equal(h.manager._handlersById.heldKeyboardPan, undefined);
  assert.ok([...h.events.values()].every(listeners => listeners.size === 0));
});

test('adapter leaves native allowlists intact and rejects incompatible or duplicate manager identities', () => {
  const h = harness(); const native = h.manager._handlers[0];
  assert.equal(native.allowed, undefined);
  assert.deepEqual(h.manager._handlers[1].allowed, ['nativeMouse']);
  const emptyHandler = { enable() {}, disable() {}, reset() {}, isActive: () => false, isEnabled: () => true };
  assert.throws(() => registerInputHandler(h.map, 'heldKeyboardPan', emptyHandler), /Cannot register heldKeyboardPan/);
  assert.throws(() => registerInputHandler({ _handlers: {} }, 'broken', emptyHandler), /pinned MapLibre 6\.15\.0/);
  h.dispose(); h.step(16);
});

test('native zoom anchor is copied without mutation, including center and a relocated burst', () => {
  const h = harness(); h.map.scrollZoom.isZooming = () => true;
  h.map.scrollZoom._aroundPoint = new Point(600, 400);
  h.key('keydown', 'w'); h.step(20);
  assert.deepEqual([h.results.at(-1).around.x, h.results.at(-1).around.y], [600, 411.2]);
  assert.deepEqual([h.map.scrollZoom._aroundPoint.x, h.map.scrollZoom._aroundPoint.y], [600, 400]);
  h.map.scrollZoom._aroundPoint = new Point(950, 500); h.step(20);
  assert.equal(h.results.at(-1).around.x, 950);
  assert.equal(h.results.at(-1).around.y, 511.2);
  h.map.scrollZoom._aroundPoint = { x: Infinity, y: 4 };
  assert.throws(() => activeZoomAnchor(h.map), /finite native zoom anchor/);
  h.dispose(); h.step(16);
});

test('key release keeps only an already shared native pan active without scheduling keyboard motion', () => {
  const h = harness(); const handler = h.manager._handlersById.heldKeyboardPan;
  h.map.dragPan.isActive = () => true;
  assert.equal(handler.isActive(), false, 'unrelated native drag cannot activate an unused keyboard handler');
  h.key('keydown', 'w'); h.step(20); h.key('keyup', 'w'); h.step(20);
  assert.equal(handler.isActive(), true, 'native drag retains the shared event after key release');
  assert.equal(h.pending, false); assert.equal(h.results.length, 1);
  h.map.dragPan.isActive = () => false;
  assert.equal(handler.isActive(), false);
  h.map.dragPan.isActive = () => true;
  assert.equal(handler.isActive(), false, 'a later unrelated drag does not revive keyboard ownership');
  h.dispose(); h.step(16);
});
