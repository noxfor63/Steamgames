import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAND,INLET,HANDLES,PLAYER_START,interactionFor,pourIntersection,raySphere} from '../dist/interaction.js';
import {newGame} from '../dist/engine.js';
const toward=(a,b)=>{const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,n=Math.hypot(x,y,z);return {x:x/n,y:y/n,z:z/n};};
test('spawn can see and pick up the real crucible stand',()=>{assert.equal(interactionFor(newGame(),PLAYER_START,toward(PLAYER_START,STAND)).action,'pickUp');assert.equal(interactionFor({...newGame(),held:true},PLAYER_START,toward(PLAYER_START,STAND)).action,'putDown');});
test('the inlet catches nearby directed pours but never distant, backward or upward pours',()=>{const from={x:0,y:1.82,z:3.1};assert.ok(pourIntersection(from,toward(from,INLET)));assert.equal(pourIntersection({x:0,y:1.82,z:8},toward({x:0,y:1.82,z:8},INLET)),null);assert.equal(pourIntersection(from,{x:0,y:1,z:0}),null);assert.equal(pourIntersection(from,{x:1,y:0,z:0}),null);assert.equal(pourIntersection(from,toward(from,{x:2,y:INLET.y,z:INLET.z})),null);});
test('form handles are usable only from reach and with both hands free',()=>{const from={x:0,y:1.82,z:3};const free={...newGame(),phase:'sealed'};assert.equal(interactionFor(free,from,toward(from,HANDLES)).action,'open');assert.equal(interactionFor({...free,held:true},from,toward(from,HANDLES)).action,null);const far={x:0,y:1.82,z:8};assert.equal(interactionFor(free,far,toward(far,HANDLES)).action,null);});
test('invalid or backward rays cannot interact',()=>{assert.equal(raySphere(PLAYER_START,{x:0,y:0,z:0},STAND,.5,3),false);assert.equal(raySphere(PLAYER_START,{x:0,y:0,z:1},STAND,.5,3),false);assert.equal(pourIntersection(PLAYER_START,{x:NaN,y:-1,z:0}),null);});
