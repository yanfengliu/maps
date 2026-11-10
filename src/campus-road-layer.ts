import type {Map as MapLibreMap,LayerSpecification,ExpressionSpecification} from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import {publicAsset} from './public-assets.ts';
import {validateCampusSurfaces} from './campus-surfaces.ts';
import {resolveRoadMaterials} from './campus-road-materials.ts';
import {CAMPUS_TRAFFIC_SOURCE,campusTrafficIcons,campusTrafficLayer,validateCampusTraffic,type CampusTrafficData} from './campus-traffic.ts';

export const CAMPUS_ROAD_SOURCE='stanford-road-network';
export const CAMPUS_ROAD_PLAZA_SOURCE='stanford-road-plazas';
const materialNames=['unknown','asphalt','concrete','pavers'] as const;
type RoadMaterial=typeof materialNames[number];
interface RoadProperties {id:string;version:number;kind:'street'|'road-area';modeledSurface:RoadMaterial;surfaceEvidence:string;modeledWidth?:number;widthSource?:string;sourceNodeIds:string[];[key:string]:unknown}
export type CampusRoadData=GeoJSON.FeatureCollection<GeoJSON.LineString|GeoJSON.Polygon,RoadProperties>;
export interface RoadCounts {streets:number;roadAreas:number;streetSegments:number}
export interface RoadManifest {schemaVersion:1;files:{file:string;features:number;bytes:number;sha256:string}[];counts:RoadCounts;campusBoundary:string;bounds:[number,number,number,number];controls:{file:string;bytes:number;sha256:string;counts:{stop:number;traffic_signals:number;directionUnknown:number}}}
export interface CampusRoadStats extends RoadCounts {dataReady:boolean;ready:boolean;error:string|null;parts:number;stops:number;signals:number}
const failure=(message:string)=>new Error(`Campus roads ${message}. Retry to reload the pinned road data.`);
const nonnegative=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const coordinate=(p:unknown):p is number[]=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<85.1;

export function validateCampusRoadManifest(value:unknown):RoadManifest {
  const m=value as RoadManifest;
  if(m?.schemaVersion!==1||!Array.isArray(m.files)||!m.files.length||!m.counts||!['streets','roadAreas','streetSegments'].every(k=>nonnegative(m.counts[k as keyof RoadCounts]))||m.campusBoundary!=='stanford-campus.geojson'||!Array.isArray(m.bounds)||m.bounds.length!==4||!m.bounds.every(Number.isFinite)||m.bounds[0]>=m.bounds[2]||m.bounds[1]>=m.bounds[3])throw failure('manifest is invalid');
  const names=new Set<string>();
  for(const f of m.files){
    if(!f||!/^stanford-surfaces-roads-\d+\.geojson$/.test(f.file)||names.has(f.file)||!nonnegative(f.features)||f.features===0||!nonnegative(f.bytes)||f.bytes===0||!/^[a-f0-9]{64}$/.test(f.sha256))throw failure('manifest has an invalid or duplicate part');
    names.add(f.file);
  }
  if(m.files.reduce((n,f)=>n+f.features,0)!==m.counts.streets+m.counts.roadAreas)throw failure('manifest feature counts disagree');
  if(m.controls?.file!=='stanford-surfaces-controls.geojson'||!nonnegative(m.controls.bytes)||m.controls.bytes===0||!/^[a-f0-9]{64}$/.test(m.controls.sha256)||!m.controls.counts||!['stop','traffic_signals','directionUnknown'].every(k=>nonnegative(m.controls.counts[k as keyof RoadManifest['controls']['counts']])))throw failure('manifest has invalid traffic control metadata');
  return m;
}

