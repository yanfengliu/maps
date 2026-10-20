#!/usr/bin/env node
// No dependencies. Source geometry is OSM geometry, never generated footprints.
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const CAMPUS_WAY = '29268613';
export const BOUNDS = [-122.19, 37.415, -122.15, 37.445];
export const TILES = [
  [-122.19, 37.415, -122.17, 37.430], [-122.17, 37.415, -122.15, 37.430],
  [-122.19, 37.430, -122.17, 37.445], [-122.17, 37.430, -122.15, 37.445],
];
const SOURCE_URL = 'https://www.openstreetmap.org/api/0.6/map?bbox=';
const COLOR = '#e8ddca';
const ROOF_COLOR = '#b96f54';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const decode = value => value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0] === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const attributes = text => Object.fromEntries([...text.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));

export function parseOsm(xml) {
  if (!xml.includes('<osm ') || !xml.includes('</osm>')) throw new Error('Expected a complete OSM XML document.');
  const elements = [];
  for (const match of xml.matchAll(/<(node|way|relation)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g)) {
    const [, type, raw, body = ''] = match;
    const a = attributes(raw);
    const tags = Object.fromEntries([...body.matchAll(/<tag\b([^>]+)\/>/g)].map(tag => { const t = attributes(tag[1]); return [t.k, t.v]; }));
    const element = { type, id: a.id, version: Number(a.version), timestamp: a.timestamp, tags };
    if (type === 'node') element.coordinate = [Number(a.lon), Number(a.lat)];
    if (type === 'way') element.nodes = [...body.matchAll(/<nd\b([^>]+)\/>/g)].map(nd => attributes(nd[1]).ref);
    if (type === 'relation') element.members = [...body.matchAll(/<member\b([^>]+)\/>/g)].map(member => attributes(member[1]));
    elements.push(element);
  }
  return elements;
}

export function signedArea(ring) {
  // Translate before multiplying to retain precision on small geographic shapes.
  const [x, y] = ring[0];
  return ring.slice(1).reduce((area, point, i) => area + (ring[i][0] - x) * (point[1] - y) - (point[0] - x) * (ring[i][1] - y), 0) / 2;
}
const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
export function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-14 && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function segmentInsideRing(a, b, ring) {
  if (!pointInRing(a, ring) || !pointInRing(b, ring)) return false;
  const direction = [b[0] - a[0], b[1] - a[1]];
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  const cuts = [0, 1];
  for (let i = 0; i < ring.length - 1; i++) {
    const c = ring[i], d = ring[i + 1];
    const edge = [d[0] - c[0], d[1] - c[1]];
    const offset = [c[0] - a[0], c[1] - a[1]];
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) > 1e-18) {
      const t = cross(offset, edge) / denominator;
      const u = cross(offset, direction) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) cuts.push(t);
    } else if (Math.abs(cross(offset, direction)) < 1e-18) {
      const axis = Math.abs(direction[0]) >= Math.abs(direction[1]) ? 0 : 1;
      if (direction[axis] !== 0) for (const point of [c, d]) {
        const t = (point[axis] - a[axis]) / direction[axis];
        if (t > 0 && t < 1) cuts.push(t);
      }
    }
  }
  cuts.sort((x, y) => x - y);
  return cuts.slice(1).every((end, i) => {
    const t = (cuts[i] + end) / 2;
    return pointInRing([a[0] + t * direction[0], a[1] + t * direction[1]], ring);
  });
}
export function ringInsideRing(inner, outer) {
  return inner.slice(1).every((point, i) => segmentInsideRing(inner[i], point, outer));
}
export function isSimpleRing(ring) {
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < ring.length - 1; i++) {
    if (equal(ring[i], ring[i + 1])) return false;
    for (let j = i + 2; j < ring.length - 1; j++) {
      if (i === 0 && j === ring.length - 2) continue;
      const a = ring[i], b = ring[i + 1], c = ring[j], d = ring[j + 1];
      if (equal(a, c) || equal(a, d) || equal(b, c) || equal(b, d)) return false;
      if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0) return false;
    }
  }
  return ring.length >= 4 && equal(ring[0], ring.at(-1)) && Math.abs(signedArea(ring)) > 1e-13;
}
const orientRing = (ring, outer) => (signedArea(ring) > 0) === outer ? ring : [...ring].reverse();

