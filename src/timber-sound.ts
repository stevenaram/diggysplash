let timber:AudioBuffer|undefined;
/** One cohesive snap and splinter tail, without an explosive bass hit. */
export function timberSound(ctx:AudioContext){
  if(!timber||timber.sampleRate!==ctx.sampleRate){
    timber=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.65),ctx.sampleRate);
    const data=timber.getChannelData(0);let low=0;
    for(let i=0;i<data.length;i++){
      const t=i/ctx.sampleRate,noise=Math.random()*2-1;low+=.22*(noise-low);
      let cracks=0;
      for(const at of [0,.033,.078,.14,.22]){const age=t-at;if(age>=0)cracks+=Math.exp(-age/(at===0?.035:.018))*(1-at*2);}
      const attack=Math.min(1,t/.002),tail=Math.exp(-t/.15);
      data[i]=attack*(low*cracks*.13+(noise-low)*cracks*.024+low*tail*.035)*Math.min(1,(.65-t)/.05);
    }
  }
  const src=ctx.createBufferSource();src.buffer=timber;src.connect(ctx.destination);src.start();src.onended=()=>src.disconnect();
}
