import * as T from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/environments/RoomEnvironment.js';
import {EffectComposer} from './vendor/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/postprocessing/OutputPass.js';
import {PROJECTS,derive,REVEAL_SECONDS} from './engine.js';
import {createHands,createCrucible} from './hands.js';
import {STAND,INLET,HANDLES,PLAYER_START,interactionFor} from './interaction.js';
const TAU=Math.PI*2, V=T.Vector3, clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,n=rand();let v=kind==='metal'?178+Math.sin(x*.9+y*.04)*7+n*28:kind==='ceramic'?198+n*35:170+Math.sin(x*.027+Math.sin(y*.02))*15+n*34;const vein=kind==='stone'?Math.max(0,Math.sin(x*.08+y*.06+Math.sin(y*.031)*4)-.91)*110:0;v-=vein;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,238,176,1)');g.addColorStop(.16,'rgba(255,179,70,.65)');g.addColorStop(.45,'rgba(255,131,28,.13)');g.addColorStop(1,'rgba(255,100,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
function mesh(p,geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
function box(p,mat,x,y,z,w,h,d){return mesh(p,new T.BoxGeometry(w,h,d),mat,x,y,z);}
function cyl(p,mat,x,y,z,r,h,rt=r,seg=48){return mesh(p,new T.CylinderGeometry(rt,r,h,seg),mat,x,y,z);}
function ring(p,mat,r,t,x,y,z,rx=Math.PI/2){const m=mesh(p,new T.TorusGeometry(r,t,10,80),mat,x,y,z);m.rotation.x=rx;return m;}
function sphere(p,mat,x,y,z,r){return mesh(p,new T.SphereGeometry(r,24,16),mat,x,y,z);}
function lathe(p,mat,points,x=0,y=0,z=0){return mesh(p,new T.LatheGeometry(points.map(a=>new T.Vector2(...a)),64),mat,x,y,z);}
function tube(p,mat,points,r=.035){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new V(...a))),40,r,8,false),mat);}
function ornament(p,mat,r,y,count=24){for(let i=0;i<count;i++){const a=i/count*TAU;const m=box(p,mat,Math.cos(a)*r,y,Math.sin(a)*r,.035,.1,.028);m.rotation.y=-a;}}
function lantern(mat,accent){const g=new T.Group();
 lathe(g,mat,[[0,0],[.7,0],[.72,.09],[.7,.16],[.49,.19],[.47,.3],[.32,.4],[.25,.55],[.24,1.35],[.4,1.43],[.41,1.55],[.62,1.62],[.63,1.73],[0,1.73]]);
 for(let i=0;i<8;i++){const a=i/8*TAU;const x=Math.cos(a)*.49,z=Math.sin(a)*.49;cyl(g,mat,x,2.18,z,.033,1.02);tube(g,accent,[[x,1.72,z],[x*1.25,1.9,z*1.25],[x*1.25,2.4,z*1.25],[x,2.68,z]],.018);}
 for(const y of [1.74,2.69]){ring(g,accent,.55,.045,0,y,0);ornament(g,mat,.57,y,16);}
 lathe(g,mat,[[0,2.68],[.71,2.68],[.72,2.77],[.58,2.82],[.45,2.96],[.35,3.12],[.16,3.27],[.1,3.35],[0,3.35]]);sphere(g,accent,0,3.46,0,.12);ring(g,accent,.13,.024,0,3.68,0,0);ornament(g,accent,.47,.3,28);
 for(let i=0;i<6;i++){const a=i/6*TAU;const m=box(g,accent,.245*Math.cos(a),.95,.245*Math.sin(a),.025,.7,.025);m.rotation.y=-a;}
 return g;}
