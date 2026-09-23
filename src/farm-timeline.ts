export const FARM_DURATION=20.4;
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** 20% faster farmer eating; 70% faster wolf feeding, with other beats intact. */
export function farmStoryTime(seconds:number){
 if(seconds<=3)return seconds;
 if(seconds<=8)return 3+(seconds-3)*1.2;
 if(seconds<=13)return seconds+1;
 const end=13+3.9/1.7;
 return seconds<=end?14+(seconds-13)*1.7:17.9+seconds-end;
}
export function farmPose(seconds:number){const t=farmStoryTime(seconds);return {grow:ease(t/2.5),feast:ease((t-3)/6),full:ease((t-3)/6),fall:ease((t-10)/1.5),wolves:ease((t-12)/2),eat:ease((t-14)/3.5),leave:ease((t-18)/4)};}
