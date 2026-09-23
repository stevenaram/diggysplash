import * as T from 'three';
import {PixelSprites} from './pixel-sprites';
import {gridWorld,SIZE} from './game';
import {FARM_DURATION,farmPose} from './farm-timeline';
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
  constructor(world:World){
    super(world);
    const box=world.box.bind(world);
    // Farm plots occupy the reserved north terrace; every dig square remains unobstructed.
    for(let side=0;side<2;side++){
      const cx=side?4:-4,targetX=side?5:-3;
      box(this.root,cx,.05,-6.1,7.25,.14,3.35,0x96714b,'soil');
      for(let row=0;row<2;row++){
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
    // Long communal table occupies the bottom reserved strip.
    box(this.root,0,.48,7.35,8.3,.15,.85,0xab7850,'wood');
    for(const x of [-3.6,0,3.6])box(this.root,x,.22,7.35,.2,.45,.6,0x78533c,'wood');
    for(let n=0;n<3;n++){
      const x=-3+n*3,farmer=this.add('villager',x,6.5);this.farmers.push(farmer);
      const alarm=this.add('alarm',x,6.5);alarm.position.y=4.6;this.alarms.push(alarm);
      for(let k=0;k<2;k++){const loaf=this.add('bread',x-.35+k*.7,7.25);loaf.position.y=.57;this.food.push(loaf);}
      this.wolves.push(this.add('wolf',-7+n*.8,7));
    }
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock')this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));});
    this.update(0,[false,false],0,0);
  }
  update(dt:number,active:boolean[],progress:number,time:number){
    const t=progress*FARM_DURATION,p=farmPose(t),motion=this.world.reduced?0:time;
    if(t<this.previous)this.previous=0;
    if(!this.world.reduced)for(const [at,cue]of [[2.5,'harvest-chime'],[4,'feast-pop'],[5,'feast-pop'],[8.7,'farm-fall'],[10,'wolf-call']] as const){if(this.previous<at&&t>=at)this.world.onFarmSound(cue);}
    this.previous=t;
    this.power=this.power.map((v,n)=>!active[n]?0:Math.min(1,v+dt/2));
    this.fields.forEach((field,n)=>field.forEach((s,k)=>{
      const grow=progress>0?p.grow:this.power[n];
      s.material=this.material(s.userData.crop,grow>.8?2+Math.floor(motion*.9+k*.2)%2:grow>.12?1:0);
    }));
    this.channels.forEach((a,n)=>a.forEach(m=>m.visible=active[n]||progress>0));
    this.food.forEach((s,n)=>{s.visible=p.grow>.9&&p.feast<.98;const bite=(Math.sin(motion*5+n)+1)*.5;
      s.position.y=t>3?.6+bite*1.05:.57;s.position.z=t>3?7.25-bite*.65:7.25;});
    this.farmers.forEach((s,n)=>{
      const x=-3+n*3;
      s.position.set(x,.04,6.5+p.feast*.2);
      const down=p.fall>=1,full=p.full>.1;
      const kind=down?'farmer-down':full?'farmer-full':'villager';
      s.material=this.material(kind,p.feast>0&&p.fall===0?Math.floor(motion*5)%2:0);
      s.scale.set((down?48:full?44:32)/16,(down?26:40)/16,1);
      // Collapse into a bespoke horizontal sprite with crossed eyes, never a sleeping pose.
      s.material.rotation=down?0:-p.fall*.85;
      s.visible=p.eat<1;s.position.y=down?.04:.04+Math.sin(motion*8+n)*.025*p.feast*(1-p.full);
      this.alarms[n].visible=t>7.4&&t<8.6;
    });
    this.wolves.forEach((s,n)=>{
      const arrival=T.MathUtils.smoothstep(t,10+n*.3,12.5+n*.3),exit=p.leave;
      const target=-3+n*3;
      s.visible=t>=10+n*.3;
      s.position.set(T.MathUtils.lerp(-8.8,target,arrival)+exit*10,.06,6.75+Math.sin(motion*7+n)*.035*(1-p.eat));
      const eating=t>13&&t<15.5;
      s.material=this.material('wolf',eating?2+Math.floor(motion*7+n)%2:Math.floor(motion*7+n)%2);
      // Brief head-down bites; the remains disappear without blood or exposed anatomy.
      if(eating)s.position.z+=Math.sin(motion*9+n)*.055;
      if(exit>.9)s.visible=false;
    });
  }
}