function fountain(mat,accent){const g=new T.Group();
 lathe(g,mat,[[0,0],[1.35,0],[1.4,.14],[1.35,.26],[1.1,.3],[.5,.45],[.4,.72],[.4,.85],[.65,.95],[1.5,1.08],[1.62,1.32],[1.61,1.44],[1.52,1.44],[1.46,1.25],[.64,1.08],[.38,1.1],[.28,1.6],[.25,2.1],[.4,2.2],[1.02,2.35],[1.09,2.55],[1.06,2.67],[.97,2.65],[.92,2.47],[.32,2.29],[.2,2.4],[.16,2.97],[.25,3.08],[.59,3.22],[.65,3.4],[.61,3.5],[.53,3.47],[.47,3.32],[.12,3.21],[.1,3.8],[0,3.94]]);
 for(const [r,y]of [[1.61,1.45],[1.07,2.67],[.62,3.5],[1.36,.18]]){ring(g,accent,r,.028,0,y,0);ornament(g,accent,r,y-.1,32);}
 for(let i=0;i<12;i++){const a=i/12*TAU;tube(g,accent,[[Math.cos(a)*.52,.48,Math.sin(a)*.52],[Math.cos(a)*.75,.88,Math.sin(a)*.75],[Math.cos(a)*1.48,1.2,Math.sin(a)*1.48]],.023);}
 return g;}
function orrery(mat,accent){const g=new T.Group();
 lathe(g,mat,[[0,0],[1.06,0],[1.12,.16],[1.02,.3],[.77,.36],[.61,.54],[.55,.7],[.54,.98],[.68,1.06],[.7,1.17],[.52,1.26],[.36,1.47],[.32,1.8],[0,1.85]]);
 ornament(g,accent,.57,.82,32);for(const y of [.18,.38,1.07,1.2])ring(g,accent,y<.4?1:.65,.027,0,y,0);
 const cradle=new T.Group();cradle.position.y=3.16;g.add(cradle);g.userData.orbits=[];
 for(let i=0;i<3;i++){const orbit=new T.Group();cradle.add(orbit);orbit.rotation.set(i*.6,.28+i*.65,.42+i*.4);ring(orbit,i===1?accent:mat,1.57-i*.16,.045,0,0,0,0);ring(orbit,accent,1.61-i*.16,.012,0,0,0,0);for(let j=0;j<48;j++){let a=j/48*TAU;const tick=box(orbit,accent,Math.sin(a)*(1.57-i*.16),Math.cos(a)*(1.57-i*.16),0,.017,j%4===0?.13:.065,.025);tick.rotation.z=-a;}sphere(orbit,mat,1.57-i*.16,0,0,.13-i*.025);g.userData.orbits.push(orbit);}
 sphere(cradle,accent,0,0,0,.35);for(let i=0;i<12;i++){let a=i/12*TAU;tube(cradle,accent,[[Math.cos(a)*.36,Math.sin(a)*.36,0],[Math.cos(a)*.55,Math.sin(a)*.55,0]],.019);}return g;}
