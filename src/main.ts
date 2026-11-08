import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapGeoJSONFeature } from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { createStyle } from './style.ts';
import { MAX_MAP_ZOOM, PLACES, SCULPTURE_PLACES, buildingPlaces, normalizeBearing, searchPlaces, type Place } from './places.ts';
import { icon } from './icons.ts';
import { prepareBuildingDetails, createBuildingDetailsLayer, type BuildingDetailsLayer } from './building-details.ts';
import { enableMiddleMouseTilt } from './mouse-tilt.ts';
import { enableHeldKeyboardPan } from './keyboard-pan.ts';
import { createQuadArcadeVisibility } from './quad-arcade-visibility.ts';
import { BUILDING_PICK_LAYERS, quadPickingLayer } from './building-picking.ts';
import { CHURCH_ID, churchInteriorLocation } from './church-interior.ts';
import { searchWorldPlaces } from './world-search.ts';

maplibregl.setWorkerUrl(workerUrl);

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <div id="map" aria-label="Interactive world map"></div>
  <div class="search-shell" role="search">
    <div class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="Search places" autocomplete="off" aria-label="Search places" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false"/><button id="clear-search" class="clear-search" aria-label="Clear search" hidden>${icon('close')}</button></div>
    <div id="search-results" class="search-results" role="listbox" aria-label="Search results" hidden></div>
    <nav class="quick-places" aria-label="Featured places"><button id="explore-stanford" aria-label="Explore Stanford in 3D">${icon('campus')}<span>Stanford</span><small>3D</small></button><button id="explore-church" aria-label="Explore Memorial Church">Memorial Church</button></nav>
  </div>
  <section id="place-details" class="place-details" aria-label="Selected place actions" aria-live="polite" hidden></section>
  <div class="map-caption"><span class="caption-dot"></span><span id="view-name">WORLD MAP</span></div>
  <nav class="map-controls" aria-label="Map navigation">
    <button id="compass" class="control compass" aria-label="Face north" title="Face north · drag to rotate"><span class="north">N</span><span class="compass-needle">${icon('compass')}</span></button>
    <div class="zoom-controls"><button id="zoom-in" class="control" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button id="zoom-out" class="control" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
    <button id="toggle-3d" class="control mode-control" aria-label="Switch to 3D" aria-pressed="false">3D</button>
    <div class="tilt-control"><label for="tilt">TILT</label><input id="tilt" type="range" min="0" max="65" step="1" value="0" aria-label="Map tilt"/><span id="tilt-value">0°</span></div>
    <button id="help-button" class="control" aria-label="Map controls and sources" aria-expanded="false">${icon('help')}</button>
  </nav>
  <button id="world-overview" class="overview-button" aria-label="World overview">${icon('bay')}<span>World</span></button>
  <section id="church-controls" class="church-controls" aria-labelledby="church-controls-title" hidden>
    <div class="church-controls-heading"><div><span class="eyebrow">INTERIOR CUTAWAY</span><h2 id="church-controls-title">Memorial Church</h2></div><button id="church-exit" class="icon-button" aria-label="Return to church exterior" title="Return to exterior">${icon('close')}</button></div>
    <nav class="church-views" aria-label="Church interior views"><button data-church-view="whole" aria-pressed="true">Whole church</button><button data-church-view="nave" aria-pressed="false">Nave</button><button data-church-view="altar" aria-pressed="false">Altar</button><button data-church-view="organ" aria-pressed="false">Organs</button></nav>
    <div class="church-controls-footer"><label><input id="church-ceiling" type="checkbox"/> Show ceiling structure</label><button id="church-about">About this model</button></div>
    <p id="church-ready" role="status">Opening the interior…</p>
  </section>
  <section id="church-information" class="help-panel church-information" aria-label="About the church model" hidden><div class="help-title"><h2>Inside Memorial Church</h2><button id="close-church-information" class="icon-button" aria-label="Close church information">${icon('close')}</button></div><p>Interior proportions and decoration follow Stanford references and are modeled estimates. Walls facing the camera are cut away as you rotate; other walls remain complete.</p><a href="https://orsl.stanford.edu/memorial-church-layout" target="_blank" rel="noreferrer">Stanford’s interior plan ↗</a><a href="/textures/ATTRIBUTION.md" target="_blank" rel="noreferrer">Artwork photo sources and licenses ↗</a></section>
  <div id="map-status" class="map-status" role="status"><span class="loading-dot"></span>Opening the map…</div>
  <div id="error-banner" class="error-banner" role="alert" hidden><span id="error-message"></span><button id="retry">Retry</button><button id="dismiss-error" aria-label="Dismiss error">${icon('close')}</button></div>
  <section id="help-panel" class="help-panel" aria-label="Map controls and sources" hidden><div class="help-title"><h2>A map to move through</h2><button id="close-help" class="icon-button" aria-label="Close map help">${icon('close')}</button></div><dl><dt>Pan</dt><dd>Drag, hold WASD to pan, or use arrow keys</dd><dt>Zoom</dt><dd>Scroll, pinch, + / −, or double-click</dd><dt>Rotate & tilt</dt><dd>Right-drag or Ctrl-drag to rotate; middle-drag vertically to tilt; two-finger rotate on touch</dd><dt>Keyboard</dt><dd>Option/Alt + ← / → rotates; Shift + ↑ / ↓ tilts</dd><dt>North</dt><dd>Click the compass. Drag it to rotate.</dd></dl><p>Map data © OpenStreetMap contributors, OpenMapTiles and OpenFreeMap. Stanford is the first area modeled in detail. Footprints come from OpenStreetMap; untagged heights are estimates.</p><a href="/data/stanford-provenance.json" target="_blank" rel="noreferrer">Campus data provenance ↗</a></section>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const search = el<HTMLInputElement>('search');
