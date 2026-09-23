export type CaravanCue='drink'|'hitch'|'whinny'|'ambush'|'fire'|'hooves';
export function caravanSound(audio:AudioContext,cue:CaravanCue){
 const t=audio.currentTime,duration=cue==='whinny'?.7:cue==='fire'?1.8:.22;
 if(cue==='whinny'){
  const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(520,t);o.frequency.linearRampToValueAtTime(850,t+.18);o.frequency.exponentialRampToValueAtTime(350,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};return;
 }
 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=buffer.getChannelData(0);let low=0;
 for(let i=0;i<d.length;i++){const age=i/d.length,n=Math.random()*2-1;low=low*.8+n*.2;const beat=cue==='hooves'?Math.pow(Math.max(0,Math.sin(age*Math.PI*3)),12):1;d[i]=low*Math.sin(age*Math.PI)*Math.pow(1-age,2)*beat;}
 const s=audio.createBufferSource(),g=audio.createGain();s.buffer=buffer;g.gain.value=cue==='ambush'?.18:.1;s.connect(g);g.connect(audio.destination);s.start();s.onended=()=>{s.disconnect();g.disconnect();};
}
