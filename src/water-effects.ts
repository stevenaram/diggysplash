import * as T from 'three';
import {TILE_SIZE} from './game';
const PARTICLE_SIZE=TILE_SIZE/32;
const PARTICLES_PER_BURST=24;
/** Shared fixed pool for soil scoops and splash jets; no expanding ripple rings. */
export class WaterEffects {
  root=new T.Group();
  private drops:T.InstancedMesh;
  private dummy=new T.Object3D();
  private cursor=0;
  private bursts=Array.from({length:48},()=>({at:-100,x:0,y:0,z:0,soil:false,small:false,impact:false}));
  private steel=new T.Color(0xd2d3c7);
  private sand=new T.Color(0x967044);
  private water=new T.Color(0x8febde);
  constructor(parent:T.Group){
    parent.add(this.root);
    // One voxel is exactly one texel in the shared 32-pixels-per-tile art scale.
    const geometry=new T.BoxGeometry(PARTICLE_SIZE,PARTICLE_SIZE,PARTICLE_SIZE);
    const shades=[.85,.75,1,.65,.95,.8];
    geometry.setAttribute('color',new T.Float32BufferAttribute(shades.flatMap(s=>Array.from({length:4},()=>[s,s,s]).flat()),3));
    geometry.clearGroups();
    this.drops=new T.InstancedMesh(geometry,new T.MeshBasicMaterial({vertexColors:true}),48*PARTICLES_PER_BURST);
    this.drops.frustumCulled=false;this.drops.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(this.drops);
    this.drops.userData.ownedMaterial=this.drops.material;
    this.root.traverse(o=>o.raycast=()=>{});
  }
  splash(x:number,y:number,z:number,time:number,soil=false){Object.assign(this.bursts[this.cursor],{x,y,z,at:time,soil,small:false,impact:false});this.cursor=(this.cursor+1)%48;}
  tap(x:number,y:number,z:number,time:number,water:boolean){
    Object.assign(this.bursts[this.cursor],{x,y,z,at:time,soil:false,small:true,impact:!water});this.cursor=(this.cursor+1)%48;
  }
  reset(){this.bursts.forEach(b=>b.at=-100);}
  update(time:number,reduced:boolean){
    this.root.visible=!reduced;
    this.bursts.forEach((b,n)=>{
      for(let j=0;j<PARTICLES_PER_BURST;j++){
        const ring=Math.floor(j/12),age=time-b.at-(b.soil?0:ring*.045),life=b.impact?.22:b.small?.36:b.soil?.42:.48;
        const visible=age>=0&&age<life&&(!b.soil||j<12)&&(!b.small||j<6);
        const a=(j%12)*Math.PI/6+n*.7+ring*Math.PI/12,speed=.8+(j%3)*.25;
        if(b.small){
          this.dummy.position.set(b.x+Math.cos(a)*age*.9,b.y+age*(b.impact?1.2:2)-age*age*6,b.z+Math.sin(a)*age*.9);
          this.dummy.scale.setScalar(visible?Math.min(1,(life-age)/.07):0);
          this.dummy.rotation.set(age*8,a,age*5);
        }else if(b.soil){
          // Three irregular pebbles per side, distributed around the trench lip.
          const edge=Math.floor(j/3),along=(j%3-1)*.53+Math.sin(n+j)*.07;
          const rim=.68+(j%2)*.06,out=age*(.22+(j%3)*.09);
          const x=edge===0?-rim-out:edge===1?rim+out:along;
          const z=edge===2?-rim-out:edge===3?rim+out:along;
          this.dummy.position.set(b.x+x,Math.max(.015,b.y+.09+age*(1.6+(j%3)*.22)-age*age*6),b.z+z);
          const fade=visible?Math.min(1,(life-age)/.055):0;
          this.dummy.scale.setScalar(fade);
          this.dummy.rotation.set(a+age*9,j+age*5,a-age*7);
        }else{
          // Two interleaved rings of full-size droplets, with a short stagger.
          this.dummy.position.set(b.x+Math.cos(a)*(.12+ring*.16+age*speed),b.y+age*(3.2-ring*.45)-age*age*7.5,b.z+Math.sin(a)*(.12+ring*.16+age*speed));
          const scale=visible?Math.min(1,(life-age)/.055):0;
          this.dummy.scale.setScalar(scale);
          this.dummy.rotation.set(Math.sin(a)*age*2,age*3,Math.cos(a)*age*2);
        }
        this.dummy.updateMatrix();this.drops.setMatrixAt(n*PARTICLES_PER_BURST+j,this.dummy.matrix);
        this.drops.setColorAt(n*PARTICLES_PER_BURST+j,b.impact?this.steel:b.soil?this.sand:this.water);
      }
    });
    this.drops.instanceMatrix.needsUpdate=true;this.drops.instanceColor!.needsUpdate=true;
  }
}
