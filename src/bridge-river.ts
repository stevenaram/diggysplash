import * as T from 'three';
import type {World} from './world';
/** Reused foam and spray instances: no transient meshes during the disaster. */
export class BridgeRiver {
  root=new T.Group();
  foam:T.InstancedMesh;
  spray:T.InstancedMesh;
  rings:T.Mesh[]=[];
  driftwood:T.Mesh[]=[];
  private dummy=new T.Object3D();
  private material:T.MeshBasicMaterial;
  private water:T.Texture;
  private temp=new T.Vector3();
  constructor(world:World,parent:T.Group){
    parent.add(this.root);
    this.water=world.textures.world('water').clone();this.water.needsUpdate=true;this.water.repeat.set(2,8);
    this.material=new T.MeshBasicMaterial({map:this.water,color:0x298f9e});
    const bed=new T.Mesh(new T.PlaneGeometry(4.08,16.5),this.material);bed.rotation.x=-Math.PI/2;bed.position.set(3,-2.2,0);this.root.add(bed);
    world.box(this.root,3,-2.9,8.12,4.08,1.4,.12,0x237887);
    world.box(this.root,3,-1.1,-8.15,4.08,2.2,.1,0x389eac);
    for(let n=0;n<6;n++){
      const rock=world.shaded(new T.DodecahedronGeometry(.26+(n%2)*.08,0),0x7f8a76,'stone');
      rock.position.set(n%2?4.83:1.17,-2.23,-6+n*2.3);rock.scale.set(.7,.65,1.4);this.root.add(rock);
    }
    for(let n=0;n<3;n++)this.driftwood.push(world.box(this.root,0,0,0,.18,.12,.75+n*.15,0xa47c4c,'wood'));
    const foamMat=world.mat(0xade9dd);
    this.foam=new T.InstancedMesh(new T.BoxGeometry(1,.025,1),foamMat,56);this.foam.instanceMatrix.setUsage(T.DynamicDrawUsage);this.foam.frustumCulled=false;this.root.add(this.foam);
    this.spray=new T.InstancedMesh(new T.OctahedronGeometry(.075,0),foamMat,48);this.spray.instanceMatrix.setUsage(T.DynamicDrawUsage);this.spray.frustumCulled=false;this.root.add(this.spray);
    for(let n=0;n<3;n++){
      const ring=new T.Mesh(new T.TorusGeometry(.45,.035,4,24),new T.MeshBasicMaterial({color:0xb2f1e9,transparent:true,opacity:0,depthWrite:false}));
      ring.rotation.x=-Math.PI/2;ring.position.set(n===2?3.8:2.5,-2.15,n===2?3.7:5.1);ring.userData.ownedMaterial=ring.material;this.root.add(ring);this.rings.push(ring);
    }
  }
  update(time:number,storyTime:number,wheel:T.Group,runaway:number,reduced:boolean){
    const clock=reduced?0:time;
    this.water.offset.y=-clock*.22;
    this.driftwood.forEach((wood,n)=>{
      const age=Math.max(0,storyTime-6.3);
      wood.visible=storyTime>6.3;
      wood.position.set(1.8+n*.95+Math.sin(clock+n)*.08,-2.12+Math.sin(clock*2+n)*.015,4.5+n*.35+age*.32);
      wood.rotation.y=n*.9+Math.sin(clock*.7+n)*.12;
    });
    for(let n=0;n<56;n++){
      this.dummy.position.set(1.2+(n*1.618%3.55),-2.17,((n*.719+clock*(2.1+n%3*.2))%16)-8);
      this.dummy.scale.set(.05+(n%3)*.02,1,.2+(n%4)*.12);this.dummy.rotation.set(0,.04*Math.sin(clock+n),0);
      this.dummy.updateMatrix();this.foam.setMatrixAt(n,this.dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
    wheel.updateWorldMatrix(true,false);
    for(let n=0;n<48;n++){
      let scale=0;
      if(n<24&&runaway>0&&runaway<1){
        const age=((storyTime-4.3)+(n%6)*.09)%.55,angle=n*2.399;
        this.temp.set(Math.cos(angle)*1.5,Math.sin(angle)*1.5,.25).applyMatrix4(wheel.matrixWorld);
        this.dummy.position.copy(this.temp);this.dummy.position.x+=Math.cos(angle)*age;this.dummy.position.y+=age*.6-age*age*5;this.dummy.position.z+=age*.8;scale=(1-age/.55)*.8;
      }else if(n>=24){
        const impact=n<36?5.95:8.95,age=storyTime-impact;
        if(age>0&&age<1.05){
          const angle=n*2.399,speed=.6+(n%4)*.25;
          this.dummy.position.set((n<36?2.5:3.8)+Math.cos(angle)*age*speed,-2.15+age*(2+(n%3)*.35)-age*age*3.5,(n<36?5.1:3.7)+Math.sin(angle)*age*speed);
          scale=Math.max(0,1-age/1.05);
        }
      }
      this.dummy.scale.setScalar(reduced?0:scale);this.dummy.rotation.set(n+storyTime,n,0);this.dummy.updateMatrix();this.spray.setMatrixAt(n,this.dummy.matrix);
    }
    this.spray.instanceMatrix.needsUpdate=true;
    this.rings.forEach((ring,n)=>{
      const age=storyTime-[5.95,6.3,8.95][n];ring.visible=!reduced&&age>0&&age<1.1;
      ring.scale.setScalar(1+Math.max(0,age)*2.1);(ring.material as T.MeshBasicMaterial).opacity=Math.max(0,1-age/1.1)*.7;
    });
  }
  dispose(){this.material.dispose();this.water.dispose();}
}