export function parseMetres(value) {
  if (typeof value !== 'string') return null;
  const metric = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?$/i);
  if (metric) return Number(metric[1]);
  const feet = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|')$/i);
  return feet ? Number(feet[1]) * 0.3048 : null;
}
const positive = value => value !== null && Number.isFinite(value) && value > 0;
export function heightProperties(tags) {
  const recorded = parseMetres(tags.height);
  const levels = Number(tags['building:levels']);
  const roofHeight = parseMetres(tags['roof:height']);
  const roofLevels = Number(tags['roof:levels']);
  const extraRoof = positive(roofHeight) ? roofHeight : positive(roofLevels) ? roofLevels * 3 : 0;
  const building = tags.building || tags['building:part'] || 'yes';
  const defaults = { garage: 4, garages: 4, shed: 3.5, roof: 4, greenhouse: 4, dormitory: 12, apartments: 12, church: 24, chapel: 16, stadium: 18, grandstand: 12, school: 12, university: 12, hospital: 18 };
  let height = positive(recorded) ? recorded : positive(levels) ? levels * 3 + extraRoof : defaults[building] || 10;
  const heightSource = positive(recorded) ? 'osm-height' : positive(levels) ? 'osm-levels' : 'estimated';
  const minHeight = parseMetres(tags.min_height);
  const minLevel = Number(tags['building:min_level']);
  const base = positive(minHeight) ? minHeight : positive(minLevel) ? minLevel * 3 : 0;
  if (height <= base) height = base + 3;
  return { height: Math.round(height * 100) / 100, base: Math.round(base * 100) / 100, heightSource };
}

function stitch(segments) {
  const remaining = segments.map(segment => [...segment]);
  const rings = [];
  while (remaining.length) {
    let ring = remaining.shift();
    while (ring[0] !== ring.at(-1)) {
      const index = remaining.findIndex(segment => segment[0] === ring.at(-1) || segment.at(-1) === ring.at(-1));
      if (index === -1) throw new Error('Open multipolygon ring.');
      const next = remaining.splice(index, 1)[0];
      if (next[0] !== ring.at(-1)) next.reverse();
      ring = ring.concat(next.slice(1));
    }
    rings.push(ring);
  }
  return rings;
}

