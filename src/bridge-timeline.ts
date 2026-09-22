import {ramp} from './oasis-timeline';
export const BRIDGE_DURATION=12.6;
export function bridgeBeats(progress:number){
  const time=Math.max(0,Math.min(1,progress))*BRIDGE_DURATION;
  return {time,lower:ramp(time,.45,1.05),walk:bridgeWalkPose(time,0).progress,wobble:ramp(time,3.3,.8),runaway:ramp(time,4.3,.75),collapse:ramp(time,5.15,1.65),fall:ramp(time,5.45,1.45),tilt:ramp(time,6.4,.7),jump:ramp(time,8.05,1.65),alarm:time>7.35&&time<8.05};
}

/** Constant angular velocity through activation, release, and falling. */
export const wheelAngle=(time:number)=>-Math.max(0,time)*2.2;
/** Perspective-style recession without sending geometry through the cliff walls. */
export function ravineFall(time:number,start:number,duration=2.5){
  const p=ramp(time,start,duration);
  return {progress:p,scale:Math.max(.015,Math.pow(1-p,1.65)),depth:5.9*p};
}

// A separate small impact for the wheel, each walker, debris, and the final sheep.
export const ravineImpacts=[
  {time:7.85,z:3.9}, {time:7.92,z:5.3}, {time:8.02,z:5.6},
  {time:8.16,z:4.8}, {time:8.39,z:5.9}, {time:11.45,z:3.7},
] as const;

/** One uninterrupted, constant-speed walk; the collision interrupts it on the deck. */
export function bridgeWalkPose(time:number,actor:number){
  const start=.35+actor*.12,impact=5.05;
  const progress=Math.max(0,Math.min(1,(time-start)/(impact-start)));
  const x0=actor?-6.5:-4.8,x1=actor?2:3.4,z0=actor?6.7:6.2,z1=5.3+actor*.3;
  return {progress,moving:time>start&&time<impact,x:x0+(x1-x0)*progress,z:z0+(z1-z0)*progress};
}