const results = el('search-results');
const details = el('place-details');
const tilt = el<HTMLInputElement>('tilt');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let map: MapLibreMap | undefined;
let allPlaces = [...PLACES,...SCULPTURE_PLACES];
let campusData: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined;
let campusBoundary: GeoJSON.FeatureCollection | undefined;
let selectedId: string | null = null;
let visibleResults: Place[] = [];
let activeResult = -1;
let worldSearch: AbortController | undefined;
let searchRevision = 0;
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
let buildingDetails: BuildingDetailsLayer | undefined;
let churchInterior = false;
let churchCeiling = false;
let disposeMiddleMouseTilt: (() => void) | undefined;
let disposeKeyboardPan: (() => void) | undefined;
const renderTimes: number[] = [];
const motionRenderTimes: number[] = [];

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
    ? { top: 95, bottom: 80, left: 65, right: 85 }
    : { top: 125, bottom: 100, left: 20, right: 65 };
}

function overview(animate = true): void {
  if (!map) return;
  search.value='';el('clear-search').hidden=true;closeSearch();search.blur();
  map.flyTo({ center: [0,20], zoom: 1.5, padding: panelPadding(), pitch: 0, bearing: 0, duration: animate ? motionDuration(1700) : 0 });
  el('view-name').textContent = 'WORLD MAP';
  closeDetails();
}

function goTo(place: Place): void {
  if (!map) return;
  search.value=place.name;el('clear-search').hidden=false;
  setChurchInterior(false);
  map.flyTo({ center: place.center, zoom: place.zoom, pitch: place.campus ? 58 : 0, bearing: place.campus ? -28 : 0,
    padding: window.innerWidth > 760 ? { top: 95, bottom: 180, left: 65, right: 85 } : { top: 125, bottom: 180, left: 20, right: 65 },
    duration: motionDuration(place.campus ? 2400 : 1800), essential: false });
  el('view-name').textContent = place.campus ? 'STANFORD UNIVERSITY · 3D CAMPUS' : place.name.toUpperCase();
  closeSearch();
  search.blur();
  if (place.buildingId) {
    const feature = campusData?.features.find(f => f.properties?.id === place.buildingId);
    if (feature) showBuilding(feature.properties ?? {});
  } else if(place.sculptureId)showSculpture(place.sculptureId);
  else if (place.campus) showCampus();
  else showCity(place);
}

