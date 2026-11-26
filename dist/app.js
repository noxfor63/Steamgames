import {newGame, derive, act, tick, restoreSave, selectTargets, OBJECTS} from './engine.js';
import {createScene} from './scene.js';
const $=id=>document.getElementById(id), canvas=$('world');
const SAVE='big-breath-prototype-v2', SETTINGS='big-breath-settings-v1';
let state=newGame(),settings={sound:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:1};
try{state=restoreSave(JSON.parse(localStorage.getItem(SAVE)));Object.assign(settings,JSON.parse(localStorage.getItem(SETTINGS))||{});}catch{}
settings.sound=settings.sound===true;settings.reduced=settings.reduced===true;
settings.sensitivity=Number.isFinite(settings.sensitivity)?Math.max(.5,Math.min(2,settings.sensitivity)):1;
let world;
try{world=createScene(canvas);world.resize();$('loading').hidden=true;$('start').disabled=false;$('start').textContent=derive(state).volume>0?'Продолжить прогулку':'Вернуть парку лето';}
catch(error){$('loading').hidden=true;$('intro').hidden=true;$('error').hidden=false;$('error-message').textContent='Не удалось запустить WebGL 2. Проверьте аппаратное ускорение браузера. '+error.message;throw error;}
let playing=false,paused=false,holding=false,togglePump=false,dragging=false,targets=[],wasComplete=derive(state).completed,finishShown=derive(state).finished;
let hadPointerLock=false;
const keys=new Set();let last=performance.now(),time=0,lastSave=0,lastHUD=0,toastTimer;
let audioContext,wind,windGain,audioEnabled=false;
const format=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));localStorage.setItem(SETTINGS,JSON.stringify(settings));$('save-status').textContent='Прогресс сохранён';}catch{$('save-status').textContent='Хранилище недоступно';}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function initializeAudio(){
  if(audioContext)return;
  try{
    audioContext=new (window.AudioContext||window.webkitAudioContext)();
    const buffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4;
    wind=audioContext.createBufferSource();wind.buffer=buffer;wind.loop=true;
    const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
    windGain=audioContext.createGain();windGain.gain.value=0;wind.connect(filter);filter.connect(windGain);windGain.connect(audioContext.destination);wind.start();
  }catch{audioEnabled=false;}
}
function chime(){if(!audioContext||!audioEnabled)return;for(let i=0;i<3;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime+i*.09;osc.type='sine';osc.frequency.value=[523.25,659.25,783.99][i];gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.055,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.7);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.72);}}
function applySound(){audioEnabled=!!settings.sound;$('sound').textContent=audioEnabled?'Звук: вкл.':'Звук: выкл.';$('sound').setAttribute('aria-pressed',String(audioEnabled));$('sound').setAttribute('aria-label',audioEnabled?'Выключить звук':'Включить звук');if(audioEnabled){initializeAudio();audioContext?.resume().catch(()=>{});}}
function lock(){if(matchMedia('(pointer:coarse)').matches)return;try{const p=canvas.requestPointerLock?.();p?.catch(()=>toast('Тяните сцену правой кнопкой для обзора. Стрелки тоже работают.'));}catch{toast('Тяните сцену правой кнопкой для обзора.');}}
function release(){holding=false;togglePump=false;dragging=false;keys.clear();if(document.pointerLockElement)document.exitPointerLock();}
function setPaused(value){paused=value;$('pause').hidden=!value;if(value){release();save();}else{canvas.focus();lock();}$('reset-confirm').hidden=true;}
function upgrade(){const next=act(state,{type:'upgrade'});if(next!==state){state=next;chime();toast(`${derive(state).name}: поток ×${format(derive(state).multiplier)}`);save();updateHUD();}}
function toggle(){if(!playing||paused)return;togglePump=!togglePump;updateHUD();}
$('start').addEventListener('click',()=>{playing=true;$('intro').hidden=true;$('hud').hidden=false;applySound();canvas.focus();lock();toast('Направьте насадку на уточку и удерживайте левую кнопку.');});
$('pause-button').onclick=()=>setPaused(true);$('resume').onclick=()=>setPaused(false);$('upgrade').onclick=upgrade;$('pump').onclick=toggle;
$('sound').onclick=()=>{settings.sound=!settings.sound;applySound();save();};
$('reduce-motion').checked=settings.reduced;$('reduce-motion').onchange=e=>{settings.reduced=e.target.checked;save();};
$('sensitivity').value=settings.sensitivity;$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);};
$('reset').onclick=()=>{$('reset-confirm').hidden=false;};$('reset-no').onclick=()=>{$('reset-confirm').hidden=true;};
$('reset-yes').onclick=()=>{state=newGame();wasComplete=0;finishShown=false;world.camera.position.set(0,1.8,18);world.camera.rotation.set(-.12,0,0,'YXZ');save();setPaused(false);updateHUD();};
$('explore').onclick=()=>{$('finish').hidden=true;paused=false;canvas.focus();lock();};$('finish-pause').onclick=()=>{$('finish').hidden=true;setPaused(true);};
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement || !playing)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'){e.preventDefault();if(!e.repeat)setPaused(!paused);return;}
  if(paused)return;keys.add(e.code);
  if(!e.repeat&&e.code==='KeyE')upgrade();if(!e.repeat&&e.code==='KeyF')toggle();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(!playing||paused)return;canvas.focus();if(e.pointerType==='touch'||e.button===2){dragging=true;canvas.setPointerCapture(e.pointerId);}else if(e.button===0){holding=true;if(document.pointerLockElement!==canvas)lock();}});
