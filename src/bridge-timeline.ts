import {ramp} from './oasis-timeline';
export const BRIDGE_DURATION=11.8;
export function bridgeBeats(progress:number){
  const time=Math.max(0,Math.min(1,progress))*BRIDGE_DURATION;
  return {time,lower:ramp(time,.2,1.3),walk:ramp(time,1.65,2.75),wobble:ramp(time,3.3,.8),runaway:ramp(time,4.3,.75),collapse:ramp(time,5.15,1.65),fall:ramp(time,5.45,1.45),tilt:ramp(time,6.4,.7),jump:ramp(time,8.05,1.65),alarm:time>7.35&&time<8.05};
}
