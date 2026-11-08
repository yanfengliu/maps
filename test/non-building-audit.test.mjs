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

test('complete roads, traffic controls and lawns retain separate evidence without duplicate road identities',()=>{
 const road=feature({id:'way/1',kind:'street',modeledSurface:'concrete',surfaceEvidence:'osm-tag',modeledWidth:2.4,widthSource:'class-estimate'});
 const report=auditNonBuildings({environment:collection([]),sculptures:collection([]),surfaces:collection([road]),roads:collection([road,feature({id:'way/2',kind:'street',modeledSurface:'unknown'})]),controls:collection([feature({id:'node/3',controlType:'traffic_signals',directionStatus:'unknown',physicalPoleVerified:false})]),landscape:collection([feature({id:'way/4',kind:'grass',groundEvidence:'osm-landuse-grass'})]),provenance:{references:[]}});
 assert.equal(report.rows.length,4);
 assert.equal(new Set(report.rows.map(r=>r.id)).size,4);
 assert.match(report.rows.find(r=>r.id==='node/3').limitations,/not a surveyed roadside pole/);
 assert.match(report.rows.find(r=>r.id==='way/4').limitations,/not a current botanical survey/);
 assert.ok(report.rows.every(r=>r.photographicAcceptance==='unverified'));
});

test('audit preserves prose limitations and complete native road scope',()=>{
 const report=auditNonBuildings({environment:collection([]),sculptures:collection([]),surfaces:collection([]),provenance:{selection:'Core mesh',campusRoads:{coverage:'Full eligible mapped roads'},modelLimits:'Road widths remain estimates.'},landscapeProvenance:{modelLimits:'Plant seasons vary.'}});
 assert.deepEqual(report.groundLimitations,['Road widths remain estimates.','Plant seasons vary.']);
 assert.equal(report.scope,'Full eligible mapped roads Core mesh');
});