window.addEventListener('pointerup',()=>{holding=false;dragging=false;});
window.addEventListener('pointercancel',()=>{holding=false;dragging=false;keys.clear();});
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(hadPointerLock&&!locked&&playing&&!paused&&$('finish').hidden)setPaused(true);hadPointerLock=locked;});
let touchX=0,touchY=0;
canvas.addEventListener('pointerdown',e=>{touchX=e.clientX;touchY=e.clientY;});
window.addEventListener('pointermove',e=>{if(!playing||paused)return;if(document.pointerLockElement===canvas||dragging){let dx=e.movementX,dy=e.movementY;if(e.pointerType==='touch'){dx=e.clientX-touchX;dy=e.clientY-touchY;touchX=e.clientX;touchY=e.clientY;}world.camera.rotation.y-=dx*.002*settings.sensitivity;world.camera.rotation.x=Math.max(-1.25,Math.min(1.25,world.camera.rotation.x-dy*.002*settings.sensitivity));}});
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));}
window.addEventListener('blur',()=>{if(playing&&!paused)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){setPaused(true);save();}});
window.addEventListener('pagehide',save);window.addEventListener('resize',()=>world.resize());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();save();release();playing=false;$('error').hidden=false;$('error-message').textContent='3D-контекст был потерян. Прогресс сохранён; перезагрузите страницу.';});
function updateHUD(){
  const s=derive(state);$('completed').textContent=s.completed;$('total').textContent=`/ ${s.total} форм`;$('percent').textContent=`${Math.floor(s.progress*100)}%`;$('park-bar').style.width=`${s.progress*100}%`;
  $('tool-name').textContent=s.name;$('flow').textContent=format(s.flow);$('power').textContent=`×${format(s.multiplier)}`;$('targets').textContent=`До ${s.targets} целей`;$('credits').textContent=format(state.credits);
  $('upgrade').disabled=!s.next||state.credits<s.next.cost;$('upgrade-label').textContent=s.next?'Усилить поток ×3':'Максимальная мощность';$('upgrade-cost').textContent=s.next?`${format(s.next.cost)} билетов · E`:'Все улучшения открыты';
  $('next-tool').textContent=s.next?`Дальше: ${s.next.name.toLowerCase()} · до ${s.next.targets} целей`:'Один поток поднимает целую площадку.';
  $('pump').setAttribute('aria-pressed',String(togglePump));$('pump').innerHTML=`${togglePump?'Выключить поток':'Включить поток'} <kbd>F</kbd>`;
  const z=world.camera.position.z;$('chapter').textContent=z>-8?'Дворик · всё начинается с уточки':z>-29?'Лагуна · пусть лето станет больше':'Парад · поднимите облачный корабль';
  const o=targets.length?OBJECTS[Number(targets[0])]:null;$('target').hidden=!o;
  if(o){const p=state.filled[Number(o.id)]/o.capacity;$('target-name').textContent=targets.length>1?`${o.name} + ${targets.length-1}`:o.name;$('target-percent').textContent=`${Math.floor(p*100)}%`;$('target-bar').style.width=`${p*100}%`;}
}
function frame(now){
  const dt=Math.min((now-last)/1000,.06);last=now;time+=dt;
  if(playing&&!paused){
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?9:5)*dt;
    const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),yaw=world.camera.rotation.y,norm=Math.max(1,Math.hypot(f,side));
    world.camera.position.x+=(-Math.sin(yaw)*f+Math.cos(yaw)*side)*speed/norm;world.camera.position.z+=(-Math.cos(yaw)*f-Math.sin(yaw)*side)*speed/norm;
    world.camera.position.x=Math.max(-26,Math.min(26,world.camera.position.x));world.camera.position.z=Math.max(-81,Math.min(26,world.camera.position.z));
    world.camera.rotation.y+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.4;
    world.camera.rotation.x=Math.max(-1.25,Math.min(1.25,world.camera.rotation.x+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt));
    targets=selectTargets(state,world.camera.position,world.getDirection());
    if(holding||togglePump)state=tick(state,dt,targets);
    const stats=derive(state);
    if(stats.completed>wasComplete){wasComplete=stats.completed;chime();toast(`${stats.completed} из ${stats.total} форм ожили`);save();}
    if(stats.finished&&!finishShown){finishShown=true;paused=true;release();$('finish').hidden=false;save();}
  }else targets=[];
  const pumping=playing&&!paused&&(holding||togglePump)&&targets.length>0;
  $('reticle').classList.toggle('active',pumping);
  if(windGain)windGain.gain.setTargetAtTime(pumping && audioEnabled ? .13 : 0,audioContext.currentTime,.12);
  world.render(state,dt,time,targets,pumping,settings.reduced);
  if(now-lastHUD>100){updateHUD();lastHUD=now;}
  if(playing&&now-lastSave>5000){save();lastSave=now;}
  requestAnimationFrame(frame);
}
updateHUD();requestAnimationFrame(frame);
