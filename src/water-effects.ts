import * as T from 'three';
/** Shared fixed pool for soil scoops and splash jets; no expanding ripple rings. */
export class WaterEffects {
  root=new T.Group();
  private drops:T.InstancedMesh;
  private dummy=new T.Object3D();
  private cursor=0;
  private bursts=Array.from({length:48},()=>({at:-100,x:0,y:0,z:0,soil:false}));
  private sand=new T.Color(0x967044);
  private water=new T.Color(0x8febde);
  constructor(parent:T.Group){
    parent.add(this.root);
    this.drops=new T.InstancedMesh(new T.IcosahedronGeometry(.09,0),new T.MeshBasicMaterial(),48*12);
    this.drops.frustumCulled=false;this.drops.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(this.drops);
    this.drops.userData.ownedMaterial=this.drops.material;
    this.root.traverse(o=>o.raycast=()=>{});
  }
  splash(x:number,y:number,z:number,time:number,soil=false){Object.assign(this.bursts[this.cursor],{x,y,z,at:time,soil});this.cursor=(this.cursor+1)%48;}
  reset(){this.bursts.forEach(b=>b.at=-100);}
  update(time:number,reduced:boolean){
    this.root.visible=!reduced;
    this.bursts.forEach((b,n)=>{
      const age=time-b.at,life=b.soil?.42:.48,visible=age>=0&&age<life;
      for(let j=0;j<12;j++){
        const a=j*2.399+n*.7,speed=.8+(j%3)*.25;
        if(b.soil){
          // Three irregular pebbles per side, distributed around the trench lip.
          const edge=Math.floor(j/3),along=(j%3-1)*.53+Math.sin(n+j)*.07;
          const rim=.68+(j%2)*.06,out=age*(.22+(j%3)*.09);
          const x=edge===0?-rim-out:edge===1?rim+out:along;
          const z=edge===2?-rim-out:edge===3?rim+out:along;
          this.dummy.position.set(b.x+x,Math.max(.015,b.y+.09+age*(1.6+(j%3)*.22)-age*age*6),b.z+z);
          const fade=visible?Math.min(1,(life-age)/.12):0,size=.48+(j%4)*.13;
          this.dummy.scale.set(size*fade,size*(.65+(j%3)*.12)*fade,size*(.8+(j%2)*.25)*fade);
          this.dummy.rotation.set(a+age*9,j+age*5,a-age*7);
        }else{
          // Preserve the approved water jet motion and proportions exactly.
          this.dummy.position.set(b.x+Math.cos(a)*(.12+age*speed),b.y+age*3.2-age*age*7.5,b.z+Math.sin(a)*(.12+age*speed));
          const scale=visible?Math.pow(Math.max(0,1-age/life),.7):0;
          this.dummy.scale.set(scale*.65,scale*2.8,scale*.65);
          this.dummy.rotation.set(Math.sin(a)*age*2,age*3,Math.cos(a)*age*2);
        }
        this.dummy.updateMatrix();this.drops.setMatrixAt(n*12+j,this.dummy.matrix);
        this.drops.setColorAt(n*12+j,b.soil?this.sand:this.water);
      }
    });
    this.drops.instanceMatrix.needsUpdate=true;this.drops.instanceColor!.needsUpdate=true;
  }
}
