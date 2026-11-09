import type {CampusRoadData} from './campus-road-layer.ts';

export type RoadMaterial='unknown'|'asphalt'|'concrete'|'pavers';
type Feature=CampusRoadData['features'][number];
type Point=readonly number[];
type Link={index:number;end?:number;angle:number};
const known=(material:unknown):material is Exclude<RoadMaterial,'unknown'>=>['asphalt','concrete','pavers'].includes(String(material));
const distance=(a:Point,b:Point)=>Math.hypot((a[0]-b[0])*88400,(a[1]-b[1])*111320);
const crossing=(p:Feature['properties'])=>['footway','cycleway','path'].some(key=>p[key]==='crossing')||Boolean(p.crossing&&!['no','none'].includes(String(p.crossing)));
const covered=(p:Feature['properties'])=>p.covered==='yes'||p.tunnel==='building_passage';

/** Rendering interpretation only: source tags, source evidence and geometry are
 * retained verbatim. A missing tag is not evidence of a physical material seam. */
export function resolveRoadMaterials(source:CampusRoadData){
  const features:(Feature&{properties:Feature['properties']&{renderSurface:RoadMaterial;renderSurfaceEvidence:string;renderSurfaceSources:string[]}})[]=source.features.map(feature=>({...feature,properties:{...feature.properties,renderSurface:feature.properties.modeledSurface as RoadMaterial,renderSurfaceEvidence:feature.properties.surfaceEvidence,renderSurfaceSources:[] as string[]}}));
  // These are explicit OSM materials, not missing-data guesses. Cobbles use a
  // stone tone in the native palette rather than the brick/paver default.
  for(const f of features){
    const surface=String(f.properties.surface??'');
    if(['concrete:plates','concrete:lanes'].includes(surface)){f.properties.renderSurface='concrete';f.properties.renderSurfaceEvidence='osm-tag';}
    if(['sett','unhewn_cobblestone','cobblestone'].includes(surface)){f.properties.renderSurface='pavers';f.properties.renderSurfaceEvidence='osm-tag';}
  }
  const eligible=(f:Feature)=>f.geometry.type==='LineString'&&f.properties.modeledSurface==='unknown'&&f.properties.surfaceEvidence==='unverified'&&(!f.properties.surface||f.properties.surface==='paved');
  const nodes=new Map<string,{index:number;point:number}[]>();
  features.forEach((f,index)=>{if(f.geometry.type==='LineString')f.properties.sourceNodeIds.forEach((node,point)=>{const list=nodes.get(node)??[];list.push({index,point});nodes.set(node,list);});});
  const direction=(points:Point[],at:number,step:number)=>{
    const origin=points[at];let target=origin;
    for(let i=at+step;i>=0&&i<points.length;i+=step){target=points[i];if(distance(origin,target)>=8)break;}
    const x=(target[0]-origin[0])*88400,y=(target[1]-origin[1])*111320,length=Math.hypot(x,y);
    return length>1e-6?[x/length,y/length]:null;
  };
  const links=new Map<number,(Link|null)[]>();
  features.forEach((f,index)=>{
    if(!eligible(f)||f.geometry.type!=='LineString')return;
    const points=f.geometry.coordinates,p=f.properties;
    const ends=[0,points.length-1].map((at,end):Link|null=>{
      const inward=direction(points,at,end===0?1:-1);if(!inward)return null;
      const candidates=new Map<number,Link>();
      for(const entry of nodes.get(p.sourceNodeIds[at])??[]){
        if(entry.index===index)continue;
        const other=features[entry.index],q=other.properties;if(other.geometry.type!=='LineString')continue;
        const otherEnd=entry.point===0?0:entry.point===other.geometry.coordinates.length-1?1:undefined;
        for(const step of [-1,1]){
          if(entry.point+step<0||entry.point+step>=other.geometry.coordinates.length)continue;
          const away=direction(other.geometry.coordinates,entry.point,step);if(!away)continue;
          const angle=Math.acos(Math.max(-1,Math.min(1,-inward[0]*away[0]-inward[1]*away[1])))*180/Math.PI;
          if(angle>35)continue;
          if(!candidates.has(entry.index)||candidates.get(entry.index)!.angle>angle)candidates.set(entry.index,{index:entry.index,end:otherEnd,angle});
        }
      }
      const ranked=[...candidates.values()].sort((a,b)=>a.angle-b.angle);
      // Two almost equally aligned forks cannot establish one physical path.
      if(!ranked.length||(ranked.length>1&&ranked[1].angle-ranked[0].angle<10))return null;
      const selected=ranked[0],q=features[selected.index].properties;
      if(eligible(features[selected.index])&&selected.end===undefined)return null;
      // Choose geometric continuation before testing its metadata. Skipping a
      // closer crossing/sidewalk/roundabout branch would select false evidence.
      if(p.highway!==q.highway||String(p.name??'')!==String(q.name??'')||String(p.junction??'')!==String(q.junction??'')||String(p.footway??'')!==String(q.footway??'')||crossing(p)!==crossing(q)||covered(p)!==covered(q)||Math.abs(Number(p.modeledWidth)-Number(q.modeledWidth))>1e-6)return null;
      return selected;
    });
    links.set(index,ends);
  });
  const visited=new Set<number>(),inferred:{id:string;surface:RoadMaterial;sources:string[]}[]=[],unresolved:Record<string,number>={};
  for(const start of links.keys()){
    if(visited.has(start))continue;
    const members:number[]=[],stack=[start],anchors=new Set<number>();let reason='';
    while(stack.length){
      const index=stack.pop()!;if(visited.has(index))continue;visited.add(index);members.push(index);
      for(const [end,link] of links.get(index)!.entries()){
        if(!link){reason='unanchored-or-ambiguous';continue;}
        if(links.has(link.index)){
          const reverse=link.end===undefined?null:links.get(link.index)![link.end];
          if(!reverse||reverse.index!==index||reverse.end!==end){reason='nonreciprocal-junction';continue;}
          if(!visited.has(link.index))stack.push(link.index);
        }else anchors.add(link.index);
      }
    }
    const length=members.reduce((sum,index)=>{const g=features[index].geometry;return sum+(g.type==='LineString'?g.coordinates.slice(1).reduce((n,p,i)=>n+distance(g.coordinates[i],p),0):0);},0);
    const materials=new Set([...anchors].map(index=>features[index].properties.renderSurface));
    if(anchors.size<2)reason='fewer-than-two-independent-anchors';
    if(materials.size>1)reason='conflicting-anchored-materials';
    if([...anchors].some(index=>!known(features[index].properties.renderSurface)||features[index].properties.renderSurfaceEvidence==='unverified'))reason='unsupported-anchor-material';
    if(members.length>16||length>500)reason='beyond-bounded-continuity';
    if(reason){unresolved[reason]=(unresolved[reason]??0)+members.length;continue;}
    const surface=[...materials][0],sourceIds=[...anchors].map(index=>features[index].properties.id).sort();
    for(const index of members){const p=features[index].properties;p.renderSurface=surface;p.renderSurfaceEvidence='bounded-source-continuity-inference';p.renderSurfaceSources=sourceIds;inferred.push({id:p.id,surface,sources:sourceIds});}
  }
  return {data:{...source,features},audit:{features:features.length,inferred,unresolved,unknown:features.filter(f=>f.properties.renderSurface==='unknown').length,unverified:features.filter(f=>f.properties.renderSurfaceEvidence==='unverified').length}};
}
