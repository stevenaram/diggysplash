import * as T from 'three';

type Skin='skin'|'petal'|'palm'|'bark'|'tooth'|'mouth'|'blossom';
const palettes:Record<Skin,string[]>={
  skin:['#47764f','#284e40','#729a50','#a1ba68','#422f50'],
  petal:['#964265','#562c51','#c6677b','#e89a91','#763654'],
  palm:['#4c863e','#214f36','#79aa4d','#b3c16b','#356938'],
  bark:['#9f7149','#573f32','#c39159','#e0b578','#78543c'],
  tooth:['#e3d2a0','#927b62','#f8edc7','#fff6db','#c3af81'],
  blossom:['#c38496','#885368','#e2a6af','#f5cdb8','#a46681'],
  mouth:['#35243b','#171925','#5c304c','#813e5a','#402238'],
};
/** One repeating 32px map spans one 2-world-unit tile. No resampled artwork. */
export class MonsterArt {
  materials:T.Material[]=[];
  maps:T.Texture[]=[];
  outline=new T.MeshBasicMaterial({color:0x191820,side:T.BackSide});
  constructor(){
    // Inverted hull is expanded along normals, not object scale (which breaks merged parts).
    this.outline.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed = vec3(position + normal * 0.035);');
    };
    this.outline.customProgramCacheKey=()=> 'monster-inverted-hull-v1';
    this.materials.push(this.outline);
  }
  material(kind:Skin){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const c=canvas.getContext('2d')!,p=palettes[kind];
    c.fillStyle=p[0];c.fillRect(0,0,32,32);
    for(let n=0;n<(kind==='palm'?8:kind==='skin'?22:32);n++){
      const x=(n*13+Math.floor(n/5)*3)%32,y=(n*19+Math.floor(n/7))%32;
      c.fillStyle=p[1+n%3];c.fillRect(x,y,kind==='skin'?2+n%3:1+n%2,1+(n%4===0?2:0));
    }
    if(kind==='skin'||kind==='petal')for(let y=0;y<32;y++){
      const x=(Math.floor(y/3)+(kind==='petal'?9:2))%32;
      c.fillStyle=p[1];c.fillRect(x,y,1,1);
      if(y%5===0){c.fillStyle=p[2];c.fillRect(x+1,y,4,1);}
    }
    if(kind==='palm'){
      c.fillStyle=p[3];c.fillRect(15,0,1,32);
      for(let y=2;y<32;y+=5)for(let x=0;x<15;x++){
        c.fillStyle=p[1];c.fillRect(x,(y+Math.floor(x/3))%32,1,1);
        c.fillStyle=p[2];c.fillRect(31-x,(y+Math.floor(x/3))%32,1,1);
      }
    }
    if(kind==='bark')for(let y=2;y<32;y+=6){c.fillStyle=p[1];c.fillRect(0,y,32,1);c.fillStyle=p[3];c.fillRect(0,y+1,32,1);}
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    map.minFilter=map.magFilter=T.NearestFilter;map.wrapS=map.wrapT=T.RepeatWrapping;map.generateMipmaps=false;
    this.maps.push(map);
    const m=new T.MeshBasicMaterial({map,side:kind==='palm'?T.DoubleSide:T.FrontSide});this.materials.push(m);return m;
  }
  outlineMesh(mesh:T.Mesh){
    const shell=new T.Mesh(mesh.geometry,this.outline);shell.name='inverted-hull';shell.raycast=()=>{};shell.frustumCulled=mesh.frustumCulled;mesh.add(shell);
  }
  dispose(){this.materials.forEach(m=>m.dispose());this.maps.forEach(m=>m.dispose());}
}

/** Bent central rib with alternating, tapered leaflets; no flat star-shaped canopy. */
export function palmFrond(length:number){
  const pos:number[]=[],uv:number[]=[];
  const point=(u:number,side:number,width:number)=>new T.Vector3(u*length,.55*Math.sin(u*Math.PI)-.8*u*u-Math.abs(side)*.12,side*width);
  const tri=(a:T.Vector3,b:T.Vector3,c:T.Vector3)=>{for(const p of [a,b,c]){pos.push(p.x,p.y,p.z);uv.push(p.x/2,p.z/2);}};
  for(let n=0;n<13;n++){
    const u=.06+n*.068,width=.36*Math.sin(Math.PI*(u*.85+.08))*(1-u*.55);
    for(const side of [-1,1]){
      const a=point(u,0,0),b=point(u+.045,0,0),tip=point(Math.min(1,u+.19),side,width);
      const mid=point(u+.1,side,width*.8);mid.y+=.05;
      tri(a,mid,tip);tri(a,tip,b);
    }
    const a=point(u,-1,.025),b=point(u,1,.025),c=point(u+.08,1,.015),d=point(u+.08,-1,.015);
    tri(a,b,c);tri(a,c,d);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
