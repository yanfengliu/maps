import type * as GeoJSON from 'geojson';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { HOOVER_PART_IDS, HOOVER_DESCRIPTION } from './hoover-architecture.ts';
import { garageProfile, describeGarage } from './garage-architecture.ts';
import { ENGINEERING_REFERENCES, UNVERIFIED_ACADEMIC_IDS } from './engineering-architecture.ts';
import { STADIUM_CONCOURSE_ID, STADIUM_PRESSBOX_IDS, STADIUM_SCOREBOARD_IDS, STADIUM_SEATING_IDS } from './stadium-architecture.ts';

export type ArchitectureProfile = 'memorial-church' | 'quad' | 'quad-wing' | 'library' | 'tower' | 'residential' | 'institutional' | 'modern' | 'garage' | 'service' | 'open';
export interface BuildingArchitecture {
  profile: ArchitectureProfile;
  /** Facade rows are a model parameter, never a surveyed window count. */
  floors: number | null;
  floorSource: 'osm-levels' | 'estimated' | 'not-applicable' | 'reference-profile' | 'official-description';
  mappedLevels: number | null;
  bayWidth: number;
  facadeFamily: 'generic' | 'unverified' | 'workshop' | 'concrete-frame' | 'sandstone' | 'aggregate';
  roofShape: string;
  roofSource: 'osm-roof-shape' | 'estimated' | 'reference-profile' | 'official-description';
}
const BRAUN_MUSIC_ID='relation/12460152';

/** Authored material families, informed by the inspected Stanford photographs. */
export function buildingMaterials(properties:GeoJSON.GeoJsonProperties,architecture:BuildingArchitecture):{wall:string;roof:string} {
  const p=properties??{},profile=architecture.profile;
  if(p.id===BRAUN_MUSIC_ID)return {wall:'#dfd4bc',roof:'#c8c5b8'};
  if(garageProfile(p)?.kind==='open-deck')return {wall:p.id==='way/232841898'?'#c7ba99':'#bfbdae',roof:'#80827a'};
  if(STADIUM_SEATING_IDS.has(String(p.id)))return {wall:'#aaa99b',roof:'#7a1320'};
  if(STADIUM_SCOREBOARD_IDS.has(String(p.id)))return {wall:'#252b2c',roof:'#252b2c'};
  if(STADIUM_PRESSBOX_IDS.has(String(p.id)))return {wall:'#dedaca',roof:'#e0decc'};
  if(p.id===STADIUM_CONCOURSE_ID)return {wall:'#c9c5af',roof:'#b9b9ac'};
  const reference=ENGINEERING_REFERENCES[String(p.id)];
  if(reference)return {wall:reference.wall,roof:reference.roof==='flat'?'#bdb9a9':'#a86b4c'};
  if(architecture.facadeFamily==='unverified')return {wall:'#c6c2b1',roof:'#c1c0b6'};
  const flat=architecture.roofShape==='flat'||architecture.roofShape==='skillion';
  const wall=p.id==='way/232805733'?'#c8aaa0':profile==='memorial-church'?'#d8c29e':profile==='quad'||profile==='quad-wing'?'#cdb58e':profile==='library'?'#d1bd98':profile==='tower'?'#e0cba2'
    :profile==='modern'?'#d9ddd4':profile==='garage'?'#c9c9b9':profile==='service'?'#d0cdc0':profile==='residential'?'#dfcfb7':'#dbccb1';
  const roof=p.id==='way/232805733'?'#c6bca9':flat?(profile==='modern'?'#c1cbc7':'#c9c8b9'):profile==='memorial-church'||profile==='quad'||profile==='quad-wing'||profile==='library'?'#b66e4e':'#b77d60';
  return {wall,roof};
}

