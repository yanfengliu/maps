/** Evidence coverage, not a photographic quality score. Every mapped environment
 * feature and every selected ground surface remains individually inspectable. */
export function auditNonBuildings({environment,sculptures,surfaces,provenance,quadPlantings}) {
 const references=new Map((provenance.references??[]).map(r=>[r.id??r.key,r]));
 const rows=[];
 for(const f of environment.features){
  const p=f.properties;
  rows.push({id:p.id,kind:p.kind,name:p.name??'',geometry:f.geometry.type,
   material:p.material??'unknown',evidence:'Mapped position and retained source tags',
   limitations:p.kind==='bench'?'Seat dimensions and absent design/material/backrest tags remain unverified.':p.kind==='tree'?'Tree silhouette, crown and missing height dimensions are estimates; no current botanical/photo survey.':'Lamp dimensions and detailed fixture design are estimates.',
   photographicAcceptance:'unverified'});
 }
 for(const f of sculptures.features){const p=f.properties;rows.push({id:p.id,kind:'sculpture',name:p.name??'',geometry:f.geometry.type,material:'See sculpture reference record',evidence:'Mapped anchor with referenced authored model',limitations:'Stylized proportions and orientation; not a scan or surveyed replica.',photographicAcceptance:'unverified'});}
 for(const f of surfaces.features){
  const p=f.properties,reference=references.get(p.surfaceEvidence);
  rows.push({id:p.id,kind:p.kind,name:p.name??'',geometry:f.geometry.type,
   material:p.modeledSurface,evidence:p.surfaceEvidence,
   width:p.modeledWidth??null,widthSource:p.widthSource??'mapped area',
   references:reference?[reference]:[],
   limitations:'Material evidence does not verify all dimensions or present-day appearance. '+(p.widthSource==='class-estimate'?'Width is estimated. ':'')+(p.kind==='crossing'?'Paint only where a documented marking type is available. ':'')+'Paver joints, wear and curb dimensions are modeled estimates.',
   photographicAcceptance:'unverified'});
 }
 const count=key=>Object.fromEntries([...new Set(rows.map(r=>r[key]))].sort().map(value=>[value,rows.filter(r=>r[key]===value).length]));
 return {meaning:'Mapped identity and source coverage only; no whole-object photographic acceptance is implied.',
  scope:provenance.selection,coreBounds:provenance.coreBounds,
  counts:{features:rows.length,kinds:count('kind'),unknownMaterials:rows.filter(r=>r.material==='unknown').length,estimatedSurfaceWidths:rows.filter(r=>r.widthSource==='class-estimate').length},
  quadPlantings:quadPlantings??null,
  groundReferences:provenance.references??[],groundLimitations:provenance.modelLimits??provenance.limitations??[],rows};
}

export function renderNonBuildings(audit){
 if(!audit)return '';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<h2>Non-building elements</h2><p>${esc(audit.meaning)}</p><p>${esc(audit.scope)}</p><pre>${esc(JSON.stringify(audit.counts,null,2))}</pre>${audit.quadPlantings?`<h3>Inner Quad reference plantings</h3><p>The source inventory below retains the original OSM records. Rendering inside the eight circles uses this separately attributed botanical reconstruction; schematic positions and estimated sizes are not a current field survey.</p><pre>${esc(JSON.stringify(audit.quadPlantings,null,2))}</pre>`:''}<p>Surface reference dates and limits:</p><pre>${esc(JSON.stringify(audit.groundReferences,null,2))}</pre><details><summary>Inspect all ${audit.rows.length} environment and ground records</summary><table><thead><tr><th>Identity</th><th>Type / material</th><th>Evidence</th><th>Unverified aspects</th></tr></thead><tbody>${audit.rows.map(r=>`<tr><td>${esc(r.name||r.id)}<br><small>${esc(r.id)}</small></td><td>${esc(r.kind)} / ${esc(r.material)}</td><td>${esc(r.evidence)}${r.width!==undefined?`<br>Width: ${esc(r.width??'area')} / ${esc(r.widthSource)}`:''}</td><td>${esc(r.limitations)}</td></tr>`).join('')}</tbody></table></details>`;
}
