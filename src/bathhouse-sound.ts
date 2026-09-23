export type BathCue='fill'|'steam'|'drain'|'splat';
/** Original quiet water, steam and comically low drain bubbles. */
export function bathSound(audio:AudioContext,cue:BathCue){
 const duration=cue==='drain'?6:cue==='steam'?2:cue==='fill'?2.4:.45;
 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=buffer.getChannelData(0);let low=0;
 for(let i=0;i<d.length;i++){const t=i/audio.sampleRate,u=t/duration,n=Math.random()*2-1;low=low*.92+n*.08;const bubbles=cue==='drain'?Math.sin(t*(170-80*u)+Math.sin(t*17)*3)*Math.pow(Math.max(0,Math.sin(t*19)),4)*.35:0;d[i]=(low+bubbles+n*(cue==='steam'?.06:.01))*Math.min(1,t/.1)*Math.pow(1-u,cue==='drain'?.4:1.4);}
 const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=cue==='splat'?.2:.12;source.connect(gain);gain.connect(audio.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};
}
