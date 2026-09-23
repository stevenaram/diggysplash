import * as T from 'three';
import {gridWorld,SIZE} from './game';
import {PixelSprites} from './pixel-sprites';
import {buildPalm,placePalmOnTile} from './palm-model';
import {MonsterArt} from './monster-art';
import {metricUV} from './metric-uv';
import {CityWaterfall} from './city-waterfall';
import {CityDisasterEffects} from './city-disaster-effects';
import {bakeColored} from './battle-mesh';
import {CITY_DURATION,CITY_CUES,cityPose,cityStructureFall,cityEase as ease} from './city-timeline';
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
  private effects:CityDisasterEffects;
  private well=new T.Group();
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
  private lakeFall:CityWaterfall;
  private outletFall:CityWaterfall;
  constructor(world:World){
    super(world);
    const w=world,box=w.box.bind(w);
    // The source is one playable tile. The elevated lake is scenery behind it.
    const hill=new T.Group();hill.position.y=1.15;this.root.add(hill);
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
    // Reeds sit on the flat upper bank, with their roots inset into the soil.
    for(const [x,z] of [[-6.65,-7.38],[-2.35,-7.15]]){
      const bed=this.ellipse(0xbaa576,.3,.16,1.205);bed.position.set(x,1.205,z);hill.add(bed);
      for(let n=0;n<5;n++){
        const reed=box(hill,x+(n-2)*.065,1.32+(n%2)*.04,z,.045,.3+(n%2)*.08,.04,n%2?0x647d4b:0x8b9b59);reed.rotation.z=(n-2)*.14;
      }
    }
    this.lakeFall=new CityWaterfall(w,this.root,[new T.Vector3(-5,2.40,-6.5),new T.Vector3(-5,2.39,-6.1),new T.Vector3(-5,2.1,-5.96),new T.Vector3(-5,1.55,-5.78),new T.Vector3(-5,1.03,-5.52)],.72);
    // Shared palm asset and the same metric UVs as chapters one and two.
    const palm=new T.Group();placePalmOnTile(palm,7,2);palm.position.y=1.15;this.root.add(palm);
    const palmBed=this.ellipse(0xb39764,.72,.6,1.17);palmBed.position.set(7,1.17,-3);this.root.add(palmBed);
    this.fronds=buildPalm(palm,this.art).fronds;
    palm.traverse(o=>{if(o instanceof T.Mesh){const old=o.geometry;o.geometry=metricUV(old);if(old!==o.geometry)old.dispose();}});
    world.game.level.tiles.forEach((t,i)=>{if(t==='rock'){const sprite=this.addTileRock(gridWorld(i%SIZE),gridWorld(Math.floor(i/SIZE)));sprite.position.y+=w.elevation(i);if(i>=32)this.looseRocks.push({sprite,start:sprite.position.clone()});}});
    // Low city wall, with a clear stone water passage through its eastern arch.
    for(let col=0;col<8;col++){
      if(col===6)continue;
      const g=this.structure(gridWorld(col),-1,.22+col*.025);
      box(g,0,.63,0,1.96,1.26,.7,0xbca07b,'stone');
      box(g,0,1.32,0,2,.16,.85,0xd8bb90,'stone');
      for(const dx of [-.72,0,.72])box(g,dx,1.57,0,.38,.4,.78,0xd9c49a,'stone');
      if(col===0||col===7){box(g,0,1.13,0,1,2.26,1.2,0xcbb691,'stone');box(g,0,2.32,0,1.16,.16,1.34,0xf0d8a4,'stone');}
    }
    // Pale limestone carries the water above the wall opening; dark slate makes the trough legible.
    const flume=this.structure(5,-1,.48);
    for(const dz of [-.7,.7]){
      for(const dx of [-.66,.66])box(flume,dx,.43,dz,.28,.86,.3,0xdce0cf,'stone');
      for(let k=0;k<7;k++){
        const a=k*Math.PI/6,stone=box(flume,Math.cos(a)*.64,.48+Math.sin(a)*.44,dz,.30,.24,.35,0xe7e9d8,'stone');stone.rotation.z=a-Math.PI/2;
      }
    }
    box(flume,0,.91,0,1.7,.18,2.1,0x909b92,'stone');
    for(const x of [-.78,.78]){
      box(flume,x,1.2,0,.2,.48,2.15,0xe2e4cf,'stone');
      box(flume,x,1.47,0,.24,.08,2.2,0xf1ecd6,'stone');
      box(flume,x*1.015,1.21,0,.025,.10,2.12,0x638a8b);
    }
    // Ground-level intake on the upper terrace, with a clear western opening.
    box(this.root,5,.96,-3,1.65,.16,1.98,0x909b92,'stone');
    box(this.root,5.78,1.2,-3,.2,.48,1.98,0xe2e4cf,'stone');
    for(const dz of [-.76,.76])box(this.root,4.22,1.2,-3+dz,.2,.48,.46,0xe2e4cf,'stone');
    box(this.root,5,1.2,-3.9,1.75,.48,.18,0xe2e4cf,'stone');
    // Low receiving basin, below the free-falling end of the aqueduct.
    const receiver=this.structure(5,1,.5);
    box(receiver,0,-.19,0,1.7,.12,1.9,0x909b92,'stone');
    box(receiver,.8,.06,0,.18,.38,1.9,0xdce0cf,'stone');
    for(const z of [-.83,.83])box(receiver,0,.06,z,1.7,.38,.18,0xdce0cf,'stone');
    const intake=w.waters.get(22)!,outlet=w.waters.get(38)!;
    for(const m of [intake,outlet])m.geometry.scale(.74,1,.82);
    intake.userData.origin.y=1.05;outlet.userData.origin.y=-.10;
    w.waters.get(30)!.userData.origin.y=1.05;
    this.outletFall=new CityWaterfall(w,receiver,[new T.Vector3(0,1.06,-1.06),new T.Vector3(0,1.04,-.85),new T.Vector3(0,.68,-.6),new T.Vector3(0,-.075,-.15)],.8);
    this.outletRing=new T.Mesh(new T.RingGeometry(.55,.6,24),w.mat(0x9ee8ce));this.outletRing.rotation.x=-Math.PI/2;this.outletRing.position.set(5,.13,1);this.root.add(this.outletRing);
    this.stream=box(this.root,5,1.08,-1.9,.11,.02,.4,0xc4f2d6);this.stream.visible=false;
    // Reserved sidewalks hold the stalls. The central dig squares stay uncovered.
    this.house(-6.3,.75,0xe2b984,2.8,3.0,1.5);
    this.stall(-6,4.5,0xc76f59);
    this.stall(6.6,4.3,0x629e94);
    this.house(-6,7.35,0xe8c698,3.1,2.9,1.0);
    this.house(5.6,7.35,0xe4bf8d,3.1,3.15,1.0);
    // Well mouth is unmistakable, with an open western and northern approach.
    this.well=this.structure(-3,5,.04);this.well.userData.category="well";
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
    for(const [n,x,z] of [[0,-6.3,3.05],[1,6.9,2.1],[2,.8,6.3]]){
      const sprite=this.add(n%2?'shepherd':'villager',x,z);
      this.people.push({sprite,start:sprite.position.clone(),scale:sprite.scale.clone()});
      this.alarms.push(this.add('alarm',x,z));
    }
    this.effects=new CityDisasterEffects(w);
    for(let k=0;k<10;k++){
      const a=k*2.399,crack=box(this.root,Math.cos(a)*2,.07,4+Math.sin(a)*1.8,.07,.025,1.4+(k%3)*.45,0x493e33);crack.rotation.y=a;this.cracks.push(crack);
    }
    this.root.add(this.surgeFeed);
    for(const [x,z,width,depth] of [[-5,-5.8,1,2.4],[-3,-5,5,1.1],[-1,-4,1.1,3],[2,-3,7,1.1]]){
      box(this.surgeFeed,x,z<=-1?1.32:.17,z,width,.045,depth,0x55c7c2,'water');
    }
    this.debris=this.pool(100,0xc79c6c,.17);
    const debrisColors=[0xc7aa7c,0x9b704e,0xe2c49c,0x619d91,0xc97b61];
    for(let n=0;n<100;n++)this.debris.setColorAt(n,new T.Color(debrisColors[n%3]));
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
    // Recognizable wreckage: a broken house facade, a folded market roof, and fallen battlements.
    const facade=new T.Group();facade.position.set(5.3,.18,5.5);facade.rotation.set(-.75,.35,.18);this.wrecks.add(facade);
    box(facade,0,.7,0,2.1,1.4,.3,0xd5b488,'plaster');
    box(facade,.35,.8,.18,.48,.55,.05,0x537e79);
    box(facade,-.55,.47,.18,.54,.9,.06,0x75533e,'wood');
    for(let k=0;k<4;k++)box(facade,-.8+k*.48,1.45,0,.4,.17,.4,0xead0a0,'stone');this.batch(facade);
    const roof=new T.Group();roof.position.set(-5.2,.26,3.3);roof.rotation.set(.23,-.45,-.18);this.wrecks.add(roof);
    for(let k=0;k<8;k++){const strip=box(roof,-1+k*.28,0,0,.28,.10,1.6,k%2?0xe4c798:0xb96f57,'wood');strip.rotation.x=(k%3)*.09;}
    box(roof,-.7,.22,.1,.11,.7,.11,0x80533b,'wood');this.batch(roof);
    const wall=new T.Group();wall.position.set(1.8,.18,1.35);wall.rotation.set(.4,-.25,-.1);this.wrecks.add(wall);
    box(wall,0,.3,0,2.6,.6,.7,0xc5ab80,'stone');
    for(let k=0;k<4;k++)box(wall,-1+k*.65,.7,0,.4,.25,.65,0xe0c698,'stone');this.batch(wall);
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
  private house(x:number,z:number,color:number,width:number,height:number,depth=1.3){
    const w=this.world,g=this.structure(x,z,.1+this.ruins.length*.012);g.userData.category="house";
    w.box(g,0,height/2,0,width,height,depth,color,'plaster');
    w.box(g,0,height+.09,0,width+.18,.18,depth+.2,0xf1dab2,'stone');
    w.box(g,0,height+.21,0,width-.24,.1,depth-.2,0xa78260,'stone');
    for(const dx of [-width/2,width/2])w.box(g,dx,height+.28,0,.13,.36,depth+.15,0xe7cba4,'stone');
    w.box(g,-.35,1.03,depth/2+.015,.8,2.06,.055,0x654c39,'wood');
    w.box(g,-.35,2.12,depth/2+.06,1.02,.16,.18,0xe7cf9f,'stone');
    w.box(g,-.35,.08,depth/2+.14,1.02,.16,.28,0xc4ab80,'stone');
    w.box(g,width*.25,height*.62,depth/2+.03,.48,.6,.04,0x527f7d);
    for(let k=0;k<3;k++)w.box(g,width*.25-.13+k*.13,height*.62,depth/2+.07,.035,.6,.035,0xe6c294,'wood');
  }
  private stall(x:number,z:number,color:number){
    const w=this.world,g=this.structure(x,z,.12+this.ruins.length*.01);g.userData.category="stall";
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
    this.lakeFall.update(time,p.drain<.9,w.reduced);
    this.outletFall.update(time,delivered&&t<5.8,w.reduced);
    this.outletRing.visible=delivered&&progress===0;
    this.outletRing.scale.setScalar(1+Math.sin(time*4)*.12);
    this.stream.visible=delivered&&t<4.6;
    this.stream.position.x=5+Math.sin(time*2)*.1;
    this.stream.position.z=-3.6+(w.reduced?.45:(time*.55)%1)*3.4;
    this.fronds.forEach((f,n)=>f.rotation.z=f.userData.baseTilt+(w.reduced?0:Math.sin(time*1.5+n)*.025));
    this.lakeGlints.forEach((g,n)=>{g.visible=p.drain<.9;g.scale.x=.7+Math.sin(time*1.3+n)*.3;});
    this.lake.scale.y=1;this.lake.position.y=1.24-p.drain*.025;
    this.lake.scale.set(2.55*(1-p.drain*.3),.61*(1-p.drain*.2),1);
    const jet=p.burst;
    this.effects.update(t,time);
    this.surgeFeed.visible=p.surge>0;this.surgeFeed.scale.y=1;
    // Retire the elevated support tile with the broken flume, before runoff crosses it.
    w.tiles[30].visible=p.collapse<.8;
    this.cracks.forEach((c,n)=>{c.visible=p.crack>0&&p.collapse<.8;c.scale.z=p.crack;c.scale.x=1+Math.sin(n)*p.crack;});
    for(const [n,r] of this.ruins.entries()){
      const fall=cityStructureFall(t,r.root.userData.category,r.delay),sink=fall*fall;
      r.root.position.copy(r.start);
      r.root.position.x*=1-fall*.18;r.root.position.z=T.MathUtils.lerp(r.start.z,4.1,fall*.23);
      r.root.position.y=-sink*6;
      r.root.rotation.set(fall*r.tilt,fall*(n%2?.3:-.25),-fall*r.tilt*.7);
      r.root.scale.setScalar(1);r.root.visible=fall<1;
      if(t>3&&t<4.7){r.root.position.x+=Math.sin(time*42+n)*p.crack*.035;}
    }
    if(t<4.2){this.well.rotation.z=Math.sin(time*35)*p.pressure*.025;}
    this.wrecks.visible=p.aftermath>0;this.wrecks.position.y=-.35*(1-p.aftermath);
    this.looseRocks.forEach(a=>{const fall=ease((t-4.5)/2);a.sprite.position.copy(a.start);a.sprite.position.y-=fall*5;a.sprite.visible=fall<1;});
    this.people.forEach((a,n)=>{
      const flee=ease((t-1.7-n*.09)/2.1),fall=ease((t-5.9-n*.24)/1.65);
      a.sprite.position.copy(a.start);a.sprite.position.x+= (n===2?1.65:n===0?-.55:.15)*flee;a.sprite.position.z+=(n===2?-.35:.1)*flee;
      a.sprite.position.lerp(new T.Vector3(0,-5,4.1),fall);
      a.sprite.scale.copy(a.scale).multiplyScalar(1-fall*.3);a.sprite.visible=fall<1;
      const frame=w.reduced?0:t>1&&t<6.5?1+Math.floor(time*9+n)%2:Math.floor(time*.6+n)%7===0?3:0;
      const alarm=this.alarms[n];alarm.position.copy(a.sprite.position);alarm.position.y+=2.4;alarm.visible=t>1+n*.09&&t<2.2+n*.09;
      a.sprite.userData.frame=frame;a.sprite.material=this.material(n%2?'shepherd':'villager',frame);
    });
    for(let n=0;n<90;n++){
      const age=(time+n*.071)%.85,a=n*2.399;
      this.dummy.position.set(-3+Math.cos(a)*(.4+age*1.7),3.6+age*1.9-age*age*6,5+Math.sin(a)*(.4+age*1.7));
      this.dummy.scale.setScalar(jet*(1-age/.85));this.dummy.rotation.set(a,age*5,a);this.dummy.updateMatrix();this.spray.setMatrixAt(n,this.dummy.matrix);
    }
    this.spray.instanceMatrix.needsUpdate=true;
    for(let n=0;n<100;n++){
      const age=Math.max(0,t-4.8-(n%9)*.32),a=n*2.399,r=4.5+(n%8)*.24;
      const settled=p.aftermath>0,live=age>0&&age<1.7;
      const x=Math.cos(a)*r,z=4.1+Math.sin(a)*r*.52;
      this.dummy.position.set(x,live?.4+age*(2.2+(n%3)*.5)-age*age*3.2:.26,z);
      this.dummy.rotation.set(n*.7+age*.5,n*2.1,n*.4);
      const scale=settled?p.aftermath*(n%3===0?2.1:1.25):live?(1-age/1.7)*1.8:0;
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
      const distance=Math.sqrt(x*x/55+(z-3.35)*(z-3.35)/18);
      const fall=ease((t-4.9-distance*1.7)/2.4);
      if(progress===0)continue;
      const edge=distance>1.05;
      tile.position.copy(start);tile.position.y-=fall*(edge?.15:4);
      tile.rotation.set(fall*(z-4.1)*(edge?.012:.2),0,-fall*x*(edge?.012:.1));tile.scale.y=1;
      tile.visible=edge||fall<1;
      for(const bank of w.banks.get(i)??[])bank.visible=bank.visible&&fall<.1;
    }
    // The aftermath retains torn market fabric and masonry around the open sinkhole.
    if(p.collapse>0){for(const [i,water]of w.waters)if(i>=32||i===30)water.visible=false;}
  }
  override dispose(){super.dispose();this.art.dispose();}
}
