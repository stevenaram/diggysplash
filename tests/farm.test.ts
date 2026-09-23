import {test} from 'node:test';
import assert from 'node:assert/strict';
import {farmPose,FARM_DURATION} from '../src/farm-timeline';
test('farm story grows crops, feasts, collapses, then admits wolves in order',()=>{
  assert.equal(farmPose(2.5).grow,1);
  assert.equal(farmPose(2.5).feast,0);
  assert.equal(farmPose(6).feast,1);
  assert.equal(farmPose(7.5).full,1);
  assert.equal(farmPose(7.5).fall,0);
  assert.equal(farmPose(9).fall,1);
  assert.equal(farmPose(9).wolves,0);
  assert.equal(farmPose(12.5).wolves,1);
  assert.equal(farmPose(12.5).eat,0);
  assert.equal(farmPose(FARM_DURATION).leave,1);
});
test('farm reset clears all cinematic phases',()=>{
  assert.ok(Object.values(farmPose(0)).every(v=>v===0));
});