export function validateCampusRoadPart(value:unknown,bounds:RoadManifest['bounds']):CampusRoadData {
  const data=value as CampusRoadData;
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw failure('part is not a feature collection');
  const ids=new Set<string>();
  for(const f of data.features){
    const p=f?.properties,g=f?.geometry;
    if(f?.type!=='Feature'||!p||!/^way\/\d+$/.test(p.id)||ids.has(p.id)||!Number.isSafeInteger(p.version)||p.version<1||!materialNames.includes(p.modeledSurface)||typeof p.surfaceEvidence!=='string'||!p.surfaceEvidence||!Array.isArray(p.sourceNodeIds)||p.sourceNodeIds.some(id=>typeof id!=='string'||!/^(node\/)?\d+$/.test(id)))throw failure('part contains an invalid source identity or material');
    if(p.surfaceEvidence==='unverified'&&p.modeledSurface!=='unknown')throw failure(`${p.id} assigns an unsupported material`);
    if((p.layer!==undefined&&Number(p.layer)!==0)||(p.level!==undefined&&Number(p.level)!==0)||(p.bridge!==undefined&&!['no','false','0'].includes(String(p.bridge)))||(p.tunnel!==undefined&&!['no','false','0','building_passage'].includes(String(p.tunnel)))||(p.indoor!==undefined&&!['no','false','0'].includes(String(p.indoor)))||p.highway==='construction')throw failure(`${p.id} is not a supported ground route`);
    let coordinates:number[][];
    if(g?.type==='LineString'&&p.kind==='street'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2){
      if(typeof p.modeledWidth!=='number'||!Number.isFinite(p.modeledWidth)||p.modeledWidth<=0||!['osm-tag','class-estimate'].includes(String(p.widthSource))||p.sourceNodeIds.length!==g.coordinates.length)throw failure(`${p.id} has an invalid sourced width or node sequence`);
      coordinates=g.coordinates;
    }else if(g?.type==='Polygon'&&p.kind==='road-area'&&Array.isArray(g.coordinates)&&g.coordinates.length){
      if(g.coordinates.some(r=>!Array.isArray(r)||r.length<4||!coordinate(r[0])||!coordinate(r.at(-1))||r[0][0]!==r.at(-1)![0]||r[0][1]!==r.at(-1)![1])||p.sourceNodeIds.length!==g.coordinates[0].length)throw failure(`${p.id} has invalid area rings`);
      coordinates=g.coordinates.flat();
    }else throw failure(`${p.id} has an unsupported geometry`);
    if(coordinates.some(c=>!coordinate(c)||c[0]<bounds[0]-1e-9||c[0]>bounds[2]+1e-9||c[1]<bounds[1]-1e-9||c[1]>bounds[3]+1e-9))throw failure(`${p.id} leaves the recorded source bounds`);
    ids.add(p.id);
  }
  return data;
}

