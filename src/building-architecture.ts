import {CLARK_STAGE,LASUEN_RESTROOM,BURNHAM_ENTRANCE} from './courtyard-and-pavilion.ts';
import {BASEBALL_FRONT} from './baseball-seating.ts';
import {FARM_FORMS} from './farm-exteriors.ts';
import {TILED_EDGE_WIDTH} from './tiled-perimeter.ts';
import {CIVIC_FACADE_PHOTOS} from './civic-facades.ts';
import {civicAppearance} from './civic-appearance.ts';
import {HOUSING_APPEARANCE} from './housing-appearance.ts';
import {photographedRoof} from './photographed-roofs.ts';
import type * as GeoJSON from 'geojson';
import {GREEN_EAST_ID, GREEN_EAST_DESCRIPTION} from './green-east-architecture.ts';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { PASTEUR_300_ID } from './pasteur-pods.ts';
import { HOSPITAL_EXTERIORS } from './hospital-exteriors.ts';
import { HOOVER_PART_IDS, HOOVER_DESCRIPTION } from './hoover-architecture.ts';
import { garageProfile, describeGarage } from './garage-architecture.ts';
import { ENGINEERING_REFERENCES, UNVERIFIED_ACADEMIC_IDS, LEGACY_ACADEMIC_FLATS } from './engineering-architecture.ts';
import { STADIUM_CONCOURSE_ID, STADIUM_PRESSBOX_IDS, STADIUM_SCOREBOARD_IDS, STADIUM_SEATING_IDS } from './stadium-architecture.ts';

export type ArchitectureProfile = 'memorial-church' | 'quad' | 'quad-wing' | 'library' | 'tower' | 'residential' | 'institutional' | 'modern' | 'garage' | 'service' | 'open';
export interface BuildingArchitecture {
  profile: ArchitectureProfile;
  /** Facade rows are a model parameter, never a surveyed window count. */
  floors: number | null;
  floorSource: 'osm-levels' | 'estimated' | 'not-applicable' | 'reference-profile' | 'official-description';
  mappedLevels: number | null;
  bayWidth: number;
  facadeFamily: 'generic' | 'unverified' | 'workshop' | 'concrete-frame' | 'sandstone' | 'aggregate' | 'precast-ribbon';
  roofShape: string;
  roofSource: 'osm-roof-shape' | 'estimated' | 'reference-profile' | 'official-description';
}
// 2025 Santa Clara County orthophotos show pale decks around the medical courts and nine other mapped buildings.
const AERIAL_DECKS = new Set(['relation/4720978','relation/4721017','relation/4721018','relation/4721019', 'relation/4721020',
  'way/30754822','way/109151789','way/232715633','way/232715634','way/232715635','way/232715636','way/232715637','way/232715638','way/232715639']);
const BRAUN_MUSIC_ID='relation/12460152';

