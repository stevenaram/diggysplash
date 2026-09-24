import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,minimumDigs} from '../src/game';import {levels} from '../src/levels';
import {bathPose,batherPose,BATH_DURATION} from '../src/bathhouse-scene';
test('bathhouse relay separates the two dig networks without a shortcut through its supports',()=>{
 const l=levels[5],g=new Game(l);assert.equal(l.story?.kind,'bathhouse');assert.equal(minimumDigs(l),l.budget);assert.equal(l.elevations?.[19],.6);assert.equal(l.elevations?.[32],0);
 assert.equal(g.wet.has(32),false);l.solution.slice(0,5).forEach(i=>g.dig(i));assert.ok(g.wet.has(27));assert.ok(g.wet.has(24));assert.ok(g.wet.has(32));assert.ok(!g.won);
 l.solution.slice(5).forEach(i=>g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);g.reset();assert.equal(g.wet.has(32),false);
});
test('bath fills before bathing, then the quick suction precedes a synchronized landing',()=>{
 assert.equal(bathPose(3).fill,1);assert.equal(bathPose(3).enter,0);assert.equal(bathPose(6).enter,1);assert.equal(bathPose(6).vortex,0);
 for(let n=0;n<3;n++){assert.equal(batherPose(10,n).pull,1);assert.equal(batherPose(11.3,n).eject,0);assert.equal(batherPose(12.55,n).eject,1);}
 assert.equal(bathPose(BATH_DURATION).empty,1);
});
test('bath inlet waits for the hot stones even when its trench is built first, and undo closes it',()=>{
 const g=new Game({...levels[5],budget:30});
 [1,9,10,11,19,33,41,42,43,35,51].forEach(i=>assert.ok(g.dig(i)));
 assert.ok(g.wet.has(35));assert.deepEqual(g.active,[false,false]);
 assert.ok(g.dig(52));assert.deepEqual(g.active,[true,true]);
 g.undo();assert.deepEqual(g.active,[false,false]);g.reset();assert.deepEqual(g.active,[false,false]);
});
test('a plausible separate southern route uses the budget before reaching both objectives',()=>{
 const g=new Game(levels[5]);[1,9,10,11,19,40,48,56,57,58,59,52].forEach(i=>assert.ok(g.dig(i)));
 assert.equal(g.remaining,0);assert.equal(g.failed,true);assert.deepEqual(g.active,[false,true]);
});
