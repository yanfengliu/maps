#!/usr/bin/env node
import {currentBuilding} from '../../src/former-campus-buildings.ts';
/** Compare the actual exterior mesh, looking down, with dated orthophotography.
 * Local metres use the renderer's own projection. Adjacent crops share imagery. */
import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {buildBuildingGeometry, prepareBuildingDetails, projectLocal, DETAIL_ORIGIN, VERTEX_FLOATS} from '../../src/building-geometry.ts';
import {computeModelDigest} from './audit-realism.mjs';

const service = 'https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer';
const tileWidth = 768; // Ground metres. Each 1536 px export samples a 0.5 m grid.
const round = value => Number(value.toFixed(3));
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function tileUrl(column, row) {
  const radius = 6378137, latitude = DETAIL_ORIGIN[1] * Math.PI / 180;
  const x = radius * DETAIL_ORIGIN[0] * Math.PI / 180;
  const y = radius * Math.log(Math.tan(Math.PI / 4 + latitude / 2));
  const size = tileWidth / Math.cos(latitude);
  const bbox = [x+column*size,y+row*size,x+(column+1)*size,y+(row+1)*size];
  return service+'/export?'+new URLSearchParams({bbox:bbox.join(','),bboxSR:'3857',imageSR:'3857',size:'1536,1536',format:'jpg',f:'image'});
}

export function topSurfaces(mesh, count) {
  const faces = Array.from({length:count},()=>[]);
  for (const buffer of [mesh.roofs, mesh.facades]) {
    for (let offset=0; offset<buffer.length; offset+=3*VERTEX_FLOATS) {
      const owner=buffer[offset+12];
      if (!Number.isInteger(owner) || !faces[owner]) continue;
      const [a,b,c]=[0,1,2].map(i=>Array.from(buffer.subarray(offset+i*VERTEX_FLOATS,offset+i*VERTEX_FLOATS+3)));
      const u=b.map((n,i)=>n-a[i]), v=c.map((n,i)=>n-a[i]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if (Math.abs(cross[2])<1e-7) continue;
      const light=(cross[2]>0?1:-1)/Math.hypot(...cross);
      const shade=.72+.28*light*(-.4*cross[0]+.4*cross[1]+.82*cross[2]);
      const color=Array.from(buffer.subarray(offset+6,offset+9),n=>Math.round(255*Math.min(1,Math.max(0,n*shade))));
      faces[owner].push({points:[a,b,c].map(([x,y])=>[round(x),round(-y)]),height:(a[2]+b[2]+c[2])/3,color:'rgb('+color.join(',')+')'});
    }
  }
  return faces.map(f=>f.sort((a,b)=>a.height-b.height));
}

function card(feature, faces, index, tiles) {
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const rings=polygons.flatMap(poly=>poly.map(ring=>ring.map(projectLocal)));
  const xs=rings.flat().map(p=>p[0]), ys=rings.flat().map(p=>p[1]);
  const width=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),12)*1.18;
  const left=(Math.max(...xs)+Math.min(...xs)-width)/2, bottom=(Math.max(...ys)+Math.min(...ys)-width)/2;
  const view=[left,-bottom-width,width,width].map(round).join(' ');
  const images=[];
  for (let x=Math.floor(left/tileWidth);x<=Math.floor((left+width)/tileWidth);x++) {
    for (let y=Math.floor(bottom/tileWidth);y<=Math.floor((bottom+width)/tileWidth);y++) {
      const file='tiles/'+x+'_'+y+'.jpg';
      tiles.set(file,tileUrl(x,y));
      images.push('<image href="'+file+'" x="'+x*tileWidth+'" y="'+(-y-1)*tileWidth+'" width="'+tileWidth+'" height="'+tileWidth+'"/>');
    }
  }
  const path=rings.map(r=>'M'+r.map(([x,y])=>round(x)+','+round(-y)).join('L')+'Z').join('');
  const overlay='<path d="'+path+'" fill="none" stroke="#3df" stroke-opacity=".8" stroke-width="'+width/220+'"/>';
  const model=faces.map(f=>'<polygon points="'+f.points.map(p=>p.join(',')).join(' ')+'" fill="'+f.color+'" stroke="'+f.color+'" stroke-width="'+width/1400+'"/>').join('');
  const svg=content=>'<svg viewBox="'+view+'" aria-hidden="true">'+content+'</svg>';
  const p=feature.properties;
  return '<figure id="part-'+index+'"><figcaption>'+index+' · '+escape(p.name||p.id)+'</figcaption><div>'+svg(images.join('')+overlay)+svg(model)+'</div><small>'+escape(p.id)+' · '+(currentBuilding(feature)?p.detailArchitecture.roofShape:'omitted from current geometry')+'</small></figure>';
}

