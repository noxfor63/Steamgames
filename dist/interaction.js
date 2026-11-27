// World-space affordances shared by rules, the view and interaction tests.
export const STAND={x:1.3,y:1.02,z:2.7};
export const INLET={x:0,y:1.12,z:1.65};
export const HANDLES={x:0,y:1.02,z:2.03};
export const PLAYER_START={x:1.3,y:1.82,z:4.65};
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
 const atStand=raySphere(origin,direction,STAND,.5,2.45);
 const atHandles=raySphere(origin,direction,HANDLES,.55,2.45);
 let action=null;
 if(atStand&&state.phase!=='reveal')action=state.held?'putDown':'pickUp';
 else if(atHandles&&['sealed','reveal'].includes(state.phase)&&!state.held)action='open';
 else if(atHandles&&state.phase==='ready')action='next';
 return {action,point:state.held&&state.phase==='pour'?pourIntersection(origin,direction):null,atHandles,atStand};
}
