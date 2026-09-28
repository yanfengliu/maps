import { Group, Mesh, MeshStandardMaterial, MeshDepthMaterial, MeshDistanceMaterial, Texture, RGBADepthPacking, Vector3, type BufferGeometry, type Material, type Camera, type WebGLRenderer } from 'three';
import type { AgentAssetManifest } from '../../world/agent-assets.js';
import type { WorldStyle } from '../../world/styles.js';
import type { LocalGaitSample } from '../population/local-walk-gait.js';
import type { OrderedFootEngine } from '../population/local-ordered/controller.mjs';
import type { LocalRig } from './local-walk-rig.js';
import type { LocalContext } from '../population/local-walk-support.js';
import { DifferentialGpu } from './local-differential/gpu.js';
import { prepare } from './local-differential/data.js';
import { loadModel, disposeTextures } from './assets.js';
import { admitHumanDraws } from './human-admission.js';
import { createAgentNormalMaterial } from './vat.js';
import { setAgentNormalMaterial, deleteAgentNormalMaterial } from './pass-materials.js';
import { clipCityMaterial, clipCityRoot } from '../../scene/aoi-cutout.js';
import { applyLocalDraw, localDrawUniforms, type LocalDrawUniforms } from './local-walk-material.js';
import { LocalWalkContact } from './local-walk-contact.js';
import { POPULATION_LIMITS } from '../population/config.js';
interface Part { mesh: Mesh; material: MeshStandardMaterial; originalColor: MeshStandardMaterial['color']; flatColor: number }
interface Level { root: Group; rig: LocalRig; gpu: DifferentialGpu; uniforms: LocalDrawUniforms; parts: Part[] }
const flatColor=(name:string):number=>/eye|brow|hair|short|bob/i.test(name)?0x45403a:/shoes/i.test(name)?0x6a5141:/casual|suit/i.test(name)?0x819bb1:0xcba68d;
export class LocalWalkDraw {
  readonly root=new Group();private levels:Level[]=[];private materials=new Set<Material>();private geometries=new Set<BufferGeometry>();private textures=new Set<Texture>();private disposed=false;
  private contact:LocalWalkContact|null=null;private cameraPosition=new Vector3();private serial=0;private level='unrendered';private lastTime=0;
  constructor(private renderer:WebGLRenderer,private engine:OrderedFootEngine,private context:LocalContext){this.root.name='local-supported-female-slot0-generation1';}
  async load(rigs:LocalRig[],manifest:AgentAssetManifest,style:WorldStyle):Promise<void>{
    try{for(const rig of rigs){
      if(this.disposed)throw Error('Local walker disposed during source loading.');
      const lod=rig.packet.lod,glb=await loadModel('/scene/agents/'+lod.model,lod.modelSha256);
      glb.scene.traverse(object=>{if(object instanceof Mesh){this.geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material]){this.materials.add(m);for(const v of Object.values(m))if(v instanceof Texture)this.textures.add(v);}}});
      if(this.disposed)throw Error('Local walker disposed after model loading.');
      const draws=admitHumanDraws(glb,lod,manifest.id+'/'+lod.id),actual:number[]=[];
      for(const object of draws){const vat=object.geometry.getAttribute('_vat_id'),index=object.geometry.index;for(let i=0;i<(index?.count??vat.count);i++)actual.push(vat.getX(index?index.getX(i):i));}
      if(actual.length!==rig.packet.source.triangles.length||actual.some((id,i)=>id!==rig.packet.source.triangles[i]))throw Error('Actual GLB triangle/VAT order disagrees with local differential source at '+lod.id);
      const level:Level={root:new Group(),rig,gpu:new DifferentialGpu(this.renderer,prepare(rig.packet.source)),uniforms:localDrawUniforms(),parts:[]};this.levels.push(level);this.root.add(level.root);
      for(const object of draws){if(!(object.material instanceof MeshStandardMaterial))throw Error('Local walker requires original standard material parts.');
        const source=object.material,material=source.clone();this.materials.add(material);material.transparent=false;material.depthWrite=true;material.alphaTest=.45;material.forceSinglePass=true;
        const geometry=object.geometry;geometry.setAttribute('agentVertex',geometry.getAttribute('_vat_id'));
        applyLocalDraw(material,level.uniforms,true,true);
        const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:material.side});
        const distance=new MeshDistanceMaterial({map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:material.side});
        const normal=createAgentNormalMaterial(material);
        for(const [m,n]of [[depth,false],[distance,false],[normal,true]] as const){this.materials.add(m);applyLocalDraw(m,level.uniforms,n);clipCityMaterial(m);}
        const mesh=new Mesh(geometry,material);mesh.name='local-walk:'+lod.id+':'+object.name;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=lod.id==='near';mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;setAgentNormalMaterial(mesh,normal);level.root.add(mesh);
        level.parts.push({mesh,material,originalColor:material.color.clone(),flatColor:flatColor(source.name)});
      }
    }this.contact=new LocalWalkContact(this.context,rigs[0]!);this.root.add(this.contact.mesh);clipCityRoot(this.root);this.setStyle(style);}catch(error){this.dispose();throw error;}
  }
  update(sample:LocalGaitSample,camera:Camera):void{
    if(this.disposed)throw Error('Disposed local walker cannot draw.');
    camera.getWorldPosition(this.cameraPosition);const r=sample.root,distance=this.cameraPosition.distanceTo(new Vector3(r.x,r.y,r.z)),selected=distance<POPULATION_LIMITS.nearThresholdM?0:distance<POPULATION_LIMITS.mediumThresholdM?1:2;
    for(const [i,l]of this.levels.entries())l.root.visible=i===selected;
    const level=this.levels[selected];if(!level)throw Error('Local walker LOD was not loaded.');
    const pose=this.engine.scenePose(level.rig.d,level.rig.source,sample.gait,sample.input);if(!pose.valid||!pose.mats)throw Error('Actual female draw pose could not solve '+level.rig.packet.id);
    const c=this.context,frame=level.gpu.render({palette:pose.mats.flatMap(m=>m.toArray()),yaw:sample.input.yaw,body:sample.input.body as [number,number,number],origin:[c.origin.x,c.origin.y,c.origin.z],scale:c.scale});
    level.uniforms.localPositions.value=frame.localPositions.texture;level.uniforms.worldNormals.value=frame.normals.texture;level.uniforms.width.value=frame.localPositions.width;
    // All parts and shadow/AO/depth draws read this one sampled root+rig pair.
    this.root.position.set(r.x,r.y,r.z);this.root.rotation.set(0,sample.input.yaw,0);this.root.scale.setScalar(c.scale);this.root.updateMatrixWorld(true);this.contact?.update(sample,this.root,distance);
    this.serial++;this.level=level.rig.packet.id;this.lastTime=r.elapsedSeconds;
  }
  status(){return {drawSerial:this.serial,lod:this.level,sampledSeconds:this.lastTime,drawnActors:this.serial?1:0};}
  setStyle(style:WorldStyle):void{this.contact?.setStyle(style);for(const l of this.levels)for(const p of l.parts){const photo=style.facade==='photographic';p.material.color.copy(p.originalColor);p.material.roughness=photo?.8:.95;l.uniforms.flat.value=photo?0:1;/* Per-part RGB, alpha and UVs remain original. */p.material.onBeforeRender=()=>{l.uniforms.flatColor.value.setHex(p.flatColor);};p.material.needsUpdate=true;}}
  dispose():void{if(this.disposed)return;this.disposed=true;this.contact?.dispose();for(const l of this.levels){for(const p of l.parts)deleteAgentNormalMaterial(p.mesh);l.gpu.dispose();}for(const m of this.materials)m.dispose();for(const g of this.geometries)g.dispose();disposeTextures(this.textures);this.root.clear();this.root.removeFromParent();}
}
