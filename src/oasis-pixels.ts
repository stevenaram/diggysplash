/** Original pixel drawings, deliberately rasterized without antialiasing. */
export type PixelKind = 'villager' | 'shepherd' | 'sheep' | 'palm' | 'rock' | 'grass' | 'basket' | 'blanket' | 'heart' | 'pebble' | 'dust' | 'wheat' | 'bread' | 'sack' | 'flower' | 'jug' | 'camp-rug';
/** Every source pixel occupies 1/32 of a tile; small props get small drawings. */
export const PIXEL_SIZES: Record<PixelKind, readonly [number, number]> = {
  villager: [32, 40], shepherd: [32, 40], sheep: [32, 40], palm: [64, 72], rock: [32, 40],
  grass: [10, 12], basket: [16, 16], blanket: [22, 12], heart: [12, 12],
  pebble: [8, 6], dust: [3, 3], wheat:[20,24], bread:[18,12], sack:[14,20], flower:[28,36], jug:[16,24], 'camp-rug':[48,24],
};
export function drawPixel(kind: PixelKind, frame = 0): HTMLCanvasElement {
  const [w, h] = PIXEL_SIZES[kind];
  const pixels: (string | undefined)[] = Array(w*h);
  const dot = (x:number,y:number,c:string) => { x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<w&&y<h)pixels[y*w+x]=c==='#00000000'?undefined:c; };
  const rect = (x:number,y:number,a:number,b:number,c:string) => {for(let j=y;j<y+b;j++)for(let i=x;i<x+a;i++)dot(i,j,c);};
  const oval = (x:number,y:number,rx:number,ry:number,c:string) => {for(let j=Math.floor(y-ry);j<=y+ry;j++)for(let i=Math.floor(x-rx);i<=x+rx;i++)if(((i-x)/rx)**2+((j-y)/ry)**2<=1)dot(i,j,c);};
  const poly = (points:number[][],c:string) => {for(let y=0;y<h;y++)for(let x=0;x<w;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)dot(x,y,c);}};
  const ink='#494353', deep='#706052', tan='#aa805b', gold='#d6ac67', light='#f0d294';
  if(kind==='camp-rug') {
    rect(2,2,44,20,'#a6574d');rect(4,4,40,16,'#d3996c');rect(6,6,36,12,'#814e49');
    for(let x=4;x<45;x+=4){rect(x,0,2,2,'#e8c799');rect(x,22,2,2,'#e8c799');}
    for(const x of [13,24,35]){
      poly([[x,7],[x+5,12],[x,17],[x-5,12]],'#edcb95');
      poly([[x,10],[x+2,12],[x,14],[x-2,12]],'#5e8172');
    }
    for(let x=5;x<43;x+=3){dot(x,4,'#f4d9aa');dot(x,19,'#f4d9aa');}
  } else if(kind==='jug') {
    oval(8,16,6,6,'#8e5144');oval(7,15,5,5,'#c57f59');
    oval(6,14,3,4,'#e5ab71');rect(5,5,6,9,'#ba714f');rect(5,6,2,8,'#df9a63');
    oval(8,5,4,2,'#e4b27a');oval(8,5,2,1,'#594944');
    oval(12,12,3,4,'#9d6047');oval(12,12,1,2,'#00000000');
    rect(3,17,10,2,'#ead0a0');rect(5,18,2,1,'#9f6150');rect(9,18,2,1,'#9f6150');
  } else if(kind==='flower') {
    const wilt=frame===0,twist=frame===3;
    const stem=twist?'#474f3c':wilt?'#7a8352':'#43734a';
    const x=wilt?18:twist?17:14,y=wilt?18:twist?11:frame===1?11:8;
    // A tall hooked stem, hanging petals and folded leaves make thirst readable.
    poly(wilt?[[12,33],[12,20],[10,13],[12,9],[16,9],[20,12],[19,17],[17,17],[17,13],[15,12],[13,12],[13,15],[15,21],[15,33]]:
      [[12,33],[13,21],[11,16],[12,8],[15,7],[16,10],[14,18],[16,23],[15,33]],stem);
    poly(wilt?[[13,25],[7,21],[3,22],[5,27],[10,29],[13,28]]:[[13,25],[5,18],[2,19],[5,25],[11,28]],wilt?'#91945f':'#79a55c');
    poly(wilt?[[15,28],[19,24],[24,25],[22,30],[17,31]]:[[15,28],[20,20],[25,21],[23,27],[17,30]],wilt?'#717d4f':'#538950');
    poly([[5,23],[10,25],[12,27],[8,25]],'#b4b27a');
    const edge=twist?'#673449':wilt?'#b9798a':'#c56c92';
    const petal=twist?'#a44f72':wilt?'#e0a6ac':'#f0aac1';
    const shine=twist?'#ce748b':wilt?'#f0c8bc':'#ffdacd';
    for(const [dx,dy] of [[-5,0],[-3,-4],[2,-5],[5,-1],[3,4],[-2,5]]){
      const py=y+Math.round(dy*(wilt?.65:1))+(wilt&&dy>0?2:0);
      oval(x+dx,py,3,4,edge);oval(x+dx,py-1,2,3,petal);dot(x+dx-1,py-2,shine);
    }
    oval(x,y,4,3,'#97613e');oval(x,y-1,3,2,'#ebbb61');
    rect(x-2,y-2,3,1,'#ffe29a');dot(x+1,y,'#b88242');dot(x-1,y+1,'#754d3c');
    if(twist){poly([[12,30],[8,27],[12,28]],'#583946');poly([[15,24],[20,21],[16,25]],'#583946');}
  } else if(kind==='shepherd'||kind==='villager') {
    // Human frames 6/7/8 are rear idle / left step / right step.
    const rear=frame>=6&&frame<=8, pose=rear?frame-6:frame>=10?1+(frame%2):frame;
    const walking=pose===1||pose===2, step=pose===2?1:0;
    const bob=walking?step:0;
    rect(10,32,4,4+step,deep);rect(18,32,4,5-step,deep);
    rect(9,36+step,6,2,ink);rect(18,37-step,6,2,ink);
    poly([[9,22],[22,22],[24,33],[19,35],[9,33]],'#366c68');
    poly([[10,23],[17,24],[17,33],[11,32]],'#5b9f88');
    rect(11,24,2,6,'#87b59a');rect(10,30,13,2,tan);dot(17,30,light);
    rect(7,24+bob,3,7,gold);rect(21,24-bob,3,6,gold);
    rect(8,25+bob,2,3,light);rect(22,26-bob,3,3,'#eec28d');
    // Curved crook is part of every frame, never a rotating 3D limb.
    if(kind==='shepherd'&&frame<12){rect(27,16,2,22,tan);rect(25,13,5,2,gold);rect(24,15,2,4,gold);rect(25,18,2,2,deep);}
    oval(16,17+bob,7,7,tan);oval(16,16+bob,6,6,'#efc496');
    rect(11,12+bob,10,2,'#81604d');rect(10,14+bob,2,5,'#81604d');rect(21,14+bob,2,4,'#81604d');
    rect(12,18+bob,2,2,ink);rect(19,18+bob,2,2,ink);
    if(frame===3){rect(12,18+bob,2,2,'#efc496');rect(19,18+bob,2,2,'#efc496');dot(12,19,ink);dot(19,19,ink);}
    dot(16,21+bob,'#c78e68');rect(14,23+bob,5,2,'#765249');
    if(rear) {
      // Back of the head: hair and nape, never front-facing eyes or a beard.
      oval(16,17+bob,7,7,'#654c42');
      oval(16,16+bob,6,6,'#81604d');
      rect(12,16+bob,2,5,'#a27b58');rect(19,17+bob,2,5,'#70513f');
      rect(14,23+bob,5,2,'#d4a078');
      rect(11,25,11,5,'#5b9f88');rect(16,25,1,5,'#366c68');
      // A small rear satchel and shoulder straps make direction legible at phone size.
      rect(11,24,2,7,deep);rect(20,24,2,7,deep);
      rect(12,27,9,6,deep);rect(13,27,7,5,tan);rect(13,27,7,2,gold);dot(16,30,light);
      rect(10,35+step,3,1,tan);rect(19,36-step,3,1,tan);
    }
    oval(16,11+bob,12,3,tan);oval(16,10+bob,12,3,gold);
    poly([[9,10+bob],[10,4+bob],[13,2+bob],[21,3+bob],[23,10+bob]],gold);
    rect(12,4+bob,7,3,light);rect(10,8+bob,13,2,'#947249');rect(7,10+bob,16,1,light);
    if(frame>=9){
      // Readable front-facing panic: wide eyes, open mouth, raised / flailing arms.
      rect(11,17+bob,4,3,'#fff5d8');rect(18,17+bob,4,3,'#fff5d8');
      dot(13,18+bob,ink);dot(19,18+bob,ink);
      oval(17,23+bob,2,2,ink);dot(17,24+bob,'#d78b86');
      rect(7,24,3,8,'#00000000');rect(22,24,4,7,'#00000000');
      const lift=frame>=12?(frame%2?3:0):2;
      poly([[10,25],[7,23],[4,18-lift],[6,17-lift],[10,22]],'#5b9f88');
      rect(4,15-lift,3,3,'#efc496');
      poly([[21,25],[25,22],[28,17+lift],[26,16+lift],[22,21]],'#5b9f88');
      rect(26,14+lift,3,3,'#efc496');
      rect(3,10,2,3,'#6bcbd0');dot(3,9,'#b5efdf');
    }
  } else if(kind==='sheep') {
    const walk=frame===1||frame===2, step=frame===2?1:0, drink=frame===4||frame===5;
    rect(7,30,3,5+(walk?step:0),deep);rect(13,31,3,4-(walk?step:0),ink);rect(22,30,3,5-(walk?step:0),deep);
    oval(14,26,11,7,'#bdb9a6');
    for(const [x,y,r] of [[6,24,4],[10,21,5],[16,20,5],[21,23,5],[20,28,5],[12,28,5],[6,28,4]]){
      oval(x,y,r,r,'#e3dec5');oval(x-1,y-1,r-1,r-1,'#fff5d8');
    }
    rect(8,25,2,2,'#d1cdb5');rect(17,22,2,2,'#e3dec5');rect(13,29,2,1,'#bdb9a6');
    const y=drink?28+(frame===5?1:0):23;
    oval(25,y,4,5,'#796a60');oval(26,y-1,3,3,'#a28c74');
    oval(22,y-5,3,2,deep);rect(21,y-5,3,1,'#dca998');
    oval(27,y-5,3,2,deep);dot(27,y-5,'#dca998');
    dot(27,y-1,frame===3?'#796a60':ink);dot(28,y+3,ink);
    if(!drink){oval(24,18,4,2,'#fff5d8');dot(22,18,'#e3dec5');}
    oval(3,25,2,2,'#fff5d8');
  } else if(kind==='palm') {
    const sway=frame===1?1:0;
    poly([[27,68],[37,68],[37,61],[35,49],[35,35],[32,24],[28,24],[30,42],[28,57]],deep);
    poly([[29,66],[34,66],[33,54],[33,42],[31,27],[29,27],[31,44]],gold);
    for(let k=0;k<7;k++){const y=36+k*4;rect(29+(k<3?1:0),y,6,2,tan);dot(30,y,light);}
    // Broad stepped fronds have shaded edges, central ribs and broken tips.
    const leaves=[[[31,25],[22,14],[10,12],[2,18],[12,15],[24,23]],[[30,25],[16,20],[4,25],[1,37],[8,29],[21,28]],[[31,25],[18,27],[11,37],[12,46],[17,35],[28,29]],[[32,24],[31,9],[24,3],[20,3],[27,13],[28,25]],[[33,24],[40,10],[50,7],[59,10],[47,12],[38,26]],[[34,25],[48,17],[58,21],[63,29],[54,24],[42,25]],[[34,27],[46,27],[55,35],[57,45],[49,38],[39,30]],[[32,27],[37,34],[36,46],[32,52],[32,38],[29,29]]];
    for(const [i,shape] of leaves.entries()){
      const p=shape.map(([x,y])=>[x+(y<25?sway:0),y]);poly(p,'#315951');
      poly(p.map(([x,y])=>[Math.round(x*.87+32*.13),y-2]),i%2?'#518754':'#689f59');
      poly([p[0],p[1],[p[2][0],p[2][1]-1],[p[1][0],p[1][1]+2]],'#a0bd66');
    }
    oval(29,28,3,3,tan);oval(35,28,3,3,deep);dot(28,27,gold);dot(34,27,tan);
  } else if(kind==='wheat') {
    const stalk=frame===0?'#947957':frame===1?'#639357':'#bd8c42';
    for(let n=0;n<3;n++) {
      const x=4+n*6+(frame===3?1:0), top=frame===0?15:frame===1?10:4+n%2;
      rect(x,top,1,22-top,stalk);
      poly([[x,20],[x-3,16],[x-2,16],[x,18]],frame===0?'#aa8e63':'#85a55d');
      if(frame>1)for(let y=top;y<top+9;y+=3){rect(x-2,y,2,2,'#e8bd62');rect(x+1,y+1,2,2,'#f3d58b');}
      else {dot(x-1,top,stalk);dot(x+1,top+2,stalk);}
    }
  } else if(kind==='bread') {
    oval(9,7,7,3,'#9d6540');oval(8,6,7,3,'#d89e55');
    rect(4,4,9,1,'#edc57b');
    for(const x of [4,8,12]){rect(x,5,1,3,'#f8deb0');dot(x+1,5,'#ac753e');}
  } else if(kind==='sack') {
    poly([[4,3],[10,3],[9,7],[12,11],[12,18],[2,18],[2,11],[5,7]],'#b4986b');
    poly([[5,8],[8,8],[10,12],[10,17],[4,17],[3,12]],'#e4cc98');
    rect(4,6,6,2,'#85684b');rect(6,11,2,4,'#bd9e65');dot(5,12,'#bd9e65');dot(8,13,'#bd9e65');
  } else if(kind==='rock') {
    poly([[4,33],[3,26],[8,17],[17,14],[25,20],[29,31],[23,36],[10,36]],'#8f8581');
    poly([[5,26],[10,18],[18,16],[24,21],[21,27],[12,29]],'#d6c3a1');
    poly([[12,29],[21,27],[24,21],[28,31],[22,34]],'#b09b83');
    poly([[7,25],[11,19],[17,18],[14,23]],'#e6d5b1');rect(7,31,3,2,'#b09b83');
  } else if(kind==='pebble') {
    poly([[1,4],[2,2],[4,1],[6,2],[7,4],[5,5],[2,5]],'#ad9982');
    rect(2,2,3,2,'#ddc9a5');dot(3,2,'#efdfb9');
  } else if(kind==='dust') {
    dot(1,1,tan);
  } else if(kind==='grass') {
    poly([[2,10],[1,5],[4,7],[4,2],[6,6],[8,4],[7,10]],'#427a54');
    rect(4,5,1,5,'#84af62');dot(6,8,'#a4bf6c');
    if(frame){dot(3,3,'#eddaa0');dot(7,5,'#d8bd66');}
  } else if(kind==='basket') {
    oval(8,6,5,5,deep);oval(8,6,3,3,gold);
    rect(6,4,4,4,'#00000000');
    rect(2,8,12,6,tan);rect(3,9,10,4,gold);rect(2,8,12,1,light);
    for(let x=4;x<13;x+=3){dot(x,10,tan);dot(x-1,12,tan);}
  } else if(kind==='blanket') {
    poly([[2,2],[16,2],[20,9],[5,10]],'#986151');
    poly([[3,3],[15,3],[18,8],[5,9]],'#c47e5f');
    for(let x=5;x<16;x+=4)poly([[x,3],[x+1,3],[x+4,8],[x+2,8]],'#efd4a0');
    oval(4,6,2,3,deep);rect(3,4,2,4,'#db9f72');dot(3,4,light);
  } else if(kind==='heart') {
    poly([[6,10],[1,5],[1,3],[3,1],[6,3],[9,1],[11,3],[11,5]],'#ae5364');
    poly([[6,8],[2,4],[3,2],[6,4],[9,2],[10,4]],'#f18d95');dot(3,3,'#ffceba');
  }
  if(kind==='villager'){
    const colors:Record<string,string>={'#366c68':'#985744','#5b9f88':'#c58358','#87b59a':'#edb782'};
    for(let i=0;i<pixels.length;i++)if(pixels[i]&&colors[pixels[i]!])pixels[i]=colors[pixels[i]!];
  }
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d')!;
  // One-pixel, colored silhouette outline. Interior pixels remain crisp clusters.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!pixels[y*w+x]&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>a>=0&&b>=0&&a<w&&b<h&&pixels[b*w+a])){ctx.fillStyle=ink;ctx.fillRect(x,y,1,1);}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=pixels[y*w+x];if(c){ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}}
  return canvas;
}
