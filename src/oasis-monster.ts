import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { World } from './world';
import { oasisBeats, PALM_END } from './oasis-timeline';
import { MonsterArt, palmFrond } from './monster-art';
import { LivingVine } from './living-vine';
import { metricUV } from './metric-uv';
import { swallowPose } from './swallow-pose';
export const PLANT_X=4.6, PLANT_Z=-3.15;

/** Pooled, unlit geometry. No per-frame meshes, textures, lights or particle allocations. */
export class OasisMonster {
  root=new T.Group();
  plant=new T.Group();
  head=new T.Group();
  throat:T.Mesh;
  upper=new T.Group();
  lower=new T.Group();
  palm=new T.Group();
  crown=new T.Group();
  scenicPalm=new T.Group();
  grill=new T.Group();
  spit=new T.Group();
  vines:LivingVine[]=[];
  flowers:T.Group[]=[];
  petals:T.Group[]=[];
  fronds:T.Mesh[]=[];
  art=new MonsterArt();
  leaves:T.Mesh[]=[];
  flames:T.Mesh[]=[];
  roasts:T.Group[]=[];
  wool:T.Mesh[]=[];
  pollen:T.Mesh[]=[];
  impactDust:T.Mesh[]=[];
  private vineGrowth=0;
  materials:T.Material[]=[];
  private green:T.MeshBasicMaterial;
  private petalMaterial:T.MeshBasicMaterial;
  private blossomMaterial:T.MeshBasicMaterial;
  constructor(public world:World) {
    world.root.add(this.root);
    this.green=this.art.material('skin');
    const dark=this.art.material('skin'), pink=this.art.material('petal'), mouth=this.art.material('mouth'), ivory=this.art.material('tooth'), bark=this.art.material('bark'), palmLeaf=this.art.material('palm');
    this.blossomMaterial=this.art.material('blossom');
    dark.color.setHex(0x9ab69b);this.petalMaterial=pink;
    this.root.add(this.plant,this.palm,this.grill);
    this.plant.position.set(PLANT_X,0,PLANT_Z);
    const stem=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.2,.8,-.1),new T.Vector3(.2,1.8,.1),new T.Vector3(0,3.1,0)]);
    this.mesh(this.plant,new T.TubeGeometry(stem,14,.42,9,false),dark,0,0,0);
    for(let n=0;n<6;n++){
      const angle=n*Math.PI/3;
      const root=new T.CatmullRomCurve3([new T.Vector3(0,.5,0),new T.Vector3(Math.cos(angle)*.5,.15,Math.sin(angle)*.4),new T.Vector3(Math.cos(angle)*1.05,.02,Math.sin(angle)*.6)]);
      this.mesh(this.plant,new T.TubeGeometry(root,7,.12,6,false),dark,0,0,0);
    }
    // These same flowers remain attached as the shrub mutates into a thorny collar.
    for(let n=0;n<3;n++){
      const flower=new T.Group();flower.position.set(PLANT_X+(n-1)*1.05,.05,PLANT_Z+.1+(n%2)*.12);this.root.add(flower);this.flowers.push(flower);
      const stalk=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.07,.35,0),new T.Vector3(.18,.7,.05)]);
      this.mesh(flower,new T.TubeGeometry(stalk,6,.065,5,false),dark,0,0,0);
      for(let k=0;k<6;k++){
        const pivot=new T.Group();pivot.position.set(.18,.7,.05);pivot.rotation.y=k*Math.PI/3;flower.add(pivot);this.petals.push(pivot);
        const petal=this.mesh(pivot,new T.SphereGeometry(1,8,5),this.blossomMaterial,.24,0,0);petal.scale.set(.37,.065,.16);
      }
      this.mesh(flower,new T.SphereGeometry(.19,8,5),ivory,.18,.72,.05);
      for(const sign of [-1,1]){
        const leaf=this.mesh(flower,new T.SphereGeometry(1,7,4),this.green,sign*.22,.25,0);leaf.scale.set(.35,.075,.14);leaf.rotation.z=sign*.4;
      }
    }
    for(let i=0;i<7;i++){
      const leaf=this.mesh(this.plant,new T.SphereGeometry(1,6,4),i%2?dark:this.green,Math.cos(i*2.4)*.65,.5+i*.3,Math.sin(i*2.4)*.55);
      leaf.scale.set(.9,.16,.35);leaf.rotation.z=Math.sin(i*2.4)*.7;leaf.rotation.y=i*2.4;this.leaves.push(leaf);
    }
    this.head.position.set(0,3.8,0);this.head.rotation.x=-.42;this.plant.add(this.head);
    this.head.add(this.upper,this.lower);
    for(const [jaw,sign] of [[this.upper,1],[this.lower,-1]] as const){
      const shell=this.mesh(jaw,new T.SphereGeometry(1,20,10,0,Math.PI*2,sign===1?0:Math.PI/2,Math.PI/2),this.green,0,sign*.13,0);shell.scale.set(1.95,.66,1.3);
      const inside=this.mesh(jaw,new T.SphereGeometry(1,16,8),mouth,0,0,.06);inside.scale.set(1.82,.16,1.2);
      const lip=this.mesh(jaw,new T.TorusGeometry(1,.1,5,18),pink,0,0,.02);lip.rotation.x=Math.PI/2;lip.scale.set(1.86,1.2,1);
      for(let n=0;n<13;n++){
        const angle=n/12*Math.PI,height=.4+(n%4)*.14;
        const tooth=this.mesh(jaw,new T.ConeGeometry(.12+(n%3)*.015,height,4),ivory,Math.cos(angle)*1.7,-sign*(.14+height*.12),Math.sin(angle)*1.13);
        tooth.rotation.z=(sign===1?Math.PI:0)+(n%3-1)*.18;
        tooth.rotation.x=(n%2?.1:-.12);
      }
      for(const signX of [-1,1])for(let n=0;n<3;n++){
        const thorn=this.mesh(jaw,new T.ConeGeometry(.16,.6+n*.1,5),pink,signX*(1.6-n*.2),sign*(.35+n*.12),-.5-n*.16);
        thorn.rotation.z=-signX*.55;
      }
    }
    const throat=this.mesh(this.head,new T.SphereGeometry(1,14,10),mouth,0,0,-.45);throat.scale.set(1.58,1.12,.5);this.throat=throat;
    for(const x of [-.88,.88]){
      const eye=this.mesh(this.upper,new T.SphereGeometry(.33,8,6),ivory,x,.74,.74);eye.scale.y=1.2;
      this.mesh(this.upper,new T.SphereGeometry(.15,6,4),mouth,x,.77,1.03).scale.set(.55,1.2,1);
      const brow=this.mesh(this.upper,new T.BoxGeometry(.7,.16,.18),dark,x,1.04,.93);brow.rotation.z=x<0?-.18:.18;
    }
    // Flower collar links the monster to the innocent-looking buds.
    for(let n=0;n<8;n++){
      const petal=this.mesh(this.plant,new T.SphereGeometry(.5,6,4),pink,Math.cos(n*Math.PI/4)*.95,2.5,Math.sin(n*Math.PI/4)*.65);
      petal.scale.set(.65,.17,1.25);petal.rotation.y=-n*Math.PI/4;
    }
    for(let v=0;v<3;v++){
      const vine=new LivingVine(dark);this.root.add(vine.mesh);this.vines.push(vine);
    }
    const trunk=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.08,1.4,0),new T.Vector3(-.3,3,-.2),new T.Vector3(-.45,4.4,-.45)]);
    this.mesh(this.palm,new T.TubeGeometry(trunk,16,.22,8,false),bark,0,0,0);
    this.palm.add(this.crown);this.crown.position.set(-.45,4.4,-.45);
    // Broad lateral fans and short front fronds leave the trunk visible at 60° tilt.
    for(let n=0;n<8;n++){
      const angle=n*Math.PI/4,front=Math.sin(angle)<-.3;
      const frond=this.mesh(this.crown,palmFrond(front?1.05:1.8+(n%2)*.2),palmLeaf,0,0,0);
      frond.name='palm-frond';frond.userData.azimuth=angle;frond.rotation.y=angle;
      frond.rotation.z=front?.3:n%2?.12:.02;
      frond.userData.baseTilt=frond.rotation.z;this.fronds.push(frond);
    }
    for(let n=0;n<3;n++)this.mesh(this.crown,new T.SphereGeometry(.16,7,5),bark,Math.cos(n*2.1)*.2,-.12,Math.sin(n*2.1)*.2);
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
    const dustMat=this.mat(0xd8bd87);
    for(let n=0;n<12;n++)this.impactDust.push(this.mesh(this.root,new T.BoxGeometry(.09,.09,.09),dustMat,0,0,0));
    const woolMat=this.mat(0xffefd3);
    for(let n=0;n<30;n++)this.wool.push(this.mesh(this.root,new T.IcosahedronGeometry(.1+(n%3)*.025,0),woolMat,0,0,0));
    // Enlarge the flowers in geometry before UV generation: +50% size, same texel density.
    for(const flower of this.flowers)flower.traverse(o=>{
      if(o===flower)return;
      o.position.multiplyScalar(1.5);
      if(o instanceof T.Mesh)o.scale.multiplyScalar(1.5);
    });
    // Bake static scale before calculating metric UVs; art density survives large leaves/jaws.
    this.root.traverse(o=>{
      if(o instanceof T.Mesh&&!this.vines.some(v=>v.mesh===o)){
        o.geometry.scale(o.scale.x,o.scale.y,o.scale.z);o.scale.setScalar(1);
        const previous=o.geometry;o.geometry=metricUV(previous);
        if(previous!==o.geometry)previous.dispose();
      }
    });
    for(const group of [this.upper,this.lower,this.palm,this.grill,...this.roasts])this.batch(group);
    // Reuse the finished, metric-textured tree without joining the chop choreography.
    this.scenicPalm=this.palm.clone(true);this.scenicPalm.position.set(-5,0,-3.5);
    this.scenicPalm.rotation.y=0;this.root.add(this.scenicPalm);
    this.scenicPalm.traverse(o=>{if(o instanceof T.Mesh&&o.name==='palm-frond')this.fronds.push(o);});
    const outlined:T.Mesh[]=[];
    for(const group of [this.plant,...this.flowers])group.traverse(o=>{if(o instanceof T.Mesh)outlined.push(o);});
    for(const mesh of outlined)this.art.outlineMesh(mesh);
    for(const vine of this.vines)this.art.outlineMesh(vine.mesh);
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
    const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  vine(index:number,x:number,y:number,z:number,t:number){
    this.vines[index].update(PLANT_X+(index-1)*.35,1.4*this.vineGrowth,PLANT_Z,x,y,z,t,this.vineGrowth);
  }
  update(progress:number,time:number){
    const b=oasisBeats(progress),reduced=this.world.reduced,t=reduced?0:time;
    this.vineGrowth=b.vines;
    this.plant.visible=b.grow>0;
    this.plant.scale.setScalar(Math.max(.001,b.grow));
    const swallow=swallowPose(b.time);
    // Aim the mouth at the billboard plane, not through the actor's hat and feet.
    this.head.rotation.x=T.MathUtils.lerp(-.42,-Math.PI/3,swallow.align);
    this.head.rotation.z=Math.sin(t*1.8)*.035*(1-swallow.align);
    this.head.position.y=3.8+Math.sin(t*2)*.045*(1-swallow.align);
    this.throat.scale.y=.5+.5*swallow.align*(1-swallow.close);
    const opening=b.time<5?.35+b.grow*.25:swallow.opening;
    this.upper.rotation.x=-opening;this.lower.rotation.x=opening;
    this.upper.position.y=swallow.lift;this.lower.position.y=-swallow.lift;
    this.blossomMaterial.color.setRGB(1-b.grow*.25,1-b.grow*.55,1-b.grow*.1);
    this.petalMaterial.color.setRGB(1-b.grow*.15,1-b.grow*.4,1-b.grow*.04);
    this.flowers.forEach((flower,n)=>{
      flower.visible=b.grow>=.25;
      flower.scale.setScalar(.65+b.bloom*.65-b.grow*.3);
      flower.position.y=.05+b.grow*(n===1?2.2:1.2);
      flower.rotation.y=b.grow*(n-1)*1.7;
      flower.rotation.z=(1-b.bloom)*.28+Math.sin(t*2+n)*.025+b.grow*(n-1)*.2;
    });
    this.petals.forEach((petal,n)=>{
      petal.rotation.z=-.8*(1-b.bloom)+b.grow*(.45+(n%3)*.35);
      petal.rotation.x=b.grow*Math.sin(n*2.4)*.7;
    });
    this.fronds.forEach((frond,n)=>frond.rotation.set(0,frond.userData.azimuth,frond.userData.baseTilt+Math.sin(t*1.1+(n%8)*.8)*.04));
    this.leaves.forEach((leaf,n)=>leaf.rotation.z=Math.sin(n*2.4)*.7+Math.sin(t*2+n)*.06);
    // Fall around the trunk base, directly into the cooking area. Gravity accelerates it.
    const fall=b.palm*b.palm;
    this.palm.visible=b.palm<1;this.palm.position.set(-1,0,4.3);
    this.palm.rotation.z=-fall*Math.PI/2;this.palm.rotation.y=0;
    const impactAge=b.time-PALM_END;
    this.impactDust.forEach((p,n)=>{
      const u=Math.max(0,impactAge),angle=n*2.399;
      p.visible=impactAge>=0&&impactAge<.38;
      p.position.set(-.8+(n%6)*.75+Math.cos(angle)*u*1.5,.1+Math.sin(Math.min(1,u/.38)*Math.PI)*(.18+(n%3)*.09),4.3+Math.sin(angle)*u*1.5);
      p.scale.setScalar(Math.max(.01,1-u/.38));
      p.rotation.set(n+u*3,n,0);
    });
    this.grill.visible=b.palm>=1;
    this.roasts.forEach((r,n)=>r.visible=b.sheep[n]>=1);
    this.spit.rotation.x=b.fire>0?t*.65:0;
    this.flames.forEach((f,n)=>{f.visible=b.fire>0;f.scale.y=b.fire*(.7+Math.sin(t*8+n)*.3);});
    this.vines.forEach(v=>v.mesh.visible=b.vines>0);
    this.vine(0,1.3+Math.sin(t)*.3,.8,2.5,t);
    this.vine(1,6.3,.7,3.5,t+2);
    // Cock the vine, then whip across the trunk; release as the tree falls.
    const wind=Math.sin(b.chop*Math.PI),strike=b.chop,release=b.palm;
    this.vine(2,T.MathUtils.lerp(3.4-4.6*strike,3.4,release),T.MathUtils.lerp(1.2+wind*1.5,1.2,release),T.MathUtils.lerp(4.3-wind*.8,4.3,release),t+4);
    this.pollen.forEach((p,n)=>{
      p.visible=b.grow>0&&b.grow<1;
      const angle=n*2.4+b.grow*7;
      p.position.set(PLANT_X+Math.cos(angle)*(1.4-b.grow*.4),.2+(n%6)*.65+b.grow,PLANT_Z+Math.sin(angle)*(1.4-b.grow*.4));
    });
    this.wool.forEach((w,n)=>{
      const s=b.sheep[Math.floor(n/10)],u=(n%10)/10;
      w.visible=s>.25;
      w.position.set(T.MathUtils.lerp(2.5+Math.cos(u*6.28)*(.5+u),1.75+(n%6)*.29,s),.1+Math.sin(s*Math.PI)*(1+u*2),T.MathUtils.lerp(5.9+Math.sin(u*6.28)*.45,5.65+Math.floor(n/6)*.22,s));
      w.rotation.set(t+n,t*.7,0);
    });
  }
  dispose(){this.materials.forEach(m=>m.dispose());this.art.dispose();}
}
