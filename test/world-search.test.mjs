import test from 'node:test';
import assert from 'node:assert/strict';

let instance = 0;
const fresh = () => import(`../src/world-search.ts?test=${instance++}`);
const feature = (name = 'Tokyo', coordinates = [139.6917, 35.6895], properties = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: { name, osm_type: 'R', osm_id: 1543125, osm_value: 'city', country: 'Japan', ...properties } });
const response = (features) => new Response(JSON.stringify({ type: 'FeatureCollection', features }), { headers: { 'Content-Type': 'application/json' } });
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

test('submitted worldwide search sends one bounded query without a regional restriction or cookies', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url: new URL(url), options }); return response([feature()]); });
  const { searchWorldPlaces, WORLD_SEARCH_ENDPOINT } = await fresh();
  const [place] = await searchWorldPlaces('  Tokyo 日本  ');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, WORLD_SEARCH_ENDPOINT);
  assert.equal(calls[0].url.searchParams.get('q'), 'Tokyo 日本');
  assert.equal(calls[0].url.searchParams.get('limit'), '8');
  assert.deepEqual([...calls[0].url.searchParams.keys()], ['q', 'limit']);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.referrerPolicy, 'strict-origin-when-cross-origin');
  assert.deepEqual(place, { id: 'world-R-1543125', name: 'Tokyo', subtitle: 'Japan', center: [139.6917, 35.6895], zoom: 11 });
  assert.equal(place.campus, undefined);
});

test('remote results reject malformed geometry, deduplicate identities and bound the result list', async t => {
  const malformed = [null, {}, feature('Outside', [181, 35]), feature('Invalid latitude', [50, -91]), feature('Strings', ['12', '30']), feature('Infinite', [Infinity, 2]), feature('', [10, 20]), { ...feature(), geometry: { type: 'Polygon', coordinates: [12, 30] } }];
  const valid = Array.from({ length: 15 }, (_, i) => feature(`Place ${i}`, [20 + i, 30], { osm_id: i + 1 }));
  t.mock.method(globalThis, 'fetch', async () => response([...malformed, valid[0], valid[0], ...valid]));
  const { searchWorldPlaces } = await fresh();
  const result = await searchWorldPlaces('Place');
  assert.equal(result.length, 8);
  assert.equal(new Set(result.map(place => place.id)).size, 8);
  assert.ok(result.every(place => place.name.startsWith('Place ') && place.center.every(Number.isFinite)));
});

test('Photon extent ordering controls scale and invalid extents fall back to a safe category zoom', async t => {
  t.mock.method(globalThis, 'fetch', async () => response([
    feature('Country', [20, 30], { osm_id: 1, osm_value:'country', extent: [10, 40, 30, 20] }),
    feature('Reversed', [20, 30], { osm_id: 2, extent: [30, 40, 10, 20] }),
    feature('Outside', [20, 30], { osm_id: 3, extent: [-300, 40, 30, 20] }),
    feature('NaN', [20, 30], { osm_id: 4, extent: [10, NaN, 30, 20] }),
    feature('Missed center', [20, 30], { osm_id: 5, extent: [100, 40, 110, 20] }),
    feature('Pole', [0, 90], { osm_id: 6, osm_value: 'locality' }),
  ]));
  const { searchWorldPlaces } = await fresh();
  const result = await searchWorldPlaces('extent');
  assert.ok(result[0].zoom > 2 && result[0].zoom < 5);
  assert.deepEqual(result.slice(1, 5).map(place => place.zoom), [11, 11, 11, 11]);
  assert.deepEqual(result[5].center, [0, 85.05112878]);
  assert.ok(result.every(place => place.zoom >= 2 && place.zoom <= 17));
});

test('a city with remote island territory still opens at a useful city scale',async t=>{
  t.mock.method(globalThis,'fetch',async()=>response([feature('Tokyo',[139.7638947,35.6768601],{type:'city',osm_value:'province',extent:[135.8536855,35.8984245,154.205541,20.2145811]})]));
  const {searchWorldPlaces}=await fresh();const [city]=await searchWorldPlaces('Tokyo');
  assert.ok(city.zoom>=9.5&&city.zoom<=12);assert.deepEqual(city.center,[139.7638947,35.6768601]);
});

test('repeated and concurrent normalized submissions use cached copies without a second request', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response([feature()]); });
  const { searchWorldPlaces } = await fresh();
  const [first, second] = await Promise.all([searchWorldPlaces(' Tokyo '), searchWorldPlaces('TOKYO')]);
  first[0].name = 'Changed'; first[0].center[0] = 0;
  second.pop();
  const third = await searchWorldPlaces('tokyo');
  assert.equal(calls, 1);
  assert.equal(third[0].name, 'Tokyo');
  assert.equal(third[0].center[0], 139.6917);
});

