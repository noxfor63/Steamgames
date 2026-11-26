export const SAVE_VERSION = 2;
export const TIERS = Object.freeze([
  { name: 'Карманный насос', flow: 4, reach: 9, targets: 1, cost: 0 },
  { name: 'Воздушная насадка', flow: 12, reach: 12, targets: 1, cost: 40 },
  { name: 'Двойной компрессор', flow: 36, reach: 16, targets: 2, cost: 140 },
  { name: 'Ветровая пушка', flow: 108, reach: 22, targets: 3, cost: 480 },
  { name: 'Парк на одном выдохе', flow: 324, reach: 29, targets: 5, cost: 1600 },
  { name: 'Маленький ураган', flow: 972, reach: 38, targets: 8, cost: 5200 },
  { name: 'Большой вдох', flow: 2916, reach: 52, targets: 12, cost: 16000 },
]);
const objects = [];
function add(type, name, x, z, scale, capacity, color, zone) {
  objects.push(Object.freeze({ id: String(objects.length), type, name, x, z, scale, capacity, color, zone,
    radius: scale * (type === 'whale' ? 2.7 : type === 'arch' ? 2.3 : type === 'airship' ? 3.4 : 1.1),
    height: scale * (type === 'arch' ? 3.5 : type === 'whale' ? 2.3 : type === 'airship' ? 3.5 : 1.6) }));
}
add('duck', 'Самая первая уточка', 0, 10, 1, 36, '#ffcb45', 0);
for (let i = 0; i < 6; i++) add(i % 3 === 0 ? 'ring' : 'duck', i % 3 === 0 ? 'Спасательный круг' : 'Уточка с характером', i % 2 ? 5 : -5, 8 - Math.floor(i / 2) * 5, 1.05 + i * .09, 45 + i * 12, ['#fc977e','#ffd862','#7fd1c4'][i % 3], 0);
add('arch', 'Ворота летнего парка', 0, -5, 1.7, 280, '#f18468', 0);
for (let i = 0; i < 8; i++) add(i % 2 ? 'flower' : 'duck', i % 2 ? 'Солнечный цветок' : 'Большая уточка', i % 2 ? 7 : -7, -12 - Math.floor(i / 2) * 5, 1.8 + i * .1, 240 + i * 100, ['#f7bd44','#84cfc0','#ed8d85','#c4abd9'][i % 4], 1);
add('arch', 'Радужный проход', 0, -27, 2.2, 1500, '#8bcfc6', 1);
add('whale', 'Китёнок', -12, -35, 2.8, 2400, '#6baabf', 2);
add('whale', 'Китёнок', 12, -35, 2.8, 2800, '#8fbae1', 2);
add('whale', 'Большой кит', 0, -43, 6.5, 18000, '#699fbb', 2);
for (let i = 0; i < 6; i++) add('flower', 'Морской фонарик', i % 2 ? 17 : -17, -44 - Math.floor(i / 2) * 7, 2 + i * .15, 1800 + i * 400, ['#f3cb65','#dd9cb5','#95c9bc'][i % 3], 2);
add('airship', 'Облачный корабль', 0, -69, 8, 56000, '#f0b95a', 2);
export const OBJECTS = Object.freeze(objects);
export const TOTAL_VOLUME = OBJECTS.reduce((a, o) => a + o.capacity, 0);
export function newGame() {
  return { version: SAVE_VERSION, tier: 0, credits: 0, filled: OBJECTS.map(() => 0), activeSeconds: 0 };
}
export function derive(state) {
  const tool = TIERS[state.tier];
  const completed = state.filled.reduce((n, v, i) => n + (v >= OBJECTS[i].capacity - 1e-6 ? 1 : 0), 0);
  return { ...tool, multiplier: tool.flow / TIERS[0].flow, next: TIERS[state.tier + 1] ?? null,
    completed, total: OBJECTS.length, volume: state.filled.reduce((a, b) => a + b, 0),
    progress: state.filled.reduce((s, v, i) => s + v / OBJECTS[i].capacity, 0) / OBJECTS.length,
    finished: completed === OBJECTS.length };
}
export function act(state, action) {
  if (action.type !== 'upgrade') return state;
  const next = TIERS[state.tier + 1];
  if (!next || state.credits + 1e-6 < next.cost) return state;
  return { ...state, tier: state.tier + 1, credits: Math.max(0, state.credits - next.cost) };
}
// Suspension never grants offline progress; objects never lose their inflation.
export function tick(state, dt, targetIds = []) {
  if (!Number.isFinite(dt) || dt <= 0) return state;
  const seconds = Math.min(dt, .25), stats = derive(state);
  const valid = [...new Set(targetIds)].map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < OBJECTS.length && state.filled[i] < OBJECTS[i].capacity).slice(0, stats.targets);
  if (!valid.length) return state;
  const filled = [...state.filled]; let gained = 0;
  for (const i of valid) {
    const gain = Math.min(OBJECTS[i].capacity - filled[i], stats.flow * seconds);
    filled[i] += gain; gained += gain;
  }
  return { ...state, filled, credits: state.credits + gained, activeSeconds: state.activeSeconds + seconds };
}
export function selectTargets(state, origin, direction) {
  const stats = derive(state), candidates = [];
  const len = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(len) || len < 1e-6) return [];
  const d = { x: direction.x / len, y: direction.y / len, z: direction.z / len };
  for (let i = 0; i < OBJECTS.length; i++) {
    const o = OBJECTS[i], progress = state.filled[i] / o.capacity;
    if (progress >= 1 - 1e-9) continue;
    const p = { x: o.x - origin.x, y: Math.max(.35, o.height * progress * .45) - origin.y, z: o.z - origin.z };
    const distance = Math.hypot(p.x, p.y, p.z), forward = p.x * d.x + p.y * d.y + p.z * d.z;
    if (forward <= 0 || distance > stats.reach + o.radius) continue;
    const cross = Math.sqrt(Math.max(0, distance * distance - forward * forward));
    const width = o.radius + .9 + distance * (stats.targets > 1 ? .22 : .06);
    if (cross > width) continue;
    candidates.push({ id: o.id, score: cross / (o.radius + .9) + distance * .012 });
  }
  return candidates.sort((a, b) => a.score - b.score).slice(0, stats.targets).map(o => o.id);
}
export function restoreSave(raw) {
  if (!raw || raw.version !== SAVE_VERSION || !Array.isArray(raw.filled)) return newGame();
  const finite = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const state = newGame();
  state.filled = OBJECTS.map((o, i) => Math.min(o.capacity, Math.max(0, finite(raw.filled[i]))));
  // Recompute the economy to recover safely from partial or damaged saves.
  const earned = state.filled.reduce((s, n) => s + n, 0); let spent = 0;
  const requested = Math.min(TIERS.length - 1, Math.max(0, Math.floor(finite(raw.tier))));
  while (state.tier < requested && spent + TIERS[state.tier + 1].cost <= earned + 1e-6) spent += TIERS[++state.tier].cost;
  state.credits = earned - spent; state.activeSeconds = Math.max(0, finite(raw.activeSeconds));
  return state;
}