export function createArtifact(index,metal,accent){return [lantern,fountain,orrery][index](metal,accent);}
export function createScene(canvas,settings={}){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.localClippingEnabled=true;
 const scene=new T.Scene();scene.fog=new T.FogExp2('#a2b5ae',.012);
 const camera=new T.PerspectiveCamera(46,1,.1,500);camera.position.set(11,6.4,12);camera.lookAt(-2.7,2,0);camera.rotation.order='YXZ';scene.add(camera);
 const pmrem=new T.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.06).texture;scene.environmentIntensity=.75;env.dispose();pmrem.dispose();
 const stoneTex=texture('stone'),metalTex=texture('metal'),ceramicTex=texture('ceramic');
 const mats={stone:new T.MeshStandardMaterial({color:'#9e9a86',roughness:.88,bumpMap:stoneTex,bumpScale:.075}),lightStone:new T.MeshStandardMaterial({color:'#c2b69b',roughness:.84,bumpMap:stoneTex,bumpScale:.045}),darkStone:new T.MeshStandardMaterial({color:'#465956',roughness:.85,bumpMap:stoneTex,bumpScale:.08}),bronze:new T.MeshStandardMaterial({color:'#9f6a38',metalness:.88,roughness:.31,roughnessMap:metalTex,bumpMap:metalTex,bumpScale:.015,envMapIntensity:1.3}),gold:new T.MeshStandardMaterial({color:'#d3aa64',metalness:.87,roughness:.24,roughnessMap:metalTex,bumpMap:metalTex,bumpScale:.009,envMapIntensity:1.5}),teal:new T.MeshStandardMaterial({color:'#2c6c63',metalness:.35,roughness:.38,bumpMap:ceramicTex,bumpScale:.022}),clay:new T.MeshStandardMaterial({color:'#b5a48a',roughness:.93,bumpMap:ceramicTex,bumpScale:.047,side:T.DoubleSide}),iron:new T.MeshStandardMaterial({color:'#263735',metalness:.7,roughness:.56}),wood:new T.MeshStandardMaterial({color:'#5c4c37',roughness:.9,bumpMap:metalTex,bumpScale:.04}),leaf:new T.MeshStandardMaterial({color:'#344f35',roughness:.9}),white:new T.MeshStandardMaterial({color:'#d7c5a1',roughness:.9})};
 const sun=new T.DirectionalLight('#ffe0a2',3.1);sun.position.set(-15,25,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:75});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;sun.shadow.radius=3;sun.target.position.set(0,0,-6);scene.add(sun,sun.target);scene.add(new T.HemisphereLight('#b6d4e3','#6e6348',1.35));const bounce=new T.DirectionalLight('#8ec4c0',.6);bounce.position.set(10,8,-15);scene.add(bounce);
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#668f9d')},bottom:{value:new T.Color('#d8c9a7')}},vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vWorld;uniform vec3 top;uniform vec3 bottom;void main(){float h=normalize(vWorld).y;vec3 c=mix(bottom,top,smoothstep(-.05,.65,h));float sun=pow(max(0.,dot(normalize(vWorld),normalize(vec3(-.6,.25,-.5)))),140.);c+=vec3(.65,.42,.14)*sun;gl_FragColor=vec4(c,1.);}'});mesh(scene,new T.SphereGeometry(240,32,20),skyMat).castShadow=false;
 const seaMat=new T.MeshStandardMaterial({color:'#3d797c',roughness:.24,metalness:.48});seaMat.onBeforeCompile=s=>{s.uniforms.uTime={value:0};seaMat.userData.shader=s;s.vertexShader='uniform float uTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(position.x*.19+uTime*.5)*.12+sin(position.y*.3+uTime*.3)*.055;');s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal.x+=cos(position.x*.19+uTime*.5)*.10;objectNormal.y+=cos(position.y*.3+uTime*.3)*.13;');};const sea=mesh(scene,new T.PlaneGeometry(450,450,120,120),seaMat,0,-1.2,-40);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
 // A paved working terrace with individually bevelled-looking joints and inlaid rings.
 cyl(scene,mats.darkStone,0,-.55,-3,18.5,1.05,18.5,96);cyl(scene,mats.lightStone,0,.005,-3,18.6,.11,18.6,96);
 const tileGeo=new T.BoxGeometry(1.46,.1,1.46),tiles=[];for(let x=-17;x<=17;x+=1.5)for(let z=-20;z<=14;z+=1.5)if(Math.hypot(x,z+3)<17.8&&Math.hypot(x,z)>2.45)tiles.push([x,z]);const tiled=new T.InstancedMesh(tileGeo,mats.stone,tiles.length),dummy=new T.Object3D();tiles.forEach(([x,z],i)=>{dummy.position.set(x,.075,z);dummy.rotation.y=0;dummy.updateMatrix();tiled.setMatrixAt(i,dummy.matrix);tiled.setColorAt(i,new T.Color().setHSL(.115,.10,.7+rand()*.23));});tiled.receiveShadow=true;scene.add(tiled);
 for(const r of [3.1,3.2,5.7,5.75]){const m=ring(scene,mats.bronze,r,.017,0,.14,0);m.castShadow=false;}
 for(let a=0;a<TAU;a+=TAU/16){const m=box(scene,mats.bronze,Math.sin(a)*4.4,.14,Math.cos(a)*4.4,.025,.01,2.3);m.rotation.y=a;m.castShadow=false;}
 // Rear parapet and open stone arcade.
 for(let i=0;i<22;i++){const a=Math.PI*.72+i/21*Math.PI*1.13,x=Math.sin(a)*17.2,z=-3+Math.cos(a)*17.2;const b=box(scene,mats.lightStone,x,.58,z,1.8,1.05,.65);b.rotation.y=a;const cap=box(scene,mats.lightStone,x,1.13,z,1.9,.16,.85);cap.rotation.y=a;}
 const archPositions=[[-11,-7],[-7,-11],[-1,-14],[6,-12],[11,-8]];
 for(const [x,z]of archPositions){cyl(scene,mats.lightStone,x,2.65,z,.38,5.1,.3);for(const y of [.25,.45,4.9,5.15])cyl(scene,mats.lightStone,x,y,z,.52,.16);for(let i=0;i<12;i++){const a=i/12*TAU;cyl(scene,mats.stone,x+Math.sin(a)*.30,2.7,z+Math.cos(a)*.30,.033,4.35);}}
 for(let i=0;i<archPositions.length-1;i++){const [x,z]=archPositions[i],[x2,z2]=archPositions[i+1],len=Math.hypot(x2-x,z2-z);const arch=new T.Group();arch.position.set((x+x2)/2,4.7,(z+z2)/2);arch.rotation.y=Math.atan2(-(z2-z),x2-x);scene.add(arch);const shape=new T.Shape();shape.absarc(0,0,len/2+.38,0,Math.PI,false);shape.lineTo(-len/2,0);shape.absarc(0,0,len/2,Math.PI,0,true);shape.closePath();mesh(arch,new T.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2,steps:1,curveSegments:32}),mats.lightStone,0,0,-.3);}
 // A tiled kiln: firelight, copper bands, chimney and tools.
 const kiln=new T.Group();kiln.position.set(-5.5,0,-1.6);scene.add(kiln);lathe(kiln,mats.teal,[[0,0],[1.25,0],[1.35,.18],[1.25,.42],[1.18,1.9],[1.03,2.25],[.65,2.55],[.47,2.7],[.45,4.7],[.62,4.85],[.62,5.04],[0,5.04]]);for(const y of [.3,.5,1.9,2.3,4.7])ring(kiln,mats.bronze,y>3?.47:y>2?1.01:1.25,.045,0,y,0);for(let i=0;i<24;i++){const a=i/24*TAU;for(const y of [.9,1.4]){let b=box(kiln,mats.bronze,Math.sin(a)*1.21,y,Math.cos(a)*1.21,.015,.46,.015);b.rotation.y=a;}}
 const fireMat=new T.MeshStandardMaterial({color:'#ff811c',emissive:'#ff7205',emissiveIntensity:3.2});const mouth=mesh(kiln,new T.CircleGeometry(.55,48),mats.iron,0,.9,1.28);mouth.scale.y=.8;const fire=mesh(kiln,new T.CircleGeometry(.42,40),fireMat,0,.9,1.3);fire.scale.y=.72;ring(kiln,mats.bronze,.53,.075,0,.9,1.28,0);for(let i=-2;i<=2;i++)box(kiln,mats.iron,i*.15,.9,1.34,.045,.65,.05);const fireLight=new T.PointLight('#ff9b39',12,9,2);fireLight.position.set(-5.5,1,-.1);scene.add(fireLight);
 box(scene,mats.wood,-6,.7,3.3,3.1,.16,1.3);for(const x of [-7.2,-4.8])for(const z of [2.8,3.8])box(scene,mats.iron,x,.37,z,.09,.7,.09);for(let i=0;i<5;i++){const ingot=box(scene,mats.bronze,-6.7+i*.34,.85,3.3,.28,.14,.65);ingot.rotation.y=.1;}lathe(scene,mats.clay,[[0,0],[.4,0],[.5,.7],[.57,.8],[.5,.84],[.42,.65],[.3,.1],[0,.1]],-7.1,.12,1.3);
 // Plants, benches and hanging lamps establish scale.
 for(const [x,z]of [[-10,2],[-12,-6],[9,-10],[13,-3],[8,7]]){lathe(scene,mats.teal,[[0,0],[.47,0],[.65,.12],[.73,.88],[.83,1.0],[.83,1.14],[.69,1.14],[.61,.8],[0,.2]],x,.1,z);cyl(scene,mats.wood,x,2,z,.09,2.2,.07);for(let i=0;i<7;i++){const s=sphere(scene,mats.leaf,x+Math.sin(i*2.4)*.2,1.4+i*.37,z+Math.cos(i*2.4)*.2,.75-i*.065);s.scale.set(.8,1.25,.8);}}
 for(const [x,z]of [[-11,5],[11,4]]){for(let i=0;i<4;i++)box(scene,mats.wood,x,.65,z+(i-1.5)*.17,2.6,.09,.12);for(const dx of [-1,1])box(scene,mats.iron,x+dx,.35,z,.1,.6,.65);}
 const glowMap=glowTexture(),glows=[];function glow(p,x,y,z,size){const s=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:'#ffbd68',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));s.position.set(x,y,z);s.scale.setScalar(size);p.add(s);return s;}
 for(const [x,z]of [[-9,-8],[4,-13],[10,-6]]){cyl(scene,mats.iron,x,2,z,.045,3.9);tube(scene,mats.iron,[[x,3.9,z],[x,4.2,z],[x+.7,4.2,z],[x+.8,3.8,z]],.045);cyl(scene,mats.bronze,x+.8,3.5,z,.17,.08,.22);sphere(scene,fireMat,x+.8,3.65,z,.12);glow(scene,x+.8,3.65,z,1.2);}
 // Far coastline, distant roofs and a lighthouse, softened by sea haze.
 for(let i=0;i<13;i++){const x=-90+i*15,z=-62-Math.sin(i*2)*16;const rock=cyl(scene,mats.darkStone,x,-1.9,z,8+rand()*8,8+rand()*13,3+rand()*6,9);rock.rotation.z=(rand()-.5)*.1;for(let j=0;j<3;j++){const bx=x+(rand()-.5)*8,bz=z+(rand()-.5)*5,by=4+rand()*3;box(scene,mats.lightStone,bx,by,bz,2+rand()*2,3+rand()*3,3);const roof=mesh(scene,new T.ConeGeometry(2.6,1.4,4),mats.teal,bx,by+2.7,bz);roof.rotation.y=Math.PI/4;}}
 const lighthouse=new T.Group();lighthouse.position.set(-29,0,-42);scene.add(lighthouse);cyl(lighthouse,mats.lightStone,0,6,0,1.3,14,.8);for(const y of [10.5,12.9,13.8])cyl(lighthouse,mats.bronze,0,y,0,1.2,.15);mesh(lighthouse,new T.ConeGeometry(1.5,1.2,16),mats.teal,0,14.4,0);glow(lighthouse,0,13.3,0,3);
 // A recessed casting bed keeps the active metre of the mold at hand height.
 const pitMat=new T.MeshStandardMaterial({color:'#101b19',roughness:1});
 const pit=mesh(scene,new T.CircleGeometry(2.38,64),pitMat,0,.145,0);pit.rotation.x=-Math.PI/2;
 for(const r of [2.25,2.38])ring(scene,mats.bronze,r,.035,0,.18,0);
 const baseY=.35,workHeight=3,projects=[],ghostMat=new T.MeshBasicMaterial({color:'#d5c39c',wireframe:true,transparent:true,opacity:.04,depthWrite:false});
 for(let i=0;i<3;i++){
  const root=createArtifact(i,mats.bronze,mats.gold);const bounds=new T.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;root.scale.setScalar(workHeight/height);root.position.y=baseY;scene.add(root);
  const lower=new T.Plane(new V(0,-1,0),baseY),upper=new T.Plane(new V(0,-1,0),baseY),bottom=new T.Plane(new V(0,1,0),-baseY);
  const hot=new T.MeshStandardMaterial({color:'#f3a43e',metalness:.6,roughness:.25,emissive:'#ff6306',emissiveIntensity:2.2,clippingPlanes:[upper,bottom],clipShadows:true,bumpMap:metalTex,bumpScale:.014});
  const solids=[],molten=[],ghosts=[];const existing=[];root.traverse(m=>{if(m.isMesh)existing.push(m);});for(const m of existing){const orig=m.material;m.material=orig.clone();m.material.clippingPlanes=[lower];m.material.clipShadows=true;solids.push(m);const h=new T.Mesh(m.geometry,hot);h.position.copy(m.position);h.rotation.copy(m.rotation);h.scale.copy(m.scale);h.castShadow=true;h.receiveShadow=true;m.parent.add(h);molten.push(h);const gh=new T.Mesh(m.geometry,ghostMat);gh.position.copy(m.position);gh.rotation.copy(m.rotation);gh.scale.copy(m.scale);m.parent.add(gh);ghosts.push(gh);}
  const mold=new T.Group();scene.add(mold);const petals=[];const r=PROJECTS[i].radius*workHeight/PROJECTS[i].height+.18;for(let j=0;j<3;j++){const a=(j+1)*Math.PI/2+.2;const petal=new T.Group();const geo=new T.CylinderGeometry(r+.13,r+.13,1,28,1,true,-.66,1.32);const shell=mesh(petal,geo,mats.clay);shell.rotation.y=a;const inner=mesh(petal,new T.CylinderGeometry(r,r,1,28,1,true,-.66,1.32),mats.clay);inner.rotation.y=a;for(const y of [-.49,.49]){const cap=mesh(petal,new T.RingGeometry(r,r+.13,28,1,-.66,1.32),mats.clay,0,y,0);cap.rotation.x=-Math.PI/2;cap.rotation.z=-a+Math.PI/2;}mold.add(petal);petals.push({petal,a});}
  root.visible=mold.visible=false;projects.push({root,lower,upper,bottom,hot,mold,petals,solids,molten,ghosts});
 }
 // Completed works live on the promenade, at progressively greater scale.
 const exhibits=[];for(let i=0;i<3;i++){const group=new T.Group(),loc=[[-7,-7],[0,-10],[8,-6]][i],scale=[.8,1.15,1.45][i];group.position.set(loc[0],.2,loc[1]);scene.add(group);cyl(group,mats.lightStone,0,.18,0,(PROJECTS[i].radius+.3)*scale,.35);const obj=createArtifact(i,mats.bronze,mats.gold);obj.scale.setScalar(scale);obj.position.y=.4;group.add(obj);const fx=new T.Group();obj.add(fx);if(i===0){sphere(fx,fireMat,0,2.22,0,.22);glow(fx,0,2.22,0,1.6);}if(i===1){const watermat=new T.MeshPhysicalMaterial({color:'#8ecac4',metalness:.18,roughness:.12,transparent:true,opacity:.62});for(let j=0;j<12;j++){let a=j/12*TAU;const jet=tube(fx,watermat,[[Math.cos(a)*.56,3.45,Math.sin(a)*.56],[Math.cos(a)*.9,3,Math.sin(a)*.9],[Math.cos(a)*1.01,2.5,Math.sin(a)*1.01]],.019);jet.castShadow=false;const flow=tube(fx,watermat,[[Math.cos(a)*1.02,2.6,Math.sin(a)*1.02],[Math.cos(a)*1.34,2,Math.sin(a)*1.34],[Math.cos(a)*1.48,1.4,Math.sin(a)*1.48]],.024);flow.castShadow=false;}}
  if(i===2)glow(fx,0,3.16,0,2.1);group.visible=false;exhibits.push({group,obj,fx});}
 // The same crucible can stand on its rest or be gripped by the player's hands.
 cyl(scene,mats.iron,STAND.x,.43,STAND.z,.29,.82,.26);
 cyl(scene,mats.bronze,STAND.x,.83,STAND.z,.36,.08);
 const restingTool=createCrucible(mats.iron,mats.bronze,fireMat);restingTool.position.set(STAND.x,STAND.y-.2,STAND.z);restingTool.scale.setScalar(.46);scene.add(restingTool);
 const handRig=createHands(camera,mats);handRig.root.visible=false;
 const inlet=new T.Group();inlet.position.set(INLET.x,INLET.y,INLET.z);scene.add(inlet);
 lathe(inlet,mats.clay,[[.12,-.32],[.13,-.05],[.35,.02],[.43,.1],[.43,.17],[.36,.17],[.28,.07],[.07,-.04],[.07,-.32]]);
 const inletRim=ring(inlet,mats.bronze,.4,.025,0,.14,0);
 const inletMetal=cyl(inlet,fireMat,0,-.03,0,.19,.02);inletMetal.visible=false;
 tube(scene,mats.iron,[[0,.8,1.65],[0,.46,1.6],[0,.42,.8]],.09);
 const handleGroups=[];
 for(const sign of [-1,1]){
  const g=new T.Group();scene.add(g);box(g,mats.iron,0,0,-.12,.13,.42,.12);
  tube(g,mats.bronze,[[0,-.16,0],[0,-.13,.08],[0,.13,.08],[0,.16,0]],.027);
  handleGroups.push(g);
 }
 const streamGeo=new T.CylinderGeometry(1,1,1,10,24,true),streamMat=new T.MeshStandardMaterial({color:'#fff0a5',emissive:'#ff8b18',emissiveIntensity:3.3,roughness:.23,metalness:.6});const stream=mesh(scene,streamGeo,streamMat);stream.frustumCulled=false;stream.castShadow=false;const impactGlow=glow(scene,0,1.2,0,1.4),pourLight=new T.PointLight('#ffa32f',0,7,2);scene.add(pourLight);const sparkGeo=new T.BufferGeometry(),sparkPositions=new Float32Array(70*3);sparkGeo.setAttribute('position',new T.BufferAttribute(sparkPositions,3));const sparks=new T.Points(sparkGeo,new T.PointsMaterial({color:'#ffd28d',size:.035,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));sparks.frustumCulled=false;scene.add(sparks);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(800,600),.27,.6,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
 let mode='intro',displayFill=0,lastCursor=-1,yaw=0,pitch=-.38,moving=false;const targetCamera=new V(),lookTarget=new V(),direction=new V();
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();composer.setSize(w,h);}
 function quality(q){renderer.setPixelRatio(Math.min(devicePixelRatio,q==='high'?1.65:1));bloom.enabled=q==='high';sun.shadow.mapSize.set(q==='high'?2048:1024,q==='high'?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;resize();}
 function setMode(next){mode=next;if(next!=='intro'){camera.fov=66;camera.updateProjectionMatrix();camera.position.set(PLAYER_START.x,PLAYER_START.y,PLAYER_START.z);yaw=0;pitch=-.38;camera.rotation.set(pitch,yaw,0,'YXZ');}}
 function look(dx,dy,sensitivity=1){if(mode==='intro')return;yaw-=dx*.0023*sensitivity;pitch=clamp(pitch-dy*.0023*sensitivity,-1.25,1.15);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld(true);}
 function move(f,side,dt){moving=!!(f||side);if(mode==='intro')return;const speed=2.8*dt/Math.max(1,Math.hypot(f,side)),nx=camera.position.x+(-Math.sin(yaw)*f+Math.cos(yaw)*side)*speed,nz=camera.position.z+(-Math.cos(yaw)*f-Math.sin(yaw)*side)*speed;const blocked=Math.hypot(nx,nz)<2.5||Math.hypot(nx-STAND.x,nz-STAND.z)<.45||Math.hypot(nx+5.5,nz+1.6)<1.7||exhibits.some(e=>e.group.visible&&Math.hypot(nx-e.group.position.x,nz-e.group.position.z)<2.3);if(!blocked&&Math.hypot(nx,nz+3)<16.5){camera.position.x=nx;camera.position.z=nz;}}
 function getInteraction(state){camera.updateMatrixWorld(true);camera.getWorldDirection(direction);const result=interactionFor(state,camera.position,direction);if(handRig.carry<.9)result.point=null;result.readyToPour=handRig.carry>=.9&&handRig.spoutWorld().y>=INLET.y+.015;return result;}
 function render(state,dt,time,{pouring=false,reduced=false}={}){
  const d=derive(state),p=PROJECTS[d.projectIndex],model=projects[d.projectIndex];if(lastCursor!==state.cursor){displayFill=d.progress;lastCursor=state.cursor;}displayFill=lerp(displayFill,d.progress,1-Math.exp(-dt*12));
  for(let i=0;i<projects.length;i++){projects[i].root.visible=i===d.projectIndex&&state.phase!=='finished';projects[i].mold.visible=i===d.projectIndex&&state.phase!=='finished';exhibits[i].group.visible=i<state.completed;}
  const stageBottom=workHeight*d.part/3,stageTop=workHeight*(d.part+1)/3,fillY=baseY+(stageTop-stageBottom)*displayFill;model.root.position.y=baseY-stageBottom;
  model.lower.constant=baseY+(state.phase==='ready'||state.phase==='finished'?stageTop-stageBottom:0);model.upper.constant=fillY;model.bottom.constant=-baseY;
  const hotVisible=state.phase!=='ready'&&state.phase!=='finished'&&state.amount>0;model.molten.forEach(m=>m.visible=hotVisible);model.ghosts.forEach(m=>m.visible=state.phase==='pour');
  model.hot.color.set('#bd8b4b').lerp(new T.Color('#ffcb65'),d.heat);model.hot.emissive.set('#ff6507');model.hot.emissiveIntensity=Math.max(0,d.heat)*2.6;
  const open=state.phase==='ready'?1:state.phase==='reveal'?Math.min(1,state.phaseTime/REVEAL_SECONDS):0,smooth=open*open*(3-2*open);model.mold.position.y=baseY+(stageTop-stageBottom)/2;model.mold.scale.y=stageTop-stageBottom;for(const {petal,a}of model.petals){petal.position.set(Math.sin(a)*smooth*1.5,-smooth*.12,Math.cos(a)*smooth*1.5);petal.rotation.x=Math.cos(a)*smooth*.2;petal.rotation.z=-Math.sin(a)*smooth*.2;}
  const active=pouring&&state.held&&handRig.carry>=.9&&state.phase==='pour'&&mode!=='intro';
  const points=handleGroups.map((g,i)=>{const sign=i===0?-1:1;g.position.set(sign*(.46+smooth*.53),HANDLES.y,HANDLES.z+smooth*.15);return g.position.clone().add(new V(0,0,.06));});
  const openingPose=state.phase==='reveal';
  handRig.update({held:state.held,pouring:active,openingPose,opening:open,moving,reduced,dt,time,handlePoints:points});handRig.root.visible=mode!=='intro';
  restingTool.visible=!state.held&&handRig.carry<.003;
  const interaction=getInteraction(state);inletRim.material=interaction.point?mats.gold:mats.bronze;
  inletMetal.visible=active&&!!interaction.point;
  stream.visible=impactGlow.visible=sparks.visible=active;
  const start=handRig.spoutWorld();camera.getWorldDirection(direction);
  const end=interaction.point?new V(interaction.point.x,interaction.point.y,interaction.point.z):start.clone().addScaledVector(direction,.65);if(!interaction.point)end.y=.18;
  if(active){const pos=stream.geometry.attributes.position;for(let i=0;i<pos.count;i++){const iy=Math.floor(i/11),angle=(i%11)/10*TAU,t=iy/24,curve=start.clone().lerp(end,t);curve.y+=Math.sin(t*Math.PI)*.08;const r=(.023+state.level*.009)*(1+.12*Math.sin(t*30-time*22));pos.setXYZ(i,curve.x+Math.cos(angle)*r,curve.y,curve.z+Math.sin(angle)*r);}pos.needsUpdate=true;stream.geometry.computeVertexNormals();impactGlow.position.copy(end);impactGlow.scale.setScalar(.6+state.level*.15);pourLight.position.copy(end).add(new V(0,.3,0));for(let i=0;i<70;i++){let f=(time*(.8+(i%5)*.13)+i*.148)%1,a=i*2.399;sparkPositions[i*3]=end.x+Math.sin(a)*f*.3;sparkPositions[i*3+1]=end.y+Math.sin(f*Math.PI)*(.1+(i%7)*.025);sparkPositions[i*3+2]=end.z+Math.cos(a)*f*.3;}sparkGeo.attributes.position.needsUpdate=true;sparks.visible=!reduced;}
  pourLight.intensity=lerp(pourLight.intensity,active?9:state.phase==='cool'?d.heat*5:0,Math.min(1,dt*8));fireLight.intensity=11+Math.sin(time*3.2)*.8;fire.material.emissiveIntensity=3+Math.sin(time*5)*.15;
  if(seaMat.userData.shader)seaMat.userData.shader.uniforms.uTime.value=reduced?0:time;for(const e of exhibits)if(e.group.visible&&e.obj.userData.orbits&&!reduced)e.obj.userData.orbits.forEach((o,i)=>{o.rotation.y+=dt*.055*(i+1);});
  if(mode==='intro'){const a=.73+(reduced?0:Math.sin(time*.055)*.07);targetCamera.set(Math.sin(a)*17,6.1,Math.cos(a)*17);lookTarget.set(-3.7,2,0);}else camera.rotation.set(pitch,yaw,0,'YXZ');
  if(mode==='intro'){
   for(const m of projects){m.root.visible=false;m.mold.visible=false;}
   const hero=projects[2];hero.root.visible=true;hero.root.position.y=baseY;hero.lower.constant=20;hero.molten.forEach(m=>m.visible=false);hero.ghosts.forEach(m=>m.visible=false);
   if(!reduced)hero.root.rotation.y=Math.sin(time*.06)*.12;
  }else projects[2].root.rotation.y=0;
  if(mode==='intro'){camera.position.lerp(targetCamera,reduced?1:1-Math.exp(-dt*3.2));camera.lookAt(lookTarget);}composer.render();
 }
 quality(settings.quality||'high');return {render,resize,quality,setMode,look,move,getInteraction,camera,renderer};
}
