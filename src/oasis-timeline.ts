/** Deterministic cutscene beats. Seeking, undo and reduced motion share this state. */
export const OASIS_DURATION = 20;
export const ramp = (time:number, start:number, duration:number) => {
  const t=Math.max(0,Math.min(1,(time-start)/duration));
  return t*t*(3-2*t);
};
export function oasisBeats(progress:number) {
  const time=Math.max(0,Math.min(1,progress))*OASIS_DURATION;
  return {
    time,
    bloom:ramp(time,0,1.6),
    grow:ramp(time,1.6,3),
    flee:ramp(time,4.6,2),
    swallow:ramp(time,6.6,1.3),
    palm:ramp(time,8.2,2.8),
    sheep:[0,1,2].map(i=>ramp(time,11.2+i*1.35,1.2)),
    fire:ramp(time,15.5,.8),
    settle:ramp(time,17,2),
  };
}
