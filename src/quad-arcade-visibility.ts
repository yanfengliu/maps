import type { Map as MapLibreMap, ExpressionSpecification } from 'maplibre-gl';
import {CHURCH_ID} from './church-interior.ts';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { STADIUM_SEATING_IDS, STADIUM_OPEN_PART_IDS } from './stadium-architecture.ts';
import { OPEN_GARAGE_IDS } from './garage-architecture.ts';
import { HOOVER_PART_IDS } from './hoover-architecture.ts';

type Surface = Pick<MapLibreMap,'getLayer'|'getZoom'|'setPaintProperty'|'setFilter'|'getCanvas'>;

/** Keep complete native shells until open arcades and seating can replace them.
 * Reset after recreating standard layers, including context restoration.
 */
export function createQuadArcadeVisibility(){
  let previous:string|undefined;
  return {
    reset(){previous=undefined;},
    sync(map:Surface|undefined,ready:boolean,interior=false){
      if(!map?.getLayer('stanford-buildings'))return;
      const detailed=ready&&!interior&&map.getZoom()>=15.5;
      const flatShell=ready&&!interior&&map.getZoom()>=14;
      const key=`${detailed}:${flatShell}:${interior}`;
      if(key===previous)return;
      previous=key;
      // Native capped extrusions sample terrain at tile-clipped centroids.
      // Complete flat shells instead share one building datum for every face.
      // Remove both native owners while ready; never just recolor the seam.
      const clauses:ExpressionSpecification[]=[];
      if(flatShell)clauses.push(['!=',['get','detailFlatShell'],true]);
      if(interior)clauses.push(['!=',['get','id'],CHURCH_ID]);
      for(const id of ['stanford-buildings','stanford-roofs'])if(map.getLayer(id))map.setFilter(id,clauses.length?['all',...clauses]:null);
      map.setPaintProperty('stanford-buildings','fill-extrusion-height',detailed
        ? ['case',['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS,...STADIUM_SEATING_IDS,...STADIUM_OPEN_PART_IDS,...OPEN_GARAGE_IDS,...HOOVER_PART_IDS]]],['+',['get','base'],0.02],['get','detailWallHeight']]
        : ['get','detailWallHeight']);
      if(map.getLayer('stanford-roofs')){
        const capBase:ExpressionSpecification=detailed
          ? ['case',['in',['get','id'],['literal',[...STADIUM_SEATING_IDS,...STADIUM_OPEN_PART_IDS,...OPEN_GARAGE_IDS,...HOOVER_PART_IDS]]],['get','base'],['get','detailWallHeight']]
          : ['get','detailWallHeight'];
        map.setPaintProperty('stanford-roofs','fill-extrusion-base',capBase);
        map.setPaintProperty('stanford-roofs','fill-extrusion-height',['+',capBase,0.05]);
      }
      map.getCanvas().dataset.campusDetailReady=String(detailed);
      map.getCanvas().dataset.flatShellReady=String(flatShell);
    },
  };
}
