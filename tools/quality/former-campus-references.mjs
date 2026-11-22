import {FORMER_CAMPUS_BUILDINGS} from '../../src/former-campus-buildings.ts';
import {ROOF_PHOTO_CHECKS} from './roof-photo-register.mjs';
const sources = {
  bonair:['https://stgenpln.blob.core.windows.net/document/PLN20_081_Description.pdf','2020 campus replacement plan','Stanford proposed clearing the former Bonair Siding shops after moving operations.'],
  modulars:['https://stgenpln.blob.core.windows.net/document/PLN17_11171_Plans_Civil.pdf','2017 campus project plans','The historic site plan identifies the group of temporary buildings.'],
  bambi:['https://redwoodcity.stanford.edu/news/new-srwc-touchdown-space','2023-11','Stanford announced the closure of the 320 Panama modular for demolition.'],
  mudd:['https://sustainable.stanford.edu/2022/09/01/deconstructing-mudd-chemistry/','2022-09-01','Stanford reported that it had deconstructed Seeley G. Mudd Chemistry.'],
};
export const FORMER_REFERENCES=Object.entries(FORMER_CAMPUS_BUILDINGS).map(([id,group])=>{
  const [url,date,note]=sources[group];
  return {ids:[id],key:'former-'+id.replace('/','-'),title:'Former campus building',
    reviewedAt:'2026-11-21',status:'document-supported',reviewBasis:'Compared the named footprint across independent aerial surveys, the 2026 Stanford visitor-map polygons and the linked Stanford project record.',
    observed:note+' The earlier footprint has no corresponding building in the 2025 photo or the visitor plan. The live map omits this former structure.',
    limitations:'The source footprint remains in the inventory. The time between photographs does not establish an exact removal date.',
    sources:[{url,kind:'document',date},{url:'https://campus-map.stanford.edu/kml/Stanford_Buildings.kmz?z=45',kind:'document',date:'2026'},...(group==='bonair'?[{kind:'document',date:'2026-09-21',url:'https://sustainable.stanford.edu/2026/09/21/treasure-hunting-at-campus-open-houses-attract-hundreds/'}]:[]),...ROOF_PHOTO_CHECKS.get(id).sources]};
});
