import * as T from 'three';
import {bakeColored} from './battle-mesh';
import {metricUV} from './metric-uv';
import type {World} from './world';
export function coveredWagon(world:World,parent:T.Group,index:number){
 const root=new T.Group(),wheels:T.Group[]=[];parent.add(root);const box=world.box.bind(world);
 box(root,0,.82,0,2.75,.2,1.85,0x76553e,'wood');
 for(const z of [-.84,.84]){box(root,0,1.22,z,2.65,.65,.14,0xaf8052,'wood');for(const x of [-1.1,0,1.1])box(root,x,1.3,z,.12,.88,.18,0x76553e,'wood');}
 for(const x of [-.88,.88])for(const z of [-1,1]){
  const wheel=new T.Group();wheel.position.set(x,.47,z);root.add(wheel);wheels.push(wheel);
  wheel.add(new T.Mesh(new T.TorusGeometry(.43,.08,5,12),world.mat(0x584537,'wood')));
  for(let k=0;k<6;k++){const spoke=box(wheel,0,0,0,.075,.78,.08,0xc59b62,'wood');spoke.rotation.z=k*Math.PI/6;}
  const hub=new T.Mesh(new T.CylinderGeometry(.12,.12,.2,8),world.mat(0x684c37));hub.rotation.x=Math.PI/2;wheel.add(hub);
 }
 const points:number[]=[],colors:number[]=[],indices:number[]=[];
 for(let end=0;end<2;end++)for(let k=0;k<=10;k++){
  const a=k/10*Math.PI;points.push(end?1.3:-1.3,1.53+Math.sin(a)*1.25,Math.cos(a)*.91);
  const color=new T.Color(k%3===0?0xc6b18a:0xf0dfb0);colors.push(color.r,color.g,color.b);
  if(end===0&&k<10)indices.push(k,k+1,k+11,k+1,k+12,k+11);
 }
 const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(points,3));raw.setAttribute('color',new T.Float32BufferAttribute(colors,3));raw.setIndex(indices);raw.computeVertexNormals();
 const geometry=metricUV(raw);if(geometry!==raw)raw.dispose();
 const material=new T.MeshBasicMaterial({vertexColors:true,map:world.textures.world('plaster'),side:T.DoubleSide});
 const canopy=new T.Mesh(geometry,material);canopy.userData.ownedMaterial=material;root.add(canopy);
 for(const x of [-1.31,0,1.31]){
  const curve=new T.CatmullRomCurve3(Array.from({length:11},(_,k)=>{const a=k/10*Math.PI;return new T.Vector3(x,1.53+Math.sin(a)*1.25,Math.cos(a)*.91);}));
  root.add(new T.Mesh(new T.TubeGeometry(curve,10,.045,4,false),world.mat(0x8a704c,'wood')));
 }
 // Open ends show crates and sacks rather than an empty canvas shell.
 for(const x of [-.85,.3]){box(root,x,1.23,0,.7,.65,1.1,0xb9945f,'wood');box(root,x,1.24,0,.1,.68,1.12,0x745740,'wood');}
 for(const z of [-.43,.43]){const sack=new T.Mesh(new T.SphereGeometry(.3,6,5),world.mat(0xd6c193,'plaster'));sack.scale.y=1.25;sack.position.set(-1.1,1.6,z);root.add(sack);}
 box(root,.7,1.75,-.1,.8,.2,.75,[0x95615a,0x527f79,0xc39b55][index],'plaster');
 // Strapped exterior cargo makes the loaded convoy readable from the fixed camera.
 box(root,-.55,1.24,1.04,.66,.55,.28,0xc5a271,'wood');
 box(root,-.55,1.24,1.20,.09,.6,.05,0x715540,'wood');
 box(root,.45,1.47,1.0,.72,.58,.08,[0xa46659,0x527f79,0xb69a57][index],'plaster');
 for(const x of [.16,.73])box(root,x,1.48,1.05,.05,.61,.04,0xe0c797);
 // Batch static faces by texture; wheels retain their own compact rotating groups.
 for(const group of [root,...wheels]){
  const bins=new Map<T.Texture|null,T.Mesh[]>();
  for(const child of group.children){if(!(child instanceof T.Mesh))continue;const mat=(Array.isArray(child.material)?child.material[0]:child.material) as T.MeshBasicMaterial;const list=bins.get(mat.map)??[];list.push(child);bins.set(mat.map,list);}
  for(const [map,parts]of bins){const geometry=bakeColored(group,parts),material=new T.MeshBasicMaterial({map,vertexColors:true,side:T.DoubleSide});for(const part of parts){part.removeFromParent();part.geometry.dispose();(part.userData.ownedMaterial as T.Material|undefined)?.dispose();}const mesh=new T.Mesh(geometry,material);mesh.userData.ownedMaterial=material;group.add(mesh);}
 }
 return {root,wheels};
}
