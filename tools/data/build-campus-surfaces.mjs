#!/usr/bin/env node
// Reproducible, bounded ground detail from the same pinned OSM extracts as buildings.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseOsm,pointInRing} from './fetch-stanford.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const CORE_BOUNDS=[-122.174,37.424,-122.165,37.432];
export const QUAD_PLANTING_IDS=['30775532','30775534','30775535','30775536','30775539','30775540','30775541','30775542'];
export const SURFACE_TAGS=['name','highway','surface','width','lanes','lanes:forward','lanes:backward','lane_markings','access','foot','bicycle','bus','psv','motor_vehicle','motorcar','oneway','junction','sidewalk','sidewalk:both','sidewalk:left','sidewalk:right','crossing','crossing:markings','crossing:signals','crossing:island','footway','cycleway','tactile_paving','kerb','area','covered','tunnel'];
const ovalWays=new Set(['696196334','441658681','8949167','696196333']);
const names=new Set(['Jane Stanford Way','Palm Drive','Lasuen Mall','Escondido Mall','Santa Teresa Street','Duena Street']);
// These mapped routes cross Memorial Court's lawns; unlike the Inner Quad they
// are actual separate walks. No all-purpose path network is painted over plazas.
const courtWays=new Set(['31011817','31705912','591686696','689427789','689427791','696250797','696250998']);
const inBounds=([x,y])=>x>=CORE_BOUNDS[0]&&x<=CORE_BOUNDS[2]&&y>=CORE_BOUNDS[1]&&y<=CORE_BOUNDS[3];
const kept=e=>Object.fromEntries(SURFACE_TAGS.filter(k=>e.tags[k]!==undefined).map(k=>[k,e.tags[k]]));
const coordinates=(e,elements)=>e.nodes.map(id=>elements.get('node/'+id)?.coordinate);
const sorted=elements=>[...elements.values()].sort((a,b)=>a.type.localeCompare(b.type)||Number(a.id)-Number(b.id));

export function surfaceDescription(tags,{court=false}={}){
  const source=tags.surface;
  if(source==='asphalt')return {modeledSurface:'asphalt',surfaceEvidence:'osm-tag'};
  if(source==='concrete')return {modeledSurface:'concrete',surfaceEvidence:'osm-tag'};
  if(['paving_stones','bricks','brick'].includes(source))return {modeledSurface:'pavers',surfaceEvidence:'osm-tag'};
  if(court)return {modeledSurface:'concrete',surfaceEvidence:'stanford-quad-aerial-2008'};
  if(tags.name==='Lasuen Mall')return {modeledSurface:'asphalt',surfaceEvidence:'stanford-lasuen-2023'};
  return {modeledSurface:'unknown',surfaceEvidence:'unverified'};
}

export function roadWidth(tags,{court=false,mainWalk=false}={}){
  const raw=tags.width,number=typeof raw==='string'&&/^\d+(?:\.\d+)?(?:\s*m)?$/.test(raw)?Number(raw.replace(/\s*m$/,'')):NaN;
  if(Number.isFinite(number)&&number>0&&number<=30)return {modeledWidth:number,widthSource:'osm-tag'};
  const lanes=Number(tags.lanes),h=tags.highway;
  const width=court?(mainWalk?5.5:2.4):['unclassified','residential'].includes(h)?(tags.oneway==='yes'?3.7:Math.max(1,Math.min(2,lanes||2))*3.3+0.8):h==='service'?(tags.oneway==='yes'?4.2:5.5):h==='living_street'?(tags.oneway==='yes'?3.5:6):h==='pedestrian'?5:h==='cycleway'?3:2.4;
  return {modeledWidth:width,widthSource:'class-estimate'};
}

export function deriveMainQuadSurface(elements){
  const ids=['27520214',...QUAD_PLANTING_IDS],ways=ids.map(id=>elements.get('way/'+id));
  if(ways.some(w=>!w))throw new Error('Main Quad courtyard or planted source way is missing.');
  const rings=ways.map(w=>coordinates(w,elements));
  for(const ring of rings)if(ring.length<4||ring.some(p=>!p)||JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))throw new Error('Main Quad surface needs complete closed source rings.');
  if(rings.slice(1).some(r=>r.some(p=>!pointInRing(p,rings[0]))))throw new Error('Quad planting hole leaves the mapped courtyard.');
  return {type:'Feature',id:'derived/main-quad-paving',properties:{id:'derived/main-quad-paving',version:1,kind:'plaza',name:'Main Quad',modeledSurface:'pavers',surfaceEvidence:'stanford-main-quad-pavers',geometrySource:'mapped-courtyard-minus-mapped-planting',sourceIds:['relation/35820',...ids.map(id=>'way/'+id)]},geometry:{type:'Polygon',coordinates:rings}};
}

