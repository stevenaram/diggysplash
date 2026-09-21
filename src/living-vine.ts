import * as T from 'three';
/** A continuous tapered tube. Positions/normals/metric UVs are updated in-place. */
export class LivingVine {
  mesh:T.Mesh;
  private rings=24;
  private sides=7;
  private point=new T.Vector3();
  private next=new T.Vector3();
  private previous=new T.Vector3();
  private tangent=new T.Vector3();
  private side=new T.Vector3();
  private normal=new T.Vector3();
  private up=new T.Vector3(0,1,0);
  constructor(material:T.Material){
    const count=(this.rings+1)*(this.sides+1),g=new T.BufferGeometry(),indices:number[]=[];
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('normal',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*2),2).setUsage(T.DynamicDrawUsage));
    for(let r=0;r<this.rings;r++)for(let s=0;s<this.sides;s++){
      const a=r*(this.sides+1)+s,b=a+this.sides+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    g.setIndex(indices);this.mesh=new T.Mesh(g,material);this.mesh.frustumCulled=false;this.mesh.raycast=()=>{};
  }
  update(sx:number,sy:number,sz:number,x:number,y:number,z:number,time:number){
    const sample=(out:T.Vector3,u:number)=>out.set(sx+(x-sx)*u+Math.sin(u*8-time*1.7)*.24*Math.sin(u*Math.PI),sy+(y-sy)*u+Math.sin(u*Math.PI)*1.15+Math.sin(u*10-time)*.12*Math.sin(u*Math.PI),sz+(z-sz)*u+Math.sin(u*6+time)*.22*Math.sin(u*Math.PI));
    const p=this.mesh.geometry.getAttribute('position'),n=this.mesh.geometry.getAttribute('normal'),uv=this.mesh.geometry.getAttribute('uv');let distance=0;
    for(let r=0;r<=this.rings;r++){
      const u=r/this.rings;sample(this.point,u);sample(this.next,u+.002);sample(this.previous,u-.002);
      this.tangent.subVectors(this.next,this.previous).normalize();
      this.side.crossVectors(this.tangent,this.up);if(this.side.lengthSq()<.001)this.side.set(1,0,0);this.side.normalize();
      this.normal.crossVectors(this.side,this.tangent).normalize();
      if(r>0){sample(this.previous,(r-1)/this.rings);distance+=this.point.distanceTo(this.previous);}
      const radius=.035+.18*Math.pow(1-u,.8);
      for(let s=0;s<=this.sides;s++){
        const angle=s/this.sides*Math.PI*2,ca=Math.cos(angle),sa=Math.sin(angle),i=r*(this.sides+1)+s;
        const nx=this.side.x*ca+this.normal.x*sa,ny=this.side.y*ca+this.normal.y*sa,nz=this.side.z*ca+this.normal.z*sa;
        p.setXYZ(i,this.point.x+nx*radius,this.point.y+ny*radius,this.point.z+nz*radius);n.setXYZ(i,nx,ny,nz);uv.setXY(i,angle*radius/2,distance/2);
      }
    }
    p.needsUpdate=n.needsUpdate=uv.needsUpdate=true;
  }
}
