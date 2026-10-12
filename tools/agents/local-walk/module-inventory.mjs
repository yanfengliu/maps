// Bind actual file-backed imports. Raw returned bytes, not presumed sibling copies, are hashed.
import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {registerHooks} from 'node:module';import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function captureModules({bootUrls=[],resolveOverride}={}) {
  const rows=new Map(),builtins=new Set();let closed=false;
  const bind=(url,kind,bytes)=>{const file=fileURLToPath(url),row={url,path:file,bytes:bytes.length,sha256:sha(bytes),kind},prior=rows.get(url);if(prior&&prior.sha256!==row.sha256)throw Error('Consumed module changed while loading '+file);rows.set(url,row);return bytes;};
  for(const url of bootUrls)bind(String(url),'boot-file',fs.readFileSync(fileURLToPath(url)));
  const hooks=registerHooks({
    resolve(specifier,context,next){return resolveOverride?resolveOverride(specifier,context,next):next(specifier,context);},
    load(url,context,next){const result=next(url,context);if(url.startsWith('node:')){builtins.add(url);return result;}if(!url.startsWith('file:'))throw Error('Preparation import has unsupported source URL '+url);const bytes=bind(url,'actual-loader-bytes',fs.readFileSync(fileURLToPath(url)));return {...result,source:bytes};},
  });
  return {bindFile(url,kind='explicit VM-source prerequisite'){return bind(String(url),kind,fs.readFileSync(fileURLToPath(url)));},close(){if(!closed){hooks.deregister();closed=true;}const before=[...rows.values()],after=before.map(row=>{try{const bytes=fs.readFileSync(row.path);return {...row,available:true,bytes:bytes.length,sha256:sha(bytes)};}catch(error){return {...row,available:false,bytes:null,sha256:null,error:String(error)};}});return {before,after,inputsUnchanged:after.every((row,i)=>row.available&&row.bytes===before[i].bytes&&row.sha256===before[i].sha256),builtins:[...builtins],hooksDeregistered:true,synchronousReadersClosed:true};}};
}
