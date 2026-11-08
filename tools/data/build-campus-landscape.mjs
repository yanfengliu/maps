#!/usr/bin/env node
// Lawn selection uses explicit OSM grass evidence. A park or garden tag alone
// does not turn hardscape, woodland, planting beds or paths into mown turf.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import earcut from 'earcut';
import {parseOsm,ringInsideRing,isSimpleRing} from './fetch-stanford.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const project=p=>[(p[0]+122.1697)*88400,(p[1]-37.4278)*111320];
const unproject=p=>[Number((p[0]/88400-122.1697).toFixed(11)),Number((p[1]/111320+37.4278).toFixed(11))];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const area=r=>r.reduce((s,a,i)=>s+cross(a,r[(i+1)%r.length]),0)/2;
const key=p=>p.map(n=>Math.round(n*1e6)).join(',');
const equal=(a,b)=>key(a)===key(b);
const open=r=>r.length>1&&equal(r[0],r.at(-1))?r.slice(0,-1):r;
// Installed offline authoring dependency only: no Python or GEOS code ships to
// the app. Pin both versions so regenerating source-derived cuts is reviewable.
export const LANDSCAPE_TOPOLOGY={shapely:'2.1.2',geos:'3.13.1'};
const clipScript=`
import json, sys, shapely
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.ops import unary_union
from shapely.strtree import STRtree
if shapely.__version__!='2.1.2' or shapely.geos_version_string!='3.13.1':
 raise RuntimeError('Landscape authoring requires installed Shapely 2.1.2 / GEOS 3.13.1')
data=json.load(sys.stdin)
cutters=[Polygon(r) for r in data['corridors']]
for road in data['roads']:
 if road['type']=='LineString':cutters.append(LineString(road['coordinates']).buffer(road['width']/2,quad_segs=2))
 else:cutters.extend(Polygon(p[0],p[1:]) for p in road['polygons'])
if any(not p.is_valid for p in cutters):raise RuntimeError('Invalid source-derived circulation corridor')
tree=STRtree(cutters)
output=[]
for rings in data['areas']:
 area=MultiPolygon([Polygon(p[0],p[1:]) for p in rings])
 if not area.is_valid:raise RuntimeError('Invalid mapped lawn before corridor subtraction')
 nearby=[cutters[int(i)] for i in tree.query(area)]
 result=area.difference(unary_union(nearby)) if nearby else area
 if not result.is_valid:raise RuntimeError('Invalid landscape corridor subtraction result')
 parts=[result] if result.geom_type=='Polygon' else list(result.geoms)
 polygons=[]
 for p in parts:
  if p.is_empty:continue
  if p.geom_type!='Polygon':raise RuntimeError('Landscape subtraction returned non-area geometry')
  polygons.append([list(p.exterior.coords)[:-1]]+[list(r.coords)[:-1] for r in p.interiors])
 output.append(polygons)
json.dump(output,sys.stdout,separators=(',',':'))
`;
function clipAreas(areas,corridors,roads=[]){
 const result=spawnSync('python',['-c',clipScript],{input:JSON.stringify({areas,corridors,roads}),encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
 if(result.error||result.status!==0)throw new Error('Pinned offline landscape topology failed: '+(result.error?.message??result.stderr.trim()));
 return JSON.parse(result.stdout);
}
/** Retain exact polygon boundaries, holes and every intersecting source-width
 * corridor. No vertex simplification or grass-blade geometry is needed. */
export function subtractCorridors(rings,corridors){return clipAreas([[rings.map(open)]],corridors.map(open))[0];}

function sourceGeometry(e,elements){
 const coordinates=ids=>ids.map(id=>{const p=elements.get('node/'+id)?.coordinate;if(!p)throw new Error('incomplete-source-ring');return p;});
 const stitch=segments=>{const remaining=segments.map(s=>[...s]),rings=[];while(remaining.length){let r=remaining.shift();while(r[0]!==r.at(-1)){const i=remaining.findIndex(s=>s[0]===r.at(-1)||s.at(-1)===r.at(-1));if(i<0)throw new Error('open-source-ring');const next=remaining.splice(i,1)[0];if(next[0]!==r.at(-1))next.reverse();r=r.concat(next.slice(1));}rings.push(coordinates(r));}return rings;};
 if(e.type==='way')return {type:'Polygon',coordinates:[coordinates(e.nodes)]};
 const members=role=>e.members.filter(m=>m.type==='way'&&(m.role||'outer')===role).map(m=>{const w=elements.get('way/'+m.ref);if(!w)throw new Error('incomplete-source-relation');return w.nodes;});
 const polygons=stitch(members('outer')).map(r=>[r]);
 for(const hole of stitch(members('inner'))){const parent=polygons.find(p=>ringInsideRing(hole,p[0]));if(!parent)throw new Error('uncontained-source-hole');parent.push(hole);}
 if(!polygons.length)throw new Error('missing-source-outer');return polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons};
}
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const geometryFrom=ps=>{const coordinates=ps.map(p=>p.map(r=>{const points=r.map(unproject);return [...points,points[0]];}));return coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates};};
const triangles=g=>polygons(g).reduce((sum,rings)=>{const vertices=rings.map(r=>r.slice(0,-1)),holes=[];let offset=vertices[0].length;for(const r of vertices.slice(1)){holes.push(offset);offset+=r.length;}return sum+earcut(vertices.flat(2),holes,2).length/3;},0);

