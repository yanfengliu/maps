import type {CampusData,Point} from './building-geometry.ts';
import {VERTEX_FLOATS} from './building-geometry.ts';
import {HOSPITAL_EXTERIORS} from './hospital-exteriors.ts';
import {PASTEUR_300_ID} from './pasteur-pods.ts';

export const HOSPITAL_PICK_IDS=new Set([PASTEUR_300_ID,...Object.keys(HOSPITAL_EXTERIORS)]);
type HitVertex=[number,number,number];
type Surface={id:string;index:number;start:number;end:number};

/** Retain small ranges into the same roof buffer used by the renderer. The
 * three stepped buildings submit every podium, wing, fin and roof light there.
 * At 300 Pasteur it also contains the complete base shell and six upper tiers. */
export function hospitalSurfacePicker(data:CampusData,roofs:Float32Array) {
  const byIndex=new Map<number,string>();
  data.features.forEach((f,i)=>{const id=String(f.properties?.id);if(HOSPITAL_PICK_IDS.has(id))byIndex.set(i,id);});
  const surfaces:Surface[]=[];
  let last:Surface|undefined;
  for(let i=0;i<roofs.length;i+=3*VERTEX_FLOATS){
    const index=roofs[i+12],id=byIndex.get(index);
    if(!id)continue;
    if(last?.index===index&&last.end===i)last.end+=3*VERTEX_FLOATS;
    else{last={id,index,start:i,end:i+3*VERTEX_FLOATS};surfaces.push(last);}
  }
  return (point:Point,matrix:Float32Array,buildingDatum:(index:number)=>number|null,groundDatum:(x:number,y:number)=>number|null):string|null=>{
    let nearest=Infinity,selected:string|null=null;
    for(const {id,index,start,end} of surfaces){
      const datum=buildingDatum(index);
      if(datum===null)continue;
      const clip=(offset:number):HitVertex|null=>{
        const x=roofs[offset],y=roofs[offset+1],height=roofs[offset+2];
        const ground=height<=.03?groundDatum(x,y):datum;
        if(ground===null)return null;
        const z=ground+height,w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
        if(w<=0)return null;
        return [(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w,(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w,(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w];
      };
      for(let i=start;i<end;i+=3*VERTEX_FLOATS){
        // Foundation skirts are below the terrain surface and cannot be picked.
        if(roofs[i+2]<0||roofs[i+VERTEX_FLOATS+2]<0||roofs[i+2*VERTEX_FLOATS+2]<0)continue;
        const a=clip(i),b=clip(i+VERTEX_FLOATS),c=clip(i+2*VERTEX_FLOATS);
        if(!a||!b||!c)continue;
        const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
        if(Math.abs(den)<1e-16)continue;
        const u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/den;
        const v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/den;
        const t=1-u-v;
        if(u<0||v<0||t<0)continue;
        const depth=u*a[2]+v*b[2]+t*c[2];
        if(depth>=-1&&depth<=1&&depth<nearest){nearest=depth;selected=id;}
      }
    }
    return selected;
  };
}

/** Preserve native distance order for other buildings. Only a stepped hospital
 * whose visible triangles meet the click may occupy a hospital candidate. */
export function selectHospitalSurface(candidates:Record<string,unknown>[],hospital:Record<string,unknown>|null):Record<string,unknown>|undefined {
  for(const p of candidates){
    if(!HOSPITAL_PICK_IDS.has(String(p.id)))return p;
    if(hospital&&p.id===hospital.id)return hospital;
  }
  return hospital??undefined;
}
