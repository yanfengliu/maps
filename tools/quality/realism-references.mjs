/** Evidence is scoped to observed features, never a claim that a whole model is verified. */
import {ROOF_PHOTO_REFERENCES} from './roof-photo-register.mjs';
import {HOUSING_REFERENCES} from './housing-refs.mjs';
import {FACADE_PHOTOS} from './stanford-facade-photos.mjs';
export const PINNED_PART_COUNT = 648;
const survey = 'https://stgenpln.blob.core.windows.net/document/SU_2018GUP_App_Vol4_pt2.pdf';
const transport = 'https://files.stanfordmedicinetransportation.org/production/';
const engineering = [
  ['way/232841907','Havas Engineering 520','workshop','hipped','02-520',4,'Rusticated sandstone and stucco, tall rectangular wood windows, pilasters, red tile hip and glazed monitors.'],
  ['way/232841919','Mechanical Engineering Administration 530','workshop','hipped','02-530',5,'Sandstone, grouped deep rectangular recesses and stone crossbars, red tile hip and glazed monitor.'],
  ['way/232841878','Blume Earthquake Engineering Center 540','workshop','hipped','02-540',5,'Stucco, tall wood windows, pilasters, red tile hip and glazed monitor.'],
  ['way/232841924','Peterson Laboratory 550','workshop','hipped','02-550',6,'U-shaped sandstone and stucco wings, rectangular windows, pilasters and red tile monitor roofs. Later glazed courtyard addition is documented.'],
  ['way/26292283','Mechanical Engineering Research Laboratory 660','concrete-frame','flat','02-660',null,'Pale concrete piers, large dark framed glazing, punched windows and flat roof. Official descriptions identify first and second floor labs.'],
  ['way/469393555','Sapp Center / Old Chemistry','sandstone','hipped',null,14,'Three-story sandstone, red tile hips, rectangular windows, ornamental central gable and cupolas.'],
  ['way/232841932','Varian Physics Laboratory','aggregate','hipped',null,80,'Board-formed concrete, punched windows and upper casements; tile hips and flat connecting sections.'],
];
const current = {reviewedAt:'2026-11-08', status:'photo-supported', reviewBasis:'Reference images inspected during the 2026-11-08 modeling pass; render acceptance is recorded separately.'};
const source = (url,kind='photo',date='undated')=>({url,kind,date});
const record = (key,ids,title,observed,limitations,sources,extra={})=>({key,ids,title,...current,observed,limitations,sources,...extra});
const naip = source('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer','photo','2022-05-18, Stanford tile m_3712239_ne_10_060');
const hospitalReview = {reviewedAt:'2026-11-21',reviewBasis:'Architect or Stanford exterior photos inspected with the georeferenced NAIP natural-color roof view.'};
const old = {status:'prior-review',reviewedAt:'2026-10-20',reviewBasis:'Recorded in docs/work/0_bay-area-stanford/architecture-references.md; not newly inspected by this audit.'};

