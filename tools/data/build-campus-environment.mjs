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
const turn=(o,p,q)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
const segmentsCross=(a,b,c,d)=>{const d1=turn(c,d,a),d2=turn(c,d,b),d3=turn(a,b,c),d4=turn(a,b,d);return d1*d2<0&&d3*d4<0;};
const segmentGap=(a,b,c,d)=>segmentsCross(a,b,c,d)?0:Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b));
/**
 * Modeled facing of a bench with no direction tag, from mapped pedestrian paths given as segments {a, b, id} in local metres.
 * A path whose segment comes within 5 cm of the bench, by node, crossing or shared end, runs through or into it and is set aside
 * whole; the nearest remaining path to the bench node, or to the middle of a way's length, is the reference path.
 * - A bench way faces across its own length-weighted line, toward the reference path's side, so it never faces along itself.
 *   A closed ring has no such line and faces the reference path from the middle of its length.
 * - A bench node lying on a path faces across the nearest of that path's segments that has length, toward the reference path's side.
 *   At a bend or junction two segments are equally near and the first listed wins, so the node can face along the other one; at
 *   the end of a spur it faces across the spur. No published node reaches these cases.
 * - Any other bench node faces the reference path.
 * With the reference path dead ahead along the line it faces across, the side is undecided and the left of that line is taken.
 * A reference path a fraction of a degree off the line still decides the side, which is then a weak estimate.
 * `orientationSource` names the path the estimate leaned on: for a way, the reference path, which chose its side; for a node lying
 * on a path, that path, whose segment it faces across, and the reference that chose its side is not recorded; for any other node,
 * the reference path it faces.
 */