export function deriveRoutes(elements){
  const streets=[],crossings=[],excluded=[];
  const streetWays=new Map();
  for(const way of sorted(elements).filter(e=>e.type==='way')){
    const court=courtWays.has(way.id);
    if(!court&&!names.has(way.tags.name))continue;
    const points=coordinates(way,elements),id='way/'+way.id;
    if(points.length<2||points.some(p=>!p)){excluded.push({id,reason:'incomplete-source-way'});continue;}
    if(!points.every(inBounds)){excluded.push({id,reason:'outside-bounded-core'});continue;}
    if(way.tags.highway==='construction'||way.tags.tunnel==='building_passage'||way.tags.covered==='yes'){excluded.push({id,reason:'construction-or-covered-route'});continue;}
    const properties={id,version:way.version,kind:'street',...kept(way),...surfaceDescription(way.tags,{court}),...roadWidth(way.tags,{court,mainWalk:way.id==='591686696'}),...(court?{areaName:'Memorial Court'}:{}),...(ovalWays.has(way.id)?{modeledCurbHeight:0.10,curbEvidence:'stanford-oval-aerial-2019'}:{})};
    const feature={type:'Feature',id,properties,geometry:{type:'LineString',coordinates:points}};
    streets.push(feature);streetWays.set(way.id,{way,feature});
  }
  for(const node of sorted(elements).filter(e=>e.type==='node'&&e.tags.highway==='crossing'&&inBounds(e.coordinate))){
    const parent=[...streetWays.values()].find(({way})=>way.nodes.includes(node.id));
    if(!parent)continue;
    const {way,feature}=parent,index=way.nodes.indexOf(node.id),points=feature.geometry.coordinates,a=points[Math.max(0,index-1)],b=points[Math.min(points.length-1,index+1)];
    const dx=(b[0]-a[0])*Math.cos(node.coordinate[1]*Math.PI/180),dy=b[1]-a[1];
    if(Math.hypot(dx,dy)<1e-12)throw new Error('Crossing road tangent is degenerate: node/'+node.id);
    const id='node/'+node.id;
    crossings.push({type:'Feature',id,properties:{id,version:node.version,kind:'crossing',...kept(node),modeledSurface:feature.properties.modeledSurface,surfaceEvidence:feature.properties.surfaceEvidence,modeledWidth:3,widthSource:'class-estimate',modeledBearing:(Math.atan2(dx,dy)*180/Math.PI+360)%360,orientationSource:'way/'+way.id,roadWidth:feature.properties.modeledWidth},geometry:{type:'Point',coordinates:node.coordinate}});
  }
  return {streets,crossings,excluded};
}

