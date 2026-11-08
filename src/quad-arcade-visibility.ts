import type { Map as MapLibreMap, ExpressionSpecification } from 'maplibre-gl';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { STADIUM_SEATING_IDS, STADIUM_OPEN_PART_IDS } from './stadium-architecture.ts';
import { OPEN_GARAGE_IDS } from './garage-architecture.ts';

type Surface = Pick<MapLibreMap,'getLayer'|'getZoom'|'setPaintProperty'|'getCanvas'>;

/** Keep complete native shells until open arcades and seating can replace them.
 * Reset after recreating standard layers, including context restoration.
 */
export function createQuadArcadeVisibility(){
  let hidden:boolean|undefined;
  return {
    reset(){hidden=undefined;},
    sync(map:Surface|undefined,ready:boolean){
      if(!map?.getLayer('stanford-buildings'))return;
      const detailed=ready&&map.getZoom()>=15.5;
      if(detailed===hidden)return;
      hidden=detailed;
      map.setPaintProperty('stanford-buildings','fill-extrusion-height',detailed
        ? ['case',['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS,...STADIUM_SEATING_IDS,...STADIUM_OPEN_PART_IDS,...OPEN_GARAGE_IDS]]],['+',['get','base'],0.02],['get','detailWallHeight']]
        : ['get','detailWallHeight']);
      if(map.getLayer('stanford-roofs')){
        const capBase:ExpressionSpecification=detailed
          ? ['case',['in',['get','id'],['literal',[...STADIUM_SEATING_IDS,...STADIUM_OPEN_PART_IDS,...OPEN_GARAGE_IDS]]],['get','base'],['get','detailWallHeight']]
          : ['get','detailWallHeight'];
        map.setPaintProperty('stanford-roofs','fill-extrusion-base',capBase);
        map.setPaintProperty('stanford-roofs','fill-extrusion-height',['+',capBase,0.05]);
      }
      map.getCanvas().dataset.campusDetailReady=String(detailed);
    },
  };
}
