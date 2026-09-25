import * as T from 'three';
import type {World} from './world';
import {metricUV} from './metric-uv';
/** Recessed throat, individually cut masonry and a metal liner at native texel density. */
export function pipeMouth(world:World,parent:T.Group,position:T.Vector3,direction:T.Vector3){
 const root=new T.Group();root.position.copy(position);root.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction.clone().normalize());parent.add(root);
 const stone=(geometry:T.BufferGeometry,color:number)=>{const m=world.shaded(geometry,color,'stone');const old=m.geometry;m.geometry=metricUV(old);if(old!==m.geometry)old.dispose();root.add(m);return m;};
 for(let n=0;n<12;n++){
  const a=n*Math.PI/6+.025,b=(n+1)*Math.PI/6-.025,shape=new T.Shape();
  shape.moveTo(Math.cos(a)*.67,Math.sin(a)*.67);shape.absarc(0,0,.67,a,b,false);shape.lineTo(Math.cos(b)*.46,Math.sin(b)*.46);shape.absarc(0,0,.46,b,a,true);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false,curveSegments:2});g.translate(0,0,-.12);stone(g,[0xe0d7ba,0xc3c4af,0xd3cfb6][n%3]);
 }
 const innerMaterial=new T.MeshBasicMaterial({color:0x405858,map:world.textures.world('stone'),side:T.DoubleSide});
 const throat=new T.Mesh(new T.CylinderGeometry(.45,.39,.15,20,1,true),innerMaterial);throat.userData.ownedMaterial=innerMaterial;throat.rotation.x=Math.PI/2;throat.position.z=-.035;root.add(throat);
 const darkness=new T.Mesh(new T.CircleGeometry(.44,24),world.mat(0x182e33));darkness.position.z=-.045;root.add(darkness);
 const liner=new T.Mesh(new T.TorusGeometry(.449,.035,5,24),world.mat(0x728c85));liner.position.z=.025;root.add(liner);
 for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){const rivet=stone(new T.BoxGeometry(.07,.07,.045),0xb89561);rivet.position.set(Math.cos(a)*.57,Math.sin(a)*.57,.13);}
 return root;
}
