export const CITY_DURATION=15;
export const cityEase=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function cityPose(seconds:number){
  return {
    pressure:cityEase(seconds/.8),
    burst:cityEase((seconds-.85)/.25)*(1-cityEase((seconds-4.7)/1)),
    flood:cityEase((seconds-1.3)/2.4),
    crack:cityEase((seconds-3)/1.1),
    collapse:cityEase((seconds-4.2)/4),
    surge:cityEase((seconds-7.4)/1.3)*(1-cityEase((seconds-10.4)/2)),
    drain:cityEase((seconds-10)/3),
    aftermath:cityEase((seconds-11)/2),
  };
}
export const CITY_CUES=[{at:.88,cue:'geyser'},{at:4.2,cue:'collapse'},{at:7.5,cue:'flood'}] as const;

/** The well fails first, followed by the stalls, homes, and load-bearing wall. */
export function cityStructureFall(seconds:number,category:string|undefined,delay:number){
  const start=category==='well'?4.35:category==='stall'?5.15:category==='house'?6.1:6.65;
  return cityEase((seconds-start-delay*.65)/2.3);
}
