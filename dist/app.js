import {newGame,derive,act,tick,restoreSave,PROJECTS,TOTAL_PARTS} from './engine.js';
import {createScene} from './scene.js';
import {createAudio} from './audio.js';
import {objectiveFor} from './interaction.js';
const $=id=>document.getElementById(id),canvas=$('world'),SAVE='giant-foundry-save-v1',PREFS='giant-foundry-settings-v1';
let state=newGame(),settings={volume:.5,sensitivity:1,quality:matchMedia('(max-width:700px)').matches?'balanced':'high',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
try{state=restoreSave(JSON.parse(localStorage.getItem(SAVE)));Object.assign(settings,JSON.parse(localStorage.getItem(PREFS))||{});}catch{}
settings.volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.5;settings.sensitivity=Number.isFinite(settings.sensitivity)?Math.max(.4,Math.min(2,settings.sensitivity)):1;settings.quality=settings.quality==='balanced'?'balanced':'high';settings.reduced=settings.reduced===true;
const sound=createAudio();sound.setVolume(settings.volume);
let world,playing=false,paused=false,dragPointer=null,lastX=0,lastY=0,lastTime=performance.now(),time=0,hudTime=0,saveTime=0,toastTimer,lastFocus,hadLock=false;
const keys=new Set(),pourSources=new Set(),interactSources=new Set();let interaction={action:null,point:null};
try{world=createScene(canvas,settings);world.resize();world.render(state,.016,0,{reduced:settings.reduced});$('loading').hidden=true;$('start').disabled=false;if(state.cursor>0||state.amount>0)$('start').textContent='Вернуться в мастерскую';}catch(e){$('loading').hidden=true;$('intro').hidden=true;$('error').hidden=false;$('error-message').textContent='Не удалось открыть 3D-сцену. Нужны WebGL 2 и аппаратное ускорение браузера. '+e.message;console.error(e);}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));localStorage.setItem(PREFS,JSON.stringify(settings));$('save-status').textContent='Прогресс сохранён';}catch{$('save-status').textContent='Не удалось сохранить';}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function clearInput(){pourSources.clear();interactSources.clear();dragPointer=null;keys.clear();}
function lock(){if(matchMedia('(pointer:coarse)').matches)return;try{canvas.requestPointerLock?.()?.catch(()=>toast('Для обзора удерживайте правую кнопку мыши. Стрелки тоже работают.'));}catch{toast('Для обзора удерживайте правую кнопку мыши.');}}
function unlock(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
function syncSettings(){$('volume').value=Math.round(settings.volume*100);$('sensitivity').value=settings.sensitivity;$('quality').value=settings.quality;$('reduced').checked=settings.reduced;$('sound').classList.toggle('muted',settings.volume===0);$('sound').setAttribute('aria-label',settings.volume===0?'Включить звук':'Выключить звук');$('sound').setAttribute('aria-pressed',String(settings.volume>0));sound.setVolume(settings.volume);}
function pause(value){paused=value;$('pause').hidden=!value;$('reset-confirm').hidden=true;if(value){lastFocus=document.activeElement;clearInput();unlock();save();$('resume').focus();}else{if(playing){canvas.focus();lock();}else lastFocus?.focus();}sound.setActive(playing&&!paused);updateHUD();}
function start(){playing=true;$('intro').hidden=true;$('hud').hidden=false;$('reticle').hidden=false;$('touch-walk').hidden=!matchMedia('(pointer:coarse)').matches;document.body.classList.add('in-game','first-person');sound.unlock();sound.setActive(true);world.setMode('play');canvas.focus();lock();updateHUD();}
function upgrade(){if(!playing||paused)return;const next=act(state,{type:'upgrade'});if(next===state)return;state=next;sound.cue('upgrade');toast(`${derive(state).tool.name} — поток ${derive(state).tool.flow.toLocaleString('ru-RU')} кг/с`);save();updateHUD();}
function triggerInteract(){if(!playing||paused||!$('finish').hidden)return;interaction=world.getInteraction(state);const type=interaction.action;if(!type||type==='open'||type==='charge')return;const previous=derive(state),next=act(state,{type,reachable:true});if(next===state)return;state=next;world.recordAction(type);sound.cue(type==='loadFurnace'?'open':'ui');if(type==='next'){if(state.phase==='finished'){$('finish').hidden=false;clearInput();unlock();sound.cue('complete');}else if(previous.part===2)toast(`${previous.project.name} теперь на набережной`);}save();updateHUD();}
function reset(){state=newGame();$('finish').hidden=true;$('reveal-card').hidden=true;clearInput();world.setMode(playing?'play':'intro');save();pause(false);updateHUD();}
$('start').onclick=start;$('settings-button').onclick=()=>pause(true);$('resume').onclick=()=>pause(false);$('upgrade').onclick=upgrade;
$('sound').onclick=()=>{settings.volume=settings.volume>0?0:.5;sound.unlock();syncSettings();save();};$('volume').oninput=e=>{settings.volume=Number(e.target.value)/100;sound.unlock();syncSettings();save();};$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);save();};$('quality').onchange=e=>{settings.quality=e.target.value;world.quality(settings.quality);save();};$('reduced').onchange=e=>{settings.reduced=e.target.checked;save();};
$('reset').onclick=()=>{$('reset-confirm').hidden=false;$('reset-no').focus();};$('reset-no').onclick=()=>{$('reset-confirm').hidden=true;$('reset').focus();};$('reset-yes').onclick=reset;$('explore').onclick=()=>{$('finish').hidden=true;canvas.focus();lock();};$('replay').onclick=()=>{$('finish').hidden=true;pause(true);$('reset-confirm').hidden=false;$('reset-no').focus();};
function bindHold(button,set,begin){button.addEventListener('pointerdown',e=>{if(!playing||paused)return;e.preventDefault();button.setPointerCapture(e.pointerId);set.add('pointer:'+e.pointerId);begin?.();});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>set.delete('pointer:'+e.pointerId));}
bindHold($('pour-hold'),pourSources,()=>sound.unlock());bindHold($('interact'),interactSources,triggerInteract);
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();pause(document.pointerLockElement===canvas?true:!paused);return;}
 if(paused){if(e.code==='Tab'){const focusable=[...$('pause').querySelectorAll('button:not(:disabled),input,select')].filter(el=>!el.closest('[hidden]'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
 if(!playing||!$('finish').hidden||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
 if(e.code==='Space'){pourSources.add('keyboard');sound.unlock();}
 if(e.code==='KeyE'){interactSources.add('keyboard');if(!e.repeat)triggerInteract();}
 if(e.code==='Enter'&&e.target===$('interact')){e.preventDefault();interactSources.add('enter');if(!e.repeat)triggerInteract();}
 if(!e.repeat&&e.code==='KeyU')upgrade();
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')pourSources.delete('keyboard');if(e.code==='KeyE')interactSources.delete('keyboard');if(e.code==='Enter')interactSources.delete('enter');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(!playing||paused||!$('finish').hidden)return;canvas.focus();lastX=e.clientX;lastY=e.clientY;if(e.button===2||e.pointerType==='touch'){dragPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);}else if(e.button===0){pourSources.add('pointer:'+e.pointerId);sound.unlock();if(document.pointerLockElement!==canvas)lock();}});
window.addEventListener('pointermove',e=>{if(!playing||paused||!$('finish').hidden)return;if(document.pointerLockElement===canvas)world.look(e.movementX,e.movementY,settings.sensitivity);else if(dragPointer===e.pointerId){world.look(e.clientX-lastX,e.clientY-lastY,settings.sensitivity);lastX=e.clientX;lastY=e.clientY;}});
for(const event of ['pointerup','pointercancel'])window.addEventListener(event,e=>{pourSources.delete('pointer:'+e.pointerId);interactSources.delete('pointer:'+e.pointerId);if(dragPointer===e.pointerId)dragPointer=null;});
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(hadLock&&!locked&&playing&&!paused&&$('finish').hidden)pause(true);hadLock=locked;});
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));}
window.addEventListener('blur',()=>{if(playing&&!paused)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){pause(true);save();}});window.addEventListener('pagehide',save);window.addEventListener('resize',()=>world?.resize());canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();save();clearInput();sound.setActive(false);playing=false;$('error').hidden=false;$('error-message').textContent='Графический контекст потерян. Прогресс сохранён. Перезагрузите мастерскую.';});
const format=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:1});
function updateHUD(){
 const d=derive(state),action=interaction.action,goal=objectiveFor(state);
 $('chapter').textContent=['ПЕРВОЕ ТВОРЕНИЕ','ВТОРОЕ ТВОРЕНИЕ','ТРЕТЬЕ ТВОРЕНИЕ','БОЛЬШОЙ ПРОЕКТ'][d.projectIndex];$('project-name').textContent=d.finished?'Город у тихого моря':d.project.name;$('project-subtitle').textContent=d.finished?'Мост готов. Смотровой остров открыт.':d.project.subtitle;$('chapter-count').textContent=`${state.completed} / ${PROJECTS.length}`;$('overall-progress').style.width=`${d.overall*100}%`;
 $('objective-name').textContent=goal.name;const pos=world?.camera.position;$('objective-distance').textContent=pos?`${Math.hypot(pos.x-goal.target.x,pos.z-goal.target.z).toFixed(1)} м`:'';
 $('material-status').textContent=state.charged?'Бронза подготовлена на всё изделие':d.materialsReady?`Набор тигля: ${Math.floor(state.chargeProgress*100)}%`:`В печи: ${state.loaded} / ${d.project.ingots} · в руках: ${state.ingots}`;
 $('stage-name').textContent=d.stageName;$('cast-progress').style.width=`${d.progress*100}%`;$('cast-percent').textContent=`${Math.floor(d.progress*100)}%`;$('stage-counter').textContent=`Часть ${d.part+1} из 3`;
 $('phase-label').textContent={pour:!d.materialsReady?'ПОДГОТОВЬТЕ БРОНЗУ':!state.charged?'НАБЕРИТЕ РАСПЛАВ':state.held?'НАПРАВЬТЕ НОСИК В ВОРОНКУ':'ВОЗЬМИТЕ ТИГЕЛЬ',cool:'МЕТАЛЛ ОСТЫВАЕТ',sealed:'ФОРМУ МОЖНО ОТКРЫТЬ',reveal:'РАЗДВИНЬТЕ СТВОРКИ',ready:'ОТЛИВКА ГОТОВА',finished:'ПУТЬ НА ОСТРОВ ОТКРЫТ'}[state.phase];
 $('tool-name').textContent=state.ingots?`Слитки в руках: ${state.ingots}`:state.held?d.tool.name+(state.charged?' · с бронзой':' · пустой'):d.tool.name+' · на стойке';$('tool-flow').textContent=`${format(d.tool.flow)} кг/с · перенос: ${d.tool.carry}`;$('credits').textContent=format(state.credits);$('upgrade').disabled=!d.canUpgrade;$('upgrade').classList.toggle('ready',d.canUpgrade);$('upgrade-name').textContent=d.nextTool?d.nextTool.name:'Тигель улучшен';$('upgrade-cost').textContent=d.nextTool?`${format(d.nextTool.cost)} ✧ · улучшить [U]`:'Все улучшения открыты';
 $('pour-hold').disabled=!state.held||!state.charged||state.phase!=='pour';$('pour-label').textContent='Наклонить тигель';$('interact').disabled=!action;$('interact-label').textContent={takeIngots:'Взять слитки',returnIngots:'Вернуть слитки',loadFurnace:'Загрузить печь',charge:'Набрать бронзу',pickUp:'Взять тигель',putDown:'Поставить тигель',open:'Тянуть створки',next:state.cursor===TOTAL_PARTS-1?'Открыть мост':'Следующая отливка'}[action]||'Подойдите к предмету';
 $('reticle').classList.toggle('on-target',!!interaction.point||!!action);$('reticle').classList.toggle('pouring',pourSources.size>0&&!!interaction.point);$('hint').hidden=false;
 const actionHints={takeIngots:`E — взять до ${d.tool.carry} слитков`,returnIngots:'E — вернуть слитки в запас',loadFurnace:'E — загрузить слитки в горячую печь',charge:'Удерживайте E — подставить тигель под кран',pickUp:'E — взять тигель за рукояти',putDown:'E — поставить тигель на стойку',open:'Удерживайте E, чтобы руками раздвинуть створки',next:'E — закончить работу с этой формой'};
 $('hint-text').textContent=actionHints[action]||(interaction.point?'Удерживайте ЛКМ или пробел — наклонить тигель':goal.name);
 $('reveal-card').hidden=state.phase!=='ready'||!playing;if(state.phase==='ready'){$('reveal-title').textContent=d.part===2?d.project.name:d.stageName;$('reveal-text').textContent=d.part===2?d.project.description:`+${d.project.rewards[d.part]} ✧ мастерства. Подойдите к ручкам формы и нажмите E.`;}
}
function frame(now){
 const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;if(!paused)time+=dt;
 let pouring=false,charging=false;
 if(playing&&!paused&&$('finish').hidden){
  world.move(Number(keys.has('KeyW'))-Number(keys.has('KeyS')),Number(keys.has('KeyD'))-Number(keys.has('KeyA')),dt);
  world.look((Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*420,(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')))*dt*340,settings.sensitivity);
  interaction=world.getInteraction(state);pouring=state.held&&state.charged&&state.phase==='pour'&&pourSources.size>0;charging=interactSources.size>0&&interaction.action==='charge';
  const oldPhase=state.phase,wasCharged=state.charged;state=tick(state,dt,{pouring,aimed:!!interaction.point&&interaction.readyToPour,opening:interactSources.size>0&&interaction.action==='open',reachable:interaction.action==='open',charging,chargeReachable:interaction.action==='charge'});
  if(!wasCharged&&state.charged){sound.cue('upgrade');toast('Тигель наполнен. Бронзы хватит на все части изделия.');save();}
  if(oldPhase!==state.phase){if(state.phase==='cool'){pourSources.clear();sound.cue('ui');}if(state.phase==='reveal')sound.cue('open');if(state.phase==='ready'){interactSources.clear();sound.cue('complete');save();}updateHUD();}
 }
 sound.update({pouring:pouring||charging,amount:derive(state).progress,heat:state.phase==='cool'?derive(state).heat:pouring?1:0},dt);world?.render(state,paused?0:dt,time,{pouring,charging,reduced:settings.reduced});if(now-hudTime>100){updateHUD();hudTime=now;}if(playing&&now-saveTime>5000){save();saveTime=now;}requestAnimationFrame(frame);
}
syncSettings();updateHUD();if(world)requestAnimationFrame(frame);
