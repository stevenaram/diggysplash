import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,minimumDigs} from '../src/game';import {levels} from '../src/levels';
import {bathPose,batherPose,BATH_DURATION} from '../src/bathhouse-scene';
test('bathhouse relay separates the two dig networks without a shortcut through its supports',()=>{
 const l=levels[5],g=new Game(l);assert.equal(l.story?.kind,'bathhouse');assert.equal(minimumDigs(l),l.budget);assert.equal(l.elevations?.[19],.6);assert.equal(l.elevations?.[32],0);
 assert.equal(g.wet.has(32),false);l.solution.slice(0,5).forEach(i=>g.dig(i));assert.ok(g.wet.has(27));assert.ok(g.wet.has(24));assert.ok(g.wet.has(32));assert.ok(!g.won);
 l.solution.slice(5).forEach(i=>g.dig(i));assert.ok(g.won);assert.equal(g.remaining,0);g.reset();assert.equal(g.wet.has(32),false);
});
test('bath fills before bathing, drains after entry, and ejects each bather after suction',()=>{
 assert.equal(bathPose(3).fill,1);assert.equal(bathPose(3).enter,0);assert.equal(bathPose(6).enter,1);assert.equal(bathPose(6).vortex,0);
 for(let n=0;n<3;n++){assert.equal(batherPose(15+n*.9,n).pull,1);assert.ok(batherPose(15+n*.9,n).eject<1e-10);assert.equal(batherPose(BATH_DURATION,n).eject,1);}
 assert.equal(bathPose(BATH_DURATION).empty,1);
});
