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

test('shepherd notices, reacts, and escapes before the fast snatch',async()=>{
  const {oasisBeats,OASIS_DURATION,SNATCH_START,ESCAPE_X}=await import('../src/oasis-timeline');
  const at=(t:number)=>oasisBeats(t/OASIS_DURATION);
  assert.equal(at(4.1).look,true);assert.equal(at(4.1).emote,false);
  assert.equal(at(4.3).look,true);assert.equal(at(4.3).emote,true);
  assert.equal(at(4.59).flee,0);assert.equal(at(4.7).look,false);
  assert.equal(at(SNATCH_START).flee,1);assert.ok(3.2-ESCAPE_X>8);
  assert.equal(swallowPose(SNATCH_START).approach,0);
  assert.equal(swallowPose(SNATCH_START+.34).approach,1);
});


test('escape reaches the southern lane before passing the palm canopy',async()=>{
  const {escapePosition,ESCAPE_X,ESCAPE_Z}=await import('../src/oasis-timeline');
  assert.deepEqual(escapePosition(0),{x:3.2,z:3.8});
  for(let t=0;t<=1;t+=.01){const p=escapePosition(t);if(p.x<1&&p.x>-3)assert.ok(p.z>=7);}
  const end=escapePosition(1);assert.ok(Math.abs(end.x-ESCAPE_X)<1e-9);assert.equal(end.z,ESCAPE_Z);
});