/** Source tags determine the treatment; absent dimensions remain explicit estimates. */
export function buildingArchitecture(properties: GeoJSON.GeoJsonProperties, wallHeight: number): BuildingArchitecture {
  const p = properties ?? {};
  const type = String(p.building ?? 'yes');
  const name = String(p.name ?? '');
  const reference=ENGINEERING_REFERENCES[String(p.id)],unverified=UNVERIFIED_ACADEMIC_IDS.has(String(p.id));
  const profile: ArchitectureProfile = p.id === 'way/836474103' ? 'memorial-church'
    : p.id === 'relation/35820' ? 'quad'
    : QUAD_WING_IDS.has(String(p.id)) ? 'quad-wing'
    : p.id === 'way/232805680' ? 'library'
    : STADIUM_PRESSBOX_IDS.has(String(p.id)) ? 'modern'
    : STADIUM_SCOREBOARD_IDS.has(String(p.id)) || p.id===STADIUM_CONCOURSE_ID ? 'open'
    : HOOVER_PART_IDS.has(String(p.id)) || /tower/i.test(name) ? 'tower'
    : ['roof', 'steps', 'bridge', 'grandstand', 'stadium'].includes(type) ? 'open'
    : ['garage', 'parking'].includes(type) ? 'garage'
    : p.id === 'way/232805733' || ['dormitory', 'apartments', 'residential', 'house', 'detached'].includes(type) ? 'residential'
    : ['shed', 'barn', 'farm_auxiliary', 'greenhouse', 'service', 'industrial', 'data_center', 'toilets'].includes(type) ? 'service'
    : unverified ? 'institutional'
    : type === 'hospital' || reference?.family==='concrete-frame' || reference?.family==='aggregate' ? 'modern'
    : 'institutional';
  const tagged = p['osm:building:levels'];
  const numeric = tagged === undefined || tagged === '' ? NaN : Number(tagged);
  const mappedLevels = Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  const special = ['memorial-church', 'quad-wing', 'library', 'tower', 'open'].includes(profile);
  const minLevel = Math.max(0, Number(p['osm:building:min_level']) || 0);
  const available = Math.max(0, wallHeight - Number(p.base));
  const floorHeight = profile === 'residential' ? 3.25 : profile === 'modern' ? 4.1 : 4.2;
  const roble = p.id === 'way/232805733',braun=p.id===BRAUN_MUSIC_ID,garage=garageProfile(p);
  const floors = garage?.kind==='open-deck'?garage.levels:braun?2:reference ? reference.facadeBands : roble ? 3 : profile === 'quad' ? 1 : special ? null : mappedLevels !== null ? Math.max(0, mappedLevels - minLevel)
    : profile === 'garage' || profile === 'service' && available < 8 ? 1 : Math.max(1, Math.round(available / floorHeight));
  return { profile, floors, floorSource: garage?.kind==='open-deck'?garage.levelSource:braun?'official-description':reference ? 'reference-profile' : roble ? 'official-description' : profile === 'quad' ? 'reference-profile' : special ? 'not-applicable' : mappedLevels !== null ? 'osm-levels' : 'estimated', mappedLevels,
    bayWidth: reference?.bayWidth ?? (profile === 'residential' ? 3.1 : profile === 'modern' ? 2.7 : profile === 'garage' ? 5.4 : profile === 'service' ? 5.8 : 4.2),
    facadeFamily:reference?.family??(unverified?'unverified':'generic'),
    roofShape: String(p['osm:roof:shape'] ?? (braun?'flat':undefined) ?? reference?.roof ?? (profile === 'memorial-church' ? 'compound' : roble||unverified ? 'flat' : profile === 'residential' ? 'gabled' : ['modern','service','garage','open','tower'].includes(profile) ? 'flat' : 'hipped')),
    roofSource: p['osm:roof:shape'] !== undefined ? 'osm-roof-shape' : braun?'official-description':reference ? 'reference-profile' : 'estimated' };
}

export function describeBuildingArchitecture(properties: GeoJSON.GeoJsonProperties): string {
  const p = properties ?? {};
  if(HOOVER_PART_IDS.has(String(p.id)))return HOOVER_DESCRIPTION;
  const garage=describeGarage(p);if(garage)return garage;
  if(p.id===BRAUN_MUSIC_ID)return 'Stanford describes first and second floors and a flat photovoltaic roof at Braun Music Center. The model retains its courtyard openings and narrow tiled perimeter; panel layout, roof edging, window spacing and unsurveyed dimensions are estimates.';
  const detail = p.detailArchitecture as BuildingArchitecture | undefined;
  if (!detail || typeof detail !== 'object') return 'Architectural details are modeled; exact window counts have not been surveyed.';
  const reference=ENGINEERING_REFERENCES[String(p.id)];
  if(reference)return `${reference.name}: ${reference.observed} ${reference.estimated} Facade bands describe the exterior composition, not a surveyed floor count.`;
  if(detail.facadeFamily==='unverified')return 'This building has not yet been checked against architectural photographs. Its opaque facade and flat roof are conservative model estimates; its academic name does not establish a glass exterior. The mapped footprint and source height are retained.';
  if (detail.profile === 'memorial-church') return 'Memorial Church has a modeled Romanesque exterior with three entrance arches, its current central arched window, flanking triplets, mosaic facade and crossing skylight. Side window spacing and proportions are modeled; the 24 m source height is estimated.';
  if (detail.profile === 'quad') return 'OSM tags list 5 levels for the Main Quad complex. This authored low arcade model uses one arcade band, eaves around 6.2 m and roofs around 9.5 m. These proportions are not a floor survey; window spacing is modeled.';
  if (detail.profile === 'quad-wing') return `${String(p.name)} uses its own mapped footprint, with modeled sandstone arches, grouped glazing, transoms and stone trim informed by Main Quad photographs. The source height is a 12 m estimate; exterior window bands are not a surveyed floor count. Bay spacing and unphotographed elevations are estimates.`;
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
