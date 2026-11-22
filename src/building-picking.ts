import {FACILITY_ELEVATIONS} from './facility-elevations.ts';
import {BASEBALL_FRONT} from './baseball-seating.ts';
import {FARM_IDS} from './farm-exteriors.ts';
import type { FillExtrusionLayerSpecification } from 'maplibre-gl';
import { PASTEUR_POD_LAYER } from './pasteur-pods.ts';
import { QUAD_WING_IDS } from './quad-architecture.ts';
import { STADIUM_SEATING_IDS, STADIUM_OPEN_PART_IDS } from './stadium-architecture.ts';
import { OPEN_GARAGE_IDS } from './garage-architecture.ts';
import { HOOVER_PART_IDS } from './hoover-architecture.ts';

export const BUILDING_PICK_LAYERS=['stanford-buildings','stanford-building-picking',PASTEUR_POD_LAYER];

/** MapLibre queries extrusion volumes even at zero opacity, while its draw
 * path skips them. Keep roof and seating envelopes selectable after open
 * arcades and terraces replace native walls. Source courtyard holes remain.
 */
export function quadPickingLayer():FillExtrusionLayerSpecification {
  return {id:BUILDING_PICK_LAYERS[1],type:'fill-extrusion',source:'stanford',minzoom:13.5,
    filter:['any',['==',['get','detailFlatShell'],true],['in',['get','id'],['literal',['relation/35820',...QUAD_WING_IDS,...STADIUM_SEATING_IDS,...STADIUM_OPEN_PART_IDS,...OPEN_GARAGE_IDS,...FARM_IDS,...Object.keys(FACILITY_ELEVATIONS),...Object.keys(BASEBALL_FRONT),...HOOVER_PART_IDS]]]],
    paint:{'fill-extrusion-height':['get','detailRoofHeight'],'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':0}};
}
