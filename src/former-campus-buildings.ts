import {FORMER_SPORTS_SITES} from './supplemental-architecture.ts';
import {NORTHWEST_QUAD_HALLS,FORMER_LOU_HENRY_ID} from './civic-history.ts';

// The pinned source retains these footprints. Their buildings are absent from
// later photography or dated project records and the 2026 visitor plan.
export const FORMER_CAMPUS_BUILDINGS: Readonly<Record<string,string>> = {
  'way/232715610':'bonair', // Maintenance Shops (09-100)
  'way/232715611':'bonair', // LBRE Office (09-105)
  'way/232715612':'bonair', // Warehouse, Maps & Records Offices (09-110)
  'way/232715700':'bonair', // Steamfitters Shop (09-130)
  'way/232715703':'bonair', // IT Offices (09-190)
  'way/232715807':'bonair', // Maintenance Shops (09-140)
  'way/232715838':'bonair', // Carpenters Shop (09-135)
  'way/232715851':'bonair', // Storage Shed (09-150)
  'way/232841876':'modulars', // Acacia
  'way/232841877':'modulars', // Birch
  'way/232841916':'modulars', // Juniper
  'way/232841917':'modulars', // Laurel
  'way/232841923':'modulars', // Oak
  'way/232841928':'modulars', // Poplar
  'way/232805674':'bambi', // Bambi
  'way/232841922':'mudd', // Mudd Hall
};

export function currentBuilding(feature: {properties: { [name:string]:unknown } | null}) {
  const id=String(feature.properties?.id);
  return !FORMER_SPORTS_SITES.has(id)&&id!=='way/1169967277'&&!Object.hasOwn(FORMER_CAMPUS_BUILDINGS,id)&&!Object.hasOwn(NORTHWEST_QUAD_HALLS,id)&&id!==FORMER_LOU_HENRY_ID;
}
