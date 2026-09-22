import {ramp} from './oasis-timeline';
/** One shared clock for the jaw and actor: align outside, enter, then close. */
export function swallowPose(time:number){
  const ready=ramp(time,6.15,.4),close=ramp(time,7.83,.34),release=ramp(time,8.2,.35);
  return {
    align:ready*(1-release),
    approach:ramp(time,6.6,.74),
    insert:ramp(time,7.36,.43),
    close,
    opening:.38*(1-ready)+1.43*ready*(1-close)+.38*release,
    lift:.62*ready*(1-close),
    hidden:time>=8.17,
  };
}
