/** Colors estimate finishes visible in Stanford's official housing galleries.
 * Only named, matched footprints receive overrides. See tools/quality/housing-refs.mjs. */
export interface HousingAppearance {
  readonly wall?: string;
  readonly roof?: string;
  readonly roofShape?: 'flat' | 'hipped' | 'gabled';
}

export const HOUSING_APPEARANCE: Readonly<Record<string, HousingAppearance>> = {
  'way/232805657': {wall: '#d7c4a5'}, // Branner Hall
  'way/160447376': {wall: '#e7d9bc'}, // Toyon Hall
  'relation/3126352': {wall: '#c3bdb0', roof: '#a4674d'}, // Florence Moore Hall
  'way/30775658': {wall: '#ce927e', roofShape: 'flat'}, // Donner House
  'way/30775656': {wall: '#c88977', roofShape: 'flat'}, // Sally Ride House
  'way/232805704': {wall: '#d9b67e', roof: '#ad6c4f'}, // Lantana
  'way/232805713': {wall: '#d6b68a', roof: '#ac6a50'}, // Kimball Hall
  'way/232805719': {wall: '#e2d1b2', roof: '#b3785e'}, // Castaño
  'relation/11032836': {wall: '#ccad81'}, // Potter House
  'relation/11032837': {wall: '#c5a27d'}, // Adams
  'relation/11032838': {wall: '#c8a47c'}, // Robinson House
  'way/343020505': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Arroyo
  'way/343020506': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Cedro
  'way/343020507': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Junipero
  'way/182440069': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Okada
  'way/30775908': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Otero
  'way/30775913': {wall: '#deccb4', roof: '#ac7055', roofShape: 'gabled'}, // Soto
  'way/182440070': {wall: '#d3c1aa'}, // Rinconada
  'way/917710378': {wall: '#e2cda9', roof: '#a15d44'}, // Norcliffe
  'way/1040629367': {wall: '#d8c2a1', roof: '#995d48'}, // Lagunita administration building
  'way/518906030': {wall: '#dbccb4', roof: '#af7052'}, // Meier Hall
  'way/1040377400': {wall: '#e3d5b4'}, // Granada
  'way/1040629365': {wall: '#d6bf99', roof: '#a45e43'}, // Adelfa
  'way/232805707': {wall: '#c5bda7', roof: '#9d6049', roofShape: 'hipped'}, // Jerry
  'way/232805655': {wall: '#e1d29b'}, // Robert Moore South (BOB)
  'way/232805721': {wall: '#e2dacb', roof: '#828173', roofShape: 'hipped'}, // Mars
  'way/232805730': {wall: '#bf9e68', roof: '#95654c'}, // Narnia
  'way/232805745': {wall: '#966b50'}, // Xanadu
  'way/232805715': {wall: '#d0bea3', roof: '#8e8b7e'}, // Robert Moore North (The Well House)
  'way/232805728': {wall: '#bbb4a3', roof: '#a4a294'}, // Muwekma-Tah-Ruk
  'way/232805661': {wall: '#e1d8b9', roof: '#84847b', roofShape: 'gabled'}, // Columbae House
  'way/232805673': {wall: '#cec5b2', roof: '#857b6d'}, // Kappa Sigma
  'way/232805739': {wall: '#dfded2', roof: '#85847a', roofShape: 'hipped'}, // Sigma Nu
  'way/232805702': {wall: '#cabea5', roof: '#948170'}, // Alpha Phi – Kappa Kappa Gamma
  'way/232805737': {wall: '#d7d2c3'}, // Sigma Phi Epsilon
};