function inset(ring,distance){
 const r=open(ring),sign=Math.sign(area(r));return r.map((p,i)=>{
  const a=r[(i+r.length-1)%r.length],b=r[(i+1)%r.length],u=sub(p,a),v=sub(b,p),lu=Math.hypot(...u),lv=Math.hypot(...v),nu=[-u[1]/lu*sign,u[0]/lu*sign],nv=[-v[1]/lv*sign,v[0]/lv*sign],den=1+nu[0]*nv[0]+nu[1]*nv[1];
  if(den<.1)throw new Error('Oval planting inset has an unsupported sharp corner.');return p.map((n,k)=>n+(nu[k]+nv[k])*distance/den);
 });
}

export function deriveOvalGarden(elements){
 const ring=id=>sourceGeometry(elements.get('way/'+id),elements).coordinates[0].slice(0,-1).map(project);
 const line=id=>elements.get('way/'+id).nodes.map(id=>project(elements.get('node/'+id).coordinate));
 const circle=ring('30773401'),s=sourceGeometry(elements.get('way/1425123465'),elements);
 const index=p=>circle.findIndex(q=>equal(p,q));
 const sw=line('30775518'),nw=line('30775519').reverse(),ne=line('30775517'),se=line('30773403');
 const a=index(sw[1]),b=index(nw[0]),c=index(ne[0]),d=index(se[0]);
 if([a,b,c,d].some(i=>i<0))throw new Error('Oval source spokes no longer meet the central mapped path.');
 const arc=(start,end)=>{const r=[];for(let i=start;i!==end;i=(i+1)%circle.length)r.push(circle[i]);r.push(circle[end]);return r;};
 const edgeArc=(id,start,end)=>{const points=line(id),i=points.findIndex(p=>equal(p,start)),j=points.findIndex(p=>equal(p,end));if(i<0||j<0)throw new Error('Oval outer walk no longer meets its source spokes.');return i<j?points.slice(i,j+1):points.slice(j,i+1).reverse();};
 const boundaries=[
  [nw[1],ne[1],...arc(b,c).reverse()],
  [...edgeArc('24772498',se[1],ne[1]),...arc(c,d)],
  [sw[0],se[1],...arc(d,a)],
  [...edgeArc('288808022',nw[1],sw[0]),...arc(a,b)],
 ];
 const feature=(id,kind,rings,sourceIds)=>({type:'Feature',id,properties:{id,version:1,kind,groundEvidence:'stanford-oval-garden-2010-2019',geometrySource:'photo-interpreted-bed-within-mapped-walks',sourceIds,insetMeters:1.45,dimensionSource:'estimated-path-clearance',seasonalAppearance:'documented-red-white-scheme-not-current-botanical-survey'},geometry:geometryFrom([rings])});
 const outer=inset(circle,1.45),center=inset(circle,1.77);
 const features=[feature('derived/oval-emblem-border','border',[outer,[...center].reverse()],['way/30773401']),feature('derived/oval-emblem-white','white-flowers',[center,s.coordinates[0].slice(0,-1).map(project)],['way/30773401','way/1425123465']),{type:'Feature',id:'way/1425123465',properties:{id:'way/1425123465',version:elements.get('way/1425123465').version,kind:'red-flowers',landuse:'flowerbed',colour:'red',groundEvidence:'osm-red-flowerbed-and-stanford-oval-photographs',geometrySource:'exact-mapped-flowerbed',sourceGeometry:s},geometry:s}];
 for(let i=0;i<boundaries.length;i++)features.push(feature(`derived/oval-rose-bed-${i+1}`,'rose-bed',[inset(boundaries[i],1.45)],['way/30773401','way/24772498','way/288808022','way/30773403','way/30775517','way/30775518','way/30775519']));
 return features;
}

