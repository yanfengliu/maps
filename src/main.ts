import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapGeoJSONFeature } from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { createStyle } from './style.ts';
import { BAY_BOUNDS, PLACES, STANFORD_CENTER, buildingPlaces, normalizeBearing, searchPlaces, type Place } from './places.ts';
import { campusIllustration, icon } from './icons.ts';

maplibregl.setWorkerUrl(workerUrl);

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <div id="map" aria-label="Interactive Bay Area map"></div>
  <aside class="sidebar" aria-label="Explore places">
    <header class="brand"><div class="brand-mark">${icon('bay')}</div><div><span class="eyebrow">NORTHERN CALIFORNIA</span><h1>Bay Area</h1></div><button class="icon-button sidebar-toggle" aria-label="Collapse places" aria-expanded="true">${icon('minus')}</button></header>
    <div class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="Search the Bay Area" autocomplete="off" aria-label="Search the Bay Area" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false"/><button id="clear-search" class="clear-search" aria-label="Clear search" hidden>${icon('close')}</button></div>
    <div id="search-results" class="search-results" role="listbox" aria-label="Search results" hidden></div>
    <button id="mobile-stanford" class="mobile-stanford-action" aria-label="Explore Stanford in 3D"><span class="quick-campus-icon">${icon('campus')}</span><span>Explore Stanford</span><span class="quick-3d">3D</span>${icon('arrow')}</button>
    <div id="explore-content">
      <div class="section-heading"><h2>Start exploring</h2><span class="small-caps">NORTHERN CALIFORNIA</span></div>
      <button class="feature-card" id="explore-stanford" aria-label="Explore Stanford in 3D">
        <div class="feature-visual"><span class="feature-badge">3D CAMPUS</span>${campusIllustration}</div>
        <div class="feature-copy"><div><span class="eyebrow">THE PENINSULA</span><h3>Stanford University</h3><p>Sandstone, red roofs, and a new perspective.</p></div><span class="feature-arrow">${icon('arrow')}</span></div>
      </button>
      <div class="section-heading destinations-heading"><h2>Around the Bay</h2><span class="destination-count">3 places</span></div>
      <div class="destination-list">${[PLACES[1], PLACES[2], PLACES[3]].map((p, i) => `<button class="destination" data-place="${p.id}"><span class="destination-icon destination-${i}">${icon(i === 1 ? 'bay' : 'campus')}</span><span><strong>${p.name}</strong><small>${p.subtitle.split(' · ')[1]}</small></span>${icon('chevron')}</button>`).join('')}</div>
      <p class="scope-note"><span class="scope-dot"></span> A Bay Area map. A closer look at Stanford.</p>
    </div>
    <section id="place-details" class="place-details" aria-live="polite" hidden></section>
    <footer class="sidebar-footer"><span>Bay Area · Stanford in 3D</span><button id="help-button" aria-label="Map controls and sources" aria-expanded="false">${icon('help')}</button></footer>
  </aside>
  <div class="map-caption"><span class="caption-dot"></span><span id="view-name">SAN FRANCISCO BAY AREA</span></div>
  <nav class="map-controls" aria-label="Map navigation">
    <button id="compass" class="control compass" aria-label="Face north" title="Face north · drag to rotate"><span class="north">N</span><span class="compass-needle">${icon('compass')}</span></button>
    <div class="zoom-controls"><button id="zoom-in" class="control" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button id="zoom-out" class="control" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
    <button id="toggle-3d" class="control mode-control" aria-label="Switch to 3D" aria-pressed="false">3D</button>
    <div class="tilt-control"><label for="tilt">TILT</label><input id="tilt" type="range" min="0" max="65" step="1" value="0" aria-label="Map tilt"/><span id="tilt-value">0°</span></div>
  </nav>
  <button id="bay-overview" class="overview-button" aria-label="Bay Area overview">${icon('bay')}<span>Bay Area</span></button>
  <div id="map-status" class="map-status" role="status"><span class="loading-dot"></span>Opening the Bay…</div>
  <div id="error-banner" class="error-banner" role="alert" hidden><span id="error-message"></span><button id="retry">Retry</button><button id="dismiss-error" aria-label="Dismiss error">${icon('close')}</button></div>
  <section id="help-panel" class="help-panel" aria-label="Map controls and sources" hidden><div class="help-title"><h2>A map to move through</h2><button id="close-help" class="icon-button" aria-label="Close map help">${icon('close')}</button></div><dl><dt>Pan</dt><dd>Drag, or use arrow keys</dd><dt>Zoom</dt><dd>Scroll, pinch, + / −, or double-click</dd><dt>Rotate & tilt</dt><dd>Right-drag or Ctrl-drag; two-finger rotate on touch</dd><dt>Keyboard</dt><dd>Option/Alt + ← / → rotates; Shift + ↑ / ↓ tilts</dd><dt>North</dt><dd>Click the compass. Drag it to rotate.</dd></dl><p>Regional map © OpenStreetMap contributors, OpenMapTiles and OpenFreeMap. Only Stanford has 3D buildings. Footprints come from OpenStreetMap; untagged heights are estimates.</p><a href="/data/stanford-provenance.json" target="_blank" rel="noreferrer">Campus data provenance ↗</a></section>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const search = el<HTMLInputElement>('search');
