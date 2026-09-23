export const FARM_DURATION=18;
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function farmPose(t:number){return {grow:ease(t/2.5),feast:ease((t-3)/3),full:ease((t-6)/1.2),fall:ease((t-8)/1),wolves:ease((t-10)/2.5),eat:ease((t-13)/2.2),leave:ease((t-15.5)/2.5)};}
