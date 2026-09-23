import {test} from 'node:test';
import assert from 'node:assert/strict';
import {farmPose,FARM_DURATION,farmStoryTime} from '../src/farm-timeline';
test('feeding speeds increase without reordering the cinematic',()=>{
  assert.equal(farmStoryTime(3),3);assert.equal(farmStoryTime(8),9);
  assert.equal(farmStoryTime(13),14);
  assert.ok(Math.abs(farmStoryTime(13+3.5/1.7)-17.5)<.00001);
  assert.equal(farmPose(8).feast,1);assert.equal(farmPose(10.5).fall,1);
  assert.equal(farmPose(13).eat,0);assert.equal(farmPose(FARM_DURATION).leave,1);
});
test('farm reset clears all cinematic phases',()=>{
  assert.ok(Object.values(farmPose(0)).every(v=>v===0));
});

test('the ambiguous blocked approach above the source is visibly rock terrain',async()=>{
 const {levels}=await import('../src/levels');
 assert.equal(levels[3].tiles[42],'rock');
});
