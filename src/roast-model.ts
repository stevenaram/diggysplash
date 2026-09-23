import * as T from 'three';
/** The same little roast used on the stage-one spit and the bathhouse stones. */
export function buildRoast(food:T.Material,score:T.Material){
 const root=new T.Group();
 const mesh=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);return o;};
 mesh(new T.SphereGeometry(.52,10,6),food,0,0,0).scale.set(.85,.75,1);
 for(const x of [-.25,.25])mesh(new T.SphereGeometry(.19,6,4),food,x,-.3,.3).scale.z=1.4;
 for(let k=0;k<3;k++)mesh(new T.BoxGeometry(.055,.04,.4),score,-.2+k*.2,.36,0).rotation.y=.4;
 return root;
}
