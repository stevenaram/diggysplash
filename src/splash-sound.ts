let noise:AudioBuffer|undefined;
/** Soft impact, filtered spray, and descending bubbles instead of pitched UI beeps. */
export function splashSound(ctx:AudioContext){
  const t=ctx.currentTime;
  if(!noise||noise.sampleRate!==ctx.sampleRate){noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noise;
  filter.type='lowpass';filter.Q.value=.45;filter.frequency.setValueAtTime(1800,t);filter.frequency.exponentialRampToValueAtTime(550,t+.3);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.028);gain.gain.exponentialRampToValueAtTime(.001,t+.4);
  src.connect(filter).connect(gain).connect(ctx.destination);src.start(t);src.stop(t+.43);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  for(let n=0;n<2;n++){
    const osc=ctx.createOscillator(),env=ctx.createGain(),at=t+.035+n*.065;
    osc.frequency.setValueAtTime(620+n*130+Math.random()*35,at);osc.frequency.exponentialRampToValueAtTime(250+n*55,at+.09);
    env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(.012-n*.003,at+.015);env.gain.exponentialRampToValueAtTime(.001,at+.16);
    osc.connect(env).connect(ctx.destination);osc.start(at);osc.stop(at+.18);osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
}

export function scoopSound(ctx:AudioContext){
  const t=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;
  filter.type='lowpass';filter.frequency.value=1200;gain.gain.value=.1;
  source.connect(filter).connect(gain).connect(ctx.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