// Unknown surfaces share the neutral route tone rather than displaying a
// metadata gap as a physical paving boundary. This is cartographic fallback,
// not an asphalt inference: source/evidence stay unknown, with no added texture
// or markings. Explicit unpaved and mixed surfaces bypass this fallback.
const neutralRouteColor='#5e615c';
const colors:Record<RoadMaterial,string|ExpressionSpecification>={
  unknown:['match',['get','unpavedSurface'],'grass','#9aa981',['dirt','ground','earth','compacted'],'#b3a18a',['gravel','fine_gravel','pebblestone'],'#a7a396','woodchips','#a58e70','sand','#c7baa0',
    ['match',['coalesce',['get','surface'],''],['','paved'],neutralRouteColor,'#a8a89c']],
  asphalt:neutralRouteColor,concrete:'#c2bfae',pavers:['match',['get','surface'],['sett','unhewn_cobblestone','cobblestone'],'#918b7e','#a18c82'],
};
// A composite feature+zoom width is clamped to each source tile's zoom..zoom+1
// by MapLibre's paint binder. Terrain uses mixed tile zooms, so it can produce
// different widths on either side of a tile boundary. Group exact source widths
// into camera-only expressions instead. One campus latitude bounds the scale
// approximation below 0.03% throughout the pinned road extent.
export const CAMPUS_ROAD_LATITUDE=37.43;
export function roadMetreWidth(width:number):ExpressionSpecification {
  const pixelsAtZero=width*512/(40_075_016.68557849*Math.cos(CAMPUS_ROAD_LATITUDE*Math.PI/180));
  return ['interpolate',['exponential',2],['zoom'],0,pixelsAtZero,24,pixelsAtZero*2**24];
}
export function campusRoadLayers(widths:readonly {material:RoadMaterial;width:number}[]):LayerSpecification[]{
  const layers:LayerSpecification[]=[];
  // Opaque material families have deterministic painter order. Shared native
  // round caps/joins replace the custom coincident strips and pointed hulls.
  // Carriageway paving covers connecting footway caps at shared road nodes.
  // Source-backed crossing paint is supplied separately above these surfaces.
  for(const material of ['unknown','pavers','concrete','asphalt'] as RoadMaterial[]){
    const exactWidths=[...new Set(widths.filter(group=>group.material===material).map(group=>group.width))].sort((a,b)=>a-b);
    const base={source:CAMPUS_ROAD_SOURCE,minzoom:13};
    const common:ExpressionSpecification=['all',['==',['coalesce',['get','renderSurface'],['get','modeledSurface']],material],['!=',['get','pavedAreaId'],'derived/main-quad-paving']];
    layers.push({id:`campus-road-${material}-area`,...base,type:'fill',filter:['all',common,['==',['geometry-type'],'Polygon']],paint:{'fill-color':colors[material],'fill-opacity':1,'fill-antialias':false}});
    for(const width of exactWidths)layers.push({id:`campus-road-${material}-line-${width}`,...base,type:'line',filter:['all',common,['==',['geometry-type'],'LineString'],['==',['get','modeledWidth'],width]],layout:{'line-cap':'round','line-join':'round','line-round-limit':1},paint:{'line-color':colors[material],'line-width':roadMetreWidth(width),'line-opacity':1}});
  }
  layers.push({id:'campus-road-paving-mask',type:'fill',source:CAMPUS_ROAD_PLAZA_SOURCE,minzoom:13,filter:['==',['get','kind'],'plaza'],paint:{'fill-color':'#a18c82','fill-opacity':1,'fill-antialias':false}});
  layers.push({id:'campus-road-planting-mask',type:'fill',source:CAMPUS_ROAD_PLAZA_SOURCE,minzoom:13,filter:['==',['get','kind'],'planting-island'],paint:{'fill-color':'#c5d0b7','fill-opacity':1,'fill-antialias':false}});
  return layers;
}
const emptyStats=():CampusRoadStats=>({dataReady:false,ready:false,error:null,parts:0,streets:0,roadAreas:0,streetSegments:0,stops:0,signals:0});
type RoadMap=Pick<MapLibreMap,'on'|'off'|'isStyleLoaded'|'getSource'|'addSource'|'removeSource'|'isSourceLoaded'|'getLayer'|'addLayer'|'removeLayer'|'hasImage'|'addImage'|'removeImage'>;
interface Options {onChange?:(stats:Readonly<CampusRoadStats>)=>void;fetcher?:typeof fetch;manifestUrl?:string;plazaUrl?:string}
interface RoadPayload {manifest:RoadManifest;roads:CampusRoadData;plazas:GeoJSON.FeatureCollection;controls:CampusTrafficData;layers:LayerSpecification[]}

/** One owner for loading, source-specific readiness, retries and style/context
 * recovery. No custom terrain mesh: native line/fill sources drape with the map. */