const results = el('search-results');
const details = el('place-details');
const tilt = el<HTMLInputElement>('tilt');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let map: MapLibreMap | undefined;
let allPlaces = [...PLACES];
let campusData: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined;
let campusBoundary: GeoJSON.FeatureCollection | undefined;
let selectedId: string | null = null;
let visibleResults: Place[] = [];
let activeResult = -1;
let sourceReady = false;
let tilesReady = false;
let successfulRegionalTiles = 0;
let failed = false;
let tileErrorShown = false;
let retryAction: () => void = () => window.location.reload();
let loadTimeout: ReturnType<typeof setTimeout> | undefined;
let pins: maplibregl.Marker[] = [];
let cleaned = false;
let campusEventsBound = false;

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

function showError(message: string, retry: () => void): void {
  failed = true;
  el('error-message').textContent = message;
  el('error-banner').hidden = false;
  el('map-status').hidden = true;
  retryAction = retry;
}

function clearError(): void { failed = false; el('error-banner').hidden = true; }
el('retry').addEventListener('click', () => { clearError(); retryAction(); });
el('dismiss-error').addEventListener('click', clearError);

function motionDuration(duration = 1600): number { return reducedMotion.matches ? 0 : duration; }
function panelPadding(): { top: number; bottom: number; left: number; right: number } {
  return window.innerWidth > 760
    ? { top: 80, bottom: 65, left: 410, right: 110 }
    : { top: 215, bottom: 105, left: 24, right: 64 };
}

function overview(animate = true): void {
  if (!map) return;
  if (window.innerWidth <= 760) setSidebarCompact(true);
  map.fitBounds(BAY_BOUNDS, { padding: panelPadding(), absolutePadding: true, pitch: 0, bearing: 0, duration: animate ? motionDuration(1700) : 0, maxZoom: 10 });
  el('view-name').textContent = 'SAN FRANCISCO BAY AREA';
  closeDetails();
}

function goTo(place: Place): void {
  if (!map) return;
  map.flyTo({ center: place.center, zoom: place.zoom, pitch: place.campus ? 58 : 0, bearing: place.campus ? -28 : 0,
    padding: window.innerWidth > 760 ? { top: 20, bottom: 20, left: 360, right: 60 } : { top: 80, bottom: 200, left: 20, right: 55 },
    duration: motionDuration(place.campus ? 2400 : 1800), essential: false });
  el('view-name').textContent = place.campus ? 'STANFORD UNIVERSITY · 3D CAMPUS' : place.name.toUpperCase();
  closeSearch();
  search.blur();
  if (place.buildingId) {
    const feature = campusData?.features.find(f => f.properties?.id === place.buildingId);
    if (feature) showBuilding(feature.properties ?? {});
  } else if (place.campus) showCampus();
  else showCity(place);
  if (window.innerWidth <= 760 && !place.buildingId) setSidebarCompact(true);
}

