import earcut from 'earcut';
type Point=[number,number];
const midpoint=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];

// The projecting porch occupies vertices 2–6. Its gable faces the street;
// behind it a longer ridge runs across the pavilion. Both meet at one ridge.
export function burnhamRoof(ring:Point[]){
  if(ring.length!==9)throw Error('Recheck the Burnham entrance against its changed source outline.');
  const [backLeft,left,shoulderLeft,frontLeft,apex,frontRight,shoulderRight,right,backRight]=ring;
  const leftRidge=midpoint(backLeft,left),rightRidge=midpoint(right,backRight);
  const dx=rightRidge[0]-leftRidge[0],dy=rightRidge[1]-leftRidge[1];
  const t=((apex[0]-leftRidge[0])*dx+(apex[1]-leftRidge[1])*dy)/(dx*dx+dy*dy);
  const joint:Point=[leftRidge[0]+t*dx,leftRidge[1]+t*dy];
  const faces=[
    [left,shoulderLeft,joint,leftRidge],[shoulderRight,right,rightRidge,joint],
    [shoulderLeft,frontLeft,apex,joint],[apex,frontRight,shoulderRight,joint],
    [backLeft,leftRidge,joint,rightRidge,backRight],
  ];
  const triangles:[Point,Point,Point][]=[];
  for(const face of faces){
    const indices=earcut(face.flat(),undefined,2);
    for(let i=0;i<indices.length;i+=3)triangles.push([face[indices[i]],face[indices[i+1]],face[indices[i+2]]]);
  }
  const peaks=new Set([leftRidge,rightRidge,joint,apex]);
  const position=(p:Point)=>11.4*Math.hypot(p[0]-frontLeft[0],p[1]-frontLeft[1])/Math.hypot(frontRight[0]-frontLeft[0],frontRight[1]-frontLeft[1]);
  return {triangles,fraction:(p:Point)=>peaks.has(p)?1:0,uv:(p:Point)=>p,
    edge:(a:Point,b:Point)=>a===backLeft?[a,leftRidge,b]:a===right?[a,rightRidge,b]:[a,b],
    frontage:(a:Point,b:Point)=>a===frontLeft||a===apex?{material:3,u0:position(a),u1:position(b),bands:3.6}:undefined};
}