export class CampusRoadLayer {
  private state=emptyStats();private map:RoadMap|null=null;private beforeId:string|undefined;
  private payload:RoadPayload|null=null;private abort:AbortController|null=null;private generation=0;private dead=false;private installing=false;private styleAvailable=false;private contextAvailable=true;
  private fetcher:typeof fetch;private manifestUrl:string;private plazaUrl:string;private onChange:Options['onChange'];
  constructor(options:Options={}){this.fetcher=options.fetcher??((input,init)=>fetch(input,init));this.manifestUrl=options.manifestUrl??publicAsset('data/stanford-surfaces-roads-manifest.json');this.plazaUrl=options.plazaUrl??publicAsset('data/stanford-surfaces.geojson');this.onChange=options.onChange;}
  private get layerIds(){return [...this.payload?.layers??[],campusTrafficLayer()].map(layer=>layer.id);}
  get stats():Readonly<CampusRoadStats>{return Object.freeze({...this.state});}
  private notify(){this.onChange?.(this.stats);}
  private styleReady=()=>{this.styleAvailable=true;this.state.ready=false;this.notify();this.install();};
  private contextLost=()=>{this.contextAvailable=false;this.styleAvailable=false;this.state.ready=false;this.notify();};
  private contextRestored=()=>{
    this.contextAvailable=true;
    // MapLibre recreates its style asynchronously after a lost context. The
    // restored event precedes style.load; it does not permit source mutations.
    // A live style can recover immediately, otherwise styleReady owns install.
    if(this.map?.isStyleLoaded())this.styleReady();
  };
  private sourceReady=(event:{sourceId?:string})=>{if([CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_TRAFFIC_SOURCE].includes(String(event.sourceId)))this.checkReady();};
  // A discarded covering tile can complete a source without another data
  // event. Observe its abort immediately; idle catches final frame cleanup.
  private idleReady=()=>this.checkReady();
  private sourceError=(value:unknown)=>{const event=value as {sourceId?:string;error?:Error};if([CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_TRAFFIC_SOURCE].includes(String(event.sourceId)))this.fail(event.error??failure('source processing failed'));};
  // MapLibre has already destroyed its style before firing remove. In 6.15,
  // hasImage() needs that style, so only detach listeners/requests at this point.
  private mapRemoved=()=>{this.detach(false);this.destroy();};
  attach(map:RoadMap,beforeId?:string):void {
    if(this.dead)return;
    if(this.map!==map){
      this.detach();this.map=map;this.styleAvailable=Boolean(map.isStyleLoaded());
      map.on('style.load',this.styleReady);map.on('sourcedata',this.sourceReady);map.on('sourcedataabort',this.sourceReady);map.on('idle',this.idleReady);map.on('error',this.sourceError);map.on('remove',this.mapRemoved);map.on('webglcontextlost',this.contextLost);map.on('webglcontextrestored',this.contextRestored);
    }
    this.beforeId=beforeId;this.install();if(!this.payload&&!this.abort&&!this.state.error)void this.load();
  }
  prepareForStyleReload():void {if(this.dead)return;this.styleAvailable=false;this.state.ready=false;if(!this.state.error)this.notify();}
  retry():void {if(this.dead)return;this.abort?.abort();this.generation++;this.abort=null;this.removeLayers();this.payload=null;this.state=emptyStats();this.notify();void this.load();}
  destroy():void {if(this.dead)return;this.dead=true;this.abort?.abort();this.abort=null;this.generation++;this.detach();this.payload=null;this.state={...this.state,dataReady:false,ready:false};}
  private detach(removeResources=true){const map=this.map;if(!map)return;map.off('style.load',this.styleReady);map.off('sourcedata',this.sourceReady);map.off('sourcedataabort',this.sourceReady);map.off('idle',this.idleReady);map.off('error',this.sourceError);map.off('remove',this.mapRemoved);map.off('webglcontextlost',this.contextLost);map.off('webglcontextrestored',this.contextRestored);if(removeResources)this.removeLayers();this.map=null;}
  private removeLayers(){const map=this.map;if(!map)return;for(const id of [...this.layerIds].reverse())if(map.getLayer(id))map.removeLayer(id);for(const id of [CAMPUS_TRAFFIC_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_ROAD_SOURCE])if(map.getSource(id))map.removeSource(id);for(const id of Object.keys(campusTrafficIcons()))if(map.hasImage(id))map.removeImage(id);}
  private fail(error:unknown){if(this.dead)return;this.abort?.abort();this.abort=null;this.state.ready=false;this.state.error=error instanceof Error?error.message:String(error);this.removeLayers();this.notify();}
  private async read(url:string,signal:AbortSignal):Promise<Uint8Array<ArrayBuffer>>{const response=await this.fetcher(url,{signal});if(!response.ok)throw failure(`${url} returned HTTP ${response.status}`);if(!response.headers.get('content-type')?.includes('json'))throw failure(`${url} is not JSON`);return new Uint8Array(await response.arrayBuffer());}
  private async load(){
    const token=++this.generation,abort=new AbortController();this.abort=abort;
    try{
      const decode=(bytes:Uint8Array,name:string)=>{try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw failure(`${name} is malformed JSON`);}};
      const manifest=validateCampusRoadManifest(decode(await this.read(this.manifestUrl,abort.signal),this.manifestUrl));
      const prefix=this.manifestUrl.slice(0,this.manifestUrl.lastIndexOf('/')+1);
      const pinned=async(part:{file:string;bytes:number;sha256:string})=>{
        const bytes=await this.read(prefix+part.file,abort.signal);
        const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
        if(bytes.byteLength!==part.bytes||hash!==part.sha256)throw failure(`${part.file} does not match the pinned byte/hash metadata`);
        return decode(bytes,part.file);
      };
      const [parts,surfaces,controls]=await Promise.all([
        Promise.all(manifest.files.map(async part=>{
          const data=validateCampusRoadPart(await pinned(part),manifest.bounds);if(data.features.length!==part.features)throw failure(`${part.file} feature count differs from the manifest`);return data;
        })),
        this.read(this.plazaUrl,abort.signal).then(bytes=>validateCampusSurfaces(decode(bytes,this.plazaUrl))),
        pinned(manifest.controls).then(value=>validateCampusTraffic(value,manifest.bounds)),
      ]);
      const features=parts.flatMap(p=>p.features),ids=new Set<string>(),counts:RoadCounts={streets:0,roadAreas:0,streetSegments:0};
      for(const f of features){if(ids.has(f.properties.id))throw failure('parts duplicate a source way');ids.add(f.properties.id);if(f.geometry.type==='LineString'){counts.streets++;counts.streetSegments+=f.geometry.coordinates.length-1;}else counts.roadAreas++;}
      if(Object.keys(counts).some(key=>counts[key as keyof RoadCounts]!==manifest.counts[key as keyof RoadCounts]))throw failure('loaded source counts differ from the manifest');
      const stops=controls.features.filter(f=>f.properties.controlType==='stop').length,signals=controls.features.length-stops,directionUnknown=controls.features.filter(f=>f.properties.directionStatus==='unknown').length;
      if(stops!==manifest.controls.counts.stop||signals!==manifest.controls.counts.traffic_signals||directionUnknown!==manifest.controls.counts.directionUnknown)throw failure('traffic control counts differ from the manifest');
      const roads=resolveRoadMaterials({type:'FeatureCollection',features}).data;
      const layers=campusRoadLayers(roads.features.filter(f=>f.geometry.type==='LineString').map(f=>({material:f.properties.renderSurface,width:f.properties.modeledWidth!})));
      const plazas:GeoJSON.FeatureCollection={type:'FeatureCollection',features:[]};
      for(const f of surfaces.features)if(f.geometry.type==='Polygon'&&f.properties.kind==='plaza'){
        plazas.features.push(f);
        for(const [i,ring] of f.geometry.coordinates.slice(1).entries())plazas.features.push({type:'Feature',properties:{id:`${f.properties.id}/island-${i+1}`,kind:'planting-island'},geometry:{type:'Polygon',coordinates:[ring]}});
      }
      if(!plazas.features.length)throw failure('authored plaza mask is missing');
      if(this.dead||token!==this.generation||abort.signal.aborted)return;
      this.payload={manifest,roads,plazas,controls,layers};this.abort=null;this.state={...counts,parts:parts.length,stops,signals,dataReady:true,ready:false,error:null};this.install();this.notify();
    }catch(error){if(!this.dead&&token===this.generation&&!abort.signal.aborted)this.fail(error);}
  }
  private install(){
    // style.load means sources can be attached even while remote basemap tiles
    // are still loading. Local road readiness must not depend on those tiles.
    const map=this.map,payload=this.payload;if(!map||!payload||!this.styleAvailable||!this.contextAvailable||this.installing||this.state.error)return;
    this.installing=true;
    try{
      if(!map.getSource(CAMPUS_ROAD_SOURCE))map.addSource(CAMPUS_ROAD_SOURCE,{type:'geojson',data:payload.roads,maxzoom:18,tolerance:0,buffer:128,attribution:'© OpenStreetMap contributors'});
      if(!map.getSource(CAMPUS_ROAD_PLAZA_SOURCE))map.addSource(CAMPUS_ROAD_PLAZA_SOURCE,{type:'geojson',data:payload.plazas,maxzoom:18,tolerance:0,buffer:128});
      if(!map.getSource(CAMPUS_TRAFFIC_SOURCE))map.addSource(CAMPUS_TRAFFIC_SOURCE,{type:'geojson',data:payload.controls,maxzoom:18,tolerance:0,buffer:128});
      for(const [id,image] of Object.entries(campusTrafficIcons()))if(!map.hasImage(id))map.addImage(id,image,{pixelRatio:2});
      // The network covers regional road strokes, but stays below campus 3D
      // detail and labels whether local building data arrived before or after it.
      const before=[this.beforeId,'stanford-buildings','stanford-architectural-details','road-label'].find(id=>id&&map.getLayer(id));
      for(const layer of [...payload.layers,campusTrafficLayer()])if(!map.getLayer(layer.id))map.addLayer(layer,before);
      this.checkReady();
    }catch(error){this.fail(error);}finally{this.installing=false;}
  }
  private checkReady(){
    const map=this.map;
    const ready=Boolean(map&&this.payload&&this.contextAvailable&&!this.state.error&&[CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_TRAFFIC_SOURCE].every(id=>map.getSource(id)&&map.isSourceLoaded(id))&&this.layerIds.every(id=>map.getLayer(id)));
    if(ready!==this.state.ready){this.state.ready=ready;this.notify();}
  }
}
