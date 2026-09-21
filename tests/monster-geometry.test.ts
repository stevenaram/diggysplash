import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {metricUV} from '../src/metric-uv';
import {LivingVine} from '../src/living-vine';

test('a two-world-unit surface keeps one 32px repeat after nonuniform scaling',()=>{
  const source=new T.BoxGeometry(1,1,1);source.scale(2,4,6);
  const g=metricUV(source),p=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<p.count;i+=3){
    for(const [a,b] of [[i,i+1],[i+1,i+2]]){
      const worldDistance=new T.Vector3().fromBufferAttribute(p,a).distanceTo(new T.Vector3().fromBufferAttribute(p,b));
      const texelDistance=Math.hypot(uv.getX(a)-uv.getX(b),uv.getY(a)-uv.getY(b))*32;
      assert.ok(Math.abs(texelDistance-worldDistance*16)<.00001);
    }
  }
  g.dispose();source.dispose();
});
test('a reaching vine reuses its buffers and stays finite through vertical and curled poses',()=>{
  const material=new T.MeshBasicMaterial(),vine=new LivingVine(material),g=vine.mesh.geometry;
  const buffer=g.getAttribute('position');
  for(const target of [[0,5,0],[0,0,0],[-5,2,7],[7,1,-3]]){
    vine.update(0,1,0,...target as [number,number,number],.7);
    assert.equal(g.getAttribute('position'),buffer);
    for(const key of ['position','normal','uv'])assert.ok([...g.getAttribute(key).array].every(Number.isFinite));
  }
  g.dispose();material.dispose();
});

test('tilted leaves keep two independent texture axes rather than collapsing into stripes',()=>{
  const source=new T.PlaneGeometry(2,2);source.rotateX(-Math.PI/2);source.rotateZ(.3);
  const g=metricUV(source),uv=g.getAttribute('uv');
  for(let i=0;i<uv.count;i+=3){
    const ax=uv.getX(i+1)-uv.getX(i),ay=uv.getY(i+1)-uv.getY(i);
    const bx=uv.getX(i+2)-uv.getX(i),by=uv.getY(i+2)-uv.getY(i);
    assert.ok(Math.abs(ax*by-ay*bx)>.9);
  }
  g.dispose();source.dispose();
});
