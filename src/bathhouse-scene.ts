import {buildRoast} from './roast-model';
import {MonsterArt} from './monster-art';
import {metricUV} from './metric-uv';
import * as T from 'three';
import {PixelSprites} from './pixel-sprites';
import {gridWorld,SIZE} from './game';
import type {World} from './world';
export const BATH_DURATION=20;
const ease=(x:number)=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export function bathPose(t:number){return {fill:ease(t/3),enter:ease((t-3)/3),vortex:ease((t-7)/1.1),empty:ease((t-9)/4)};}
export function batherPose(t:number,n:number){return {pull:ease((t-7.6-n*.16)/1.65),eject:ease((t-11.3)/1.25)};}
/** Cutaway Roman-style bath: all action and its plumbing stay inside the board. */
export class BathhouseScene extends PixelSprites {
 private hotPeople:T.SpriteMaterial[]=[];private art=new MonsterArt();private roasts:T.Group[]=[];private waterCap:T.Mesh;private glints:T.Mesh[]=[];private heatSparks:T.Mesh[]=[];private heaterWasWet=false;
 private pool:T.Mesh;private funnel:T.Mesh;private swirl=new T.Group();private people:T.Sprite[]=[];
 private steam:T.Sprite[]=[];private relay:T.Mesh[]=[];private coalWater:T.Mesh;
 private heatMetal=new T.MeshBasicMaterial({color:0x82999b,vertexColors:true});private embers:T.Mesh[]=[];private inlet:T.Mesh[]=[];private valve:T.Mesh;
 private splash:T.Mesh[]=[];private previous=0;
 constructor(world:World){
  super(world);const box=world.box.bind(world);
  box(this.root,-4,-.15,-5,8,.6,6,0xc5a36e,'sand');
  // Pale limestone shell with a low front parapet and a central stair opening.
  box(this.root,4.35,.10,-4.15,6.7,.26,7.05,0x989d91,'stone');
  for(let x=0;x<6;x++)for(let z=0;z<7;z++)box(this.root,1.85+x,.25,-6.8+z*.9, .965,.09,.965,(x+z)%2?0xd9dcc6:0xbfcbbb,'stone');
  box(this.root,4.35,1.25,-7.55,6.8,2.5,.32,0xe0d5b5,'stone');
  for(let n=0;n<16;n++)box(this.root,1.35+n*.39,1.75,-7.36,.30,.24,.035,n%2?0x5a8f97:0xd8e1ca);
  box(this.root,7.65,.95,-4.15,.3,1.9,7,0xc7c5aa,'stone');
  box(this.root,1.05,.66,-4.15,.25,1.35,7,0xe0d5b5,'stone');
  for(const x of [2.0,6.55])box(this.root,x,.56,-.64,2.0,1.1,.26,0xe0d5b5,'stone');
  for(let n=0;n<3;n++)box(this.root,4.3,.12+n*.14,.2-n*.25,2.35,.22,.42,0xd8d4b9,'stone');
  for(const x of [1.1,7.6]){
   box(this.root,x,1.6,-7.5,.5,3.2,.5,0xe9dec1,'stone');box(this.root,x,3.17,-7.5,.7,.17,.7,0xf4e7c6,'stone');
  }
  for(const z of [-6.7,-5.2,-3.7]){box(this.root,7.27,.55,z,.45,.65,1.1,0x8b6550,'wood');box(this.root,7.22,.93,z,.65,.14,1.15,0xc2986b,'wood');}
  // Open drain is visible before filling, with a contrasting concentric stone rim.
  const drain=world.shaded(new T.CircleGeometry(.72,24),0x263b40);drain.rotation.x=-Math.PI/2;drain.position.set(4.3,.31,-4.6);this.root.add(drain);
  const rim=world.shaded(new T.TorusGeometry(.8,.13,5,24),0x7c9695,'stone');rim.rotation.x=-Math.PI/2;rim.position.copy(drain.position);this.root.add(rim);
  // Concentric geometry gives the whirlpool a continuous sloping surface, not a flat hole.
  const points:number[]=[],indices:number[]=[];
  for(let ring=0;ring<=8;ring++)for(let n=0;n<48;n++){
   const a=n/48*Math.PI*2,c=Math.cos(a),v=Math.sin(a),edge=Math.min(2.98/Math.max(.0001,Math.abs(c)),(v>0?2.65:3.65)/Math.max(.0001,Math.abs(v))),r=T.MathUtils.lerp(.7,edge,ring/8);
   points.push(c*r,v*r,0);
   if(ring<8){const i=ring*48+n,j=ring*48+(n+1)%48;indices.push(i,i+48,j,j,i+48,j+48);}
  }
  const surface=new T.BufferGeometry();surface.setAttribute('position',new T.Float32BufferAttribute(points,3));surface.setIndex(indices);surface.computeVertexNormals();
  this.pool=world.shaded(surface,0x40b8bb,'water');this.pool.rotation.x=-Math.PI/2;this.pool.position.set(4.3,.8,-4.6);this.root.add(this.pool);
  this.waterCap=world.shaded(new T.CircleGeometry(.705,32),0x40b8bb,'water');this.waterCap.rotation.x=-Math.PI/2;this.root.add(this.waterCap);
  for(let n=0;n<26;n++)this.glints.push(box(this.root,0,0,0,.2+(n%3)*.09,.012,.035,n%2?0x78d6cf:0x5fc5c6));
  const funnelMaterial=new T.MeshBasicMaterial({color:0x319ca6,side:T.DoubleSide});
  this.funnel=new T.Mesh(new T.CylinderGeometry(.7,.09,1.2,24,1,true),funnelMaterial);this.funnel.userData.ownedMaterial=funnelMaterial;this.funnel.position.set(4.3,.22,-4.6);this.root.add(this.funnel);
  this.root.add(this.swirl);this.swirl.position.set(4.3,.82,-4.6);
  for(let n=0;n<48;n++){
   const u=(n%16)/16,r=.75+u*1.75,a=Math.floor(n/16)*Math.PI*2/3+u*4.8;const streak=box(this.swirl,Math.cos(a)*r,0,Math.sin(a)*r,.19,.018,.055,n%2?0xa5ece0:0x72d4d0);streak.rotation.y=Math.PI/2-a;
  }
  // The exposed outlet faces the viewer and ends over a dry mud apron.
  const tube=world.shaded(new T.CylinderGeometry(.79,.79,2.2,12,1,true),0xb9b8a5,'stone');tube.material=world.mat(0xb9b8a5,'stone',true);tube.rotation.x=Math.PI/2;tube.position.set(5.2,.48,-.55);this.root.add(tube);
  const outlet=world.shaded(new T.CircleGeometry(.66,20),0x293a3a);outlet.position.set(5.2,.48,.57);this.root.add(outlet);
  const lip=world.shaded(new T.TorusGeometry(.74,.14,5,20),0xdfd5b9,'stone');lip.position.copy(outlet.position);lip.position.z+=.02;this.root.add(lip);
  // Raised leftward relay, isolated from the sand underneath by explicit level links.
  const relayStart=this.root.children.length;
  for(const x of [-7,-5,-3,-1]){
   box(this.root,x,.36,-1,1.9,.18,.94,0x87988e,'stone');
   box(this.root,x,.62,-.46,1.96,.4,.15,0xe7e0c4,'stone');
   if(x!==-1)box(this.root,x,.91,-1.54,1.96,1.0,.23,0xe7e0c4,'stone');
   else for(const dx of [-.78,.78])box(this.root,x+dx,.56,-1.65,.34,.32,.5,0xe7e0c4,'stone');
   const water=box(this.root,x,.5,-1,1.96,.045,.9,0x3bbabd,'water');water.userData.cell=24+Math.round((x+7)/2);this.relay.push(water);
   if(x!==-1)for(const dx of [-.65,.65])box(this.root,x+dx,.12,-1,.18,.45,.7,0xa5ada0,'stone');
  }
  box(this.root,-7.93,.88,-1,.18,.95,1.25,0xe7e0c4,'stone');
  // A wide, open north-facing notch is the only low intake in the high rear parapet.
  for(const dx of [-.63,.63])box(this.root,-1+dx,.45,-1.97,.15,.25,.7,0xadc0b1,'stone');
  this.relay.push(box(this.root,-1,.49,-1.9,.95,.06,.85,0x3bbabd,'water'));
  this.relay.push(box(this.root,-7,.18,-.35,.95,.66,.09,0x3bbabd,'water'));
  this.relay.push(box(this.root,-7,-.12,.05,.95,.06,.8,0x3bbabd,'water'));
  this.root.children.slice(relayStart).forEach(o=>o.position.z+=.36);
  this.relay[4].userData.cell=27;this.relay[5].userData.cell=32;this.relay[6].userData.cell=32;
  for(const i of [24,25,26,27]){world.waters.get(i)!.visible=false;world.waters.get(i)!.geometry.scale(0,0,0);}
  // Intake and heater are unmistakable stone receivers; channels remain uncovered.
  for(const z of [1]){
   box(this.root,1,-.23,z,1.8,.10,1.8,0x949f97,'stone');
   for(const dx of [.88])box(this.root,1+dx,.04,z,.14,.28,1.55,0xe0dac0,'stone');
   // Both ends stay open so the continuation north is readable.
   const cell=z===1?36:60;world.waters.get(cell)!.geometry.scale(1.13,1,1.22);
  }
  // Broad open flume and a water-operated inlet valve connect the upper receiver to the bath.
  for(const x of [.65,1.5])box(this.root,x,.25,-.1,.12,.45,1.1,0xc5d0bd,'stone');
  this.inlet.push(box(this.root,1.07,.15,-.1,.72,.045,1.2,0x4ac2c3,'water'));
  this.inlet.push(box(this.root,1.35,.55,-.83,.7,.06,1.15,0x4ac2c3,'water'));
  this.valve=box(this.root,1.1,.35,-.45,.76,.6,.12,0x7e9796,'stone');
  // Compact twelve-stone hearth, fed by the open southern trough.
  box(this.root,5.2,.025,3.9,4.2,.15,4.6,0x6c726a,'stone');
  box(this.root,4.15,.025,7,6.3,.15,1.1,0x6c726a,'stone');
  this.coalWater=box(this.root,5.2,.13,3.9,4.05,.045,4.5,0x43b6b9,'water');
  const footWater=box(this.root,4.15,.13,7,6.25,.045,.85,0x43b6b9,'water');footWater.userData.heaterFeed=true;this.inlet.push(footWater);
  const lipFloor=box(this.root,.55,-.045,7,.95,.10,1.78,0x6c726a,'stone');lipFloor.rotation.z=.22;
  const lipWater=box(this.root,.55,.045,7,.95,.025,1.72,0x43b6b9,'water');lipWater.rotation.z=.22;lipWater.userData.heaterFeed=true;this.inlet.push(lipWater);
  box(this.root,4,.22,6.43,4,.3,.16,0xc5c6ad,'stone');
  box(this.root,4.65,.22,7.57,5.3,.3,.16,0xc5c6ad,'stone');
  box(this.root,7.32,.22,7,.16,.3,1.3,0xc5c6ad,'stone');
  box(this.root,6.5,.025,6.15,1.15,.15,.8,0x6c726a,'stone');
  const turn=box(this.root,6.5,.13,6.15,.95,.045,.9,0x43b6b9,'water');turn.userData.heaterFeed=true;this.inlet.push(turn);
  for(let n=0;n<12;n++){
   const x=3.75+(n%4)*.94,z=2.5+Math.floor(n/4)*1.35;
   this.embers.push(box(this.root,x,.11,z,.6,.06,.55,0xe28a43));
   const stone=world.shaded(new T.IcosahedronGeometry(.35,0),[0xb9523b,0xcc6543,0xb54835][n%3]);stone.scale.y=.75;stone.position.set(x,.36,z);this.root.add(stone);
   const spark=world.shaded(new T.BoxGeometry(.0625,.0625,.0625),0xf2b066);spark.userData.origin=new T.Vector3(x,.7,z);this.root.add(spark);this.heatSparks.push(spark);
  }
  const food=new T.MeshBasicMaterial({color:0xcf8845,map:world.textures.world('soil')});const bark=this.art.material('bark');this.root.userData.roastMaterial=food;
  for(let n=0;n<3;n++){
   const roast=buildRoast(food,bark);roast.position.set(5.2,.85,2.3+n*1.45);
   roast.traverse(o=>{if(o instanceof T.Mesh){o.geometry.scale(o.scale.x,o.scale.y,o.scale.z);o.scale.setScalar(1);const old=o.geometry;o.geometry=metricUV(old);if(old!==o.geometry)old.dispose();}});
   this.root.add(roast);this.roasts.push(roast);
  }
  // A thick flanged metal duct warms visibly and vents into the bath.
  const pipe=(a:T.Vector3,b:T.Vector3)=>{const d=b.clone().sub(a),m=world.shaded(new T.CylinderGeometry(.18,.18,d.length(),10),0xffffff);m.material=this.heatMetal;m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());this.root.add(m);};
  pipe(new T.Vector3(7.25,.65,3.15),new T.Vector3(7.25,.65,-.8));pipe(new T.Vector3(7.25,.65,-.8),new T.Vector3(7.25,1.25,-.8));pipe(new T.Vector3(7.25,1.25,-.8),new T.Vector3(6.6,1.25,-1.3));
  for(const [x,y,z]of [[7.25,.65,-.8],[7.25,1.25,-.8],[7.25,.65,3.15]]){const elbow=world.shaded(new T.IcosahedronGeometry(.23,1),0xffffff);elbow.material=this.heatMetal;elbow.position.set(x,y,z);this.root.add(elbow);}
  for(const z of [2.8,1.5,.2,-.65]){const flange=world.shaded(new T.TorusGeometry(.23,.07,4,10),0xb5bbb0);flange.position.set(7.25,.65,z);this.root.add(flange);}
  box(this.root,4.3,.62,-5.55,5.8,.35,.72,0xbc9467,'wood');
  for(let n=0;n<3;n++){this.people.push(this.add('bather',2.15+n*2.15,-5.0));const hot=this.material('bather-down',4).clone();this.hotPeople.push(hot);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=12;const c=canvas.getContext('2d')!;c.fillStyle='#ffffff';c.fillRect(3,1,6,10);c.fillRect(1,3,10,6);
  const texture=new T.CanvasTexture(canvas);texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;this.root.userData.ownedTexture=texture;
  for(let n=0;n<16;n++){const material=new T.SpriteMaterial({map:texture,color:0xf3eee0,transparent:true,depthWrite:false,toneMapped:false});const puff=new T.Sprite(material);puff.userData.ownedMaterial=material;this.root.add(puff);this.steam.push(puff);}
  for(let n=0;n<30;n++){const m=world.shaded(new T.BoxGeometry(.09,.09,.09),n%2?0x72d1ca:0xd5e7d4);this.root.add(m);this.splash.push(m);}
  world.game.level.tiles.forEach((tile,i)=>{if(tile==='rock'&&i!==25&&i!==26){const rock=this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));rock.position.y+=world.game.level.elevations?.[i]??0;}});
  this.root.userData.ownedMaterial=this.heatMetal;
  this.update(0,[false,false],0);
 }
 update(progress:number,active:boolean[],time:number){
  const t=progress*BATH_DURATION,p=bathPose(t),motion=this.world.reduced?0:time;
  this.relay.forEach(m=>{const at=this.world.wetAt.get(m.userData.cell),u=at===undefined?0:ease((this.world.elapsed-at)/.17);m.visible=u>0;m.scale.y=Math.max(.01,u);});
  this.coalWater.visible=active[1];
  if(active[1]&&!this.heaterWasWet&&!this.world.reduced)this.world.onBathSound('sizzle');
  this.heaterWasWet=active[1];
  this.heatSparks.forEach((m,n)=>{const a=(motion*.65+n*.37)%1;m.visible=!active[1]||t>13;m.position.copy(m.userData.origin);m.position.x+=Math.sin(n*2+a)*.13;m.position.y+=a*.7;m.scale.setScalar(Math.sin(a*Math.PI));});
  this.heatMetal.color.set(active[1]?0xbd5a43:0x82999b);
  this.embers.forEach((m,n)=>{m.visible=!active[1];m.scale.y=1+Math.sin(motion*2+n)*.12;});
  this.inlet.forEach(m=>m.visible=m.userData.heaterFeed?active[1]:active[0]);
  this.valve.position.y=active[1]?1.05:.35;
  const full=(active[0]?(.28+.72*p.fill):0)*(1-p.empty);this.pool.visible=full>.01;this.pool.position.y=.32+full*.48;
  const vertices=this.pool.geometry.getAttribute('position');for(let i=0;i<vertices.count;i++){const r=Math.hypot(vertices.getX(i),vertices.getY(i));vertices.setZ(i,-Math.min(.4,Math.max(0,this.pool.position.y-.33))*p.vortex*(1-ease((r-.7)/2.1)));}vertices.needsUpdate=true;
  this.waterCap.visible=this.pool.visible&&p.vortex<.999;this.waterCap.position.set(4.3,this.pool.position.y+.002,-4.6);this.waterCap.scale.setScalar(1-p.vortex);
  this.glints.forEach((m,n)=>{m.visible=this.pool.visible;m.position.set(1.55+(n%6)*.98+Math.sin(motion*.3+n)*.07,this.pool.position.y+.014,-6.7+Math.floor(n/6)*1.15);m.scale.x=.6+Math.sin(motion*.7+n)*.25;});
  this.funnel.visible=p.vortex>0&&full>.02;this.funnel.position.y=this.pool.position.y-.6;
  this.swirl.visible=full>.05&&p.vortex>0;this.swirl.position.y=this.pool.position.y+.025;this.swirl.rotation.y=-t*.85;this.swirl.scale.setScalar(1-p.empty*.5);
  this.swirl.children.forEach((m,n)=>{const u=((n%16)/16+motion*(.025+p.vortex*.14))%1,r=.72+(1-u)*1.8,a=Math.floor(n/16)*Math.PI*2/3+(1-u)*4.8;m.position.set(Math.cos(a)*r,-u*p.vortex*.1,Math.sin(a)*r);m.rotation.y=Math.PI/2-a;m.scale.setScalar(Math.sin(u*Math.PI)*.8+.2);});
  this.steam.forEach((m,n)=>{const a=((motion*.22+n/16)%1),heater=n<6;m.visible=active[1];m.position.set((heater?5.2:6.6)+Math.sin(n*2.4)* (heater?1.2:.3)+a*.3,(heater?1:1.25)+a*2.1,(heater?3.15:-1.5)+Math.cos(n*2.4)*(heater?.9:.2));if(t>14&&heater){const roast=this.roasts[n%3];m.position.set(roast.position.x+Math.sin(n)*.15,roast.position.y+.3+a*1.8,roast.position.z);}
  m.scale.setScalar(.5+a*.6);m.material.opacity=Math.sin(a*Math.PI)*.32*(heater?.8:1);});
  this.people.forEach((s,n)=>{
   const b=batherPose(t,n),startX=2.15+n*2.15,homeX=2.6+n*1.7,homeZ=-3.4-(n%2)*1.4;
   s.visible=true;s.scale.set(2,2.5,1);s.material=this.material('bather',p.enter>0&&p.enter<1?Math.floor(motion*6)%2:0);s.material.rotation=0;
   const enter=p.enter;s.position.set(T.MathUtils.lerp(startX,homeX,enter),T.MathUtils.lerp(.9,.47,enter),T.MathUtils.lerp(-4.5,homeZ,enter));
   if(enter>=1)s.position.y=.47+Math.sin(motion*2+n)*.04;
   if(b.pull>0){const a=n*2.1+b.pull*4.2,r=(1-b.pull)*1.65;s.position.set(4.3+Math.cos(a)*r,.45-b.pull*.6,-4.6+Math.sin(a)*r);s.scale.multiplyScalar(1-ease((b.pull-.65)/.35));}
   if(b.pull>=1)s.visible=false;
   if(t>=11.3){
    s.visible=true;s.material=this.hotPeople[n];s.center.set(.5,.5);
    const reveal=ease(b.eject/.22);s.scale.set(3*reveal,2*reveal,1);
    // Start on the visible black aperture, then fan outward toward a shared landing beat.
    s.position.set(5.2,T.MathUtils.lerp(.48,1.1,b.eject)+Math.sin(b.eject*Math.PI)*1.7,T.MathUtils.lerp(.78,2.3+n*1.45,b.eject));
    const heat=ease((t-12.55)/1.0);s.material.color.setRGB(1,1-heat*.55,1-heat*.6);s.material.rotation=Math.sin(t*32+n)*.025*heat;
   }else s.center.set(.5,0);
   const cooked=ease((t-14.1)/.22);this.roasts[n].visible=cooked>0;
   if(cooked>0){s.visible=false;this.roasts[n].scale.setScalar(1+Math.sin(cooked*Math.PI)*.18);}
  });
  this.splash.forEach((m,n)=>{const person=Math.floor(n/10),age=t-12.55;m.visible=age>0&&age<.6;const a=n*2.4;m.position.set(5.2+Math.cos(a)*age,.9+age*1.8-age*age*3,2.3+person*1.45+Math.sin(a)*age);m.scale.setScalar(Math.max(0,1-age/.6));});
  if(t<this.previous)this.previous=0;
  for(const [at,cue]of [[.2,'fill'],[3,'steam'],[7,'drain'],[12.55,'splat'],[12.7,'sizzle'],[14.1,'steam']] as const)if(!this.world.reduced&&this.previous<at&&t>=at)this.world.onBathSound(cue);
  this.previous=t;
 }
 override dispose(){this.hotPeople.forEach(m=>m.dispose());super.dispose();this.art.dispose();(this.root.userData.roastMaterial as T.Material).dispose();}
}