test('the result cache expires and evicts its least recently used entries at a fixed bound', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response([feature()]); });
  const { searchWorldPlaces } = await fresh();
  for (let i = 0; i < 100; i++) { t.mock.timers.tick(1_000); await searchWorldPlaces(`Place ${i}`); }
  await searchWorldPlaces('Place 0'); // Touch the oldest so Place 1 becomes the eviction candidate.
  t.mock.timers.tick(1_000); await searchWorldPlaces('Place 100');
  assert.equal(calls, 101);
  await searchWorldPlaces('Place 0'); assert.equal(calls, 101);
  t.mock.timers.tick(1_000); await searchWorldPlaces('Place 1'); assert.equal(calls, 102);
  t.mock.timers.tick(15 * 60_000); await searchWorldPlaces('Place 0'); assert.equal(calls, 103);
});

test('a queued cancellation settles immediately and remaining requests start at least a second apart', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 });
  const starts = [];
  let finishFirst;
  t.mock.method(globalThis, 'fetch', async () => {
    starts.push(Date.now());
    if (starts.length === 1) await new Promise(resolve => { finishFirst = resolve; });
    return response([feature()]);
  });
  const { searchWorldPlaces } = await fresh();
  const first = searchWorldPlaces('First'); await flush();
  const controller = new AbortController(), second = searchWorldPlaces('Canceled', { signal: controller.signal });
  const secondRejected = assert.rejects(second, { name: 'AbortError' });
  controller.abort(); await secondRejected;
  assert.deepEqual(starts, [100_000]);
  finishFirst(); await first;
  const third = searchWorldPlaces('Third'); await flush();
  t.mock.timers.tick(999); await flush(); assert.equal(starts.length, 1);
  t.mock.timers.tick(1); await third;
  assert.deepEqual(starts, [100_000, 101_000]);
});

test('abort before or during a request stays an AbortError and an aborted response is not cached', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    calls++;
    if (calls === 1) await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    return response([feature()]);
  });
  const { searchWorldPlaces } = await fresh();
  await assert.rejects(searchWorldPlaces('Never requested', { signal: AbortSignal.abort() }), { name: 'AbortError' });
  assert.equal(calls, 0);
  const controller = new AbortController(), pending = searchWorldPlaces('Tokyo', { signal: controller.signal });
  await flush();
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  controller.abort(); await rejected;
  const retry = searchWorldPlaces('Tokyo'); await flush();
  t.mock.timers.tick(1_000); await retry;
  assert.equal(calls, 2);
});

test('a hung request times out, aborts the fetch and releases the queue for retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 });
  let calls = 0, aborted = false;
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    calls++;
    if (calls === 1) await new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true }));
    return response([feature()]);
  });
  const { searchWorldPlaces } = await fresh();
  const rejected = assert.rejects(searchWorldPlaces('Tokyo'), /took too long/);
  await flush(); t.mock.timers.tick(10_000); await rejected;
  assert.equal(aborted, true);
  assert.equal((await searchWorldPlaces('Tokyo'))[0].name, 'Tokyo');
  assert.equal(calls, 2);
});

test('provider failures and malformed responses produce useful errors without becoming cached misses', async t => {
  for (const [makeResponse, message] of [
    [() => new Response('', { status: 429 }), /is busy/],
    [() => new Response('', { status: 503 }), /unavailable/],
    [() => new Response('<html>'), /invalid response/],
    [() => new Response(JSON.stringify({ features: 'bad' })), /invalid response/],
    [() => { throw new TypeError('Failed to fetch'); }, /could not connect/],
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => makeResponse());
    const { searchWorldPlaces } = await fresh();
    await assert.rejects(searchWorldPlaces('Paris'), message);
    mock.mock.restore();
  }
});

test('empty queries avoid networking, oversized queries fail clearly and empty results are cached', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response([]); });
  const { searchWorldPlaces } = await fresh();
  assert.deepEqual(await searchWorldPlaces(' \n '), []);
  await assert.rejects(searchWorldPlaces('x'.repeat(257)), /shorter/);
  assert.equal(calls, 0);
  assert.deepEqual(await searchWorldPlaces('Unknown place'), []);
  assert.deepEqual(await searchWorldPlaces('UNKNOWN PLACE'), []);
  assert.equal(calls, 1);
});
