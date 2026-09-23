import * as T from 'three';
import {PixelSprites} from './pixel-sprites';
import {PIXEL_SIZES,type PixelKind} from './oasis-pixels';
import {gridWorld,SIZE} from './game';
import {coveredWagon} from './caravan-wagon';
import {CARAVAN_DURATION,caravanPose,caravanRoad,caravanEase as ease} from './caravan-timeline';
import type {World} from './world';
export class CaravanScene extends PixelSprites{
 private wagons:ReturnType<typeof coveredWagon>[]=[];
 private horses:T.Sprite[]=[];private people:T.Sprite[]=[];private raiders:T.Sprite[]=[];private darkHorses:T.Sprite[]=[];
 private bones:T.Sprite[]=[];private torch!:T.Sprite;private smiles:T.Sprite[]=[];private fires:T.Sprite[]=[];
 private ropes:T.Line[]=[];private previous=0;
 private readonly starts=[-5,1,5];
 constructor(world:World){
  super(world);const box=world.box.bind(world);
  // Parallel wagon road leaves room for the shared U-turn and the drinking stations.
  for(const z of [-6,-3.2]){box(this.root,0,.017,z,15,.035,1.5,0xcdb184,'sand');for(const dz of [-.5,.5])box(this.root,0,.04,z+dz,14.8,.025,.05,0xb29974);}
  for(let n=0;n<3;n++){
   this.wagons.push(coveredWagon(world,this.root,n));
   const x=this.starts[n],i=world.game.level.targets[n];
   const water=world.waters.get(i)!;water.geometry.scale(.86,1,.55);water.userData.origin.y=-.04;
   box(this.root,x,-.17,-1,1.8,.16,1.15,0x8b938a,'stone');
   for(const dx of [-.9,.9])box(this.root,x+dx,.13,-1,.16,.6,1.3,0xd5d1b4,'stone');
   box(this.root,x,.13,-1.65,1.95,.6,.15,0xd5d1b4,'stone');
   for(const dx of [-.68,.68])box(this.root,x+dx,.13,-.35,.5,.6,.15,0xd5d1b4,'stone');
   this.horses.push(this.add('horse',x-1.25,-1.8));this.people.push(this.add('shepherd',x+.6,-3.2));
   this.bones.push(this.add('bones',3.1+n*.7,6.8+n*.08));
   this.darkHorses.push(this.add('black-horse',8,-3));this.raiders.push(this.add('highwayman',8,-3));
   this.smiles.push(this.add('smirk',8,-3));
   this.fires.push(this.add('campfire',3.1+n*.7,6.85+n*.08));
  }
  this.torch=this.add('torch',0,0);
  for(let n=0;n<8;n++){
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
   const material=new T.LineBasicMaterial({color:n<2?0x765b42:0xb39161});const line=new T.Line(geometry,material);line.userData.ownedMaterial=material;line.frustumCulled=false;this.root.add(line);this.ropes.push(line);
  }
  world.game.level.tiles.forEach((t,i)=>{if(t==='rock')this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));});
  this.update(0,[false,false,false],0);
 }
 private pose(sprite:T.Sprite,kind:PixelKind,frame=0,flip=false){sprite.material=this.material(kind,frame,flip);sprite.material.rotation=0;const [w,h]=PIXEL_SIZES[kind];sprite.scale.set(w/16,h/16,1);}
 private rope(n:number,a:T.Vector3,b:T.Vector3,visible:boolean){const line=this.ropes[n];line.visible=visible;const p=line.geometry.getAttribute('position');p.setXYZ(0,a.x,a.y,a.z);p.setXYZ(1,b.x,b.y,b.z);p.needsUpdate=true;}
 update(progress:number,active:boolean[],time:number){
  const t=progress*CARAVAN_DURATION,p=caravanPose(t),motion=this.world.reduced?0:time;
  if(t<this.previous)this.previous=0;
  if(!this.world.reduced){for(const [at,cue]of [[.4,'drink'],[7,'hitch'],[12,'ambush'],[17,'throw'],[17.8,'fire']] as const)if(this.previous<at&&t>=at)this.world.onCaravanSound(cue);
   for(let at=19;at<29;at+=.65)if(this.previous<at&&t>=at)this.world.onCaravanSound('hooves');
  }
  this.previous=t;
  const distance=p.roll*.55+p.escape*30;
  this.wagons.forEach((wagon,n)=>{
   const road=caravanRoad(1+n*3.1+distance);wagon.root.position.set(road.x,0,road.z);wagon.root.rotation.y=road.angle;wagon.root.visible=Math.abs(road.x)<10;
   wagon.wheels.forEach(w=>w.rotation.z=-distance/.43);
  });
  for(let n=0;n<2;n++){
   const a=this.wagons[n].root.localToWorld(new T.Vector3(1.5,.8,0)),b=this.wagons[n+1].root.localToWorld(new T.Vector3(-1.5,.8,0));
   this.root.worldToLocal(a);this.root.worldToLocal(b);this.rope(n,a,b,this.wagons[n].root.visible&&this.wagons[n+1].root.visible);
  }
  this.horses.forEach((horse,n)=>{
   const road=caravanRoad(9.8+distance),offset=(n-1)*.95;
   const teamX=road.x+Math.sin(road.angle)*offset,teamZ=road.z+Math.cos(road.angle)*offset;
   horse.position.set(T.MathUtils.lerp(this.starts[n]-1.25,teamX,p.hitch),.04,T.MathUtils.lerp(active[n]?-.8:-1.8,teamZ,p.hitch));
   const walking=(p.hitch>0&&p.hitch<1)||p.roll>0&&p.roll<1||p.escape>0;
   this.pose(horse,'horse',walking?1+Math.floor(motion*10+n*2)%8:active[n]&&p.hitch===0?9+Math.floor(motion*5+n)%8:Math.floor(motion*.4+n)%5===0?18:0,road.angle<-Math.PI/2);
   horse.visible=Math.abs(horse.position.x)<9.5;
   const person=this.people[n],escort=new T.Vector3(-5+n*5,.04,-3.2);
   if(p.defeat===0){person.position.set(T.MathUtils.lerp(this.starts[n]+.6,escort.x,p.hitch),.04,T.MathUtils.lerp(-3.2,escort.z,p.hitch));this.pose(person,'shepherd',t>11?9:walking?1+Math.floor(motion*6+n)%2:0);}
   else {person.position.set(T.MathUtils.lerp(-5+n*5,3.8+(n-1)*.48,p.pile),.04+n*p.pile*.1,T.MathUtils.lerp(-3.2+1.7*p.defeat,6.6+n*.14,p.pile));this.pose(person,'shepherd-down');}
   person.visible=t<20.2;
   // The body keeps the same artwork and native pixel size all the way to the pile.
   if(p.defeat>0&&p.defeat<1){this.pose(person,'shepherd',9);person.material.rotation=-p.defeat*Math.PI/2;}else person.material.rotation=0;
   this.bones[n].visible=t>=20.2;
   this.fires[n].visible=p.fire>0;this.fires[n].material=this.material('campfire',Math.floor(motion*8+n)%3);this.fires[n].position.y=.05+Math.sin(motion*5+n)*.03;this.fires[n].scale.set(1.5*(t>23?.55:1),2*(t>23?.55:1),1);
   // Mounted highwaymen approach, seize the reins, and lead the convoy around the bend.
   const lead=caravanRoad(12+distance),dark=this.darkHorses[n],raider=this.raiders[n];
   const raidX=-5+n*5,raidZ=2.2;
   dark.position.set(p.escape>0?T.MathUtils.lerp(raidX,lead.x,ease((t-19)/1.2)):T.MathUtils.lerp(10+n,raidX,p.ambush),.04,p.escape>0?T.MathUtils.lerp(raidZ,lead.z+(n-1)*.8,ease((t-19)/1.2)):raidZ);
   const raidWalk=p.ambush>0&&p.ambush<1||p.escape>0;
   this.pose(dark,'black-horse',raidWalk?1+Math.floor(motion*10+n*2)%8:Math.floor(motion*.4+n)%5===0?18:0,p.escape===0||lead.angle<-Math.PI/2);
   dark.visible=p.ambush>0&&Math.abs(dark.position.x)<9.5;
   this.pose(raider,'highwayman',n===2&&t>=16.9&&t<17.4?3:t>11.8&&t<13?1+Math.floor(motion*8)%2:t>=16&&t<18.5?8+Math.floor(motion*7+n)%4:t>=13.5&&t<16?4+Math.floor(motion*7+n)%4:0);
   raider.position.copy(dark.position);raider.position.x-=.2;raider.position.y=1.25;raider.visible=dark.visible;
   if(t>=11.6&&t<19){
    const approach=ease((t-11.6)/.5),retreat=ease((t-16)/2.5);
    const action=new T.Vector3(T.MathUtils.lerp(-4.25+n*5,2.6+(n-1)*1.6,p.pile),.04,T.MathUtils.lerp(-2.85,5.5,p.pile));
    raider.position.lerp(action,approach*(1-retreat));
   }
   const smile=this.smiles[n];smile.position.copy(raider.position);smile.position.y=raider.position.y+4.0;smile.visible=t>15.5&&t<16.8;
   const front=this.wagons[2].root.localToWorld(new T.Vector3(1.5,.85,0));this.root.worldToLocal(front);
   this.rope(2+n,front,new T.Vector3(horse.position.x-.9,.8,horse.position.z),p.hitch>.95&&horse.visible&&this.wagons[2].root.visible);
   this.rope(5+n,new T.Vector3(dark.position.x,.9,dark.position.z),new T.Vector3(horse.position.x+.8,.9,horse.position.z),p.escape>0&&dark.visible&&horse.visible);
  });
  const flight=Math.max(0,Math.min(1,(t-17)/.8));
  // Throw from the departing right-hand raider, landing in the unobstructed foreground pile.
  const throwStart=new T.Vector3(4.41,1.9,4.34),throwEnd=new T.Vector3(3.8,.25,6.8);
  this.torch.visible=t>=17&&t<17.8;
  this.torch.position.copy(throwStart).lerp(throwEnd,flight);this.torch.position.y+=Math.sin(flight*Math.PI)*2;
  this.torch.material.rotation=-flight*Math.PI*2;

 }
}