function showCampus(): void {
  selectedId = null;
  updateSelection();
  details.hidden = false;
  el('explore-content').hidden = true;
  details.innerHTML = `<div class="detail-heading"><span class="detail-icon">${icon('campus')}</span><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><span class="eyebrow">STANFORD, CALIFORNIA</span><h2>Stanford University</h2><p class="detail-description">A campus of sandstone arcades, red tile roofs, and tree-lined spaces. Move closer to explore its buildings.</p><div class="detail-stats"><span><strong>${campusData?.features.length.toLocaleString() ?? '—'}</strong>mapped footprints</span><span><strong>3D</strong>campus model</span></div><p class="data-note">Real map footprints. Heights use mapped tags where available and estimates elsewhere.</p><button class="detail-action" id="quad-view">Explore the Main Quad ${icon('arrow')}</button><p class="interaction-note">Click a building to learn more.</p>`;
  details.querySelector('.close-details')?.addEventListener('click', closeDetails);
  el('quad-view').addEventListener('click', () => {
    map?.flyTo({ center: [-122.1702,37.4276], zoom: 17.5, pitch: 60, bearing: -34, duration: motionDuration(1500) });
  });
}

function showCity(place: Place): void {
  selectedId = null;
  updateSelection();
  details.hidden = false;
  el('explore-content').hidden = true;
  details.innerHTML = `<div class="detail-heading"><span class="detail-icon city">${icon('bay')}</span><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><span class="eyebrow">${escapeHtml(place.subtitle)}</span><h2>${escapeHtml(place.name)}</h2><p class="detail-description">Explore the streets, parks, and shoreline. Stanford University is the first place brought into 3D.</p><button class="detail-action" id="city-stanford">Explore Stanford in 3D ${icon('arrow')}</button><button class="text-action" id="city-bay">Back to the Bay Area</button>`;
  details.querySelector('.close-details')?.addEventListener('click', closeDetails);
  el('city-stanford').addEventListener('click', () => goTo(PLACES[0]));
  el('city-bay').addEventListener('click', () => overview());
}

function showBuilding(properties: Record<string, unknown>): void {
  if (window.innerWidth <= 760) setSidebarCompact(false);
  selectedId = String(properties.id);
  updateSelection();
  details.hidden = false;
  el('explore-content').hidden = true;
  const height = Number(properties.height);
  const source = properties.heightSource === 'osm-height' ? 'Mapped height' : properties.heightSource === 'osm-levels' ? 'From mapped floor count' : 'Estimated height';
  details.innerHTML = `<div class="detail-heading"><span class="detail-icon">${icon('campus')}</span><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><span class="eyebrow">STANFORD UNIVERSITY</span><h2>${escapeHtml(properties.name || 'Campus building')}</h2><p class="detail-description">Part of the Stanford campus model, built from its mapped footprint.</p><div class="detail-stats"><span><strong>${Number.isFinite(height) ? `${Math.round(height * 10) / 10} m` : '—'}</strong>${source}</span><span><strong>OSM</strong>source footprint</span></div><p class="data-note">Heights and simple roof forms convey campus massing. This is an exploratory model.</p><button class="detail-action" id="building-campus">View the whole campus ${icon('arrow')}</button>`;
  details.querySelector('.close-details')?.addEventListener('click', closeDetails);
  el('building-campus').addEventListener('click', () => goTo(PLACES[0]));
}

function closeDetails(): void {
  selectedId = null;
  updateSelection();
  details.hidden = true;
  el('explore-content').hidden = false;
}

function updateSelection(): void {
  if (!map?.getLayer('stanford-buildings')) return;
  map.setPaintProperty('stanford-buildings', 'fill-extrusion-color', ['case', ['==', ['get','id'], selectedId ?? ''], '#e5ad64', ['get','color']]);
  map.setPaintProperty('stanford-roofs', 'fill-extrusion-color', ['case', ['==', ['get','id'], selectedId ?? ''], '#c56c3e', ['get','roofColor']]);
}

