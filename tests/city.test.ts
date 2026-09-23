import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CITY_DURATION,cityPose,CITY_CUES} from '../src/city-timeline';
test('the well erupts before flooding, collapse, and the lake surge',()=>{
  assert.equal(cityPose(0).burst,0);
  assert.ok(cityPose(1.2).burst>.9);
  assert.equal(cityPose(1.2).collapse,0);
  assert.ok(cityPose(4).flood>.99);
  assert.equal(cityPose(4).collapse,0);
  assert.ok(cityPose(7).collapse>.7);
  assert.equal(cityPose(7).surge,0);
  assert.ok(cityPose(9).surge>.9);
});
test('the reduced-motion/end pose is settled wreckage, and reset has no effects',()=>{
  const end=cityPose(CITY_DURATION);
  assert.equal(end.collapse,1);assert.equal(end.drain,1);assert.equal(end.aftermath,1);
  assert.equal(end.burst,0);assert.equal(end.surge,0);
  assert.ok(Object.values(cityPose(0)).every(value=>value===0));
  for(let t=0;t<CITY_DURATION;t+=.017)for(const value of Object.values(cityPose(t)))assert.ok(value>=0&&value<=1);
  assert.equal(CITY_CUES.filter(c=>c.cue==='collapse').length,1);
});
