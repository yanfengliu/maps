export type Position = [number, number];
export interface Place {
  id: string;
  name: string;
  subtitle: string;
  center: Position;
  zoom: number;
  campus?: boolean;
  buildingId?: string;
  sculptureId?: string;
}

export interface SculpturePlace extends Place { sculptureId:string;artist:string;material:string;sourceUrl:string;description:string }
// This small search index is consistency-checked against the pinned GeoJSON.
// Indexing two artworks adds no regional request or renderer work.
export const SCULPTURE_PLACES:SculpturePlace[]=[
  {id:'sculpture-burghers-of-calais',sculptureId:'burghers-of-calais',name:'The Burghers of Calais',subtitle:'Sculpture · Auguste Rodin · Stanford',center:[-122.1699656,37.4280031],zoom:21.1,campus:true,artist:'Auguste Rodin',material:'Bronze',sourceUrl:'https://news.stanford.edu/stories/2017/08/stanfords-cantor-arts-center-offers-fresh-look-rodin',description:'Six bronze figures stand on separate low plinths in Memorial Court, each with a different stance and gesture.'},
  {id:'sculpture-angel-of-grief',sculptureId:'angel-of-grief',name:'Angel of Grief',subtitle:'Sculpture · Stanford Arboretum',center:[-122.1688001,37.4373687],zoom:21.1,campus:true,artist:'After William Wetmore Story',material:'Marble',sourceUrl:'https://news.stanford.edu/stories/2015/08/vandalism-angel-grief-081415',description:'A bowed, winged figure leans over a flared funeral altar. Jane Stanford commissioned the memorial for her brother, Henry Clay Lathrop.'}
];

export const STANFORD_CENTER: Position = [-122.1697, 37.4278];
export const BAY_BOUNDS: [Position, Position] = [[-122.67, 37.20], [-121.69, 38.08]];
export const PLACES: Place[] = [
  { id: 'stanford', name: 'Stanford University', subtitle: 'Campus · Stanford', center: STANFORD_CENTER, zoom: 15.8, campus: true },
  { id: 'san-francisco', name: 'San Francisco', subtitle: 'City · Northern peninsula', center: [-122.4194, 37.7749], zoom: 12.1 },
  { id: 'oakland', name: 'Oakland', subtitle: 'City · East Bay', center: [-122.2711, 37.8044], zoom: 12.1 },
  { id: 'san-jose', name: 'San José', subtitle: 'City · South Bay', center: [-121.8863, 37.3387], zoom: 12 },
  { id: 'palo-alto', name: 'Palo Alto', subtitle: 'City · Peninsula', center: [-122.143, 37.4419], zoom: 13.6 },
  { id: 'berkeley', name: 'Berkeley', subtitle: 'City · East Bay', center: [-122.2727, 37.8716], zoom: 12.7 },
  { id: 'golden-gate', name: 'Golden Gate Bridge', subtitle: 'Landmark · San Francisco', center: [-122.4783, 37.8199], zoom: 13.4 },
  { id: 'redwood-city', name: 'Redwood City', subtitle: 'City · Peninsula', center: [-122.2364, 37.4852], zoom: 13 },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Search remains local: Bay destinations, two reviewed artworks and supplied campus footprints. */
export function searchPlaces(query: string, places: readonly Place[]): Place[] {
  const term = normalize(query);
  if (!term) return [];
  const words = term.split(/\s+/);
  return places
    .filter(place => words.every(word => normalize(`${place.name} ${place.subtitle}`).includes(word)))
    .sort((a, b) => Number(normalize(b.name).startsWith(term)) - Number(normalize(a.name).startsWith(term)) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

/** Bounds midpoint is stable for campus-scale footprints, including multipolygons. */
export function geometryCenter(geometry: { type: string; coordinates: unknown }): Position | null {
  const pairs: Position[] = [];
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      if (Number.isFinite(value[0]) && Number.isFinite(value[1])) pairs.push([value[0], value[1]]);
    } else value.forEach(visit);
  };
  visit(geometry.coordinates);
  if (!pairs.length) return null;
  return [(Math.min(...pairs.map(p => p[0])) + Math.max(...pairs.map(p => p[0]))) / 2,
    (Math.min(...pairs.map(p => p[1])) + Math.max(...pairs.map(p => p[1]))) / 2];
}

export function buildingPlaces(features: readonly { properties: Record<string, unknown> | null; geometry: { type: string; coordinates: unknown } }[]): Place[] {
  return features.flatMap(feature => {
    const name = feature.properties?.name;
    const id = feature.properties?.id;
    const center = geometryCenter(feature.geometry);
    return typeof name === 'string' && name.trim() && typeof id === 'string' && center
      ? [{ id: `building-${id}`, name, subtitle: 'Building · Stanford University', center, zoom: 18, campus: true, buildingId: id }]
      : [];
  });
}

export function normalizeBearing(value: number): number {
  return ((value % 360) + 540) % 360 - 180;
}