export function convertOsm(extracts) {
  const elements = new Map();
  for (const extract of extracts) for (const element of parseOsm(extract)) {
    const key = `${element.type}/${element.id}`;
    const previous = elements.get(key);
    if (!previous || previous.version <= element.version) elements.set(key, element);
  }
  const get = (type, id) => {
    const element = elements.get(`${type}/${id}`);
    if (!element) throw new Error(`Source lacks ${type}/${id}; fetch every tile or use a complete cached source.`);
    return element;
  };
  const coordinates = nodeIds => nodeIds.map(id => get('node', id).coordinate);
  const campus = get('way', CAMPUS_WAY);
  const campusRing = orientRing(coordinates(campus.nodes), true);
  if (!isSimpleRing(campusRing)) throw new Error(`Campus way/${CAMPUS_WAY} is not a simple closed ring.`);
  const geometry = element => {
    if (element.type === 'way') {
      const ring = coordinates(element.nodes);
      if (!isSimpleRing(ring)) throw new Error('Invalid or self-intersecting source ring.');
      return { type: 'Polygon', coordinates: [orientRing(ring, true)] };
    }
    const memberRings = role => stitch(element.members.filter(member => member.type === 'way' && (member.role || 'outer') === role).map(member => get('way', member.ref).nodes)).map(coordinates);
    const outers = memberRings('outer');
    const inners = memberRings('inner');
    if (!outers.length || [...outers, ...inners].some(ring => !isSimpleRing(ring))) throw new Error('Invalid or self-intersecting source multipolygon.');
    const polygons = outers.map(ring => [orientRing(ring, true)]);
    for (const inner of inners) {
      const container = polygons.find(polygon => pointInRing(inner[0], polygon[0]));
      if (!container) throw new Error('Source courtyard is outside all outer rings.');
      container.push(orientRing(inner, false));
    }
    return polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons };
  };
  const isBuilding = element => Boolean((element.tags.building && element.tags.building !== 'no') || (element.tags['building:part'] && element.tags['building:part'] !== 'no'));
  const candidates = [...elements.values()].filter(element => element.type !== 'node' && isBuilding(element));
  // Multipolygon outlines must not be extruded a second time as standalone ways.
  const relationMembers = new Set(candidates.filter(element => element.type === 'relation' && element.tags.type === 'multipolygon').flatMap(element => element.members.filter(member => member.type === 'way').map(member => member.ref)));
  // Complete OSM building relations explicitly identify an outline and its 3D parts.
  const replacedOutlines = new Set([...elements.values()].filter(element => element.type === 'relation' && element.tags.type === 'building' && element.members.some(member => member.role === 'part')).flatMap(element => element.members.filter(member => member.role === 'outline').map(member => `${member.type}/${member.ref}`)));
  const features = [];
  const excluded = [];
  for (const element of candidates.sort((a, b) => `${a.type}/${a.id}`.localeCompare(`${b.type}/${b.id}`, 'en', { numeric: true }))) {
    const id = `${element.type}/${element.id}`;
    if ((element.type === 'way' && relationMembers.has(element.id)) || replacedOutlines.has(id)) continue;
    // A mapped zero height deliberately supplies a non-extruded outline, not a missing height.
    if (parseMetres(element.tags.height) === 0) continue;
    let shape;
    try { shape = geometry(element); } catch (error) { excluded.push({ id, reason: error.message }); continue; }
    const polygons = shape.type === 'Polygon' ? [shape.coordinates] : shape.coordinates;
    // Keep complete campus footprints only. Do not clip a building into a fabricated shape.
    if (!polygons.every(polygon => ringInsideRing(polygon[0], campusRing))) continue;
    const tags = element.tags;
    const properties = {
      id, name: tags.name || null, ...heightProperties(tags), color: COLOR, roofColor: ROOF_COLOR,
      building: tags.building || tags['building:part'], part: Boolean(tags['building:part']),
      osmVersion: element.version,
    };
    for (const key of ['height', 'min_height', 'building:levels', 'building:min_level', 'roof:shape', 'roof:height', 'roof:levels', 'roof:material', 'roof:colour', 'material', 'wikidata']) if (tags[key]) properties[`osm:${key}`] = tags[key];
    features.push({ type: 'Feature', id, properties, geometry: shape });
  }
  // Some OSM 3D parts have no type=building grouping relation (notably Hoover Tower).
  // A source part covering most of a simple outline establishes that its parts replace it.
  const suppressed3DOutlines = [];
  for (const outline of features.filter(feature => !feature.properties.part && feature.geometry.type === 'Polygon' && feature.geometry.coordinates.length === 1)) {
    const outer = outline.geometry.coordinates[0];
    const area = Math.abs(signedArea(outer));
    const contained = features.filter(feature => feature.properties.part && feature.geometry.type === 'Polygon' && ringInsideRing(feature.geometry.coordinates[0], outer));
    if (!contained.some(feature => Math.abs(signedArea(feature.geometry.coordinates[0])) >= area * 0.8)) continue;
    const tallest = contained.reduce((current, feature) => feature.properties.height > current.properties.height ? feature : current);
    if (outline.properties.name && !tallest.properties.name) {
      tallest.properties.name = outline.properties.name;
      tallest.properties.nameSource = 'osm-building-outline';
      tallest.properties['osm:outline'] = outline.id;
    }
    suppressed3DOutlines.push({ id: outline.id, name: outline.properties.name, renderedParts: contained.map(feature => feature.id) });
  }
  const suppressedIds = new Set(suppressed3DOutlines.map(outline => outline.id));
  return {
    buildings: { type: 'FeatureCollection', features: features.filter(feature => !suppressedIds.has(feature.id)) },
    campus: { type: 'FeatureCollection', features: [{ type: 'Feature', id: `way/${CAMPUS_WAY}`, properties: { id: `way/${CAMPUS_WAY}`, name: 'Stanford University', osmVersion: campus.version, source: `https://www.openstreetmap.org/way/${CAMPUS_WAY}`, boundaryMeaning: 'OSM amenity=university campus perimeter; not a cadastral boundary.' }, geometry: { type: 'Polygon', coordinates: [campusRing] } }] },
    excluded, suppressed3DOutlines,
  };
}

