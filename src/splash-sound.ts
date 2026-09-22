const splashes:AudioBuffer[]=[];
/** Layered water impact, turbulent spray and short resonant droplets, cached per device. */
function makeSplash(ctx:AudioContext,variant:number){
  const rate=ctx.sampleRate,duration=.58,buffer=ctx.createBuffer(1,Math.ceil(rate*duration),rate);
  const data=buffer.getChannelData(0);
  let low=0,mid=0,seed=1741+variant*7919;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const droplets=Array.from({length:18},(_,n)=>({
    start:.025+Math.pow(n/18,.8)*.29+random()*.012,
    hz:440+random()*1600,decay:.009+random()*.018,phase:0,
    gain:(.022+random()*.02)*(1-n/25),
  }));
  let peak=0;
  for(let i=0;i<data.length;i++){
    const t=i/rate,white=random()*2-1;
    // The initial cupped-water hit opens into a softer, irregular spray tail.
    low+=.035*(white-low);mid+=.24*(white-mid);
    const attack=1-Math.exp(-t/ .006);
    const body=attack*Math.exp(-t/ .065);
    const spray=(1-Math.exp(-t/.018))*Math.exp(-t/.105);
    const turbulence=.78+.14*Math.sin(t*173)+.08*Math.sin(t*317);
    let value=low*body*.9+(mid-low)*spray*.32*turbulence;
    // A faint high-frequency edge gives the splash definition without a harsh crack.
    value+=(white-mid)*attack*Math.exp(-t/.026)*.028;
    for(const drop of droplets){
      const age=t-drop.start;
      if(age<0||age>drop.decay*7)continue;
      drop.phase+=2*Math.PI*drop.hz*(1+.65*(1-Math.exp(-age/.014)))/rate;
      value+=Math.sin(drop.phase)*drop.gain*(1-Math.exp(-age/.0015))*Math.exp(-age/drop.decay);
    }
    value*=Math.min(1,(duration-t)/.04);
    data[i]=value;peak=Math.max(peak,Math.abs(value));
  }
  // Matched loudness across variants; safe headroom when connected tiles overlap.
  const gain=.042/Math.max(.001,peak);for(let i=0;i<data.length;i++)data[i]*=gain;
  return buffer;
}
let nextSplash=0;
export function splashSound(ctx:AudioContext){
  if(splashes[0]?.sampleRate!==ctx.sampleRate){splashes.length=0;for(let n=0;n<4;n++)splashes.push(makeSplash(ctx,n));}
  const source=ctx.createBufferSource();source.buffer=splashes[nextSplash++%splashes.length];
  source.connect(ctx.destination);source.start();source.onended=()=>source.disconnect();
}

export function scoopSound(ctx:AudioContext){
  const t=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;
  filter.type='lowpass';filter.frequency.value=850;gain.gain.value=.035;
  source.connect(filter).connect(gain).connect(ctx.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
