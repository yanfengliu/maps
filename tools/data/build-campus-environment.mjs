#!/usr/bin/env node
// Derive a separate environment input from the existing, pinned OSM extracts.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOsm, pointInRing } from './fetch-stanford.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const local = p => [(p[0] + 122.1697) * 88_400, (p[1] - 37.4278) * 111_320];
export function segmentDistance(point, a, b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;
  return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);
}
export function insidePolygon(point, polygon) {
  return pointInRing(point,polygon[0])&&!polygon.slice(1).some(hole=>pointInRing(point,hole));
}
export function footprintClearance(point, polygons) {
  let nearest=Infinity;
  for(const polygon of polygons){
    if(insidePolygon(point,polygon))return -1;
    for(const ring of polygon)for(let i=1;i<ring.length;i++)nearest=Math.min(nearest,segmentDistance(point,ring[i-1],ring[i]));
  }
  return nearest;
}
const kind = tags => tags.natural==='tree'?'tree':tags.amenity==='bench'?'bench':tags.highway==='street_lamp'?'lamp':null;
const tagsKept = ['species','genus','leaf_type','leaf_cycle','height','circumference','diameter_crown','direction','name','backrest','material','armrest','barrier'];
const quadSeatWalls=new Set(['30775532','30775534','30775535','30775536','30775539','30775540','30775541','30775542']);
const bingTeak=new Set(['5831701380','5831701381','5831701382','5831701383','5831701384']);
const closestPoint=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy,t=q?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q)):0;return [a[0]+dx*t,a[1]+dy*t];};