function showCampus(): void {
  selectedId = null;
  updateSelection();
  details.hidden = false;
  details.innerHTML = `<div class="detail-heading"><div><span class="eyebrow">FEATURED IN 3D</span><h2>Stanford University</h2></div><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><div class="place-actions"><button class="detail-action" id="quad-view">Main Quad ${icon('arrow')}</button><button class="detail-action" id="campus-church">Memorial Church ${icon('arrow')}</button><button class="text-action" id="sculpture-view">Sculpture</button></div>`;
  details.querySelector('.close-details')?.addEventListener('click', closeDetails);
  el('quad-view').addEventListener('click', () => {
    map?.flyTo({ center: [-122.1702,37.4276], zoom: 17.5, pitch: 60, bearing: -34, duration: motionDuration(1500) });
  });
  el('sculpture-view').addEventListener('click',()=>goTo(SCULPTURE_PLACES[0]));
  el('campus-church').addEventListener('click',goToChurch);
}

function showSculpture(id:string):void {
  const place=SCULPTURE_PLACES.find(p=>p.sculptureId===id);
  if(!place)return;
  selectedId=null;updateSelection();details.hidden=false;
  details.innerHTML=`<div class="detail-heading"><div><span class="eyebrow">${escapeHtml(place.artist)} · ${escapeHtml(place.material)}</span><h2>${escapeHtml(place.name)}</h2></div><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><div class="place-actions"><button class="detail-action" id="next-sculpture">Other sculpture ${icon('arrow')}</button><button class="text-action" id="sculpture-campus">Campus</button><a class="text-action" href="${escapeHtml(place.sourceUrl)}" target="_blank" rel="noreferrer">Source ↗</a></div>`;
  details.querySelector('.close-details')?.addEventListener('click',closeDetails);
  el('next-sculpture').addEventListener('click',()=>goTo(SCULPTURE_PLACES.find(p=>p.sculptureId!==id)!));
  el('sculpture-campus').addEventListener('click',()=>goTo(PLACES[0]));
}

function showCity(place: Place): void {
  selectedId = null;
  updateSelection();
  details.hidden = true;
}

function showBuilding(properties: Record<string, unknown>): void {
  setChurchInterior(false);
  selectedId = String(properties.id);
  updateSelection();
  details.hidden = false;
  const height = Number(properties.height);
  const source = properties.heightSource === 'osm-height' ? 'Mapped height' : properties.heightSource === 'osm-levels' ? 'From mapped floor count' : 'Estimated height';
  details.innerHTML = `<div class="detail-heading"><div><span class="eyebrow">${Number.isFinite(height) ? `${Math.round(height * 10) / 10} m · ` : ''}${source}</span><h2>${escapeHtml(properties.name || 'Campus building')}</h2></div><button class="icon-button close-details" aria-label="Close place details">${icon('close')}</button></div><div class="place-actions"><button class="detail-action" id="building-campus">View the whole campus ${icon('arrow')}</button></div>`;
  details.querySelector('.close-details')?.addEventListener('click', closeDetails);
  el('building-campus').addEventListener('click', () => goTo(PLACES[0]));
  if(selectedId===CHURCH_ID){
    const button=document.createElement('button');button.id='church-enter';button.className='detail-action';button.innerHTML=`Explore the interior ${icon('arrow')}`;
    button.addEventListener('click',enterChurchInterior);el('building-campus').before(button);el('building-campus').className='text-action';
  }
}

function closeDetails(): void {
  setChurchInterior(false);
  selectedId = null;
  updateSelection();
  details.hidden = true;
}

