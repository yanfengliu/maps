import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNonBuildings,renderNonBuildings} from '../tools/quality/non-building-audit.mjs';
const feature=properties=>({type:'Feature',properties,geometry:{type:'Point',coordinates:[-122.17,37.43]}});
const collection=features=>({type:'FeatureCollection',features});
test('non-building coverage retains unknown furniture and separates surface evidence from estimated width and whole-model acceptance',()=>{
 const report=auditNonBuildings({environment:collection([feature({id:'node/1',kind:'bench'}),feature({id:'node/2',kind:'tree'})]),sculptures:collection([]),surfaces:collection([feature({id:'node/3',kind:'crossing',modeledSurface:'asphalt',surfaceEvidence:'osm-tag',modeledWidth:3,widthSource:'class-estimate'})]),provenance:{selection:'Bounded campus core',references:[],limitations:['Outside the core remains unreviewed']}});
 assert.equal(report.rows.length,3);assert.equal(report.counts.unknownMaterials,2);assert.equal(report.counts.estimatedSurfaceWidths,1);
 assert.ok(report.rows.every(r=>r.photographicAcceptance==='unverified'));
 assert.match(report.rows[0].limitations,/absent design\/material\/backrest/);assert.match(report.rows[2].limitations,/Width is estimated/);
 assert.match(renderNonBuildings(report),/Bounded campus core/);assert.match(renderNonBuildings(report),/all 3 environment/);
 report.rows[0].name='<script>alert(1)</script>';assert.doesNotMatch(renderNonBuildings(report),/<script>/);
});
