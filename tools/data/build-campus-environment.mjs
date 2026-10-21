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
const tagsKept = ['species','genus','leaf_type','leaf_cycle','height','circumference','diameter_crown','direction','name','backrest','material'];

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
  const roads=[];
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
    const nearest=roads.reduce((best,road)=>{const distance=segmentDistance(point,road.a,road.b);return distance<best.distance?{distance,angle:Math.atan2(road.b[1]-road.a[1],road.b[0]-road.a[0])}:best;},{distance:Infinity,angle:0});
    features.push({type:'Feature',id:'node/'+node.id,properties:{id:'node/'+node.id,version:node.version,kind:type,...tags,...(type==='bench'?{modeledOrientation:Math.round(nearest.angle*1e5)/1e5}:{}),buildingClearance:Math.round(clearance*100)/100},geometry:{type:'Point',coordinates:node.coordinate}});
    retained[type]++;
  }
  const data=JSON.stringify({type:'FeatureCollection',features})+'\n';
  const output='stanford-environment.geojson';
  const provenance={schemaVersion:1,derivedFromFetchedAt:originalProvenance.fetchedAt,source:'Existing pinned OpenStreetMap API 0.6 bounded map extracts',attribution:'© OpenStreetMap contributors',license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',sourceProvenance:'stanford-provenance.json',sources:originalProvenance.sources,
    selection:'Mapped natural=tree, amenity=bench and highway=street_lamp nodes inside the pinned Stanford campus boundary. Original source coordinates and retained tags are unchanged. No authored or randomly distributed tree positions are added.',
    exclusion:'Exclude roots/furniture inside a building polygon (courtyard holes remain empty), within 0.65 m of its wall, or inside mapped drivable-road clearance: explicit width/2 capped at 8 m; otherwise 3 m, service 2 m, parking aisle 1.8 m. Road centerline distance uses a local metre approximation. Tree crowns may overhang paths as real crowns do. No sampling or cap is applied to eligible nodes.',
    dimensions:'Tree height, crown dimensions and furniture dimensions are authored estimates unless numeric source tags exist. Missing tree type defaults to a modeled broadleaf; Phoenix/palm and needleleaved tags determine distinct silhouettes. Species tags are not a botanical field survey. Bench orientation is estimated from the nearest mapped drivable centerline; direction tags take priority when present. Lamp and bench models are generic representations at real mapped points.',
    beforeExclusions:counts,retained,excluded,outputs:{[output]:{bytes:Buffer.byteLength(data),sha256:digest(data)}},generator:'tools/data/build-campus-environment.mjs'};
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
