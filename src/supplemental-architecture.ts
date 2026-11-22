import type {BuildingArchitecture} from './building-architecture.ts';

export const CLOCK_PERGOLA='way/232805683';
export const KNOLL_BAY='way/1168128440';
export const KNOLL_PARENT='way/232805659';
export const KNOLL_CENTRAL_WING='way/1168128441';
export const KNOLL_WINGS=new Set(['way/1168128439',KNOLL_CENTRAL_WING,'way/1168128442']);
export const KNOLL_ASSEMBLY=new Set([KNOLL_PARENT,...KNOLL_WINGS]);
// Original parent bounds midpoint, before render-only wing composition.
export const KNOLL_DATUM:[number,number]=[-122.1724503,37.42096585];
export const KNOLL_GARAGE='way/232805698';
export const QUAD_RESTROOM='way/338080122';
export const DIAMOND_PRESS='way/1363917194';
export const DIAMOND_DUGOUTS=new Set(['way/1363917195','way/1363917196']);
export const SUPPLEMENTAL_OPEN_IDS=new Set([CLOCK_PERGOLA,...DIAMOND_DUGOUTS]);

interface SupplementalPart {
  name:string;
  description:string;
  wall:string;
  roof:string;
  height?:number;
  facilityCode?:string;
}

export const SUPPLEMENTAL_PARTS:{readonly [id:string]:SupplementalPart}={
  [CLOCK_PERGOLA]:{name:'Clock Bell Tower colonnade',wall:'#c9b891',roof:'#c6b28a',height:3.7,facilityCode:'03-055',
    description:'Stanford Maps draws separate footprints for the square clock tower and its T-shaped colonnade. This mapped part is the colonnade. The facility photographs show pale columns and a slatted pergola. The 3.7 m pergola height and member spacing are estimates.'},
  [KNOLL_GARAGE]:{name:'Knoll Garage',wall:'#beb7a9',roof:'#967d6b',height:4.8,facilityCode:'05-310',
    description:'The detached garage at 662 Lomita Court has one storey, light walls, dark garage doors and a shallow hipped tile roof. The garage roof height is modeled at 4.8 m from the photograph. The photographed door orientation is unresolved.'},
  [QUAD_RESTROOM]:{name:'Main Quad restroom building',wall:'#cebd9f',roof:'#b58264',height:4.2,facilityCode:'01-570',
    description:'The university’s building photograph shows one storey under projecting hipped terracotta eaves. Vegetation obscures the openings. The roof height is modeled at 4.2 m from the photograph.'},
  [DIAMOND_PRESS]:{name:'Sunken Diamond press box',wall:'#c2b6a4',roof:'#c8c6bc',
    description:'Stanford identifies a three-tier press box behind home plate. Its field-facing windows sit below a pale flat parapet. The mapped part is 9 m high. Glazing dimensions are estimates.'},
  'way/1363917195':{name:'Sunken Diamond visitors’ dugout',wall:'#bdad98',roof:'#a4a6a2',
    description:'The stadium seating diagram identifies this long, low shelter along the third-base line. The field side is open under a flat roof. The mapped height is 2 m; roof thickness and column spacing are estimates.'},
  'way/1363917196':{name:'Sunken Diamond home dugout',wall:'#bdad98',roof:'#a4a6a2',
    description:'The stadium seating diagram identifies this long, low shelter along the first-base line. The field side is open under a flat roof. The mapped height is 2 m; roof thickness and column spacing are estimates.'},
};

export const SUPPLEMENTAL_SITE_NAMES:{readonly [id:string]:string}={
  'way/690412907':'North Ticket Booth',
  'way/232715662':'Former Taube tennis spectator structures',
  'way/657542640':'Former Smith Family Softball Stadium grandstand',
};

export function supplementalProfile(id:string,mappedLevels:number|null):BuildingArchitecture|undefined{
  if(!SUPPLEMENTAL_PARTS[id])return;
  const open=SUPPLEMENTAL_OPEN_IDS.has(id),press=id===DIAMOND_PRESS;
  return {profile:open?'open':'service',floors:open?null:press?3:1,
    floorSource:open?'not-applicable':press?'official-description':'reference-profile',mappedLevels,bayWidth:4.2,facadeFamily:'generic',
    roofShape:id===CLOCK_PERGOLA?'slatted-pergola':open?'dugout-canopy':press?'flat':'hipped',roofSource:'reference-profile'};
}

export function supplementalName(id:unknown):string|undefined {
  return SUPPLEMENTAL_PARTS[String(id)]?.name??SUPPLEMENTAL_SITE_NAMES[String(id)];
}

export const FORMER_SPORTS_SITES=new Set(['way/232715662','way/657542640']);
