import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, act, derive, tick } from '../dist/engine.js';
const action = (state, type, payload) => act(state, type, payload).state;
function restored() {
  let state = newGame();
  for (const id of ['train', 'mill', 'crane']) {
    state = action(state, 'clean', { id, amount: 1 });
    state = action(state, 'repair', { id });
  }
  return state;
}
function advance(state, seconds, dt = 1) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += dt) state = tick(state, Math.min(dt, seconds - elapsed));
  return state;
}

test('restoration requires cleaning and repair before connection', () => {
  let state = newGame();
  assert.equal(act(state, 'repair', { id: 'train' }).changed, false);
  assert.equal(act(state, 'connect', { id: 'train' }).changed, false);
  state = action(state, 'clean', { id: 'train', amount: 0.5 });
  assert.equal(act(state, 'repair', { id: 'train' }).changed, false);
  state = action(state, 'clean', { id: 'train', amount: 5 });
  assert.equal(state.machines.train.clean, 1);
  state = action(state, 'repair', { id: 'train' });
  state = action(state, 'connect', { id: 'train' });
  assert.equal(derive(state).restoredCount, 1);
  assert.deepEqual(derive(state).scheduled, ['train']);
});

for (const first of ['train', 'crane']) {
  test(`${first}-first route unlocks sequencing and finishes the town`, () => {
    let state = restored();
    state = action(state, 'reducer', { id: first });
    for (const id of [first, 'mill']) state = action(state, 'connect', { id });
    state = action(state, 'start');
    state = advance(state, 25);
    assert.equal(state[first === 'train' ? 'cargo' : 'harbor'], 100);
    assert.equal(state.polished, 100);
    assert.equal(derive(state).unlockedAlternating, true);
    state = action(state, 'connect', { id: first === 'train' ? 'crane' : 'train' });
    assert.equal(derive(state).overloaded, true);
    state = action(state, 'mode', { mode: 'alternating' });
    assert.equal(derive(state).overloaded, false);
    state = advance(state, 60);
    assert.equal(derive(state).completed, true);
    assert.equal(derive(state).progress, 1);
    assert.equal(state.everCompleted, true);
  });
}

test('overload safely stops work without turning off the player switch', () => {
  let state = restored();
  for (const id of ['train', 'mill', 'crane']) state = action(state, 'connect', { id });
  state = action(state, 'start');
  assert.equal(derive(state).totalLoad, 9);
  assert.deepEqual(derive(state).active, []);
  state = advance(state, 20);
  assert.equal(state.cargo + state.harbor + state.polished, 0);
  assert.equal(state.running, true);
  assert.equal(act(state, 'mode', { mode: 'alternating' }).changed, false);
});

test('reducer is transferable and all connections are reversible', () => {
  let state = restored();
  state = action(state, 'reducer', { id: 'crane' });
  assert.equal(derive(state).loads.crane, 2);
  state = action(state, 'reducer', { id: 'train' });
  assert.equal(derive(state).loads.crane, 4);
  assert.equal(derive(state).loads.train, 1);
  state = action(state, 'connect', { id: 'train' });
  state = action(state, 'connect', { id: 'train' });
  assert.equal(state.machines.train.connected, false);
  state = action(state, 'reducer', { id: null });
  assert.equal(derive(state).loads.train, 3);
});

test('actions and ticks do not mutate any previous state', () => {
  const state = restored();
  const previous = structuredClone(state);
  const changed = action(state, 'connect', { id: 'train' });
  tick(action(changed, 'start'), 1);
  assert.deepEqual(state, previous);
  const fresh = newGame();
  fresh.machines.train.clean = 1;
  assert.equal(newGame().machines.train.clean, 0);
});

test('invalid actions and malformed save values cannot invent progress', () => {
  const state = newGame();
  for (const [type, payload] of [['repair', { id: '__proto__' }], ['clean', { id: 'train', amount: NaN }], ['clean', { id: 'train', amount: -10 }], ['reducer', { id: 'mill' }], ['mode', { mode: 'unknown' }], ['unknown', {}]]) {
    const result = act(state, type, payload);
    assert.equal(result.changed, false);
    assert.deepEqual(result.state, state);
  }
  const invalid = { machines: { train: { clean: Infinity, repaired: true, connected: true } }, cargo: NaN, harbor: -9, polished: Infinity, mode: 'alternating', time: NaN };
  assert.equal(derive(invalid).restoredCount, 0);
  assert.equal(derive(invalid).unlockedAlternating, false);
  assert.equal(tick(invalid, 0).mode, 'direct');
  assert.deepEqual(tick(state, NaN), state);
});

test('background time is capped and stopped machines do no work', () => {
  let state = restored();
  state = action(state, 'connect', { id: 'train' });
  assert.equal(tick(state, 1000).cargo, 0);
  state = action(state, 'start');
  assert.equal(tick(state, 1000).cargo, 4);
  assert.equal(tick(state, -1).cargo, 0);
});

test('alternating results are independent of frame size at phase boundaries', () => {
  let state = restored();
  state.cargo = 100;
  state = action(state, 'mode', { mode: 'alternating' });
  for (const id of ['train', 'mill', 'crane']) state = action(state, 'connect', { id });
  state = action(state, 'start');
  const coarse = advance(state, 23, 1);
  const fine = advance(state, 23, 0.07);
  assert.ok(Math.abs(coarse.harbor - fine.harbor) < 1e-6);
  assert.ok(Math.abs(coarse.polished - fine.polished) < 1e-6);
});
