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
export const SURFACE_TAGS=['name','highway','surface','width','lanes','lanes:forward','lanes:backward','lane_markings','access','foot','bicycle','bus','psv','motor_vehicle','motorcar','oneway','junction','sidewalk','sidewalk:both','sidewalk:left','sidewalk:right','crossing','crossing:markings','crossing:signals','crossing:island','footway','cycleway','tactile_paving','kerb','area','covered','tunnel','bridge','layer','level','indoor','service','tracktype','incline','step_count','ramp','ramp:bicycle','handrail','segregated','lit','noexit','construction'];
export const CONTROL_TAGS=['highway','direction','traffic_signals','traffic_signals:direction','traffic_signals:sound','traffic_signals:vibration','traffic_signals:button_operated','stop','traffic_sign','crossing','crossing:signals','crossing:markings','button_operated','red_turn:right','red_turn:left'];
const ovalWays=new Set(['696196334','441658681','8949167','696196333']);
const names=new Set(['Jane Stanford Way','Palm Drive','Lasuen Mall','Escondido Mall','Santa Teresa Street','Duena Street']);
// These mapped routes cross Memorial Court's lawns; unlike the Inner Quad they
// are actual separate walks. No all-purpose path network is painted over plazas.
const courtWays=new Set(['31011817','31705912','591686696','689427789','689427791','696250797','696250998']);
const inBounds=([x,y])=>x>=CORE_BOUNDS[0]&&x<=CORE_BOUNDS[2]&&y>=CORE_BOUNDS[1]&&y<=CORE_BOUNDS[3];
const kept=e=>Object.fromEntries(SURFACE_TAGS.filter(k=>e.tags[k]!==undefined).map(k=>[k,e.tags[k]]));
const coordinates=(e,elements)=>e.nodes.map(id=>elements.get('node/'+id)?.coordinate);
const sorted=elements=>[...elements.values()].sort((a,b)=>a.type.localeCompare(b.type)||Number(a.id)-Number(b.id));

export function surfaceDescription(tags,{court=false,photographic=true}={}){
  const source=tags.surface;
  if(source==='asphalt')return {modeledSurface:'asphalt',surfaceEvidence:'osm-tag'};
  if(source==='concrete')return {modeledSurface:'concrete',surfaceEvidence:'osm-tag'};
  if(['paving_stones','bricks','brick'].includes(source))return {modeledSurface:'pavers',surfaceEvidence:'osm-tag'};
  if(['dirt','compacted','gravel','fine_gravel','sand','grass','ground','earth','woodchips','pebblestone'].includes(source))return {modeledSurface:'unknown',surfaceEvidence:'osm-tag',unpavedSurface:source};
  if(!source&&court)return {modeledSurface:'concrete',surfaceEvidence:'stanford-quad-aerial-2008'};
  if(!source&&photographic&&tags.name==='Lasuen Mall')return {modeledSurface:'asphalt',surfaceEvidence:'stanford-lasuen-2023'};
  return {modeledSurface:'unknown',surfaceEvidence:'unverified'};
}

