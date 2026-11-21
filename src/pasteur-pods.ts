import type { FeatureCollection, Polygon } from 'geojson';

export const PASTEUR_300_ID = 'relation/1753562';
export const PASTEUR_POD_LAYER = 'stanford-pasteur-pods';
export const PASTEUR_POD_TOP = 77.5 * 0.3048;
const WING_TOP = 17.5; // Estimated intermediate roof level within the cited envelope.
type Point = [number, number];
type Tier = {outline: Point[]; bottom:number; top:number; screen:boolean};

// The City of Palo Alto's 2022 architectural review records 77.5 feet for
// the three EXISTING D/E/F pods as a group. These simplified render outlines
// follow the west-side roof breaks visible in Santa Clara County's 2025
// aerial image. Individual screen elevations and offsets are interpretations.
const roofs: {wing:Point[]; screen:Point[]}[] = [
  {
    wing: [[-122.1754465,37.435588],[-122.1753617,37.43557],[-122.17539,37.4354982],[-122.1752486,37.4353275],[-122.1750054,37.4352781],[-122.175028,37.4352242],[-122.1752542,37.4352646],[-122.1754748,37.4351748],[-122.1755823,37.4352018],[-122.1755427,37.4353006],[-122.1755031,37.4354039]],
    screen: [[-122.1754805,37.4354353],[-122.1754069,37.4354218],[-122.1754692,37.4352332],[-122.1755427,37.4352467]],
  },
  {
    wing: [[-122.1756219,37.4350356],[-122.1755144,37.4350131],[-122.17539,37.4348514],[-122.175192,37.434811],[-122.1752146,37.4347661],[-122.1754126,37.4347931],[-122.1756106,37.4347122],[-122.1757293,37.4347392],[-122.1756841,37.4348559]],
    screen: [[-122.1756388,37.4349772],[-122.1755597,37.4349592],[-122.1756275,37.4347661],[-122.1757011,37.4347841]],
  },
  {
    wing: [[-122.1757859,37.4345685],[-122.1756728,37.4345416],[-122.1755483,37.4343933],[-122.175356,37.4343529],[-122.1753787,37.434317],[-122.1755597,37.4343664],[-122.1757916,37.4342676],[-122.1758198,37.4341957],[-122.1759103,37.4342137],[-122.1758538,37.4343709]],
    screen: [[-122.1757972,37.4345011],[-122.1757124,37.4344832],[-122.1757859,37.43429],[-122.1758651,37.434308]],
  },
];
export const PASTEUR_TIERS: Tier[] = roofs.flatMap(({wing,screen})=>[
  {outline:wing,bottom:10,top:WING_TOP,screen:false},
  {outline:screen,bottom:WING_TOP,top:PASTEUR_POD_TOP,screen:true},
]);

/** Native fallback and picking use the same six surfaces as the worker. The
 * rest of the relation keeps its original 10 m height and two courtyard holes. */
export function pasteurFallbackData(parent: {id?: unknown; name?: unknown; height?: unknown; heightSource?: unknown} | null):FeatureCollection<Polygon> {
  return {type:'FeatureCollection',features:parent?.id===PASTEUR_300_ID?PASTEUR_TIERS.map(tier=>({
    type:'Feature',geometry:{type:'Polygon',coordinates:[[...tier.outline,tier.outline[0]]]},
    properties:{id:parent.id,name:parent.name,height:parent.height,heightSource:parent.heightSource,
      detailPodMaximum:PASTEUR_POD_TOP,tierBase:tier.bottom,tierTop:tier.top,tierColor:tier.screen?'#c9c6b6':'#d6d2c4'},
  })):[]};
}
