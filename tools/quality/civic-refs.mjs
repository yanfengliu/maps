import {CIVIC_APPEARANCES} from '../../src/civic-appearance.ts';
const county='https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer';
const entries=[
  ['relation/8530450','07-090','https://azahner.com/projects/mcmurtry-building/'],
  ['way/493811440','07-110','https://anderson.stanford.edu/about/the-building/'],
  ['way/31711531','02-655'],
  ['way/116855068','07-515'],
  ['way/158646537','07-535'],
  ['way/158646543','07-590'],
];
export const CIVIC_REFERENCES=entries.map(([id,code,document])=>{
  const civic=CIVIC_APPEARANCES[id];
  return {
    key:'civic-'+id.split('/')[1], ids:[id], title:civic.name, status:'photo-supported',
    reviewedAt:'2026-11-21', reviewBasis:'Compared the Stanford building photograph with the registered 2025 county overhead and mapped footprint.',
    observed:civic.description, limitations:'Dimensions, wall openings outside the photographed elevation, roof pitch and individual roof fittings are estimates.',
    sources:[
      {url:'https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID='+code,kind:'document',date:'undated'},
      {url:'https://campus-map.stanford.edu/images_repo/bldg/'+code+'/'+code+'-1.jpg',kind:'photo',date:'undated'},
      {url:county,kind:'photo',date:'2025'},
      ...(document?[{url:document,kind:'document',date:'undated'}]:[]),
    ],
    expected:{roofShape:civic.roofShape},
  };
});