function updateSelection(): void {
  if (!map?.getLayer('stanford-buildings')) return;
  map.setPaintProperty('stanford-buildings', 'fill-extrusion-color', ['case', ['==', ['get','id'], selectedId ?? ''], '#e5ad64', ['coalesce', ['get','detailWallColor'], ['get','color']]]);
  map.setPaintProperty('stanford-roofs', 'fill-extrusion-color', ['case', ['==', ['get','id'], selectedId ?? ''], '#c56c3e', ['coalesce', ['get','detailRoofColor'], ['get','roofColor']]]);
  buildingDetails?.setSelected(selectedId);
}

/** The map owns both views. Native church caps must disappear with its exterior
 * detail mesh, and recover even after a style retry or graphics restoration. */
function syncChurchVisibility():void {
  if(!map)return;
  for(const id of ['stanford-buildings','stanford-roofs'])if(map.getLayer(id))map.setFilter(id,churchInterior?['!=',['get','id'],CHURCH_ID]:null);
  quadArcadeVisibility.sync(map,Boolean(!churchInterior&&buildingDetails?.stats.ready));
}

function setChurchInterior(enabled:boolean):void {
  if(churchInterior===enabled)return;
  churchInterior=enabled;churchCeiling=false;
  el('church-information').hidden=true;
  if(enabled)details.hidden=true;
  buildingDetails?.setInterior(enabled);buildingDetails?.setCeiling(false);
  el<HTMLInputElement>('church-ceiling').checked=false;
  el('church-controls').hidden=!enabled;root.classList.toggle('church-interior',enabled);
  if(enabled)el('church-ready').textContent='Opening the interior…';
  syncChurchVisibility();
}

function showInteriorInformation():void {
  el('church-information').hidden=false;
}

function interiorView(view:string):void {
  if(!map||!campusData||!churchInterior)return;
  const views:Record<string,{x:number;y:number;zoom:number;bearing:number;pitch:number}>={
    whole:{x:0,y:30,zoom:19.85,bearing:120,pitch:55},
    nave:{x:0,y:21,zoom:20.2,bearing:120,pitch:60},
    altar:{x:0,y:57,zoom:20.8,bearing:175,pitch:60},
    organ:{x:0,y:-4,zoom:20.6,bearing:15,pitch:60}
  };
  const target=views[view];if(!target)return;
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-church-view]'))button.setAttribute('aria-pressed',String(button.dataset.churchView===view));
  const mobile=window.innerWidth<=760;
  const zoom=view==='whole'?target.zoom+Math.min(0,Math.log2(Math.max(160,window.innerWidth-(mobile?90:180))/1000)):target.zoom-(mobile?1.25:0);
  map.flyTo({center:churchInteriorLocation(campusData,target.x,target.y),zoom,bearing:target.bearing,pitch:target.pitch,
    padding:mobile?{top:125,bottom:245,left:20,right:65}:{top:95,bottom:215,left:65,right:85},duration:motionDuration(1200)});
}

function enterChurchInterior():void {
  if(!map||!campusData)return;
  selectedId=CHURCH_ID;updateSelection();setChurchInterior(true);closeSearch();search.blur();
  el('view-name').textContent='MEMORIAL CHURCH · INTERIOR';interiorView('whole');
}

for(const button of root.querySelectorAll<HTMLButtonElement>('[data-church-view]'))button.addEventListener('click',()=>interiorView(button.dataset.churchView!));
el('church-about').addEventListener('click',showInteriorInformation);
el('close-church-information').addEventListener('click',()=>{el('church-information').hidden=true;});
el('church-ceiling').addEventListener('change',()=>{churchCeiling=el<HTMLInputElement>('church-ceiling').checked;buildingDetails?.setCeiling(churchCeiling);});
el('church-exit').addEventListener('click',()=>{
  const place=allPlaces.find(value=>value.buildingId===CHURCH_ID);if(place)goTo(place);else goTo(PLACES[0]);
});

function closeSearch(): void {
  worldSearch?.abort();worldSearch=undefined;searchRevision++;
  results.hidden = true;
  results.removeAttribute('aria-busy');
  search.setAttribute('aria-expanded', 'false');
  search.removeAttribute('aria-activedescendant');
  activeResult = -1;
}

