import * as T from 'three';
import {cityPose} from './city-timeline';
import type {World} from './world';
const rough=(a:number)=>1+.055*Math.sin(a*5)+.035*Math.cos(a*9)+.018*Math.sin(a*13);
/** Fixed-pool water and eroded-earth surfaces for the market's collapse. */
export class CityDisasterEffects{
  root=new T.Group();
  private flood:T.Mesh;
  private basin:T.Mesh;
  private jet=new T.Group();
  private foam:T.InstancedMesh;
  private dummy=new T.Object3D();
  private streams:T.Mesh[]=[];
  private plume:T.Mesh[]=[];
  constructor(private world:World){
    world.root.add(this.root);
    this.flood=this.surface(false);this.basin=this.surface(true);
    this.root.add(this.flood,this.basin,this.jet);
    this.jet.position.set(-3,.5,5);
    // A forceful vertical core and four curved sheets that break outward at the crest.
    for(let n=0;n<5;n++){
      const a=n*Math.PI*.5,r=n===4?0:.25;
      const points=[new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),new T.Vector3(Math.cos(a)*r,1.6,Math.sin(a)*r),new T.Vector3(Math.cos(a)*.5,3.4,Math.sin(a)*.5),new T.Vector3(Math.cos(a)*1.1,3.65,Math.sin(a)*1.1),new T.Vector3(Math.cos(a)*1.5,2.9,Math.sin(a)*1.5)];
      const curve=new T.CatmullRomCurve3(points);
      const mesh=new T.Mesh(new T.TubeGeometry(curve,16,n===4?.22:.13,5,false),world.mat(n%2?0x82e3d4:0x46bdbb));this.jet.add(mesh);this.plume.push(mesh);
    }
    const geo=new T.BoxGeometry(.10,.035,.19),mat=new T.MeshBasicMaterial({color:0xc7f0df});
    this.foam=new T.InstancedMesh(geo,mat,140);this.foam.userData.ownedMaterial=mat;this.foam.frustumCulled=false;this.root.add(this.foam);
    // One joined sheet leaves the terrace at the feed's exact height and edge.
    // Separate tubes intersected the old flat overhang and exposed their end caps.
    const curve=new T.CatmullRomCurve3([
      new T.Vector3(5,1.3425,-2.45),new T.Vector3(5,1.31,-1.7),
      new T.Vector3(4.95,.92,-.55),new T.Vector3(4.65,.34,1.2),
      new T.Vector3(3.2,.22,3.3),
    ]);
    const vertices:number[]=[],colors:number[]=[],indices:number[]=[];
    for(let row=0;row<=32;row++){
      const point=curve.getPoint(row/32);
      for(let col=0;col<=8;col++){
        vertices.push(point.x+(col/8-.5)*1.3,point.y,point.z);
        const color=new T.Color(col%3===0?0x65cec7:0x55c7c2);colors.push(color.r,color.g,color.b);
        if(row<32&&col<8){const i=row*9+col;indices.push(i,i+9,i+1,i+1,i+9,i+10);}
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
    const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
    const runoff=new T.Mesh(geometry,material);runoff.userData.ownedMaterial=material;
    this.root.add(runoff);this.streams.push(runoff);
  }
  private surface(earth:boolean){
    const segments=earth?32:64,rings=earth?6:9,positions:number[]=[],colors:number[]=[],indices:number[]=[];
    const palette=earth?[0x1f353b,0x34464a,0x34464a,0x665d49,0xa18157,0xd0aa77]:[0x258c98,0x2e9da7,0x39a9ae,0x41b4b6,0x48bdba,0x51c3bd,0x59c8c0,0x65cec4,0x85dbcb];
    for(let r=0;r<rings;r++)for(let n=0;n<=segments;n++){
      const a=n/segments*Math.PI*2+(earth?Math.sin(r*1.4)*.13:0),f=r/(rings-1),irregular=rough(a);
      const radius=f;
      // Expand northward and across the town, but retain a sand lip inside all board edges.
      const x=Math.cos(a)*radius*irregular*(earth?7.6:6.7);
      const z=Math.sin(a)*radius*irregular*(earth?4.35:3.25);
      positions.push(earth?T.MathUtils.clamp(x,-7.75,7.75):x,earth?.075+Math.pow(f,3)*.15:.25,earth?T.MathUtils.clamp(z,-4.15,4.4):z);
      const c=new T.Color(palette[r]);c.multiplyScalar(1+Math.sin(n*2.3+r)*.045);colors.push(c.r,c.g,c.b);
      if(r<rings-1&&n<segments){const i=r*(segments+1)+n;indices.push(i,i+1,i+segments+1,i+1,i+segments+2,i+segments+1);}
    }
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    if(earth){
      const flat=g.toNonIndexed();g.dispose();g=flat;
      const c=g.getAttribute('color');
      for(let i=0;i<c.count;i+=3){const r=(c.getX(i)+c.getX(i+1)+c.getX(i+2))/3,gr=(c.getY(i)+c.getY(i+1)+c.getY(i+2))/3,b=(c.getZ(i)+c.getZ(i+1)+c.getZ(i+2))/3;for(let j=0;j<3;j++)c.setXYZ(i+j,r,gr,b);}
    }
    // Indices wind downwards; the painted surface is intentionally double-sided.
    const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
    const mesh=new T.Mesh(g,material);mesh.userData.ownedMaterial=material;mesh.position.z=earth?3.35:4.25;return mesh;
  }
  update(seconds:number,time:number){
    const p=cityPose(seconds),moving=this.world.reduced?0:time;
    this.jet.visible=p.burst>0;this.jet.scale.set(1,p.burst,1);
    this.plume.forEach((m,n)=>{m.rotation.y=Math.sin(moving*8+n)*.025;m.scale.x=1+Math.sin(moving*13+n)*.045;});
    this.flood.visible=p.flood>0&&p.drain<1;
    this.flood.position.x=-3*(1-p.flood);this.flood.position.z=5-.75*p.flood;
    this.flood.scale.set(Math.max(.001,p.flood),1,Math.max(.001,p.flood));
    const positions=this.flood.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const ring=Math.floor(i/65),a=(i%65)/64*Math.PI*2,f=p.collapse*.74+(1-p.collapse*.74)*ring/8;
      positions.setXYZ(i,Math.cos(a)*f*rough(a)*6.7,.25+Math.sin(a*4+moving*3)*.025-p.drain*.28,Math.sin(a)*f*rough(a)*3.25);
    }
    positions.needsUpdate=true;
    this.basin.visible=p.collapse>0;this.basin.scale.set(p.collapse,1,p.collapse);
    this.streams.forEach(m=>{m.visible=p.surge>0;});
    for(let n=0;n<140;n++){
      const a=n*2.399+moving*.13,r=n<70?1:((n*17)%67)/67;
      const radius=(n<70?rough(a):1)*(p.collapse*.76+(1-p.collapse*.76)*r);
      const x=Math.cos(a)*6.7*radius,z=Math.sin(a)*3.25*radius;
      this.dummy.position.set(this.flood.position.x+x*p.flood,.30-p.drain*.25,4.25+z*p.flood);
      this.dummy.rotation.set(0,-a,0);
      const show=this.flood.visible&&(n<70||n%3===0)?(1-p.drain)*p.flood*(n<70?.55:.75):0;
      this.dummy.scale.set(show,show,show*(n<70?1:2.2));this.dummy.updateMatrix();this.foam.setMatrixAt(n,this.dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
  }
}
