import * as T from 'three';
import { PixelSprites } from './pixel-sprites';
import { gridWorld, SIZE } from './game';
import type { World } from './world';

/** Each mill independently restores its field and fills its bread stall. */
export class HarvestScene extends PixelSprites {
  power=[0,0];
  fields:T.Sprite[][]=[[],[]];
  bread:T.Sprite[][]=[[],[]];
  farmers:T.Sprite[]=[];
  starts:T.Vector3[]=[];
  constructor(world:World){
    super(world);
    for(const [n,x] of [-2,6].entries()){
      world.house(x,-6.35,1.75,1.25,1.45,0xe2c08c);
      this.add('sack',x-2.2,-6.8);this.add('sack',x-1.6,-6.8);
      // Compact tables stand on the southern terrace, away from trench approaches.
      const tableX=n?4.9:-4.9;
      world.box(world.root,tableX,.43,6.7,1.7,.14,.7,0x916749,'wood');
      for(const dx of [-.62,.62])world.box(world.root,tableX+dx,.2,6.7,.12,.4,.5,0x80533b,'wood');
      for(let k=0;k<2;k++){
        const loaf=this.add('bread',tableX-.4+k*.8,6.7);loaf.position.y=.51;loaf.visible=false;this.bread[n].push(loaf);
      }
      for(let k=0;k<3;k++){
        const fx=(n?1:-3)+k*.6;
        world.box(world.root,fx,.03,6.9,.55,.08,1.3,0x785438,'soil');
        this.fields[n].push(this.add('wheat',fx,6.9));
      }
    }
    for(const [kind,x,z] of [['villager',-3,5],['villager',1,5],['shepherd',-1,5],['sheep',3,5]] as const){
      const person=this.add(kind,x,z);person.userData.kind=kind;
      this.farmers.push(person);this.starts.push(person.position.clone());
    }
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock')this.add('rock',gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));});
    this.add('palm',-6,-5.7);
    this.update(0,[false,false],0,0);
  }
  update(dt:number,active:boolean[],progress:number,time:number){
    this.power=this.power.map((p,n)=>!active[n]?0:this.world.reduced?1:Math.min(1,p+dt/2.2));
    this.fields.forEach((field,n)=>field.forEach(s=>s.material=this.material('wheat',this.power[n]>.8?(this.world.reduced?2:2+Math.floor(time*.8+n)%2):this.power[n]>.15?1:0)));
    this.bread.forEach((loaves,n)=>loaves.forEach(s=>s.visible=this.power[n]>.92));
    this.farmers.forEach((s,n)=>{
      const t=T.MathUtils.smoothstep(progress,.25,.95);
      s.position.copy(this.starts[n]);
      // A short walk to the harvest stalls uses existing front-facing walk frames.
      s.position.z+=t*.6;
      const kind=s.userData.kind;
      const frame=this.world.reduced?0:t>0&&t<1?1+Math.floor(time*6+n)%2:(time+n*.7)%4.2>3.95?3:0;
      s.material=this.material(kind,frame,kind==='sheep');
    });
  }
}
