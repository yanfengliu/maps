/** FEMA/ORNL plan evidence for the frozen unnamed-building intake. See additional-outline-refs.md. */
import comparison from './additional-outline-results.json' with {type:'json'};

const service = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0';
const catalog = 'https://www.arcgis.com/home/item.html?id=0ec8512ad21e4bb987d7e848d14e7e24';
const paloAlto = {changeset: 17260700, date: '2013-08-07', source: 'The original OSM way came from the City of Palo Alto building-outline import.'};

// Each entry was reviewed against the polygon overlay and original OSM import or edit.
const reviewed = [
  {id:'way/232715599', building:'54639753', ...paloAlto, observed:'The detached footprint has stepped north and south edges. The two surveys differ at the east end and in the depth of the steps.'},
  {id:'way/232715832', building:'54506251', ...paloAlto, observed:'Both outlines follow the same isolated oblique rectangle. The two southwest corners are offset. The 2025 OSM way edit added height and preserved the node list.'},
  {id:'way/918557147', building:'55276022', changeset:101235434, date:'2021-03-18', source:'The original OSM editor reported Bing aerial and street-level imagery in 2021.', observed:'Both polygons cover the same detached narrow building. The FEMA rectangle is rotated slightly relative to the mapped rectangle.'},
];

export const ADDITIONAL_OUTLINE_ASSESSMENTS = comparison;
export const ADDITIONAL_OUTLINE_REFERENCES = reviewed.map(review => {
  const row = comparison.rows.find(([id]) => id === review.id);
  if (row?.[1] !== 'matched-outline' || row[2][0][0] !== review.building) throw Error('Recheck outline for ' + review.id);
  const [building, local, external, iou] = row[2][0];
  const [,creator, scene, capture, validation] = comparison.catalog[building];
  const fields = 'BUILD_ID,UUID,SOURCE,IMAGE_DATE,IMAGE_NAME,VAL_METHOD,PROD_DATE';
  const query = new URLSearchParams({where:'BUILD_ID=' + building, outFields:fields, outSR:'4326', returnGeometry:'true', f:'geojson'});
  return {
    key:'fema-outline-' + building, ids:[review.id], title:'Unnamed footprint ' + review.id,
    status:'document-supported', reviewedAt:'2026-11-21',
    reviewBasis:review.source + ' Compared OSM against ' + creator + ' footprint ' + building + ', extracted from satellite image ' + scene + ' acquired ' + capture + ' (FEMA validation field: ' + validation + ').',
    observed:review.observed + ' The intersection covers ' + (100 * local).toFixed(1) + '% of OSM and ' + (100 * external).toFixed(1) + '% of FEMA. The intersection over union is ' + iou.toFixed(3) + '.',
    limitations:'The two-dimensional outlines support the horizontal position and approximate footprint on the image date. Building identity, use, facade, heights, floors, roof form and current condition remain unverified.',
    sources:[
      {url:service + '/query?' + query, kind:'document', date:capture},
      {url:catalog, kind:'document', date:'2026-09-13'},
      {url:'https://www.openstreetmap.org/changeset/' + review.changeset, kind:'source-tag', date:review.date},
    ],
  };
});
