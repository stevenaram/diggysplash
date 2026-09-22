import * as T from 'three';
/** Fixed pools keep rapid digging and long channel fills allocation-free. */
export class WaterEffects {
  root=new T.Group();
  private drops:T.InstancedMesh;
  private dummy=new T.Object3D();
  private cursor=0;
  private bursts=Array.from({length:24},()=>({at:-100,x:0,y:0,z:0}));
  private rings:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>[]=[];
  constructor(parent:T.Group){
    parent.add(this.root);
    this.drops=new T.InstancedMesh(new T.IcosahedronGeometry(.055,0),new T.MeshBasicMaterial({color:0x91eee1}),24*8);
    this.drops.frustumCulled=false;this.drops.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(this.drops);
    for(let n=0;n<24;n++){
      const ring=new T.Mesh(new T.RingGeometry(.19,.225,24),new T.MeshBasicMaterial({color:0xc4fff0,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.visible=false;ring.userData.ownedMaterial=ring.material;this.root.add(ring);this.rings.push(ring);
    }
    this.drops.userData.ownedMaterial=this.drops.material;
    this.root.traverse(o=>o.raycast=()=>{});
  }
  splash(x:number,y:number,z:number,time:number){Object.assign(this.bursts[this.cursor],{x,y,z,at:time});this.cursor=(this.cursor+1)%24;}
  reset(){this.bursts.forEach(b=>b.at=-100);}
  update(time:number,reduced:boolean){
    this.root.visible=!reduced;
    this.bursts.forEach((b,n)=>{
      const age=time-b.at,visible=age>=0&&age<.65;
      const ring=this.rings[n];ring.visible=visible;
      if(visible){ring.position.set(b.x,b.y+.045,b.z);ring.scale.setScalar(.35+age*2);ring.material.opacity=.65*Math.sin(Math.min(1,age/.65)*Math.PI);}
      for(let j=0;j<8;j++){
        const a=j*2.399+n*.7,speed=.55+(j%3)*.2;
        this.dummy.position.set(b.x+Math.cos(a)*age*speed,b.y+age*(1.4+(j%3)*.25)-age*age*3.8,b.z+Math.sin(a)*age*speed);
        const scale=visible?Math.max(0,1-age/.65):0;
        this.dummy.scale.set(scale,scale*(1.5-age),scale);this.dummy.rotation.set(a,age*3,a);
        this.dummy.updateMatrix();this.drops.setMatrixAt(n*8+j,this.dummy.matrix);
      }
    });
    this.drops.instanceMatrix.needsUpdate=true;
  }
}
