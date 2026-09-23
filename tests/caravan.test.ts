import {test} from 'node:test';
import assert from 'node:assert/strict';
import {caravanPose,caravanRoad,CARAVAN_DURATION} from '../src/caravan-timeline';
import {levels} from '../src/levels';
import {minimumDigs,Game} from '../src/game';
test('the caravan has three troughs, a reserved road and a verified exact-budget solution',()=>{
 const l=levels[4];assert.equal(l.targets.length,3);assert.equal(minimumDigs(l),12);
 assert.ok(l.tiles.slice(0,24).every(t=>t==='building'));
 const g=new Game(l);l.solution.forEach(i=>assert.equal(g.dig(i),true));assert.ok(g.won);assert.equal(g.remaining,0);
});
test('the caravan drinks and hitches before the ambush, and departs after the aftermath',()=>{
 assert.equal(caravanPose(2.5).drink,1);assert.equal(caravanPose(2.5).hitch,0);
 assert.equal(caravanPose(6.5).hitch,1);assert.equal(caravanPose(9).ambush,0);
 assert.equal(caravanPose(13.2).defeat,1);assert.equal(caravanPose(16.2).fire,1);
 assert.equal(caravanPose(16).escape,0);assert.equal(caravanPose(CARAVAN_DURATION).escape,1);
 assert.ok(Object.values(caravanPose(0)).every(p=>p===0));
});
test('road turns continuously within the map and reverses the convoy heading',()=>{
 for(const join of [10.8,10.8+Math.PI*1.4]){const a=caravanRoad(join-.00001),b=caravanRoad(join+.00001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.0001);}
 for(let d=10.8;d<15.2;d+=.02){const p=caravanRoad(d);assert.ok(p.x<=6.21&&p.z>=-6.01&&p.z<=-3.19);}
 assert.equal(caravanRoad(20).angle,-Math.PI);
});
