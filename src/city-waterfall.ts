import * as T from 'three';
import {metricUV} from './metric-uv';
import type {World} from './world';
/** Curved overflow sheet, moving highlights and a small splash at its actual landing. */
export class CityWaterfall{
  root=new T.Group();
  private curve:T.CatmullRomCurve3;
  private flecks:T.Mesh[]=[];
  private foam:T.Mesh[]=[];
  constructor(world:World,parent:T.Object3D,points:T.Vector3[],width:number){
    parent.add(this.root);this.curve=new T.CatmullRomCurve3(points);
    const vertices:number[]=[],indices:number[]=[];
    for(let n=0;n<=20;n++){
      const p=this.curve.getPoint(n/20),w=width*(1-.13*Math.sin(n*.51));
      vertices.push(p.x-w/2,p.y,p.z,p.x+w/2,p.y,p.z);
      if(n<20){const i=n*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const geometry=metricUV(g);g.dispose();
    const material=new T.MeshBasicMaterial({color:0x55c9c3,map:world.textures.world('water'),side:T.DoubleSide});
    const mesh=new T.Mesh(geometry,material);mesh.userData.ownedMaterial=material;this.root.add(mesh);
    for(let n=0;n<8;n++)this.flecks.push(world.box(this.root,0,0,0,.065,.025,.15,n%2?0xabe9df:0x80dbd1));
    for(let n=0;n<10;n++)this.foam.push(world.box(this.root,0,0,0,.065,.065,.065,0xc2eee2));
  }
  update(time:number,visible:boolean,reduced:boolean){
    this.root.visible=visible;
    if(!visible)return;
    this.flecks.forEach((f,n)=>{
      const t=reduced?n/8:(time*.65+n*.123)%1,p=this.curve.getPoint(t),d=this.curve.getTangent(t);
      f.position.copy(p);f.position.x+=(n%3-1)*.19;f.position.y+=.018;f.position.z+=.018;
      f.rotation.x=-Math.atan2(d.y,d.z);f.scale.z=.7+Math.sin(t*Math.PI)*.6;
    });
    const end=this.curve.getPoint(1);
    this.foam.forEach((f,n)=>{
      const t=reduced?.3:(time*1.6+n*.1)%1,a=n*2.399;
      f.position.set(end.x+Math.cos(a)*t*.48,end.y+.035+Math.sin(t*Math.PI)*.15,end.z+Math.sin(a)*t*.25);
      f.scale.setScalar(1-t);f.rotation.set(a,t*3,a);
    });
  }
}
