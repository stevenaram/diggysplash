import * as T from 'three';
import {gridWorld,SIZE} from './game';
import {PixelSprites} from './pixel-sprites';
import {buildPalm,placePalmOnTile} from './palm-model';
import {MonsterArt} from './monster-art';
import {metricUV} from './metric-uv';
import {bakeColored} from './battle-mesh';
import {CITY_DURATION,CITY_CUES,cityPose,cityEase as ease} from './city-timeline';
import type {World} from './world';

type Ruin={root:T.Group;start:T.Vector3;delay:number;tilt:number};
/** A working aqueduct, a busy market, and one very ill-advised well. */
export class CitySprites extends PixelSprites{
  people:{sprite:T.Sprite;start:T.Vector3;scale:T.Vector3}[]=[];
  private ruins:Ruin[]=[];
  private art=new MonsterArt();
  private fronds:T.Mesh[]=[];
  private looseRocks:{sprite:T.Sprite;start:T.Vector3}[]=[];
  private wrecks=new T.Group();
  private lake:T.Mesh;
  private lakeGlints:T.Mesh[]=[];
  private alarms:T.Sprite[]=[];
  private flood:T.Mesh;
  private hole=new T.Group();
  private well=new T.Group();
  private jet=new T.Group();
  private torrent=new T.Group();
  private foam:T.Mesh[]=[];
  private cracks:T.Mesh[]=[];
  private debris:T.InstancedMesh;
  private spray:T.InstancedMesh;
  private dust:T.InstancedMesh;
  private dummy=new T.Object3D();
  private previous=0;
  private surgeFeed=new T.Group();
  private floorStarts=new Map<number,T.Vector3>();
  private outletRing:T.Mesh;
  private stream:T.Mesh;
  constructor(world:World){
    super(world);
    const w=world,box=w.box.bind(w);
    // The source is one playable tile. The elevated lake is scenery behind it.
    const hill=new T.Group();this.root.add(hill);
    for(let k=0;k<3;k++){
      const geometry=new T.CylinderGeometry(1,1.1,.44,10);geometry.scale(3.65-k*.25,1,1.04-k*.1);
      const projected=metricUV(geometry);geometry.dispose();
      const color=[0xb38b60,0xc9a779,0xdfc18e][k];
      const mass=w.shaded(projected,color,'sand');
      mass.material=new T.MeshBasicMaterial({color,map:w.textures.world('sand'),vertexColors:true});mass.userData.ownedMaterial=mass.material;mass.position.set(-4.5,.18+k*.4,-7);hill.add(mass);
    }
    this.lake=this.ellipse(0x36b8b7,2.55,.61,1.24);this.lake.position.set(-4.7,1.24,-7);hill.add(this.lake);
    for(let k=0;k<9;k++){
      const a=k*Math.PI/8;
      box(hill,-4.7+Math.cos(a)*2.85,1.04,-7-Math.sin(a)*.68,.4,.22,.25,0xe1c999,'stone');
    }
    for(let k=0;k<6;k++){
      const glint=box(hill,-6.5+k*.64,1.27,-7+(k%2)*.22-.12,.28,.015,.035,0xa1e6d9);this.lakeGlints.push(glint);
    }
    for(const [x,z] of [[-7.2,-7.5],[-2.1,-7.45],[-2.5,-6.4]]){const grass=this.add('grass',x,z);grass.position.y=1.15;}
    const chute=box(hill,-5,.64,-6.1,.7,1.2,.09,0x60d7ce,'water');chute.rotation.x=-.18;
    for(const x of [-5.5,-4.5])box(hill,x,.5,-6.1,.18,1,.4,0xd7bc8b,'stone');
    // Shared palm asset and the same metric UVs as chapters one and two.
    const palm=new T.Group();placePalmOnTile(palm,7,1);this.root.add(palm);
    this.fronds=buildPalm(palm,this.art).fronds;
    palm.traverse(o=>{if(o instanceof T.Mesh){const old=o.geometry;o.geometry=metricUV(old);if(old!==o.geometry)old.dispose();}});
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock'){const sprite=this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));if(i>=32)this.looseRocks.push({sprite,start:sprite.position.clone()});}});
    // Low city wall, with a clear stone water passage through its eastern arch.
    for(let col=0;col<8;col++){
      if(col===6)continue;
      const g=this.structure(gridWorld(col),-1,.22+col*.025);
      box(g,0,.63,0,1.96,1.26,.7,0xc8b18a,'stone');
      box(g,0,1.32,0,2,.16,.85,0xe6d3a9,'stone');
      for(const dx of [-.72,0,.72])box(g,dx,1.57,0,.38,.4,.78,0xd9c49a,'stone');
      if(col===0||col===7){box(g,0,1.13,0,1,2.26,1.2,0xcbb691,'stone');box(g,0,2.32,0,1.16,.16,1.34,0xf0d8a4,'stone');}
    }
    const arch=this.structure(5,-1,.38);
    for(const x of [-.83,.83])box(arch,x,.8,0,.32,1.6,.85,0xd9c49a,'stone');
    for(let k=0;k<9;k++){
      const a=k*Math.PI/8,m=box(arch,Math.cos(a)*.83,1.5+Math.sin(a)*.68,0,.35,.33,.9,0xe5d1a6,'stone');m.rotation.z=a-Math.PI/2;
    }
    // Unbroken flume: intake -> wall crossing -> outlet. No hidden teleport.
    const flumeParts:T.Object3D[]=[];
    for(const z of [-3,-1,1]){
      const from=this.root.children.length;
      box(this.root,5,-.22,z,1.7,.2,1.98,0xaaa48c,'stone');
      box(this.root,5.82,.02,z,.2,.48,1.98,0xd9cfb0,'stone');
      if(z===-1)box(this.root,4.18,.02,z,.2,.48,1.98,0xd9cfb0,'stone');
      else for(const dz of [-.73,.73])box(this.root,4.18,.02,z+dz,.2,.48,.5,0xd9cfb0,'stone');
      if(z!==-3)flumeParts.push(...this.root.children.slice(from));
    }
    // Preserve the left approach to the intake and the outlet.
    for(const z of [-3.86,1.86]){const end=box(this.root,5,.02,z,1.75,.48,.18,0xcac1a2,'stone');if(z>0)flumeParts.push(end);}
    const flume=this.structure(5,-.5,.48);flumeParts.forEach(part=>flume.attach(part));
    const intake=w.waters.get(22)!,outlet=w.waters.get(38)!;
    for(const m of [intake,outlet]){m.geometry.scale(.74,1,.82);m.userData.origin.y=-.10;}
    const water=w.waters.get(30)!;water.userData.origin.y=-.10;
    this.outletRing=new T.Mesh(new T.RingGeometry(.55,.6,24),w.mat(0x9ee8ce));this.outletRing.rotation.x=-Math.PI/2;this.outletRing.position.set(5,.13,1);this.root.add(this.outletRing);
    this.stream=box(this.root,5,-.09,-1,.13,.02,5,0xc4f2d6);this.stream.visible=false;
    // Reserved sidewalks hold the stalls. The central dig squares stay uncovered.
    this.house(-6,1.35,0xe2b984,2.5,1.55);
    this.stall(-6,4.5,0xc76f59);
    this.stall(6.6,4.3,0x629e94);
    this.house(-4.8,7.2,0xe8c698,2.35,1.6);
    this.house(-.5,7.2,0xd8b286,2.4,1.35);
    this.house(4,7.2,0xe4bf8d,2.3,1.6);
    // Well mouth is unmistakable, with an open western and northern approach.
    this.well=this.structure(-3,5,.04);
    const pit=new T.Mesh(new T.CylinderGeometry(.73,.73,.04,16),w.mat(0x333f43));pit.position.y=.1;this.well.add(pit);
    for(let row=0;row<3;row++)for(let k=0;k<12;k++){
      const a=(k+(row%2)*.5)*Math.PI/6;
      const brick=box(this.well,Math.cos(a)*.86,.17+row*.24,Math.sin(a)*.86,.44,.22,.25,row===2?0xe1d9ba:0xbcb79e,'stone');brick.rotation.y=-a+Math.PI/2;
    }
    for(const x of [-1.02,1.02])box(this.well,x,1,0,.13,1.65,.15,0x80533b,'wood');
    box(this.well,0,1.86,0,2.25,.16,.22,0xb6824d,'wood');
    box(this.well,.3,1.4,0,.045,.8,.045,0xc4a36c,'wood');
    w.cylinder(this.well,.3,1.02,0,.2,.25,0x9c7350,.24);
    // A handful of readable characters, all from the established 32px/unit bank.
    for(const [n,x,z] of [[0,-7,3.1],[1,6,2.5],[2,1.4,6.3],[3,-6.5,6.4],[4,6.5,6.7]]){
      const sprite=this.add(n%2?'shepherd':'villager',x,z);
      this.people.push({sprite,start:sprite.position.clone(),scale:sprite.scale.clone()});
      this.alarms.push(this.add('alarm',x,z));
    }
    this.flood=this.ellipse(0x48bdbb,7.3,3.8,.12);this.flood.position.z=4.2;this.root.add(this.flood);
    for(let k=0;k<4;k++){
      const rim=this.ellipse([0x9c7250,0x785638,0x473731,0x20262b][k],6.9-k*.42,3.8-k*.26,.16+k*.012);this.hole.add(rim);
    }
    this.hole.position.z=4.1;this.root.add(this.hole);
    for(let k=0;k<10;k++){
      const a=k*2.399,crack=box(this.root,Math.cos(a)*2,.07,4+Math.sin(a)*1.8,.07,.025,1.4+(k%3)*.45,0x493e33);crack.rotation.y=a;this.cracks.push(crack);
    }
    this.jet.position.set(-3,.55,5);this.root.add(this.jet);
    for(let k=0;k<5;k++){
      const spout=box(this.jet,(k-2)*.12,2.1,0,.18,4.2,.25,k%2?0xafece0:0x58cfc9);spout.rotation.z=(k-2)*.11;
    }
    this.torrent.position.set(4.8,.18,-2);this.root.add(this.torrent);
    for(let k=0;k<9;k++){
      const ribbon=box(this.torrent,(k-4)*.33,0,k*.28,.42,.08,8-k*.4,k%2?0x8bdfd4:0x3eaeb2,'water');ribbon.rotation.y=(k-4)*.025;
    }
    for(let k=0;k<18;k++){
      const f=box(this.root,0,.28,0,.28+(k%3)*.17,.035,.07,0xbbede0);this.foam.push(f);
    }
    this.root.add(this.surgeFeed);
    for(const [x,z,width,depth] of [[-5,-5.8,1,2.4],[-3,-5,5,1.1],[-1,-4,1.1,3],[2,-3,7,1.1],[5,-1,1.3,5]]){
      box(this.surgeFeed,x,.17,z,width,.045,depth,0x55c7c2,'water');
    }
    this.debris=this.pool(100,0xc79c6c,.17);
    const debrisColors=[0xc7aa7c,0x9b704e,0xe2c49c,0x619d91,0xc97b61];
    for(let n=0;n<100;n++)this.debris.setColorAt(n,new T.Color(debrisColors[n%5]));
    this.debris.instanceColor!.needsUpdate=true;
    // Bake architecture by texture: retain painted faces/metric UVs with few draw calls.
    for(const r of this.ruins)this.batch(r.root);
    for(let i=32;i<64;i++)this.floorStarts.set(i,w.tiles[i].position.clone());
    this.spray=this.pool(90,0xb8f1e7,.09);
    this.dust=this.pool(48,0xc7b291,.26);
    this.root.add(this.wrecks);
    for(const [n,x,z] of [[0,-5.7,2.7],[1,5.7,6],[2,2.8,7],[3,-4.5,6.7],[4,3.9,1.1]]){
      const rubble=new T.Group();rubble.position.set(x,.26,z);rubble.rotation.set(.15+n*.1,n*.9,.12-n*.08);this.wrecks.add(rubble);
      if(n%2===0){
        for(let k=0;k<5;k++)box(rubble,-.6+k*.3,.07,k%2*.08,.27,.09,.85,k%2?0xe6c48d:0x649e91,'wood');
        box(rubble,.15,.3,0,.1,.65,.1,0x80533b,'wood');
      }else for(let k=0;k<4;k++)box(rubble,(k%2)*.4,.12+Math.floor(k/2)*.18,0,.38,.18,.4,0xcbb38e,'stone');
      this.batch(rubble);
    }
    this.update(0,0);
  }
  private batch(root:T.Group){
    const bins=new Map<T.Texture|null,T.Mesh[]>();
    for(const child of root.children){if(!(child instanceof T.Mesh))continue;
      const m=(Array.isArray(child.material)?child.material[0]:child.material) as T.MeshBasicMaterial;
      const list=bins.get(m.map)??[];list.push(child);bins.set(m.map,list);
    }
    for(const [map,meshes] of bins){
      const geometry=bakeColored(root,meshes),material=new T.MeshBasicMaterial({map,vertexColors:true});
      meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});
      const merged=new T.Mesh(geometry,material);merged.userData.ownedMaterial=material;root.add(merged);
    }
  }
  private pool(count:number,color:number,size:number){
    const material=new T.MeshBasicMaterial({color});
    const mesh=new T.InstancedMesh(new T.BoxGeometry(size,size,size),material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.ownedMaterial=material;this.root.add(mesh);return mesh;
  }
  private ellipse(color:number,x:number,z:number,y:number){
    const geometry=new T.CircleGeometry(1,32),positions=geometry.getAttribute('position');
    for(let i=1;i<positions.count;i++){const angle=Math.atan2(positions.getY(i),positions.getX(i));const rough=1+.018*Math.sin(angle*7)+.014*Math.cos(angle*11);positions.setXY(i,positions.getX(i)*rough,positions.getY(i)*rough);}
    const m=new T.Mesh(geometry,this.world.mat(color));m.rotation.x=-Math.PI/2;m.scale.set(x,z,1);m.position.y=y;return m;
  }
  private structure(x:number,z:number,delay:number){
    const root=new T.Group();root.position.set(x,0,z);this.root.add(root);
    this.ruins.push({root,start:root.position.clone(),delay,tilt:(this.ruins.length%2?1:-1)*.8});return root;
  }
  private house(x:number,z:number,color:number,width:number,height:number){
    const w=this.world,g=this.structure(x,z,.1+this.ruins.length*.012);
    w.box(g,0,height/2,0,width,height,1.3,color,'plaster');
    w.box(g,0,height+.09,0,width+.18,.18,1.5,0xf1dab2,'stone');
    w.box(g,0,height+.21,0,width-.24,.1,1.1,0xa78260,'stone');
    for(const dx of [-width/2,width/2])w.box(g,dx,height+.28,0,.13,.36,1.45,0xe7cba4,'stone');
    w.box(g,-.35,.5,.665,.48,1,.045,0x75533e,'wood');
    w.box(g,width*.25,height*.6,.68,.38,.44,.04,0x527f7d);
    for(let k=0;k<3;k++)w.box(g,width*.25-.13+k*.13,height*.6,.71,.035,.44,.035,0xe6c294,'wood');
  }
  private stall(x:number,z:number,color:number){
    const w=this.world,g=this.structure(x,z,.12+this.ruins.length*.01);
    for(const dx of [-.9,.9])for(const dz of [-.6,.6])w.box(g,dx,.83,dz,.10,1.65,.1,0x80533b,'wood');
    w.box(g,0,.65,0,1.95,.17,1.2,0xb6824d,'wood');
    for(let k=0;k<8;k++){
      const canopy=w.box(g,-.98+k*.28,1.75,0,.28,.075,1.65,k%2?0xf2d9a1:color,'plaster');canopy.rotation.x=.12;
      w.box(g,-.98+k*.28,1.52,.81,.28,.3,.055,k%2?0xf2d9a1:color,'plaster');
    }
    for(let k=0;k<12;k++)w.cylinder(g,-.67+(k%4)*.43,.82,Math.floor(k/4)*.32-.35,.12,.16,[0xc68c46,0x789e60,0xb76854][k%3]);
  }
  update(progress:number,time:number){
    const w=this.world,t=progress*CITY_DURATION,p=cityPose(t);
    if(t>0&&this.previous===0)for(let i=32;i<64;i++)this.floorStarts.set(i,w.tiles[i].position.clone());
    if(t<this.previous)this.previous=0;
    if(!w.reduced){for(const cue of CITY_CUES)if(this.previous<cue.at&&t>=cue.at)w.onCitySound(cue.cue);}
    this.previous=t;
    const delivered=!!w.waters.get(38)?.visible;
    this.outletRing.visible=delivered&&progress===0;
    this.outletRing.scale.setScalar(1+Math.sin(time*4)*.12);
    this.stream.visible=delivered&&t<4.6;
    this.stream.position.x=5+Math.sin(time*2)*.1;
    this.fronds.forEach((f,n)=>f.rotation.z=f.userData.baseTilt+(w.reduced?0:Math.sin(time*1.5+n)*.025));
    this.lakeGlints.forEach((g,n)=>{g.visible=p.drain<.9;g.scale.x=.7+Math.sin(time*1.3+n)*.3;});
    this.lake.scale.y=1;this.lake.position.y=1.24-p.drain*.025;
    this.lake.scale.set(2.55*(1-p.drain*.3),.61*(1-p.drain*.2),1);
    const jet=p.burst;this.jet.visible=jet>0;this.jet.scale.set(1+jet*.25,jet*(1+(w.reduced?0:Math.sin(time*29)*.06)),1);
    this.flood.position.x=-3*(1-p.flood);this.flood.position.z=5-.8*p.flood;
    this.flood.visible=p.flood>0&&p.drain<1;this.flood.scale.set(7.3*p.flood*(1-p.drain),3.8*p.flood*(1-p.drain),1);
    this.hole.visible=p.collapse>0;this.hole.scale.set(Math.max(.001,p.collapse),1,Math.max(.001,p.collapse));
    this.surgeFeed.visible=p.surge>0;this.surgeFeed.scale.y=p.surge;
    this.torrent.visible=p.surge>0;this.torrent.scale.set(p.surge,1,p.surge);
    this.cracks.forEach((c,n)=>{c.visible=p.crack>0&&p.collapse<.8;c.scale.z=p.crack;c.scale.x=1+Math.sin(n)*p.crack;});
    for(const [n,r] of this.ruins.entries()){
      const fall=ease((t-4.2-r.delay*3)/2.5),sink=fall*fall;
      r.root.position.copy(r.start);
      r.root.position.x*=1-fall*.38;r.root.position.z=T.MathUtils.lerp(r.start.z,4.1,fall*.4);
      r.root.position.y=-sink*6;
      r.root.rotation.set(fall*r.tilt,fall*(n%2?.3:-.25),-fall*r.tilt*.7);
      r.root.scale.setScalar(1-fall*.75);r.root.visible=fall<1;
      if(t>3&&t<4.7){r.root.position.x+=Math.sin(time*42+n)*p.crack*.035;}
    }
    if(t<4.2){this.well.rotation.z=Math.sin(time*35)*p.pressure*.025;}
    this.wrecks.visible=p.aftermath>0;this.wrecks.scale.y=p.aftermath;
    this.looseRocks.forEach(a=>{const fall=ease((t-4.5)/2);a.sprite.position.copy(a.start);a.sprite.position.y-=fall*5;a.sprite.visible=fall<1;});
    this.people.forEach((a,n)=>{
      const flee=ease((t-1.1-n*.09)/2),fall=ease((t-4.6-n*.17)/1.5);
      a.sprite.position.copy(a.start);a.sprite.position.x+=(n%2?1:-1)*flee*.6;a.sprite.position.z+=flee*.7;
      a.sprite.position.lerp(new T.Vector3(0,-5,4.1),fall);
      a.sprite.scale.copy(a.scale).multiplyScalar(1-fall*.8);a.sprite.visible=fall<1;
      const frame=w.reduced?0:t>1&&t<4.7?1+Math.floor(time*9+n)%2:Math.floor(time*.6+n)%7===0?3:0;
      const alarm=this.alarms[n];alarm.position.copy(a.sprite.position);alarm.position.y+=2.4;alarm.visible=t>1+n*.09&&t<2.2+n*.09;
      a.sprite.userData.frame=frame;a.sprite.material=this.material(n%2?'shepherd':'villager',frame);
    });
    this.foam.forEach((f,n)=>{
      const q=(time*.55+n*.17)%1;
      f.visible=p.flood>0&&p.drain<1;f.position.set(Math.sin(n*2.4)*6*p.flood,.27,1+q*6);
      f.scale.setScalar((1-p.drain)*(1-Math.abs(q-.5)*2));
    });
    for(let n=0;n<90;n++){
      const age=(time+n*.071)%.7,a=n*2.399;
      this.dummy.position.set(-3+Math.cos(a)*age*2.8,.9+age*7-age*age*10,5+Math.sin(a)*age*2.8);
      this.dummy.scale.setScalar(jet*(1-age/.7));this.dummy.rotation.set(a,age*5,a);this.dummy.updateMatrix();this.spray.setMatrixAt(n,this.dummy.matrix);
    }
    this.spray.instanceMatrix.needsUpdate=true;
    for(let n=0;n<100;n++){
      const age=Math.max(0,t-4.25-(n%7)*.13),a=n*2.399,r=2+(n%8)*.52;
      const settled=p.aftermath>0,live=age>0&&age<2.1;
      const x=Math.cos(a)*r,z=4.1+Math.sin(a)*r*.52;
      this.dummy.position.set(x,live?.4+age*(1.6+(n%3)*.5)-age*age*2.8:.26,z);
      this.dummy.rotation.set(n*.7+age*.5,n*2.1,n*.4);
      const scale=settled?p.aftermath*(n%3===0?1.4:.75):live?1-age/2.1:0;
      this.dummy.scale.set(scale*(n%4===0?3:1),scale,scale*(n%4===0?.5:1));
      this.dummy.updateMatrix();this.debris.setMatrixAt(n,this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate=true;
    for(let n=0;n<48;n++){
      const age=t-4.3-(n%6)*.22,a=n*2.399,r=2+n%5;
      const fade=age>0&&age<2?Math.sin(age/2*Math.PI):0;
      this.dummy.position.set(Math.cos(a)*r,.2+age*.6,4.1+Math.sin(a)*r*.48);
      this.dummy.rotation.set(n,n*.2,n*.8);this.dummy.scale.setScalar(fade*.85);this.dummy.updateMatrix();this.dust.setMatrixAt(n,this.dummy.matrix);
    }
    this.dust.instanceMatrix.needsUpdate=true;
    for(const [i,start]of this.floorStarts){
      const tile=w.tiles[i],x=start.x,z=start.z;
      const distance=Math.sqrt(x*x/40+(z-4.1)*(z-4.1)/12);
      const fall=ease((t-4.6-distance*.8)/2.4);
      if(progress===0)continue;
      tile.position.copy(start);tile.position.y-=fall*4;
      tile.rotation.set(fall*(z-4.1)*.2,0,-fall*x*.1);tile.scale.y=1-fall*.8;
      tile.visible=fall<1;
      for(const bank of w.banks.get(i)??[])bank.visible=bank.visible&&fall<.1;
    }
    // The aftermath retains torn market fabric and masonry around the open sinkhole.
    if(p.collapse>0){for(const [i,water]of w.waters)if(i>=32||i===30)water.visible=false;}
  }
  override dispose(){super.dispose();this.art.dispose();}
}
