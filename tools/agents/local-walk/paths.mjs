import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function projectPath(project,relative) {
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||path.win32.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw Error('Preparation input must be a repository-relative path: '+relative);
  const root=path.resolve(project),target=path.resolve(root,relative);
  if(target!==root&&!target.startsWith(root+path.sep))throw Error('Preparation path escapes its repository: '+relative);
  return target;
}
export function ownedDataPath(project,relative) {
  const portable=relative.replaceAll('\\','/');
  if((!portable.startsWith('data/agents/')&&portable!=='data/scene/local-walk/packet')||portable.endsWith('/')||portable.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Owned preparation output must be a named directory below data/agents or exactly data/scene/local-walk/packet: '+relative);
  const root=path.resolve(project),target=projectPath(root,relative);
  for(let current=target;;current=path.dirname(current)){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Owned preparation output traverses a link: '+relative);if(current===root)break;}
  return target;
}
export function createUnusedOutput(project,relative) {
  const target=ownedDataPath(project,relative);
  if(fs.existsSync(target))throw Error('Owned preparation output already exists: '+relative);
  fs.mkdirSync(target,{recursive:true});
  return target;
}
export function readPinned(project,binding) {
  const bytes=fs.readFileSync(projectPath(project,binding.path)),digest=sha256(bytes);
  if(digest!==binding.sha256||(binding.bytes!==undefined&&bytes.length!==binding.bytes))throw Error('Preparation input '+binding.path+' differs from '+binding.sha256+'; restore its reviewed bytes before preparing');
  return bytes;
}
/** The existing consumer resolves its first /data/ marker. This is a draft successor path, not an admitted binding. */
export function sourcePath(relative) {
  if(relative.startsWith('data/'))return '/'+relative;
  if(relative.startsWith('src/')||relative.startsWith('tools/'))return relative;
  throw Error('Source provenance is outside the repository inputs: '+relative);
}