function checkJpeg(bytes, url) {
  if (bytes.length < 4 || bytes.readUInt16BE(0)!==0xffd8 || bytes.readUInt16BE(bytes.length-2)!==0xffd9) {
    throw new Error('Invalid JPEG: '+url);
  }
}

export async function buildAtlas(directory, fetchTiles) {
  const data=JSON.parse(await readFile(new URL('../../public/data/stanford-buildings.geojson',import.meta.url)));
  const prepared=prepareBuildingDetails(data), mesh=buildBuildingGeometry(prepared);
  const faces=topSurfaces(mesh,prepared.features.length), tiles=new Map();
  const cards=data.features.map((source,i)=>card({...source,properties:prepared.features[i].properties},faces[i],i+1,tiles));
  await mkdir(join(directory,'tiles'),{recursive:true});
  let previous=[];
  try { previous=JSON.parse(await readFile(join(directory,'sources.json'),'utf8')).tiles; }
  catch (error) { if (error.code!=='ENOENT') throw error; }
  const known=new Map(previous.map(tile=>[tile.url,tile.sha256]));
  const manifest=[];
  for (const [file,url] of tiles) {
    const target=join(directory,file);
    let bytes;
    try { bytes=await readFile(target); } catch(e) { if(e.code!=='ENOENT') throw e; }
    if (!bytes && fetchTiles) {
      const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
      if (!response.ok) throw new Error('County export failed: '+response.status+' '+url);
      bytes=Buffer.from(await response.arrayBuffer());
      checkJpeg(bytes, url);
      await writeFile(target+'.part',bytes);await rename(target+'.part',target);
    }
    if(!bytes) throw new Error('Missing '+file+'. Run with --fetch to download the county photographs.');
    checkJpeg(bytes, url);
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if (known.has(url) && known.get(url)!==sha256) throw new Error('Image differs from saved source digest: '+file);
    manifest.push({file,url,sha256});
  }
  const modelDigest=await computeModelDigest(fileURLToPath(new URL('../..',import.meta.url)));
  await writeFile(join(directory,'sources.json'),JSON.stringify({service,year:2025,modelDigest,parts:cards.length,tiles:manifest},null,2)+'\n');
  const style='<style>*{box-sizing:border-box}body{margin:16px;background:white;color:#182521;font:15px system-ui}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}figure{margin:0;scroll-margin:10px}figure div{display:flex;gap:2px}svg{width:calc(50% - 1px);background:#eeeae2}figcaption,small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}small{font-size:11px}figure:target{outline:3px solid #078}h1{margin:0}a{color:#265856}@media(max-width:800px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){main{grid-template-columns:1fr}}</style>';
  const intro='<h1>Stanford roof comparisons</h1><p>Left: <a href="'+service+'">2025 Santa Clara County aerial imagery, City of San José</a>, with the mapped footprint outlined. Right: isolated exterior mesh at the same position, scale and orientation. Tree cover, shadows, tall-building displacement, overlapping parts and later construction limit interpretation. Heights, facades and shader materials need separate views.</p>';
  for(let start=0;start<cards.length;start+=36){
    const page=Math.floor(start/36)+1, total=Math.ceil(cards.length/36);
    const nav='<nav>'+['<a href="index.html">All buildings</a>',page>1?'<a href="sheet-'+(page-1)+'.html">Previous</a>':'','Sheet '+page+' of '+total,page<total?'<a href="sheet-'+(page+1)+'.html">Next</a>':''].filter(Boolean).join(' · ')+'</nav>';
    const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Stanford roof comparisons '+page+'</title>'+style+intro+nav+'<main>'+cards.slice(start,start+36).join('')+'</main>'+nav+'</html>';
    await writeFile(join(directory,'sheet-'+page+'.html'),html);
  }
  const entries=prepared.features.map((feature,i)=>({id:feature.properties.id,name:feature.properties.name||'',i})).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const links=entries.map(({id,name,i})=>'<li><a href="sheet-'+(Math.floor(i/36)+1)+'.html#part-'+(i+1)+'">'+escape(name||id)+'</a>'+ (name?' · '+escape(id):'')+'</li>');
  await writeFile(join(directory,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Stanford roof atlas index</title>'+style+intro+'<p>Find a mapped name or OpenStreetMap ID on this page.</p><ul>'+links.join('')+'</ul></html>');
  return {parts:cards.length,sheets:Math.ceil(cards.length/36),tiles:tiles.size,modelDigest};
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2),directory=resolve(args.find(a=>!a.startsWith('--'))??'artifacts/roof-atlas');
  console.log(await buildAtlas(directory,args.includes('--fetch')));
}
