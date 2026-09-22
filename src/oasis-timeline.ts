import type { CreatureCue } from './creature-sound';
/** Deterministic cutscene beats. Seeking, undo and reduced motion share this state. */
export const LOOK_START=4;
export const EMOTE_START=LOOK_START+.2;
export const RUN_START=EMOTE_START+.4;
export const SNATCH_START=7;
export const ESCAPE_X=-5.3, ESCAPE_Z=6.2;
export const PALM_DURATION = 2.8 * .6;
export const PALM_END = 8.2 + PALM_DURATION;
export const SHEEP_START = PALM_END + .2;
export const FIRE_START = SHEEP_START + 4.3;
export const OASIS_DURATION = 20 - (2.8 - PALM_DURATION);
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
    look:time>=LOOK_START&&time<RUN_START,
    emote:time>=EMOTE_START&&time<RUN_START,
    flee:ramp(time,RUN_START,SNATCH_START-RUN_START),
    swallow:ramp(time,SNATCH_START,.9),
    palm:ramp(time,8.2,PALM_DURATION),
    sheep:[0,1,2].map(i=>ramp(time,SHEEP_START+i*1.35,1.2)),
    fire:ramp(time,FIRE_START,.8),
    settle:ramp(time,FIRE_START+1.5,2),
  };
}

const cues:readonly (readonly [number,CreatureCue])[]=[
  [.15,'bloom'],[1.6,'twist'],[3.8,'roar'],[EMOTE_START,'gasp'],[SNATCH_START-.16,'grab'],[7.75,'gulp'],[8.2,'uproot'],[SHEEP_START,'grab'],[SHEEP_START+1.35,'grab'],[SHEEP_START+2.7,'grab'],[FIRE_START,'sizzle'],
];
export function oasisCuesBetween(previous:number,current:number):CreatureCue[]{
  return current<=previous?[]:cues.filter(([at])=>previous<at&&current>=at).map(([,cue])=>cue);
}
