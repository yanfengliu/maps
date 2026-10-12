// Explicit preparation launch. Importing this module never starts preparation.
import {spawn} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';
import {createUnusedOutput,ownedDataPath,projectPath,readPinned,sha256} from './paths.mjs';
import {FEMALE_SOURCE_INPUT,BAKER_INPUT,FEMALE_INPUTS} from './input-contract.mjs';

export function extractionPowerShell() {
  for(const directory of (process.env.PATH??'').split(path.delimiter)) {
    if(!directory)continue;
    const candidate=path.resolve(directory.replace(/^"|"$/g,''),'pwsh.exe');
    if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;
  }
  throw Error('Female extraction requires PowerShell7 pwsh.exe on PATH; add its directory to PATH before retrying owned Windows extraction');
}

/** One finite extraction process. Optional cutoffs are for focused CPU controls. */
export async function runExtractionProcess(executable,args,options,owned,{timeoutMs=180000,cleanupMs=5000}={}) {
  if(!Number.isInteger(timeoutMs)||timeoutMs<=0||timeoutMs>180000||!Number.isInteger(cleanupMs)||cleanupMs<=0||cleanupMs>10000)throw Error('Female extraction requires finite180s/10s maximum deadlines');
  const windows=process.platform==='win32',helper=path.join(import.meta.dirname,'extract-windows.ps1'),cancel=path.join(owned,'extract-cancel.txt'),closure=path.join(owned,'extract-owned-closure.json'),specification=path.join(owned,'extract-owned-specification.json');
  let helperBefore,child,aborted=null,spawnError=null,timer,grace,emergencyWait,emergency=false,settled=false,actual={pid:null,exitCode:null,completed:false};
  if(windows){
    helperBefore=fs.readFileSync(helper);
    const powershell=extractionPowerShell();
    fs.writeFileSync(specification,JSON.stringify({executable,arguments:args,cwd:options.cwd,cancelPath:cancel,closurePath:closure,timeoutMs,cleanupMs},null,2)+'\n',{flag:'wx'});
    child=spawn(powershell,['-NoLogo','-NoProfile','-NonInteractive','-File',helper,'-SpecificationPath',specification],{...options,windowsHide:true});
  }else child=spawn(executable,args,{...options,windowsHide:true});
  const outcome=new Promise((resolve,reject)=>{
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(grace);clearTimeout(emergencyWait);process.off('SIGINT',onInterrupt);process.off('SIGTERM',onTerminate);if(error){error.extraction=actual;reject(error);}else resolve(actual);};
    const abort=reason=>{
      if(aborted||settled)return;aborted=reason;
      try{if(windows)fs.writeFileSync(cancel,reason+'\n',{flag:'wx'});else if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');}catch(error){aborted+='; stop request failed: '+String(error);}
      grace=setTimeout(()=>{
        // Emergency termination uses the actual retained child handle. It is not closure evidence.
        emergency=true;
        try{if(child.exitCode===null&&child.signalCode===null)child.kill(windows?undefined:'SIGKILL');}catch(error){aborted+='; held child termination failed: '+String(error);}
        emergencyWait=setTimeout(()=>finish(Error('Female extraction '+aborted+'; owned closure unconfirmed and held helper/direct child did not close within1s after emergency termination')),1000);
      },cleanupMs+1000);
    };
    const onInterrupt=()=>abort('interrupted by SIGINT'),onTerminate=()=>abort('interrupted by SIGTERM');
    process.on('SIGINT',onInterrupt);process.on('SIGTERM',onTerminate);
    timer=setTimeout(()=>abort('timed out after '+timeoutMs+'ms'),timeoutMs);
    child.once('error',error=>{spawnError=String(error);abort('spawn failed: '+spawnError);});
    child.once('close',(code,signal)=>{
      try{
        if(emergency)throw Error('Female extraction '+aborted+'; held helper/direct child closed after emergency termination, owned tree closure unconfirmed');
        if(windows){
          if(spawnError)throw Error('Female extraction helper spawn failed: '+spawnError+'; no Blender child was admitted');
          let raw;try{raw=JSON.parse(fs.readFileSync(closure,'utf8'));}catch(error){throw Error('Female extraction owned closure receipt missing or unreadable: '+String(error));}
          actual={pid:raw.result.pid,exitCode:raw.result.exitCode,completed:false,closure:raw};
          if(raw.helperPid!==child.pid||raw.helperScriptSha256!==sha256(helperBefore)||sha256(fs.readFileSync(helper))!==sha256(helperBefore)||raw.executable!==executable||JSON.stringify(raw.arguments)!==JSON.stringify(args)||raw.cwd!==options.cwd)throw Error('Female extraction helper source/identity/arguments changed; owned closure refused');
          const result=raw.result;
          if(!result.jobEmpty||result.activeAtClosure!==0||!result.handlesClosed||!result.jobHandleNonInheritable||(result.pid!==null&&!result.processExited))throw Error('Female extraction owned closure unconfirmed: '+String(result.error));
          if(aborted||result.aborted)throw Error('Female extraction '+(aborted??result.abortReason)+'; owned tree closed');
          if(code!==0||signal||result.error||result.exitCode!==0||!result.assignedAtCreation||!result.assignedBeforeResume||!result.resumed||!result.attributeListDisposed)throw Error('Female extraction failed: '+String(result.error??('helper exit '+code)));
        }else{
          actual={pid:child.pid,exitCode:code,completed:false};
          if(aborted)throw Error('Female extraction '+aborted+'; direct child closed');
          if(code!==0||signal||spawnError)throw Error('Female extraction exited '+code+(signal?' / '+signal:''));
        }
        actual.completed=true;finish();
      }catch(error){finish(error);}
    });
  });
  try{return await outcome;}finally{clearTimeout(timer);clearTimeout(grace);clearTimeout(emergencyWait);}
}

