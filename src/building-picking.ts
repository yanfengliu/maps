import type { FillExtrusionLayerSpecification } from 'maplibre-gl';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { STADIUM_SEATING_IDS } from './stadium-architecture.ts';

export const BUILDING_PICK_LAYERS=['stanford-buildings','stanford-building-picking'];

/** MapLibre queries extrusion volumes even at zero opacity, while its draw
 * path skips them. Keep roof and seating envelopes selectable after open
 * arcades and terraces replace native walls. Source courtyard holes remain.
 */
export function quadPickingLayer():FillExtrusionLayerSpecification {
  return {id:BUILDING_PICK_LAYERS[1],type:'fill-extrusion',source:'stanford',minzoom:13.5,
    filter:['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS,...STADIUM_SEATING_IDS]]],
    paint:{'fill-extrusion-height':['get','detailRoofHeight'],'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':0}};
}
