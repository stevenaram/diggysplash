import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,minimumDigs} from '../src/game';import {levels} from '../src/levels';
import {bathPose,batherPose,BATH_DURATION} from '../src/bathhouse-scene';
test('the buried pipe connects its inlet to the right-facing outlet after two digs',()=>{
 const l=levels[5],g=new Game(l);assert.equal(l.story?.kind,'bathhouse');assert.equal(l.sources[0],2);assert.equal(l.targets.length,2);
 assert.deepEqual(l.tiles.flatMap((t,i)=>t==='aqueduct'?[i]:[]),[8,40]);
 assert.equal(l.tiles[9],'rock');assert.equal(l.elevations,undefined);
 assert.ok(!g.wet.has(41));[1,0].forEach(i=>g.dig(i));for(const i of [8,40,41])assert.ok(g.wet.has(i));assert.ok(!g.won);
 l.solution.slice(2).forEach(i=>g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);g.reset();assert.ok(!g.wet.has(41));
});
test('bath fills before bathing, then the quick suction precedes a synchronized landing',()=>{
 assert.equal(bathPose(3).fill,1);assert.equal(bathPose(3).enter,0);assert.equal(bathPose(6).enter,1);assert.equal(bathPose(6).vortex,0);
 for(let n=0;n<3;n++){assert.equal(batherPose(10,n).pull,1);assert.equal(batherPose(11.3,n).eject,0);assert.equal(batherPose(12.55,n).eject,1);}
 assert.equal(bathPose(BATH_DURATION).empty,1);
});
test('bath inlet still waits for the hot stones',()=>{
 const g=new Game({...levels[5],budget:20});[1,0,42,43,35,51].forEach(i=>assert.ok(g.dig(i)));assert.deepEqual(g.active,[false,false]);
 g.dig(52);assert.deepEqual(g.active,[true,true]);g.undo();assert.deepEqual(g.active,[false,false]);
});
test('bath stays full until every farmer is under, with a beat before draining',()=>{
 for(let t=7;t<=9.6;t+=.1)assert.equal(bathPose(t).empty,0);
 for(let n=0;n<3;n++)assert.equal(batherPose(9.6,n).pull,1);
 assert.equal(bathPose(10).empty,0);
 assert.ok(bathPose(10.1).empty>0);
 assert.equal(bathPose(14).empty,1);
});

test('trough saves exactly one dig over the open direct route',()=>{
 const l=levels[5];assert.equal(minimumDigs(l),7);assert.equal(minimumDigs({...l,links:[]}),8);assert.equal(l.budget,7);
 const direct=[10,18,26,34,35,43,51,59];
 const g=new Game({...l,links:[],budget:8});direct.forEach(i=>assert.ok(g.dig(i)));assert.ok(g.won);assert.equal(g.remaining,0);
 const failed=new Game(l);direct.forEach(i=>failed.dig(i));assert.ok(failed.failed);
});
test('all stage-six sand tiles retain the one-dig rule in any order',()=>{
 const l=levels[5],g=new Game(l);for(const i of [...l.solution].reverse())assert.ok(g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);
});

test('buried water never floods or reserves the ground between its fittings',()=>{
 const g=new Game({...levels[5],budget:20});g.dig(1);g.dig(0);for(const i of [24,32]){assert.equal(g.level.tiles[i],'sand');assert.ok(!g.wet.has(i));}
 assert.ok(g.dig(24));assert.ok(!g.wet.has(24));assert.ok(g.wet.has(41));
});