export function selectLawns(elements){
 const campus=elements.get('way/29268613');if(!campus)throw new Error('Campus boundary is unavailable.');const boundary=sourceGeometry(campus,elements).coordinates[0];
 const candidates=[...elements.values()].filter(e=>e.type!=='node'&&(e.tags.landuse==='grass'||e.tags.surface==='grass')&&!e.tags.golf&&!e.tags.sport);
 const members=new Set(candidates.filter(e=>e.type==='relation').flatMap(e=>e.members.filter(m=>m.type==='way').map(m=>m.ref))),features=[],excluded=[];
 for(const e of candidates.sort((a,b)=>(a.type+'/'+a.id).localeCompare(b.type+'/'+b.id,'en',{numeric:true}))){
  const id=e.type+'/'+e.id;if(e.type==='way'&&members.has(e.id))continue;
  let geometry;try{geometry=sourceGeometry(e,elements);}catch(error){excluded.push({id,reason:error.message});continue;}
  if(polygons(geometry).some(p=>p.some(r=>!isSimpleRing(r)))){excluded.push({id,reason:'invalid-source-ring'});continue;}
  if(!polygons(geometry).every(p=>ringInsideRing(p[0],boundary))){excluded.push({id,reason:'outside-mapped-campus'});continue;}
  features.push({type:'Feature',id,properties:{id,version:e.version,kind:'grass',groundEvidence:e.tags.landuse==='grass'?'osm-landuse-grass':'osm-surface-grass',sourceGeometry:geometry,...Object.fromEntries(['name','landuse','surface','leisure'].filter(k=>e.tags[k]!==undefined).map(k=>[k,e.tags[k]]))},geometry});
 }
 return {features,excluded};
}

