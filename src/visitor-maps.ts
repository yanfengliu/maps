/** Building IDs distinguish the two OSM features both named Stanford Hospital. */
export const CANTOR_ID = 'relation/12236339';
export const CANTOR_PLAN_URL = 'https://museum.stanford.edu/sites/default/files/inline-files/Cantor_map_for_website_12-18-24-A.pdf';

interface VisitorMap { address: string; url: string }

const adultMaps = 'https://stanfordhealthcare.org/content/dam/SHC/patientsandvisitors/locations-parking/docs/';
const packardMap = 'https://www.stanfordchildrens.org/content/dam/sch/content-public/pdf/wayfinding-maps-stanford-childrens.pdf';
const visitorMaps = new Map<string, VisitorMap>([
  ['relation/1753562', { address: '300 Pasteur Drive', url: adultMaps + 'stanford-hospital-map.pdf' }],
  ['way/891732466', { address: '500 Pasteur Drive', url: adultMaps + '500-Pasteur-11-15-19.pdf' }],
  ['way/689417360', { address: '725 Welch Road', url: packardMap }],
  ['way/130100416', { address: '725 Welch Road', url: packardMap }]
]);

export function hospitalVisitorMap(id: string): VisitorMap | undefined {
  return visitorMaps.get(id);
}
