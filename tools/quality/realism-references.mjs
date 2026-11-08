/** Evidence is scoped to observed features, never a claim that a whole model is verified. */
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
const old = {status:'prior-review',reviewedAt:'2026-10-20',reviewBasis:'Recorded in docs/work/0_bay-area-stanford/architecture-references.md; not newly inspected by this audit.'};

export const REALISM_REFERENCES = [
  ...engineering.map(([id,title,facadeFamily,roofShape,photoId,page,observed])=>record(`engineering-${id.split('/')[1]}`,[id],title,observed,
    'Bay counts, dimensions, monitor dimensions, material response and unphotographed elevations are estimated. Peterson courtyard addition, Sapp ornament/cupolas and Varian mixed roof sections are not fully reconstructed.',
    [source(page?`${survey}#page=${page}`:'https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=02-660','document','2016 survey / undated ADA'),source(photoId?`https://campus-map.stanford.edu/images_repo/bldg/${photoId}/${photoId}-1.jpg`:`${survey}#page=${page}`,'photo',photoId?'undated':'2016')],
    {expected:{facadeFamily,roofShape}})),
  record('roth-garage',['way/232841898'],'Roth Way Garage','Four stories; open roof deck and parking marks; rounded slab fronts, exposed round columns and open elevations.',
    'Ten-metre envelope, deck spacing, parking layout and column placement are estimates. Internal ramps, rooftop furniture and unphotographed elevations remain unresolved.',
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
  record('hoover-tower',Array.from({length:8},(_,i)=>`way/${1346548884+i}`),'Hoover Tower','Sparse shaft openings, stepped octagonal crown, tiled dome; official observation deck on 14th floor.',
    'OSM parts/heights are recorded tags, not independent measurements. Crown and ornament remain stylized; official deck floor is not a verified total storey count.',
    [source('https://architectplanning.stanford.edu/hoover-tower')],old),
  record('bing',['way/232805680'] ,"Green Library's Bing Wing",'Three tall rounded west entrance bays beneath small upper openings and a red hipped roof.',
    'Other elevations, window counts, ornament and twelve-metre source default remain estimates.',
    [source('https://trees.stanford.edu/images/inner_palms/inner_palms-Pages/Image8.html'),source(survey,'document','2016')],old),
  record('roble',['way/232805733'],'Roble Hall','Official three stories; arched entrance, paired columns, cornice and window surrounds.',
    'Window spacing, detailed entrance ornament and roof proportions remain approximations; source ten-metre height is estimated.',
    [source('https://resed.stanford.edu/houses/roble-hall-houses'),source('https://rde.stanford.edu/studenthousing/roble-hall','document')],old),
];
