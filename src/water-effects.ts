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
        const r=b.soil?.15:0.12;
        this.dummy.position.set(b.x+Math.cos(a)*(r+age*speed),b.y+age*(b.soil?2.8:3.2)-age*age*7.5,b.z+Math.sin(a)*(r+age*speed));
        const scale=visible?Math.pow(Math.max(0,1-age/life),.7):0;
        // Water jets briefly stretch upward; soil clods tumble in a scooping arc.
        this.dummy.scale.set(scale*(b.soil?1.1:.65),scale*(b.soil?.8:2.8),scale*(b.soil?1:.65));
        this.dummy.rotation.set(b.soil?a+age*8:Math.sin(a)*age*2,age*3,b.soil?a:Math.cos(a)*age*2);
        this.dummy.updateMatrix();this.drops.setMatrixAt(n*12+j,this.dummy.matrix);
        this.drops.setColorAt(n*12+j,b.soil?this.sand:this.water);
      }
    });
    this.drops.instanceMatrix.needsUpdate=true;this.drops.instanceColor!.needsUpdate=true;
  }
}
