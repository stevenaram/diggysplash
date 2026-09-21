import * as T from 'three';
import { gridWorld, SIZE } from './game';
import { PixelSprites } from './pixel-sprites';
import type { PixelKind } from './oasis-pixels';
import type { World } from './world';

/** The queue waits for both gates, then walks through the clear central passage. */
export class CitySprites extends PixelSprites {
  people:{sprite:T.Sprite; kind:PixelKind; path:T.Vector3[]; delay:number}[]=[];
  palms:T.Sprite[]=[];
  constructor(world:World){
    super(world);
    this.palms.push(this.add('palm',-6.25,-4.5));
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock')this.add('rock',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));});
    const cast=[['villager',3,1.5,.2,-6.4],['shepherd',3,3.9,2.2,-6.6],['villager',1,3.8,4.4,-6.4],['sheep',1,1.4,-3.8,-6.2]] as const;
    cast.forEach(([kind,x,z,tx,tz],n)=>{
      const sprite=this.add(kind,x,z);
      const lane=n%2?3.6:2.4;
      const p=(x:number,z:number)=>new T.Vector3(x,.04,z);
      this.people.push({sprite,kind,delay:n*.075,path:[p(x,z),p(lane,.7),p(lane,-5.3),p(tx,tz)]});
    });
    this.update(0,0);
  }
  update(progress:number,time:number){
    this.people.forEach((a,n)=>{
      const t=T.MathUtils.clamp((progress-.3-a.delay)/(.7-a.delay),0,1);
      const p=t*3, segment=Math.min(2,Math.floor(p));
      a.sprite.position.lerpVectors(a.path[segment],a.path[segment+1],p-segment);
      const moving=t>0&&t<1;
      const walkingUp=moving&&a.kind!=='sheep'&&a.path[segment+1].z<a.path[segment].z;
      const frame=this.world.reduced?0:moving?(walkingUp?7:1)+Math.floor(time*6+n)%2:(time+n*.71)%4.2>3.95?3:0;
      a.sprite.userData.frame=frame;
      a.sprite.material=this.material(a.kind,frame,a.kind==='sheep');
    });
    this.palms.forEach(p=>p.material=this.material('palm',this.world.reduced?0:Math.floor(time*.85)%2));
  }
}
