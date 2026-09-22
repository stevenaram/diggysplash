import {bakeColored} from './battle-mesh';
import * as T from 'three';
import {gridWorld,SIZE} from './game';
import {PixelSprites} from './pixel-sprites';
import type {World} from './world';
import {bridgeBeats,wheelAngle,ravineFall} from './bridge-timeline';
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
    for(const [i,t] of world.game.level.tiles.entries())if(t==='rock'){
      const margin=[26,27].includes(i)?-.45:[42,43].includes(i)?.5:0;
      this.add('rock',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE))+margin);
    }
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
      for(const [at,cue] of [[4.3,'launch'],[5.15,'wood'],[8.1,'wind']] as const)
        if(this.previous<at&&t>=at)this.world.onBattleSound(cue);
      if(this.previous<7.35&&t>=7.35)this.world.onCreatureSound('gasp');
    }
    this.previous=t;
    this.deck.rotation.z=(1-b.lower)*1.02;
    const landingAge=Math.max(0,t-1.5);
    this.deck.position.y=.15+(!reduced&&landingAge<.6?Math.sin(landingAge*18)*Math.exp(-landingAge*9)*.035:0);
    for(const p of this.pieces){
      const falling=ravineFall(t,5.45+Math.abs(p.start.x-2.1)*.06);
      const f=falling.progress;
      p.mesh.position.copy(p.start);
      p.mesh.position.y-=falling.depth;
      p.mesh.position.x=T.MathUtils.lerp(p.start.x,2.3,f);
      p.mesh.scale.setScalar(falling.scale);
      p.mesh.position.x+=Math.sin(p.n*2.4)*f*.6;
      p.mesh.rotation.set(f*(p.n%2?1.2:-.8),f*(p.n%3-1)*.6,f*(p.n%2?-.7:.8));
      p.mesh.visible=f<1;
    }
    this.wheel.position.copy(this.wheelStart);
    this.wheel.position.x+=Math.sin(t*4)*b.wobble*.018*(1-b.runaway);
    this.wheel.position.lerp(new T.Vector3(2.6,1.8,3.9),b.runaway);
    const wheelFall=ravineFall(t,5.15,2.7);
    this.wheel.position.y-=wheelFall.depth+wheelFall.progress*1.8;
    this.wheel.scale.setScalar(wheelFall.scale);
    // Never oscillate around the axle: that nearly cancelled the spin once per wobble.
    this.wheel.rotation.set(-Math.PI/6+Math.sin(t*4)*b.wobble*.012,b.runaway*.15,0);
    this.wheel.visible=wheelFall.progress<1;
    const rotor=this.wheel.getObjectByName('bridge-wheel-rotor');
    if(rotor)rotor.rotation.z=wheelAngle(t);
    this.fronds.forEach((f,n)=>f.rotation.set(0,f.userData.azimuth,f.userData.baseTilt+(reduced?0:Math.sin(time*1.1+n*.8)*.04)));
    this.buckets.forEach((water,n)=>{
      water.visible=progress>0&&b.collapse<1;
      water.position.y=-.015+Math.sin(time*5+n)*.008;
      water.rotation.z=0;
    });
    this.river.update(time,t,this.wheel,b.runaway,reduced);
    this.rubble.forEach(p=>{
      const fall=ravineFall(t,5.17+(p.n%7)*.07,2.8),f=fall.progress;
      p.mesh.visible=f>0&&f<1;
      p.mesh.position.copy(p.start);p.mesh.position.x=T.MathUtils.lerp(p.start.x,3,f);
      p.mesh.scale.setScalar(fall.scale);
      p.mesh.position.y+=Math.sin(f*Math.PI)*.35-fall.depth;
      p.mesh.rotation.set(f*5+p.n,f*3,0);
    });
    for(const [n,a] of this.cast.entries()){
      let frame=0;
      a.sprite.visible=true;a.sprite.scale.set(2,2.5,1);
      if(n<2){
        const approach=ramp(t,.18+n*.12,1.05),walk=ramp(t,1.65+n*.3,2.75);
        const waitingX=n?-2.4:-.75,waitingZ=5.3+n*.3;
        a.sprite.position.set(
          walk>0?T.MathUtils.lerp(waitingX,n?2:3.4,walk):T.MathUtils.lerp(n?-6.5:-4.8,waitingX,approach),
          .2,T.MathUtils.lerp(n?6.7:6.2,waitingZ,approach));
        if((approach>0&&approach<1)||(walk>0&&walk<1))frame=1+Math.floor(time*8)%2;
        if(t>5.05){
          frame=n?6+Math.floor(time*12)%3:12+Math.floor(time*12)%2;
          const fall=ravineFall(t,5.22+n*.1,2.7);
          a.sprite.position.y-=fall.depth;
          a.sprite.position.x=T.MathUtils.lerp(a.sprite.position.x,3,fall.progress);
          a.sprite.scale.set(2*fall.scale,2.5*fall.scale,1);
          a.sprite.visible=fall.progress<1;
        }
      }else{
        a.sprite.position.set(7,.2,2.4);
        if(b.jump>0){
          const leap=ramp(t,8.05,.8),fall=ravineFall(t,8.85,2.6);
          a.sprite.position.x=T.MathUtils.lerp(7,3,leap);
          a.sprite.position.y=.2+Math.sin(leap*Math.PI)*1.8-fall.depth;
          a.sprite.position.z=T.MathUtils.lerp(2.4,3.7,leap);
          a.sprite.scale.set(2*fall.scale,2.5*fall.scale,1);
          frame=6+Math.floor(time*12)%3;
          a.sprite.visible=fall.progress<1;
        }
      }
      a.sprite.material=this.material(a.kind,reduced?0:frame,n===2);
      a.sprite.userData.frame=frame;
    }
    this.alarm.visible=b.alarm&&!reduced;
    this.alarm.position.set(7,1.55,.06);
  }
  override dispose(){super.dispose();this.palmArt.dispose();this.river.dispose();}
}
