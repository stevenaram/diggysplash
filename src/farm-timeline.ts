export const FARM_DURATION=23;
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function farmPose(t:number){return {grow:ease(t/2.5),feast:ease((t-3)/6),full:ease((t-3)/6),fall:ease((t-10)/1.5),wolves:ease((t-12)/2),eat:ease((t-14)/3.5),leave:ease((t-18)/4)};}
