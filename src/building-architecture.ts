import type * as GeoJSON from 'geojson';

export type ArchitectureProfile = 'memorial-church' | 'quad' | 'library' | 'tower' | 'residential' | 'institutional' | 'modern' | 'garage' | 'service' | 'open';
export interface BuildingArchitecture {
  profile: ArchitectureProfile;
  /** Facade rows are a model parameter, never a surveyed window count. */
  floors: number | null;
  floorSource: 'osm-levels' | 'estimated' | 'not-applicable' | 'reference-profile' | 'official-description';
  mappedLevels: number | null;
  bayWidth: number;
  roofShape: string;
  roofSource: 'osm-roof-shape' | 'estimated';
}
const hooverParts = new Set(['way/1346548884','way/1346548885','way/1346548886','way/1346548887','way/1346548888','way/1346548889','way/1346548890','way/1346548891']);

/** Source tags determine the treatment; absent dimensions remain explicit estimates. */
export function buildingArchitecture(properties: GeoJSON.GeoJsonProperties, wallHeight: number): BuildingArchitecture {
  const p = properties ?? {};
  const type = String(p.building ?? 'yes');
  const name = String(p.name ?? '');
  const profile: ArchitectureProfile = p.id === 'way/836474103' ? 'memorial-church'
    : p.id === 'relation/35820' ? 'quad'
    : p.id === 'way/232805680' ? 'library'
    : hooverParts.has(String(p.id)) || /tower/i.test(name) ? 'tower'
    : ['roof', 'steps', 'bridge', 'grandstand', 'stadium'].includes(type) ? 'open'
    : ['garage', 'parking'].includes(type) ? 'garage'
    : p.id === 'way/232805733' || ['dormitory', 'apartments', 'residential', 'house', 'detached'].includes(type) ? 'residential'
    : ['shed', 'barn', 'farm_auxiliary', 'greenhouse', 'service', 'industrial', 'data_center', 'toilets'].includes(type) ? 'service'
    : type === 'hospital' || /laborator|medical|engineering|science|research/i.test(name) ? 'modern'
    : 'institutional';
  const tagged = p['osm:building:levels'];
  const numeric = tagged === undefined || tagged === '' ? NaN : Number(tagged);
  const mappedLevels = Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  const special = ['memorial-church', 'library', 'tower', 'open'].includes(profile);
  const minLevel = Math.max(0, Number(p['osm:building:min_level']) || 0);
  const available = Math.max(0, wallHeight - Number(p.base));
  const floorHeight = profile === 'residential' ? 3.25 : profile === 'modern' ? 4.1 : 4.2;
  const roble = p.id === 'way/232805733';
  const floors = roble ? 3 : profile === 'quad' ? 1 : special ? null : mappedLevels !== null ? Math.max(0, mappedLevels - minLevel)
    : profile === 'garage' || profile === 'service' && available < 8 ? 1 : Math.max(1, Math.round(available / floorHeight));
  return { profile, floors, floorSource: roble ? 'official-description' : profile === 'quad' ? 'reference-profile' : special ? 'not-applicable' : mappedLevels !== null ? 'osm-levels' : 'estimated', mappedLevels,
    bayWidth: profile === 'residential' ? 3.1 : profile === 'modern' ? 2.7 : profile === 'garage' ? 5.4 : profile === 'service' ? 5.8 : 4.2,
    roofShape: String(p['osm:roof:shape'] ?? (profile === 'memorial-church' ? 'compound' : roble ? 'flat' : profile === 'residential' ? 'gabled' : ['modern','service','garage','open','tower'].includes(profile) ? 'flat' : 'hipped')),
    roofSource: p['osm:roof:shape'] === undefined ? 'estimated' : 'osm-roof-shape' };
}

export function describeBuildingArchitecture(properties: GeoJSON.GeoJsonProperties): string {
  const p = properties ?? {};
  const detail = p.detailArchitecture as BuildingArchitecture | undefined;
  if (!detail || typeof detail !== 'object') return 'Architectural details are modeled; exact window counts have not been surveyed.';
  if (detail.profile === 'memorial-church') return 'Memorial Church has a modeled Romanesque exterior with three entrance arches, its current central arched window, flanking triplets, mosaic facade and crossing skylight. Side window spacing and proportions are modeled; the 24 m source height is estimated.';
  if (detail.profile === 'quad') return 'OSM tags list 5 levels for the Main Quad complex. This authored low arcade model uses one arcade band, eaves around 6.2 m and roofs around 9.5 m. These proportions are not a floor survey; window spacing is modeled.';
  if (detail.profile === 'library') return 'Bing Wing has three tall arched bays on its west facade and an upper band of small openings, based on Stanford reference photos. Other elevations and window spacing are modeled; the 12 m source height is estimated.';
  if (detail.floorSource === 'official-description') return 'Stanford housing describes Roble Hall as three stories. The model uses three facade rows and a restrained cornice roof. Window spacing and roof proportions are modeled; the 10 m source height is estimated.';
  if (p.id === 'way/1346548889') return 'Stanford places the carillon and observation deck on the 14th floor. OSM tags list 15 levels on this modeled part; this is not a floor survey. The model follows the sparse shaft and stepped crown, with modeled window spacing.';
  if (detail.floorSource === 'not-applicable') return `${detail.mappedLevels !== null ? `OSM records ${detail.mappedLevels} levels for this building part. ` : ''}This structure uses a separate architectural treatment. Window placement is modeled; exact counts have not been surveyed.`;
  const floors = detail.floorSource === 'osm-levels'
    ? `OSM records ${detail.mappedLevels} ${detail.mappedLevels === 1 ? 'level' : 'levels'}.`
    : `The facade models approximately ${detail.floors} ${detail.floors === 1 ? 'floor' : 'floors'} from the available height; the source has no floor count.`;
  const roof = detail.roofSource === 'osm-roof-shape' ? `The ${detail.roofShape} roof follows an OSM shape tag.` : `The ${detail.roofShape} roof is a modeled estimate.`;
  return `${floors} ${roof} Window spacing is modeled; exact counts have not been surveyed.`;
}