const architecturalReferences = [
  record('additional-aerial-decks',[30754822,109151789,232715633,232715634,232715635,232715636,232715637,232715638,232715639].map(id=>'way/'+id),'Fairchild, Beckman and seven unnamed mapped buildings',
    'The light decks have straight parapet edges and scattered rooftop equipment. No red-tiled hips are visible in these footprints.',
    'The image supports the overall roof form. Mechanical enclosures, precise pitch and elevations are unresolved.',
    [source('https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer','photo','2025')],
    {reviewedAt:'2026-11-21',reviewBasis:'Compared the source footprint and emitted mesh to registered county imagery at atlas parts 39, 65, and 145–151.',expected:{roofShape:'flat'}}),
  record('medical-courtyard-decks',[4720978,4721017,4721018,4721019,4721020].map(id=>'relation/'+id),'Five School of Medicine courtyard buildings',
    'The 2025 overhead view shows light, low-slope decks around open central courts at Alway, Lane, Edwards, Boswell and Grant.',
    'Rooftop plant, parapet heights, walls and roof pitch below image resolution are unsurveyed.',
    [source('https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer','photo','2025')],
    {reviewedAt:'2026-11-21',reviewBasis:'Inspected roof atlas sheet 1, parts 6–10, with the mapped rings registered to the county aerial.',expected:{roofShape:'flat'}}),
  ...engineering.map(([id,title,facadeFamily,roofShape,photoId,page,observed])=>record(`engineering-${id.split('/')[1]}`,[id],title,observed,
    'Bay counts, dimensions, monitor dimensions, material response and unphotographed elevations are estimated. Peterson courtyard addition, Sapp ornament/cupolas and Varian mixed roof sections are not fully reconstructed.',
    [source(page?`${survey}#page=${page}`:'https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=02-660','document','2016 survey / undated ADA'),source(photoId?`https://campus-map.stanford.edu/images_repo/bldg/${photoId}/${photoId}-1.jpg`:`${survey}#page=${page}`,'photo',photoId?'undated':'2016')],
    {expected:{facadeFamily,roofShape}})),
  record('roth-garage',['way/232841898'],'Roth Way Garage','Four stories; open roof deck and parking marks; rounded slab fronts, exposed round columns and open elevations.',
    'Ten-metre envelope, deck spacing, parking layout and column placement are estimates. Ramp geometry now connects the floors; its exact location and traffic plan, rooftop furniture and unphotographed elevations remain unverified.',
    [source('https://chemistry.stanford.edu/about/maps-location-parking','document'),source(`${transport}Newsletter/Hospital-Transportation-Newsletter-September-14-2023.pdf#page=2`,'photo','2023-09-13'),source('https://www.top1000funds.com/wp-content/uploads/2023/08/Parking-options-near-Hoover.pdf#page=7')],{expected:{floors:4}}),
  record('stock-farm-garage',['way/26249768'],'Stock Farm Garage','Official staff packet identifies Level 4 as rooftop and a ramp from Level 3.',
    'Four deck levels are documented. Exact facade, column positions, ramps, rooftop furniture and ten-metre envelope are not surveyed; no photographic facade match is claimed.',
    [source(`${transport}New-Staff/NEOPacket_SHC_Comp26.1-Compressed.pdf`,'document')],{status:'document-supported',expected:{floors:4}}),
  record('via-ortega-garage',['way/232841895'],'Via Ortega Garage','Pinned OSM way version 7 records five levels, zero roof levels and multi-storey parking.',
    'Level count is source-tag support, not a photo comparison or measured height. Open facade, columns, ramps and rooftop furniture remain approximations.',
    [source('https://api.openstreetmap.org/api/0.6/way/232841895/7.json','source-tag')],{status:'document-supported',expected:{floors:5}}),
  record('hoover-pavilion-garage',['way/324983017'],'Hoover Pavilion Garage','Six aboveground decks; pale vertical fins, open rectangular deck bands and a prominent entrance.',
    'Operator and manufacturer disagree on basement counts but imply six aboveground. Sixteen-metre rendered height uses estimated three-metre rises plus parapet; source ten-metre default is preserved. Fin count, ramps and furniture are estimates.',
    [source(`${transport}Transportation-Service-Code_v21_7.31.2024.pdf`,'document','2024-07-31'),source('https://www.clarkpacific.com/project/hoover-pavillion-parking-structure/'),source('https://www.clarkpacific.com/wp-content/uploads/2016/10/Hoover-Campus-Parking-Structure.jpg')],{expected:{floors:6}}),
  record('pasteur-garage',['way/891732465'],'Pasteur Staff Garage','Dense beige horizontal exterior louvers; official directions call Level 3 the Rooftop Garden.',
    'Aboveground floor count and height remain unresolved. Conservative four-metre source envelope and garden-colored roof are not an accurate complete reconstruction.',
    [source(`${transport}Newsletter/Hospital-Transportation-Newsletter-June-28-2023.pdf#page=3`,'photo','2023-06'),source(`${transport}Maps-Resources/Executive-Guest-Parking.pdf`,'document')]),
  record('wilbur-access',['way/663770749','way/663770753'],'Possible Wilbur garage access structures','Small source footprints near Wilbur Field Garage; one has a mapped level.',
    'Access role is inferred from size/location. Individual function, elevation, facade and connection to underground garage are not photographed or verified. Source has no underground tag.',
    [source('https://news.stanford.edu/stories/2015/08/parking-structure-names-080415','context','2015-08-04')],{status:'inferred'}),
  record('braun',['relation/12460152'],'Braun Music Center','Official report identifies a flat photovoltaic roof. Exterior photos show cream walls and a narrow red tile perimeter; ADA information lists first and second floors.',
    'Array layout, roof edge width, window spacing and unsurveyed dimensions remain estimates; source twelve-metre height is retained.',
    [source('https://news.stanford.edu/stories/2017/04/sun-rooftop-photovoltaic-panels-electricity-stanford','document','2017-04-17'),source('https://music.stanford.edu/venues-facilities/facilities/braun-music-center'),source('https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=02-210','document')],{expected:{roofShape:'flat',floors:2}}),
  record('stadium',[
    'relation/18614805',...Array.from({length:8},(_,i)=>`way/${1351986681+i}`),...Array.from({length:8},(_,i)=>`way/${1363840342+i}`),
    ...[232715861,1351984170,1351991359,1354417642,1354417643,1354417644,1354418130,1354419983,1354428205,1354428206,1357063452,1354428605,1354428606,1354429136,1354429137,1354430368,1354430369].map(n=>`way/${n}`)
  ],'Stanford Stadium component group','Two seating tiers; pale four-story concrete/glass press box; horizontal glazing and slab bands, central outer S/tree panel, red steel connecting walkway, end stairs, roof terrace/canopy, open concourse columns and rails.',
    'Group references support composition, not exact per-part replication. Facade bay counts, emblem placement, service details, stairs and glass reflectance are estimates. Surrounding planted berm and roof terrace canopy remain incomplete. Historic images do not establish unchanged 2026 condition. Scoreboard content and complete seating/egress details are not verified.',
    [source('https://static.colostate.edu/client-files/stadium-information/5stanford.pdf','photo','undated tour'),source('https://commons.wikimedia.org/wiki/File:Stanford_Stadium_press_box.jpg','photo','2006-09'),source('https://gostanford.com/facilities/stanford-stadium','document'),source(`${survey}#page=38`,'document','2016 survey')]),
  record('memorial-church',['way/836474103'],'Memorial Church','Three front portals, arched central upper window and flanking triplets, mosaic facade, cruciform massing, rounded apses and crossing skylight.',
    'Exterior proportions and original twenty-four-metre height are estimates. Interior mosaics, portals, organs and camera-dependent cutaway need separate views; this legacy exterior record does not certify the interior.',
    [source('https://orsl.stanford.edu/memorial-church'),source('https://orsl.stanford.edu/memorial-church-layout','document'),source('https://quake06.stanford.edu/4-repair-monuments','document')],old),
  record('quad',['relation/35820',...[99,100,101,102,104,105,106,107].map(n=>`way/${836474000+n}`)],'Main Quad and wings','Low sandstone arcade bands, deep rounded arches and red tile roofs.',
    'Arcade heights, bay spacing, unphotographed elevations and whole-wing roof forms are estimates. Correct roof triangulation does not establish real roof geometry.',
    [source('https://orsl.stanford.edu/memorial-church'),source('https://architectplanning.stanford.edu/hoover-tower')],old),
  record('hoover-tower',Array.from({length:8},(_,i)=>`way/${1346548884+i}`),'Hoover Tower','Smooth stucco shaft with three recessed panels per face, paired arch windows, open octagonal observation arches, bowed grilles, red dome and pale lantern.',
    'OSM parts/heights are recorded tags, not independent measurements. Recess depths, grille curvature, portal and roof details are estimates; no interior plan or exact elevation survey was obtained.',
    [source('https://architectplanning.stanford.edu/hoover-tower'),source('https://web.stanford.edu/~siegelr/stanford/hootow.html')],{reviewedAt:'2026-11-08',reviewBasis:'Primary photographs inspected at native resolution; source image hashes and limits are recorded in public/data/stanford-hoover-reference.json.'}),
  record('green-east',['way/232805660'],'Green Library East Wing','Precast horizontal spandrels separate three bands of large metal-framed windows. The stepped eaves wrap three staggered upper roof fields with short tile hips at their ends. A gridded inset appears in the middle field.',
    'The 12 m height is an OSM-derived default. The pitches, relative roof heights, gridded inset material, pier and mullion spacing, and appearance of unphotographed elevations are modeled estimates.',
    [source(`${survey}#page=30`,'document','2017'),source('https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=03-210','document','2023-04-18'),source('https://campus-map.stanford.edu/images_repo/bldg/03-210/03-210-1.jpg'),
      source('https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2022/ImageServer/exportImage?bbox=-122.16744,37.42605,-122.16625,37.42720&bboxSR=4326&imageSR=4326&size=952,920&adjustAspectRatio=false&format=png&f=image','photo','2022')],
    {reviewedAt:'2026-11-21',reviewBasis:'Inspected the public access photograph, the East Wing description on survey page 30 and the registered California 2022 NAIP aerial image. The photograph on the survey page shows the Bing Wing.',expected:{facadeFamily:'precast-ribbon',roofShape:'hipped',floors:3}}),
  record('bing',['way/232805680'] ,"Green Library's Bing Wing",'Three tall rounded west entrance bays beneath small upper openings and a red hipped roof.',
    'Other elevations, window counts, ornament and twelve-metre source default remain estimates.',
    [source('https://trees.stanford.edu/images/inner_palms/inner_palms-Pages/Image8.html'),source(survey,'document','2016')],old),
  record('stanford-300-pasteur',['relation/1753562'],'Stanford Hospital, 300 Pasteur','Three narrow raised west-side wings beside the two source courtyards. Palo Alto records 77.5 ft for the existing group.',
    'The rest of the relation retains its mapped 10 m envelope. Individual roof levels, screen outlines and facade details are interpreted from the 2025 aerial. Proposed additions are excluded.',
    [source('https://www.cityofpaloalto.org/files/assets/public/agendas-minutes-reports/agendas-minutes/architectural-review-board/2022/arb-02.03.2022-300-pasteur.pdf#page=2','document','2022-02-03'),source('https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer','photo','2025 county imagery')],
    {reviewedAt:'2026-11-21',reviewBasis:'County vertical exterior imagery and the municipal staff report’s existing-condition height and aerial photo were inspected separately from proposed renovations.'}),
  record('stanford-500-pasteur',['way/891732466'],'Stanford Hospital, 500 Pasteur','Four glazed, cantilevered upper blocks, inset roof screens, a garden podium and central glazed roof.',
    'Upper silhouettes approximate the 2022 public aerial. The pinned 18 m envelope is an estimate. Glazing, overhangs, screen heights and planting remain approximate.',
    [source('https://vinoly.com/wp-content/uploads/2016/05/Stanford_Hero_Banner3.jpg'),source('https://vinoly.com/wp-content/uploads/2016/05/Stanford_SingleImage_02.jpg'),naip],hospitalReview),
  record('packard-main',['way/689417360'],'Lucile Packard Children’s Hospital, Main Building','Staggered pavilion bars, horizontal louvers, pale vertical fins and terraces.',
    'The 18 m envelope is estimated. Aerial and exterior references support relative massing. Exact roof levels, locations of individual blades, service enclosures and glass finishes are unverified.',
    [source('https://perkinswill.com/wp-content/uploads/2019/03/Hero_Lucile_Packard-scaled.jpg'),source('https://perkinswill.com/wp-content/uploads/2019/03/LPCH-Energy.jpg'),naip],hospitalReview),
  record('packard-west',['way/130100416'],'Lucile Packard Children’s Hospital, West Building','Stepped roof lights and wings around a central planted terrace. Stanford’s historical photograph shows pale horizontal bands and dark glazing.',
    'The aerial establishes the roof arrangement. The 1991 photograph does not establish current finishes. The 18 m envelope, terrace levels, planting and glazing remain estimates.',
    [source('https://med.stanford.edu/content/dam/sm-news/images/2016/05/2016-05-23.pdf#page=4','photo','1991 opening; published 2016'),source('https://lpfch.org/impact-stories/child-centered-healing/','document'),naip],hospitalReview),
  record('roble',['way/232805733'],'Roble Hall','Official three stories; arched entrance, paired columns, cornice and window surrounds.',
    'Window spacing, detailed entrance ornament and roof proportions remain approximations; source ten-metre height is estimated.',
    [source('https://resed.stanford.edu/houses/roble-hall-houses'),source('https://rde.stanford.edu/studenthousing/roble-hall','document')],old),
];

