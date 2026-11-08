import type { Map as MapLibreMap } from 'maplibre-gl';
import { QUAD_WING_IDS } from './quad-architecture.ts';

type Surface = Pick<MapLibreMap,'getLayer'|'getZoom'|'setPaintProperty'|'getCanvas'>;

/** Keep the complete native wall until the open-arcade mesh can replace it.
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
        ? ['case',['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS]]],['+',['get','base'],0.02],['get','detailWallHeight']]
        : ['get','detailWallHeight']);
      map.getCanvas().dataset.campusDetailReady=String(detailed);
    },
  };
}
