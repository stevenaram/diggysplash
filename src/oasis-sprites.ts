import * as T from 'three';
import { gridWorld, SIZE } from './game';
import type { World } from './world';
import { PixelSprites } from './pixel-sprites';
import { OasisMonster, PLANT_X, PLANT_Z, CAMP_Z } from './oasis-monster';
import { swallowPose } from './swallow-pose';
import { oasisBeats, oasisCuesBetween, PALM_END, SNATCH_START, ESCAPE_X, ESCAPE_Z, EMOTE_START, escapePosition } from './oasis-timeline';

type Walker = { sprite: T.Sprite; kind: 'sheep' | 'shepherd'; start: T.Vector3; end: T.Vector3; phase: number };
/** Stage-one cast and choreography. Sprite frames retain the shared 32px/tile scale. */
export class OasisSprites extends PixelSprites {
  walkers: Walker[] = [];
  grass: T.Sprite[] = [];
  flowers: T.Sprite[] = [];
  dust: { sprite: T.Sprite; born: number; x:number; z:number; vx: number; vz: number }[] = [];
  private alarm:T.Sprite;
  time = 0;
  monster: OasisMonster;
  private previousBeatTime=0;
  private mouthEntry=new T.Vector3();
  private mouthSeat=new T.Vector3();
  private mouthCenter=new T.Vector3();
  private mouthUp=new T.Vector3();
  private mouthPlanes=[new T.Plane(),new T.Plane()];
  private mouthMaterials=new Map<number,T.SpriteMaterial>();
  constructor(world: World) {
    super(world);
    this.monster = new OasisMonster(world);
    world.renderer.localClippingEnabled=true;
    for(const frame of [12,13]){
      const material=this.material('shepherd',frame).clone();
      material.clippingPlanes=this.mouthPlanes;
      this.mouthMaterials.set(frame,material);
    }
    for(let n=0;n<3;n++)this.flowers.push(this.add('flower',PLANT_X+(n-1)*1.05,PLANT_Z+.1+(n%2)*.12));

    world.game.level.tiles.forEach((t,i)=>{
      const x=gridWorld(i%SIZE), z=gridWorld(Math.floor(i/SIZE));
      if(t==='rock')this.addTileRock(x,z);
    });
    // Reserve the north bank for the shrub; keep all oasis approaches clear.
    for(const x of [4.35,5.15,5.8]) {
      this.grass.push(this.add('grass',x+.08,-2.55));
    }
    // A readable campsite is grouped on the protected southern bank, not on the route.
    const rugMaterial=new T.MeshBasicMaterial({map:this.material('camp-rug').map,transparent:true,alphaTest:.5,side:T.DoubleSide});
    const rug=new T.Mesh(new T.PlaneGeometry(3,1.5),rugMaterial);
    rug.rotation.x=-Math.PI/2;rug.position.set(4,.035,3.1);rug.raycast=()=>{};
    rug.userData.ownedMaterial=rugMaterial;world.root.add(rug);
    this.walker('shepherd',3.2,3.8,3.2,2.85,0);
    this.walker('sheep',5.0,4.65,4.7,2.05,1);
    this.walker('sheep',6.8,2.9,6.55,1.2,2);
    this.walker('sheep',6.8,.15,6.55,-.85,3);

    this.alarm=this.add('alarm',0,0);
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
    }
    if(!reduced){
      for(const cue of oasisCuesBetween(this.previousBeatTime,beat.time))this.world.onCreatureSound(cue);
    }
    this.previousBeatTime=beat.time;
    this.monster.update(progress,time);
    const swallow=swallowPose(beat.time);
    this.monster.head.updateWorldMatrix(true,false);
    this.mouthEntry.set(0,-1.25,2.4).applyMatrix4(this.monster.head.matrixWorld);
    this.mouthSeat.set(0,-1.25,.55).applyMatrix4(this.monster.head.matrixWorld);
    this.mouthCenter.set(0,0,0).applyMatrix4(this.monster.head.matrixWorld);
    this.mouthUp.set(0,1,0).transformDirection(this.monster.head.matrixWorld);
    // The sprite is a flat card, so rear pixels must be constrained to the actual
    // mouth aperture: otherwise its hat/boots poke out above/below the closing shell.
    const aperture=swallow.close>0?Math.max(0,Math.sin(swallow.opening)*1.2+swallow.lift-.1):100;
    const center=this.mouthUp.dot(this.mouthCenter);
    this.mouthPlanes[0].normal.copy(this.mouthUp);this.mouthPlanes[0].constant=-center+aperture;
    this.mouthPlanes[1].normal.copy(this.mouthUp).negate();this.mouthPlanes[1].constant=center+aperture;
    this.alarm.visible=beat.emote&&!reduced;
    for(const a of this.walkers){
      a.sprite.position.copy(a.start);a.sprite.visible=true;a.sprite.scale.set(2,2.5,1);
      const frame=reduced?0:beat.flee>0&&beat.swallow<1?1+Math.floor(time*9+a.phase)%2:(time+a.phase*.71)%4.2>3.95?3:0;
      a.sprite.material=this.material(a.kind,frame,a.kind==='sheep');
      a.sprite.userData.frame=frame;
      if(a.kind==='shepherd'){
        const escape=escapePosition(beat.flee,a.start.x,a.start.z);
        a.sprite.position.x=escape.x;a.sprite.position.z=escape.z;
        let shepherdFrame=frame;
        if(beat.look)shepherdFrame=6;
        else if(beat.flee>0&&beat.time<=SNATCH_START){
          shepherdFrame=(beat.flee<.2?10:14)+Math.floor(time*13)%2;
          a.sprite.position.y=.04+Math.abs(Math.sin(time*24))*.13;
        }
        a.sprite.material=this.material('shepherd',shepherdFrame);
        // Offset along billboard-up so the badge stays directly above the hat.
        this.alarm.position.copy(a.sprite.position);
        this.alarm.position.y+=1.35;
        this.alarm.position.z-=2.34;
        this.alarm.position.y+=Math.sin(Math.min(1,(beat.time-EMOTE_START)/.1)*Math.PI)*.09;
        if(beat.time>SNATCH_START){
          // First lift into a clear staging point in front of the open mouth.
          // Then travel along its normal; keep the entire billboard at full scale.
          const u=swallow.approach,v=1-u,end=this.mouthEntry;
          a.sprite.position.set(
            v*v*v*ESCAPE_X+3*v*v*u*ESCAPE_X+3*v*u*u*(end.x-1.2)+u*u*u*end.x,
            v*v*v*.04+3*v*v*u*3.8+3*v*u*u*end.y+u*u*u*end.y,
            v*v*v*ESCAPE_Z+3*v*v*u*ESCAPE_Z+3*v*u*u*end.z+u*u*u*end.z,
          );
          if(swallow.insert>0)a.sprite.position.lerpVectors(this.mouthEntry,this.mouthSeat,swallow.insert);
          a.sprite.material=this.mouthMaterials.get(12+Math.floor(time*12)%2)!;
          // Actual jaw geometry occludes him before visibility is retired.
          a.sprite.visible=!swallow.hidden;
        }
        if(beat.time>SNATCH_START-.16&&!swallow.hidden){
          const release=T.MathUtils.smoothstep(swallow.insert,.35,1);
          const lash=T.MathUtils.smoothstep(beat.time,SNATCH_START-.16,SNATCH_START);
          this.monster.vine(0,T.MathUtils.lerp(1.3,T.MathUtils.lerp(a.sprite.position.x-.7,1.3,release),lash),T.MathUtils.lerp(.8,T.MathUtils.lerp(a.sprite.position.y+.65,.8,release),lash),T.MathUtils.lerp(2.5,T.MathUtils.lerp(a.sprite.position.z+.15,2.5,release),lash),time);
        }
        a.sprite.userData.frame=beat.time>SNATCH_START?12+Math.floor(time*12)%2:shepherdFrame;
      }else{
        const n=a.phase-1,travel=beat.sheep[n];
        a.sprite.position.set(T.MathUtils.lerp(a.start.x,2.5+(n-1)*1.12,travel),.04+Math.sin(travel*Math.PI)*2.6,T.MathUtils.lerp(a.start.z,CAMP_Z,travel));
        a.sprite.visible=travel<1;
        if(travel>0&&travel<1){
          a.sprite.material=this.material('sheep',6+Math.floor(time*12)%3,true);
          this.monster.vine(1,a.sprite.position.x,a.sprite.position.y+.6,a.sprite.position.z,time);
        }
      }
    }
    this.flowers.forEach(s=>{
      s.visible=beat.grow<.25;
      const frame=beat.grow>.06?3:beat.bloom>.7?2:beat.bloom>.25?1:0;
      s.material=this.material('flower',frame);
      s.userData.frame=frame;
    });
    this.grass.forEach(s=>{s.visible=beat.bloom>.5;s.material=this.material('grass',1);});
  }
  override dispose(){for(const m of this.mouthMaterials.values())m.dispose();super.dispose();this.monster.dispose();}
}
