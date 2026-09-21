import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { World } from './world';
import { oasisBeats } from './oasis-timeline';

/** Pooled, unlit geometry. No per-frame meshes, textures, lights or particle allocations. */
export class OasisMonster {
  root=new T.Group();
  plant=new T.Group();
  head=new T.Group();
  upper=new T.Group();
  lower=new T.Group();
  palm=new T.Group();
  crown=new T.Group();
  grill=new T.Group();
  spit=new T.Group();
  vines:T.Mesh[][]=[];
  leaves:T.Mesh[]=[];
  flames:T.Mesh[]=[];
  roasts:T.Group[]=[];
  wool:T.Mesh[]=[];
  pollen:T.Mesh[]=[];
  materials:T.Material[]=[];
  private a=new T.Vector3();
  private b=new T.Vector3();
  private direction=new T.Vector3();
  private up=new T.Vector3(0,1,0);
  private green:T.MeshBasicMaterial;
  constructor(public world:World) {
    world.root.add(this.root);
    this.green=this.mat(0x69a857,'leaf');
    const dark=this.mat(0x366951,'leaf'), pink=this.mat(0xb35273), mouth=this.mat(0x37293e), ivory=this.mat(0xffe5ab), bark=this.mat(0xb18556,'wood');
    this.root.add(this.plant,this.palm,this.grill);
    this.plant.position.set(4.6,0,-.2);
    this.mesh(this.plant,new T.CylinderGeometry(.35,.75,2.6,8),dark,0,1.3,0);
    for(let i=0;i<7;i++){
      const leaf=this.mesh(this.plant,new T.SphereGeometry(1,6,4),i%2?dark:this.green,Math.cos(i*2.4)*.65,.5+i*.3,Math.sin(i*2.4)*.55);
      leaf.scale.set(.9,.16,.35);leaf.rotation.z=Math.sin(i*2.4)*.7;leaf.rotation.y=i*2.4;this.leaves.push(leaf);
    }
    this.head.position.set(0,3.5,0);this.head.rotation.x=-.48;this.plant.add(this.head);
    this.head.add(this.upper,this.lower);
    for(const [jaw,sign] of [[this.upper,1],[this.lower,-1]] as const){
      const shell=this.mesh(jaw,new T.SphereGeometry(1,16,8),this.green,0,sign*.34,0);shell.scale.set(1.55,.58,1.05);
      const inside=this.mesh(jaw,new T.SphereGeometry(1,16,8),mouth,0,0,.06);inside.scale.set(1.4,.12,.94);
      const lip=this.mesh(jaw,new T.TorusGeometry(1,.1,5,18),pink,0,0,.02);lip.rotation.x=Math.PI/2;lip.scale.set(1.46,.94,1);
      for(let n=0;n<9;n++){
        const angle=n/8*Math.PI;
        const tooth=this.mesh(jaw,new T.ConeGeometry(.12,.44,4),ivory,Math.cos(angle)*1.24,-sign*.17,Math.sin(angle)*.83);
        tooth.rotation.z=sign===1?Math.PI:0;
      }
    }
    for(const x of [-.64,.64]){
      const eye=this.mesh(this.upper,new T.SphereGeometry(.33,8,6),ivory,x,.69,.58);eye.scale.y=1.2;
      this.mesh(this.upper,new T.SphereGeometry(.15,6,4),mouth,x,.73,.87);
      const brow=this.mesh(this.upper,new T.BoxGeometry(.7,.16,.18),dark,x,.99,.73);brow.rotation.z=x<0?-.18:.18;
    }
    // Flower collar links the monster to the innocent-looking buds.
    for(let n=0;n<8;n++){
      const petal=this.mesh(this.plant,new T.SphereGeometry(.5,6,4),pink,Math.cos(n*Math.PI/4)*.95,2.5,Math.sin(n*Math.PI/4)*.65);
      petal.scale.set(.65,.17,1.25);petal.rotation.y=-n*Math.PI/4;
    }
    for(let v=0;v<3;v++){
      const segments:T.Mesh[]=[];
      for(let j=0;j<9;j++)segments.push(this.mesh(this.root,new T.CylinderGeometry(.11,.14,1,5),dark,0,0,0));
      this.vines.push(segments);
    }
    // A real 3D palm can be uprooted, turned sideways and reused as the spit.
    this.mesh(this.palm,new T.CylinderGeometry(.14,.26,3.2,7),bark,0,1.6,0);
    for(let n=0;n<7;n++)this.mesh(this.palm,new T.TorusGeometry(.19,.035,4,7),bark,0,.4+n*.4,0).rotation.x=Math.PI/2;
    this.palm.add(this.crown);this.crown.position.y=3.2;
    for(let n=0;n<7;n++){
      const frond=this.mesh(this.crown,new T.SphereGeometry(1,6,4),n%2?dark:this.green,Math.cos(n*.9)*.85,.05,Math.sin(n*.9)*.85);
      frond.scale.set(1.35,.1,.34);frond.rotation.y=-n*.9;frond.rotation.z=.2;
    }
    this.grill.position.set(2.5,0,4.3);
    for(const x of [-1.9,1.9])for(const sign of [-1,1]){
      const leg=this.mesh(this.grill,new T.CylinderGeometry(.09,.12,1.8,6),bark,x,.8,sign*.22);leg.rotation.x=sign*.32;
    }
    this.grill.add(this.spit);this.spit.position.y=1.5;
    this.mesh(this.spit,new T.CylinderGeometry(.12,.12,4.3,7),bark,0,0,0).rotation.z=Math.PI/2;
    const food=this.mat(0xcf8845,'soil');
    for(let n=0;n<3;n++){
      const roast=new T.Group();roast.position.x=(n-1)*1.12;this.spit.add(roast);this.roasts.push(roast);
      const body=this.mesh(roast,new T.SphereGeometry(.52,10,6),food,0,0,0);body.scale.set(.85,.75,1);
      for(const x of [-.25,.25]){const drumstick=this.mesh(roast,new T.SphereGeometry(.19,6,4),food,x,-.3,.3);drumstick.scale.z=1.4;}
      for(let k=0;k<3;k++){const score=this.mesh(roast,new T.BoxGeometry(.055,.04,.4),bark,-.2+k*.2,.36,0);score.rotation.y=.4;}
    }
    for(let n=0;n<5;n++){
      const log=this.mesh(this.grill,new T.CylinderGeometry(.14,.18,1.6,6),bark,(n-2)*.6,.18,0);log.rotation.x=Math.PI/2;log.rotation.z=(n%2-.5)*.3;
    }
    for(let n=0;n<12;n++){
      const flame=this.mesh(this.grill,new T.ConeGeometry(.19,.7,5),this.mat(n%2?0xffb949:0xed7141),(n%6-2.5)*.48,.55,Math.floor(n/6)*.38-.19);this.flames.push(flame);
    }
    for(let n=0;n<5;n++){
      const frond=this.mesh(this.grill,new T.SphereGeometry(1,6,4),dark,Math.cos(n)*.8,.11,Math.sin(n)*.45);
      frond.scale.set(1.2,.035,.22);frond.rotation.y=n;
    }
    const pollenMat=this.mat(0xffdda0);
    for(let n=0;n<18;n++)this.pollen.push(this.mesh(this.root,new T.OctahedronGeometry(.055,0),pollenMat,0,0,0));
    const woolMat=this.mat(0xffefd3);
    for(let n=0;n<30;n++)this.wool.push(this.mesh(this.root,new T.IcosahedronGeometry(.1+(n%3)*.025,0),woolMat,0,0,0));
    // Bake static scale before calculating metric UVs; art density survives large leaves/jaws.
    this.root.traverse(o=>{
      if(o instanceof T.Mesh){
        o.geometry.scale(o.scale.x,o.scale.y,o.scale.z);o.scale.setScalar(1);
        const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal'),uv=o.geometry.getAttribute('uv');
        if(uv)for(let i=0;i<uv.count;i++){
          const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
          uv.setXY(i,(ax>az?p.getZ(i):p.getX(i))/2,(ay>Math.max(ax,az)?p.getZ(i):p.getY(i))/2);
        }
      }
    });
    for(const group of [this.upper,this.lower,this.palm,this.crown,this.grill,...this.roasts])this.batch(group);
    this.root.traverse(o=>{o.raycast=()=>{};});
    this.update(0,0);
  }
  private batch(group:T.Group){
    const byMaterial=new Map<T.Material,T.Mesh[]>();
    for(const child of [...group.children])if(child instanceof T.Mesh&&!this.flames.includes(child)){
      const m=child.material as T.Material;
      if(!byMaterial.has(m))byMaterial.set(m,[]);
      byMaterial.get(m)!.push(child);
    }
    for(const [material,meshes] of byMaterial){
      if(meshes.length<2)continue;
      const chunks=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
      const merged=mergeGeometries(chunks,false);
      chunks.forEach(g=>g.dispose());
      if(!merged)continue;
      for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();}
      group.add(new T.Mesh(merged,material));
    }
  }
  mat(color:number,surface?:'leaf'|'wood'|'soil'){
    const m=new T.MeshBasicMaterial({color,map:surface?this.world.textures.world(surface):null});this.materials.push(m);return m;
  }
  mesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){
    // Metric triplanar-like projection: 32 texture pixels per two world units.
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
    if(uv)for(let i=0;i<uv.count;i++){
      const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
      uv.setXY(i,(ax>az?p.getZ(i):p.getX(i))/2,(ay>Math.max(ax,az)?p.getZ(i):p.getY(i))/2);
    }
    const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  vine(index:number,x:number,y:number,z:number,t:number){
    const meshes=this.vines[index],sx=4.6+(index-1)*.35,sy=1.4,sz=-.2;
    for(let n=0;n<meshes.length;n++){
      const point=(out:T.Vector3,u:number)=>out.set(T.MathUtils.lerp(sx,x,u)+Math.sin(u*Math.PI*2+t)*.18*Math.sin(u*Math.PI),T.MathUtils.lerp(sy,y,u)+Math.sin(u*Math.PI)*1.3,T.MathUtils.lerp(sz,z,u));
      point(this.a,n/meshes.length);point(this.b,(n+1)/meshes.length);
      this.direction.subVectors(this.b,this.a);const length=this.direction.length();
      meshes[n].position.copy(this.a).add(this.b).multiplyScalar(.5);
      meshes[n].scale.y=length;meshes[n].quaternion.setFromUnitVectors(this.up,this.direction.normalize());
    }
  }
  update(progress:number,time:number){
    const b=oasisBeats(progress),reduced=this.world.reduced,t=reduced?0:time;
    this.plant.visible=b.grow>0;
    this.plant.scale.setScalar(Math.max(.001,b.grow));
    this.head.rotation.z=Math.sin(t*1.8)*.035;
    this.head.position.y=3.5+Math.sin(t*2)*.045;
    const gulp=b.time>6.5&&b.time<8.1?Math.sin(Math.PI*b.swallow):0;
    const opening=b.time<5?.5:.3+gulp*.9;
    this.upper.rotation.x=-opening;this.lower.rotation.x=opening;
    this.leaves.forEach((leaf,n)=>leaf.rotation.z=Math.sin(n*2.4)*.7+Math.sin(t*2+n)*.06);
    this.palm.visible=b.palm<1;this.palm.position.set(T.MathUtils.lerp(-5,.9,b.palm),Math.sin(b.palm*Math.PI)*3+b.palm*1.5,T.MathUtils.lerp(-3.5,4.3,b.palm));
    this.palm.rotation.z=-b.palm*Math.PI/2;this.palm.rotation.y=Math.sin(t)*.02*(1-b.palm);
    this.grill.visible=b.palm>=1;
    this.roasts.forEach((r,n)=>r.visible=b.sheep[n]>=1);
    this.spit.rotation.x=b.fire>0?t*.65:0;
    this.flames.forEach((f,n)=>{f.visible=b.fire>0;f.scale.y=b.fire*(.7+Math.sin(t*8+n)*.3);});
    this.vines.flat().forEach(v=>v.visible=b.grow>=1);
    this.vine(0,1.3+Math.sin(t)*.3,.8,2.5,t);
    this.vine(1,6.3,.7,3.5,t+2);
    this.vine(2,b.palm>0&&b.palm<1?this.palm.position.x:3.4,b.palm>0&&b.palm<1?this.palm.position.y+1:1.2,b.palm>0&&b.palm<1?this.palm.position.z:4.3,t+4);
    this.pollen.forEach((p,n)=>{
      p.visible=b.grow>0&&b.grow<1;
      const angle=n*2.4+b.grow*7;
      p.position.set(4.6+Math.cos(angle)*(1.4-b.grow*.4),.2+(n%6)*.65+b.grow,-.2+Math.sin(angle)*(1.4-b.grow*.4));
    });
    this.wool.forEach((w,n)=>{
      const s=b.sheep[Math.floor(n/10)],u=(n%10)/10;
      w.visible=s>.25;
      w.position.set(T.MathUtils.lerp(2.5+Math.cos(u*6.28)*(.5+u),1.75+(n%6)*.29,s),.1+Math.sin(s*Math.PI)*(1+u*2),T.MathUtils.lerp(5.9+Math.sin(u*6.28)*.45,5.65+Math.floor(n/6)*.22,s));
      w.rotation.set(t+n,t*.7,0);
    });
  }
  dispose(){this.materials.forEach(m=>m.dispose());}
}
