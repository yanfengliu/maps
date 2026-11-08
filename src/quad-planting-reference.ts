/** Botanical identities and relative locations transcribed from Stanford's diagram.
 * This is a dated reference reconstruction, not an OSM edit or a current field survey.
 * Individual positions are schematic (allow roughly 2 m uncertainty); heights,
 * crown sizes, groundcover distribution and detailed silhouettes are visual estimates.
 */
export const QUAD_PLANTING_SOURCE = {
  url:'https://trees.stanford.edu/treewalks/innerquadtrees-2025-10-17.pdf',
  date:'2025-10-17', reviewed:'2026-11-08',
  updates:'https://trees.stanford.edu/treewalks/treemaps.htm',
  positionMethod:'diagram dots normalized to mapped planting rings; schematic, approximately 2 m uncertainty',
  dimensionMethod:'estimated species silhouettes, not measured tree dimensions',
  reconciliation:'replace only tree rendering inside the eight referenced rings; preserve original OSM features',
  omitted:[{circle:5,code:'DAin',species:'Davidia involucrata',reason:'Map index records dove tree removed after publication.'}],
  groundcover:['Arctostaphylos uva-ursi Point Reyes','Arctostaphylos Emerald Carpet','Duchesnea indica'],
  silhouetteReferences:[
    'https://trees.stanford.edu/ENCYC/BRAru.htm',
    'https://trees.stanford.edu/ENCYC/NOLre.htm',
    'https://trees.stanford.edu/ENCYC/CORau.htm',
    'https://trees.stanford.edu/ENCYC/BRAdi.htm',
  ],
} as const;