export async function buildData({ sourceDir, outputDir, fetchedAt }) {
  const sources = [];
  for (let i = 0; i < TILES.length; i++) {
    const file = `stanford-tile-${i}.osm`;
    const bytes = await readFile(path.join(sourceDir, file));
    const retrievedAt = (await stat(path.join(sourceDir, file))).mtime.toISOString();
    sources.push({ file, url: SOURCE_URL + TILES[i].join(','), retrievedAt, bytes: bytes.length, sha256: sha256(bytes), xml: bytes.toString('utf8') });
  }
  const converted = convertOsm(sources.map(source => source.xml));
  await mkdir(outputDir, { recursive: true });
  const outputs = {};
  for (const [name, data] of [['stanford-buildings.geojson', converted.buildings], ['stanford-campus.geojson', converted.campus]]) {
    const bytes = JSON.stringify(data) + '\n';
    if (Buffer.byteLength(bytes) > 512 * 1024) throw new Error(`${name} exceeds the 512 KiB data budget.`);
    await writeFile(path.join(outputDir, name), bytes);
    outputs[name] = { bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
  }
  const heightSources = Object.fromEntries(['osm-height', 'osm-levels', 'estimated'].map(source => [source, converted.buildings.features.filter(feature => feature.properties.heightSource === source).length]));
  const provenance = {
    schemaVersion: 1, fetchedAt: fetchedAt || sources.map(source => source.retrievedAt).sort().at(-1), source: 'OpenStreetMap API 0.6 bounded map extracts',
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', licenseUrl: 'https://www.openstreetmap.org/copyright',
    sourceBounds: BOUNDS, campusBoundary: { type: 'way', id: CAMPUS_WAY, version: converted.campus.features[0].properties.osmVersion, url: `https://www.openstreetmap.org/way/${CAMPUS_WAY}` },
    selection: 'Complete Polygon/MultiPolygon footprints whose complete outer-ring edges are inside the mapped Stanford University perimeter. Every edge is split at boundary intersections and every resulting interval is tested. Includes campus housing and medical facilities within that perimeter; excludes surrounding Palo Alto. Courtyards are retained. Relation member outlines, explicitly replaced 3D outlines, and explicit height=0 outlines are not extruded twice.',
    partsPolicy: 'A simple building outline is suppressed when a contained mapped building part covers at least 80% of its footprint. All mapped parts retain their real coordinates and heights; the outline name is inherited by the tallest unnamed part. This presentation heuristic avoids hiding detailed mapped parts under a single full-height extrusion.',
    heightPolicy: { priority: ['OSM height (metres; ft converted by 0.3048)', 'OSM building:levels × 3 m + roof:height or roof:levels × 3 m', 'Estimated by building type: university/school/dormitory/apartments 12 m; hospital/stadium 18 m; church 24 m; chapel 16 m; grandstand 12 m; garage/roof/greenhouse 4 m; shed 3.5 m; otherwise 10 m'], base: 'OSM min_height, then building:min_level × 3 m, otherwise ground 0 m. These are extrusion offsets, not surveyed terrain elevations.', limitation: 'Footprints are mapped source data. OSM heights are recorded tags, not independently measured. Level-based heights remain estimates. Missing-height defaults are illustrative, not a survey or detailed architectural reconstruction. Colors are an authored sandstone and terracotta palette, not measured materials.' },
    featureCount: converted.buildings.features.length, heightSources, excludedInvalidSourceFeatures: converted.excluded, suppressed3DOutlines: converted.suppressed3DOutlines,
    sources: sources.map(({ xml, ...source }) => source), outputs,
    generator: 'tools/data/fetch-stanford.mjs',
    largeBlobReason: 'The campus footprint GeoJSON is intentionally retained as a product input. Its size preserves real Stanford footprint vertices and courtyard holes rather than substituting invented boxes.',
  };
  await writeFile(path.join(outputDir, 'stanford-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  return provenance;
}

async function main() {
  const args = process.argv.slice(2);
  const option = name => { const index = args.indexOf(name); return index === -1 ? undefined : args[index + 1]; };
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const sourceDir = path.resolve(option('--source-dir') || path.join(root, 'artifacts/stanford-source'));
  const outputDir = path.resolve(option('--output-dir') || path.join(root, 'public/data'));
  const fetchedAt = option('--fetched-at');
  if (!args.includes('--cached')) {
    await mkdir(sourceDir, { recursive: true });
    for (let i = 0; i < TILES.length; i++) {
      const response = await fetch(SOURCE_URL + TILES[i].join(','), { headers: { 'User-Agent': 'StanfordCampusMapPrototype/1.0 (https://github.com/yanfengliu/maps)' }, signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`OSM tile ${i} returned HTTP ${response.status}; retry later or pass --cached with a complete source directory.`);
      await writeFile(path.join(sourceDir, `stanford-tile-${i}.osm`), await response.text());
    }
  }
  const provenance = await buildData({ sourceDir, outputDir, fetchedAt });
  console.log(JSON.stringify({ featureCount: provenance.featureCount, heightSources: provenance.heightSources, outputs: provenance.outputs, invalidSourceFeatures: provenance.excludedInvalidSourceFeatures.length }, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
