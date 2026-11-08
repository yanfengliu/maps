import type { FillExtrusionLayerSpecification } from 'maplibre-gl';
import { QUAD_WING_IDS } from './quad-architecture.ts';

export const BUILDING_PICK_LAYERS=['stanford-buildings','stanford-building-picking'];

/** MapLibre queries extrusion volumes even at zero opacity, while its draw
 * path skips them. Keep the visible roof envelope selectable after open
 * arcades replace the native walls. The same source preserves courtyard holes.
 */
export function quadPickingLayer():FillExtrusionLayerSpecification {
  return {id:BUILDING_PICK_LAYERS[1],type:'fill-extrusion',source:'stanford',minzoom:13.5,
    filter:['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS]]],
    paint:{'fill-extrusion-height':['get','detailRoofHeight'],'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':0}};
}
