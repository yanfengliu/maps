/** Small immutable botanical shape library. Coordinates are crown radii in XY
 * and total height in Z. Each mapped tree reuses a template, then applies its
 * recorded/estimated dimensions, stable rotation and its own terrain anchor.
 * Reference shapes: trees.stanford.edu/ENCYC/{PHOca,WASfil,QUEagr,SEQsem}.htm.
 * These are visual interpretations, never surveyed individual tree geometry. */
type V=[number,number,number];
type UV=[number,number];
type Color=[number,number,number];
export const TREE_MATERIAL={leaf:90,feather:91,fan:92,needle:93,bark:94,palmBark:95} as const;
export const TREE_MATERIAL_KINDS=Object.freeze(Object.values(TREE_MATERIAL));
export type TreeForm='feather'|'fan'|'broadleaf'|'conifer';
export interface TreeTriangle {readonly points:readonly V[];readonly uv:readonly UV[];readonly normals:readonly V[];readonly kind:number;readonly shade:number}
export interface TreePrototype {readonly form:TreeForm;readonly variant:number;readonly triangles:readonly TreeTriangle[]}
export interface TreeMeshWriter {triangle(a:V,b:V,c:V,tint:Color,kind:number,building:number,uv?:[UV,UV,UV],normals?:[V,V,V]):void}
const TAU=Math.PI*2;
const cache=new Map<string,TreePrototype>();
export const TREE_VARIANTS=Object.freeze({feather:3,fan:2,broadleaf:3,conifer:2});
const unit=(p:V):V=>{const length=Math.hypot(...p);return length?p.map(v=>v/length) as V:[0,0,1];};
const normal=(a:V,b:V,c:V):V=>unit([(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]);
export function treeVariant(id:string,form:TreeForm):number{let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);return (seed>>>0)%TREE_VARIANTS[form];}
export function mappedTreeForm(properties:Record<string,unknown>,type:'palm'|'broadleaf'|'conifer'):TreeForm{
  if(type!=='palm')return type;
  // Only the source identity chooses a different leaf family. An unknown palm
  // keeps the established feather fallback; a variant never invents a species.
  return /Washingtonia|Livistona|Trachycarpus|Brahea|Sabal|Chamaerops/i.test(String(properties.species??properties.genus??''))?'fan':'feather';
}

