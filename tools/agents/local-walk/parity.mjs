// Pure future-experiment predicates. These do not admit a packet or update any source pin.
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=value=>structuredClone(value);
export function comparePreparedContext(candidate,retained) {
  if(!candidate||!retained||!Array.isArray(candidate.triangles)||!Array.isArray(retained.triangles)||candidate.triangles.length!==1577||retained.triangles.length!==1577)throw Error('Context parity requires the complete retained1577-triangle denominator');
  const a=copy(candidate),b=copy(retained);
  if(!a.obstacles?.inputs||!b.obstacles?.inputs)throw Error('Context parity requires explicit obstacle source provenance');
  const candidateProvenance=a.obstacles.inputs,retainedProvenance=b.obstacles.inputs;
  delete a.obstacles.inputs;delete b.obstacles.inputs;
  const geometryEqual=equal(a,b),provenanceEqual=equal(candidateProvenance,retainedProvenance);
  return {geometryEqual,provenanceEqual,requiresSuccessorReview:!provenanceEqual,admitted:false,candidateProvenance,retainedProvenance};
}
export function compareSelectedSupport(mesh,retained) {
  if(!mesh||!mesh.indices||!mesh.positions||!retained?.triangles||retained.triangles.length!==1577)throw Error('Selected support parity requires decoded current indices/positions and1577 retained triangles');
  for(const triangle of retained.triangles) {
    if(triangle.mesh!=='pavements'||triangle.index<402706||triangle.index>=460443||triangle.vertices.length!==3)throw Error('Selected support is outside the reviewed hero owner');
    for(let corner=0;corner<3;corner++) {
      const id=mesh.indices[triangle.index*3+corner];
      if(!Number.isInteger(id)||id<0||id*3+2>=mesh.positions.length)throw Error('Current selected support triangle has no complete index');
      for(let axis=0;axis<3;axis++)if(mesh.positions[id*3+axis]!==triangle.vertices[corner][['x','y','z'][axis]])throw Error('Current selected support coordinate differs at triangle '+triangle.index);
    }
  }
  return {selectedTriangles:1577,positionsAtActualIndicesExact:true,admitted:false,scope:'Actual selected support coordinates only; derived height/normal/route/obstacle parity is separately required. Original mesh-normal attributes are not asserted.'};
}
