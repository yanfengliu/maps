import type { Place, Position } from './places.ts';

// Photon welcomes modest project use. Keep calls explicit, paced and cached:
// https://github.com/komoot/photon#demo-server
// API / extent ordering: https://github.com/komoot/photon/blob/master/docs/api-v1.md
export const WORLD_SEARCH_ENDPOINT = 'https://photon.komoot.io/api/';
const RESULT_LIMIT = 8, CACHE_LIMIT = 100, CACHE_AGE_MS = 15 * 60_000;
const REQUEST_INTERVAL_MS = 1_000, REQUEST_TIMEOUT_MS = 10_000;
const MERCATOR_LATITUDE = 85.05112878;
const cache = new Map<string, { at: number; places: Place[] }>();
let queue: Promise<unknown> = Promise.resolve(), lastRequestAt = -Infinity;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function label(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240) : '';
}

function zoomFor(properties: Record<string, unknown>, center: Position): number {
  const type = label(properties.type) || label(properties.osm_value);
  const extent = properties.extent;
  // Photon supplies [west, north, east, south], unlike a GeoJSON bbox.
  if (Array.isArray(extent) && extent.length === 4 && extent.every(n => typeof n === 'number' && Number.isFinite(n))) {
    const [west, north, east, south] = extent as number[];
    if (west >= -180 && east <= 180 && south >= -90 && north <= 90 && west <= east && south <= north && center[0] >= west && center[0] <= east && center[1] >= south && center[1] <= north) {
      const span = Math.max(east - west, (north - south) / Math.max(0.087, Math.cos(center[1] * Math.PI / 180)));
      // Some city administrative boundaries include remote islands (Tokyo).
      // Preserve a useful settlement view around the returned place centre.
      const minimum = type === 'city' ? 9.5 : type === 'town' ? 11 : type === 'village' ? 12 : 2;
      if (span > 0) return Math.max(minimum, Math.min(17, Math.log2(360 / span) - 0.5));
    }
  }
  const levels: Record<string, number> = { country: 4, state: 6, county: 8, city: 11, town: 13, village: 14, district: 13, locality: 14, street: 16, house: 17 };
  return levels[type] ?? 16;
}

function parsePlaces(value: unknown): Place[] {
  if (!record(value) || !Array.isArray(value.features) || (value.type !== undefined && value.type !== 'FeatureCollection')) throw new Error('Place search returned an invalid response. Try again.');
  const places: Place[] = [], ids = new Set<string>();
  for (const item of value.features.slice(0, 100)) {
    if (!record(item) || item.type !== 'Feature' || !record(item.geometry) || item.geometry.type !== 'Point' || !record(item.properties)) continue;
    const coordinates = item.geometry.coordinates, properties = item.properties;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || !coordinates.slice(0, 2).every(n => typeof n === 'number' && Number.isFinite(n))) continue;
    const [longitude, latitude] = coordinates as number[];
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;
    const name = label(properties.name) || [label(properties.housenumber), label(properties.street)].filter(Boolean).join(' ');
    if (!name) continue;
    const sourceId = typeof properties.osm_id === 'number' && Number.isSafeInteger(properties.osm_id) && properties.osm_id > 0 ? String(properties.osm_id) : label(properties.osm_id);
    const osmType = label(properties.osm_type);
    const id = /^[NWR]$/.test(osmType) && /^\d{1,20}$/.test(sourceId) ? `world-${osmType}-${sourceId}` : `world-${longitude}-${latitude}-${name}`;
    if (ids.has(id)) continue;
    ids.add(id);
    const context = [...new Set([label(properties.city), label(properties.state), label(properties.country)].filter(part => part && part !== name))];
    places.push({ id, name, subtitle: context.join(' · ') || 'Place · OpenStreetMap', center: [longitude, Math.max(-MERCATOR_LATITUDE, Math.min(MERCATOR_LATITUDE, latitude))], zoom: zoomFor(properties, [longitude, latitude]) });
    if (places.length === RESULT_LIMIT) break;
  }
  return places;
}

function canceled(): DOMException { return new DOMException('Place search canceled.', 'AbortError'); }
function checkSignal(signal?: AbortSignal): void { if (signal?.aborted) throw canceled(); }
function copy(places: Place[]): Place[] { return places.map(place => ({ ...place, center: [...place.center] })); }

function cached(key: string): Place[] | undefined {
  const entry = cache.get(key);
  if (!entry) return;
  if (Date.now() - entry.at >= CACHE_AGE_MS) { cache.delete(key); return; }
  cache.delete(key); cache.set(key, entry);
  return copy(entry.places);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  checkSignal(signal);
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(canceled()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

// A canceled queued search settles immediately; its queued job later skips the
// request. Canceling one caller never discards another caller's search.
function abortable<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  checkSignal(signal);
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(canceled()); };
    signal.addEventListener('abort', abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Call only after the user submits a search; local suggestions need no request. */
export async function searchWorldPlaces(query: string, options: { signal?: AbortSignal } = {}): Promise<Place[]> {
  const { signal } = options;
  checkSignal(signal);
  const term = query.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!term) return [];
  if (term.length > 256) throw new Error('Use a shorter place name or address.');
  const key = term.toLowerCase(), hit = cached(key);
  if (hit) return hit;
  const pending = queue.then(async () => {
    checkSignal(signal);
    const queuedHit = cached(key);
    if (queuedHit) return queuedHit;
    const delay = lastRequestAt + REQUEST_INTERVAL_MS - Date.now();
    if (delay > 0) await wait(delay, signal);
    checkSignal(signal);
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
    const url = new URL(WORLD_SEARCH_ENDPOINT);
    url.searchParams.set('q', term); url.searchParams.set('limit', String(RESULT_LIMIT));
    lastRequestAt = Date.now();
    try {
      // The browser sends its normal Referer and Accept-Language. No location
      // bias or regional bbox restricts worldwide results; no cookies are sent.
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
      if (!response.ok) throw new Error(response.status === 429 ? 'Place search is busy. Please try again shortly.' : 'Place search is unavailable right now. Try again.');
      let json: unknown;
      try { json = await response.json(); } catch { throw new Error('Place search returned an invalid response. Try again.'); }
      checkSignal(signal);
      const places = parsePlaces(json);
      cache.set(key, { at: Date.now(), places: copy(places) });
      while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      return places;
    } catch (error) {
      checkSignal(signal);
      if (timedOut) throw new Error('Place search took too long. Try again.');
      if (error instanceof TypeError) throw new Error('Place search could not connect. Check your connection and try again.');
      throw error;
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
  });
  queue = pending.catch(() => undefined);
  return abortable(pending, signal);
}
