import type {Map as MapLibreMap, TerrainSpecification} from 'maplibre-gl';

/** MapLibre 6.15 retains Terrain through context loss. Its old RTT tiles release
 * into map.painter on restore, contaminating the new painter's texture pool.
 * Retire terrain through the public API while the old painter/style still exist.
 * Capture runs before MapLibre's bubbling canvas listener destroys that style. */
export function enableTerrainRecovery(map:Pick<MapLibreMap,'getCanvas'|'getTerrain'|'setTerrain'|'on'|'off'>):()=>void {
  const canvas=map.getCanvas();let pending:TerrainSpecification|null=null;
  const lost=()=>{
    const terrain=map.getTerrain();if(!terrain)return;
    pending={...terrain};map.setTerrain(null);
  };
  const loaded=()=>{
    if(!pending)return;
    const terrain=pending;pending=null;map.setTerrain(terrain);
  };
  canvas.addEventListener('webglcontextlost',lost,{capture:true});
  map.on('style.load',loaded);
  return ()=>{pending=null;canvas.removeEventListener('webglcontextlost',lost,{capture:true});map.off('style.load',loaded);};
}
