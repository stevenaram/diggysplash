export type CaravanCue='drink'|'hitch'|'throw'|'ambush'|'fire'|'hooves';
export function caravanSound(audio:AudioContext,cue:CaravanCue){
 const t=audio.currentTime,duration=cue==='throw'?.45:cue==='fire'?4.5:.22;

 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=buffer.getChannelData(0);let low=0;
 for(let i=0;i<d.length;i++){const age=i/d.length,n=Math.random()*2-1;low=low*.8+n*.2;const beat=cue==='hooves'?Math.pow(Math.max(0,Math.sin(age*Math.PI*3)),12):1;const crackle=cue==='fire'&&Math.random()>.997?n*.65:0;d[i]=(low+crackle)*Math.sin(age*Math.PI)*Math.pow(1-age,2)*beat;}
 const s=audio.createBufferSource(),g=audio.createGain();s.buffer=buffer;g.gain.value=cue==='ambush'?.18:.1;s.connect(g);g.connect(audio.destination);s.start();s.onended=()=>{s.disconnect();g.disconnect();};
}
