type Point=[number,number];
type Vertex=[number,number,number];
type Color=[number,number,number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number):void;
}

/** Small, photo-grounded relief; these authored dimensions are not a survey. */
export function addLandmarkAccents(mesh:MeshWriter,id:string,ring:Point[],building:number,base:number,wall:number,stone:Color):void {
  const trim:Color=stone.map(c=>Math.min(1,c*1.09)) as Color;
  const dark:Color=[0.28,0.37,0.35];
  const frame=(a:Point,b:Point,center?:Point)=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;
    const o=center??[(a[0]+b[0])/2,(a[1]+b[1])/2];
    return (x:number,z:number,depth:number):Vertex=>[o[0]+ux*x+uy*depth,o[1]+uy*x-ux*depth,base+z];
  };
  const arch=(at:(x:number,z:number,depth:number)=>Vertex,cx:number,bottom:number,top:number,radius:number,relief:number)=>{
    const spring=top-radius;
    // Dark inset and projected voussoirs give the portal a real silhouette.
    const outline:Point[]=[[-radius,bottom],[radius,bottom],[radius,spring]];
    for(let i=1;i<=12;i++){const angle=i*Math.PI/12;outline.push([Math.cos(angle)*radius,spring+Math.sin(angle)*radius]);}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];mesh.triangle(at(cx,(bottom+spring)/2,relief*0.65),at(cx+a[0],a[1],relief*0.65),at(cx+b[0],b[1],relief*0.65),dark,2,building);}
    for(let i=0;i<12;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12,outer=radius+0.24;
      const p=at(cx+Math.cos(a)*radius,spring+Math.sin(a)*radius,relief),q=at(cx+Math.cos(b)*radius,spring+Math.sin(b)*radius,relief);
      mesh.quad(p,q,at(cx+Math.cos(b)*outer,spring+Math.sin(b)*outer,relief),at(cx+Math.cos(a)*outer,spring+Math.sin(a)*outer,relief),i%2?trim:stone,2,building);
      mesh.quad(at(cx+Math.cos(a)*outer,spring+Math.sin(a)*outer,0.055),at(cx+Math.cos(b)*outer,spring+Math.sin(b)*outer,0.055),at(cx+Math.cos(b)*outer,spring+Math.sin(b)*outer,relief),at(cx+Math.cos(a)*outer,spring+Math.sin(a)*outer,relief),stone,2,building);
    }
    for(const side of [-1,1])mesh.quad(at(cx+side*radius,bottom,relief),at(cx+side*(radius+0.24),bottom,relief),at(cx+side*(radius+0.24),spring,relief),at(cx+side*radius,spring,relief),trim,2,building);
  };
  const column=(at:(x:number,z:number,depth:number)=>Vertex,x:number,bottom:number,top:number,radius:number,depth:number)=>{
    for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;mesh.quad(at(x+Math.cos(a)*radius,bottom,depth+Math.sin(a)*radius),at(x+Math.cos(b)*radius,bottom,depth+Math.sin(b)*radius),at(x+Math.cos(b)*radius,top,depth+Math.sin(b)*radius),at(x+Math.cos(a)*radius,top,depth+Math.sin(a)*radius),trim,2,building);}
  };
  if(id==='way/232805733'){
    // The original footprint vertex34 is source entrance node6461239753.
    const at=frame(ring[33],ring[35],ring[34]);
    arch(at,0,0.12,4.15,1.16,0.14);
    for(const x of [-1.65,-1.35,1.35,1.65])column(at,x,0.15,4.55,0.12,0.19);
    for(const z of [0.16,4.55,4.78,5.58])mesh.quad(at(-2.1,z,0.05),at(2.1,z,0.05),at(2.1,z,0.34),at(-2.1,z,0.34),trim,2,building);
    for(let i=0;i<11;i++)column(at,-1.85+i*0.37,4.8,5.55,0.045,0.29);
    // The photograph has light, divided doors below a dark arched fanlight.
    for(const x of [-0.57,0.57]){
      mesh.quad(at(x-0.5,0.15,0.15),at(x+0.5,0.15,0.15),at(x+0.5,2.8,0.15),at(x-0.5,2.8,0.15),[0.78,0.79,0.71],2,building);
      for(let row=0;row<3;row++)for(let col=0;col<2;col++){
        const u=x-0.38+col*0.42,z=0.46+row*0.68;
        mesh.quad(at(u,z,0.16),at(u+0.28,z,0.16),at(u+0.28,z+0.47,0.16),at(u,z+0.47,0.16),dark,2,building);
      }
    }
  }else if(id==='way/232805680'){
    const at=frame(ring[14],ring[16]),length=Math.hypot(ring[16][0]-ring[14][0],ring[16][1]-ring[14][1]);
    for(const bay of [-1,0,1])arch(at,bay*length/3,0.75,wall-base-1.25,Math.min(2.8,length/7.2),0.16);
  }else if(id==='way/1346548885'){
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(length<2)continue;
      const at=frame(a,b);
      arch(at,0,Math.max(0,wall-base-12.5),wall-base-1.4,Math.min(1.35,length*0.26),0.09);
      // A narrow crown cornice reinforces the stepped, largely plain shaft.
      for(const z of [wall-base-13.0,wall-base-0.45])mesh.quad(at(-length/2,z,0.03),at(length/2,z,0.03),at(length/2,z,0.18),at(-length/2,z,0.18),trim,2,building);
    }
  }
}
