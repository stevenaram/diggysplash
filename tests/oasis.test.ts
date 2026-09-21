import {test} from 'node:test';
import assert from 'node:assert/strict';
import {oasisBeats,OASIS_DURATION} from '../src/oasis-timeline';
const at=(seconds:number)=>oasisBeats(seconds/OASIS_DURATION);
test('the plant grows before the shepherd flees; the palm is repurposed before the sheep arrive',()=>{
  assert.equal(at(1.6).bloom,1);
  assert.equal(at(1.6).grow,0);
  assert.equal(at(4.6).grow,1);
  assert.equal(at(4.6).flee,0);
  assert.equal(at(6.6).flee,1);
  assert.equal(at(8.2).swallow,1);
  assert.equal(at(11.2).palm,1);
  assert.deepEqual(at(11.2).sheep,[0,0,0]);
});
test('three distinct sheep beats finish before the fire and final hold',()=>{
  const b=at(13);
  assert.equal(b.sheep[0],1);
  assert.ok(b.sheep[1]>0&&b.sheep[1]<1);
  assert.equal(b.sheep[2],0);
  assert.deepEqual(at(15.5).sheep,[1,1,1]);
  assert.equal(at(15.5).fire,0);
  assert.equal(at(17).fire,1);
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
