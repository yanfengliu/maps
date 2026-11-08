#!/usr/bin/env node
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {resolve, dirname, relative, extname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PINNED_PART_COUNT, REALISM_REFERENCES} from './realism-references.mjs';

const states = new Set(['photo-supported','document-supported','prior-review','inferred']);
const urlOK = value => {try{return ['https:','http:'].includes(new URL(value).protocol);}catch{return false;}};
const countBy = (items,key) => Object.fromEntries([...new Set(items.map(key))].sort().map(value=>[value,items.filter(item=>key(item)===value).length]));
const hash = value=>createHash('sha256').update(value).digest('hex');
const textModelExtensions=new Set(['.ts','.tsx','.css','.json','.geojson','.svg','.html','.js','.mjs','.txt','.md','.yaml','.yml']);
const modelInputHash=(path,bytes)=>hash(textModelExtensions.has(extname(path).toLowerCase())?bytes.toString('utf8').replaceAll('\r\n','\n'):bytes);
const nonempty = value=>typeof value==='string'&&value.trim().length>0;

/** A render is not a photographic reference. Evidence must state exactly what it supports. */
export function validateReference(reference) {
  const errors=[];
  for(const field of ['key','title','reviewedAt','reviewBasis','observed','limitations'])if(!nonempty(reference[field]))errors.push(`missing ${field}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(reference.reviewedAt??''))errors.push('reviewedAt must be a calendar date');
  if(!states.has(reference.status))errors.push('unsupported evidence status; whole-model verified/realistic claims are prohibited');
  if(!Array.isArray(reference.ids)||!reference.ids.length)errors.push('missing part IDs');
  if(!Array.isArray(reference.sources)||!reference.sources.length)errors.push('missing sources');
  for(const s of reference.sources??[]){
    if(!urlOK(s.url))errors.push('source URL must be HTTP(S)');
    if(!['photo','document','source-tag','context'].includes(s.kind))errors.push('invalid source kind; generated renders are not references');
    if(!nonempty(s.date))errors.push('source date or explicit undated value required');
  }
  if(reference.status==='photo-supported'&&!reference.sources?.some(s=>s.kind==='photo'))errors.push('photo-supported status has no photograph');
  if(reference.status==='document-supported'&&!reference.sources?.some(s=>['document','source-tag'].includes(s.kind)))errors.push('document-supported status has no document/tag');
  return errors;
}

/** Metamorphic check: changing an academic department name cannot invent a glass building. */
export function academicNameViolations(architecture) {
  const problems=[];
  const signature=p=>{const a=architecture(p,12);return JSON.stringify([a.profile,a.facadeFamily,a.roofShape]);};
  for(const type of ['yes','university','school']){
    const p={id:'way/999999999999',building:type,base:0,height:12,heightSource:'estimated',name:'Unnamed building'};
    const baseline=signature(p);
    for(const name of ['Mechanical Engineering Administration','Physics Laboratory','Chemistry Department','Computer Science','Medical Research Laboratory'])if(signature({...p,name})!==baseline)problems.push(`${type}: ${name}`);
  }
  return problems;
}

/** Audit all parts, including unnamed and small structures, without promoting estimates. */
export function auditInventory({source,prepared,registry=REALISM_REFERENCES,architecture,expectedCount=PINNED_PART_COUNT,geometry=null,renderReviews=[],modelDigest=null}) {
  const errors=[],warnings=[],features=source.features??[],details=prepared.features??[];
  const issue=(code,message)=>errors.push({code,message});
  if(features.length!==expectedCount)issue('source-count',`Expected ${expectedCount} pinned source parts; found ${features.length}. Source changes require a reviewed inventory update.`);
  const sourceIds=features.map(f=>String(f.properties?.id));
  const detailIds=details.map(f=>String(f.properties?.id));
  if(new Set(sourceIds).size!==sourceIds.length)issue('duplicate-source-id','Source IDs are not unique.');
  if(new Set(detailIds).size!==detailIds.length)issue('duplicate-detail-id','Prepared IDs are not unique.');
  const sourceSet=new Set(sourceIds),detailSet=new Set(detailIds);
  for(const id of sourceIds)if(!detailSet.has(id))issue('missing-inventory-part',id);
  for(const id of detailIds)if(!sourceSet.has(id))issue('unexpected-inventory-part',id);
  const referenceMap=new Map(),keys=new Set();
  for(const r of registry){
    for(const error of validateReference(r))issue('invalid-reference',`${r.key??'unnamed'}: ${error}`);
    if(keys.has(r.key))issue('duplicate-reference-key',r.key);keys.add(r.key);
    for(const id of r.ids??[]){
      if(!sourceSet.has(id))issue('stale-reference-id',`${r.key}: ${id}`);
      if(referenceMap.has(id))issue('duplicate-reference-id',id);referenceMap.set(id,r);
    }
  }
  if(architecture)for(const message of academicNameViolations(architecture))issue('academic-name-inference',message);
  const reviewMap=new Map();
  for(const review of renderReviews){
    if(!['compared','needs-work','partial','pass-with-limitations'].includes(review.result)||!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt??'')||!nonempty(review.notes)||!nonempty(review.reviewer)||!review.ids?.length||!review.views?.length||!review.referenceKeys?.length)issue('invalid-render-review','A comparison needs date, reviewer, notes, part IDs, actual views, reference keys and a bounded result.');
    if(!/^[a-f0-9]{64}$/.test(review.modelDigest??'')||(modelDigest&&review.modelDigest!==modelDigest))issue('stale-model-review','Comparison is not bound to the audited model inputs.');
    for(const key of review.referenceKeys??[])if(!keys.has(key))issue('unknown-review-reference',key);
    for(const id of review.ids??[]){
      if(!sourceSet.has(id))issue('stale-review-id',id);
      if(!review.referenceKeys?.includes(referenceMap.get(id)?.key))issue('unbacked-render-review',`${id} has no matching reference comparison.`);
      if(reviewMap.has(id))issue('duplicate-render-review',id);reviewMap.set(id,review);
    }
  }
  const detailMap=new Map(details.map(f=>[String(f.properties?.id),f]));
  const rows=features.map(f=>{
    const p=f.properties??{},id=String(p.id),d=detailMap.get(id)?.properties??{},a=d.detailArchitecture??{};
    const evidence=referenceMap.get(id),review=reviewMap.get(id),risks=[];
    if(!d.detailArchitecture)issue('missing-architecture',id);
    if(!['osm-height','osm-levels','estimated'].includes(p.heightSource))issue('height-provenance',`${id}: ${p.heightSource}`);
    if(!Number.isFinite(p.height)||!Number.isFinite(p.base)||p.height<p.base)issue('invalid-height',id);
    for(const k of Object.keys(p))if(JSON.stringify(d[k])!==JSON.stringify(p[k]))issue('source-property-changed',`${id}: ${k}`);
    if(evidence?.expected)for(const [key,value] of Object.entries(evidence.expected))if(a[key]!==value)issue('reference-treatment-drift',`${id}: ${key} expected ${value}, got ${a[key]}`);
    if(['reference-profile','official-description'].includes(a.floorSource)||['reference-profile','official-description'].includes(a.roofSource))if(!evidence)issue('missing-profile-reference',id);
    if(!evidence)risks.push('No individual architectural reference');
    if(evidence?.status==='inferred')risks.push('Identity or function inferred');
    if(evidence?.status==='prior-review')risks.push('Legacy reference; current render comparison required');
    if(p.heightSource==='estimated')risks.push('Default source height');
    if(p.heightSource==='osm-levels')risks.push('Height estimated from mapped levels');
    if(a.roofSource==='estimated')risks.push('Roof shape estimated');
    if(a.facadeFamily==='unverified')risks.push('Academic facade explicitly unverified');
    if(!evidence&&a.profile==='modern')risks.push('Generic modern facade');
    if(!evidence&&a.profile==='garage')risks.push('Unreviewed garage type');
    if(!review)risks.push('No current reference-to-render comparison');
    if(review?.result==='partial')risks.push('Partial visual comparison; coverage remains incomplete');
    if(review?.result==='needs-work')risks.push('Visual comparison has unresolved findings');
    const heightMeaning=p.heightSource==='osm-height'?'Recorded OSM height; not independently measured':p.heightSource==='osm-levels'?'Estimated from recorded OSM levels':'Default estimate by building type';
    return {id,name:p.name||'(unnamed)',building:p.building,part:Boolean(p.part),profile:a.profile??'missing',facadeFamily:a.facadeFamily??'missing',roof:a.roofShape??'missing',roofSource:a.roofSource??'missing',floors:a.floors??null,floorSource:a.floorSource??'missing',mappedLevels:a.mappedLevels??null,sourceHeight:p.height,sourceBase:p.base,heightSource:p.heightSource,heightMeaning,renderWallHeight:d.detailWallHeight,renderRoofHeight:d.detailRoofHeight,heightAdjusted:d.detailRoofHeight!==p.height,sourceTags:Object.fromEntries(Object.entries(p).filter(([k])=>k.startsWith('osm:'))),evidenceStatus:evidence?.status??'unverified',referenceKey:evidence?.key??null,renderReview:review?{result:review.result,reviewedAt:review.reviewedAt,reviewer:review.reviewer,notes:review.notes,views:review.views}:null,risks};
  });
  if(geometry){
    if(geometry.parts!==features.length)issue('geometry-part-count',`${geometry.parts} built; ${features.length} source parts.`);
    if(!geometry.finite)issue('nonfinite-geometry','Generated campus mesh contains non-finite values.');
    if(geometry.gpuBytes>geometry.gpuBudgetBytes)issue('gpu-budget',`${geometry.gpuBytes} > ${geometry.gpuBudgetBytes}`);
    if(geometry.triangles>geometry.triangleBudget)issue('triangle-budget',`${geometry.triangles} > ${geometry.triangleBudget}`);
  }
  const unverified=rows.filter(r=>r.evidenceStatus==='unverified').length;
  if(unverified)warnings.push(`${unverified} parts have no individual architectural evidence; the audit passing does not make them realistic.`);
  const missingRender=rows.filter(r=>!r.renderReview).length;
  if(missingRender)warnings.push(`${missingRender} parts have no registered current reference-to-render comparison.`);
  warnings.push('Part counts include grouped landmark components. They are evidence coverage, not numbers of independently verified buildings.');
  return {schemaVersion:1,generatedAt:new Date().toISOString(),modelDigest,gate:{status:errors.length?'fail':'pass',meaning:'Inventory/provenance/resource integrity only; never photographic fidelity acceptance.'},counts:{sourceParts:features.length,inventoryParts:rows.length,referenceGroups:registry.length,evidence:countBy(rows,r=>r.evidenceStatus),heightSources:countBy(rows,r=>r.heightSource),roofSources:countBy(rows,r=>r.roofSource),profiles:countBy(rows,r=>r.profile),unverifiedProfiles:countBy(rows.filter(r=>r.evidenceStatus==='unverified'),r=>r.profile),riskFamilies:countBy(rows.flatMap(r=>r.risks),r=>r),renderComparisons:rows.length-missingRender,renderComparisonUnit:'source parts, not independent views',comparisonRecords:renderReviews.length,comparisonResults:countBy(rows.filter(r=>r.renderReview),r=>r.renderReview.result)},geometry,errors,warnings,references:registry,rows};
}

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>urlOK(url)?`<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape(label)}</a>`:escape(label);
export function renderReport(report) {
  const refMap=new Map(report.references.map(r=>[r.key,r]));
  const rows=report.rows.map(r=>{const ref=refMap.get(r.referenceKey);return `<tr data-status="${escape(r.evidenceStatus)}"><td><b>${escape(r.name)}</b><br>${escape(r.id)}<br>${escape(r.building)}${r.part?' · part':''}</td><td>${escape(r.profile)} / ${escape(r.facadeFamily)}<br>Roof: ${escape(r.roof)} (${escape(r.roofSource)})<br>Facade rows: ${escape(r.floors??'n/a')} (${escape(r.floorSource)})<br>Mapped levels: ${escape(r.mappedLevels??'absent')}</td><td>Source ${escape(r.sourceBase)}–${escape(r.sourceHeight)} m<br>${escape(r.heightMeaning)}<br>Render wall/roof: ${escape(r.renderWallHeight)} / ${escape(r.renderRoofHeight)} m${r.heightAdjusted?'<br><b>Authored envelope differs</b>':''}<details><summary>Source tags</summary><pre>${escape(JSON.stringify(r.sourceTags,null,2))}</pre></details></td><td><b>${escape(r.evidenceStatus)}</b>${ref?`<br>${escape(ref.title)}<br>Reviewed ${escape(ref.reviewedAt)}<p>${escape(ref.observed)}</p><p><b>Limits:</b> ${escape(ref.limitations)}</p>${ref.sources.map(s=>link(s.url,`${s.kind} · ${s.date}`)).join(' · ')}`:''}</td><td>${r.renderReview?`${escape(r.renderReview.result)} · ${escape(r.renderReview.reviewedAt)}<p>${escape(r.renderReview.notes)}</p>`:'Not compared'}<ul>${r.risks.map(x=>`<li>${escape(x)}</li>`).join('')}</ul></td></tr>`;}).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Campus realism evidence audit</title><style>body{font:15px/1.45 system-ui,sans-serif;margin:30px;color:#26332c;background:#f5f5ef}h1{margin-bottom:6px}p{max-width:1100px}table{width:100%;border-collapse:collapse;background:white}td,th{padding:12px;border:1px solid #ddd;vertical-align:top;text-align:left}th{position:sticky;top:0;background:#e4eadd}td:nth-child(4){width:30%}input,select{font:inherit;padding:10px;margin:10px 8px 16px 0}input{width:min(600px,90%)}pre{white-space:pre-wrap;font-size:12px}a{color:#146348}small{color:#526056}.summary{background:#fff;padding:16px;border-left:5px solid #899c7d}li{margin-bottom:4px}tr[hidden]{display:none}</style><h1>Campus realism evidence audit</h1><p>${escape(report.generatedAt)} · Source SHA-256 ${escape(report.sourceSha256??'not recorded')}</p><div class="summary"><b>Integrity gate: ${escape(report.gate.status.toUpperCase())}</b><p>${escape(report.gate.meaning)}</p><p>${report.counts.sourceParts} source parts · ${report.counts.renderComparisons} source parts with registered comparisons (not independent views). No realism percentage or score is calculated.</p><pre>${escape(JSON.stringify(report.counts,null,2))}</pre></div><h2>Separate geometry checks</h2><p>Finite vertices, complete inventory and resource limits detect mechanical defects. They do not establish the correct facade, roof type, scale, materials or present-day appearance. Roof topology and landmark-specific tests remain separate gates; this command does not claim to run them.</p><pre>${escape(JSON.stringify(report.geometry??{status:'not run'},null,2))}</pre><h2>Findings and backlog</h2><ul>${[...report.errors.map(e=>`${e.code}: ${e.message}`),...report.warnings].map(x=>`<li>${escape(x)}</li>`).join('')}</ul><h2>Every source part</h2><p>Photo-supported means only the listed observations have photographic evidence. Prior-review records are historical evidence, not a fresh visual acceptance. Unknown elevations, proportions, and default heights stay explicit.</p><input id="search" aria-label="Search inventory" placeholder="Search name, ID, profile, roof, estimate or risk"><select id="status" aria-label="Evidence state"><option value="">All evidence states</option>${[...states,'unverified'].map(s=>`<option>${escape(s)}</option>`).join('')}</select><span id="visible"></span><table><thead><tr><th>Part</th><th>Modeled treatment</th><th>Height and source</th><th>Architectural evidence</th><th>Render comparison / risk</th></tr></thead><tbody>${rows}</tbody></table><script>const input=document.querySelector('#search'),select=document.querySelector('#status'),rows=[...document.querySelectorAll('tbody tr')];function filter(){const q=input.value.toLowerCase();let n=0;for(const row of rows){row.hidden=!!((select.value&&row.dataset.status!==select.value)||!row.textContent.toLowerCase().includes(q));if(!row.hidden)n++;}document.querySelector('#visible').textContent=n+' / '+rows.length+' parts';}input.addEventListener('input',filter);select.addEventListener('change',filter);filter();</script></html>`;
}