function closeSearch(): void {
  results.hidden = true;
  search.setAttribute('aria-expanded', 'false');
  search.removeAttribute('aria-activedescendant');
  activeResult = -1;
}

function renderResults(): void {
  el('clear-search').hidden = !search.value;
  visibleResults = searchPlaces(search.value, allPlaces);
  activeResult = -1;
  if (!search.value.trim()) { closeSearch(); return; }
  results.hidden = false;
  search.setAttribute('aria-expanded', 'true');
  search.removeAttribute('aria-activedescendant');
  results.innerHTML = visibleResults.length
    ? visibleResults.map((place, index) => `<button class="search-result" id="result-${index}" role="option" aria-selected="false" data-result="${index}" tabindex="-1"><span class="result-icon">${icon(place.campus ? 'campus' : 'bay')}</span><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.subtitle)}</small></span>${icon('chevron')}</button>`).join('')
    : `<div class="no-results"><strong>No places found</strong><span>Try a Bay Area city or a Stanford building, like Hoover Tower.</span></div>`;
  results.querySelectorAll<HTMLElement>('[data-result]').forEach(button => button.addEventListener('click', () => goTo(visibleResults[Number(button.dataset.result)])));
}

search.addEventListener('input', renderResults);
search.addEventListener('focus', () => { setSidebarCompact(false); renderResults(); });
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeSearch(); search.blur(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (results.hidden) renderResults();
    if (!visibleResults.length) return;
    activeResult = (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + visibleResults.length) % visibleResults.length;
    results.querySelectorAll('[role="option"]').forEach((button,index) => button.setAttribute('aria-selected', String(index === activeResult)));
    search.setAttribute('aria-activedescendant', `result-${activeResult}`);
  }
  if (event.key === 'Enter' && visibleResults.length) { event.preventDefault(); goTo(visibleResults[Math.max(0, activeResult)]); }
});
el('clear-search').addEventListener('click', () => { search.value = ''; renderResults(); search.focus(); });
document.addEventListener('pointerdown', event => { if (!(event.target as HTMLElement).closest('.search-wrap, .search-results')) closeSearch(); });
el('explore-stanford').addEventListener('click', () => goTo(PLACES[0]));
el('mobile-stanford').addEventListener('click', () => goTo(PLACES[0]));
root.querySelectorAll<HTMLElement>('[data-place]').forEach(button => button.addEventListener('click', () => {
  const place = PLACES.find(p => p.id === button.dataset.place); if (place) goTo(place);
}));
el('bay-overview').addEventListener('click', () => overview());
el('zoom-in').addEventListener('click', () => map?.zoomIn({ duration: motionDuration(300) }));
el('zoom-out').addEventListener('click', () => map?.zoomOut({ duration: motionDuration(300) }));
el('toggle-3d').addEventListener('click', () => map?.easeTo({ pitch: map.getPitch() > 5 ? 0 : 58, duration: motionDuration(700) }));
tilt.addEventListener('input', () => map?.easeTo({ pitch: Number(tilt.value), duration: 0 }));

let compassDrag: { x: number; y: number; bearing: number; pitch: number; moved: boolean; pointer: number } | undefined;
el('compass').addEventListener('pointerdown', event => {
  if (!map) return;
  compassDrag = { x: event.clientX, y: event.clientY, bearing: map.getBearing(), pitch: map.getPitch(), moved: false, pointer: event.pointerId };
  el('compass').setPointerCapture(event.pointerId);
});
el('compass').addEventListener('pointermove', event => {
  if (!compassDrag || !map) return;
  const dx = event.clientX - compassDrag.x, dy = event.clientY - compassDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) compassDrag.moved = true;
  if (compassDrag.moved) map.jumpTo({ bearing: compassDrag.bearing + dx * 1.2, pitch: Math.max(0, Math.min(65, compassDrag.pitch - dy * 0.5)) });
});
el('compass').addEventListener('pointerup', () => {
  if (compassDrag && !compassDrag.moved) map?.easeTo({ bearing: 0, duration: motionDuration(500) });
  compassDrag = undefined;
});
el('compass').addEventListener('pointercancel', () => { compassDrag = undefined; });
el('compass').addEventListener('click', event => { if (event.detail === 0) map?.easeTo({ bearing: 0, duration: motionDuration(500) }); });

