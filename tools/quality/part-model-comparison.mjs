// Compare the visible native extrusion and both emitted meshes for each part.
// Terrain IDs are stable because the pinned source inventory keeps its order.
import {createHash} from 'node:crypto';
export function fingerprints(prepared, mesh, ids) {
  const parts=prepared.features.map(feature=>{
    const p=feature.properties;
    if(!ids.has(p.id))return null;
    const digest=createHash('sha256');
    digest.update(JSON.stringify([feature.geometry,p.detailWallHeight,p.detailRoofHeight,p.detailWallColor,p.detailRoofColor,p.detailFlatShell]));
    return {id:p.id,digest};
  });
  for(const [label,buffer] of [['roof',mesh.roofs],['facade',mesh.facades]]){
    for(const part of parts)part?.digest.update(label);
    let from=0;
    while(from<buffer.length){
      const owner=buffer[from+12];let to=from+13;
      while(to<buffer.length&&buffer[to+12]===owner)to+=13;
      if(parts[owner])parts[owner].digest.update(Buffer.from(buffer.buffer,buffer.byteOffset+from*4,(to-from)*4));
      from=to;
    }
  }
  return Object.fromEntries(parts.filter(Boolean).map(part=>[part.id,part.digest.digest('hex')]));
}
