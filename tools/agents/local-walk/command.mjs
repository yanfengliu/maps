// Explicit private bounded producer command. Importing this module never starts preparation.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {captureModules} from './module-inventory.mjs';
let entered=false;
export function parsePreparationArguments(args) {
  const allowed=new Set(['--project','--profile','--blender']),values={};
  for(let i=0;i<args.length;i+=2){const flag=args[i],value=args[i+1];if(!allowed.has(flag)||!value||value.startsWith('--')||Object.hasOwn(values,flag))throw Error('Walker preparation requires each --project/--profile/--blender option at most once with its value; received '+flag);values[flag]=value;}
  return {project:path.resolve(values['--project']??path.resolve(import.meta.dirname,'../../..')),profile:values['--profile']??'historical',blender:values['--blender']??process.env.MAPS_BLENDER_PATH};
}
export async function runPreparation(options) {
  if(entered)throw Error('Bounded walker preparation requires a fresh Node process per project');entered=true;
  const project=path.resolve(options.project),profileName=options.profile??'historical',inventory=captureModules({bootUrls:[import.meta.url,new URL('./module-inventory.mjs',import.meta.url)]}),referenceRelative='data/agents/local-walk/reference',outputRelative='data/scene/local-walk/packet';
  const stages=[];let reference,referenceStarted=false,profileInputs,assetInputs,result,error;
  try {
    if(fs.realpathSync(project)!==fs.realpathSync(path.resolve(import.meta.dirname,'../../..')))throw Error('Walker preparation must execute its repo-owned command in the selected project root; copy the frozen source into each isolated project first');
    const {assertInputProfile,inputProfile}=await import('./profile.mjs'),{ownedDataPath,readPinned}=await import('./paths.mjs'),{FEMALE_SOURCE_INPUT,BAKER_INPUT,FEMALE_INPUTS}=await import('./input-contract.mjs');
    const profile=inputProfile(profileName);reference=ownedDataPath(project,referenceRelative);const output=ownedDataPath(project,outputRelative);
    if(fs.existsSync(reference)||fs.existsSync(output))throw Error('Walker preparation requires unused reference and packet directories; preserve the existing run before starting');
    if(!options.blender||!fs.existsSync(options.blender))throw Error('Walker preparation requires an explicitly selected Blender5.2 executable via --blender or MAPS_BLENDER_PATH');
    profileInputs=assertInputProfile(project,profile.id);
    assetInputs=[FEMALE_SOURCE_INPUT,BAKER_INPUT,...FEMALE_INPUTS].map(row=>({...row,bytes:readPinned(project,row).length}));
    const {extractReference}=await import('./extract-launch.mjs'),{prepareCorrespondence}=await import('./correspondence.ts'),{preparePacket}=await import('./prepare.mjs');
    const decoder=createRequire(new URL('../../tiles/draco.ts',import.meta.url)).resolve('three/examples/jsm/libs/draco/draco_decoder.js');inventory.bindFile(pathToFileURL(decoder));
    referenceStarted=true;await extractReference(project,referenceRelative,options.blender);stages.push({stage:'extraction',completedAt:new Date().toISOString()});
    const correspondence=prepareCorrespondence(project,referenceRelative);stages.push({stage:'correspondence',completedAt:new Date().toISOString(),passed:correspondence.passed});
    result=await preparePacket(project,referenceRelative,outputRelative,profile.id);stages.push({stage:'complete context/obstacle factory then packet assembly',completedAt:new Date().toISOString(),files:result.files});
  } catch(failure){error=String(failure);throw failure;}
  finally {
    const verify=rows=>rows?.map(row=>{try{const bytes=fs.readFileSync(path.resolve(project,row.path)),sha256=createHash('sha256').update(bytes).digest('hex');return {path:row.path,available:true,bytes:bytes.length,sha256,matches:bytes.length===row.bytes&&sha256===row.sha256};}catch(failure){return {path:row.path,available:false,matches:false,error:String(failure)};}})??null;
    const imports=inventory.close(),profileAfter=verify(profileInputs),assetsAfter=verify(assetInputs),dataUnchanged=profileAfter!==null&&assetsAfter!==null&&[...profileAfter,...assetsAfter].every(row=>row.matches),receipt={status:result&&dataUnchanged&&imports.inputsUnchanged?'unadmitted bounded generation completed':'bounded preparation refused',createdAt:new Date().toISOString(),project,profile:profileName,referenceRelative,outputRelative,profileInputs,assetInputs,profileAfter,assetsAfter,dataUnchanged,stages,error,imports,productionReady:false,normalAdoption:'withheld'};
    if(referenceStarted&&reference&&fs.existsSync(reference))fs.writeFileSync(path.join(reference,'command-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    if(!imports.inputsUnchanged)throw Error('Actual consumed producer module bytes changed; retained command receipt refuses this run');
    if(result&&!dataUnchanged)throw Error('Bounded preparation source/assets changed or became unavailable; retained command receipt refuses this run');
  }
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runPreparation(parsePreparationArguments(process.argv.slice(2))).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error);process.exitCode=1;});