export function treePrototype(form:TreeForm,requestedVariant:number):TreePrototype{
  if(!Object.hasOwn(TREE_VARIANTS,form)||!Number.isInteger(requestedVariant)||requestedVariant<0||requestedVariant>=TREE_VARIANTS[form])throw new Error('Invalid tree prototype selection');
  const key=`${form}/${requestedVariant}`,cached=cache.get(key);if(cached)return cached;
  const variant=requestedVariant,triangles:TreeTriangle[]=[];
  const tri=(a:V,b:V,c:V,kind:number,shade=1,uv:UV[]=[[0,0],[1,0],[0,1]],normals?:V[])=>{
    const n=normal(a,b,c);triangles.push({points:[a,b,c],uv,normals:normals??[n,n,n],kind,shade});
  };
  const stem=(start:V,end:V,r0:number,r1:number,sides:number,palm=false)=>{
    const axis=unit([end[0]-start[0],end[1]-start[1],end[2]-start[2]]),side=unit([axis[2],0,-axis[0]]),other:V=[axis[1]*side[2]-axis[2]*side[1],axis[2]*side[0]-axis[0]*side[2],axis[0]*side[1]-axis[1]*side[0]];
    const point=(center:V,r:number,angle:number):V=>center.map((p,i)=>i===2&&center[2]===0?0:p+r*(side[i]*Math.cos(angle)+other[i]*Math.sin(angle))) as V;
    for(let i=0;i<sides;i++){
      const a=i*TAU/sides,b=(i+1)*TAU/sides,A=point(start,r0,a),B=point(start,r0,b),C=point(end,r1,b),D=point(end,r1,a),kind=palm?TREE_MATERIAL.palmBark:TREE_MATERIAL.bark;
      const ns=[a,b,b,a].map(angle=>unit(side.map((p,j)=>p*Math.cos(angle)+other[j]*Math.sin(angle)) as V));
      tri(A,B,C,kind,1,[[i/sides,start[2]],[(i+1)/sides,start[2]],[(i+1)/sides,end[2]]],[ns[0],ns[1],ns[2]]);
      if(r1>0)tri(A,C,D,kind,1,[[i/sides,start[2]],[(i+1)/sides,end[2]],[i/sides,end[2]]],[ns[0],ns[2],ns[3]]);
    }
  };
  if(form==='feather'){
    // Three longitudinal bends retain the arch in profile. The opaque cutout
    // trims each swept leaflet independently; no texture asset or extra draw.
    stem([0,0,0],[.025*(variant-1),.015,.825],.105,.085,6,true);
    for(let j=0;j<14;j++){
      const a=j*2.399963+variant*.43,dx=Math.cos(a),dy=Math.sin(a),tier=j%3;
      const reach=[.48,.91,1][tier]*(.94+.06*Math.sin(j*1.7+variant));
      const tip=[.985,.85,.705][tier]+.012*Math.sin(j*2.3+variant);
      const width=[.16,.23,.25][tier]*(.94+.06*Math.cos(j*1.3)),roll=.14*Math.sin(j*1.7+variant);
      const at=(t:number,side:number,z:number):V=>[dx*t*reach-dy*side,dy*t*reach+dx*side,z+side*roll];
      const root:V=[0,0,.825],l1=at(.35,-width*.84,[.93,.97,.95][tier]),r1=at(.35,width*.84,[.93,.97,.95][tier]);
      const l2=at(.67,-width,[.973,.955,.88][tier]),r2=at(.67,width,[.973,.955,.88][tier]),end=at(1,0,tip),offset=j*2;
      const shade=.87+.12*(j%5)/4;
      const n0=normal(root,l1,r1),n1=normal(l1,l2,r2),n2=normal(l2,end,r2),blend=(a:V,b:V)=>unit(a.map((v,i)=>v+b[i]) as V),b1=blend(n0,n1),b2=blend(n1,n2);
      tri(root,l1,r1,TREE_MATERIAL.feather,shade,[[0,offset],[-1,offset+.35],[1,offset+.35]],[n0,b1,b1]);
      tri(l1,l2,r2,TREE_MATERIAL.feather,shade,[[-1,offset+.35],[-1,offset+.67],[1,offset+.67]],[b1,b2,b2]);
      tri(l1,r2,r1,TREE_MATERIAL.feather,shade,[[-1,offset+.35],[1,offset+.67],[1,offset+.35]],[b1,b2,b1]);
      tri(l2,end,r2,TREE_MATERIAL.feather,shade,[[-1,offset+.67],[0,offset+1],[1,offset+.67]],[b2,n2,b2]);
    }
    for(let j=0;j<4;j++){const a=j*TAU/4,b=(j+1)*TAU/4;tri([0,0,1],[Math.cos(a)*.16,Math.sin(a)*.16,.825],[Math.cos(b)*.16,Math.sin(b)*.16,.825],TREE_MATERIAL.feather,.82,[[0,0],[.03,.02],[-.03,.02]]);}
  }else if(form==='fan'){
    stem([0,0,0],[0,0,.85],.075,.055,5,true);
    for(let j=0;j<10;j++){
      const a=j*2.399963+variant*.5,dx=Math.cos(a),dy=Math.sin(a),rise=.9-j*.15,along=Math.cos(rise),up=Math.sin(rise),reach=.9;
      const start:V=[0,0,.86],at=(spread:number,t:number):V=>[dx*along*t-dy*spread,dy*along*t+dx*spread,.86+up*t*.12];
      const hub=at(0,.25),shade=.90+.08*(j%3)/2;
      for(let k=0;k<5;k++){
        const s0=(k/5-.5)*1.6,s1=((k+1)/5-.5)*1.6;
        const b=at(Math.sin(s0)*.5,Math.cos(s0)*reach),c=at(Math.sin(s1)*.5,Math.cos(s1)*reach);
        b[2]-=.05*(k%2);c[2]-=.05*((k+1)%2);
        tri(hub,b,c,TREE_MATERIAL.fan,shade,[[0,0],[s0,1],[s1,1]]);
      }
      tri(start,at(-.018,.3),at(.018,.3),TREE_MATERIAL.fan,.84,[[0,0],[-.02,.3],[.02,.3]]);
    }
    for(let j=0;j<5;j++){const a=j*TAU/5,b=(j+1)*TAU/5;tri([0,0,1],[Math.cos(a)*.24,Math.sin(a)*.24,.86],[Math.cos(b)*.24,Math.sin(b)*.24,.86],TREE_MATERIAL.fan,.86);}
  }else if(form==='broadleaf'){
    const lean:V=[.045*(variant-1),.025,.48];stem([0,0,0],lean,.075,.038,3);
    stem(lean,[-.46,.13,.67],.033,0,3);stem(lean,[.37,-.18,.74],.031,0,3);
    // Eight independently oriented, bent branch sprays replace the closed
    // polyhedral crown. Four faces per spray leave an open surface, with a
    // coherent cutout UV spanning its folds. These are spatial branch clusters,
    // not a camera-facing whole-tree billboard or a solid canopy envelope.
    const sprays:[V,number,number][]=[
      [[-.43,-.13,.61],.49,.22],[[.43,-.18,.66],.51,.23],
      [[-.26,.37,.70],.52,.23],[[.25,.32,.77],.47,.21],
      [[-.24,-.34,.79],.49,.20],[[.39,.10,.53],.44,.22],
      [[.01,-.08,.87],.43,.13],[[-.12,-.38,.53],.46,.20],
    ];
    for(let j=0;j<sprays.length;j++){
      const [base,width,height]=sprays[j],angle=j*2.399963+variant*.49,tilt=.27*Math.sin(j*1.9+variant);
      const u:V=[Math.cos(angle),Math.sin(angle),0],v:V=[-Math.sin(angle)*Math.sin(tilt),Math.cos(angle)*Math.sin(tilt),Math.cos(tilt)],n=normal([0,0,0],u,v);
      const center:V=[base[0]+(variant-1)*.018,base[1],base[2]],offset=j*4;
      const edge=(x:number,y:number):V=>{
        const point=center.map((c,i)=>c+u[i]*width*x+v[i]*height*y) as V;
        const radial=Math.hypot(point[0],point[1]);if(radial>1){point[0]/=radial;point[1]/=radial;}
        return point;
      };
      const corners=[edge(-1,-1),edge(1,-1),edge(1,1),edge(-1,1)],uv:UV[]=[[-1,offset-1],[1,offset-1],[1,offset+1],[-1,offset+1]];
      const middle=center.map((c,i)=>c+n[i]*.12) as V;
      const normals=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>unit(n.map((c,i)=>c*.8+u[i]*x*.5+v[i]*y*.5) as V));
      for(let k=0;k<4;k++)tri(middle,corners[k],corners[(k+1)%4],TREE_MATERIAL.leaf,.91+.085*(j%3)/2,[[0,offset],uv[k],uv[(k+1)%4]],[n,normals[k],normals[(k+1)%4]]);
    }
    // The high branch tip reaches the recorded height; cutouts still keep its
    // edge leafy. No source height or crown radius is inflated for the effect.
    const top=triangles.filter(t=>t.kind===TREE_MATERIAL.leaf).flatMap(t=>t.points).reduce((a,b)=>a[2]>b[2]?a:b);top[2]=1;
  }else{
    stem([0,0,0],[.025*(variant?1:-1),0,.99],.07,.013,6);
    // Many short sprays distributed around the trunk form overlapping boughs.
    // Each has four folds, a connected central twig and needle cutouts; the
    // outline comes from separate branch tips rather than solid conical rings.
    // The shared feather reduction funds this denser conifer within the same
    // whole-scene cap while retaining the stricter local Quad reservation.
    for(let tier=0;tier<6;tier++)for(let j=0;j<8;j++){
      const id=tier*8+j,a=j*TAU/8+tier*2.399963+variant*.43,dx=Math.cos(a),dy=Math.sin(a);
      const z=.255+tier*.123+.012*Math.sin(id*1.7),r=(1-tier*.145)*(.96+.035*Math.sin(id));
      const at=(t:number,side:number,height:number):V=>[dx*t*r-dy*side*r,dy*t*r+dx*side*r,height];
      const root=at(.04,0,z+.09),left=at(.48,-.38,z+.025),right=at(.53,.38,z+.01),tip=at(1,0,z-.045),middle=at(.51,0,z+.065),offset=id*4;
      const corners=[root,left,tip,right],uv:UV[]=[[0,offset-1],[-1,offset],[0,offset+1],[1,offset]],n=normal(root,left,right);
      for(let k=0;k<4;k++){
        const next=(k+1)%4,face=normal(middle,corners[k],corners[next]),bend=unit(n.map((v,i)=>v+face[i]) as V);
        tri(middle,corners[k],corners[next],TREE_MATERIAL.needle,.88+.07*(id%5)/4,[[0,offset],uv[k],uv[next]],[n,bend,bend]);
      }
    }
    for(let j=0;j<4;j++){const a=j*TAU/4,b=(j+1)*TAU/4;tri([0,0,1],[Math.cos(a)*.1,Math.sin(a)*.1,.90],[Math.cos(b)*.1,Math.sin(b)*.1,.90],TREE_MATERIAL.needle,.92,[[0,0],[.02,.04],[-.02,.04]]);}
  }
  // Keep shared templates deeply immutable: one mapped instance must never
  // distort the following tree when transformed or when a worker is reused.
  for(const triangle of triangles){for(const key of ['points','uv','normals'] as const){for(const value of triangle[key])Object.freeze(value);Object.freeze(triangle[key]);}Object.freeze(triangle);}
  const result=Object.freeze({form,variant,triangles:Object.freeze(triangles)});cache.set(key,result);return result;
}