const sidebarToggle = root.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
function setSidebarCompact(compact: boolean): void {
  const sidebar = root.querySelector('.sidebar')!;
  sidebar.classList.toggle('compact', compact);
  sidebarToggle.setAttribute('aria-expanded', String(!compact));
  sidebarToggle.setAttribute('aria-label', compact ? 'Expand places' : 'Collapse places');
  sidebarToggle.innerHTML = icon(compact ? 'plus' : 'minus');
}
sidebarToggle.addEventListener('click', () => setSidebarCompact(!root.querySelector('.sidebar')!.classList.contains('compact')));
if (window.innerWidth <= 760) setSidebarCompact(true);
function setHelp(open: boolean): void { el('help-panel').hidden = !open; el('help-button').setAttribute('aria-expanded', String(open)); }
el('help-button').addEventListener('click', () => setHelp(Boolean(el('help-panel').hidden)));
el('close-help').addEventListener('click', () => setHelp(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setHelp(false); });

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('json')) throw new Error(`${path}: expected a GeoJSON file`);
  return response.json();
}

async function loadCampus(): Promise<void> {
  try {
    const [buildings, boundary] = await Promise.all([fetchJson('/data/stanford-buildings.geojson'), fetchJson('/data/stanford-campus.geojson')]);
    const candidate = buildings as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
    if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features) || !candidate.features.length) throw new Error('Campus footprint collection is missing or empty');
    for (const feature of candidate.features) {
      const p = feature.properties;
      if (!p || typeof p.id !== 'string' || !Number.isFinite(p.height) || p.height <= 0 || !Number.isFinite(p.base) || p.base < 0 || p.base >= p.height || !['Polygon','MultiPolygon'].includes(feature.geometry?.type)) throw new Error('Campus footprint has invalid geometry or height');
    }
    campusData = candidate;
    campusBoundary = boundary as GeoJSON.FeatureCollection;
    if (!campusBoundary || !['Feature','FeatureCollection'].includes(campusBoundary.type)) throw new Error('Campus boundary is missing');
    allPlaces = [...PLACES, ...buildingPlaces(candidate.features)];
    sourceReady = true;
    if (map?.isStyleLoaded()) addCampusLayers();
    checkReady();
  } catch (error) {
    sourceReady = false;
    showError(`Stanford buildings could not load. Check the local campus data and retry. ${error instanceof Error ? error.message : ''}`, () => { void loadCampus(); });
  }
}