export async function buildCampusLandscape({sourceDir,roads,outputDir=path.join(root,'public/data')}){
 if(roads?.type!=='FeatureCollection'||!Array.isArray(roads.features)||!roads.features.length)throw new Error('Landscape generation requires the pinned complete campus road/path collection.');
 const original=JSON.parse(await readFile(path.join(root,'public/data/stanford-provenance.json'),'utf8')),elements=new Map();
 for(const source of original.sources){const bytes=await readFile(path.join(sourceDir,source.file));if(digest(bytes)!==source.sha256)throw new Error(`Landscape source ${source.file} differs from its pinned SHA-256.`);for(const e of parseOsm(bytes.toString('utf8'))){const key=e.type+'/'+e.id,old=elements.get(key);if(!old||e.version>old.version)elements.set(key,e);}}
 const {features,excluded}=selectLawns(elements),garden=deriveOvalGarden(elements),roadCuts=roads.features.map(f=>{
  if(f.geometry.type==='LineString'){const width=Number(f.properties.modeledWidth);if(!Number.isFinite(width)||width<=0||width>40)throw new Error('Invalid source road width: '+f.properties.id);return {type:'LineString',coordinates:f.geometry.coordinates.map(project),width};}
  return {type:f.geometry.type,polygons:polygons(f.geometry).map(p=>p.map(r=>r.map(project)))};
 });
 const gardenCuts=garden.filter(f=>f.properties.kind!=='red-flowers'&&f.properties.kind!=='white-flowers').map(f=>polygons(f.geometry)[0][0].map(project));
 const results=clipAreas(features.map(f=>polygons(f.geometry).map(p=>p.map(r=>r.map(project)))),gardenCuts,roadCuts);
 for(let i=0;i<features.length;i++){features[i].geometry=geometryFrom(results[i]);features[i].properties.geometrySource='mapped-grass-minus-mapped-circulation-and-evidenced-garden';}
 const collection={type:'FeatureCollection',features:[...features.filter(f=>polygons(f.geometry).length),...garden]},filename='stanford-landscape.geojson',data=JSON.stringify(collection)+'\n';
 const counts={lawns:features.length,flowerbeds:6,borders:1,triangles:collection.features.reduce((sum,f)=>sum+triangles(f.geometry),0)};
 if(counts.triangles>2399)throw new Error(`Landscape exceeds its allocated 2399 triangles: ${counts.triangles}`);
 const provenance={schemaVersion:1,derivedFromFetchedAt:original.fetchedAt,source:'Pinned OpenStreetMap API 0.6 campus extracts',sourceProvenance:'stanford-provenance.json',sources:original.sources,attribution:original.attribution,license:original.license,licenseUrl:original.licenseUrl,counts,excluded,
  selection:'Complete campus-contained Polygon/MultiPolygon areas explicitly tagged landuse=grass or surface=grass; sport and golf areas excluded. Relation members are not repeated. A park/garden/wood/meadow/grassland designation alone does not imply maintained turf. Five grass multipolygons and 121 standalone grass ways are included; this is mapped evidence from the pinned extracts, not a claim that every current campus lawn has been surveyed.',
  topology:{...LANDSCAPE_TOPOLOGY,usage:'Installed offline authoring tools only; no runtime dependency',roadRoundJoinSegmentsPerQuadrant:2,sourceGeometry:'Original mapped geometry is preserved verbatim in properties.sourceGeometry; render geometry subtracts intersecting source-width road/path corridors and documented Oval planting beds. No source vertex simplification.',circulation:roads.sourceManifest??null},
  modelLimits:'Mapped coordinates, identities, versions and grass/flowerbed tags are source records. Turf colour, blade marks, bloom density, species-neutral petal forms and plant relief are authored estimates. The central red S uses exact flowerbed way/1425123465. The emblem surround and four rose beds are photographic interpretations bounded by the mapped circular path and spokes, with an estimated 1.45 m inward clearance; the central border is 0.32 m wide. Photographs document a historic red/white planting scheme; seasons and later planting replacements vary, so these are not current botanical claims. Geometry carries illustrative relative offsets (turf 0.012 m, flowers 0.16–0.30 m, border 0.12 m); the native terrain ground pass drapes these surfaces onto the DEM and does not retain that vertical relief. Grass blades and blooms are procedural surface detail, not individually modeled plants. Native road/path widths, including estimates, are inherited without reimplementation.',
  references:[
   {id:'stanford-oval-garden-guide',url:'https://familyweekend.stanford.edu/sites/g/files/sbiybj17671/files/media/file/a_self-guided_tour_of_stanford_gardens.pdf',date:'2017 study republished 2022',observed:'Page 3 describes the broad Oval lawn, round red/white emblem garden, framing rings and symmetric surrounding rose beds. The document cautions that features may have changed.'},
   {id:'stanford-oval-close-2010',url:'https://web.stanford.edu/~siegelr/stanford/oval.html',image:'https://web.stanford.edu/~siegelr/stanford/oval/IMG_4109%20bar%20S%20in%20oval%206-14-2010%20stanford%20oval%20Canon%20EOS%20REBEL%20T1i.jpg',date:'2010-06-14',observed:'Inspected original Robert Siegel photograph: low dense red S blooms, white surrounding blooms with visible soil and foliage, low green border. Reference only; no photograph distributed.'},
   {id:'stanford-oval-flowers-2010',url:'https://web.stanford.edu/~siegelr/stanford/oval.html',image:'https://web.stanford.edu/~siegelr/stanford/oval/IMG_4105%20oval%20flowers%206-14-2010%20stanford%20oval%20Canon%20EOS%20REBEL%20T1i.jpg',date:'2010-06-14',observed:'Inspected close view shows separate red/white blossom clusters and dark foliage/soil rather than a solid painted floral surface.'},
   {id:'stanford-oval-aerial-2019',url:'https://web.stanford.edu/~siegelr/stanford/1000feet.html',image:'https://web.stanford.edu/~siegelr/flying/heli-flyover2019/0T1A6621%20the%20oval%20-%20stanford%20from%20helicopter%2006-23-2019%20Canon%20EOS%207D%20Mark%20II.jpg',date:'2019-06-23',observed:'Inspected aerial establishes central emblem bed, four surrounding beds, continuous twin linear walks and intervening broad turf. Derived bed extents are estimates inside the mapped path network.'},
   {id:'stanford-oval-visit',url:'https://www.stanford.edu/life/visit',image:'https://a-us.storyblok.com/f/1023936/1200x675/36061dcbd1/stanford-oval-1200w.jpg',observed:'Inspected university visitor photograph shows short fine-textured grass with gradual tonal/mowing variation and clear paths; no flower carpet across the lawn.'},
   {id:'stanford-planting-seasonality',url:'https://stanforddaily.com/2024/04/24/petal-to-the-metal-wildflowers-bloom-at-stanford/',date:'2024-04-24',observed:'Original report interviewing campus horticulturists describes changes from scarlet Heuchera to red petunias and blue-green fescue around the S; this limits any claim that the historical white-flower surround is current.'}
  ],sourceGeometryHashes:Object.fromEntries(collection.features.filter(f=>f.properties.sourceGeometry).map(f=>[f.properties.id,digest(JSON.stringify(f.properties.sourceGeometry))])),outputs:{[filename]:{bytes:Buffer.byteLength(data),sha256:digest(data)}}};
 await mkdir(outputDir,{recursive:true});await writeFile(path.join(outputDir,filename),data);await writeFile(path.join(outputDir,'stanford-landscape-provenance.json'),JSON.stringify(provenance,null,2)+'\n');return {collection,provenance};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Usage: node tools/data/build-campus-landscape.mjs <pinned-source-directory> [roads.geojson] [output-directory]');
 const roadFile=process.argv[3]??path.join(root,'public/data/stanford-surfaces-roads-manifest.json'),roadBytes=await readFile(roadFile);let roads=JSON.parse(roadBytes);
 if(roads?.files){const manifest=roads,features=[];for(const entry of manifest.files){const bytes=await readFile(path.join(path.dirname(roadFile),entry.file));if(digest(bytes)!==entry.sha256)throw new Error('Road shard checksum mismatch: '+entry.file);features.push(...JSON.parse(bytes).features);}roads={type:'FeatureCollection',features,sourceManifest:{file:path.basename(roadFile),sha256:digest(roadBytes),files:manifest.files.map(({file,sha256})=>({file,sha256}))}};}
 const {provenance}=await buildCampusLandscape({sourceDir:process.argv[2],roads,outputDir:process.argv[4]});console.log(JSON.stringify(provenance.counts));
}