export function estimateFacing(benchPoints,walks){
  const pieces=benchPoints.length>1?benchPoints.slice(1).map((b,i)=>[benchPoints[i],b]):[[benchPoints[0],benchPoints[0]]];
  const contact=walks.filter(path=>pieces.some(([a,b])=>segmentGap(a,b,path.a,path.b)<0.05)),touching=new Set(contact.map(path=>path.id));
  const lengths=benchPoints.slice(1).map((p,i)=>Math.hypot(p[0]-benchPoints[i][0],p[1]-benchPoints[i][1])),half=lengths.reduce((sum,length)=>sum+length,0)/2;
  let walked=0,point=benchPoints[0];
  for(let i=0;i<lengths.length;i++){if(walked+lengths[i]>=half){const t=lengths[i]?(half-walked)/lengths[i]:0;point=[benchPoints[i][0]+(benchPoints[i+1][0]-benchPoints[i][0])*t,benchPoints[i][1]+(benchPoints[i+1][1]-benchPoints[i][1])*t];break;}walked+=lengths[i];}
  const reference=walks.reduce((best,path)=>{if(touching.has(path.id))return best;const q=closestPoint(point,path.a,path.b),distance=Math.hypot(q[0]-point[0],q[1]-point[1]);return distance<best.distance?{distance,q,id:path.id}:best;},{distance:Infinity,q:[point[0],point[1]+1],id:'unknown'});
  const toward=[reference.q[0]-point[0],reference.q[1]-point[1]];
  let across,source=reference.id;
  if(benchPoints.length>1){let x=0,y=0;for(const [a,b] of pieces){x-=b[1]-a[1];y+=b[0]-a[0];}if(Math.hypot(x,y)>1e-9)across=[x,y];}
  else{
    // A zero-length segment, two footway nodes at one position, has no direction to face across.
    const lined=contact.filter(path=>path.a[0]!==path.b[0]||path.a[1]!==path.b[1]);
    if(lined.length){const on=lined.reduce((best,path)=>segmentDistance(point,path.a,path.b)<segmentDistance(point,best.a,best.b)?path:best);across=[-(on.b[1]-on.a[1]),on.b[0]-on.a[0]];source=on.id;}
  }
  // Rounding alone must not decide the side: a cosine within 1e-6 of zero is a tie. Projected 7-decimal coordinates carry about
  // 1e-9 of cosine noise on a 1 m bench, and the smallest published margin is a cosine of 4.9e-3.
  const dot=across?across[0]*toward[0]+across[1]*toward[1]:0,flip=across&&reference.id!=='unknown'&&dot< -1e-6*Math.hypot(across[0],across[1])*Math.hypot(toward[0],toward[1]);
  const facing=across?(flip?[-across[0],-across[1]]:across):toward;
  // A flipped [0, y] becomes [-0, -y], and atan2 gives -0 and -180 for those; both are written as 0 and 180.
  const bearing=Math.round(Math.atan2(facing[0],facing[1])*180/Math.PI*100)/100;
  return {modeledFacing:bearing===-180?180:bearing||0,orientationSource:'way/'+source};
}

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
    features.push({type:'Feature',id:'node/'+node.id,properties:{id:'node/'+node.id,version:node.version,kind:type,...tags,...(type==='bench'?{...estimateFacing([point],walks),...(bingTeak.has(node.id)?{benchModel:'courtyard-teak',benchEvidence:'bing-courtyard-photo'}:{})}:{}),buildingClearance:Math.round(clearance*100)/100},geometry:{type:'Point',coordinates:node.coordinate}});
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
    features.push({type:'Feature',id:'way/'+way.id,properties:{id:'way/'+way.id,version:way.version,kind:'bench',...tags,...(derived?{benchModel:'quad-seat-wall',benchEvidence:'stanford-gardens-guide-p4',sourceNatural:way.tags.natural}:estimateFacing(points,walks)),buildingClearance:Math.round(clearance*100)/100},geometry:{type:'LineString',coordinates}});
    // Ways are counted in benchLines, apart from the source nodes, so retained stays beforeExclusions less excluded.
    if(derived)lines.quadSeatWalls++;else lines.mapped++;
  }
  const data=JSON.stringify({type:'FeatureCollection',features})+'\n';
  const output='stanford-environment.geojson';
  const provenance={schemaVersion:2,derivedFromFetchedAt:originalProvenance.fetchedAt,source:'Existing pinned OpenStreetMap API 0.6 bounded map extracts',attribution:'© OpenStreetMap contributors',license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',sourceProvenance:'stanford-provenance.json',sources:originalProvenance.sources,
    selection:'Mapped natural=tree, amenity=bench and highway=street_lamp nodes, plus complete amenity=bench ways inside the pinned Stanford campus boundary. Eight separately labeled authored seat-wall interpretations follow exact mapped Inner Quad planting boundaries. Original coordinates and retained tags are unchanged. No authored or randomly distributed tree positions are added. Bench counts refer to feature assemblies, not a physical-seat inventory.',
    exclusion:'Exclude point roots/furniture inside a building polygon (courtyard holes remain empty), within 0.65 m of its wall, or inside mapped drivable-road clearance: explicit width/2 capped at 8 m; otherwise 3 m, service 2 m, parking aisle 1.8 m. Bench lines sample every 0.2 m and require 0.65 m centerline clearance for their bounded 0.5 m miter envelope, then complete emitted triangles receive a separate wall-crossing/clearance test. Road centerline distance uses a local metre approximation. Tree crowns may overhang paths as real crowns do. No sampling or cap is applied to eligible nodes.',
    dimensions:'Tree height, crown dimensions and furniture dimensions are authored estimates unless numeric source tags exist. Missing tree type defaults to a modeled broadleaf; Phoenix/palm and needleleaved tags determine distinct silhouettes. Species tags are not a botanical field survey. Bench direction tags describe seated facing; otherwise modeledFacing is an estimate, not a surveyed long axis. Pedestrian paths here are highway=footway, pedestrian, path and cycleway ways. The reference is the path nearest the bench node, or the middle of a bench way\'s length, among those that do not touch the bench, meaning none of their segments comes within 5 cm. An open bench way faces across its own overall line, to the side where the reference lies. A closed ring has no such line and faces the reference. A bench node lying on a pedestrian path faces across that path\'s nearest segment, to the reference\'s side; at a bend, junction or spur end that segment is a weak guide, though no published node lies at one. Any other bench node faces the reference. A reference within rounding of straight ahead along the line leaves the side undecided, and the line\'s left is taken; a reference a fraction of a degree off the line still decides it, which is then a weak estimate. orientationSource names the reference. For a node lying on a path it names that path instead, and the reference that chose the node\'s side is not recorded. Material tags identify seating only, not the frame. Unverified point designs and bench ways of unknown material are flat neutral map markers. Lamp dimensions remain modeled estimates.',
    benchInterpretation:'Mapped amenity=bench ways preserve every original coordinate and retained tag. The eight named Inner Quad natural=wood boundaries are authored seat-wall interpretations corroborated by Stanford Gardens guide p4 photo/text; they are NOT OSM amenity=bench features. Their modeled 0.50 m width and 0.45 m height follow the exact planted outline, without inventing circular centers. Five Bing courtyard nodes use a modeled six-foot teak family with solid posts, vertical back spindles and arms based on Stanford courtyard photography; dimensions and facing remain estimates. Other mapped wood seats are material/backrest estimates; unknown materials do not receive an invented wood design. Ways of known material are solid ribbons whose dimensions are modeled, not survey measurements; on an open way, a tagged backrest runs the whole way on the side opposite its facing. A tagged direction can run along the way, though a modeled facing cannot; then a bent way\'s back takes its outer side and a straight way\'s its right. A closed ring\'s back always takes its outside. Either side is an estimate.',
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
