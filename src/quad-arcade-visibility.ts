import type { Map as MapLibreMap } from 'maplibre-gl';

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
        ? ['case',['==',['get','id'],'relation/35820'],['+',['get','base'],0.1],['get','detailWallHeight']]
        : ['get','detailWallHeight']);
      map.getCanvas().dataset.campusDetailReady=String(detailed);
    },
  };
}
