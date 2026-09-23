import * as T from 'three';
import {PixelSprites} from './pixel-sprites';
import {gridWorld,SIZE} from './game';
import {PIXEL_SIZES} from './oasis-pixels';
import {FARM_DURATION,farmPose,farmStoryTime} from './farm-timeline';
import type {World} from './world';

/** Two irrigated terraces and a harvest whose bounty proves disastrously excessive. */
export class HarvestScene extends PixelSprites{
  power=[0,0];
  private previous=0;
  private fields:T.Sprite[][]=[[],[]];
  private channels:T.Mesh[][]=[[],[]];
  private farmers:T.Sprite[]=[];
  private wolves:T.Sprite[]=[];
  private food:T.Sprite[]=[];
  private alarms:T.Sprite[]=[];
  private readonly farmerX=[-5.5,-.55,2.65];
  private crumbs:T.Mesh[]=[];
  constructor(world:World){
    super(world);
    const box=world.box.bind(world);
    // Farm plots occupy the reserved north terrace; every dig square remains unobstructed.
    for(let side=0;side<2;side++){
      const cx=side?4:-4,targetX=side?5:-3;
      box(this.root,cx,.05,-6.1,7.25,.14,3.35,0x96714b,'soil');
      for(let row=1;row<2;row++){
        const z=-7.25+row*1.65;
        box(this.root,cx,.14,z,7.25,.14,.52,0x715036,'soil');
        for(let k=0;k<6;k++){
          const plant=this.add(row?'produce':'wheat',cx-2.9+k*1.15,z+.13);plant.userData.crop=row?'produce':'wheat';plant.position.y=.18;this.fields[side].push(plant);
        }
      }
      // Aqueduct rails stay outside the water lane, with a broad intake at each target.
      for(const dx of [-.66,.66])box(this.root,targetX+dx,.31,-4.1,.18,.56,2.7,0xd6cfad,'stone');
      box(this.root,targetX,.02,-4.1,1.4,.14,2.7,0x89938a,'stone');
      const stream=box(this.root,targetX,.15,-4.1,1.18,.04,2.7,0x41b9b8,'water');this.channels[side].push(stream);
      for(const z of [-5.3,-7.8]){
        box(this.root,cx,.20,z,7.25,.35,.18,0xcac9a9,'stone');
        const water=box(this.root,cx,.15,z+.19,7.355,.04,.20,0x41b9b8,'water');this.channels[side].push(water);
      }
      for(const x of [cx-3.5,cx+3.5])box(this.root,x,.19,-6.5,.16,.34,2.5,0xcac9a9,'stone');
      // Large sluice posts and handwheel read as the two irrigation destinations.
      for(const dx of [-.76,.76])box(this.root,targetX+dx,.65,-3.35,.18,1.3,.22,0x805b40,'wood');
      box(this.root,targetX,1.3,-3.35,1.7,.18,.28,0xb49160,'wood');
      const crank=new T.Mesh(new T.TorusGeometry(.28,.065,4,12),world.mat(0x735340));crank.position.set(targetX,1.5,-3.35);crank.rotation.x=-.45;this.root.add(crank);
    }
    // Low fencing and farm goods frame the open puzzle without hiding tile centers.
    for(const z of [-7.8,7.65])for(let x=-7.5;x<=7.5;x+=1.5){
      box(this.root,x,.36,z,.13,.72,.14,0x886749,'wood');
      if(x<7.5)for(const y of [.24,.55])box(this.root,x+.75,y,z,1.5,.10,.12,0xb49668,'wood');
    }
    for(const [x,z]of [[-7,7.0],[6.7,7.0]]){this.add('sack',x,z);this.add('basket',x+.55,z+.2);}
    // Farmers stand along the field apron, close enough to eat crops directly.
    for(let n=0;n<3;n++){
      const x=this.farmerX[n],farmer=this.add('villager',x,-4.35);this.farmers.push(farmer);
      const alarm=this.add('alarm',x,-4.35);alarm.position.y=4.6;this.alarms.push(alarm);
      const bite=this.add('pumpkin-bite',x,-4.35);this.food.push(bite);
      this.wolves.push(this.add('wolf',-7+n*.8,-3.9));
    }
    // Small, pooled flecks accent each bite; nothing persists as a stain.
    for(let n=0;n<18;n++){
      const material=new T.MeshBasicMaterial({color:0xcf8450,transparent:true,depthWrite:false});
      const crumb=new T.Mesh(new T.BoxGeometry(.0625,.0625,.0625),material);crumb.userData.ownedMaterial=material;this.root.add(crumb);this.crumbs.push(crumb);
    }
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock')this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));});
    this.update(0,[false,false],0,0);
  }
  update(dt:number,active:boolean[],progress:number,time:number){
    const seconds=progress*FARM_DURATION,t=farmStoryTime(seconds),p=farmPose(seconds),motion=this.world.reduced?0:time;
    if(t<this.previous)this.previous=0;
    if(!this.world.reduced)for(const [at,cue]of [[2.5,'harvest-chime'],[4,'feast-pop'],[6,'feast-pop'],[8,'feast-pop'],[11,'farm-fall'],[12,'wolf-call']] as const){if(this.previous<at&&t>=at)this.world.onFarmSound(cue);}
    if(!this.world.reduced){
      for(let at=3.3;at<9;at+=.65)if(this.previous<at&&t>=at)this.world.onFarmSound('farmer-chew');
      for(let at=14.1;at<17.9;at+=.45)if(this.previous<at&&t>=at)this.world.onFarmSound('wolf-chomp');
    }
    this.previous=t;
    this.power=this.power.map((v,n)=>!active[n]?0:Math.min(1,v+dt/2));
    this.fields.forEach((field,n)=>field.forEach((s,k)=>{
      const grow=Math.max(this.power[n],progress>0?p.grow:0);
      s.visible=!(t>3+k*.95);
      s.material=this.material(s.userData.crop,grow>.8?2+Math.floor(motion*.9+k*.2)%2:grow>.12?1:0);
    }));
    this.channels.forEach((a,n)=>a.forEach(m=>m.visible=active[n]||progress>0));
    this.food.forEach((s,n)=>{
      const bite=(Math.sin(motion*7+n)+1)*.5;
      s.visible=t>3+n*.15&&t<9;
      s.material=this.material('pumpkin-bite',Math.floor(motion*5+n)%2);
      s.position.set(this.farmerX[n]+.35,1.25+bite*.35,-4.65+bite*.2);
    });
    this.farmers.forEach((s,n)=>{
      const x=this.farmerX[n],eating=t>3&&t<9;
      s.position.set(x,.04,-4.35-(eating?Math.sin(motion*7+n)*.035:0));
      const down=t>=10,full=t>=3.7;
      const kind=down?'farmer-down':full?'farmer-full':'villager';
      const weight=Math.min(3,Math.max(0,Math.floor((t-3.7)/1.65)));
      const frame=down?Math.min(5,Math.floor((t-10)/.27)):full?weight*2+(eating?Math.floor(motion*5+n)%2:0):0;
      s.material=this.material(kind,frame);
      const [width,height]=PIXEL_SIZES[kind];s.scale.set(width/16,height/16,1);
      s.visible=t<17.1+n*.15;
      this.alarms[n].visible=t>9.2&&t<10.4;
    });
    this.wolves.forEach((s,n)=>{
      const arrival=T.MathUtils.smoothstep(t,12+n*.2,14+n*.2),target=this.farmerX[n];
      const eating=t>14+n*.2&&t<17.5+n*.2,fat=t>=17.5+n*.2;

      const exit=T.MathUtils.smoothstep(t,18.5,22.5),clearLane=T.MathUtils.smoothstep(t,17.9,18.7);
      s.visible=t>=12+n*.2&&t<22.5;
      s.position.set(T.MathUtils.lerp(-8.8,target-.4,arrival)+exit*16,.06+(fat?Math.abs(Math.sin(motion*5+n))*.04:0),-3.9-clearLane*2.0+(fat?Math.sin(motion*5+n)*.10:0));
      const walkFrame=this.world.reduced||t>=22?0:Math.floor(motion*(fat?4:7)+n)%4;
      s.material=this.material('wolf',fat?8+walkFrame:eating?4+walkFrame:walkFrame,false);
      if(eating)s.position.z+=Math.sin(motion*9+n)*.07;
    });
    this.crumbs.forEach((crumb,n)=>{
      const actor=Math.floor(n/6),age=this.world.reduced?.5:(motion*2.8+(n%6)/6)%1;
      const feeding=t>14+actor*.2&&t<17.5+actor*.2,eating=t>3&&t<9;
      crumb.visible=feeding||eating;
      const material=crumb.material as T.MeshBasicMaterial;
      material.color.setHex(feeding?0xc83e39:0xe4ad5c);material.opacity=(1-age)*(feeding?.95:.65);crumb.scale.setScalar(feeding?2.5:1);
      crumb.position.set(this.farmerX[actor]+.4+Math.sin(n*2.399)*age*.65,(feeding?.65:1.25)+Math.sin(age*Math.PI)*(feeding?.42:.16)-age*.2,-4.15+Math.cos(n*2.399)*age*.2);
    });
  }
}
