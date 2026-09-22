import {ramp} from './oasis-timeline';
export const BRIDGE_DURATION=11.8;
export function bridgeBeats(progress:number){
  const time=Math.max(0,Math.min(1,progress))*BRIDGE_DURATION;
  return {time,lower:ramp(time,.45,1.05),walk:ramp(time,1.65,2.75),wobble:ramp(time,3.3,.8),runaway:ramp(time,4.3,.75),collapse:ramp(time,5.15,1.65),fall:ramp(time,5.45,1.45),tilt:ramp(time,6.4,.7),jump:ramp(time,8.05,1.65),alarm:time>7.35&&time<8.05};
}

/** Constant angular velocity through activation, release, and falling. */
export const wheelAngle=(time:number)=>-Math.max(0,time)*2.2;
/** Perspective-style recession without sending geometry through the cliff walls. */
export function ravineFall(time:number,start:number,duration=2.5){
  const p=ramp(time,start,duration);
  return {progress:p,scale:Math.max(.015,Math.pow(1-p,1.65)),depth:5.9*p};
}