export async function buildCampusSurfaces({sourceDir,outputDir=path.join(root,'public/data')}){
  const original=JSON.parse(await readFile(path.join(root,'public/data/stanford-provenance.json'),'utf8')),elements=new Map();
  for(const source of original.sources){
    const bytes=await readFile(path.join(sourceDir,source.file));
    if(digest(bytes)!==source.sha256)throw new Error(`Surface source ${source.file} differs from its pinned SHA-256.`);
    for(const e of parseOsm(bytes.toString('utf8'))){const key=e.type+'/'+e.id,old=elements.get(key);if(!old||e.version>old.version)elements.set(key,e);}
  }
  const {streets,crossings,excluded}=deriveRoutes(elements),quad=deriveMainQuadSurface(elements);
  const features=[quad,...streets,...crossings],collection={type:'FeatureCollection',features};
  const data=JSON.stringify(collection)+'\n',filename='stanford-surfaces.geojson';
  const segmentCount=streets.reduce((n,f)=>n+f.geometry.coordinates.length-1,0);
  if(segmentCount>320)throw new Error(`Bounded surface routes exceed 320 segments: ${segmentCount}`);
  const provenance={schemaVersion:1,derivedFromFetchedAt:original.fetchedAt,source:'Existing pinned OpenStreetMap API 0.6 bounded extracts',attribution:original.attribution,license:original.license,licenseUrl:original.licenseUrl,sourceProvenance:'stanford-provenance.json',sources:original.sources,coreBounds:CORE_BOUNDS,retainedTags:SURFACE_TAGS,selection:'Complete named Jane Stanford Way, Palm Drive, Lasuen Mall, Escondido Mall, Santa Teresa Street and Duena Street source ways entirely inside coreBounds, excluding construction and covered routes; Santa Teresa includes explicitly mapped zebra markings (way/1543344570 and node/4913257330, corroborated by crossing way/500221862); seven explicitly listed Memorial Court walks; mapped crossing nodes belonging to those selected ways. Inner Quad paving is an authored ground interpretation of relation/35820 inner way/27520214 with eight exact mapped wood outlines removed. No inferred crossing locations, resampled centerlines or random road markings.',counts:{plazas:1,streets:streets.length,crossings:crossings.length,streetSegments:segmentCount},excluded,modelLimits:'This is bounded campus-core ground detail, not a survey or exhaustive campus surface inventory. Coordinates and retained source tags are unchanged. Widths with widthSource=class-estimate, crosswalk width, curb dimensions (0.10 m low-curb interpretation only along the four photographed Oval/Palm Drive segments), texture scale and joint patterns are estimates. Unknown source surfaces remain unknown except the documented Memorial Court and Lasuen photographic interpretations. The 2023 Lasuen image establishes asphalt in that corridor; extending that material across selected Lasuen segments is an inference, not per-segment photographic verification. Crossing positions are mapped; only explicit crossing:markings supplies a paint style. Missing/unmarked tags never imply zebra stripes. Recent construction may have changed some segments.',mainQuad:{outer:'way/27520214',holes:QUAD_PLANTING_IDS.map(id=>'way/'+id),sourceVersions:Object.fromEntries(['35820','27520214',...QUAD_PLANTING_IDS].map(id=>{const key=(id==='35820'?'relation/':'way/')+id;return [key,elements.get(key)?.version];})),limitations:'Courtyard ring is a building-relation void, not an OSM surface polygon; paving assignment is an authored interpretation of inspected photographs and Stanford preservation text. Eight planting holes remain empty. Pattern and unit dimensions are not a measured paving plan.'},references:[{id:'stanford-main-quad-pavers',url:'https://stanfordmag.org/contents/progress-meets-preservation',date:'2015-03',observed:'Stanford preservation account identifies historic red-and-white pavers around Main Quad; does not supply present-day measured layout.'},{id:'stanford-quad-aerial-2008',url:'https://web.stanford.edu/~siegelr/stanford/1000feet.html',image:'https://web.stanford.edu/~siegelr/stanford/1000feet/IMG_4990%20sunlight%20on%20the%20quad%20resized.jpg',date:'2008-05-17',observed:'Inspected image: continuous muted rose paving throughout Inner Quad around eight planting islands; Memorial Court has pale crossed walks around lawn triangles. Historic photograph, not current surface condition.'},{id:'stanford-quad-paving-close-2013',url:'https://web.stanford.edu/~siegelr/stanford/quad.html',image:'https://web.stanford.edu/~siegelr/stanford/quad/IMG_8273%20cleaning%20the%20quad%20%208-23-13.JPG',date:'2013-08-23',observed:'Inspected close photograph at the Quad gateway: muted rose and gray small rounded rectangular interlocking or cobble-like pavers with dark joints. Unit dimensions and exact bond are unmeasured. Covered-arcade red/cream diagonal tiles are a separate surface and must not be applied across the open courtyard.'},{id:'stanford-oval-aerial-2019',url:'https://web.stanford.edu/~siegelr/stanford/1000feet.html',image:'https://web.stanford.edu/~siegelr/flying/heli-flyover2019/0T1A6621%20the%20oval%20-%20stanford%20from%20helicopter%2006-23-2019%20Canon%20EOS%207D%20Mark%20II.jpg',date:'2019-06-23',observed:'Inspected image: dark asphalt Oval roadway and Jane Stanford Way, pale sidewalks/curbs and distinct marked crossings. Does not establish current crossing paint at every mapped node.'},{id:'stanford-lasuen-2023',url:'https://fsl.stanford.edu/how-join',image:'https://fsl.stanford.edu/sites/g/files/sbiybj23256/files/styles/breakpoint_2xl_2x/public/media/image/20230823_stanford_summer_n6a9412_0.jpg?itok=xB3t2NSa',date:'2023-08-23',observed:'Inspected Stanford photograph: Lasuen sign, dark asphalt circulation lane, pale concrete walks, brick edging and concrete tree planters. Does not justify paving the entire mall in brick.'},{id:'stanford-circulation-project-2023',url:'https://news.stanford.edu/stories/2023/01/navigating-campus-construction',date:'2023-01',observed:'University report describes Lasuen/Escondido circulation and roundabout changes; retained construction-tagged ways are excluded from normal surfaced routes.'}],outputs:{[filename]:{bytes:Buffer.byteLength(data),sha256:digest(data)}},featureGeometryHashes:Object.fromEntries(features.map(f=>[f.properties.id,digest(JSON.stringify(f.geometry))]))};
  await mkdir(outputDir,{recursive:true});await writeFile(path.join(outputDir,filename),data);await writeFile(path.join(outputDir,'stanford-surfaces-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  return {collection,provenance};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const sourceDir=process.argv[2];if(!sourceDir)throw new Error('Usage: node tools/data/build-campus-surfaces.mjs <pinned-source-directory> [output-directory]');
  const {provenance}=await buildCampusSurfaces({sourceDir,outputDir:process.argv[3]});console.log(JSON.stringify(provenance.counts));
}
