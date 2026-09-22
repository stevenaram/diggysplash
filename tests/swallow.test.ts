import {test} from 'node:test';
import assert from 'node:assert/strict';
import {swallowPose} from '../src/swallow-pose';
test('the mouth aligns and opens before lifting; stays open until the entire insertion ends',()=>{
  const ready=swallowPose(6.6);
  assert.equal(ready.align,1);assert.equal(ready.opening,1.43);assert.equal(ready.approach,0);
  for(let t=6.6;t<=7.79;t+=.01){const p=swallowPose(t);assert.equal(p.close,0);assert.equal(p.hidden,false);assert.equal(p.align,1);}
  assert.equal(swallowPose(7.8).insert,1);
});
test('lateral approach finishes before depth entry; actor retires only behind closed jaws',()=>{
  for(let t=6;t<8.7;t+=.01){const p=swallowPose(t);if(p.insert>0)assert.equal(p.approach,1);if(p.hidden)assert.equal(p.close,1);}
  assert.equal(swallowPose(8.16).hidden,false);
  assert.equal(swallowPose(8.18).hidden,true);
  assert.equal(swallowPose(8.6).opening,.38);
  assert.equal(swallowPose(0).hidden,false);
});
