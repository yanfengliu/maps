/** CPU meshes keep their precision and source-inspection layout. GPU colors
 * use normalized RGB8, saving eight bytes per vertex without quantizing
 * positions, normals, UVs, material IDs or selected-building IDs. */
export const GPU_VERTEX_BYTES=44;
export const CPU_VERTEX_FLOATS=13;
export const MAX_GPU_GEOMETRY_BYTES=24*1024*1024;
export const MAX_DETAIL_TRIANGLES=190_000;
export function gpuGeometryBytes(values:Float32Array):number{return values.length/CPU_VERTEX_FLOATS*GPU_VERTEX_BYTES;}
export function packGpuVertices(values:Float32Array,start=0,end=values.length/CPU_VERTEX_FLOATS):Uint8Array{
 if(values.length%CPU_VERTEX_FLOATS||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>values.length/CPU_VERTEX_FLOATS)throw new Error('Invalid GPU vertex slice.');
 const bytes=new Uint8Array((end-start)*GPU_VERTEX_BYTES),floats=new Float32Array(bytes.buffer);
 for(let vertex=start;vertex<end;vertex++){
  const s=vertex*CPU_VERTEX_FLOATS,d=(vertex-start)*11,b=(vertex-start)*GPU_VERTEX_BYTES;
  for(let j=0;j<6;j++)floats[d+j]=values[s+j];
  for(let j=0;j<3;j++)bytes[b+24+j]=Math.round(Math.max(0,Math.min(1,values[s+6+j]))*255);
  bytes[b+27]=255;
  for(let j=0;j<4;j++)floats[d+7+j]=values[s+9+j];
 }
 return bytes;
}