export async function loadRenderReviews(path,modelDigest) {
  if(!path)return [];
  const reviews=JSON.parse(await readFile(path,'utf8'));
  if(!Array.isArray(reviews))throw new Error('Review manifest must be an array.');
  for(const review of reviews){
    if(!/^[a-f0-9]{64}$/.test(review.modelDigest??'')||(modelDigest&&review.modelDigest!==modelDigest))throw new Error('Stale model comparison: modelDigest differs from the current source, textures or data.');
    for(const view of review.views??[]){
    if(!nonempty(view.label)||!nonempty(view.path)||!/^[a-f0-9]{64}$/.test(view.sha256??''))throw new Error('Each comparison view needs label, path and SHA-256.');
    const bytes=await readFile(resolve(dirname(path),view.path));
    if(hash(bytes)!==view.sha256)throw new Error(`Stale comparison image: ${view.path}`);
    }
  }
  return reviews;
}

/** Bind comparisons to model inputs. Git line-ending conversion is immaterial
 * for known text formats; binary textures and comparison images stay byte-exact. */
export async function computeModelDigest(repo){
  const files=[];
  const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.isFile())files.push(path);}};
  await walk(resolve(repo,'src'));await walk(resolve(repo,'public'));files.push(resolve(repo,'package-lock.json'));
  const digest=createHash('sha256');
  for(const path of files.sort()){digest.update(relative(repo,path).replaceAll('\\','/'));digest.update('\0');digest.update(modelInputHash(path,await readFile(path)));digest.update('\n');}
  return digest.digest('hex');
}

