import { newGame, act, derive, tick } from './engine.js';
import { TownScene } from './scene.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'springtown.port.v1';
const metadata = {
  train: { name: 'Заводной поезд', desc: 'Доставит детали с дальнего склада.', icon: '▤' },
  crane: { name: 'Портовый кран', desc: 'Освободит пристань от старых ящиков.', icon: '⌁' },
  mill: { name: 'Старая мельница', desc: 'Отполирует детали в своём барабане.', icon: '✣' },
};
let state = newGame(), selected = 'crane', tool = 'brush', history = [], pointer = null;
let soundEnabled = false, audio = null, toastTimer, lastFrame = performance.now(), lastUI = 0, lastSave = 0;
let announcedUnlock = false, shownWin = false, previousCompleted = false, storageAvailable = true;
let stroke = null, lastBrushSound = 0;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved?.version === 1) state = tick(saved, 0);
  state.running = false;
  announcedUnlock = derive(state).unlockedAlternating;
  shownWin = state.everCompleted;
  previousCompleted = derive(state).completed;
} catch { /* A missing or outdated save simply starts a new workshop. */ }
const canvas = $('town');
const scene = new TownScene(canvas, id => select(id));

function toast(message) {
  if (!message) return;
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3900);
}
function tone(frequency = 440, duration = .08, volume = .035) {
  if (!soundEnabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { soundEnabled = false; }
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch {
    storageAvailable = false;
    $('save-status').textContent = 'Сохранение недоступно в этом браузере';
  }
}
function remember() {
  history.push(structuredClone(state));
  if (history.length > 30) history.shift();
}
function action(type, payload = {}, options = {}) {
  const result = act(state, type, payload);
  if (result.changed) {
    if (!options.noHistory) remember();
    state = result.state;
    if (type !== 'clean') tone(type === 'repair' ? 660 : 390, .13);
    if (type !== 'clean' || result.message) save();
  }
  if (!options.silent) toast(result.message);
  updateUI();
  return result;
}
function select(id) {
  if (!metadata[id]) return;
  selected = id; updateUI();
}
function chooseTool(next) {
  tool = next;
  document.querySelectorAll('[data-tool]').forEach(button => {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  canvas.style.cursor = tool === 'brush' ? 'crosshair' : 'pointer';
  updateUI();
}
function setText(id, text) { if ($(id).textContent !== text) $(id).textContent = text; }
function objective(d) {
  if (d.completed) return 'Порт снова живёт. Попробуйте переставить редуктор и собрать другую схему.';
  if (d.overloaded) return 'Пружина перегружена. Отключите один механизм или включите работу по очереди.';
  const dirty = Object.keys(metadata).find(id => state.machines[id].clean < 1);
  const unrepaired = Object.keys(metadata).find(id => !state.machines[id].repaired);
  if (d.restoredCount === 0) return 'Смахните пыль с механизма. Зажмите мышь и проведите по нему щёткой.';
  if (!d.unlockedAlternating && !d.connected.length) return 'Подключите поезд или кран ремнём. Первый заказ откроет переключатель.';
  if (d.connected.length && !state.running) return 'Поверните ключ «Завести город» и наблюдайте за работой механизма.';
  if (!d.unlockedAlternating && state.running) return 'Первая работа уже идёт. Пока механизм занят, можно восстановить остальные.';
  if (dirty) return `Теперь очистите ${dirty === 'train' ? 'поезд' : dirty === 'crane' ? 'кран' : 'мельницу'}. Переключатель уже доступен.`;
  if (unrepaired) return 'Установите шестерни во все очищенные механизмы.';
  if (state.mode === 'direct') return 'Включите переключатель: поезд и кран будут работать по очереди.';
  if (d.connected.length < 3) return 'Подключите все три механизма и завершите работу порта.';
  return 'Ваша схема работает. Дождитесь завершения трёх заказов.';
}
function updateUI() {
  const m = state.machines[selected], data = metadata[selected], d = derive(state);
  setText('restore-count', `${d.restoredCount} / 3`);
  setText('machine-name', data.name); setText('machine-description', data.desc); setText('machine-icon', data.icon);
  setText('machine-tag', m.repaired ? 'Восстановлен' : m.clean >= 1 ? 'Готов к ремонту' : 'Нужен уход');
  $('machine-tag').classList.toggle('ready', m.repaired);
  setText('clean-value', `${Math.round(m.clean * 100)}%`); $('clean-bar').style.width = `${m.clean * 100}%`;
  setText('repair-label', m.repaired ? 'Механизм восстановлен' : m.clean >= 1 ? 'Корпус очищен' : 'Очистка корпуса');
  setText('action-hint', m.repaired ? 'Теперь соедините механизм с общей пружиной.' : m.clean >= 1 ? 'Шестерня готова. Установите её в механизм.' : 'Щёткой проведите по механизму, удерживая кнопку мыши.');
  $('repair').disabled = m.clean < 1 || m.repaired;
  setText('repair', m.repaired ? '✓ Шестерня установлена' : 'Установить шестерню');
  $('connect').disabled = !m.repaired;
  setText('machine-load', `${d.loads[selected]} ед.`);
  setText('connection-label', m.connected ? 'Ремень подключён' : 'Подключить ремень');
  setText('connection-hint', !m.repaired ? 'Сначала восстановите механизм' : m.connected ? 'Нажмите, чтобы отключить' : `Нагрузка: ${d.loads[selected]} из ${d.capacity}`);
  $('connection-toggle').classList.toggle('on', m.connected);
  $('connect').setAttribute('aria-pressed', String(m.connected));
  $('reducer').disabled = selected === 'mill';
  setText('reducer-location', state.reducer ? (state.reducer === 'train' ? 'На поезде' : 'На кране') : 'На полке');
  setText('reducer-description', state.reducer === selected ? 'Нажмите, чтобы снять деталь' : 'Снижает нагрузку на 2 единицы');
  setText('reducer-hint', selected === 'mill' ? 'Эта деталь подходит поезду или крану. Выберите один из них.' : state.reducer && state.reducer !== selected ? 'Нажмите, чтобы перенести редуктор сюда. Старое подключение сохранится.' : 'Можно поставить на поезд или кран. Переставляйте свободно.');
  let done = 0;
  for (const job of ['harbor', 'cargo', 'polished']) {
    const value = state[job];
    if (value >= 100) done++;
    setText(`${job}-value`, value >= 100 ? '✓ Готово' : `${Math.floor(value)}%`);
    $(`${job}-bar`).style.width = `${value}%`;
  }
  setText('tasks-count', `${done} / 3`);
  $('mode').disabled = !d.unlockedAlternating;
  $('mode').classList.toggle('active', state.mode === 'alternating');
  $('mode').setAttribute('aria-pressed', String(state.mode === 'alternating'));
  setText('mode-title', !d.unlockedAlternating ? 'Переключатель закрыт' : state.mode === 'alternating' ? 'Работают по очереди' : 'Включить работу по очереди');
  setText('mode-description', !d.unlockedAlternating ? 'Расчистите пристань или доставьте детали' : state.mode === 'alternating' ? 'Нажмите для одновременной работы' : 'Поезд и кран сменяют друг друга');
  setText('mode-icon', state.mode === 'alternating' ? '⇄' : '◇');
  setText('load-label', `${d.totalLoad} / ${d.capacity}`);
  $('power-meter').classList.toggle('danger', d.overloaded);
  [...$('power-meter').children].forEach((node, i) => node.classList.toggle('lit', i < d.totalLoad));
  setText('power-note', d.overloaded ? 'Перегрузка — отключите часть привода' : state.mode === 'alternating' ? `Сейчас работает ${d.phase === 0 ? 'поезд' : 'кран'} и подключённая мельница` : !d.connected.length ? 'Подключите восстановленный механизм' : state.running ? 'Привод работает ровно' : 'Можно заводить');
  $('run').classList.toggle('active', state.running);
  $('run').querySelector('strong').textContent = state.running ? 'Остановить привод' : 'Завести город';
  $('run').setAttribute('aria-pressed', String(state.running));
  $('undo').disabled = history.length === 0;
  setText('objective', objective(d));
  $('world-alert').hidden = !d.overloaded;
  setText('world-alert', `Пружине тяжело: ${d.totalLoad} / 6. ${d.unlockedAlternating ? 'Включите работу по очереди.' : 'Отключите один механизм или переставьте редуктор.'}`);
  document.querySelectorAll('[data-select]').forEach(button => {
    button.classList.toggle('selected', button.dataset.select === selected);
    button.setAttribute('aria-pressed', String(button.dataset.select === selected));
  });
  if (d.unlockedAlternating && !announcedUnlock) {
    announcedUnlock = true;
    toast('В ящике нашёлся переключатель! Теперь поезд и кран могут работать по очереди.');
    tone(780, .25);
  }
  if (d.completed && !previousCompleted && !shownWin) {
    shownWin = true; save();
    const minutes = Math.max(1, Math.round(state.totalPlay / 60));
    setText('win-stats', `Порт восстановлен за ${minutes} мин. Редуктор: ${state.reducer ? (state.reducer === 'train' ? 'на поезде' : 'на кране') : 'на полке'}. Все детали можно переставить.`);
    $('win-dialog').showModal(); tone(880, .5);
  }
  previousCompleted = d.completed;
}

document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => select(button.dataset.select)));
document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => chooseTool(button.dataset.tool)));
$('repair').addEventListener('click', () => action('repair', { id: selected }));
$('connect').addEventListener('click', () => action('connect', { id: selected }));
$('reducer').addEventListener('click', () => action('reducer', { id: state.reducer === selected ? null : selected }));
$('mode').addEventListener('click', () => action('mode', { mode: state.mode === 'direct' ? 'alternating' : 'direct' }));
$('run').addEventListener('click', () => {
  if (!state.running && !derive(state).connected.length) { toast('Сначала восстановите и подключите хотя бы один механизм.'); return; }
  action('toggleRun');
});
$('undo').addEventListener('click', () => {
  if (!history.length) return;
  state = history.pop(); save(); updateUI(); toast('Последнее действие отменено.');
});
$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('sound').querySelector('.slash').hidden = soundEnabled;
  $('sound').setAttribute('aria-label', soundEnabled ? 'Выключить звук' : 'Включить звук');
  tone(520, .18);
});
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('menu').addEventListener('click', () => { $('reset-warning').hidden = true; $('confirm-reset').hidden = true; $('menu-dialog').showModal(); });
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelectorAll('.close,.close-action').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
});
$('reset').addEventListener('click', () => { $('reset-warning').hidden = false; $('confirm-reset').hidden = false; });
function resetGame() {
  state = newGame(); history = []; shownWin = false; announcedUnlock = false; previousCompleted = false;
  selected = 'crane'; chooseTool('brush'); save(); updateUI();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  toast('Чистый верстак. Начните с любого механизма.');
}
$('confirm-reset').addEventListener('click', resetGame);
$('win-reset').addEventListener('click', () => { $('win-dialog').close(); $('menu-dialog').showModal(); $('reset-warning').hidden = false; $('confirm-reset').hidden = false; });

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const id = scene.hitTest(event.clientX, event.clientY);
  if (!id) return;
  select(id);
  if (tool === 'wrench') { action('repair', { id }); return; }
  if (tool === 'belt') { action('connect', { id }); return; }
  if (state.machines[id].clean >= 1) { toast(state.machines[id].repaired ? 'Механизм чист и восстановлен. Можно подключать ремень.' : 'Уже чисто. Теперь установите шестерню.'); return; }
  remember();
  stroke = { id, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  action('clean', { id, amount: .015 }, { noHistory: true, silent: true });
});
canvas.addEventListener('pointermove', event => {
  pointer = { x: event.clientX, y: event.clientY, active: !!stroke };
  if (!stroke) return;
  const distance = Math.hypot(event.clientX - stroke.x, event.clientY - stroke.y);
  const id = scene.hitTest(event.clientX, event.clientY);
  if (id === stroke.id && distance > 1) {
    action('clean', { id, amount: Math.min(distance, 60) * .00075 }, { noHistory: true });
    if (performance.now() - lastBrushSound > 130) { tone(180 + Math.random() * 160, .025, .008); lastBrushSound = performance.now(); }
  }
  stroke.x = event.clientX; stroke.y = event.clientY;
});
function finishStroke() { if (stroke) { stroke = null; save(); } }
canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);
canvas.addEventListener('lostpointercapture', finishStroke);
canvas.addEventListener('pointerleave', () => { if (!stroke) pointer = null; });
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (['1', '2', '3'].includes(event.key)) chooseTool({ 1: 'brush', 2: 'wrench', 3: 'belt' }[event.key]);
  if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); $('run').click(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); $('undo').click(); }
});
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); lastFrame = performance.now(); });

function frame(now) {
  const dt = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
  if (!document.hidden && !document.querySelector('dialog[open]')) state = tick(state, dt);
  scene.render(state, derive(state), { selected, tool, time: now, pointer });
  if (now - lastUI > 120) { updateUI(); lastUI = now; }
  if (now - lastSave > 2500 && storageAvailable) { save(); lastSave = now; }
  requestAnimationFrame(frame);
}
updateUI(); requestAnimationFrame(frame);
