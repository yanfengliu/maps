/** Exterior treatments are attached to individual mapped buildings. The normal
 * is in local east/north metres and selects the photographed elevation. */
export interface CivicAppearance {
  name: string;
  wall: string;
  roofColor: string;
  roofShape?: 'flat' | 'hipped' | 'gabled';
  description: string;
  frontage?: { normal: [number, number]; material: number; width: number; bands: number };
}

export const CIVIC_APPEARANCES: Readonly<Record<string,CivicAppearance>> = {
  'relation/8530450': {
    name: 'McMurtry Building', wall: '#d6ae67', roofColor: '#dbd5c7', roofShape: 'flat',
    frontage: {normal:[.96,-.27], material:55, width:1, bands:1},
    description: 'The lawn elevation has a patinated zinc band, ochre stucco and broad glazed openings. Pale roof decks surround the mapped courtyard. The model approximates the crossing bands on the east elevation. The cantilevers, terrace levels and other elevations are unresolved.',
  },
  'way/493811440': {
    name: 'Anderson Collection', wall: '#c8bda9', roofColor: '#e0dfd5', roofShape: 'flat',
    frontage: {normal:[-.25,-.97], material:56, width:1, bands:1},
    description: 'A continuous translucent clerestory tops the pale upper gallery. The south side has a wide dark opening above the glazed ground floor. The model retains the mapped envelope and approximates the height of each band and the depth of the overhang.',
  },
  'way/31711531': {
    name: 'Press Building', wall: '#b9af99', roofColor: '#b8ac9d', roofShape: 'flat',
    frontage: {normal:[-.25,-.97], material:57, width:1, bands:1},
    description: 'Stanford identifies one story. A broad glazed opening interrupts the low stone-colored Santa Teresa Street elevation below a dark fascia. The modeled opening and roof color approximate the public photograph and county aerial.',
  },
  'way/116855068': {
    name: 'Li Ka Shing Center', wall: '#d8c6a8', roofColor: '#dad9d2', roofShape: 'flat',
    frontage: {normal:[-.25,-.97], material:97, width:3.3, bands:3},
    description: 'Pale columns and dark framed glazing face the lawn beneath a broad canopy. The aerial shows a light deck with a rectangular inset. The model represents the glazed front and the deck. Canopy projection, inset height and other elevations are unresolved.',
  },
  'way/158646537': {
    name: 'Lorry I. Lokey Stem Cell Research Building', wall: '#cbbda6', roofColor: '#d2d0c6', roofShape: 'flat',
    frontage: {normal:[.96,-.27], material:97, width:3.4, bands:3},
    description: 'Large dark-framed glass bays interrupt pale wall panels at the east end. The roof has two light-colored fields. The model approximates the glazing and roof finish. Frame depths, upper roof screens and other elevations are unresolved.',
  },
  'way/158646543': {
    name: 'Center for Clinical Sciences Research', wall: '#cfcbbb', roofColor: '#ceccc0', roofShape: 'flat',
    frontage: {normal:[.96,-.27], material:97, width:4.8, bands:4},
    description: 'Wide dark glazing has thin pale horizontal dividers behind a light outer screen at the east end. The aerial shows two long pale roof fields. The model approximates the glazed bands and deck. The screen, lighting strips and roof levels remain unresolved.',
  },
};

export function civicAppearance(id: unknown): CivicAppearance | undefined {
  return CIVIC_APPEARANCES[String(id)];
}

type Point = [number, number];
type Frontage = NonNullable<CivicAppearance['frontage']>;
const south:Point=[-.25,-.97],east:Point=[.97,-.25],west:Point=[-.97,.25];
// Directions come from the university's public building descriptions and
// the photographed plaza/street. Counts and bay widths are model parameters.
export const CAMPUS_FRONTAGES:Readonly<Record<string,Frontage>>={
  'way/81794793': {normal:west, material:3,width:5.2,bands:3},
  'way/81794794': {normal:south,material:3,width:4.5,bands:4},
  'way/307364465': {normal:south,material:3,width:5.4,bands:3},
  'way/30775803': {normal:south,material:3,width:5.0,bands:2},
  'way/232805663': {normal:south,material:3,width:5.4,bands:2},
  'way/232805668': {normal:south,material:3,width:6.3,bands:1},
  'way/232841887': {normal:west,material:99,width:7.6,bands:4},
  'way/597085021': {normal:east,material:97,width:3.2,bands:3},
};
/** Use a common coordinate along a facade so collinear footprint subdivisions
 * cannot restart the window or divide the crossing zinc band. */
export function civicFacade(id:string, ring:Point[]) {
  const frontage = civicAppearance(id)?.frontage ?? CAMPUS_FRONTAGES[id];
  if (!frontage) return;
  const [east,north] = frontage.normal;
  const along = (p:Point) => -north*p[0] + east*p[1];
  const positions = ring.map(along);
  const low = Math.min(...positions), span = Math.max(.001,Math.max(...positions)-low);
  return (a:Point,b:Point,nx:number,ny:number) => {
    const front = nx*east+ny*north > .85;
    const perimeter = id === 'way/493811440';
    if (!front && !perimeter) return;
    const material = !front && perimeter ? 58 : frontage.material;
    const isGenericArch=frontage.material===3;
    const bands=frontage.bands*(isGenericArch?3.6:1);
    const position = frontage.material===97 || frontage.material===99 || isGenericArch
      ? (p:Point) => (along(p)-low)/frontage.width*(isGenericArch?3.8:1)
      : (p:Point) => (along(p)-low)/span;
    // Each museum clerestory runs continuously around all four elevations.
    // On its remaining walls only the relative vertical bands are referenced.
    if (material===58) return {material,u0:0,u1:Math.hypot(b[0]-a[0],b[1]-a[1])/4,bands:1};
    return {material,u0:position(a),u1:position(b),bands};
  };
}
