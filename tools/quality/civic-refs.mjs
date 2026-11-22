import {CIVIC_HISTORY_REFERENCES} from './civic-history-refs.mjs';
import {CIVIC_VIEW_COMPARISONS} from './civic-view-comparisons.mjs';
import {CIVIC_FACADE_PHOTOS} from '../../src/civic-facades.ts';
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
const composed=entries.map(([id,code,document])=>{
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

const projectPhotographs={
  'way/68584060': {photo:"https://med.stanford.edu/oncology/about/contact/_jcr_content/main/panel_builder_276762008/panel_0/panel_builder/panel_0/panel_builder_185916/panel_0/panel_builder_copy/panel_0/image.img.620.high.jpg/875_blakewilburdr-scc.jpg",page:"https://med.stanford.edu/oncology/about/contact.html"},
  'way/130100412': {photo:"https://www.stanfordchildrens.org/content/dam/sch/content-public/images/hero/location/blake-wilbur-building.jpg",page:"https://www.stanfordchildrens.org/en/location/blake-wilbur-building.html"},
  'way/727171866': {photo:"https://cdn.prod.website-files.com/67ef8dd55a62b20eaa078275/6876644f1ca095644bbd2e24_Stanford_Hospital_Clinics_Nueroscience_Health_Center_FI_500x333.jpeg",page:"https://www.cahill-sf.com/projectexhibits/stanford-hospital-clinics-neuroscience-health-center"},
  'way/1029436493': {photo:"https://www.hok.com/wp-content/uploads/2021/05/Stanford-11-1900x1270-1.jpg",page:"https://www.hok.com/projects/view/stanford-university-school-of-medicine%e2%80%afcenter-for-academic-medicine/"},
  'way/545210038': {photo:"https://hoover-s3-website.s3.us-west-2.amazonaws.com/s3fs-public/traitel-building-site-2017.jpg",page:"https://www.hoover.org/news/david-and-joan-traitel-building-update"},
  'way/738808361': {photo:"https://chemhneuro.stanford.edu/sites/g/files/sbiybj24536/files/styles/breakpoint_2xl_2x/public/media/image/20191108_chem-h_neurosciences-0279_0.jpeg?itok=fGpO_2uM",page:"https://chemhneuro.stanford.edu/about"},
  'way/738808362': {photo:"https://chemhneuro.stanford.edu/sites/g/files/sbiybj24536/files/styles/breakpoint_2xl_2x/public/media/image/20191108_chem-h_neurosciences-0279_0.jpeg?itok=fGpO_2uM",page:"https://chemhneuro.stanford.edu/about"},
};
const visits=Object.entries(CIVIC_FACADE_PHOTOS).map(([id,{name,code,observed}])=>({
  key:'civic-photo-'+id.split('/')[1],ids:[id],title:name,status:'photo-supported',
  reviewedAt:'2026-11-21',reviewBasis:'Compared the published exterior image with the pinned footprint over 2025 county imagery and the official visitor-map building polygon.',
  observed,limitations:'This is evidence for the pictured elevation and modeled wall color. Other elevations, fine architectural relief, heights and aperture counts remain approximate.',
  sources:[
    {url:projectPhotographs[id]?.photo??('https://campus-map.stanford.edu/images_repo/bldg/'+code+'/'+code+'-1.jpg'),kind:'photo',date:'undated'},
    ...(projectPhotographs[id]?[{url:projectPhotographs[id].page,kind:'document',date:'undated'}]:[]),
    {url:'https://campus-map.stanford.edu/kml/Stanford_Buildings.kmz?z=45',kind:'document',date:'2026 visitor map'},
    {url:county,kind:'photo',date:'2025'},
  ],
}));
export const CIVIC_PHOTO_REFERENCES=[...composed,...visits].map(record=>{
  const view=CIVIC_VIEW_COMPARISONS[record.ids[0]];
  return {...record,reviewBasis:record.reviewBasis+
    ' On model revision 76e58c5 the searched part was viewed at zoom '+view.zoom+', pitch '+view.pitch+'° and bearing '+view.bearing+'°. '+view.note};
});

export const CIVIC_REFERENCES=[...CIVIC_PHOTO_REFERENCES,...CIVIC_HISTORY_REFERENCES];
