import {derive} from './engine.js';
// World-space affordances shared by rules, the view and interaction tests.
export const STAND={x:1.3,y:1.02,z:2.7};
export const INLET={x:0,y:1.12,z:1.65};
export const HANDLES={x:0,y:1.02,z:2.03};
export const STOCK={x:-3.6,y:1.0,z:2.5};
export const FURNACE={x:-5.5,y:1.2,z:.05};
export const TAP={x:-4.12,y:1.28,z:-1.0};
export const LOOKOUT={x:33,y:.4,z:-3};
export const PLAYER_START={x:-3.6,y:1.82,z:4.5};
export function raySphere(origin,direction,target,radius,maxDistance){
 if(!origin||!direction)return false;
 const length=Math.hypot(direction.x,direction.y,direction.z);
 if(!Number.isFinite(length)||length<.001)return false;
 const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z;
 const t=(dx*direction.x+dy*direction.y+dz*direction.z)/length;
 return t>=0&&t<=maxDistance&&dx*dx+dy*dy+dz*dz-t*t<=radius*radius;
}
export function pourIntersection(origin,direction){
 if(!origin||!direction||![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z].every(Number.isFinite)||direction.y>=-.025)return null;
 const t=(INLET.y-origin.y)/direction.y;
 if(t<0)return null;
 const point={x:origin.x+direction.x*t,y:INLET.y,z:origin.z+direction.z*t};
 const distance=Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z);
 if(distance>2.8||Math.hypot(point.x-INLET.x,point.z-INLET.z)>.48)return null;
 return point;
}
export function interactionFor(state,origin,direction){
 const d=derive(state),atStand=raySphere(origin,direction,STAND,.5,2.45),atHandles=raySphere(origin,direction,HANDLES,.55,2.45);
 const atStock=raySphere(origin,direction,STOCK,.55,2.45),atFurnace=raySphere(origin,direction,FURNACE,.62,2.55),atTap=raySphere(origin,direction,TAP,.5,2.3);
 let action=null;
 if(atStock&&!state.held&&state.phase==='pour'&&(state.ingots>0||d.remainingIngots>0))action=state.ingots>0?'returnIngots':'takeIngots';
 else if(atFurnace&&state.ingots>0&&state.phase==='pour')action='loadFurnace';
 else if(atTap&&state.held&&d.materialsReady&&!state.charged&&state.phase==='pour')action='charge';
 else if(atStand&&state.phase!=='reveal'&&!state.ingots&&!d.finished)action=state.held?'putDown':'pickUp';
 else if(atHandles&&['sealed','reveal'].includes(state.phase)&&!state.held&&!state.ingots)action='open';
 else if(atHandles&&state.phase==='ready')action='next';
 return {action,point:state.held&&state.charged&&state.phase==='pour'?pourIntersection(origin,direction):null,atHandles,atStand};
}
export function objectiveFor(s){
 const d=derive(s);
 if(d.finished)return {name:'Пройдите по своему мосту',target:LOOKOUT};
 if(s.phase==='ready')return {name:'Закончите работу с формой',target:HANDLES};
 if(s.phase!=='pour')return s.held?{name:'Поставьте тигель на стойку',target:STAND}:{name:s.phase==='cool'?'Дайте бронзе остыть':'Раздвиньте створки формы',target:HANDLES};
 if(!d.materialsReady){if(s.held)return {name:'Освободите руки для слитков',target:STAND};if(s.ingots)return {name:'Загрузите слитки в печь',target:FURNACE};return {name:`Возьмите слитки: нужно ещё ${d.remainingIngots}`,target:STOCK};}
 if(!s.held)return {name:'Возьмите тигель со стойки',target:STAND};
 if(!s.charged)return {name:'Наберите бронзу у крана печи',target:TAP};
 return {name:'Поднесите тигель к воронке',target:INLET};
}
export function canWalkSurface(x,z,bridgeOpen){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(Math.hypot(x,z+3)<16.5)return true;
 return !!bridgeOpen&&((x>=15&&x<=31&&Math.abs(z+3)<=1.35)||Math.hypot(x-33,z+3)<4.15);
}
