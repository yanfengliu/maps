import footprints from './facility-refs-footprints.json' with {type:'json'};
import catalogue from './facility-refs-photos.json' with {type:'json'};
import {ROOF_PHOTO_CHECKS} from './roof-photo-register.mjs';

export const PLAN_MATCHES = new Map(footprints.rows.map(row=>[row.id,row]));
const photos = new Map(catalogue.facilities.map(row=>[row.code,row]));
export const PLAN_REFERENCES = [];
for (const id of ROOF_PHOTO_CHECKS.keys()) {
  const row = PLAN_MATCHES.get(id);
  if (!['footprint','anonymous-footprint'].includes(row.status)) continue;
  const candidate = row.candidates[0], photo = photos.get(candidate.code);
  const images = photo?.images ?? [];
  const match = candidate.code ? candidate.name+' ('+candidate.code+')' : 'anonymous outline '+candidate.anonymousPlacemark;
  const sources = [{kind:'document',date:'2026 visitor-map layer',url:footprints.source}];
  if (candidate.code) sources.push({kind:'document',date:'undated',url:'https://campus-map.stanford.edu/bldg_info_modal.cfm?bldg_id='+candidate.code});
  for (const image of images) sources.push({kind:'photo',date:'undated facility exterior',url:image.image});
  PLAN_REFERENCES.push({key:'visitor-plan-'+id.replace('/','-'),ids:[id],title:match,
    reviewedAt:'2026-11-21',status:images.length?'photo-supported':'document-supported',
    observed:'The independently drawn campus plan matches '+match+'. It covers '+Math.round(100*candidate.sourceCoverage)+'% of the mapped part and the part covers '+Math.round(100*candidate.facilityCoverage)+'% of the plan outline.'+(images.length?' The linked visitor card supplies an exterior photograph.':''),
    reviewBasis:'Reciprocal polygon overlap and competing facilities checked against Stanford’s public visitor map.',
    limitations:'The plan establishes footprint agreement. Visible elevations in the linked photographs and hidden elevations have different coverage. Heights and dates of construction remain unsurveyed.',sources});
}