/** Authored material families, informed by the inspected Stanford photographs. */
function defaultBuildingMaterials(properties:GeoJSON.GeoJsonProperties,architecture:BuildingArchitecture):{wall:string;roof:string} {
  const p=properties??{},profile=architecture.profile;
  if(p.id===GREEN_EAST_ID)return {wall:'#c7bdb0',roof:'#ae7259'};
  if(p.id===PASTEUR_300_ID)return {wall:'#ccc9bf',roof:'#c1bfb2'};
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

export function buildingMaterials(properties: GeoJSON.GeoJsonProperties, architecture: BuildingArchitecture) {
  if(properties?.id===CLARK_STAGE)return {wall:'#9e9686',roof:'#c5bba6'};
  if(properties?.id===LASUEN_RESTROOM)return {wall:'#c0b299',roof:'#635f55'};
  if(properties?.id===BURNHAM_ENTRANCE)return {wall:'#c8af88',roof:'#aa7158'};
  if (BASEBALL_FRONT[String(properties?.id)]) return {wall:'#aba99c',roof:'#6b383b'};
  const farm = FARM_FORMS[String(properties?.id)];
  if (farm==='glasshouse') return {wall:'#bdc4ba',roof:'#d4d6c7'};
  if (farm==='barn'||farm==='shade') return {wall:farm==='barn'?'#674d38':'#b07b4d',roof:'#babdb0'};
  if (farm==='canopy'||farm==='array') return {wall:'#57544f',roof:farm==='array'?'#4d5c66':'#8c8a80'};
  const civic = civicAppearance(properties?.id);
  if (civic) return {wall:civic.wall,roof:civic.roofColor};
  const base = defaultBuildingMaterials(properties, architecture);
  const id = String(properties?.id), housing = HOUSING_APPEARANCE[id];
  return {wall:CIVIC_FACADE_PHOTOS[id]?.wall ?? housing?.wall ?? base.wall, roof:housing?.roof ?? photographedRoof(id)?.roof ?? base.roof};
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
  if(p.id===GREEN_EAST_ID)return {profile:'institutional', floors:3, floorSource:'official-description', mappedLevels,
    bayWidth:6.2, facadeFamily:'precast-ribbon', roofShape:'hipped', roofSource:'reference-profile'};
  const special = ['memorial-church', 'quad-wing', 'library', 'tower', 'open'].includes(profile);
  const minLevel = Math.max(0, Number(p['osm:building:min_level']) || 0);
  const available = Math.max(0, wallHeight - Number(p.base));
  const floorHeight = profile === 'residential' ? 3.25 : profile === 'modern' ? 4.1 : 4.2;
  const roble = p.id === 'way/232805733',braun=p.id===BRAUN_MUSIC_ID,garage=garageProfile(p);
  const aerialDeck = AERIAL_DECKS.has(String(p.id));
  const farm=FARM_FORMS[String(p.id)];
  const siteShape=p.id===CLARK_STAGE||p.id===LASUEN_RESTROOM?'flat':p.id===BURNHAM_ENTRANCE?'gabled':undefined;
  const photoShape = siteShape ?? (farm?(farm==='canopy'||farm==='array'?'flat':'gabled'):undefined) ?? (TILED_EDGE_WIDTH[String(p.id)]?'hipped':undefined) ?? civicAppearance(p.id)?.roofShape ?? HOUSING_APPEARANCE[String(p.id)]?.roofShape ?? photographedRoof(String(p.id))?.roofShape;
  const floors = garage?.kind==='open-deck'?garage.levels:braun?2:reference ? reference.facadeBands : roble ? 3 : profile === 'quad' ? 1 : special ? null : mappedLevels !== null ? Math.max(0, mappedLevels - minLevel)
    : profile === 'garage' || profile === 'service' && available < 8 ? 1 : Math.max(1, Math.round(available / floorHeight));
  return { profile, floors, floorSource: garage?.kind==='open-deck'?garage.levelSource:braun?'official-description':reference ? 'reference-profile' : roble ? 'official-description' : profile === 'quad' ? 'reference-profile' : special ? 'not-applicable' : mappedLevels !== null ? 'osm-levels' : 'estimated', mappedLevels,
    bayWidth: reference?.bayWidth ?? (profile === 'residential' ? 3.1 : profile === 'modern' ? 2.7 : profile === 'garage' ? 5.4 : profile === 'service' ? 5.8 : 4.2),
    facadeFamily:reference?.family??(unverified?'unverified':'generic'),
    roofShape: String(p['osm:roof:shape'] ?? photoShape ?? (braun||aerialDeck?'flat':undefined) ?? reference?.roof ?? (profile === 'memorial-church' ? 'compound' : roble||LEGACY_ACADEMIC_FLATS.has(String(p.id)) ? 'flat' : profile === 'residential' ? 'gabled' : ['modern','service','garage','open','tower'].includes(profile) ? 'flat' : 'hipped')),
    roofSource: p['osm:roof:shape'] !== undefined ? 'osm-roof-shape' : braun?'official-description':reference||aerialDeck||photoShape ? 'reference-profile' : 'estimated' };
}

export function describeBuildingArchitecture(properties: GeoJSON.GeoJsonProperties): string {
  const p = properties ?? {};
  if(p.id===CLARK_STAGE)return 'The round auditorium is underground. Its courtyard stage and perimeter skylight are the visible exterior. The stage height is estimated.';
  if(p.id===LASUEN_RESTROOM)return 'The facility photograph shows pale masonry with timber above and a shallow roof. Canopy projections and openings remain approximate.';
  if(p.id===BURNHAM_ENTRANCE)return 'The source covers the projecting entrance of Burnham Pavilion. Its buff masonry and tiled gable follow the facility photograph.';
  if(BASEBALL_FRONT[String(p.id)])return 'At Klein Field the seating terraces face the baseball diamond. The section retains its mapped height and rise. Row count, aisle spacing and seat finish are approximate.';
  const farm = FARM_FORMS[String(p.id)];
  if(farm) {
    const treatment = {glasshouse:'a pale, framed greenhouse with a pitched roof',barn:'a timber barn with a drive-side opening',shade:'an open gabled shade structure with timber slats',canopy:'a thin canopy standing on two posts',array:'a grid of dark panels on open supports'}[farm];
    return 'The model shows '+treatment+'. The support spacing, roof pitch and heights are estimates.';
  }
  const civic = civicAppearance(p.id);
  if(TILED_EDGE_WIDTH[String(p.id)])return 'The aerial photographs show a tiled perimeter around a pale, low-slope central deck. The width and pitch are modeled estimates. '+(civic?.description ?? CIVIC_FACADE_PHOTOS[String(p.id)]?.observed ?? 'The remaining elevations are approximate.');
  if(civic)return civic.description;
  const photo=CIVIC_FACADE_PHOTOS[String(p.id)];
  if(photo)return photo.observed+' The modeled wall finish follows the visible elevation. Unseen elevations and dimensions remain estimated.';
  if(HOOVER_PART_IDS.has(String(p.id)))return HOOVER_DESCRIPTION;
  if(p.id===GREEN_EAST_ID)return GREEN_EAST_DESCRIPTION;
  if(p.id===PASTEUR_300_ID)return 'The mapped 300 Pasteur footprint is tagged 10 m. Palo Alto records the three existing west pods at up to 77.5 ft (23.6 m). Their roof outlines follow 2025 county imagery. The intermediate levels, relative screen heights and facade spacing are estimates.';
  const hospital=HOSPITAL_EXTERIORS[String(p.id)];
  if(hospital)return hospital.description;
  const garage=describeGarage(p);if(garage)return garage;
  if(p.id===BRAUN_MUSIC_ID)return 'Stanford describes first and second floors and a flat photovoltaic roof at Braun Music Center. The model retains its courtyard openings and narrow tiled perimeter; panel layout, roof edging, window spacing and unsurveyed dimensions are estimates.';
  const detail = p.detailArchitecture as BuildingArchitecture | undefined;
  if (!detail || typeof detail !== 'object') return 'Architectural details are modeled; exact window counts have not been surveyed.';
  const reference=ENGINEERING_REFERENCES[String(p.id)];
  if(reference)return `${reference.name}: ${reference.observed} ${reference.estimated} Facade bands describe the exterior composition, not a surveyed floor count.`;
  if(HOUSING_APPEARANCE[String(p.id)] || photographedRoof(String(p.id))) {
    const roof = detail.roofSource==='osm-roof-shape' ? 'The mapped roof shape is retained.' : detail.roofSource==='reference-profile' ? 'The roof profile follows the visible form in reference photographs.' : 'Roof pitch and profile remain estimates.';
    return roof+' '+(HOUSING_APPEARANCE[String(p.id)]?'Exterior finishes follow identifiable Stanford housing photographs.':detail.facadeFamily==='unverified'?'The visible roof color follows aerial photographs. The facade has not yet been checked against an identifiable exterior photograph.':'The visible roof color follows aerial photographs.')+' Heights, window spacing and concealed elevations retain their source or modeled values.';
  }
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
  if(AERIAL_DECKS.has(String(p.id)) && detail.roofSource==='reference-profile')return `${floors} The light, low-slope roof follows the 2025 county aerial photograph. Individual rooftop equipment and parapet heights have not been surveyed.`;
  const roof = detail.roofSource === 'osm-roof-shape' ? `The ${detail.roofShape} roof follows an OSM shape tag.` : `The ${detail.roofShape} roof is a modeled estimate.`;
  return `${floors} ${roof} Window spacing is modeled; exact counts have not been surveyed.`;
}
