import * as T from './vendor/three.module.js';
import {STAND,INLET} from './interaction.js';
const V=T.Vector3;
function add(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function tube(parent,material,points,r){return add(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new V(...p))),20,r,8,false),material);}
export function createCrucible(metal,trim,hot){
 const g=new T.Group(),profile=[[0,0],[.32,0],[.44,.12],[.49,.62],[.46,.76],[.4,.77],[.35,.19],[.2,.12],[0,.12]];
 add(g,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),48),metal);
 for(const y of [.12,.71]){const r=add(g,new T.TorusGeometry(y>.5?.46:.35,.027,8,48),trim,0,y,0);r.rotation.x=Math.PI/2;}
 for(const sign of [-1,1])tube(g,trim,[[sign*.43,.54,0],[sign*.72,.55,0],[sign*.77,.26,0],[sign*.43,.23,0]],.045);
 // The forward pouring lip is open at its end; its marker is the exact stream origin.
 tube(g,metal,[[0,.65,-.38],[0,.69,-.58],[0,.62,-.78]],.105);
 const pool=add(g,new T.CircleGeometry(.39,40),hot,0,.6,0);pool.rotation.x=-Math.PI/2;
 const spout=new T.Object3D();spout.position.set(0,.62,-.8);g.add(spout);g.userData.spout=spout;return g;
}
export function createHand(side,leather,seam){
 const g=new T.Group();const palm=add(g,new T.SphereGeometry(1,20,14),leather);palm.scale.set(.074,.037,.091);
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.035,len=[.071,.086,.081,.062][i];
  tube(g,leather,[[x,.005,-.045],[x,.01,-.09],[x,-.015,-.09-len*.55],[x,-.052,-.09-len*.5],[x,-.065,-.075]],.018);
  tube(g,seam,[[x-.011,.029,-.061],[x,.031,-.073],[x+.011,.027,-.075]],.0022);
 }
 tube(g,leather,[[side*.058,-.005,.018],[side*.094,-.01,-.015],[side*.098,-.043,-.055],[side*.069,-.06,-.075]],.024);
 tube(g,seam,[[-.056,.028,.051],[0,.039,.06],[.056,.028,.051]],.0025);
 return g;
}
export function createHands(camera,materials){
 const root=new T.Group();camera.add(root);
 const leather=new T.MeshStandardMaterial({color:'#8e6240',roughness:.84,bumpMap:materials.wood.bumpMap,bumpScale:.008});
 const cloth=new T.MeshStandardMaterial({color:'#304c4b',roughness:.96});
 const seam=new T.MeshStandardMaterial({color:'#c1a17b',roughness:.9});
 const hot=new T.MeshStandardMaterial({color:'#ffb34b',emissive:'#ff6d08',emissiveIntensity:2.3,roughness:.35});
 const tool=createCrucible(materials.iron,materials.bronze,hot);tool.scale.setScalar(.46);root.add(tool);
 const wrists=[new V(),new V()],hands=[],arms=[],cuffs=[];
 for(const sign of [-1,1]){const hand=createHand(sign,leather,seam);root.add(hand);hands.push(hand);const arm=add(root,new T.CylinderGeometry(.062,.115,1,16),cloth);arms.push(arm);const cuff=add(root,new T.CylinderGeometry(.075,.077,.12,20),leather);cuffs.push(cuff);}
 let carry=0,tilt=0,openBlend=0;const heldPosition=new V(.16,-.38,-.69),yAxis=new V(0,1,0),inverse=new T.Quaternion(),desired=new T.Quaternion(),standLocal=new V();
 function update({held,pouring,opening=0,openingPose=false,moving=false,reduced=false,dt,time,handlePoints}){
  const ease=1-Math.exp(-dt*9);carry=T.MathUtils.lerp(carry,held?1:0,ease);tilt=T.MathUtils.lerp(tilt,pouring?.82:0,1-Math.exp(-dt*11));openBlend=T.MathUtils.lerp(openBlend,openingPose?1:0,ease);
  root.visible=true;camera.updateMatrixWorld(true);standLocal.set(STAND.x,STAND.y-.2,STAND.z);camera.worldToLocal(standLocal);tool.position.copy(standLocal).lerp(heldPosition,carry);
  if(!reduced&&moving&&held){tool.position.y+=Math.sin(time*7)*.012;tool.position.x+=Math.cos(time*3.5)*.008;}
  camera.getWorldQuaternion(inverse).invert();desired.setFromEuler(new T.Euler(-tilt,.03,0));tool.quaternion.copy(inverse).slerp(desired,carry);tool.visible=carry>.002;
  // Lift the wrists while tipping, keeping the lip above the receiving funnel.
  tool.position.y+=carry*tilt*.4;
  if(pouring&&carry>.9){tool.updateMatrixWorld(true);const lip=tool.userData.spout.getWorldPosition(new V()),up=new V(0,1,0).applyQuaternion(camera.quaternion);const lift=Math.max(0,INLET.y+.16-lip.y)/Math.max(.3,up.y);tool.position.y+=Math.min(.55,lift);}
  tool.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const sign=i===0?-1:1,hand=hands[i],wrist=wrists[i];
   const grip=new V(sign*.72,.38,.035);tool.localToWorld(grip);camera.worldToLocal(grip);
   const idle=new V(sign*.36,-.68,-.47);wrist.copy(idle).lerp(grip,Math.min(1,carry*4));
   if(handlePoints){const reach=handlePoints[i].clone();camera.worldToLocal(reach);wrist.lerp(reach,openBlend);}
   hand.position.copy(wrist);hand.rotation.set(-.1+tilt*.5,sign*.24,sign*.30);hand.rotation.x=T.MathUtils.lerp(hand.rotation.x,-.18,openBlend);
   const shoulder=new V(sign*.38,-.62,.12),delta=wrist.clone().sub(shoulder),length=delta.length();
   arms[i].position.copy(shoulder).lerp(wrist,.5);arms[i].quaternion.setFromUnitVectors(yAxis,delta.normalize());arms[i].scale.y=length;
   cuffs[i].position.copy(wrist).addScaledVector(delta,-.065);cuffs[i].quaternion.copy(arms[i].quaternion);
  }
 }
 function spoutWorld(){tool.updateWorldMatrix(true,true);return tool.userData.spout.getWorldPosition(new V());}
 return {root,tool,hands,update,spoutWorld,get carry(){return carry;}};
}
