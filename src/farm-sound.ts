export type FarmCue='harvest-chime'|'feast-pop'|'farm-fall'|'wolf-call';
/** Quiet original cues, kept separate from the digging mix. */
export function farmSound(audio:AudioContext,cue:FarmCue){
  const start=audio.currentTime;
  const notes=cue==='harvest-chime'?[523,659,784]:cue==='feast-pop'?[320,440]:cue==='farm-fall'?[90]:[340,349];
  notes.forEach((frequency,n)=>{
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    const at=start+n*.10,duration=cue==='wolf-call'?1.5:cue==='farm-fall'?.25:.22;
    oscillator.type=cue==='wolf-call'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,at);
    oscillator.frequency.exponentialRampToValueAtTime(cue==='wolf-call'?frequency*1.35:frequency*.55,at+duration*.45);
    oscillator.frequency.exponentialRampToValueAtTime(cue==='wolf-call'?frequency*.85:frequency*.4,at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(cue==='wolf-call'?.025:.045,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(at);oscillator.stop(at+duration);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
}