function addCampusLayers(): void {
  if (!map || !campusData || !campusBoundary) return;
  if (map.getSource('stanford')) { (map.getSource('stanford') as GeoJSONSource).setData(campusData); return; }
  map.addSource('stanford-campus', { type: 'geojson', data: campusBoundary });
  map.addLayer({ id: 'campus-ground', type: 'fill', source: 'stanford-campus', minzoom: 12.5,
    paint: { 'fill-color': '#e8e7d6', 'fill-opacity': 0.26 } }, 'regional-buildings-flat');
  map.addLayer({ id: 'campus-boundary', type: 'line', source: 'stanford-campus', minzoom: 13,
    paint: { 'line-color': '#b49a7f', 'line-width': 1, 'line-dasharray': [3,3], 'line-opacity': 0.5 } }, 'road-label');
  map.addSource('stanford', { type: 'geojson', data: campusData });
  map.addLayer({ id: 'stanford-buildings', type: 'fill-extrusion', source: 'stanford', minzoom: 13.5,
    paint: { 'fill-extrusion-color': ['get','color'], 'fill-extrusion-height': ['get','height'], 'fill-extrusion-base': ['get','base'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } }, 'road-label');
  map.addLayer({ id: 'stanford-roofs', type: 'fill-extrusion', source: 'stanford', minzoom: 13.5,
    paint: { 'fill-extrusion-color': ['get','roofColor'], 'fill-extrusion-height': ['+', ['get','height'], 0.6], 'fill-extrusion-base': ['get','height'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': false } }, 'road-label');
  map.addLayer({ id: 'stanford-names', type: 'symbol', source: 'stanford', minzoom: 16,
    filter: ['all', ['has','name'], ['!=', ['get','name'], null]],
    layout: { 'text-field': ['get','name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-max-width': 10, 'text-padding': 8, 'text-offset': [0,0.8] },
    paint: { 'text-color': '#765a44', 'text-halo-color': '#fff9eb', 'text-halo-width': 1.8 } });
  if (!campusEventsBound) {
    campusEventsBound = true;
    map.on('mouseenter','stanford-buildings', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave','stanford-buildings', () => { if (map) map.getCanvas().style.cursor = ''; });
    map.on('click','stanford-buildings', event => {
      const feature = event.features?.[0]; if (feature) showBuilding(feature.properties);
    });
  }
}

function checkReady(): void {
  if (sourceReady && tilesReady && successfulRegionalTiles > 0) { el('map-status').hidden = true; if (loadTimeout) clearTimeout(loadTimeout); }
}

function scheduleLoadDeadline(): void {
  if (loadTimeout) clearTimeout(loadTimeout);
  loadTimeout = setTimeout(() => {
    if ((!tilesReady || !successfulRegionalTiles) && !failed) {
      showError('The regional map is taking longer than expected. OpenFreeMap needs an internet connection.', reloadRegionalMap);
    }
  }, 25000);
}

function reloadRegionalMap(): void {
  tileErrorShown = false;
  successfulRegionalTiles = 0;
  tilesReady = false;
  el('map-status').hidden = false;
  scheduleLoadDeadline();
  // Recreate failed sources even when the style specification is unchanged.
  map?.setStyle(createStyle(), { diff: false });
}

function updateCameraUi(): void {
  if (!map) return;
  const pitch = Math.round(map.getPitch());
  tilt.value = String(pitch);
  el('tilt-value').textContent = `${pitch}°`;
  const is3d = pitch > 5;
  el('toggle-3d').textContent = is3d ? '2D' : '3D';
  el('toggle-3d').setAttribute('aria-label', is3d ? 'Switch to 2D' : 'Switch to 3D');
  el('toggle-3d').setAttribute('aria-pressed', String(is3d));
  (root.querySelector('.compass-needle') as HTMLElement).style.transform = `rotate(${-map.getBearing()}deg)`;
  for (const pin of pins) {
    const campus = pin.getElement().dataset.campus === 'true';
    pin.getElement().style.visibility = map.getZoom() > (campus ? 15.8 : 11.8) ? 'hidden' : 'visible';
  }
}

function startMap(): void {
  try {
    // Configure the visible region before loading any tiles. Waiting for `load`
    // first fetched a different view, then restarted the work for the overview.
    map = new maplibregl.Map({ container: 'map', center: [-122.2,37.65], zoom: 9,
      maxPitch: 65, minZoom: 7, maxZoom: 19.5, maxBounds: [[-123.5,36.7],[-120.8,38.9]],
      attributionControl: false, dragRotate: true, touchZoomRotate: true, pitchWithRotate: true,
      keyboard: true, fadeDuration: reducedMotion.matches ? 0 : 200, renderWorldCopies: false });
    const canvas = map.getCanvas();
    canvas.setAttribute('aria-label', 'Bay Area map. Drag to pan, scroll to zoom, right-drag to rotate and tilt.');
    canvas.setAttribute('role','region');
    map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>' }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
    canvas.addEventListener('keydown', event => {
      if (!map) return;
      if (event.altKey && ['ArrowLeft','ArrowRight'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        map.easeTo({ bearing: map.getBearing() + (event.key === 'ArrowLeft' ? -15 : 15), duration: motionDuration(180) });
      }
    }, { capture: true });
    map.on('load', () => {
      addCampusLayers();
      for (const place of [PLACES[0]]) {
        const button = document.createElement('button');
        button.className = 'map-pin'; button.dataset.campus = String(Boolean(place.campus));
        button.setAttribute('aria-label', 'Explore Stanford University');
        button.innerHTML = `<span class="pin-disc">${icon('campus')}</span><span class="pin-label">Stanford University<span>EXPLORE IN 3D</span></span>`;
        button.addEventListener('click', () => goTo(place));
        pins.push(new maplibregl.Marker({ element: button, anchor: 'bottom-left', offset: [-18,6] }).setLngLat(place.center).addTo(map!));
      }
      updateCameraUi();
    });
    map.on('idle', () => { tilesReady = Boolean(map?.areTilesLoaded()); checkReady(); });
    map.on('sourcedata', event => {
      if (event.sourceId === 'openmaptiles' && event.tile?.state === 'loaded') {
        successfulRegionalTiles += 1;
        checkReady();
      }
    });
    map.on('move', updateCameraUi);
    map.on('error', event => {
      const message = event.error?.message ?? '';
      if (/WebGL|context|shader/i.test(message)) {
        showError('The 3D map could not start. Enable WebGL in your browser, then retry.', () => window.location.reload());
      } else if (/fetch|network|load|HTTP|AJAX/i.test(message)) {
        if (!tileErrorShown) {
          tileErrorShown = true;
          showError('Some map detail could not load from OpenFreeMap. Check your connection and retry.', reloadRegionalMap);
        }
      } else {
        showError(`The map configuration is invalid or could not render. ${message || 'MapLibre reported an unspecified error.'} Retry to reload the map.`, () => window.location.reload());
      }
    });
    map.on('style.load', () => { if (sourceReady) addCampusLayers(); });
    map.setPadding(panelPadding());
    overview(false);
    scheduleLoadDeadline();
    map.setStyle(createStyle());
    void loadCampus();
  } catch {
    showError('The map could not initialize. This experience needs a WebGL-capable browser. Enable hardware acceleration and retry.', () => window.location.reload());
  }
}

/** Read-only observations for QA; there is deliberately no map or camera mutation API. */
Object.defineProperty(window, '__bayMap', {
  configurable: false, writable: false,
  value: Object.freeze({
    get camera() { return map ? Object.freeze({ center: Object.freeze(map.getCenter().toArray()), zoom: map.getZoom(), pitch: map.getPitch(), bearing: normalizeBearing(map.getBearing()) }) : null; },
    get ready() { return Boolean(map?.isStyleLoaded() && sourceReady && tilesReady && successfulRegionalTiles > 0 && !failed); },
    get campusBuildings() { return campusData?.features.length ?? 0; },
    get heightSources() {
      return Object.freeze((campusData?.features ?? []).reduce<Record<string, number>>((counts, feature) => {
        const source = String(feature.properties?.heightSource ?? 'unknown');
        counts[source] = (counts[source] ?? 0) + 1;
        return counts;
      }, {}));
    },
    get renderedBuildings() {
      if (!map?.getLayer('stanford-buildings')) return 0;
      return new Set(map.queryRenderedFeatures({ layers: ['stanford-buildings'] }).map((f: MapGeoJSONFeature) => f.properties.id)).size;
    },
    get selectedBuilding() { return selectedId; },
    get sources() { return Object.freeze({ campus: sourceReady, tiles: tilesReady, successfulRegionalTiles }); },
    get errors() { return failed ? Object.freeze([el('error-message').textContent]) : Object.freeze([]); },
  }),
});

function cleanup(): void {
  if (cleaned) return; cleaned = true;
  if (loadTimeout) clearTimeout(loadTimeout);
  pins.forEach(pin => pin.remove()); pins = [];
  map?.remove(); map = undefined;
}
window.addEventListener('pagehide', cleanup, { once: true });
startMap();