function renderResults(): void {
  worldSearch?.abort();worldSearch=undefined;searchRevision++;
  el('clear-search').hidden = !search.value;
  visibleResults = searchPlaces(search.value, allPlaces);
  activeResult = -1;
  if (!search.value.trim()) { closeSearch(); return; }
  drawResults();
}

function drawResults():void {
  results.hidden = false;
  results.removeAttribute('aria-busy');
  search.setAttribute('aria-expanded', 'true');
  search.removeAttribute('aria-activedescendant');
  results.innerHTML = visibleResults.length
    ? visibleResults.map((place, index) => `<button class="search-result" id="result-${index}" role="option" aria-selected="false" data-result="${index}" tabindex="-1"><span class="result-icon">${icon(place.campus ? 'campus' : 'bay')}</span><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.subtitle)}</small></span>${icon('chevron')}</button>`).join('')
    : `<div class="no-results"><strong>No matching places in this list</strong><span>Search worldwide for a city, address or landmark.</span></div>`;
  results.insertAdjacentHTML('beforeend',`<button id="search-world" class="search-world">Search worldwide ${icon('search')}</button><p class="search-credit"><a href="https://photon.komoot.io" target="_blank" rel="noreferrer">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></p>`);
  results.querySelectorAll<HTMLElement>('[data-result]').forEach(button => button.addEventListener('click', () => goTo(visibleResults[Number(button.dataset.result)])));
  el('search-world').addEventListener('click',()=>{void submitWorldSearch();});
}

async function submitWorldSearch():Promise<void> {
  const query=search.value.trim();if(!query)return;
  worldSearch?.abort();const controller=new AbortController();worldSearch=controller;
  const revision=++searchRevision;activeResult=-1;visibleResults=[];
  results.hidden=false;results.setAttribute('aria-busy','true');search.setAttribute('aria-expanded','true');search.removeAttribute('aria-activedescendant');
  results.innerHTML='<p class="no-results" role="status">Searching worldwide…</p>';
  try {
    const places=await searchWorldPlaces(query,{signal:controller.signal});
    if(controller.signal.aborted||revision!==searchRevision)return;
    visibleResults=places;drawResults();
    if(!places.length)results.querySelector('.no-results')!.innerHTML='<strong>No places found</strong><span>Try a more specific city, address or landmark.</span>';
  } catch(error) {
    if(controller.signal.aborted||revision!==searchRevision)return;
    results.innerHTML=`<div class="no-results" role="alert"><strong>Search could not finish</strong><span>${escapeHtml(error instanceof Error?error.message:'Check your connection and try again.')}</span></div><button id="retry-search" class="search-world">Retry search ${icon('search')}</button>`;
    el('retry-search').addEventListener('click',()=>{void submitWorldSearch();});
  } finally {
    if(revision===searchRevision){worldSearch=undefined;results.removeAttribute('aria-busy');}
  }
}