export type PlantShape='fan'|'feather'|'tuft'|'cycad'|'broadleaf'|'bottle'|'dwarf'|'ponytail';
interface Species { name:string;shape:PlantShape;height:number;radius:number;conifer?:boolean;silver?:boolean }
// Dimensions are deliberately kept separate from the source identities above.
export const QUAD_SPECIES:Record<string,Species>={
  BEre:{name:'Beaucarnea recurvata',shape:'ponytail',height:2.7,radius:1.15},
  BRac:{name:'Brachychiton acerifolius',shape:'broadleaf',height:8.0,radius:2.5},
  BRar:{name:'Brahea armata',shape:'fan',height:3.6,radius:2.2,silver:true},
  BRdi:{name:'Brachychiton discolor',shape:'broadleaf',height:3.3,radius:1.05},
  BRpo:{name:'Brachychiton populneus',shape:'broadleaf',height:7.0,radius:2.4},
  BRru:{name:'Brachychiton rupestris',shape:'bottle',height:7.0,radius:2.4},
  BUod:{name:'Butia odorata',shape:'feather',height:4.4,radius:2.4,silver:true},
  CAja:{name:'Camellia japonica Adolphe Audusson',shape:'broadleaf',height:2.2,radius:0.85},
  CAof:{name:'Camphora officinarum',shape:'broadleaf',height:10,radius:3.1},
  CAsa:{name:'Camellia sasanqua Misty Moon',shape:'broadleaf',height:2.2,radius:0.85},
  CEsp:{name:'Ceiba speciosa',shape:'bottle',height:6,radius:2.1},
  COau:{name:'Cordyline australis',shape:'tuft',height:3.2,radius:0.8},
  CRja:{name:'Cryptomeria japonica Lobbii Nana',shape:'dwarf',height:0.75,radius:0.7,conifer:true},
  CYre:{name:'Cycas revoluta',shape:'cycad',height:1.4,radius:1.15},
  DAwh:{name:'Dasylirion wheeleri',shape:'cycad',height:0.8,radius:0.8,silver:true},
  JAmi:{name:'Jacaranda mimosifolia',shape:'broadleaf',height:8,radius:3.2},
  JUsp:{name:'Juniperus species (dwarf)',shape:'dwarf',height:0.55,radius:0.85,conifer:true},
  LAeg:{name:'Lagerstroemia × egolfii Tuscarora',shape:'broadleaf',height:6,radius:1.8},
  LIau:{name:'Livistona australis',shape:'fan',height:12,radius:2.8},
  MAho:{name:'Magnolia hodgsonii',shape:'broadleaf',height:4.5,radius:1.8},
  MEke:{name:'Metrosideros kermadecensis (shrub)',shape:'broadleaf',height:2.2,radius:1.1},
  MOal:{name:'Morus alba',shape:'broadleaf',height:6,radius:2.5},
  NOma:{name:'Nolina matapensis',shape:'tuft',height:3,radius:1.1},
  PAto:{name:'Paulownia tomentosa',shape:'broadleaf',height:9,radius:3.1},
  PHca:{name:'Phoenix canariensis',shape:'feather',height:14,radius:3.8},
  PRla:{name:'Prunus laurocerasus',shape:'broadleaf',height:2.5,radius:0.85},
  PUgr:{name:'Punica granatum',shape:'broadleaf',height:3.4,radius:1.2},
  RHal:{name:'Rhamnus alaternus',shape:'broadleaf',height:3,radius:1.3},
  TRfo:{name:'Trachycarpus fortunei',shape:'fan',height:5,radius:2},
  VIod:{name:'Viburnum odoratissimum',shape:'broadleaf',height:3,radius:1.2},
  WAfi:{name:'Washingtonia filifera',shape:'fan',height:15,radius:2.7},
  WAro:{name:'Washingtonia robusta',shape:'fan',height:17,radius:2.3},
};
export interface ReferencePlant {id:string;code:string;u:number;v:number}
export interface ReferenceCircle {number:number;label:string;sourceId:string;plants:ReferencePlant[]}
type Dot=[code:string,x:number,y:number];
// Dots were read from the PDF at 280 dpi. Retaining this transcription in one
// place makes each individual count auditable, including dotted multi-plant labels.
function circle(number:number,label:string,sourceId:string,cx:number,dots:Dot[]):ReferenceCircle {
  return {number,label,sourceId,plants:dots.map(([code,x,y],index)=>({id:`reference/inner-quad-2025/circle-${number}/${index+1}`,code,u:(x-cx)/261,v:(279-y)/261}))};
}
export const QUAD_PLANTING_REFERENCE:ReferenceCircle[]=[
  circle(1,'outer southeast','way/30775541',271,[
    ['PRla',201,82],['PRla',328,86],['PRla',288,457],['BUod',177,239],['CAsa',270,262],['COau',434,242],['BEre',155,359],['PHca',398,293],['PUgr',474,314],
  ]),
  circle(2,'inner southeast','way/30775539',261,[
    ['COau',448,171],['COau',338,215],['COau',357,215],['COau',273,230],['COau',273,247],['COau',323,290],['COau',370,309],['COau',466,317],['COau',342,401],['COau',346,432],['NOma',310,62],['PRla',119,143],['BRac',176,203],['WAfi',274,289],['BRar',422,342],['BRru',115,404],
  ]),
  circle(3,'inner southwest','way/30775536',272,[
    ['PRla',121,210],['PRla',344,116],['WAro',223,83],['WAro',215,161],['PHca',116,310],['COau',363,265],['BRpo',469,201],['BRpo',503,342],['VIod',246,392],['DAwh',440,423],['CYre',229,464],['CYre',191,489],['CYre',281,525],
  ]),
  circle(4,'outer southwest','way/30775534',269,[
    ['RHal',149,135],['WAfi',209,202],['WAfi',150,352],['PRla',325,205],['PHca',436,324],['MEke',287,412],['BRdi',191,451],['CEsp',337,453],
  ]),
  circle(5,'outer northeast','way/30775542',271,[
    ['CYre',284,81],['CYre',333,121],['CYre',364,86],['BUod',231,108],['PRla',80,207],['WAfi',126,263],['WAfi',264,276],['CAja',309,248],['COau',239,338],['MOal',74,374],['PUgr',338,345],['LIau',357,384],
  ]),
  circle(6,'inner northeast','way/30775540',261,[
    ['CYre',97,147],['CYre',113,127],['CYre',147,96],['CYre',191,70],['CYre',249,58],['WAfi',330,101],['PHca',171,195],['PHca',352,306],['CAof',477,203],['CAof',395,479],['MAho',170,381],['BEre',262,437],['TRfo',123,443],
  ]),
  circle(7,'inner northwest','way/30775535',272,[
    ['COau',74,255],['COau',91,211],['COau',173,161],['COau',187,153],['COau',339,129],['COau',342,329],['COau',250,337],['COau',186,295],['JUsp',193,199],['TRfo',251,188],['BRru',412,216],['WAfi',283,284],['WAfi',207,397],['JAmi',424,394],['PAto',322,427],['LAeg',179,456],
  ]),
  circle(8,'outer northwest','way/30775532',269,[
    ['CYre',281,72],['CYre',364,94],['CYre',204,127],['CYre',244,207],['CYre',307,218],['CYre',379,163],['WAro',290,135],['BEre',418,203],['CRja',464,233],['CRja',445,287],['CRja',468,335],['PRla',110,335],['PRla',416,414],['BRac',176,209],['PHca',323,442],
  ]),
];

export function quadPlantingCoverage(){
  return {source:QUAD_PLANTING_SOURCE,total:QUAD_PLANTING_REFERENCE.reduce((sum,c)=>sum+c.plants.length,0),circles:QUAD_PLANTING_REFERENCE.map(c=>({number:c.number,label:c.label,sourceId:c.sourceId,count:c.plants.length,species:Object.fromEntries([...new Set(c.plants.map(p=>p.code))].map(code=>[QUAD_SPECIES[code].name,c.plants.filter(p=>p.code===code).length]))}))};
}
