import * as T from 'three';
import { gridWorld, SIZE, TILE_SIZE } from './game';
import type { World } from './world';
import { drawPixel, PIXEL_SIZES, type PixelKind } from './oasis-pixels';

type Walker = { sprite: T.Sprite; kind: 'sheep' | 'shepherd'; start: T.Vector3; end: T.Vector3; phase: number };
/** Stage-one-only billboard experiment. Shared frame materials keep uploads bounded. */
export class OasisSprites {
  root = new T.Group();
  frames = new Map<string,T.SpriteMaterial>();
  walkers: Walker[] = [];
  palms: T.Sprite[] = [];
  grass: T.Sprite[] = [];
  hearts: T.Sprite[] = [];
  dust: { sprite: T.Sprite; born: number; x:number; z:number; vx: number; vz: number }[] = [];
  time = 0;
  constructor(public world: World) {
    world.root.add(this.root);
    this.palms.push(this.add('palm',-5,-3.5),this.add('palm',6,-3.5));
    world.game.level.tiles.forEach((t,i)=>{
      const x=gridWorld(i%SIZE), z=gridWorld(Math.floor(i/SIZE));
      if(t==='rock')this.add('rock',x,z);
    });
    // Only the reserved southern bank gets scenery. All diggable approaches stay clear.
    for(const x of [4.35,5.15,5.8]) {
      this.add('pebble',x,2.65);
      this.grass.push(this.add('grass',x+.08,2.78));
    }
    this.add('blanket',2.6,4.5);
    this.add('basket',6.3,4.8);
    this.walker('shepherd',3.2,3.8,3.2,2.85,0);
    this.walker('sheep',5.0,4.65,4.7,2.05,1);
    this.walker('sheep',6.8,2.9,6.55,1.2,2);
    this.walker('sheep',6.8,.15,6.55,-.85,3);
    for(const [x,z] of [[4.7,2.05],[6.55,-.85]]){const s=this.add('heart',x,z);s.position.y=1.6;this.hearts.push(s);}
    this.update(0,0);
  }
  material(kind:PixelKind,frame=0,flip=false) {
    const key=`${kind}:${frame}:${flip}`;
    let material=this.frames.get(key);
    if(!material){
      const texture=new T.CanvasTexture(drawPixel(kind,frame));
      texture.colorSpace=T.SRGBColorSpace;
      texture.magFilter=texture.minFilter=T.NearestFilter;
      texture.generateMipmaps=false;
      if(flip){texture.repeat.x=-1;texture.offset.x=1;}
      material=new T.SpriteMaterial({map:texture,alphaTest:.5,transparent:false,depthWrite:true,toneMapped:false});
      this.frames.set(key,material);
    }
    return material;
  }
  add(kind:PixelKind,x:number,z:number) {
    const sprite=new T.Sprite(this.material(kind));
    sprite.name=`pixel-${kind}`;
    sprite.center.set(.5,0);
    const [width,height]=PIXEL_SIZES[kind];
    const pixelSize=TILE_SIZE/32;
    sprite.scale.set(width*pixelSize,height*pixelSize,1);
    sprite.position.set(x,.04,z);
    sprite.raycast=()=>{};
    this.root.add(sprite);
    return sprite;
  }
  walker(kind:Walker['kind'],x:number,z:number,tx:number,tz:number,phase:number){
    const sprite=this.add(kind,x,z);
    this.walkers.push({sprite,kind,start:sprite.position.clone(),end:new T.Vector3(tx,.04,tz),phase});
  }
  burst(i:number) {
    for(let k=0;k<7;k++) {
      const sprite=this.add('dust',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));
      this.dust.push({sprite,born:this.time,x:sprite.position.x,z:sprite.position.z,vx:(Math.random()-.5)*1.5,vz:(Math.random()-.5)*1.5});
    }
  }
  update(progress:number,time:number) {
    this.time=time;
    this.dust=this.dust.filter(p=>{
      const age=time-p.born;
      if(age>.55){p.sprite.removeFromParent();return false;}
      p.sprite.position.x=p.x+p.vx*age;
      p.sprite.position.z=p.z+p.vz*age;
      p.sprite.position.y=.05+Math.sin(age/.55*Math.PI)*.45;
      p.sprite.visible=Math.floor(age*18)%3!==2;
      return true;
    });
    const reduced=this.world.reduced;
    for(const a of this.walkers){
      const raw=T.MathUtils.clamp((progress-.22-a.phase*.025)/.61,0,1);
      const travel=raw*raw*(3-2*raw);
      a.sprite.position.lerpVectors(a.start,a.end,travel);
      const moving=raw>0&&raw<1;
      // Exactly two walk frames. No skeletal rotation, scale-pulsing, or sine bob.
      const frame=reduced?(progress>.83&&a.kind==='sheep'?4:0):moving?1+(Math.floor(time*6+a.phase)%2)
        :progress>.83&&a.kind==='sheep'?4+(Math.floor(time*2+a.phase)%2)
        :(time+a.phase*.71)%4.2>3.95?3:0;
      a.sprite.material=this.material(a.kind,frame,a.kind==='sheep');
      a.sprite.userData.frame=frame;
    }
    this.palms.forEach((s,n)=>s.material=this.material('palm',reduced?0:Math.floor(time*.85+n*.3)%2));
    this.grass.forEach(s=>{s.visible=progress>.15;s.material=this.material('grass',progress>.6?1:0);});
    this.hearts.forEach(s=>s.visible=progress>.88);
  }
  dispose(){for(const m of this.frames.values()){m.map?.dispose();m.dispose();}this.frames.clear();}
}
