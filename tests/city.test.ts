import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CITY_DURATION,cityPose,CITY_CUES,cityStructureFall} from '../src/city-timeline';
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

test('the northern route and aqueduct share a raised plane above the village outlet',async()=>{
  const {levels}=await import('../src/levels');
  const city=levels[2];
  assert.equal(city.elevations?.length,64);
  for(const i of [9,10,11,19,20,21,22,30])assert.equal(city.elevations?.[i],1.15);
  for(const i of [38,37,36,35,43,42,50])assert.equal(city.elevations?.[i],0);
  for(const other of levels.filter((_,n)=>n!==2))assert.equal(other.elevations,undefined);
});

test('the market collapses in readable stages and settles before the ending',()=>{
  assert.ok(cityStructureFall(5,'well',.1)>0);
  assert.equal(cityStructureFall(5,'stall',.1),0);
  assert.ok(cityStructureFall(6,'stall',.1)>0);
  assert.equal(cityStructureFall(6,'house',.1),0);
  assert.ok(cityStructureFall(6.6,'house',.1)>0);
  assert.equal(cityStructureFall(6.6,undefined,.1),0);
  for(const category of ['well','stall','house',undefined])assert.equal(cityStructureFall(10,category,.5),1);
  assert.equal(cityPose(6).burst,0);
});
