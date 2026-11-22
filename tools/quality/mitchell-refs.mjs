import {MITCHELL_UPPER,MITCHELL_COLUMNS} from '../../src/mitchell-exterior.ts';
const survey={kind:'photo',date:'2016 south elevation, 2017 historic evaluation',url:'https://stgenpln.blob.core.windows.net/document/SU_2018GUP_App_Vol4_pt2.pdf#page=82'};
const facility={kind:'photo',date:'undated Stanford visitor-map photograph',url:'https://campus-map.stanford.edu/images_repo/bldg/04-560/04-560-1.jpg'};
const sourceTag={kind:'source-tag',date:'2026-05-06',url:'https://www.openstreetmap.org/changeset/182272772'};
const doc={kind:'document',date:'2017 historic evaluation, page 82',url:survey.url};
const references=[...MITCHELL_COLUMNS].map(id=>({
  key:'mitchell-column-'+id.split('/')[1],title:'Mitchell Earth Sciences concrete support',ids:[id],status:'document-supported',reviewedAt:'2026-11-21',
  observed:'The May 2026 mapping edit identifies this particular part as a concrete Mitchell support column. The 2017 historic survey describes the exposed concrete structure and its projecting piers. The model retains the mapped column section, with a continuous concrete finish.',
  limitations:'The OSM outline locates this individual column. The school photograph corroborates the structural family and does not show every support independently. Taper, precise height and the concealed upper joint remain unresolved.',
  reviewBasis:'Read the original part-specific OSM tags and compared the group with the 2016 south facade photograph, the campus facility card and two registered overhead surveys.',
  sources:[sourceTag,doc,facility],
}));
references.push({key:'mitchell-upper',ids:[MITCHELL_UPPER],title:'Mitchell Earth Sciences upper block',status:'photo-supported',reviewedAt:'2026-11-21',
  observed:'The mapping edit identifies the upper floors projecting over the plaza. Stanford’s historic survey and the facility photograph show projecting concrete piers, large areas of glazing and a horizontal clerestory under the tiled roof. Both aerial surveys show a central pale roof deck.',
  limitations:'The opening rhythm, tile width and shading are estimated. The original footprint and source height remain unchanged.',
  reviewBasis:'Compared the named overhanging part, its registered aerial crops, the visitor card and the county-filed assessment of facility 04-560.',sources:[sourceTag,survey,facility]});
export const MITCHELL_REFERENCES=references;
