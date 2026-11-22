/** Colors estimate finishes visible in Stanford's official housing galleries.
 * Only named, matched footprints receive overrides. See tools/quality/housing-refs.mjs. */
export interface HousingAppearance {
  readonly wall?: string;
  readonly roof?: string;
  readonly roofShape?: 'flat' | 'hipped' | 'gabled';
}

const sternRoof = {roof: '#9e604e', roofShape: 'flat'} as const;
export const HOUSING_APPEARANCE: Readonly<Record<string, HousingAppearance>> = {
  'way/232805657': {wall: '#d7c4a5'}, // Branner Hall
  'way/160447376': {wall: '#e7d9bc'}, // Toyon Hall
  'relation/3126352': {wall: '#c3bdb0', roof: '#a4674d'}, // Florence Moore Hall
  'relation/22862': sternRoof, // Lucie Stern Hall and the central dining block
  'way/30775658': {...sternRoof, wall: '#ce927e'}, // Donner House
  'way/30775656': {...sternRoof, wall: '#c88977'}, // Sally Ride House
  'way/30775651': {...sternRoof, wall: '#d3896e'}, // Casa Zapata
  'way/30775659': {...sternRoof, wall: '#ca8d79'}, // Burbank
  'way/30775661': {...sternRoof, wall: '#d09268'}, // Twain East
  'way/30775670': {...sternRoof, wall: '#d09268'}, // Twain North
  'way/30775698': sternRoof, // Larkin North
  'way/30775717': sternRoof, // Larkin West
  'way/182440071': {wall: '#ddcbb0', roof: '#ac7055', roofShape: 'gabled'}, // Trancos
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
  'relation/10248811': {wall: '#ddd5c1', roof: '#9f6b4e'}, // Cooperative housing
  'way/232805667': {wall: '#ddd5c1', roof: '#9f6b4e'}, // Enchanted Broccoli Forest
  'relation/11032551': {wall: '#cda778', roof: '#a57252'}, // Schiff
  'relation/12565657': {wall: '#b76747', roofShape: 'flat'}, // Lyman Commons
  'way/232715623': {wall: '#c9a371', roof: '#9c7054'}, // Murray House
  'way/232715626': {wall: '#bd8063'}, // Avanti
  'way/232715651': {wall: '#be8061', roof: '#95674e', roofShape: 'gabled'}, // Middle Earth
  'way/232715654': {wall: '#bd7859', roof: '#92654c'}, // Beefeaters
  'way/232715659': {wall: '#c48568', roof: '#95694f', roofShape: 'gabled'}, // Bollard
  'way/232715665': {wall: '#c9a06c', roof: '#a47353'}, // Elliott Program Center
  'way/232715666': {wall: '#cf9a79'}, // Ricker Dining Hall
  'way/232715862': {wall: '#c2aa91'}, // Lyman Building 3
  'way/232715864': {wall: '#d0b983'}, // Lyman Building 1
  'way/232805712': {wall: '#b8b9a5'}, // Kennedy Grove
  'way/232805666': {wall: '#d4d0be', roof: '#67695e', roofShape: 'hipped'}, // Drell House
  'way/232805720': {wall: '#96abb0', roof: '#69717a'}, // Mariposa
  'way/232805723': {wall: '#d7c6b2', roof: '#a86b50'}, // Munger Building 1
  'way/232805724': {wall: '#ddcfb9', roof: '#b37757'}, // Munger Building 2
  'way/232805725': {wall: '#d3bea3', roof: '#b16b4f'}, // Munger Building 3
  'way/232805726': {wall: '#d9cbbb', roof: '#ae7055'}, // Munger Building 4
  'way/232805727': {wall: '#d8c8ae', roof: '#ae7154'}, // Munger Building 5
  'way/232805734': {wall: '#9eaa90', roof: '#8a7b70', roofShape: 'hipped'}, // Rogers
  'way/232805736': {wall: '#d0c6ab', roof: '#9d7056'}, // Attneave
  'way/232805738': {wall: '#d9d7c8', roof: '#927d67'}, // Sigma Chi
  'way/232805742': {wall: '#d1cbb8', roof: '#68717c', roofShape: 'gabled'}, // Storey
  'way/232805765': {wall: '#c4b991', roof: '#726e67'}, // Lake House
  'way/561917008': {wall: '#c2a58b', roof: '#b97154'}, // Jack McDonald Hall
  'way/1040231570': {wall: '#d6bd94', roof: '#a46d4e'}, // Ujamaa B
  'way/1040629366': {wall: '#d9c9b1', roof: '#a86b4f'}, // Naranja
  'way/1040629368': {wall: '#e2d3b8', roof: '#a87355'}, // Ujamaa A
  'way/1040629369': {wall: '#e0d2ba', roof: '#a66f50'}, // Eucalipto
  'way/1040629370': {wall: '#d8c9b5', roof: '#928675'}, // Lakeside Dining
  'way/1169137068': {wall: '#d9bd93', roof: '#a66348'}, // Kappa Alpha
};
