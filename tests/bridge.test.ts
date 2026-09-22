import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgeBeats,BRIDGE_DURATION,wheelAngle,ravineFall} from '../src/bridge-timeline';
import {levels} from '../src/levels';
import {Game,minimumDigs} from '../src/game';
const at=(t:number)=>bridgeBeats(t/BRIDGE_DURATION);
test('stage two has three full chasm columns and a winding exact-budget solution',()=>{
  const level=levels[1];
  for(let row=0;row<8;row++)for(let col=4;col<=6;col++)assert.equal(level.tiles[row*8+col],'ravine');
  assert.equal(minimumDigs(level),7);assert.equal(level.budget,7);
  const g=new Game(level);level.solution.forEach(i=>g.dig(i));assert.equal(g.won,true);assert.equal(g.remaining,0);
  assert.ok(new Set(level.solution.map((i,n,a)=>n?i-a[n-1]:0)).size>=3);
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


test('stage two approaches the stone race from the left with no rear shortcut',()=>{
  const level=levels[1];
  for(const i of [26,27,42,43])assert.equal(level.tiles[i],'rock');
  assert.equal(level.tiles[34],'basin');assert.equal(level.tiles[35],'target');
  assert.equal(level.solution.at(-1),33);
  const game=new Game(level);
  level.solution.slice(0,-1).forEach(i=>game.dig(i));assert.equal(game.won,false);
  game.dig(33);assert.equal(game.won,true);assert.equal(game.remaining,0);
});

test('wheel spins before bridge lowers and has constant speed across release',()=>{
  assert.equal(at(.3).lower,0);assert.ok(wheelAngle(.3)<0);
  for(const t of [.4,1.5,4.29,4.9,5.2,6.8])
    assert.ok(Math.abs((wheelAngle(t+.01)-wheelAngle(t))/.01+2.2)<1e-10);
});
test('falling actors recede continuously and wrong branches exhaust the exact budget',()=>{
  assert.equal(ravineFall(5,5).scale,1);
  assert.ok(ravineFall(6,5).scale>ravineFall(7,5).scale);
  assert.equal(ravineFall(8,5).progress,1);
  const g=new Game(levels[1]);
  [1,2,10,11,18,17,25].forEach(i=>assert.equal(g.dig(i),true));
  assert.equal(g.remaining,0);assert.equal(g.won,false);
});
