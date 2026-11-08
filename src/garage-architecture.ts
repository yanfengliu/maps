import type * as GeoJSON from 'geojson';

export interface GarageProfile {
  kind:'open-deck'|'screened'|'access'|'small';
  levels:number;
  levelSource:'official-description'|'osm-levels'|'estimated';
  reference?:string;
}
/** Exact reviewed structures. Floor counts are above-ground parking levels,
 * including the ground and open roof, never basement levels. */
export const OPEN_GARAGE_IDS=new Set(['way/26249768','way/232841895','way/232841898','way/324983017']);
export const SCREENED_GARAGE_ID='way/891732465';
export const GARAGE_ACCESS_IDS=new Set(['way/663770749','way/663770753']);
const profiles:Record<string,GarageProfile>={
  'way/232841898':{kind:'open-deck',levels:4,levelSource:'official-description',reference:'https://chemistry.stanford.edu/about/maps-location-parking'},
  'way/26249768':{kind:'open-deck',levels:4,levelSource:'official-description',reference:'https://files.stanfordmedicinetransportation.org/production/New-Staff/NEOPacket_SHC_Comp26.1-Compressed.pdf'},
  'way/232841895':{kind:'open-deck',levels:5,levelSource:'osm-levels',reference:'https://api.openstreetmap.org/api/0.6/way/232841895/7.json'},
  'way/324983017':{kind:'open-deck',levels:6,levelSource:'official-description',reference:'https://files.stanfordmedicinetransportation.org/production/Transportation-Service-Code_v21_7.31.2024.pdf'},
  // Pasteur has a rooftop garden and mixed levels. Its above-ground count is
  // not established here, so neither extra floors nor parking stalls are added.
  'way/891732465':{kind:'screened',levels:1,levelSource:'estimated',reference:'https://files.stanfordmedicinetransportation.org/production/Maps-Resources/Executive-Guest-Parking.pdf'},
};
export function garageProfile(properties:GeoJSON.GeoJsonProperties):GarageProfile|undefined{
  const p=properties??{},id=String(p.id);
  if(profiles[id])return {...profiles[id]};
  if(GARAGE_ACCESS_IDS.has(id))return {kind:'access',levels:1,levelSource:p['osm:building:levels']!==undefined?'osm-levels':'estimated'};
  if(['garage','garages','parking'].includes(String(p.building)))return {kind:'small',levels:Math.max(1,Number(p['osm:building:levels'])||1),levelSource:p['osm:building:levels']!==undefined?'osm-levels':'estimated'};
  return undefined;
}
/** Narrow render correction for known estimated envelopes only. A parking
 * level is a deck: four levels have three rises plus the upper guard rail.
 * Three-metre rises and a one-metre parapet are authored, not measured. */
export function referenceGarageHeight(properties:GeoJSON.GeoJsonProperties):number|undefined{
  const p=properties??{},profile=profiles[String(p.id)];
  if(!profile||profile.kind!=='open-deck'||profile.levelSource!=='official-description'||p.heightSource!=='estimated'||p['osm:height']!==undefined)return undefined;
  return Number(p.base||0)+(profile.levels-1)*3+1;
}
export function describeGarage(properties:GeoJSON.GeoJsonProperties):string|undefined{
  const p=properties??{},profile=garageProfile(p);if(!profile)return undefined;
  if(profile.kind==='open-deck')return `${profile.levelSource==='osm-levels'?'OSM records':'Stanford describes'} ${profile.levels} above-ground parking levels, including the open rooftop. The model has open decks, columns and rooftop parking markings. ${referenceGarageHeight(p)!==undefined?'Render height is estimated from 3 m deck spacing and a 1 m parapet; the original source height remains unchanged.':'The source height is retained.'} Column spacing and parking markings are modeled estimates; internal ramps have not been surveyed.`;
  if(profile.kind==='screened')return 'Pasteur Staff Garage has mixed above- and below-ground levels and a rooftop garden. This conservative model retains the source height and uses a screened facade without rooftop parking stalls; exact garden and level geometry remain unverified.';
  if(profile.kind==='access')return 'This small mapped structure is beside the underground Wilbur Field Garage. It is treated as an access structure, not as the garage’s full underground footprint; its source height is retained.';
  return 'This small garage retains its mapped footprint and source height. Door location and exterior materials have not been verified.';
}
