import earcut from 'earcut';
import type { Point } from './building-geometry.ts';

type Vertex = [number, number, number];
type Color = [number, number, number];
interface MeshWriter {
  triangle(a: Vertex, b: Vertex, c: Vertex, tint: Color, kind: number, building: number): void;
  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, tint: Color, kind: number, building: number): void;
}

/** Authored proportions from Stanford's current exterior and plan, not a survey.
 * https://orsl.stanford.edu/memorial-church and /memorial-church-layout
 * https://quake06.stanford.edu/4-repair-monuments (no lost tower or rose window).
 */
export function addMemorialChurch(roofs: MeshWriter, facades: MeshWriter, ring: Point[], building: number, base: number, height: number, stone: Color, tile: Color): void {
  // The pinned OSM front edge faces the Main Quad. Work in its own frame so
  // every major volume follows the footprint's actual orientation.
  let left = ring[0], right = ring[ring.length - 1];
  if (left[0] > right[0]) [left, right] = [right, left];
  const width = Math.hypot(right[0] - left[0], right[1] - left[1]);
  const u: Point = [(right[0] - left[0]) / width, (right[1] - left[1]) / width];
  const v: Point = [u[1], -u[0]], origin: Point = [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
  const scale = (height - base) / 24;
  const at = (x: number, y: number, z: number): Vertex => [origin[0] + x * u[0] + y * v[0], origin[1] + x * u[1] + y * v[1], base + z * scale];
  const local = ring.map(p => [(p[0] - origin[0]) * u[0] + (p[1] - origin[1]) * u[1], (p[0] - origin[0]) * v[0] + (p[1] - origin[1]) * v[1]] as Point);
  const dark: Color = [0.28, 0.29, 0.25], glass: Color = [0.32, 0.40, 0.39], trim: Color = [0.84, 0.76, 0.61], gold: Color = [0.71, 0.61, 0.40];
  const tri = (a: number[], b: number[], c: number[], tint: Color, roof = false) => (roof ? roofs : facades).triangle(at(a[0], a[1], a[2]), at(b[0], b[1], b[2]), at(c[0], c[1], c[2]), tint, roof ? 0 : 2, building);
  const quad = (a: number[], b: number[], c: number[], d: number[], tint = stone, roof = false) => (roof ? roofs : facades).quad(at(a[0], a[1], a[2]), at(b[0], b[1], b[2]), at(c[0], c[1], c[2]), at(d[0], d[1], d[2]), tint, roof ? 0 : 2, building);
  const wall = (a: Point, b: Point, bottom: number, top: number) => quad([...a, bottom], [...b, bottom], [...b, top], [...a, top]);
  const box = (x0: number, x1: number, y0: number, y1: number, eave: number, ridge: number) => {
    const center = (x0 + x1) / 2;
    wall([x0,y0],[x1,y0],8.4,eave); wall([x1,y0],[x1,y1],8.4,eave);
    wall([x1,y1],[x0,y1],8.4,eave); wall([x0,y1],[x0,y0],8.4,eave);
    tri([x0,y0,eave],[x1,y0,eave],[center,y0,ridge],stone); tri([x1,y1,eave],[x0,y1,eave],[center,y1,ridge],stone);
    quad([x0,y0,eave],[center,y0,ridge],[center,y1,ridge],[x0,y1,eave],tile,true);
    quad([center,y0,ridge],[x1,y0,eave],[x1,y1,eave],[center,y1,ridge],tile,true);
  };
  // Low aisle roofs retain the complete mapped perimeter, including the Round
  // Room; the raised volumes below never replace it with a rectangular box.
  const indices = earcut(local.flat());
  for (let i = 0; i < indices.length; i += 3) tri([...local[indices[i]],8.47],[...local[indices[i+1]],8.47],[...local[indices[i+2]],8.47],tile,true);
  // Side aisles slope away from the high, narrower nave.
  for (const side of [-1,1]) quad([side*7.7,6,11.7],[side*12.15,6,8.5],[side*12.15,29.4,8.5],[side*7.7,29.4,11.7],tile,true);
  box(-7.7,7.7,5.9,31.0,17.7,22.7);
  box(-12.2,12.2,0.06,6,16.6,22.7);
  const cap = (outline: Point[], center: Point, eave: number, apex: number) => {
    for (let i=0;i<outline.length;i++) { const a=outline[i],b=outline[(i+1)%outline.length]; wall(a,b,8.4,eave); tri([...a,eave],[...b,eave],[...center,apex],tile,true); }
  };
  cap([local[6],...local.slice(7,12),[-14,46.2]],[-14.2,38],14.1,20.0);
  cap([[13.4,29.6],...local.slice(32,41).reverse()],[14.0,38],14.1,20.0);
  cap([[-8.8,46.6],...local.slice(24,31),[8.8,46.6]],[0,49.7],15.1,20.7);
  cap([local[11],...local.slice(12,24)],[-21.3,53.0],10.6,14.4);
  // The post-1906 crossing has a low hipped roof and domed skylight, no tower.
  const outer: Point[]=[[-13.2,30],[13.2,30],[13.2,46.3],[-13.2,46.3]], inner: Point[]=[[-4.2,35.4],[4.2,35.4],[4.2,41],[-4.2,41]];
  for(let i=0;i<4;i++){const j=(i+1)%4;wall(outer[i],outer[j],8.4,17.5);quad([...outer[i],17.5],[...outer[j],17.5],[...inner[j],22.5],[...inner[i],22.5],tile,true);}
  quad([...inner[0],22.5],[...inner[1],22.5],[...inner[2],22.5],[...inner[3],22.5],tile,true);
  for(let level=0;level<4;level++)for(let i=0;i<20;i++){
    const a=i*Math.PI/10,b=(i+1)*Math.PI/10,low=level*Math.PI/8,high=(level+1)*Math.PI/8;
    const dome=(angle:number,latitude:number)=>[Math.cos(angle)*Math.cos(latitude)*1.65,38.2+Math.sin(angle)*Math.cos(latitude)*1.65,22.55+Math.sin(latitude)*1.25];
    quad(dome(a,low),dome(b,low),dome(b,high),dome(a,high),[0.55,0.60,0.57]);
  }
  // North facade: sandstone, three recessed Romanesque portals, seven upper
  // windows and a muted mosaic field. These authored colors are not a texture.
  quad([-12.25,-0.025,0],[12.25,-0.025,0],[12.25,-0.025,16.6],[-12.25,-0.025,16.6]);
  tri([-12.25,-0.025,16.6],[12.25,-0.025,16.6],[0,-0.025,22.7],gold);
  quad([-12,-0.055,6.5],[12,-0.055,6.5],[12,-0.055,9.3],[-12,-0.055,9.3],gold);
  const arch = (cx: number, y: number, bottom: number, top: number, radius: number, tint: Color, alongX = true, position?: (x: number,z: number,depth: number)=>number[]) => {
    const spring=top-radius, segments=14;
    const pos=position ?? ((x:number,z:number,depth:number)=>alongX?[cx+x,depth,z]:[depth,cx+x,z]);
    const outline:Point[]=[[-radius,bottom],[radius,bottom],[radius,spring]];
    for(let i=1;i<=segments;i++){const t=i*Math.PI/segments;outline.push([Math.cos(t)*radius,spring+Math.sin(t)*radius]);}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];tri(pos(0,(bottom+spring)/2,y),pos(a[0],a[1],y),pos(b[0],b[1],y),tint);}
    for(const offset of [0.15,0.37]){
      const r0=radius+offset,r1=r0+0.12;
      for(let i=0;i<segments;i++){const a=i*Math.PI/segments,b=(i+1)*Math.PI/segments;quad(pos(Math.cos(a)*r0,spring+Math.sin(a)*r0,y-0.025),pos(Math.cos(b)*r0,spring+Math.sin(b)*r0,y-0.025),pos(Math.cos(b)*r1,spring+Math.sin(b)*r1,y-0.025),pos(Math.cos(a)*r1,spring+Math.sin(a)*r1,y-0.025),trim);}
      for(const side of [-1,1])quad(pos(side*r0,bottom,y-0.025),pos(side*r1,bottom,y-0.025),pos(side*r1,spring,y-0.025),pos(side*r0,spring,y-0.025),trim);
    }
  };
  for(const x of [-7.5,0,7.5]){const r=x===0?2.5:2.2;arch(x,-0.11,0.15,6.1,r,dark);quad([x-r+0.2,-0.14,0.2],[x+r-0.2,-0.14,0.2],[x+r-0.2,-0.14,3.6],[x-r+0.2,-0.14,3.6],[0.30,0.25,0.19]);}
  arch(0,-0.1,10.0,16.7,2.6,glass);
  for(const side of [-1,1]) for(const offset of [-1.5,0,1.5]) arch(side*7.45+offset,-0.10,10.1,14.5,0.48,glass);
  // Tall, arched stained-glass bays follow the real curved apse/transept
  // perimeter. Their side spacing is authored, not a surveyed window count.
  for(const [start,end] of [[7,11],[33,40],[25,30],[12,22]])for(let i=start;i<end;i++){
    const a=local[i],b=local[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<3)continue;
    const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    const pos=(x:number,z:number,depth:number)=>[mx+ux*x+uy*depth,my+uy*x-ux*depth,z];
    arch(0,-0.10,3.4,start===12?8.7:12.0,0.76,glass,true,pos);
  }
  // Stone mullions and transoms make the large central stained glass legible.
  for(const x of [-1.3,0,1.3])quad([x-0.045,-0.16,10.1],[x+0.045,-0.16,10.1],[x+0.045,-0.16,14.15],[x-0.045,-0.16,14.15],trim);
  for(const z of [11.7,13.6])quad([-2.3,-0.17,z],[2.3,-0.17,z],[2.3,-0.17,z+0.08],[-2.3,-0.17,z+0.08],trim);
  for(const z of [6.35,8.9,9.35])quad([-12.3,-0.16,z],[12.3,-0.16,z],[12.3,-0.16,z+0.18],[-12.3,-0.16,z+0.18],trim);
  // Authored color clusters suggest the facade's figurative mosaic. A central
  // light-robed figure and flanking groups read as a mural, not another grid
  // of windows. This is not a reproduction of the source painting.
  const disk=(x:number,z:number,r:number,tint:Color)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;tri([x,-0.09,z],[x+Math.cos(a)*r,-0.09,z+Math.sin(a)*r],[x+Math.cos(b)*r,-0.09,z+Math.sin(b)*r],tint);}};
  tri([-10.8,-0.07,16.75],[10.8,-0.07,16.75],[0,-0.07,17.7],[0.57,0.58,0.42]);
  const robes:Color[]=[[0.51,0.56,0.52],[0.63,0.48,0.40],[0.68,0.62,0.45],[0.56,0.57,0.44]];
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const x=side*(3.3+i*1.75),head=19.0-i*0.42,bottom=16.85;
    tri([x-0.46,-0.085,bottom],[x+0.46,-0.085,bottom],[x+0.16,-0.085,head-0.28],robes[i]);
    tri([x-0.46,-0.085,bottom],[x+0.16,-0.085,head-0.28],[x-0.2,-0.085,head-0.28],robes[i]);
    disk(x,head,0.25,[0.75,0.65,0.50]);
  }
  disk(0,20.2,0.58,[0.82,0.73,0.47]);disk(0,20.2,0.28,[0.76,0.65,0.49]);
  tri([-0.78,-0.10,17.05],[0.78,-0.10,17.05],[0.4,-0.10,19.78],[0.83,0.79,0.65]);
  tri([-0.78,-0.10,17.05],[0.4,-0.10,19.78],[-0.4,-0.10,19.78],[0.83,0.79,0.65]);
  for(const side of [-1,1])quad([side*0.34,-0.105,19.5],[side*2.1,-0.105,18.8],[side*2.0,-0.105,18.5],[side*0.26,-0.105,19.05],[0.82,0.77,0.62]);
  // Clerestory rows sit above the aisle roofs; their spacing is modeled.
  for(const side of [-1,1])for(let i=0;i<5;i++)arch(8.5+i*4.4,side*7.76,12.5,16.4,0.8,glass,false);
  quad([-0.20,0.02,22.7],[0.20,0.02,22.7],[0.20,0.02,24],[-0.20,0.02,24],trim);
  quad([-0.67,0.02,23.35],[0.67,0.02,23.35],[0.67,0.02,23.66],[-0.67,0.02,23.66],trim);
}
