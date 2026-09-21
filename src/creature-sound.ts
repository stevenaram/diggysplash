export type CreatureCue='bloom'|'twist'|'roar'|'gasp'|'grab'|'gulp'|'uproot'|'sizzle';
const active=new Set<AudioScheduledSourceNode>();
const buffers=new WeakMap<AudioContext,AudioBuffer>();
export function stopCreatureSounds(){for(const s of active){try{s.stop();}catch{/* Already ended. */}}active.clear();}
/** Short synthesized foley, with no downloads or persistent audio loops. */
export function creatureSound(ctx:AudioContext,cue:CreatureCue){
  const t=ctx.currentTime;
  const track=(source:AudioScheduledSourceNode,nodes:AudioNode[],duration:number)=>{
    active.add(source);source.onended=()=>{active.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};source.start(t);source.stop(t+duration);
  };
  const tone=(from:number,to:number,duration:number,volume:number,type:OscillatorType='sine',vibrato=0)=>{
    const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.type=type;
    source.frequency.setValueAtTime(from,t);source.frequency.exponentialRampToValueAtTime(to,t+duration);
    filter.type='lowpass';filter.frequency.value=cue==='roar'?650:1800;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    if(vibrato){const lfo=ctx.createOscillator(),amount=ctx.createGain();lfo.frequency.value=23;amount.gain.value=vibrato;lfo.connect(amount);amount.connect(source.frequency);track(lfo,[amount],duration);}
    track(source,[filter,gain],duration);
  };
  const noise=(duration:number,from:number,to:number,volume:number)=>{
    let buffer=buffers.get(ctx);
    if(!buffer){buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const a=buffer.getChannelData(0);let seed=19;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=seed/2147483648-1;}buffers.set(ctx,buffer);}
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.Q.value=1.3;
    filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+duration);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);track(source,[filter,gain],duration);
  };
  if(cue==='bloom'){tone(260,620,.65,.035);tone(390,930,.8,.018);}
  if(cue==='twist'){noise(1.6,1800,150,.12);tone(125,48,1.4,.045,'sawtooth',13);}
  if(cue==='roar'){tone(135,38,1.5,.085,'sawtooth',19);tone(71,31,1.35,.045,'triangle',7);noise(1.4,950,180,.14);}
  if(cue==='gasp'){tone(570,1050,.32,.045,'triangle',21);noise(.22,1400,3000,.04);}
  if(cue==='grab'){noise(.32,260,2300,.1);tone(180,65,.32,.04,'triangle');}
  if(cue==='gulp'){tone(180,38,.7,.09,'sine',24);noise(.22,750,130,.07);}
  if(cue==='uproot'){noise(.85,1600,180,.13);tone(82,35,.7,.06,'triangle');}
  if(cue==='sizzle'){noise(2.2,3100,1500,.035);}
}