export async function buildCampusEnvironment({ sourceDir, outputDir = path.join(root,'public/data') }) {
  const originalProvenance=JSON.parse(await readFile(path.join(root,'public/data/stanford-provenance.json'),'utf8'));
  const campus=JSON.parse(await readFile(path.join(root,'public/data/stanford-campus.geojson'),'utf8')).features[0].geometry.coordinates[0];
  const buildings=JSON.parse(await readFile(path.join(root,'public/data/stanford-buildings.geojson'),'utf8'));
  const elements=new Map();
  for(const source of originalProvenance.sources){
    const bytes=await readFile(path.join(sourceDir,source.file));
    if(digest(bytes)!==source.sha256)throw new Error(`Campus environment source ${source.file} differs from the pinned building extract; restore its recorded SHA-256 before deriving the environment.`);
    for(const element of parseOsm(bytes.toString('utf8'))){
      const key=element.type+'/'+element.id,previous=elements.get(key);
      if(!previous||element.version>previous.version)elements.set(key,element);
    }
  }
  const polygons=buildings.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates).map(polygon=>polygon.map(ring=>ring.map(local)));
  const roads=[],walks=[];
  for(const element of elements.values())if(element.type==='way'&&['footway','pedestrian','path','cycleway'].includes(element.tags.highway)){
    const points=element.nodes.map(id=>elements.get('node/'+id)?.coordinate).filter(Boolean).map(local);
    for(let i=1;i<points.length;i++)walks.push({a:points[i-1],b:points[i],id:element.id});
  }
  const modeledFacing=point=>{
    const nearest=walks.reduce((best,path)=>{const q=closestPoint(point,path.a,path.b),distance=Math.hypot(q[0]-point[0],q[1]-point[1]);return distance<best.distance?{distance,q,id:path.id}:best;},{distance:Infinity,q:[point[0],point[1]+1],id:'unknown'});
    return {modeledFacing:Math.round(Math.atan2(nearest.q[0]-point[0],nearest.q[1]-point[1])*180/Math.PI*100)/100,orientationSource:'way/'+nearest.id};
  };
  for(const element of elements.values())if(element.type==='way'&&['primary','secondary','tertiary','residential','unclassified','service','living_street'].includes(element.tags.highway)){
    const points=element.nodes.map(id=>elements.get('node/'+id)?.coordinate).filter(Boolean).map(local);
    const width=Number(element.tags.width);
    const clearance=Number.isFinite(width)&&width>0?Math.min(8,width/2):element.tags.service==='parking_aisle'?1.8:element.tags.highway==='service'?2:3;
    for(let i=1;i<points.length;i++)roads.push({a:points[i-1],b:points[i],clearance});
  }
  const counts={tree:0,bench:0,lamp:0},retained={tree:0,bench:0,lamp:0},excluded=[];
  const features=[];
  for(const node of [...elements.values()].filter(e=>e.type==='node').sort((a,b)=>Number(a.id)-Number(b.id))){
    const type=kind(node.tags);
    if(!type||!pointInRing(node.coordinate,campus))continue;
    counts[type]++;
    const point=local(node.coordinate),clearance=footprintClearance(point,polygons);
    const reason=clearance<0.65?'inside-or-close-to-building':roads.some(road=>segmentDistance(point,road.a,road.b)<road.clearance)?'inside-mapped-road-clearance':null;
    if(reason){excluded.push({id:'node/'+node.id,kind:type,reason});continue;}
    const tags=Object.fromEntries(tagsKept.filter(key=>node.tags[key]!==undefined).map(key=>[key,node.tags[key]]));
    features.push({type:'Feature',id:'node/'+node.id,properties:{id:'node/'+node.id,version:node.version,kind:type,...tags,...(type==='bench'?{...modeledFacing(point),...(bingTeak.has(node.id)?{benchModel:'courtyard-teak',benchEvidence:'bing-courtyard-photo'}:{})}:{}),buildingClearance:Math.round(clearance*100)/100},geometry:{type:'Point',coordinates:node.coordinate}});
    retained[type]++;
  }
  const lines={mapped:0,quadSeatWalls:0,excluded:[]};
  for(const way of [...elements.values()].filter(e=>e.type==='way'&&(e.tags.amenity==='bench'||quadSeatWalls.has(e.id))).sort((a,b)=>Number(a.id)-Number(b.id))){
    const coordinates=way.nodes.map(id=>elements.get('node/'+id)?.coordinate);
    if(coordinates.length<2||coordinates.some(p=>!p||!pointInRing(p,campus)))continue;
    const points=coordinates.map(local);
    // Conservative full ribbon bound: sample every 0.2 m and allow 0.5 m for the
    // width/miter envelope. This is separate from point-root clearance.
    let clearance=Infinity;
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.2);for(let j=0;j<=steps;j++)clearance=Math.min(clearance,footprintClearance([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps],polygons));}
    if(clearance<0.65){lines.excluded.push({id:'way/'+way.id,reason:'bench-ribbon-envelope-close-to-building',centerlineClearance:clearance});continue;}
    const derived=quadSeatWalls.has(way.id),tags=Object.fromEntries(tagsKept.filter(key=>way.tags[key]!==undefined).map(key=>[key,way.tags[key]]));
    const midpoint=points[Math.floor(points.length/2)];
    features.push({type:'Feature',id:'way/'+way.id,properties:{id:'way/'+way.id,version:way.version,kind:'bench',...tags,...(derived?{benchModel:'quad-seat-wall',benchEvidence:'stanford-gardens-guide-p4',sourceNatural:way.tags.natural}:modeledFacing(midpoint)),buildingClearance:Math.round(clearance*100)/100},geometry:{type:'LineString',coordinates}});
    if(derived)lines.quadSeatWalls++;else lines.mapped++;
    retained.bench++;
  }
  const data=JSON.stringify({type:'FeatureCollection',features})+'\n';
  const output='stanford-environment.geojson';
  const provenance={schemaVersion:2,derivedFromFetchedAt:originalProvenance.fetchedAt,source:'Existing pinned OpenStreetMap API 0.6 bounded map extracts',attribution:'© OpenStreetMap contributors',license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',sourceProvenance:'stanford-provenance.json',sources:originalProvenance.sources,
    selection:'Mapped natural=tree, amenity=bench and highway=street_lamp nodes, plus complete amenity=bench ways inside the pinned Stanford campus boundary. Eight separately labeled authored seat-wall interpretations follow exact mapped Inner Quad planting boundaries. Original coordinates and retained tags are unchanged. No authored or randomly distributed tree positions are added. Bench counts refer to feature assemblies, not a physical-seat inventory.',
    exclusion:'Exclude point roots/furniture inside a building polygon (courtyard holes remain empty), within 0.65 m of its wall, or inside mapped drivable-road clearance: explicit width/2 capped at 8 m; otherwise 3 m, service 2 m, parking aisle 1.8 m. Bench lines sample every 0.2 m and require 0.65 m centerline clearance for their bounded 0.5 m miter envelope, then complete emitted triangles receive a separate wall-crossing/clearance test. Road centerline distance uses a local metre approximation. Tree crowns may overhang paths as real crowns do. No sampling or cap is applied to eligible nodes.',
    dimensions:'Tree height, crown dimensions and furniture dimensions are authored estimates unless numeric source tags exist. Missing tree type defaults to a modeled broadleaf; Phoenix/palm and needleleaved tags determine distinct silhouettes. Species tags are not a botanical field survey. Bench direction tags describe seated facing; otherwise modeledFacing points toward the nearest mapped pedestrian path and is an estimate, not a surveyed long axis. Material tags identify seating only, not the frame. Unverified point designs are flat neutral map markers. Lamp dimensions remain modeled estimates.',
    benchInterpretation:'Mapped amenity=bench ways preserve every original coordinate and retained tag. The eight named Inner Quad natural=wood boundaries are authored seat-wall interpretations corroborated by Stanford Gardens guide p4 photo/text; they are NOT OSM amenity=bench features. Their modeled 0.50 m width and 0.45 m height follow the exact planted outline, without inventing circular centers. Five Bing courtyard nodes use a modeled six-foot teak family with solid posts, vertical back spindles and arms based on Stanford courtyard photography; dimensions and facing remain estimates. Other mapped wood seats are material/backrest estimates; unknown materials do not receive an invented wood design. Line ribbon dimensions are modeled, not survey measurements.',
    benchReferences:[{id:'stanford-gardens-guide-p4',url:'https://familyweekend.stanford.edu/sites/g/files/sbiybj17671/files/media/file/a_self-guided_tour_of_stanford_gardens.pdf',page:4,accessed:'2026-10-20',note:'2017 student garden guide hosted for Family Weekend 2022; photo and text corroborate circular concrete benches around the eight Quad oases, not current as-built dimensions.'},{id:'bing-courtyard-photo',url:'https://aabs2018.stanford.edu/images/stanford/sunset.jpg',accessed:'2026-10-20',note:'Actual Stanford courtyard photograph: vertical back spindles, solid wooden posts and arms. Bing west context also checked at https://trees.stanford.edu/images/inner_palms/inner_palms-Pages/Image8.html; finite node assignment is a modeled family interpretation, not a field survey.'},{id:'bench-tag-semantics',url:'https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dbench',accessed:'2026-10-20',note:'Facing, material-seat semantics and line mapping.'}],
    beforeExclusions:counts,retained,excluded,benchLines:lines,outputs:{[output]:{bytes:Buffer.byteLength(data),sha256:digest(data)}},generator:'tools/data/build-campus-environment.mjs'};
  await mkdir(outputDir,{recursive:true});
  await writeFile(path.join(outputDir,output),data);
  await writeFile(path.join(outputDir,'stanford-environment-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  return provenance;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--source-dir');
  if(index===-1||!process.argv[index+1])throw new Error('Campus environment generation requires --source-dir with the four pinned stanford-tile-*.osm files.');
  const result=await buildCampusEnvironment({sourceDir:path.resolve(process.argv[index+1])});
  console.log(JSON.stringify({beforeExclusions:result.beforeExclusions,retained:result.retained,excluded:result.excluded.length,outputs:result.outputs},null,2));
}
