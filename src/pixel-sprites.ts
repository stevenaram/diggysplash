import * as T from 'three';
import { TILE_SIZE } from './game';
import type { World } from './world';
import { drawPixel, PIXEL_SIZES, type PixelKind } from './oasis-pixels';

/** Shared asset bank: one artwork pixel is exactly 1/32 of a gameplay tile. */
export class PixelSprites {
  root = new T.Group();
  frames = new Map<string,T.SpriteMaterial>();
  constructor(public world:World) { world.root.add(this.root); }
  material(kind:PixelKind,frame=0,flip=false) {
    const key=`${kind}:${frame}:${flip}`;
    let material=this.frames.get(key);
    if(!material){
      const texture=new T.CanvasTexture(drawPixel(kind,frame));
      texture.colorSpace=T.SRGBColorSpace;
      texture.magFilter=texture.minFilter=T.NearestFilter;
      texture.generateMipmaps=false;
      if(flip){texture.repeat.x=-1;texture.offset.x=1;}
      material=new T.SpriteMaterial({map:texture,alphaTest:.5,transparent:false,depthWrite:true,toneMapped:false});
      this.frames.set(key,material);
    }
    return material;
  }
  add(kind:PixelKind,x:number,z:number) {
    const sprite=new T.Sprite(this.material(kind));
    sprite.name=`pixel-${kind}`;
    sprite.center.set(.5,0);
    const [width,height]=PIXEL_SIZES[kind];
    const pixelSize=TILE_SIZE/32;
    sprite.scale.set(width*pixelSize,height*pixelSize,1);
    sprite.position.set(x,.04,z);
    sprite.raycast=()=>{};
    this.root.add(sprite);
    return sprite;
  }
  /** Center the visible rock drawing (not its transparent canvas) over a tile.
   * Lift along the fixed viewing ray so its lower pixels stay above the ground. */
  addTileRock(x:number,z:number){
    const rock=this.add('rock',x,z);
    rock.center.set(.5,15/40);
    const lift=.75;
    rock.position.set(x,lift,z+lift/Math.tan(T.MathUtils.degToRad(this.world.viewAngles.x)));
    return rock;
  }
  dispose(){for(const m of this.frames.values()){m.map?.dispose();m.dispose();}this.frames.clear();}
}
