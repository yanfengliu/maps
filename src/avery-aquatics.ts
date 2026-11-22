type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];

interface Mesh {
  triangle(a:Vertex,b:Vertex,c:Vertex,color:Color,kind:number,building:number,uv?:[Point,Point,Point],normals?:[Vertex,Vertex,Vertex]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Color,kind:number,building:number):void;
}

const SEAT:Color = [.68,.69,.66];
const RISER:Color = [.54,.53,.49];
const CLOTH:Color = [.94,.93,.88];
const STEEL:Color = [.63,.65,.63];

/** Coordinates are metres across and along the pool from the outer corner of
 * the southwest stand. Both stand strips were located in the 2022 and 2025
 * aerials. MapLibre renders the clipped dry apron and the regional water. */
export function addAveryStands(mesh:Mesh,building:number,base:number,height:number,project:(p:Point)=>Point):void {
  const origin = project([-122.161408,37.431119]);
  const end = project([-122.160964,37.430730]);
  const length = Math.hypot(end[0]-origin[0],end[1]-origin[1]);
  const along:Point = [(end[0]-origin[0])/length,(end[1]-origin[1])/length];
  const across:Point = [-along[1],along[0]];
  const heightScale = (height-base)/10;
  const at = (u:number,v:number,h:number):Vertex => [
    origin[0]+u*across[0]+v*along[0],origin[1]+u*across[1]+v*along[1],base+h*heightScale,
  ];
  const start = 6.4, finish = 48.1, rows = 9, tread = 1.39, rise = .52;

  for (const [front,direction] of [[16.8,-1],[47.9,1]]) {
    const x = (offset:number) => front+direction*offset;
    for (let row=0;row<rows;row++) {
      const inside=x(row*tread), outside=x((row+1)*tread), z=1.15+row*rise;
      const below=row?z-rise:.025;
      mesh.quad(at(inside,start,below),at(inside,finish,below),at(inside,finish,z),at(inside,start,z),RISER,2,building);
      const a=at(inside,start,z),b=at(inside,finish,z),c=at(outside,finish,z),d=at(outside,start,z);
      if(direction>0)mesh.quad(a,b,c,d,SEAT,2,building);
      else mesh.quad(d,c,b,a,SEAT,2,building);
      for (const y of [start,finish]) {
        mesh.quad(at(inside,y,.025),at(outside,y,.025),at(outside,y,z),at(inside,y,z),RISER,2,building);
      }
    }
    const back=x(rows*tread),top=1.15+(rows-1)*rise;
    mesh.quad(at(back,start,.025),at(back,finish,.025),at(back,finish,top),at(back,start,top),RISER,2,building);

    // The sideline photograph shows repeated raised ribs with the greatest
    // sag on the poolward edge. Smooth each span and retain the crease at a rib.
    const bays=4,bayLength=(finish-start)/bays,segments=4;
    const widths=[1.5,6.6,11.7],crest=[9.65,8.95,8.25],trough=[8.08,8.32,8.12];
    for(let bay=0;bay<bays;bay++) {
      const membrane=(step:number,j:number)=>{
        const t=step/segments,sag=4*t*(1-t);
        const z=crest[j]+(trough[j]-crest[j])*sag;
        const left=Math.max(j-1,0),right=Math.min(j+1,2);
        const acrossSlope=((crest[right]-crest[left])*(1-sag)+(trough[right]-trough[left])*sag)/(widths[right]-widths[left]);
        const alongSlope=(trough[j]-crest[j])*4*(1-2*t)/bayLength;
        const nx=-(direction*acrossSlope*across[0]+alongSlope*along[0])*heightScale;
        const ny=-(direction*acrossSlope*across[1]+alongSlope*along[1])*heightScale;
        const magnitude=Math.hypot(nx,ny,1);
        return {position:at(x(widths[j]),start+(bay+t)*bayLength,z),normal:[nx/magnitude,ny/magnitude,1/magnitude] as Vertex};
      };
      const emit=(a:ReturnType<typeof membrane>,b:ReturnType<typeof membrane>,c:ReturnType<typeof membrane>)=>{
        if(direction<0)[a,c]=[c,a];
        mesh.triangle(a.position,b.position,c.position,CLOTH,2,building,undefined,[a.normal,b.normal,c.normal]);
      };
      for(let step=0;step<segments;step++)for(let j=0;j<widths.length-1;j++) {
        const a=membrane(step,j),b=membrane(step+1,j),c=membrane(step+1,j+1),d=membrane(step,j+1);
        emit(a,b,c);
        emit(a,c,d);
      }
    }
    for(let rib=0;rib<=bays;rib++) {
      const y=start+rib*bayLength,center=x(9.6),half=.115;
      const corners:Point[]=[[center-half,y-half],[center+half,y-half],[center+half,y+half],[center-half,y+half]];
      for(let j=0;j<corners.length;j++) {
        const a=corners[j],b=corners[(j+1)%corners.length];
        mesh.quad(at(...a,4.27),at(...b,4.27),at(...b,8.55),at(...a,8.55),STEEL,2,building);
      }
    }
  }
}
