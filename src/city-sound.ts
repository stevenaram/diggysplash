export type CityCue='geyser'|'collapse'|'flood';
/** Short, original water/earth textures, triggered once at each story beat. */
export function citySound(audio:AudioContext,kind:CityCue){
  const duration=kind==='geyser'?2.8:kind==='collapse'?2.3:3;
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),data=buffer.getChannelData(0);
  let low=0;
  for(let i=0;i<data.length;i++){
    const t=i/audio.sampleRate,noise=Math.random()*2-1;low=low*.94+noise*.06;
    const bed=kind==='collapse'?low*3:noise*.25+low;
    const envelope=Math.min(1,t/.08)*Math.pow(1-t/duration,1.4);
    const cracks=kind==='collapse'?Math.pow(Math.max(0,Math.sin(t*41)*Math.sin(t*17)),18)*noise*.6:0;
    data[i]=(bed+cracks)*envelope;
  }
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='collapse'?650:kind==='geyser'?2200:1300;
  gain.gain.value=kind==='collapse'?.16:.10;
  source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
