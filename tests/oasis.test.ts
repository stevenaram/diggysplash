import {test} from 'node:test';
import assert from 'node:assert/strict';
import {oasisBeats,OASIS_DURATION,PALM_DURATION,PALM_END,SHEEP_START,FIRE_START} from '../src/oasis-timeline';
const at=(seconds:number)=>oasisBeats(seconds/OASIS_DURATION);
test('the plant grows before the shepherd flees; the palm is repurposed before the sheep arrive',()=>{
  assert.equal(at(1.6).bloom,1);
  assert.equal(at(1.6).grow,0);
  assert.equal(at(4.6).grow,1);
  assert.equal(at(4.6).flee,0);
  assert.equal(at(6.6).flee,1);
  assert.equal(at(8.2).swallow,1);
  assert.equal(at(PALM_END+.001).palm,1);
  assert.deepEqual(at(SHEEP_START).sheep,[0,0,0]);
});
test('three distinct sheep beats finish before the fire and final hold',()=>{
  const b=at(SHEEP_START+1.8);
  assert.equal(b.sheep[0],1);
  assert.ok(b.sheep[1]>0&&b.sheep[1]<1);
  assert.equal(b.sheep[2],0);
  assert.deepEqual(at(FIRE_START).sheep,[1,1,1]);
  assert.equal(at(FIRE_START).fire,0);
  assert.equal(at(FIRE_START+1.5).fire,1);
  assert.equal(at(20).settle,1);
});
test('seeking/reset and reduced-motion completion need no intermediate animation frames',()=>{
  const initial=oasisBeats(0);
  oasisBeats(.8);
  assert.deepEqual(oasisBeats(0),initial);
  assert.deepEqual(oasisBeats(-1),initial);
  const final=oasisBeats(1);
  assert.deepEqual(final.sheep,[1,1,1]);
  assert.equal(final.swallow,1);
  assert.equal(final.fire,1);
  assert.deepEqual(oasisBeats(5),final);
});

test('sound cues survive frame skips, never repeat, and reset silently',async()=>{
  const {oasisCuesBetween}=await import('../src/oasis-timeline');
  assert.deepEqual(oasisCuesBetween(0,1),['bloom']);
  assert.deepEqual(oasisCuesBetween(1,4),['twist','roar']);
  assert.deepEqual(oasisCuesBetween(4,4),[]);
  assert.deepEqual(oasisCuesBetween(7,0),[]);
  const stepped=[];
  for(let t=0;t<20;t+=.25)stepped.push(...oasisCuesBetween(t,t+.25));
  assert.deepEqual(stepped,oasisCuesBetween(0,20));
});

test('palm motion takes 60 percent of the original duration and later beats follow promptly',()=>{
  assert.equal(PALM_DURATION,2.8*.6);
  assert.ok(at(8.2+PALM_DURATION/2).palm>.49);
  assert.equal(at(PALM_END+.001).palm,1);
  assert.ok(Math.abs(SHEEP_START-PALM_END-.2)<.00001);
});
