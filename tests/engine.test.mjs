import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, derive, act, tick, restoreSave, selectTargets, OBJECTS, TIERS} from '../dist/engine.js';
test('inflation preserves input and earns exactly the filled volume', () => {
  const before = newGame(), after = tick(before, .25, ['0']);
  assert.equal(before.filled[0], 0); assert.equal(after.filled[0], 1); assert.equal(after.credits, 1);
});
test('finished objects never overfill or earn twice; targets are deduplicated', () => {
  let s = newGame(); for (let i = 0; i < 100; i++) s = tick(s, .25, ['0', '0']);
  assert.equal(s.filled[0], OBJECTS[0].capacity); assert.equal(s.credits, OBJECTS[0].capacity);
});
test('upgrades require money and increase flow and simultaneous targets', () => {
  let s = newGame(); assert.equal(act(s, {type:'upgrade'}), s);
  s = {...s, credits:180}; s = act(s, {type:'upgrade'}); s = act(s, {type:'upgrade'});
  assert.equal(s.tier, 2); assert.equal(s.credits, 0); assert.equal(derive(s).targets, 2);
  assert.deepEqual(tick(s, .25, ['0','1','2']).filled.slice(0,3), [9,9,0]);
});
test('no drain, no offline progress, no negative or invalid time', () => {
  const s = tick(newGame(), .25, ['0']);
  assert.equal(tick(s, 1, []), s); assert.equal(tick(s,-1,['0']),s); assert.equal(tick(s,NaN,['0']),s);
  assert.equal(tick(s,10000,['0']).filled[0],2);
});
test('equal active time yields equal volume across frame rates', () => {
  let a=newGame(),b=newGame();
  for(let n=0;n<60;n++) a=tick(a,1/60,['0']); for(let n=0;n<30;n++) b=tick(b,1/30,['0']);
  assert.ok(Math.abs(a.credits-b.credits)<1e-8);
});
test('aim selection respects reach, camera direction, and completion', () => {
  const s=newGame(), origin={x:0,y:1.8,z:18},dir={x:0,y:-.1,z:-1};
  assert.deepEqual(selectTargets(s,origin,dir),['0']);
  assert.deepEqual(selectTargets(s,origin,{x:0,y:0,z:1}),[]);
  assert.deepEqual(selectTargets(s,origin,{x:0,y:0,z:0}),[]);
  assert.deepEqual(selectTargets(s,{x:500,y:1,z:500},dir),[]);
  s.filled[0]=OBJECTS[0].capacity; assert.ok(!selectTargets(s,origin,dir).includes('0'));
});
test('saves round-trip and recover from NaNs, old schema, and forged money', () => {
  let s=newGame(); for(let n=0;n<60;n++)s=tick(s,.25,['1']); s=act(s,{type:'upgrade'});
  const restored=restoreSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.filled,s.filled); assert.equal(restored.tier,s.tier); assert.ok(Math.abs(restored.credits-s.credits)<1e-6);
  assert.deepEqual(restoreSave({version:1}),newGame());
  assert.deepEqual(restoreSave({version:2,tier:99,credits:Infinity,filled:[Infinity,-5,NaN],activeSeconds:-1}),newGame());
});
test('full loop is affordable and completable without waiting or reset exploits', () => {
  let s=newGame(),frames=0;
  while(!derive(s).finished && frames<100000){
    s=act(s,{type:'upgrade'});
    const targets=OBJECTS.filter((o,i)=>s.filled[i]<o.capacity).slice(0,derive(s).targets).map(o=>o.id);
    s=tick(s,.25,targets);frames++;
  }
  assert.ok(derive(s).finished); assert.equal(s.tier,TIERS.length-1);
  assert.ok(s.activeSeconds>30 && s.activeSeconds<300); assert.ok(s.credits>=0);
  console.log(`Idealized active inflation: ${s.activeSeconds.toFixed(0)}s; excludes walking/aiming.`);
});
