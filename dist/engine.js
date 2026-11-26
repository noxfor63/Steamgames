/** Deterministic, browser-independent rules for «Город на пружине». */
const IDS = ['train', 'mill', 'crane'];
const LABELS = { train: 'Трамвай', mill: 'Мельница', crane: 'Кран' };
const BASE_LOAD = { train: 3, mill: 2, crane: 4 };
const JOBS = { train: 'cargo', mill: 'polished', crane: 'harbor' };
const CAPACITY = 6;
const PHASE_SECONDS = 5;
const JOB_PER_SECOND = 4;
const finite = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function newGame() {
  return {
    version: 1,
    machines: Object.fromEntries(IDS.map(id => [id, { clean: 0, repaired: false, connected: false }])),
    reducer: null,
    mode: 'direct',
    running: false,
    cargo: 0,
    harbor: 0,
    polished: 0,
    time: 0,
    totalPlay: 0,
    everCompleted: false,
  };
}

// Read only the documented fields. This also bounds old or malformed saves.
function copyState(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const state = newGame();
  for (const id of IDS) {
    const machine = raw.machines?.[id] || {};
    const clean = clamp(finite(machine.clean), 0, 1);
    const repaired = clean >= 1 && machine.repaired === true;
    state.machines[id] = { clean, repaired, connected: repaired && machine.connected === true };
  }
  state.reducer = ['train', 'crane'].includes(raw.reducer) ? raw.reducer : null;
  for (const job of ['cargo', 'harbor', 'polished']) state[job] = clamp(finite(raw[job]), 0, 100);
  state.mode = raw.mode === 'alternating' && (state.cargo >= 100 || state.harbor >= 100) ? 'alternating' : 'direct';
  state.running = raw.running === true;
  state.time = Math.max(0, finite(raw.time));
  state.totalPlay = Math.max(0, finite(raw.totalPlay));
  state.everCompleted = raw.everCompleted === true;
  return state;
}

function inspect(state) {
  const loads = Object.fromEntries(IDS.map(id => [id, BASE_LOAD[id] - (state.reducer === id ? 2 : 0)]));
  const connected = IDS.filter(id => state.machines[id].repaired && state.machines[id].connected);
  const unlockedAlternating = state.cargo >= 100 || state.harbor >= 100;
  let scheduled = [...connected];
  const phase = Math.floor(state.time / PHASE_SECONDS) % 2;
  if (state.mode === 'alternating' && unlockedAlternating && connected.includes('train') && connected.includes('crane')) {
    scheduled = connected.filter(id => id === 'mill' || id === (phase === 0 ? 'train' : 'crane'));
  }
  const totalLoad = scheduled.reduce((total, id) => total + loads[id], 0);
  const requestedLoad = connected.reduce((total, id) => total + loads[id], 0);
  const overloaded = totalLoad > CAPACITY;
  const restoredCount = IDS.filter(id => state.machines[id].repaired).length;
  const completed = restoredCount === 3 && connected.length === 3 && !overloaded &&
    state.cargo >= 100 && state.harbor >= 100 && state.polished >= 100;
  const cleanProgress = IDS.reduce((n, id) => n + state.machines[id].clean, 0) / 3;
  const jobProgress = (state.cargo + state.harbor + state.polished) / 300;
  const progress = completed ? 1 : Math.min(0.99,
    cleanProgress * 0.2 + (restoredCount / 3) * 0.2 + jobProgress * 0.5 + (connected.length / 3) * 0.1);
  return {
    loads, totalLoad, requestedLoad, capacity: CAPACITY, overloaded,
    active: state.running && !overloaded ? scheduled : [],
    scheduled, connected, phase, unlockedAlternating, completed, restoredCount, progress,
  };
}

export function derive(input) {
  return inspect(copyState(input));
}