export async function runAudit({repo=process.cwd(),out=resolve(repo,'artifacts/realism-audit'),reviewsPath,includeGeometry=true}={}) {
  repo=resolve(repo);out=resolve(out);
  const modelDigest=await computeModelDigest(repo);
  const readJSON=async path=>JSON.parse(await readFile(resolve(repo,path),'utf8'));
  const importSource=name=>import(pathToFileURL(resolve(repo,'src',name)).href);
  const raw=await readFile(resolve(repo,'public/data/stanford-buildings.geojson'));
  const source=JSON.parse(raw),[{prepareBuildingDetails,buildBuildingGeometry},{buildingArchitecture}]=await Promise.all([importSource('building-geometry.ts'),importSource('building-architecture.ts')]);
  const prepared=prepareBuildingDetails(source);
  let geometry=null;
  if(includeGeometry){
    const [env,sculpt,gpu]=await Promise.all([importSource('campus-environment.ts'),importSource('campus-sculptures.ts'),importSource('gpu-geometry.ts')]);
    const mesh=buildBuildingGeometry(prepared,env.validateCampusEnvironment(await readJSON('public/data/stanford-environment.geojson')),sculpt.validateCampusSculptures(await readJSON('public/data/stanford-sculptures.geojson')));
    geometry={scope:'Complete campus exterior, environment and sculptures; church interior and textures excluded',parts:mesh.buildings,triangles:mesh.triangles,triangleBudget:gpu.MAX_DETAIL_TRIANGLES,cpuBytes:mesh.bytes,gpuBytes:gpu.gpuGeometryBytes(mesh.roofs)+gpu.gpuGeometryBytes(mesh.facades),gpuBudgetBytes:gpu.MAX_GPU_GEOMETRY_BYTES,gpuVertexBytes:gpu.GPU_VERTEX_BYTES,meshBuffers:2,finite:mesh.roofs.every(Number.isFinite)&&mesh.facades.every(Number.isFinite),runtimeObservation:false};
  }
  if(await computeModelDigest(repo)!==modelDigest)throw new Error('Model inputs changed during audit. Run again after edits settle.');
  const report=auditInventory({source,prepared,architecture:buildingArchitecture,geometry,modelDigest,renderReviews:await loadRenderReviews(reviewsPath&&resolve(reviewsPath),modelDigest)});
  report.sourceSha256=hash(raw);report.repo=repo;
  await mkdir(out,{recursive:true});
  await writeFile(resolve(out,'realism-audit.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(resolve(out,'realism-audit.html'),renderReport(report));
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i++){
    if(args[i]==='--repo')options.repo=args[++i];else if(args[i]==='--out')options.out=args[++i];else if(args[i]==='--reviews'||args[i]==='--comparisons')options.reviewsPath=args[++i];else if(args[i]==='--skip-geometry')options.includeGeometry=false;else throw new Error(`Unknown argument ${args[i]}`);
  }
  const report=await runAudit(options);
  console.log(JSON.stringify({gate:report.gate,modelDigest:report.modelDigest,counts:report.counts,geometry:report.geometry,errors:report.errors,output:options.out??resolve(options.repo??process.cwd(),'artifacts/realism-audit')},null,2));
  process.exitCode=report.errors.length?1:0;
}
