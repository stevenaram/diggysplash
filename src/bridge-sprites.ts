import * as T from 'three';
import { gridWorld, SIZE } from './game';
import { PixelSprites } from './pixel-sprites';
import type { World } from './world';

/** Camera-facing cast; the deck remains a physical 3D object. */
export class BridgeSprites extends PixelSprites {
  cast: {sprite:T.Sprite; kind:'shepherd'|'sheep'; from:T.Vector3; to:T.Vector3; delay:number; flip:boolean}[]=[];
  palms:T.Sprite[]=[];
  hearts:T.Sprite[]=[];
  constructor(world:World) {
    super(world);
    this.palms.push(this.add('palm',-5,-5.2),this.add('palm',6.25,-4.5));
    world.game.level.tiles.forEach((tile,i)=>{
      if(tile==='rock')this.add('rock',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));
    });
    this.add('basket',-1.9,6.4);
    this.add('blanket',.4,7);
    for(const [kind,x,z,tx,tz,delay,flip] of [
      ['shepherd',-1,5.4,5,4.4,0,false],
      ['sheep',.8,6.1,5.5,6.4,.2,false],
      ['sheep',6.8,2.6,6.8,2.6,0,true],
    ] as const) {
      const sprite=this.add(kind,x,z);
      sprite.position.y=.18;
      this.cast.push({sprite,kind,from:sprite.position.clone(),to:new T.Vector3(tx,.18,tz),delay,flip});
    }
    for(const [x,z] of [[6.8,2.6],[5.5,6.4]]) {
      const heart=this.add('heart',x,z);heart.position.y=1.65;this.hearts.push(heart);
    }
    this.update(0,0);
  }
  update(progress:number,time:number) {
    for(const actor of this.cast) {
      const t=T.MathUtils.clamp((progress-.38-actor.delay)/(.54-actor.delay),0,1);
      // Route stays on the deck until the eastern bank, then spreads out to reunite.
      const entry=new T.Vector3(1.6,.18,3.45+actor.delay*.5);
      const exit=new T.Vector3(4.8,.18,entry.z);
      if(t<.25)actor.sprite.position.lerpVectors(actor.from,entry,t/.25);
      else if(t<.8)actor.sprite.position.lerpVectors(entry,exit,(t-.25)/.55);
      else actor.sprite.position.lerpVectors(exit,actor.to,(t-.8)/.2);
      if(actor.from.equals(actor.to))actor.sprite.position.copy(actor.from);
      const moving=t>0&&t<1&&!actor.from.equals(actor.to);
      const frame=this.world.reduced?0:moving?1+Math.floor(time*6)%2:(time+actor.delay*9)%4.2>3.95?3:0;
      actor.sprite.material=this.material(actor.kind,frame,actor.flip);
      actor.sprite.userData.frame=frame;
    }
    this.palms.forEach((p,n)=>p.material=this.material('palm',this.world.reduced?0:Math.floor(time*.85+n*.3)%2));
    this.hearts.forEach(h=>h.visible=progress>.94);
  }
}
