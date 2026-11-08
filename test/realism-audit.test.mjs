import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {auditInventory,academicNameViolations,validateReference,renderReport,loadRenderReviews,computeModelDigest} from '../tools/quality/audit-realism.mjs';
import {REALISM_REFERENCES,PINNED_PART_COUNT} from '../tools/quality/realism-references.mjs';

const source=JSON.parse(await readFile(new URL('../public/data/stanford-buildings.geojson',import.meta.url),'utf8'));
// Deliberately plain test model: no fixture can claim reference-derived treatment.
const prepared={...source,features:source.features.map(f=>({...f,properties:{...f.properties,detailWallHeight:f.properties.height,detailRoofHeight:f.properties.height,detailArchitecture:{profile:'institutional',facadeFamily:'generic',roofShape:'flat',roofSource:'estimated',floors:1,floorSource:'estimated',mappedLevels:null}}}))};
const audit=(options={})=>auditInventory({source,prepared,registry:[],...options});
const good=REALISM_REFERENCES.find(r=>r.key==='roth-garage');

test('every one of the 648 pinned source parts is reported, including unnamed parts',()=>{
  const report=audit();
  assert.equal(report.gate.status,'pass');assert.equal(report.rows.length,PINNED_PART_COUNT);
  assert.deepEqual(new Set(report.rows.map(r=>r.id)),new Set(source.features.map(f=>f.properties.id)));
  assert.equal(report.counts.evidence.unverified,648);
  assert.equal(report.counts.renderComparisons,0);
  assert.deepEqual(report.counts.heightSources,{'estimated':487,'osm-height':81,'osm-levels':80});
  assert.ok(report.rows.some(r=>r.name==='(unnamed)'));
  const lost=audit({prepared:{...prepared,features:prepared.features.slice(1)}});
  assert.equal(lost.gate.status,'fail');assert.ok(lost.errors.some(e=>e.code==='missing-inventory-part'));
  const truncated=audit({source:{...source,features:source.features.slice(1)},prepared:{...prepared,features:prepared.features.slice(1)}});
  assert.ok(truncated.errors.some(e=>e.code==='source-count'));
});

test('registry fails stale IDs, absent reference evidence, duplicate claims and mislabelled photographs',()=>{
  assert.deepEqual(REALISM_REFERENCES.flatMap(validateReference),[]);
  for(const invalid of [
    {...good,status:'verified'}, {...good,status:'photo-supported',sources:[{url:'https://example.org/render.png',kind:'render',date:'2026-11-08'}]},
    {...good,status:'photo-supported',sources:[{url:'https://example.org/description',kind:'document',date:'undated'}]},
    {...good,limitations:''}, {...good,sources:[]}, {...good,ids:['way/999999999999']},
  ])assert.equal(audit({registry:[invalid]}).gate.status,'fail');
  assert.ok(audit({registry:[good,good]}).errors.some(e=>e.code==='duplicate-reference-key'));
  const claimed=structuredClone(prepared);claimed.features[0].properties.detailArchitecture.roofSource='reference-profile';
  assert.ok(audit({prepared:claimed}).errors.some(e=>e.code==='missing-profile-reference'));
});

test('name invariance rejects a regression that turns academic names into modern glass',()=>{
  const plain=()=>({profile:'institutional',facadeFamily:'generic',roofShape:'hipped'});
  assert.deepEqual(academicNameViolations(plain),[]);
  const regressed=p=>/engineering|physics|laboratory|chemistry|computer/i.test(p.name)?{profile:'modern',facadeFamily:'glass',roofShape:'flat'}:plain();
  assert.ok(academicNameViolations(regressed).length>=12);
  assert.equal(audit({architecture:regressed}).gate.status,'fail');
});

test('the real application classifier is invariant to synthetic academic department names',async()=>{
  const repo=process.env.REALISM_AUDIT_REPO??fileURLToPath(new URL('../',import.meta.url));
  const {buildingArchitecture}=await import(pathToFileURL(resolve(repo,'src/building-architecture.ts')).href);
  assert.deepEqual(academicNameViolations(buildingArchitecture),[]);
});

test('source height tags survive and corrected render heights remain separate estimates',()=>{
  const changed=structuredClone(prepared),i=source.features.findIndex(f=>f.properties.id==='way/324983017');
  changed.features[i].properties.detailRoofHeight=16;
  const row=audit({prepared:changed}).rows[i];
  assert.equal(row.sourceHeight,10);assert.equal(row.renderRoofHeight,16);assert.equal(row.heightSource,'estimated');assert.equal(row.heightAdjusted,true);
  changed.features[i].properties.height=16;
  assert.ok(audit({prepared:changed}).errors.some(e=>e.code==='source-property-changed'));
});

test('mechanically valid geometry never promotes unreferenced parts to realistic or photographed',()=>{
  const geometry={parts:648,finite:true,gpuBytes:100,gpuBudgetBytes:24*1024*1024,triangles:1,triangleBudget:190000};
  const report=audit({geometry});assert.equal(report.gate.status,'pass');assert.equal(report.counts.evidence.unverified,648);
  assert.ok(report.warnings.some(s=>s.includes('does not make them realistic')));
  assert.equal(audit({geometry:{...geometry,gpuBytes:24*1024*1024+1}}).gate.status,'fail');
  assert.equal(audit({geometry:{...geometry,finite:false}}).gate.status,'fail');
  assert.equal(audit({geometry:{...geometry,parts:647}}).gate.status,'fail');
});

