import {bakeColored} from './battle-mesh';
import * as T from 'three';
import {gridWorld,SIZE} from './game';
import {PixelSprites} from './pixel-sprites';
import type {World} from './world';
import {bridgeBeats} from './bridge-timeline';
import {buildPalm} from './palm-model';
import {MonsterArt} from './monster-art';
import {metricUV} from './metric-uv';
import {BridgeRiver} from './bridge-river';
import {ramp} from './oasis-timeline';

/** A deterministic physical chain reaction, with full-size camera-facing actors. */
export class BridgeSprites extends PixelSprites {
  cast:{sprite:T.Sprite;kind:'shepherd'|'sheep'}[]=[];
  deck=new T.Group();
  river:BridgeRiver;
  palmArt=new MonsterArt();
  fronds:T.Mesh[]=[];
  buckets:T.Object3D[]=[];
  pieces:{mesh:T.Object3D;start:T.Vector3;n:number}[]=[];
  rubble:{mesh:T.Mesh;start:T.Vector3;n:number}[]=[];
  wheel:T.Group;
  wheelStart=new T.Vector3();
  alarm:T.Sprite;
  private previous=0;
  constructor(world:World){
    super(world);
    const palm=new T.Group();palm.position.set(6.7,0,-5.2);this.root.add(palm);
    this.fronds=buildPalm(palm,this.palmArt).fronds;
    palm.traverse(o=>{if(o instanceof T.Mesh){const old=o.geometry;o.geometry=metricUV(old);if(old!==o.geometry)old.dispose();}});
    this.river=new BridgeRiver(world,this.root);
    for(const [i,t] of world.game.level.tiles.entries())if(t==='rock')this.add('rock',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));
    for(const kind of ['shepherd','sheep','sheep'] as const)this.cast.push({sprite:this.add(kind,0,0),kind});
    this.alarm=this.add('alarm',7,5);
    this.wheel=world.root.getObjectByName('bridge-wheel-mount') as T.Group;
    this.wheelStart.copy(this.wheel.position);
    this.wheel.traverse(o=>{if(o.name==='bucket-water')this.buckets.push(o);});
    this.deck.position.set(.65,.15,5.05);this.root.add(this.deck);
    // Individual boards can break independently; rails stay outside the cast's silhouette.
    for(let n=0;n<17;n++){
      const board=world.box(this.deck,.14+n*.275,0,0,.25,.16,2.8,n%3?0xb88b59:0x9e7046,'wood');
      this.pieces.push({mesh:board,start:board.position.clone(),n});
    }
    for(const z of [-1.38,1.38]){
      for(let n=0;n<5;n++){
        const post=world.box(this.deck,.12+n*1.1,.35,z,.1,.8,.1,0x8c6446,'wood');
        this.pieces.push({mesh:post,start:post.position.clone(),n:n*3});
      }
      for(let n=0;n<4;n++){
        const rail=world.box(this.deck,.67+n*1.1,.65,z,1.11,.09,.09,0xc0a477,'wood');
        this.pieces.push({mesh:rail,start:rail.position.clone(),n:n*4});
      }
    }
    for(const x of [.55,5.45])for(const z of [3.5,6.6])world.box(this.root,x,.4,z,.28,.9,.28,0x967858,'stone');
    // Both banks remain level throughout. Half-tile margins keep the cast clear of rails.
    for(const x of [1.02,4.98])for(let n=0;n<8;n++){
      const shard=world.shaded(new T.DodecahedronGeometry(.27,0),n%2?0x897656:0xa38b64,'stone');
      shard.position.set(x,-.45-(n%3)*.35,-7+n*2);shard.scale.set(.45,1,1.3);this.root.add(shard);
    }
    for(let n=0;n<26;n++){
      const chunk=world.shaded(new T.DodecahedronGeometry(.1+(n%3)*.055,0),n%2?0xb68c5f:0x846046,'stone');
      const start=new T.Vector3(n%2?4.95:1.05,.05,3.9+(n%7)*.36);
      this.root.add(chunk);this.rubble.push({mesh:chunk,start,n});
    }
    for(const {mesh} of this.pieces)if(mesh instanceof T.Mesh){
      const old=mesh.geometry;mesh.geometry=bakeColored(mesh,[mesh]);old.dispose();mesh.material=world.mat(0xffffff,'wood',true);
    }
    this.update(0,0);
  }
  update(progress:number,time:number){
    const b=bridgeBeats(progress),t=b.time,reduced=this.world.reduced;
    if(!reduced){
      for(const [at,cue] of [[4.3,'launch'],[5.05,'impact'],[6.4,'impact'],[8.1,'wind']] as const)
        if(this.previous<at&&t>=at)this.world.onBattleSound(cue);
      if(this.previous<7.35&&t>=7.35)this.world.onCreatureSound('gasp');
    }
    this.previous=t;
    this.deck.rotation.z=(1-b.lower)*1.02;
    for(const p of this.pieces){
      const f=ramp(t,5.45+Math.abs(p.start.x-2.1)*.06,1.55);
      p.mesh.position.copy(p.start);
      p.mesh.position.y-=f*f*(9+(p.n%3));
      p.mesh.position.x+=Math.sin(p.n*2.4)*f*.6;
      p.mesh.rotation.set(f*(p.n%2?1.2:-.8),f*(p.n%3-1)*.6,f*(p.n%2?-.7:.8));
      p.mesh.visible=f<1;
    }
    this.wheel.position.copy(this.wheelStart);
    this.wheel.position.x+=Math.sin(time*33)*b.wobble*.08*(1-b.runaway);
    this.wheel.position.lerp(new T.Vector3(2.6,1.8,3.9),b.runaway);
    this.wheel.position.y-=b.collapse*b.collapse*10;
    this.wheel.rotation.set(-Math.PI/6,b.runaway*.15,Math.sin(time*24)*b.wobble*.08);
    this.wheel.visible=b.collapse<1;
    const rotor=this.wheel.getObjectByName('bridge-wheel-rotor');
    if(rotor)rotor.rotation.z=-b.runaway*9-t*(b.lower>.9?2:0);
    this.fronds.forEach((f,n)=>f.rotation.set(0,f.userData.azimuth,f.userData.baseTilt+(reduced?0:Math.sin(time*1.1+n*.8)*.04)));
    this.buckets.forEach((water,n)=>{
      water.visible=progress>0&&b.collapse<1;
      water.position.y=.02+Math.sin(time*(b.runaway>0?18:5)+n)*(.025+b.runaway*.06);
      water.rotation.z=Math.sin(time*15+n)*b.runaway*.3;
    });
    this.river.update(time,t,this.wheel,b.runaway,reduced);
    this.rubble.forEach(p=>{
      const f=ramp(t,5.17+(p.n%7)*.07,1.9);
      p.mesh.visible=f>0&&f<1;
      p.mesh.position.copy(p.start);p.mesh.position.x+=(p.n%2?-1:1)*f*(.4+(p.n%3)*.35);
      p.mesh.position.y+=Math.sin(f*Math.PI)*.65-f*f*11;
      p.mesh.rotation.set(f*5+p.n,f*3,0);
    });
    for(const [n,a] of this.cast.entries()){
      let frame=0;
      a.sprite.visible=true;a.sprite.scale.set(2,2.5,1);
      if(n<2){
        const walk=ramp(t,1.65+n*.3,2.75);
        a.sprite.position.set(T.MathUtils.lerp(n?-6.5:-4.8,n?2:3.4,walk),.2,T.MathUtils.lerp(n?6.7:6.2,5.3+n*.3,walk));
        if(walk>0&&walk<1)frame=n?1+Math.floor(time*8)%2:16+Math.floor(time*8)%4;
        if(t>5.05){
          frame=n?6+Math.floor(time*12)%3:12+Math.floor(time*12)%2;
          const fall=ramp(t,5.22+n*.1,1.45);
          a.sprite.position.y+=Math.sin(fall*Math.PI)*.45-fall*fall*11;
          a.sprite.position.x+=Math.sin(fall*Math.PI)*.3;
          a.sprite.visible=fall<1;
        }
      }else{
        a.sprite.position.set(7,.2,2.4);
        if(b.jump>0){
          a.sprite.position.x=T.MathUtils.lerp(7,3.6,b.jump);
          a.sprite.position.y=.2+Math.sin(b.jump*Math.PI)*2-b.jump*b.jump*11;
          a.sprite.position.z=T.MathUtils.lerp(2.4,3.7,b.jump);
          frame=6+Math.floor(time*12)%3;
          a.sprite.visible=b.jump<1;
        }
      }
      a.sprite.material=this.material(a.kind,reduced?0:frame,n===2||(n===0&&frame>=14));
      a.sprite.userData.frame=frame;
    }
    this.alarm.visible=b.alarm&&!reduced;
    this.alarm.position.set(7,1.55,.06);
  }
  override dispose(){super.dispose();this.palmArt.dispose();this.river.dispose();}
}
