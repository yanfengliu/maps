import {readFileSync} from 'node:fs';

const ledger = readFileSync(new URL('./roof-observations.tsv', import.meta.url), 'utf8');
const source = JSON.parse(readFileSync(new URL('../../public/data/stanford-buildings.geojson', import.meta.url), 'utf8'));
const parts = new Map(source.features.map(feature => [feature.properties.id, feature]));

const observations = {
  'warm-surface': 'The visible upper surface is warm brown. The ridge or eave arrangement is indistinct.',
  'warm-pitched': 'Light and shadow divide warm-colored pitched roof planes.',
  'light-deck': 'The visible roof is a pale, low-slope deck with a continuous upper surface.',
  'light-surface': 'A light roof surface is visible. Its slope and detailed profile cannot be resolved.',
  'mixed-fields': 'The footprint includes distinct roof fields, visible as breaks in tone, ridges, decks, or equipment. One uniform surface simplifies this footprint.',
  'neutral-pitched': 'The pitched surfaces are gray or neutral in the aerial views.',
  'neutral-gable': 'A longitudinal ridge separates two light and dark neutral roof planes.',
  'warm-hip': 'Warm roof planes slope down toward both the end and side edges.',
  'neutral-deck': 'The roof has a continuous low-slope, neutral-colored upper surface.',
  'panel-rows': 'Regular dark rectangular panels cover the long canopy in each acquisition.',
  'seating': 'The outline lies within the baseball seating area. Parallel seating rows are visible across the surrounding sections.',
  'field-perimeter': 'The long curved footprint follows the outer edge of the baseball infield seating.',
  'indistinct': 'Vegetation, shadow, image resolution or overlapping forms prevent an independent architectural reading.',
  'changed-site': 'The site or roof surface differs between acquisitions. The two photographs do not establish a durable profile for this footprint.',
  'underlying-part': 'The small mapped component projects beneath a larger visible roof. Neither overhead view exposes it independently.',
};
const inconclusive = new Set(['indistinct', 'changed-site', 'underlying-part']);

// Keep both exports square in the same projected frame, with space for context.
function photos(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const coords = polygons.flat(2);
  const radians = Math.PI / 180, radius = 6378137;
  const xs = coords.map(([lon]) => radius * lon * radians);
  const ys = coords.map(([,lat]) => radius * Math.log(Math.tan(Math.PI / 4 + lat * radians / 2)));
  const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
  const half = Math.max(16, right-left, top-bottom) * 0.64, x = (left+right)/2, y = (top+bottom)/2;
  const bbox = [x-half,y-half,x+half,y+half].map(v => v.toFixed(2)).join(',');
  const params = new URLSearchParams({bbox, bboxSR:'3857',imageSR:'3857',size:'512,512',format:'jpg',f:'image'});
  return [
    {kind:'photo',date:'2022 USDA NAIP',url:'https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2022/ImageServer/exportImage?'+params},
    {kind:'photo',date:'2025 county imagery',url:'https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer/export?'+params},
  ];
}

export const ROOF_PHOTO_CHECKS = new Map();
for (const line of ledger.trim().split(/\r?\n/).slice(1)) {
  const [id, observation] = line.split('\t');
  if (!parts.has(id) || ROOF_PHOTO_CHECKS.has(id) || !Object.hasOwn(observations,observation)) throw Error('Invalid roof photograph record: '+line);
  const feature = parts.get(id);
  ROOF_PHOTO_CHECKS.set(id,{observation, finding:observations[observation], sources:photos(feature.geometry)});
}
export const ROOF_PHOTO_REFERENCES = [...ROOF_PHOTO_CHECKS].filter(([,entry]) => !inconclusive.has(entry.observation)).map(([id,entry]) => ({
  key:'roof-photo-'+id.replace('/','-'),ids:[id],title:parts.get(id).properties.name || id,
  status:'photo-supported',reviewedAt:'2026-11-21',reviewBasis:'Compared registered aerial photographs from two acquisitions and the corresponding isolated baseline roof mesh.',
  observed:entry.finding, limitations:'Overhead observations cover visible surfaces. Wall materials, elevations, exact roof pitch and hidden parts need independent evidence.',
  sources:entry.sources,
}));