test('reference treatment drift and invented visual acceptance fail rather than becoming passes',()=>{
  const report=audit({registry:[good]});assert.ok(report.errors.some(e=>e.code==='reference-treatment-drift'));
  const unsupported=audit({renderReviews:[{ids:[source.features[0].properties.id],result:'verified',reviewedAt:'2026-11-08',notes:'looks good',views:[],referenceKeys:[]}]});
  assert.ok(unsupported.errors.some(e=>e.code==='invalid-render-review'));
  assert.ok(unsupported.errors.some(e=>e.code==='unbacked-render-review'));
});

test('comparison manifests pin image content so stale captures cannot silently stand as current evidence',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'maps-realism-audit-'));
  try{
    const bytes=Buffer.from('fixture image bytes'),digest=createHash('sha256').update(bytes).digest('hex');
    await writeFile(join(dir,'view.png'),bytes);
    const path=join(dir,'reviews.json');
    await writeFile(path,JSON.stringify([{ids:['way/232841898'],result:'compared',reviewedAt:'2026-11-08',reviewer:'Test reviewer',modelDigest:'a'.repeat(64),notes:'Open decks compared; ramps remain absent.',referenceKeys:['roth-garage'],views:[{label:'outside',path:'view.png',sha256:digest}]}]));
    assert.equal((await loadRenderReviews(path,'a'.repeat(64))).length,1);
    await assert.rejects(loadRenderReviews(path,'b'.repeat(64)),/Stale model comparison/);
    await writeFile(join(dir,'view.png'),'different capture');
    await assert.rejects(loadRenderReviews(path),/Stale comparison image/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('a comparison records only the reviewed parts and cannot upgrade their reference status',()=>{
  const ref={...good,expected:undefined};
  const comparison={ids:['way/232841898'],referenceKeys:[ref.key],result:'pass-with-limitations',reviewedAt:'2026-11-08',reviewer:'Test reviewer',modelDigest:'a'.repeat(64),notes:'Open elevations compared; roof ramps remain absent.',views:[{label:'oblique',path:'view.png',sha256:'b'.repeat(64)}]};
  const report=audit({registry:[ref],renderReviews:[comparison],modelDigest:'a'.repeat(64)});
  assert.equal(report.gate.status,'pass');assert.equal(report.counts.renderComparisons,1);assert.equal(report.counts.evidence.unverified,647);
  const row=report.rows.find(r=>r.id==='way/232841898');assert.equal(row.evidenceStatus,'photo-supported');assert.equal(row.renderReview.result,'pass-with-limitations');
  assert.ok(audit({registry:[ref],renderReviews:[comparison],modelDigest:'c'.repeat(64)}).errors.some(e=>e.code==='stale-model-review'));
});

test('comparison coverage counts source parts separately from independent views or review records',()=>{
  const ref=REALISM_REFERENCES.find(r=>r.key==='stadium');
  const comparison={ids:ref.ids.slice(0,2),referenceKeys:[ref.key],result:'partial',reviewedAt:'2026-11-08',reviewer:'Test reviewer',modelDigest:'a'.repeat(64),notes:'Two visible parts share one oblique image; other elevations remain uninspected.',views:[{label:'oblique',path:'view.png',sha256:'b'.repeat(64)}]};
  const report=audit({registry:[ref],renderReviews:[comparison],modelDigest:'a'.repeat(64)});
  assert.equal(report.gate.status,'pass');assert.equal(report.counts.renderComparisons,2);assert.equal(report.counts.comparisonRecords,1);
  assert.equal(report.counts.renderComparisonUnit,'source parts, not independent views');
  assert.ok(renderReport(report).includes('2 source parts with registered comparisons (not independent views)'));
});

test('model digest ignores text CRLF conversion but detects source edits and exact binary texture changes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'maps-realism-digest-'));
  const {mkdir}=await import('node:fs/promises');
  try{
    await mkdir(join(dir,'src'));await mkdir(join(dir,'public'));
    await writeFile(join(dir,'src','model.ts'),'const roof=1;\nconst shader=2;\n');await writeFile(join(dir,'public','texture.jpg'),Buffer.from([0,255,13,10,42]));await writeFile(join(dir,'package-lock.json'),'{\n}\n');
    const before=await computeModelDigest(dir);assert.equal(before,await computeModelDigest(dir));
    await writeFile(join(dir,'src','model.ts'),'const roof=1;\r\nconst shader=2;\r\n');await writeFile(join(dir,'package-lock.json'),'{\r\n}\r\n');
    assert.equal(await computeModelDigest(dir),before,'Git CRLF text conversion must not invalidate comparisons');
    await writeFile(join(dir,'src','model.ts'),'const roof=2;\r\nconst shader=2;\r\n');const changed=await computeModelDigest(dir);assert.notEqual(changed,before);
    await writeFile(join(dir,'public','texture.jpg'),Buffer.from([0,255,10,42]));assert.notEqual(await computeModelDigest(dir),changed,'CRLF bytes inside a binary texture must remain significant');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('report includes all inventory rows, distinct limitations and safe searchable source text',()=>{
  const report=audit();report.rows[0].name='<img src=x onerror=alert(1)>';
  const html=renderReport(report);
  assert.equal((html.match(/<tr data-status=/g)||[]).length,648);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('No realism percentage or score'));assert.ok(html.includes('Not compared'));assert.ok(html.includes('id="search"'));
});