export async function extractReference(project,outputRelative,blender) {
  if(typeof blender!=='string'||!blender||!fs.existsSync(blender))throw Error('Female extraction requires the explicitly selected Blender5.2 executable');
  const output=ownedDataPath(project,outputRelative);if(fs.existsSync(output))throw Error('Female extraction output already exists: '+outputRelative);
  if(process.platform==='win32')extractionPowerShell();
  const inputs=[FEMALE_SOURCE_INPUT,BAKER_INPUT,...FEMALE_INPUTS],before=inputs.map(binding=>({path:binding.path,bytes:readPinned(project,binding).length,sha256:binding.sha256}));
  const user=createUnusedOutput(project,outputRelative+'-blender-user');
  for(const name of ['config','scripts','datafiles','extensions','temp'])fs.mkdirSync(path.join(user,name));
  const args=['--background','--factory-startup','--offline-mode','--python-exit-code','1','--python',projectPath(project,'tools/agents/local-walk/extract.py'),'--',path.resolve(project),outputRelative];
  const options={cwd:project,windowsHide:true,stdio:'inherit',env:{...process.env,BLENDER_USER_RESOURCES:user,BLENDER_USER_CONFIG:path.join(user,'config'),BLENDER_USER_SCRIPTS:path.join(user,'scripts'),BLENDER_USER_DATAFILES:path.join(user,'datafiles'),BLENDER_USER_EXTENSIONS:path.join(user,'extensions'),TEMP:path.join(user,'temp'),TMP:path.join(user,'temp')}};
  let actual={pid:null,exitCode:null,completed:false},error;
  try{actual=await runExtractionProcess(blender,args,options,user);}catch(failure){actual=failure.extraction??actual;error=String(failure);throw failure;}
  finally{
    const unchanged=before.every(binding=>sha256(fs.readFileSync(projectPath(project,binding.path)))===binding.sha256);
    const receipt={pid:actual.pid,exitCode:actual.exitCode,completed:actual.completed,sourceUnchanged:unchanged,error,inputs:before};
    fs.writeFileSync(path.join(user,'extract-process.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    if(fs.existsSync(output))fs.writeFileSync(path.join(output,'extract-process.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    if(!unchanged)throw Error('Delivered female source or assets changed during reference extraction');
  }
}
