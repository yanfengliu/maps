import type { StyleSpecification, LayerSpecification, ExpressionSpecification } from 'maplibre-gl';

const labelName: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
const roadWidth: ExpressionSpecification = ['interpolate', ['exponential', 1.4], ['zoom'], 6, 0.35, 10, 1.2, 14, 4, 18, 16];

function road(id: string, classes: string[], color: string, width: number, minzoom: number): LayerSpecification {
  return {
    id, type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom,
    filter: ['in', ['get', 'class'], ['literal', classes]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': ['*', roadWidth, width] },
  };
}

/** Custom cartography uses OpenMapTiles' public schema; every regional building remains flat. */
export function createStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Bay Area · warm cartography',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    },
    light: { anchor: 'viewport', color: '#fff4df', intensity: 0.42, position: [1.5, 210, 35] },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': '#f3f1e9' } },
      { id: 'woods', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'scrub']]],
        paint: { 'fill-color': ['match', ['get', 'class'], 'wood', '#d5e1c9', 'grass', '#e1e8ce', '#e1e6d2'], 'fill-opacity': 0.82 } },
      { id: 'parks', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': '#d7e4cc', 'fill-opacity': 0.8 } },
      { id: 'landuse', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['cemetery','pitch','school','hospital']]],
        paint: { 'fill-color': ['match', ['get', 'class'], 'cemetery', '#d8e2ce', 'pitch', '#d3dfc3', 'hospital', '#f3e5e1', '#eae6d9'], 'fill-opacity': 0.65 } },
      { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#afd4e3' } },
      { id: 'waterways', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 10,
        paint: { 'line-color': '#afd4e3', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 3] } },
      { id: 'regional-buildings-flat', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13.5,
        paint: { 'fill-color': '#dedbd1', 'fill-opacity': 0.65, 'fill-outline-color': '#d5d1c7' } },
      road('path', ['path','pedestrian','track'], '#ffffff', 0.32, 13),
      road('local-road-border', ['minor','service'], '#dfddd3', 1.1, 11),
      road('local-road', ['minor','service'], '#fffdf8', 0.85, 11),
      road('main-road-border', ['primary','secondary','tertiary','trunk'], '#dfd9c9', 1.3, 7),
      road('main-road', ['primary','secondary','tertiary','trunk'], '#fffdf6', 1, 7),
      road('freeway-border', ['motorway'], '#e3cf9a', 1.6, 5),
      road('freeway', ['motorway'], '#fff1c9', 1.15, 5),
      { id: 'rail', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 11,
        filter: ['in', ['get', 'class'], ['literal', ['rail','transit']]],
        paint: { 'line-color': '#b5b6ae', 'line-width': 0.8, 'line-dasharray': [3, 3], 'line-opacity': 0.65 } },
      { id: 'road-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', minzoom: 12,
        layout: { 'symbol-placement': 'line', 'text-field': labelName, 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-max-angle': 25, 'symbol-spacing': 300 },
        paint: { 'text-color': '#8a887e', 'text-halo-color': '#fffdf6', 'text-halo-width': 1.8 } },
      { id: 'water-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'water_name',
        layout: { 'text-field': labelName, 'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 13, 12, 17], 'text-letter-spacing': 0.1, 'text-max-width': 7 },
        paint: { 'text-color': '#548699', 'text-halo-color': '#afd4e3', 'text-halo-width': 1.5 } },
      { id: 'neighborhood-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['suburb','neighbourhood','quarter']]],
        layout: { 'text-field': labelName, 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-letter-spacing': 0.07, 'text-transform': 'uppercase' },
        paint: { 'text-color': '#99958a', 'text-halo-color': '#f8f6ef', 'text-halo-width': 1.5 } },
      { id: 'city-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 7,
        filter: ['in', ['get', 'class'], ['literal', ['city','town','village']]],
        layout: { 'text-field': labelName, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 10, 15, 13, 20], 'text-padding': 14, 'text-max-width': 10 },
        paint: { 'text-color': '#575b55', 'text-halo-color': '#faf8ef', 'text-halo-width': 2, 'text-halo-blur': 0.3 } },
    ],
  };
}
