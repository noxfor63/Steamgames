// Original procedural sound design. No external recordings, autoplay or network requests.
export function createAudio(){
 let ctx,master,activeGain,seaGain,pourGain,metalGain,heatGain,pourFilter,started=false,volume=.5,active=false,lastCue=0;
 function init(){if(ctx)return;const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;ctx=new C();master=ctx.createGain();master.gain.value=volume*.75;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=22;compressor.ratio.value=3;master.connect(compressor);compressor.connect(ctx.destination);activeGain=ctx.createGain();activeGain.gain.value=0;activeGain.connect(master);
  const length=ctx.sampleRate*5,buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.02;data[i]=brown*5;}
  function noise(freq,q,gain){const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=q;const g=ctx.createGain();g.gain.value=gain;src.connect(filter);filter.connect(g);g.connect(activeGain);src.start();return {g,filter};}
  seaGain=noise(360,.45,.17).g;const p=noise(1050,.65,0);pourGain=p.g;pourFilter=p.filter;metalGain=noise(3100,2.5,0).g;
  const hum=ctx.createOscillator(),hum2=ctx.createOscillator();hum.type='sine';hum.frequency.value=63;hum2.type='sine';hum2.frequency.value=94.5;heatGain=ctx.createGain();heatGain.gain.value=.012;hum.connect(heatGain);hum2.connect(heatGain);heatGain.connect(activeGain);hum.start();hum2.start();
 }
 function unlock(){try{init();ctx?.resume().catch(()=>{});started=!!ctx;apply();}catch{started=false;}}
 function apply(){if(!started)return;master.gain.setTargetAtTime(volume*.75,ctx.currentTime,.12);activeGain.gain.setTargetAtTime(active?1:0,ctx.currentTime,.25);}
 function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));apply();}
 function setActive(v){active=!!v;apply();}
 function update({pouring=false,amount=0,heat=0}={}){if(!ctx||!started)return;const t=ctx.currentTime;pourGain.gain.setTargetAtTime(pouring?.23:0,t,.14);metalGain.gain.setTargetAtTime(pouring?.019:0,t,.1);pourFilter.frequency.setTargetAtTime(750+Math.max(0,Math.min(1,amount))*430+Math.sin(t*2.1)*70,t,.14);seaGain.gain.setTargetAtTime(.115+Math.sin(t*.23)*.035,t,.8);heatGain.gain.setTargetAtTime(.012+Math.max(0,heat)*.012,t,.4);}
 function cue(name){if(!ctx||!active||volume===0)return;const now=ctx.currentTime;if(now-lastCue<.08)return;lastCue=now;
  const notes=name==='complete'?[293.66,440,587.33]:name==='upgrade'?[220,330,440]:name==='open'?[130.81,196]:[440];
  for(let i=0;i<notes.length;i++){const at=now+i*(name==='complete'?.17:.07);for(let j=0;j<3;j++){const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.value=notes[i]*[1,2.01,3.98][j];g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime((name==='ui'?.012:.035)/((j+1)**2),at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+(name==='complete'?2.2:.8)/(j+1));osc.connect(g);g.connect(master);osc.start(at);osc.stop(at+2.5);osc.onended=()=>{osc.disconnect();g.disconnect();};}}
  if(name==='open'){const b=ctx.createBuffer(1,ctx.sampleRate*.32,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*9)*.18;const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;src.buffer=b;src.connect(f);f.connect(master);src.start(now);src.onended=()=>{src.disconnect();f.disconnect();};}
 }
 return {unlock,setVolume,setActive,update,cue};
}
