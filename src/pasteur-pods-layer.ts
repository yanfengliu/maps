import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { PASTEUR_300_ID, PASTEUR_POD_LAYER, pasteurFallbackData } from './pasteur-pods.ts';

export function attachPasteurPods(map:Map,buildings:FeatureCollection<Polygon|MultiPolygon>):void {
  const parent=buildings.features.find(f=>f.properties?.id===PASTEUR_300_ID);
  const data=pasteurFallbackData(parent?.properties??null);
  const source=map.getSource(PASTEUR_POD_LAYER) as GeoJSONSource|undefined;
  if(source)source.setData(data);
  else map.addSource(PASTEUR_POD_LAYER,{type:'geojson',data});
  if(!map.getLayer(PASTEUR_POD_LAYER))map.addLayer({
    id:PASTEUR_POD_LAYER,type:'fill-extrusion',source:PASTEUR_POD_LAYER,minzoom:13.5,
    paint:{'fill-extrusion-base':['get','tierBase'],'fill-extrusion-height':['get','tierTop'],
      'fill-extrusion-color':['get','tierColor'],'fill-extrusion-opacity':1,
      'fill-extrusion-opacity-transition':{duration:0}},
  },'road-label');
}
