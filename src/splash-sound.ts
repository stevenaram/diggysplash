let noise:AudioBuffer|undefined;
/** Soft impact, filtered spray, and descending bubbles instead of pitched UI beeps. */
export function splashSound(ctx:AudioContext){
  const t=ctx.currentTime;
  if(!noise||noise.sampleRate!==ctx.sampleRate){noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noise;
  filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(2100,t);filter.frequency.exponentialRampToValueAtTime(380,t+.36);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.15,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+.4);
  src.connect(filter).connect(gain).connect(ctx.destination);src.start(t);src.stop(t+.43);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  for(let n=0;n<3;n++){
    const osc=ctx.createOscillator(),env=ctx.createGain(),at=t+n*.047;
    osc.frequency.setValueAtTime(310+n*180+Math.random()*45,at);osc.frequency.exponentialRampToValueAtTime(100+n*45,at+.13);
    env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(.045-n*.009,at+.009);env.gain.exponentialRampToValueAtTime(.001,at+.16);
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