export function roadWidth(tags,{court=false,mainWalk=false}={}){
  const raw=tags.width,match=typeof raw==='string'&&raw.match(/^(\d+(?:\.\d+)?)\s*(m|ft|')?$/),number=match?Number(match[1])*(match[2]==='ft'||match[2]==="'"?0.3048:1):NaN;
  if(Number.isFinite(number)&&number>0&&number<=30)return {modeledWidth:number,widthSource:'osm-tag'};
  const lanes=Number(tags.lanes),h=tags.highway;
  const motorRoad=['primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','unclassified','residential'].includes(h);
  const width=court?(mainWalk?5.5:2.4):motorRoad?(Math.max(1,Math.min(6,lanes||(tags.oneway==='yes'||h.endsWith('_link')?1:2)))*3.3+0.8):h==='service'?(tags.oneway==='yes'?4.2:tags.service==='parking_aisle'?5:5.5):h==='living_street'?(tags.oneway==='yes'?3.5:6):h==='pedestrian'?5:h==='cycleway'?3:h==='steps'?1.8:2.4;
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

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment=(p,a,b)=>Math.abs(cross(a,b,p))<1e-14&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;
const inRing=(p,ring)=>pointInRing(p,ring)||ring.slice(1).some((b,i)=>onSegment(p,ring[i],b));
const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));
export const touchesCampus=(points,ring)=>points.some(p=>inRing(p,ring))||points.slice(1).some((b,i)=>ring.slice(1).some((d,j)=>intersects(points[i],b,ring[j],d)));

// Selection is geometric, never a road-name allowlist. Every candidate receives
// an inventory decision, including excluded roads in the surrounding extracts.
export function routeExclusion(tags){
  if(tags.highway==='construction'||tags.highway==='proposed')return 'construction';
  if(tags.indoor==='yes'||tags.highway==='corridor')return 'indoor';
  if((tags.bridge&&tags.bridge!=='no')||(tags.tunnel&&!['no','building_passage'].includes(tags.tunnel))||(tags.layer&&tags.layer!=='0')||(tags.level&&tags.level!=='0'))return 'grade-separated-or-unsurveyed-level';
  return undefined;
}

export function deriveCampusRoads(elements,campusRing,{quadRing}={}){
  const ways=sorted(elements).filter(e=>e.type==='way'&&e.tags.highway),nodeWays=new Map(),features=[],inventory=[];
  for(const way of ways)for(const id of new Set(way.nodes)){if(!nodeWays.has(id))nodeWays.set(id,[]);nodeWays.get(id).push(way);}
  for(const way of ways){
    const id='way/'+way.id,points=coordinates(way,elements),row={id,version:way.version,reason:'',sourceNodes:way.nodes.length};
    inventory.push(row);
    if(points.length<2||points.some(p=>!p)){row.reason='incomplete-source-way';continue;}
    if(!touchesCampus(points,campusRing)){row.reason='outside-campus';continue;}
    const exclusion=routeExclusion(way.tags);if(exclusion){row.reason=exclusion;continue;}
    const area=way.tags.area==='yes';
    if(area&&(points.length<4||way.nodes[0]!==way.nodes.at(-1))){row.reason='unclosed-road-area';continue;}
    row.reason=area?'included-road-area':way.tags.highway==='steps'?'included-steps-surface':way.tags.covered==='yes'||way.tags.tunnel==='building_passage'?'included-covered-ground':'included-ground';
    const endpoint=(index)=>{
      if(way.nodes[0]===way.nodes.at(-1))return 'closed-loop';
      if(!inRing(points[index],campusRing))return 'continues-outside-campus';
      return nodeWays.get(way.nodes[index]).some(w=>w.id!==way.id)?'shared-source-node':'source-terminal-unverified';
    };
    const court=courtWays.has(way.id);
    const properties={id,version:way.version,kind:area?'road-area':'street',...kept(way),...surfaceDescription(way.tags,{court,photographic:points.every(inBounds)}),sourceNodeIds:[...way.nodes],coverage:points.every(p=>inRing(p,campusRing))?'inside-campus':'campus-intersecting-complete-way',...(area?{}:{...roadWidth(way.tags,{court,mainWalk:way.id==='591686696'}),endpointConnection:{start:endpoint(0),end:endpoint(points.length-1)}}),...(quadRing&&points.every(p=>inRing(p,quadRing))?{pavedAreaId:'derived/main-quad-paving'}:{})};
    features.push({type:'Feature',id,properties,geometry:{type:area?'Polygon':'LineString',coordinates:area?[points]:points}});
  }
  const retainedIds=new Set(features.map(f=>f.properties.id)),controls=[];
  for(const node of sorted(elements).filter(e=>e.type==='node'&&['stop','traffic_signals'].includes(e.tags.highway))){
    const attached=nodeWays.get(node.id)||[],retained=attached.filter(w=>retainedIds.has('way/'+w.id));
    if(!inRing(node.coordinate,campusRing)&&retained.length===0)continue;
    const id='node/'+node.id,rawTags=Object.fromEntries(CONTROL_TAGS.filter(k=>node.tags[k]!==undefined).map(k=>[k,node.tags[k]]));
    controls.push({type:'Feature',id,properties:{id,version:node.version,kind:'traffic-control',...rawTags,controlType:node.tags.highway,placement:attached.length?'road-control-point':'unresolved-control-point',physicalPoleVerified:false,directionStatus:node.tags.direction||node.tags['traffic_signals:direction']?'source-tagged':'unknown',sourceWayIds:attached.map(w=>'way/'+w.id),retainedWayIds:retained.map(w=>'way/'+w.id)},geometry:{type:'Point',coordinates:node.coordinate}});
  }
  return {features,inventory,controls};
}

export const ROAD_SHARD_BYTES=900*1024;
export function shardRoadFeatures(features,maxBytes=ROAD_SHARD_BYTES){
  const shards=[],prefix='{"type":"FeatureCollection","features":[',suffix=']}\n';let group=[],size=Buffer.byteLength(prefix+suffix);
  for(const feature of features){
    const bytes=Buffer.byteLength(JSON.stringify(feature));
    if(bytes+Buffer.byteLength(prefix+suffix)>maxBytes)throw new Error('Single road feature exceeds shard byte limit.');
    if(size+bytes+(group.length?1:0)>maxBytes){shards.push(prefix+group.join(',')+suffix);group=[];size=Buffer.byteLength(prefix+suffix);}
    size+=bytes+(group.length?1:0);group.push(JSON.stringify(feature));
  }
  if(group.length)shards.push(prefix+group.join(',')+suffix);
  return shards;
}

async function writeCampusRoads(elements,outputDir,original,campusBytes,quad){
  const campus=JSON.parse(campusBytes),campusRing=campus.features[0].geometry.coordinates[0];
  const {features,inventory,controls}=deriveCampusRoads(elements,campusRing,{quadRing:quad.geometry.coordinates[0]});
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(const f of features)for(const p of f.geometry.type==='Polygon'?f.geometry.coordinates.flat():f.geometry.coordinates){bounds[0]=Math.min(bounds[0],p[0]);bounds[1]=Math.min(bounds[1],p[1]);bounds[2]=Math.max(bounds[2],p[0]);bounds[3]=Math.max(bounds[3],p[1]);}
  const count=group=>({streets:group.filter(f=>f.geometry.type==='LineString').length,roadAreas:group.filter(f=>f.geometry.type==='Polygon').length,streetSegments:group.filter(f=>f.geometry.type==='LineString').reduce((s,f)=>s+f.geometry.coordinates.length-1,0)});
  const shards=shardRoadFeatures(features),files=shards.map((bytes,i)=>({file:`stanford-surfaces-roads-${i}.geojson`,features:JSON.parse(bytes).features.length,bytes:Buffer.byteLength(bytes),sha256:digest(bytes),counts:count(JSON.parse(bytes).features)}));
  const inventoryFile='stanford-surfaces-road-inventory.json',inventoryBytes=JSON.stringify({schemaVersion:1,fields:['id','version','decision','sourceNodes'],records:inventory.map(r=>[r.id,r.version,r.reason,r.sourceNodes])})+'\n';
  const controlFile='stanford-surfaces-controls.geojson',controlBytes=JSON.stringify({type:'FeatureCollection',features:controls})+'\n';
  const decisions=Object.fromEntries([...new Set(inventory.map(r=>r.reason))].sort().map(reason=>[reason,inventory.filter(r=>r.reason===reason).length]));
  const manifest={schemaVersion:1,files,counts:count(features),bounds,campusBoundary:'stanford-campus.geojson',campusBoundarySha256:digest(campusBytes),inventory:{file:inventoryFile,bytes:Buffer.byteLength(inventoryBytes),sha256:digest(inventoryBytes),candidates:inventory.length,decisions},controls:{file:controlFile,bytes:Buffer.byteLength(controlBytes),sha256:digest(controlBytes),counts:{stop:controls.filter(f=>f.properties.controlType==='stop').length,traffic_signals:controls.filter(f=>f.properties.controlType==='traffic_signals').length,directionUnknown:controls.filter(f=>f.properties.directionStatus==='unknown').length}},sourceProvenance:'stanford-provenance.json',sources:original.sources,retainedTags:SURFACE_TAGS,retainedControlTags:CONTROL_TAGS,selection:'Every complete highway-tagged source way intersecting the mapped Stanford campus polygon is inventoried. Exterior ground routes, including mapped steps and covered ground passages, retain their complete original geometry beyond the campus boundary. Closed area=yes highway ways are polygons. Indoor, construction, bridge, tunnel and nonzero/unsurveyed-level routes are inventoried but not painted at ground level. No clipping, snapping, simplification or invented connections. Main Quad centerlines wholly within its paving polygon have pavedAreaId to avoid drawing fictitious contrasting paths.',limitations:'This covers the eligible roads present in the pinned extracts, not a claim that OSM is complete or every route is current or photographically checked. Surface unknowns stay unknown, explicit unpaved tags are retained; source width wins, otherwise class-estimate widths are unmeasured. The retained steps show mapped route coverage only, not surveyed stair elevations. Endpoint source-terminal-unverified means no other highway way shares that node in these extracts, not a verified physical dead end. Native rendering retains access-restricted routes as geometry, not permission to travel them. Traffic control nodes represent mapped control locations; physical pole positions and orientations are not established. Raw direction values forward/backward refer to source way direction, not global compass bearings.',references:[{id:'stanford-bikeways-2024',url:'https://transportation.stanford.edu/sites/g/files/sbiybj27281/files/media/file/bikeways-map.pdf',date:'2024-11-05',supports:'Official map establishes campus-wide roads, bicycle and pedestrian circulation and restricted zones; not a survey of surface widths or per-segment materials.'},{id:'stanford-pedestrian-zone',url:'https://transportation.stanford.edu/parking-stanford/where-park/parking-stanford-campus/pedestrian-zone-access',supports:'Official central-campus pedestrian zone includes permitted service/delivery access. Pedestrian streets must not receive invented general-traffic lane arrows.'},{id:'jane-stanford-way-contractor',url:'https://www.mcguireandhester.com/jane-stanford-way-utility-replacement/',supports:'Primary project contractor describes asphalt walking mall used by buses and emergency vehicles. This does not justify assigning asphalt to every unmapped campus surface.'}]};
  const outputs=[...files.map((f,i)=>[f.file,shards[i]]),[inventoryFile,inventoryBytes],[controlFile,controlBytes],['stanford-surfaces-roads-manifest.json',JSON.stringify(manifest,null,2)+'\n']];
  for(const [file,bytes] of outputs){if(Buffer.byteLength(bytes)>=1024*1024)throw new Error(`${file} exceeds repository 1 MiB limit.`);await writeFile(path.join(outputDir,file),bytes);}
  return manifest;
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
  await mkdir(outputDir,{recursive:true});
  const roads=await writeCampusRoads(elements,outputDir,original,await readFile(path.join(root,'public/data/stanford-campus.geojson')),quad);
  provenance.campusRoads={manifest:'stanford-surfaces-roads-manifest.json',counts:roads.counts,coverage:'Full eligible campus-intersecting highway way coverage uses native map layers; this small custom-mesh file is retained only for Quad paving and the previously evidenced curb/crossing detail.'};
  await writeFile(path.join(outputDir,filename),data);await writeFile(path.join(outputDir,'stanford-surfaces-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  return {collection,provenance};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const sourceDir=process.argv[2];if(!sourceDir)throw new Error('Usage: node tools/data/build-campus-surfaces.mjs <pinned-source-directory> [output-directory]');
  const {provenance}=await buildCampusSurfaces({sourceDir,outputDir:process.argv[3]});console.log(JSON.stringify(provenance.counts));
}
