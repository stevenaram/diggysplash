import * as T from 'three';
import {TILE_SIZE} from './game';
import {dirtPose} from './dirt-motion';
const PARTICLE_SIZE=TILE_SIZE/32;
const PARTICLES_PER_BURST=24;
/** Shared fixed pool for soil scoops and splash jets; no expanding ripple rings. */
export class WaterEffects {
  root=new T.Group();
  private drops:T.InstancedMesh;
  private dummy=new T.Object3D();
  private cursor=0;
  private bursts=Array.from({length:48},()=>({at:-100,x:0,y:0,z:0,soil:false,impact:false}));
  private sand=new T.Color(0xcbb8a2);
  private water=new T.Color(0x8febde);
  constructor(parent:T.Group){
    parent.add(this.root);
    // One voxel is exactly one texel in the shared 32-pixels-per-tile art scale.
    const geometry=new T.BoxGeometry(PARTICLE_SIZE,PARTICLE_SIZE,PARTICLE_SIZE);
    const shades=[.85,.75,1,.65,.95,.8];
    geometry.setAttribute('color',new T.Float32BufferAttribute(shades.flatMap(s=>Array.from({length:4},()=>[s,s,s]).flat()),3));
    geometry.clearGroups();
    this.drops=new T.InstancedMesh(geometry,new T.MeshBasicMaterial({vertexColors:true,depthTest:false}),48*PARTICLES_PER_BURST);
    // Brief interaction feedback stays readable over billboard rocks and scenery.
    this.drops.renderOrder=10;
    this.drops.frustumCulled=false;this.drops.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(this.drops);
    this.drops.userData.ownedMaterial=this.drops.material;
    this.root.traverse(o=>o.raycast=()=>{});
  }
  splash(x:number,y:number,z:number,time:number,soil=false){Object.assign(this.bursts[this.cursor],{x,y,z,at:time,soil,impact:false});this.cursor=(this.cursor+1)%48;}
  tap(x:number,y:number,z:number,time:number,water:boolean){
    Object.assign(this.bursts[this.cursor],{x,y,z,at:time,soil:false,impact:!water});this.cursor=(this.cursor+1)%48;
  }
  reset(){this.bursts.forEach(b=>b.at=-100);}
  update(time:number,reduced:boolean){
    this.root.visible=!reduced;
    this.bursts.forEach((b,n)=>{
      for(let j=0;j<PARTICLES_PER_BURST;j++){
        const dirt=b.soil||b.impact;
        const ring=Math.floor(j/12),age=time-b.at-(dirt?(j%3)*.012:ring*.045);
        const life=dirt?.34+(j%3)*.025:.48;
        const visible=age>=0&&age<life&&(!dirt||j<10);
        const a=(j%12)*Math.PI/6+n*.7+ring*Math.PI/12,speed=.8+(j%3)*.25;
        if(dirt){
          const pose=dirtPose(j,time-b.at);
          this.dummy.position.set(b.x+pose.x,b.y+pose.y,b.z+pose.z);
          this.dummy.scale.setScalar(pose.scale);
          this.dummy.rotation.set(j+pose.spin,j*.7+pose.spin*.6,j*.4-pose.spin);
        }else{
          // Two interleaved rings of full-size droplets, with a short stagger.
          this.dummy.position.set(b.x+Math.cos(a)*(.12+ring*.16+age*speed),b.y+age*(3.2-ring*.45)-age*age*7.5,b.z+Math.sin(a)*(.12+ring*.16+age*speed));
          const scale=visible?Math.min(1,(life-age)/.055):0;
          this.dummy.scale.setScalar(scale);
          this.dummy.rotation.set(Math.sin(a)*age*2,age*3,Math.cos(a)*age*2);
        }
        this.dummy.updateMatrix();this.drops.setMatrixAt(n*PARTICLES_PER_BURST+j,this.dummy.matrix);
        this.drops.setColorAt(n*PARTICLES_PER_BURST+j,b.impact||b.soil?this.sand:this.water);
      }
    });
    this.drops.instanceMatrix.needsUpdate=true;this.drops.instanceColor!.needsUpdate=true;
  }
}
