/** Rough excavation: irregular clods thrown up and away from a broad scoop.
 * Distances are world units (one tile = 2); sizes are multiples of one art pixel.
 */
export function dirtPose(j:number,time:number){
  const u=((j*7)%11)/10,v=((j*5+3)%13)/12;
  const age=time-(j%3)*.014,vy=2.4+v*1.7,gravity=9;
  const life=(vy+Math.sqrt(vy*vy+4*gravity*.08))/(2*gravity);
  const fade=Math.max(0,Math.min(1,(life-age)/.12));
  return {
    x:(u-.5)*1.15+(u-.5)*4.8*age,
    y:.08+vy*age-gravity*age*age,
    z:(v-.5)*1.05+(v-.5)*3.8*age,
    scale:j<11&&age>=0&&age<life?(j%4===0?1.5:1)*fade*fade*(3-2*fade):0,
    spin:age*(j%2?9:-7),
  };
}