search.addEventListener('input', renderResults);
search.addEventListener('focus', renderResults);
search.addEventListener('keydown', event => {
  if (event.isComposing || event.keyCode === 229) return;
  if (event.key === 'Escape') { closeSearch(); search.blur(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (results.hidden) renderResults();
    if (!visibleResults.length) return;
    activeResult = (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + visibleResults.length) % visibleResults.length;
    results.querySelectorAll('[role="option"]').forEach((button,index) => button.setAttribute('aria-selected', String(index === activeResult)));
    search.setAttribute('aria-activedescendant', `result-${activeResult}`);
  }
  if (event.key === 'Enter') { event.preventDefault(); if(visibleResults.length)goTo(visibleResults[Math.max(0, activeResult)]);else void submitWorldSearch(); }
});
el('clear-search').addEventListener('click', () => { search.value = ''; renderResults(); search.focus(); });
document.addEventListener('pointerdown', event => { if (!(event.target as HTMLElement).closest('.search-wrap, .search-results')) closeSearch(); });
el('explore-stanford').addEventListener('click', () => goTo(PLACES[0]));
function goToChurch():void { const place=allPlaces.find(p=>p.buildingId===CHURCH_ID); if(place)goTo(place);else goTo(PLACES[0]); }
el('explore-church').addEventListener('click',goToChurch);
el('world-overview').addEventListener('click', () => overview());
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

function setHelp(open: boolean): void { el('help-panel').hidden = !open; el('help-button').setAttribute('aria-expanded', String(open)); }
el('help-button').addEventListener('click', () => setHelp(Boolean(el('help-panel').hidden)));
el('close-help').addEventListener('click', () => setHelp(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') {setHelp(false);el('church-information').hidden=true;} });

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
    campusData = prepareBuildingDetails(candidate);
    campusBoundary = boundary as GeoJSON.FeatureCollection;
    if (!campusBoundary || !['Feature','FeatureCollection'].includes(campusBoundary.type)) throw new Error('Campus boundary is missing');
    allPlaces = [...PLACES,...SCULPTURE_PLACES, ...buildingPlaces(candidate.features)];
    sourceReady = true;
    if (map?.isStyleLoaded()) addCampusLayers();
    checkReady();
  } catch (error) {
    sourceReady = false;
    showError(`Stanford buildings could not load. Check the local campus data and retry. ${error instanceof Error ? error.message : ''}`, () => { void loadCampus(); });
  }
}

function addBuildingDetailLayer(): void {
  if (!map || !campusData || map.getLayer('stanford-architectural-details')) return;
  buildingDetails = createBuildingDetailsLayer(campusData, message => showError(`Stanford building detail could not render. Retry to rebuild the campus layer. ${message}`, reloadRegionalMap));
  map.addLayer(buildingDetails, 'road-label');
  buildingDetails.setSelected(selectedId);
  buildingDetails.setInterior(churchInterior);buildingDetails.setCeiling(churchCeiling);
}

const quadArcadeVisibility=createQuadArcadeVisibility();

function addCampusLayers(): void {
  if (!map || !campusData || !campusBoundary) return;
  if (map.getSource('stanford')) {
    (map.getSource('stanford') as GeoJSONSource).setData(campusData);
    // MapLibre restores standard layers after a lost context; custom layers
    // must be attached again even when their source already exists.
    addBuildingDetailLayer();
    syncChurchVisibility();
    return;
  }
  map.addSource('stanford-campus', { type: 'geojson', data: campusBoundary });
  map.addLayer({ id: 'campus-ground', type: 'fill', source: 'stanford-campus', minzoom: 12.5,
    paint: { 'fill-color': '#e8e7d6', 'fill-opacity': 0.26 } }, 'regional-buildings-flat');
  map.addLayer({ id: 'campus-boundary', type: 'line', source: 'stanford-campus', minzoom: 13,
    paint: { 'line-color': '#b49a7f', 'line-width': 1, 'line-dasharray': [3,3], 'line-opacity': 0.5 } }, 'road-label');
  map.addSource('stanford', { type: 'geojson', data: campusData });
  quadArcadeVisibility.reset();
  map.addLayer({ id: 'stanford-buildings', type: 'fill-extrusion', source: 'stanford', minzoom: 13.5,
    paint: { 'fill-extrusion-color': ['coalesce', ['get','detailWallColor'], ['get','color']], 'fill-extrusion-height': ['get','detailWallHeight'], 'fill-extrusion-height-transition': { duration:0 }, 'fill-extrusion-base': ['get','base'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } }, 'road-label');
  map.addLayer({ id: 'stanford-roofs', type: 'fill-extrusion', source: 'stanford', minzoom: 13.5,
    paint: { 'fill-extrusion-color': ['coalesce', ['get','detailRoofColor'], ['get','roofColor']], 'fill-extrusion-height': ['+', ['get','detailWallHeight'], 0.05], 'fill-extrusion-base': ['get','detailWallHeight'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': false } }, 'road-label');
  addBuildingDetailLayer();
  map.addLayer(quadPickingLayer(), 'road-label');
  map.addLayer({ id: 'stanford-names', type: 'symbol', source: 'stanford', minzoom: 16,
    filter: ['all', ['has','name'], ['!=', ['get','name'], null]],
    layout: { 'text-field': ['get','name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-max-width': 10, 'text-padding': 8, 'text-offset': [0,0.8] },
    paint: { 'text-color': '#765a44', 'text-halo-color': '#fff9eb', 'text-halo-width': 1.8 } });
  if (!campusEventsBound) {
    campusEventsBound = true;
    map.on('mouseenter',BUILDING_PICK_LAYERS, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave',BUILDING_PICK_LAYERS, () => { if (map) map.getCanvas().style.cursor = ''; });
    map.on('click',BUILDING_PICK_LAYERS, event => {
      const feature = event.features?.[0]; if (feature) showBuilding(feature.properties);
    });
  }
  syncChurchVisibility();
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
    map = new maplibregl.Map({ container: 'map', center: [0,20], zoom: 1.5,
      maxPitch: 65, minZoom: 0, maxZoom: MAX_MAP_ZOOM,
      canvasContextAttributes: { antialias:true },
      attributionControl: false, dragRotate: { around: 'center', movement: 'linear' }, rotateSpeed: 0.25, pitchSpeed: -0.25,
      touchZoomRotate: true, pitchWithRotate: true,
      keyboard: true, fadeDuration: reducedMotion.matches ? 0 : 200, renderWorldCopies: true });
    const canvas = map.getCanvas();
    canvas.setAttribute('aria-label', 'World map. Drag or use WASD and arrow keys to pan, scroll to zoom, right-drag to rotate, middle-drag to tilt.');
    canvas.setAttribute('role','region');
    disposeMiddleMouseTilt = enableMiddleMouseTilt(map);
    disposeKeyboardPan = enableHeldKeyboardPan(map);
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
    map.on('render', () => {
      quadArcadeVisibility.sync(map,Boolean(!churchInterior&&buildingDetails?.stats.ready));
      if(churchInterior){
        const message=buildingDetails?.stats.error?'Interior detail could not load. Use Retry above.':buildingDetails?.stats.ready?'Drag to pan · scroll to zoom · drag the compass to rotate':'Opening the interior…';
        if(el('church-ready').textContent!==message)el('church-ready').textContent=message;
      }
      const time = performance.now();
      renderTimes.push(time);
      if (renderTimes.length > 1800) renderTimes.shift();
      if (map?.isMoving()) {
        motionRenderTimes.push(time);
        if (motionRenderTimes.length > 1800) motionRenderTimes.shift();
      }
    });
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
    get interior() { return Object.freeze({active:churchInterior,ceiling:churchCeiling}); },
    get sources() { return Object.freeze({ campus: sourceReady, tiles: tilesReady, successfulRegionalTiles }); },
    get rendering() { return Object.freeze({ frames: Object.freeze([...renderTimes]), motionFrames: Object.freeze([...motionRenderTimes]), pixelRatio: map?.getPixelRatio() ?? 0 }); },
    get details() { return buildingDetails?.stats ?? null; },
    get errors() { return failed ? Object.freeze([el('error-message').textContent]) : Object.freeze([]); },
  }),
});

function cleanup(): void {
  if (cleaned) return; cleaned = true;
  worldSearch?.abort();worldSearch=undefined;searchRevision++;
  if (loadTimeout) clearTimeout(loadTimeout);
  pins.forEach(pin => pin.remove()); pins = [];
  disposeMiddleMouseTilt?.(); disposeMiddleMouseTilt = undefined;
  disposeKeyboardPan?.(); disposeKeyboardPan = undefined;
  map?.remove(); map = undefined;
  buildingDetails = undefined;
}
window.addEventListener('pagehide', cleanup, { once: true });
startMap();
