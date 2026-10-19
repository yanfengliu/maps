import type { Camera, WebGLRenderer, Group } from 'three';
import type { RenderLoop } from '../render/loop.js';
import type { WorldStyle } from '../world/styles.js';
import type { NetworkData } from '../world/network-data.js';
import type { AgentAssetManifest } from '../world/agent-assets.js';
import { fetchAsset } from './render/assets.js';
import { createLocalRig, type LocalRigPacket } from './render/local-walk-rig.js';
import { LocalWalkDraw } from './render/local-walk-draw.js';
import { LocalWalkGait, localGaitEventCount, type LocalGaitFrame, type LocalGaitRoot } from './population/local-walk-gait.js';
import { createOrderedFootEngine } from './population/local-ordered/controller.mjs';
import { LocalSupportAdmission, createLocalFloor, type LocalContext } from './population/local-walk-support.js';
import { LOCAL_WALK_BINDING as binding } from './local-walk-options.js';
export interface LocalWalkStatus {
  actor: {seed:number;variant:number;slot:number;generation:number;scale:number};
  started:boolean;startFrame:number|null;waitingForVisibleScene:boolean;tick:number;refusal:string|null;
  root:LocalGaitRoot;footModes:string[];events:unknown[];
  draw:{drawSerial:number;lod:string;sampledSeconds:number;drawnActors:number};
  contact:{samples:number;minimumShoeM:number;maximumPlantMinimumM:number;maximumDriftM:number;fullBodySamples:number};
}
export interface LocalWalker { root:Group;setStyle(style:WorldStyle):void;moving():boolean;status():LocalWalkStatus;dispose():void }
interface Packet { version:string;seed:number;variant:number;slot:number;generation:number;scale:number;files:BindingFile[];sourceInputs:{path:string;sha256:string}[] }
interface BindingFile { name:string;sha256:string }
const json=async<T>(url:string,sha:string):Promise<T>=>JSON.parse(new TextDecoder().decode(await fetchAsset(url,sha))) as T;
/** Preserve nested data directories after the source cache's first data marker. */
export function localWalkSourceUrl(path:string):string {
  const marker='/data/',start=path.indexOf(marker);
  if(start<0||start+marker.length===path.length)throw Error('Local walker source path '+path+' lacks a file after /data/. Restore the retained source packet.');
  return '/'+path.slice(start+marker.length);
}
export async function createLocalWalker(options:{renderer:WebGLRenderer;camera:Camera;loop:RenderLoop;document:Document;network:NetworkData;style:WorldStyle;ready:()=>boolean}):Promise<LocalWalker>{
  if(!binding)throw Error('Local walker has no private source binding.');
  const packet=await json<Packet>(binding.url,binding.sha256),base=binding.url.slice(0,binding.url.lastIndexOf('/')+1);
  if(packet.version!=='private-native253'||packet.seed!==5970698||packet.variant!==2||packet.slot!==0||packet.generation!==1||packet.scale!==1.0391258001327515)throw Error('Local walker identity differs from the accepted ordinary seeded female.');
  const read=<T>(name:string):Promise<T>=>{const f=packet.files.find(f=>f.name===name);if(!f)throw Error('Private local walker packet lacks '+name);return json<T>(base+name,f.sha256);};
  const context=await read<LocalContext>('context.json'),rigs=await Promise.all(['near','medium','far'].map(async id=>createLocalRig(await read<LocalRigPacket>('rig-'+id+'.json'))));
  // These hashes bind the actual scene bytes served in this run, including the
  // real conservative static geometry, not merely the historical probe's boxes.
  const liveInputs=packet.sourceInputs.filter(r=>r.path.includes('/data/')&&!r.path.includes('/agents/'));
  for(const r of liveInputs)await fetchAsset(localWalkSourceUrl(r.path),r.sha256);
  for(const [i,id]of context.route.entries())if(JSON.stringify(options.network.walks.find(e=>e.id===id))!==JSON.stringify(context.networkEdges[i]))throw Error('Live network local edge changed: '+id);
  const authorities=options.network.junctions.map(j=>({id:j.id,areas:j.conflictAreas??[{position:j.position,radiusM:j.radiusM}]}));
  if(JSON.stringify(authorities)!==JSON.stringify(context.authority))throw Error('Live unheld junction geometry changed.');
  const mf=packet.sourceInputs.find(r=>r.path.endsWith('/data/scene/agents/commuter-female.json'));if(!mf)throw Error('Private female manifest binding is missing.');
  const manifest=await json<AgentAssetManifest>('/scene/agents/commuter-female.json',mf.sha256),floor=createLocalFloor(context),engine=createOrderedFootEngine(floor.normalizedFloor);
  const owner=new LocalWalkGait(context.legs,{generation:1,scale:context.scale,cruiseMps:1.1*context.scale,accelerationMps2:1.1*context.scale/.4,turnRateRadps:Math.PI/2,origin:context.origin,floorY:(x,z)=>floor.floorAt(x,z).y},engine,rigs[0]!.d);
  const admission=new LocalSupportAdmission(context,rigs,engine);admission.observe(owner.current(),true);
  const draw=new LocalWalkDraw(options.renderer,engine,context);await draw.load(rigs,manifest,options.style);
  let disposed=false,started=false,startFrame:number|null=null,tick=0,frame:LocalGaitFrame|null=null,refusal:string|null=null,lastEvent=0;
  const button=options.document.createElement('button');button.id='local-walk-start';button.type='button';button.textContent='Preparing pedestrian prototype…';button.disabled=true;
  Object.assign(button.style,{position:'fixed',left:'16px',top:'210px',minHeight:'44px',padding:'10px 16px',zIndex:'30',font:'14px system-ui'});options.document.body.append(button);
  const start=()=>{if(disposed||started||refusal||!options.ready()||draw.status().drawSerial===0)return;started=true;startFrame=options.loop.frameCount;button.disabled=true;button.textContent='Pedestrian prototype running';};button.addEventListener('click',start);
  const stopFixed=options.loop.onFixedStep(dt=>{
    if(disposed||!started||refusal||!options.ready())return;
    const saved=admission.checkpoint();
    try{frame=owner.advance(dt,{occupancy:Object.freeze({tick:tick+1,otherActors:Object.freeze([])}),foot(proposal){
      if(!proposal.sourceSurface?.startsWith('hero:')||!proposal.landingSurface?.startsWith('hero:'))return {ok:false,reason:'Actual local source/landing patch identity missing'};
      return {ok:true,sourceSurface:proposal.sourceSurface,landingSurface:proposal.landingSurface,evidence:{kind:'actual retained hero patches; actual posed interval checked before adoption'}};
    },interval(candidate,occupancy){if(occupancy.otherActors.length) return {ok:false,reason:'One-actor native scope received other actors'};
      try{const event=localGaitEventCount(candidate.current)!==lastEvent;admission.observe(candidate.sample(.5,1),event);admission.observe(candidate.current,event);return {ok:true};}catch(error){return {ok:false,reason:String(error)};}
    }});tick++;if(frame.refused){admission.restore(saved);refusal=frame.refused;}else lastEvent=localGaitEventCount(frame.current);
    }catch(error){admission.restore(saved);refusal=String(error);}
    if(refusal){button.textContent='Pedestrian prototype held: '+refusal;button.disabled=true;}
  });
  const stopFrame=options.loop.onFrame((_dt,_elapsed,alpha)=>{
    if(disposed)return;
    const visible=options.ready();
    if(!started&&!refusal){button.disabled=!visible||draw.status().drawSerial===0;button.textContent=button.disabled?'Preparing pedestrian prototype…':'Run pedestrian prototype';}
    const sample=frame?frame.sample(started&&visible&&!refusal?alpha:1,1):owner.current();draw.update(sample,options.camera);
  });
  return {root:draw.root,setStyle:style=>draw.setStyle(style),moving:()=>started&&!refusal,
    status:()=>{const current=frame?.current??owner.current();return structuredClone({actor:{seed:packet.seed,variant:packet.variant,slot:packet.slot,generation:packet.generation,scale:packet.scale},started,startFrame,waitingForVisibleScene:!options.ready(),tick,refusal,root:current.root,footModes:current.gait.feet.map((f:{mode:string})=>f.mode),events:current.gait.events,draw:draw.status(),contact:admission.measures});},
    dispose(){if(disposed)return;disposed=true;stopFixed();stopFrame();button.removeEventListener('click',start);button.remove();draw.dispose();}};
}