// The architectural groups may cover multiple IDs. Keep those group-specific sources
// together and use the directory photo as the first individual reference elsewhere.
const researchedIds = new Set(architecturalReferences.flatMap(reference=>reference.ids));
const previousReferences = [...architecturalReferences,...FACADE_PHOTOS.filter(photo=>!researchedIds.has(photo.ids[0]))];

// A part can have a photographed elevation, a site plan and a roof comparison.
// Preserve each source and its scope while retaining a single audit record per part.
export function combinePartReferences(collections) {
  const byId = new Map();
  for (const collection of collections) for (const record of collection) for (const id of record.ids) {
    const previous = byId.get(id);
    if (!previous) {
      byId.set(id, {...record,ids:[id], key:record.ids.length === 1 ? record.key : record.key+'-'+id.replace('/','-')});
      continue;
    }
    const sources = new Map([...previous.sources,...record.sources].map(s => [s.url,s]));
    byId.set(id, {...previous, status:[previous,record].some(r=>r.status==='photo-supported')?'photo-supported':previous.status,
      observed:previous.observed+' '+record.observed, limitations:previous.limitations+' '+record.limitations,
      reviewBasis:previous.reviewBasis+' '+record.reviewBasis, sources:[...sources.values()],
      expected:{...record.expected,...previous.expected}});
  }
  return [...byId.values()];
}
export const REALISM_REFERENCES = [...previousReferences,...combinePartReferences([HOUSING_REFERENCES,ROOF_PHOTO_REFERENCES])];