/** Actions never mutate the input. Unknown or unavailable actions are safe no-ops. */
export function act(input, type, payload = {}) {
  const state = copyState(input);
  const id = payload?.id;
  const machine = IDS.includes(id) ? state.machines[id] : null;
  const reject = message => ({ state, changed: false, message });
  let message = '';
  switch (type) {
    case 'clean': {
      if (!machine) return reject('Выберите механизм.');
      const amount = finite(payload.amount);
      if (amount <= 0 || machine.clean >= 1) return reject('');
      const previous = machine.clean;
      machine.clean = clamp(previous + amount, 0, 1);
      if (machine.clean > 1 - 1e-9) machine.clean = 1;
      if (machine.clean === 1) message = `${LABELS[id]} очищен. Теперь можно установить шестерню.`;
      break;
    }
    case 'repair':
      if (!machine) return reject('Выберите механизм.');
      if (machine.clean < 1) return reject('Сначала очистите механизм щёткой.');
      if (machine.repaired) return reject('Механизм уже восстановлен.');
      machine.repaired = true;
      message = `${LABELS[id]} восстановлен. Подключите его к приводу.`;
      break;
    case 'connect':
      if (!machine) return reject('Выберите механизм.');
      if (!machine.repaired) return reject('Сначала восстановите механизм.');
      machine.connected = !machine.connected;
      message = `${LABELS[id]} ${machine.connected ? 'подключён' : 'отключён'}.`;
      break;
    case 'reducer':
      if (id !== null && !['train', 'crane'].includes(id)) return reject('Редуктор подходит трамваю или крану.');
      if (state.reducer === id) return reject('Редуктор уже установлен здесь.');
      state.reducer = id;
      message = id ? `Редуктор установлен: ${LABELS[id].toLowerCase()}. Нагрузка уменьшена на 2.` : 'Редуктор снят.';
      break;
    case 'mode': {
      const mode = payload.mode;
      if (!['direct', 'alternating'].includes(mode)) return reject('Неизвестный режим привода.');
      if (mode === 'alternating' && !inspect(state).unlockedAlternating) return reject('Доставьте груз трамваем или расчистите порт краном, чтобы получить переключатель.');
      if (mode === state.mode) return reject('');
      state.mode = mode;
      message = mode === 'alternating' ? 'Трамвай и кран работают по очереди. Мельница вращается постоянно.' : 'Все подключённые механизмы работают одновременно.';
      break;
    }
    case 'toggleRun':
      state.running = !state.running;
      message = state.running ? 'Главная пружина заведена.' : 'Привод остановлен.';
      break;
    case 'start':
      if (state.running) return reject('');
      state.running = true;
      message = 'Главная пружина заведена.';
      break;
    case 'stop':
      if (!state.running) return reject('');
      state.running = false;
      message = 'Привод остановлен.';
      break;
    default:
      return reject('Неизвестное действие.');
  }
  const result = inspect(state);
  if (result.completed) state.everCompleted = true;
  if (result.overloaded && ['connect', 'reducer', 'mode', 'start', 'toggleRun'].includes(type)) {
    message = `Перегрузка: ${result.totalLoad} из ${CAPACITY}. Отключите механизм, переставьте редуктор или включите чередование.`;
  }
  return { state, changed: true, message };
}

/** Advance a frame in seconds. At most one second counts after a suspended tab. */
export function tick(input, dt) {
  const state = copyState(input);
  let remaining = clamp(finite(dt), 0, 1);
  state.totalPlay += remaining;
  while (remaining > 1e-9) {
    const status = inspect(state);
    if (!state.running || status.overloaded) break;
    // Integrate to each phase boundary, so frame rate cannot favor either route.
    const phaseRemainder = PHASE_SECONDS - (state.time % PHASE_SECONDS);
    const step = Math.min(remaining, phaseRemainder < 1e-9 ? PHASE_SECONDS : phaseRemainder);
    for (const id of status.active) {
      const job = JOBS[id];
      state[job] = Math.min(100, state[job] + JOB_PER_SECOND * step);
      if (state[job] > 100 - 1e-8) state[job] = 100;
    }
    state.time += step;
    remaining -= step;
  }
  if (inspect(state).completed) state.everCompleted = true;
  return state;
}