export function addTreePrototype(mesh:TreeMeshWriter,prototype:TreePrototype,position:[number,number],height:number,radius:number,rotation:number,green:Color,bark:Color,anchor:number):void{
  const cosine=Math.cos(rotation),sine=Math.sin(rotation);
  const transform=(p:readonly number[]):V=>[position[0]+radius*(p[0]*cosine-p[1]*sine),position[1]+radius*(p[0]*sine+p[1]*cosine),p[2]*height];
  const transformNormal=(n:readonly number[]):V=>unit([(n[0]*cosine-n[1]*sine)/radius,(n[0]*sine+n[1]*cosine)/radius,n[2]/height]);
  for(const triangle of prototype.triangles){
    const color=triangle.kind===TREE_MATERIAL.bark||triangle.kind===TREE_MATERIAL.palmBark?bark:green;
    const uv=triangle.kind===TREE_MATERIAL.bark||triangle.kind===TREE_MATERIAL.palmBark?triangle.uv.map(p=>[p[0]*radius*.7,p[1]*height] as UV):triangle.uv.map(p=>[...p] as UV);
    mesh.triangle(...triangle.points.map(transform) as [V,V,V],color.map(c=>c*triangle.shade) as Color,triangle.kind,anchor,uv as [UV,UV,UV],triangle.normals.map(transformNormal) as [V,V,V]);
  }
}
