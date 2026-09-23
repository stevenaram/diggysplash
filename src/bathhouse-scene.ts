import * as T from 'three';
import {PixelSprites} from './pixel-sprites';
import {gridWorld,SIZE} from './game';
import type {World} from './world';
export const BATH_DURATION=24;
const ease=(x:number)=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export function bathPose(t:number){return {fill:ease(t/3),enter:ease((t-3)/3),vortex:ease((t-9)/2),empty:ease((t-12)/7)};}
export function batherPose(t:number,n:number){return {pull:ease((t-10-n*.8)/2.8),eject:ease((t-15-n*.9)/1.6)};}
/** Cutaway Roman-style bath: all action and its plumbing stay inside the board. */
export class BathhouseScene extends PixelSprites {
 private pool:T.Mesh;private funnel:T.Mesh;private swirl=new T.Group();private people:T.Sprite[]=[];
 private steam:T.Sprite[]=[];private relay:T.Mesh[]=[];private coalWater:T.Mesh;
 private splash:T.Mesh[]=[];private previous=0;
 constructor(world:World){
  super(world);const box=world.box.bind(world);
  box(this.root,-4,-.15,-5,8,.6,6,0xc5a36e,'sand');
  // Pale limestone shell with a low front parapet and a central stair opening.
  box(this.root,4.35,.10,-4.6,6.7,.26,6.15,0x989d91,'stone');
  for(let x=0;x<6;x++)for(let z=0;z<5;z++)box(this.root,1.85+x,.25,-6.8+z, .965,.09,.965,(x+z)%2?0xd9dcc6:0xbfcbbb,'stone');
  box(this.root,4.35,1.25,-7.55,6.8,2.5,.32,0xe0d5b5,'stone');
  for(let n=0;n<16;n++)box(this.root,1.35+n*.39,1.75,-7.36,.30,.24,.035,n%2?0x5a8f97:0xd8e1ca);
  box(this.root,7.65,.95,-4.65,.3,1.9,6,0xc7c5aa,'stone');
  box(this.root,1.05,.66,-4.65,.25,1.35,6,0xe0d5b5,'stone');
  for(const x of [2.0,6.55])box(this.root,x,.56,-1.64,2.0,1.1,.26,0xe0d5b5,'stone');
  for(let n=0;n<3;n++)box(this.root,4.3,.12+n*.14,-.8-n*.25,2.35,.22,.42,0xd8d4b9,'stone');
  for(const x of [1.1,7.6]){
   box(this.root,x,1.6,-7.5,.5,3.2,.5,0xe9dec1,'stone');box(this.root,x,3.17,-7.5,.7,.17,.7,0xf4e7c6,'stone');
  }
  for(const z of [-6.7,-5.2,-3.7]){box(this.root,7.27,.55,z,.45,.65,1.1,0x8b6550,'wood');box(this.root,7.22,.93,z,.65,.14,1.15,0xc2986b,'wood');}
  // Open drain is visible before filling, with a contrasting concentric stone rim.
  const drain=world.shaded(new T.CircleGeometry(.72,24),0x263b40);drain.rotation.x=-Math.PI/2;drain.position.set(4.3,.31,-4.6);this.root.add(drain);
  const rim=world.shaded(new T.TorusGeometry(.8,.13,5,24),0x7c9695,'stone');rim.rotation.x=-Math.PI/2;rim.position.copy(drain.position);this.root.add(rim);
  const surface=new T.Shape();surface.moveTo(-2.98,-2.65);surface.lineTo(2.98,-2.65);surface.lineTo(2.98,2.65);surface.lineTo(-2.98,2.65);surface.closePath();
  const hole=new T.Path();hole.absarc(0,0,.7,0,Math.PI*2,true);surface.holes.push(hole);
  this.pool=world.shaded(new T.ShapeGeometry(surface),0x40b8bb,'water');this.pool.rotation.x=-Math.PI/2;this.pool.position.set(4.3,.8,-4.6);this.root.add(this.pool);
  const funnelMaterial=new T.MeshBasicMaterial({color:0x319ca6,side:T.DoubleSide});
  this.funnel=new T.Mesh(new T.CylinderGeometry(.7,.09,1.2,24,1,true),funnelMaterial);this.funnel.userData.ownedMaterial=funnelMaterial;this.funnel.position.set(4.3,.22,-4.6);this.root.add(this.funnel);
  this.root.add(this.swirl);this.swirl.position.set(4.3,.82,-4.6);
  for(let n=0;n<18;n++){
   const r=.85+(n%3)*.57,a=n*2.399;const streak=box(this.swirl,Math.cos(a)*r,0,Math.sin(a)*r,.24,.018,.055,n%2?0xa5ece0:0x72d4d0);streak.rotation.y=Math.PI/2-a;
  }
  // The exposed outlet faces the viewer and ends over a dry mud apron.
  const tube=world.shaded(new T.CylinderGeometry(.79,.79,2.2,12,1,true),0xb9b8a5,'stone');tube.material=world.mat(0xb9b8a5,'stone',true);tube.rotation.x=Math.PI/2;tube.position.set(5.2,.48,-.55);this.root.add(tube);
  const outlet=world.shaded(new T.CircleGeometry(.66,20),0x293a3a);outlet.position.set(5.2,.48,.57);this.root.add(outlet);
  const lip=world.shaded(new T.TorusGeometry(.74,.14,5,20),0xdfd5b9,'stone');lip.position.copy(outlet.position);lip.position.z+=.02;this.root.add(lip);
  const mud=world.shaded(new T.CircleGeometry(1,24),0x8c6950,'soil');mud.rotation.x=-Math.PI/2;mud.scale.set(2.15,1.5,1);mud.position.set(5.25,.045,3.1);this.root.add(mud);
  for(let n=0;n<7;n++){const spot=world.shaded(new T.CircleGeometry(.25+(n%3)*.08,8),0x725845,'soil');spot.rotation.x=-Math.PI/2;spot.position.set(4+(n%3)*1.05,.055,2.3+Math.floor(n/3)*.65);this.root.add(spot);}
  // Raised leftward relay, isolated from the sand underneath by explicit level links.
  for(const x of [-7,-5,-3,-1]){
   box(this.root,x,.36,-1,1.9,.18,.94,0x87988e,'stone');
   for(const z of [-1.54,-.46])box(this.root,x,.62,z,1.96,.4,.15,0xe7e0c4,'stone');
   const water=box(this.root,x,.5,-1,1.96,.045,.9,0x3bbabd,'water');this.relay.push(water);
   if(x!==-1)for(const dx of [-.65,.65])box(this.root,x+dx,.12,-1,.18,.45,.7,0xa5ada0,'stone');
  }
  this.relay.push(box(this.root,-1,.49,-1.9,.95,.06,.85,0x3bbabd,'water'));
  this.relay.push(box(this.root,-7,.18,-.35,.95,.66,.09,0x3bbabd,'water'));
  this.relay.push(box(this.root,-7,-.12,.05,.95,.06,.8,0x3bbabd,'water'));
  for(const i of [24,27]){world.waters.get(i)!.visible=false;world.waters.get(i)!.geometry.scale(0,0,0);}
  // Intake and heater are unmistakable stone receivers; channels remain uncovered.
  for(const z of [1,7]){
   box(this.root,1,-.17,z,1.8,.16,1.6,0x949f97,'stone');
   for(const dx of [-.88,.88])box(this.root,1+dx,.17,z,.14,.55,1.8,0xe0dac0,'stone');
   box(this.root,1,.17,z-.9,1.85,.55,.14,0xe0dac0,'stone');
  }
  box(this.root,1.15,.4,-.05,.65,.3,1.4,0xa5b8a9,'stone');
  this.coalWater=box(this.root,3.25,.45,6.4,2.0,.08,1.55,0x42b6b5,'water');
  box(this.root,3.25,.22,6.4,2.3,.4,1.8,0x74776a,'stone');
  for(let n=0;n<9;n++){const coal=world.shaded(new T.DodecahedronGeometry(.24,0),n%3?0x55443d:0xce7950);coal.position.set(2.6+(n%3)*.6,.53,5.9+Math.floor(n/3)*.48);this.root.add(coal);}
  box(this.root,2.1,.36,6.9,1,.18,.42,0xbdc3aa,'stone');
  // Steam duct runs along the east wall rather than covering any dig square.
  box(this.root,7.45,.28,1.8,.24,.24,9.2,0xa48159,'wood');box(this.root,5.4,.28,6.35,4.3,.24,.24,0xa48159,'wood');
  box(this.root,4.3,.62,-5.55,5.8,.35,.72,0xbc9467,'wood');
  for(let n=0;n<3;n++)this.people.push(this.add('bather',2.15+n*2.15,-5.0));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=12;const c=canvas.getContext('2d')!;c.fillStyle='#ffffff';c.fillRect(3,1,6,10);c.fillRect(1,3,10,6);
  const texture=new T.CanvasTexture(canvas);texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;this.root.userData.ownedTexture=texture;
  for(let n=0;n<16;n++){const material=new T.SpriteMaterial({map:texture,color:0xf3eee0,transparent:true,depthWrite:false,toneMapped:false});const puff=new T.Sprite(material);puff.userData.ownedMaterial=material;this.root.add(puff);this.steam.push(puff);}
  for(let n=0;n<30;n++){const m=world.shaded(new T.BoxGeometry(.09,.09,.09),n%2?0x72d1ca:0xd5e7d4);this.root.add(m);this.splash.push(m);}
  world.game.level.tiles.forEach((tile,i)=>{if(tile==='rock'&&i!==25&&i!==26){const rock=this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));rock.position.y+=world.game.level.elevations?.[i]??0;}});
  this.update(0,[false,false],0);
 }
 update(progress:number,active:boolean[],time:number){
  const t=progress*BATH_DURATION,p=bathPose(t),motion=this.world.reduced?0:time;
  this.relay.forEach(m=>m.visible=this.world.game.wet.has(27)&&this.world.game.wet.has(24));
  this.coalWater.visible=active[1];
  const full=(active[0]?(.28+.72*p.fill):0)*(1-p.empty);this.pool.visible=full>.01;this.pool.position.y=.32+full*.48;
  this.funnel.visible=p.vortex>0&&full>.02;this.funnel.position.y=this.pool.position.y-.6;
  this.swirl.visible=full>.05;this.swirl.position.y=this.pool.position.y+.025;this.swirl.rotation.y=-motion*(.15+p.vortex*1.5);this.swirl.scale.setScalar(1-p.empty*.5);
  this.steam.forEach((m,n)=>{const a=((motion*.22+n/16)%1),heater=n<6;m.visible=heater?active[1]:full>.2;m.position.set((heater?3.25:4.3)+Math.sin(n*2.4)* (heater?.5:2)+a*.3,(heater?.6:1)+a*2.1,(heater?6.4:-4.6)+Math.cos(n*2.4)*(heater?.4:1.8));m.scale.setScalar(.5+a*.6);m.material.opacity=Math.sin(a*Math.PI)*.32*(heater?1:full);});
  this.people.forEach((s,n)=>{
   const b=batherPose(t,n),startX=2.15+n*2.15,homeX=2.6+n*1.7,homeZ=-3.4-(n%2)*1.4;
   s.visible=true;s.scale.set(2,2.5,1);s.material=this.material('bather',p.enter>0&&p.enter<1?Math.floor(motion*6)%2:0);s.material.rotation=0;
   const enter=p.enter;s.position.set(T.MathUtils.lerp(startX,homeX,enter),T.MathUtils.lerp(.9,.47,enter),T.MathUtils.lerp(-5.0,homeZ,enter));
   if(enter>=1)s.position.y=.47+Math.sin(motion*2+n)*.04;
   if(b.pull>0){const a=n*2.1+b.pull*7,r=(1-b.pull)*1.8;s.position.set(4.3+Math.cos(a)*r,.45-b.pull*.35,-4.6+Math.sin(a)*r);s.scale.multiplyScalar(1-ease((b.pull-.55)/.45));}
   if(b.pull>=1)s.visible=false;
   if(t>=15+n*.9){s.visible=true;s.material=this.material('bather-down',4);s.scale.set(3,2,1);s.position.set(T.MathUtils.lerp(5.2,3.8+n*1.3,b.eject),.1+Math.sin(b.eject*Math.PI)*1.7,T.MathUtils.lerp(.65,2.6+n*.6,b.eject));}
  });
  this.splash.forEach((m,n)=>{const person=Math.floor(n/10),age=t-(16.6+person*.9);m.visible=age>0&&age<.8;const a=n*2.4;m.position.set(3.8+person*1.3+Math.cos(a)*age*1.2,.1+age*1.8-age*age*3,2.6+person*.6+Math.sin(a)*age);m.scale.setScalar(Math.max(0,1-age/.8));});
  if(t<this.previous)this.previous=0;
  for(const [at,cue]of [[.2,'fill'],[3,'steam'],[9.8,'drain'],[16.6,'splat'],[17.5,'splat'],[18.4,'splat']] as const)if(!this.world.reduced&&this.previous<at&&t>=at)this.world.onBathSound(cue);
  this.previous=t;
 }
}
