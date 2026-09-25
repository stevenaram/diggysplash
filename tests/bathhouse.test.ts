import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,minimumDigs} from '../src/game';import {levels} from '../src/levels';
import {bathPose,batherPose,BATH_DURATION} from '../src/bathhouse-scene';
test('bathhouse relay separates the two dig networks without a shortcut through its supports',()=>{
 const l=levels[5],g=new Game(l);assert.equal(l.story?.kind,'bathhouse');assert.equal(minimumDigs(l),l.budget);assert.equal(l.elevations?.[8],.6);assert.equal(l.elevations?.[40],0);
 assert.equal(g.wet.has(40),false);l.solution.slice(0,4).forEach(i=>g.dig(i));assert.ok(g.wet.has(16));assert.ok(g.wet.has(24));assert.ok(g.wet.has(32));assert.ok(g.wet.has(40));assert.ok(!g.won);
 l.solution.slice(4).forEach(i=>g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);g.reset();assert.equal(g.wet.has(40),false);
});
test('bath fills before bathing, then the quick suction precedes a synchronized landing',()=>{
 assert.equal(bathPose(3).fill,1);assert.equal(bathPose(3).enter,0);assert.equal(bathPose(6).enter,1);assert.equal(bathPose(6).vortex,0);
 for(let n=0;n<3;n++){assert.equal(batherPose(10,n).pull,1);assert.equal(batherPose(11.3,n).eject,0);assert.equal(batherPose(12.55,n).eject,1);}
 assert.equal(bathPose(BATH_DURATION).empty,1);
});
test('bath inlet waits for the hot stones even when its trench is built first, and undo closes it',()=>{
 const g=new Game({...levels[5],budget:30});
 [2,1,9,8,41,42,43,35,51].forEach(i=>assert.ok(g.dig(i)));
 assert.ok(g.wet.has(35));assert.deepEqual(g.active,[false,false]);
 assert.ok(g.dig(52));assert.deepEqual(g.active,[true,true]);
 g.undo();assert.deepEqual(g.active,[false,false]);g.reset();assert.deepEqual(g.active,[false,false]);
});
test('a plausible separate southern route uses the budget before reaching both objectives',()=>{
 const g=new Game(levels[5]);[11,19,18,17,9,8,41,42,43,35].forEach(i=>assert.ok(g.dig(i)));
 assert.equal(g.remaining,0);assert.equal(g.failed,true);assert.deepEqual(g.active,[false,false]);
});

test('bath stays full until every farmer is under, with a beat before draining',()=>{
 for(let t=7;t<=9.6;t+=.1)assert.equal(bathPose(t).empty,0);
 for(let n=0;n<3;n++)assert.equal(batherPose(9.6,n).pull,1);
 assert.equal(bathPose(10).empty,0);
 assert.ok(bathPose(10.1).empty>0);
 assert.equal(bathPose(14).empty,1);
});

test('bathhouse has only one minimum-cost trench layout',()=>{
 const l=levels[5];for(const i of l.solution){const tiles=[...l.tiles];tiles[i]='rock';assert.ok(minimumDigs({...l,tiles})>l.budget,`tile ${i} must occur in every optimal layout`);}
});

test('the three-cell downward trough is required, with a usable but more expensive approach',()=>{
 const l=levels[5];assert.deepEqual(l.tiles.flatMap((t,i)=>t==='aqueduct'?[i]:[]),[16,24,32]);
 assert.equal(l.targets.length,2);assert.equal(minimumDigs({...l,links:[]}),Infinity);
 const g=new Game({...l,budget:20});[11,19,18,17,9,8,41,42,43,35,51,52].forEach(i=>assert.ok(g.dig(i)));assert.ok(g.won);assert.equal(g.digs.length,12);
});
test('all stage-six sand tiles use the original one-dig rule in any order',()=>{
 const l=levels[5],g=new Game(l);for(const i of [...l.solution].reverse())assert.ok(g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);
});
