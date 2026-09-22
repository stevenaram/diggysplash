import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgeBeats,BRIDGE_DURATION} from '../src/bridge-timeline';
import {levels} from '../src/levels';
import {Game,minimumDigs} from '../src/game';
const at=(t:number)=>bridgeBeats(t/BRIDGE_DURATION);
test('stage two has three full chasm columns and a winding exact-budget solution',()=>{
  const level=levels[1];
  for(let row=0;row<8;row++)for(let col=4;col<=6;col++)assert.equal(level.tiles[row*8+col],'ravine');
  assert.equal(minimumDigs(level),9);assert.equal(level.budget,9);
  const g=new Game(level);level.solution.forEach(i=>g.dig(i));assert.equal(g.won,true);assert.equal(g.remaining,0);
  assert.ok(new Set(level.solution.map((i,n,a)=>n?i-a[n-1]:0)).size>=4);
});
test('bridge lowers before crossing, wheel strikes occupied deck, last sheep jumps afterward',()=>{
  assert.equal(at(1.6).lower,1);assert.equal(at(1.6).walk,0);
  assert.equal(at(4.4).walk,1);assert.ok(at(4.7).runaway>0);
  assert.equal(at(5).collapse,0);assert.ok(at(6).collapse>0);
  assert.equal(at(7.5).collapse,1);assert.equal(at(7.5).alarm,true);assert.equal(at(7.5).jump,0);
  assert.equal(at(10).jump,1);
});
test('bridge choreography resets deterministically and reduced motion can jump directly to the end',()=>{
  const start=bridgeBeats(0);bridgeBeats(.6);assert.deepEqual(bridgeBeats(0),start);
  assert.equal(bridgeBeats(1).jump,1);assert.equal(bridgeBeats(1).collapse,1);assert.equal(bridgeBeats(1).alarm,false);
});
