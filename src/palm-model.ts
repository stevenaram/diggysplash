import * as T from 'three';
import {gridWorld} from './game';
import {MonsterArt,palmFrond} from './monster-art';
/** Shared stage-one palm silhouette; callers bake metric UVs after construction. */
export function buildPalm(root:T.Group,art:MonsterArt){
  const bark=art.material('bark'),leaf=art.material('palm'),fronds:T.Mesh[]=[];
  const mesh=(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  const trunk=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.08,1.4,0),new T.Vector3(-.3,3,-.2),new T.Vector3(-.45,4.4,-.45)]);
  mesh(root,new T.TubeGeometry(trunk,16,.22,8,false),bark);
  const crown=new T.Group();root.add(crown);crown.position.set(-.45,4.4,-.45);
  for(let n=0;n<8;n++){
    const angle=n*Math.PI/4,front=Math.sin(angle)<-.3;
    const frond=mesh(crown,palmFrond(front?1.05:1.8+(n%2)*.2),leaf);
    frond.name='palm-frond';frond.userData.azimuth=angle;frond.rotation.y=angle;
    frond.rotation.z=front?.3:n%2?.12:.02;
    frond.userData.baseTilt=frond.rotation.z;fronds.push(frond);
  }
  for(let n=0;n<3;n++)mesh(crown,new T.SphereGeometry(.16,7,5),bark,Math.cos(n*2.1)*.2,-.12,Math.sin(n*2.1)*.2);
  return {crown,fronds};
}

/** The trunk starts at the model origin, so its base belongs exactly to a tile center. */
export function placePalmOnTile(root:T.Group,column:number,row:number){
  root.position.set(gridWorld(column),0,gridWorld(row));
}
