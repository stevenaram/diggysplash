export const CARAVAN_DURATION=30;
export const caravanEase=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function caravanPose(t:number){return {drink:caravanEase(t/2.5),hitch:caravanEase((t-2.5)/4),roll:caravanEase((t-7.5)/2),ambush:caravanEase((t-10)/2),defeat:caravanEase((t-12)/1.2),pile:caravanEase((t-13.5)/2),torch:caravanEase((t-17)/.8),fire:caravanEase((t-17.8)/.6),escape:caravanEase((t-19)/10)};}
/** The three cars follow the same road at a physical separation, including the U-turn. */
export function caravanRoad(distance:number){
 const straight=10.8,radius=1.4,arc=Math.PI*radius;
 if(distance<straight)return {x:-6+distance,z:-6,angle:0};
 if(distance<straight+arc){const a=(distance-straight)/radius;return {x:4.8+Math.sin(a)*radius,z:-4.6-Math.cos(a)*radius,angle:-a};}
 return {x:4.8-(distance-straight-arc),z:-3.2,angle:-Math.PI};
}
