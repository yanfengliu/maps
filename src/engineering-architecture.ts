/** Explicit visual evidence, not an inference from an academic department's name.
 * Dimensions/bay counts remain authored estimates inside the original source envelope. */
export interface EngineeringReference {
  name:string;
  family:'workshop'|'concrete-frame'|'sandstone'|'aggregate';
  facadeBands:number;
  bayWidth:number;
  roof:'hipped'|'flat';
  monitor:boolean;
  wall:string;
  source:string;
  image:string;
  photographDate:string;
  observed:string;
  estimated:string;
}
const survey='https://stgenpln.blob.core.windows.net/document/SU_2018GUP_App_Vol4_pt2.pdf';
const photo=(id:string)=>`https://campus-map.stanford.edu/images_repo/bldg/${id}/${id}-1.jpg`;
const estimate='Bay count, reveal depth, monitor dimensions and unphotographed elevations are modeled estimates; mapped footprint and source height are retained.';
export const ENGINEERING_REFERENCES:Readonly<Record<string,EngineeringReference>>={
  'way/232841907':{name:'Havas Engineering (520)',family:'workshop',facadeBands:1,bayWidth:4.8,roof:'hipped',monitor:true,wall:'#b9aa86',source:`${survey}#page=4`,image:photo('02-520'),photographDate:'2016 survey; Stanford ADA photo undated',observed:'Rusticated sandstone north/west sections, stucco south section, tall rectangular wood fenestration and projecting pilasters; red-tile hipped roofs with glazed monitors.',estimated:estimate},
  'way/232841919':{name:'Mechanical Engineering Administration (530)',family:'workshop',facadeBands:1,bayWidth:4.8,roof:'hipped',monitor:true,wall:'#b9aa86',source:`${survey}#page=5`,image:photo('02-530'),photographDate:'2016 survey; Stanford ADA photo undated',observed:'Rusticated sandstone, deep rectangular grouped window recesses with stone crossbars, hipped red-tile roof and glazed monitor.',estimated:estimate},
  'way/232841878':{name:'Blume Earthquake Engineering Center (540)',family:'workshop',facadeBands:1,bayWidth:4.8,roof:'hipped',monitor:true,wall:'#c4b790',source:`${survey}#page=5`,image:photo('02-540'),photographDate:'2016 survey; Stanford ADA photo undated',observed:'Stucco walls, tall wood fenestration, projecting pilasters, hipped red-tile roof and glazed monitor.',estimated:estimate},
  'way/232841924':{name:'Peterson Laboratory (550)',family:'workshop',facadeBands:1,bayWidth:4.8,roof:'hipped',monitor:true,wall:'#b9aa86',source:`${survey}#page=6`,image:photo('02-550'),photographDate:'2016 survey; Stanford ADA photo undated',observed:'U-shaped sandstone and stucco workshop wings with tall rectangular wood windows, pilasters and red-tile hipped monitor roofs. A later glazed courtyard addition is documented.',estimated:`${estimate} The later courtyard addition is not reconstructed from this incomplete footprint.`},
  'way/26292283':{name:'Mechanical Engineering Research Laboratory (660)',family:'concrete-frame',facadeBands:2,bayWidth:5.4,roof:'flat',monitor:false,wall:'#c4c0a9',source:'https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=02-660',image:photo('02-660'),photographDate:'Stanford ADA photo undated; inspected 2026-11-08',observed:'Pale concrete with substantial piers, large dark framed glazing, punched windows and a flat roof; Stanford describes labs on first and second floors.',estimated:estimate},
  'way/469393555':{name:'Sapp Center (Old Chemistry)',family:'sandstone',facadeBands:3,bayWidth:4.2,roof:'hipped',monitor:false,wall:'#c9b08b',source:`${survey}#page=14`,image:`${survey}#page=14`,photographDate:'2016',observed:'Three-story sandstone building, red-tile hipped roofs, rectangular wood windows, ornamental central gable and small cupolas.',estimated:`${estimate} The central gable, carved ornament and cupolas remain simplified.`},
  'way/232841932':{name:'Varian Physics Laboratory',family:'aggregate',facadeBands:3,bayWidth:4.2,roof:'hipped',monitor:false,wall:'#bdb8a5',source:`${survey}#page=80`,image:`${survey}#page=80`,photographDate:'2016',observed:'Exposed aggregate and board-formed concrete, punched windows, upper grouped casements and hipped red-tile roof volumes with flat connecting sections.',estimated:`${estimate} The connecting flat roof sections are unresolved within the single source footprint.`},
};

/** Legacy flat-roof estimates requiring individual research. Preserve their
 * estimated massing, but remove the invented glass curtain-wall appearance.
 * This list is an audit backlog, NOT evidence of a modern architectural style. */
export const UNVERIFIED_ACADEMIC_IDS=new Set([
  'way/81794792','way/81794794','way/158646537','way/158646543',
  'way/232805740','way/232841885','way/232841888','way/232841903',
  'way/232841910','way/232841913','way/307364465','way/597085021',
  'way/727171866','way/738808362','way/1038160838','way/1434557267',
]);

export function engineeringRoofOffset(id:string,wall:number,height:number):number {
  return ENGINEERING_REFERENCES[id]?.monitor?Math.min(.9,(height-wall)*.55):0;
}
