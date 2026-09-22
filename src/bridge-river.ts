import * as T from 'three';
import type {World} from './world';
import {ravineImpacts} from './bridge-timeline';
/** Reused foam and spray instances: no transient meshes during the disaster. */
export class BridgeRiver {
  root=new T.Group();
  foam:T.InstancedMesh;
  spray:T.InstancedMesh;
  rings:T.Mesh[]=[];
  dust:T.Mesh<T.SphereGeometry,T.MeshBasicMaterial>[]=[];
  private dummy=new T.Object3D();
  private material:T.MeshBasicMaterial;
  private water:T.Texture;
  private temp=new T.Vector3();
  constructor(world:World,parent:T.Group){
    parent.add(this.root);
    this.water=world.textures.world('water').clone();this.water.needsUpdate=true;this.water.repeat.set(.25,8);
    this.material=new T.MeshBasicMaterial({map:this.water,color:0x527979});
    // The dark floor closes the diorama neatly; only a distant silver-blue trickle is visible.
    world.box(this.root,3,-6.2,0,4.04,.16,16.5,0x252e32);
    const shades=[0xb18c66,0x987857,0x7d6452,0x635447,0x4a4540,0x303538];
    for(let n=0;n<6;n++)world.box(this.root,3,-.65-n,-8.2,4.04,1.01,.08,shades[n]);
    // Slightly tapered, unbroken cliff faces reveal their strata from the fixed camera.
    // Every band shares its boundary vertices, so there are no ledges or projecting chunks.
    for(const side of [-1,1]){
      const positions:number[]=[],colors:number[]=[];
      const point=(band:number,j:number)=>{
        const z=-8.25+j*16.5/24;
        const waviness=band===0||band===6?0:Math.sin(j*.67+band)*.065;
        return [3+side*(2-band*.11),-.15-band+waviness,z];
      };
      for(let band=0;band<6;band++)for(let j=0;j<24;j++){
        const corners=[point(band,j),point(band+1,j),point(band+1,j+1),point(band,j+1)];
        const color=new T.Color(shades[band]).multiplyScalar(.94+Math.sin(j*1.7+band)*.045);
        for(const i of [0,1,2,0,2,3]){positions.push(...corners[i]);colors.push(color.r,color.g,color.b);}
      }
      // Close the southern cut faces between the outer block and tapered cliff.
      for(let band=0;band<6;band++){
        const top=point(band,24),bottom=point(band+1,24),outer=3+side*2;
        const corners=[[outer,top[1],8.251],[outer,bottom[1],8.251],bottom,top];
        const color=new T.Color(shades[band]).multiplyScalar(.83);
        for(const i of [0,1,2,0,2,3]){positions.push(...corners[i]);colors.push(color.r,color.g,color.b);}
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
      const cliff=new T.Mesh(geometry,material);cliff.userData.ownedMaterial=material;this.root.add(cliff);
    }
    const bed=new T.Mesh(new T.PlaneGeometry(.42,16.5),this.material);bed.rotation.x=-Math.PI/2;bed.position.set(3,-6.1,0);this.root.add(bed);
    const foamMat=world.mat(0x8fb7ae);
    this.foam=new T.InstancedMesh(new T.BoxGeometry(1,.025,1),foamMat,24);this.foam.instanceMatrix.setUsage(T.DynamicDrawUsage);this.foam.frustumCulled=false;this.root.add(this.foam);
    this.spray=new T.InstancedMesh(new T.OctahedronGeometry(.075,0),foamMat,24+ravineImpacts.length*8);this.spray.instanceMatrix.setUsage(T.DynamicDrawUsage);this.spray.frustumCulled=false;this.root.add(this.spray);
    for(let n=0;n<ravineImpacts.length;n++){
      const ring=new T.Mesh(new T.TorusGeometry(.075,.012,4,20),new T.MeshBasicMaterial({color:0xb2f1e9,transparent:true,opacity:0,depthWrite:false}));
      ring.rotation.x=-Math.PI/2;ring.position.set(3,-6.05,ravineImpacts[n].z);ring.userData.ownedMaterial=ring.material;this.root.add(ring);this.rings.push(ring);
    }
    const dustGeometry=new T.SphereGeometry(.16,6,4);
    for(let n=0;n<24;n++){
      const material=new T.MeshBasicMaterial({color:n%3?0xb59b79:0xd3ba92,transparent:true,opacity:0,depthWrite:false});
      const puff=new T.Mesh(dustGeometry,material);puff.userData.ownedMaterial=material;
      this.root.add(puff);this.dust.push(puff);
    }
  }
  update(time:number,storyTime:number,wheel:T.Group,runaway:number,reduced:boolean){
    const clock=reduced?0:time;
    this.dust.forEach((puff,n)=>{
      const collapse=n>=12,start=collapse?5.15:1.5;
      const age=storyTime-start-(n%6)*.022,life=.85;
      puff.visible=!reduced&&age>0&&age<life;
      if(!puff.visible)return;
      const p=age/life,angle=n*2.399,side=n%2?1:-1;
      puff.position.set(side>0?5.35:.7,.14+age*.28,4.0+(n%3)*.9);
      puff.position.x+=side*Math.sin(p*Math.PI/2)*.32;
      puff.position.z+=Math.cos(angle)*age*.36;
      puff.scale.set(1+p*2.3,.55+p*.7,1+p*1.6);
      puff.material.opacity=.55*Math.min(1,p/.1)*Math.pow(1-p,2);
    });
    this.water.offset.y=-clock*.22;
    for(let n=0;n<24;n++){
      this.dummy.position.set(2.84+(n*1.618%.31),-6.07,((n*.719+clock*(2.1+n%3*.2))%16)-8);
      this.dummy.scale.set(.025+(n%3)*.012,1,.12+(n%4)*.07);this.dummy.rotation.set(0,.04*Math.sin(clock+n),0);
      this.dummy.updateMatrix();this.foam.setMatrixAt(n,this.dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
    wheel.updateWorldMatrix(true,false);
    for(let n=0;n<this.spray.count;n++){
      let scale=0;
      if(n<24&&runaway>0&&runaway<1){
        const age=((storyTime-4.3)+(n%6)*.09)%.55,angle=n*2.399;
        this.temp.set(Math.cos(angle)*1.5,Math.sin(angle)*1.5,.25).applyMatrix4(wheel.matrixWorld);
        this.dummy.position.copy(this.temp);this.dummy.position.x+=Math.cos(angle)*age;this.dummy.position.y+=age*.6-age*age*5;this.dummy.position.z+=age*.8;scale=(1-age/.55)*.8;
      }else if(n>=24){
        const impact=ravineImpacts[Math.floor((n-24)/8)],age=storyTime-impact.time;
        if(age>0&&age<.7){
          const angle=n*2.399,speed=.075+(n%4)*.025;
          this.dummy.position.set(3+Math.cos(angle)*age*speed,-6.04+age*(.3+(n%3)*.025)-age*age*.58,impact.z+Math.sin(angle)*age*speed);
          scale=.18*Math.pow(1-age/.7,1.4);
        }
      }
      this.dummy.scale.setScalar(reduced?0:scale);this.dummy.rotation.set(n+storyTime,n,0);this.dummy.updateMatrix();this.spray.setMatrixAt(n,this.dummy.matrix);
    }
    this.spray.instanceMatrix.needsUpdate=true;
    this.rings.forEach((ring,n)=>{
      const age=storyTime-ravineImpacts[n].time;ring.visible=!reduced&&age>0&&age<1.1;
      ring.scale.setScalar(1+Math.max(0,age)*.8);(ring.material as T.MeshBasicMaterial).opacity=Math.max(0,1-age/1.1)*.7;
    });
  }
  dispose(){this.material.dispose();this.water.dispose();}
}
