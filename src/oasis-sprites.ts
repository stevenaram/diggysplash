import * as T from 'three';
import { gridWorld, SIZE } from './game';
import type { World } from './world';
import { PixelSprites } from './pixel-sprites';
import { OasisMonster } from './oasis-monster';
import { oasisBeats } from './oasis-timeline';

type Walker = { sprite: T.Sprite; kind: 'sheep' | 'shepherd'; start: T.Vector3; end: T.Vector3; phase: number };
/** Stage-one-only billboard experiment. Shared frame materials keep uploads bounded. */
export class OasisSprites extends PixelSprites {
  walkers: Walker[] = [];
  palms: T.Sprite[] = [];
  grass: T.Sprite[] = [];
  hearts: T.Sprite[] = [];
  dust: { sprite: T.Sprite; born: number; x:number; z:number; vx: number; vz: number }[] = [];
  time = 0;
  monster: OasisMonster;
  flowers: T.Sprite[] = [];
  private previousBeatTime=0;
  private startingZoom=1;
  constructor(world: World) {
    super(world);
    this.monster = new OasisMonster(world);
    for(const x of [4.3,5.1,5.8])this.flowers.push(this.add('flower',x,2.7));
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

    this.update(0,0);
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
    const beat=oasisBeats(progress);
    if(progress===0){
      if(this.previousBeatTime>0)this.world.framePuzzle();
      this.startingZoom=this.world.zoom;
    }
    if(!reduced){
      for(const [at,sound] of [[1.6,'wind'],[6.6,'launch'],[7.9,'impact'],[8.2,'launch'],[11,'impact'],[12.4,'impact'],[13.75,'impact'],[15.1,'impact']] as const)
        if(this.previousBeatTime<at&&beat.time>=at)this.world.onBattleSound(sound);
      // Only pan/zoom: the approved camera tilt, orbit and roll never change.
      for(const [at,x,y,z,zoom] of [[2,.7,.3,.4,1.04],[11.1,3,1,2,1.3]]){
        if(this.previousBeatTime<at&&beat.time>=at){
          this.world.cameraTransition={from:this.world.viewTarget.clone(),to:new T.Vector3(x,y,z),start:this.world.elapsed,fromZoom:this.world.zoom,toZoom:this.startingZoom*(at>10&&this.world.camera.aspect<.85?1.85:zoom)};
          this.world.viewChanged=true;
        }
      }
    }
    this.previousBeatTime=beat.time;
    this.monster.update(progress,time);
    for(const a of this.walkers){
      a.sprite.position.copy(a.start);a.sprite.visible=true;a.sprite.scale.set(2,2.5,1);
      const frame=reduced?0:beat.flee>0&&beat.swallow<1?1+Math.floor(time*9+a.phase)%2:(time+a.phase*.71)%4.2>3.95?3:0;
      a.sprite.material=this.material(a.kind,frame,a.kind==='sheep');
      a.sprite.userData.frame=frame;
      if(a.kind==='shepherd'){
        // The whole sprite is lifted into the mouth: no cut-up frames or hidden action.
        a.sprite.position.x=T.MathUtils.lerp(a.start.x,-1.3,beat.flee);
        a.sprite.position.z=T.MathUtils.lerp(a.start.z,5.4,beat.flee);
        if(beat.swallow>0){
          a.sprite.position.set(T.MathUtils.lerp(-1.3,4.6,beat.swallow),Math.sin(beat.swallow*Math.PI)*2+beat.swallow*3.1,T.MathUtils.lerp(5.4,.7,beat.swallow));
          a.sprite.scale.multiplyScalar(1-.95*Math.max(0,(beat.swallow-.6)/.4));
          a.sprite.visible=beat.swallow<1;
        }
        if(beat.flee>0&&beat.swallow<1)this.monster.vine(0,a.sprite.position.x,a.sprite.position.y+.7,a.sprite.position.z,time);
      }else{
        const n=a.phase-1,travel=beat.sheep[n];
        a.sprite.position.set(T.MathUtils.lerp(a.start.x,2.5+(n-1)*1.12,travel),.04+Math.sin(travel*Math.PI)*2.6,T.MathUtils.lerp(a.start.z,4.3,travel));
        a.sprite.visible=travel<1;
        if(travel>0&&travel<1){
          a.sprite.material=this.material('sheep',1+Math.floor(time*10)%2,Math.floor(time*5)%2===0);
          this.monster.vine(1,a.sprite.position.x,a.sprite.position.y+.6,a.sprite.position.z,time);
        }
      }
    }
    this.flowers.forEach((s,n)=>{s.material=this.material('flower',beat.bloom>.5?1:0);s.visible=beat.grow<.9;s.position.y=.04+(reduced?0:Math.sin(time*2+n)*.015);});
    this.grass.forEach(s=>{s.visible=beat.bloom>.5;s.material=this.material('grass',1);});
  }
  override dispose(){super.dispose();this.monster.dispose();}
}
