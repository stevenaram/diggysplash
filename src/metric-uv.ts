import * as T from 'three';
/** Project each complete triangle in one plane. Interpolating different axis choices
 * within a triangle stretches texels, especially on narrow curved palm leaflets. */
export function metricUV(source:T.BufferGeometry):T.BufferGeometry {
  const g=source.index?source.toNonIndexed():source;
  const p=g.getAttribute('position'),uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
    normal.crossVectors(b.sub(a),c.sub(a));
    const x=Math.abs(normal.x),y=Math.abs(normal.y),z=Math.abs(normal.z);
    for(let j=i;j<i+3;j++)uv.setXY(j,(x>z?p.getZ(j):p.getX(j))/2,(y>Math.max(x,z)?p.getZ(j):p.getY(j))/2);
  }
  g.setAttribute('uv',uv);return g;
}
