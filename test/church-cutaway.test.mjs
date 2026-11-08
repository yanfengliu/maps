import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {churchAxes,churchWallMask} from '../src/church-cutaway.ts';
const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));

test('camera cuts whole near walls, keeps opposite walls, and restores every wall from above',()=>{
  const axes=[[1,0],[0,-1]];
  assert.deepEqual(churchWallMask(axes,0,60),[1,1,1,0]);
  assert.deepEqual(churchWallMask(axes,90,60),[1,0,1,1]);
  assert.deepEqual(churchWallMask(axes,180,60),[1,1,0,1]);
  assert.deepEqual(churchWallMask(axes,270,60),[0,1,1,1]);
  for(let angle=0;angle<360;angle+=7){const mask=churchWallMask(axes,angle,60);assert.ok(mask[0]+mask[1]>=1&&mask[2]+mask[3]>=1);assert.deepEqual(churchWallMask(axes,angle,0),[1,1,1,1]);}
});

test('cutaway follows the actual church orientation and equivalent camera bearings',()=>{
  const axes=churchAxes(data);assert.ok(axes);assert.ok(Math.abs(axes[0][0]-.9661)<.001);
  assert.deepEqual(churchWallMask(axes,120,55),[1,0,0,1]);
  assert.deepEqual(churchWallMask(axes,300,55),[0,1,1,0]);
  for(let angle=-180;angle<=180;angle+=13)assert.deepEqual(churchWallMask(axes,angle,60),churchWallMask(axes,angle+360,60));
  assert.deepEqual(churchWallMask(undefined,120,60),[1,1,1,1]);
});
