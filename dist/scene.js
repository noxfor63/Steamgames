import * as THREE from './vendor/three.module.js';
import { OBJECTS } from './engine.js';

const V = THREE.Vector3;
const mat = (color, roughness=.5) => new THREE.MeshStandardMaterial({color,roughness,metalness:.03});
const materials = new Map();
const material = c => { if(!materials.has(c)) materials.set(c,mat(c)); return materials.get(c); };
const sphereGeo = new THREE.SphereGeometry(1,24,16);
function ellipsoid(parent,color,x,y,z,sx,sy,sz){
  const m=new THREE.Mesh(sphereGeo,material(color)); m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(parent,color,x,y,z,sx,sy,sz){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function tube(parent,color,points,r=.06){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new V(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,36,r,7,false),material(color));m.castShadow=true;parent.add(m);return m;
}
function ring(parent,color,r,tubeSize,x,y,z,rx=0){
  const m=new THREE.Mesh(new THREE.TorusGeometry(r,tubeSize,10,40),material(color));m.position.set(x,y,z);m.rotation.x=rx;m.castShadow=true;parent.add(m);return m;
}
function eyes(g,x,y,z,spread=.36){
  for(const s of [-1,1]){ellipsoid(g,'#253d48',x+s*spread,y,z,.105,.14,.065);ellipsoid(g,'#fff9df',x+s*spread+.025,y+.045,z+.055,.029,.035,.02);}
}
function duck(g,c){
  ellipsoid(g,c,0,.65,0,.92,.64,1.1);ellipsoid(g,c,0,1.36,.56,.6,.6,.6);
  ellipsoid(g,'#ed8b43',0,1.18,1.13,.4,.13,.34);eyes(g,0,1.5,1.05,.28);
  for(const s of [-1,1]){const w=ellipsoid(g,c,s*.83,.76,-.06,.19,.32,.56);w.rotation.z=s*.25;}
  const tail=ellipsoid(g,c,0,.85,-.98,.28,.42,.4);tail.rotation.x=-.6;
  const seam=ring(g,'#f6dda5',.87,.012,0,.64,0,Math.PI/2);seam.scale.y=1.2;
}
function flower(g,c){
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const m=ellipsoid(g,c,Math.cos(a)*.75,.4,Math.sin(a)*.75,.55,.3,.48);m.rotation.y=-a;}
  ellipsoid(g,'#ffe8a2',0,.55,0,.55,.4,.55);eyes(g,0,.66,.47,.2);
}
function whale(g,c){
  ellipsoid(g,c,0,1.04,0,1.4,1.05,2.45);ellipsoid(g,'#d4e8de',0,.73,.3,1.3,.56,2.05);
  for(const s of [-1,1]){let f=ellipsoid(g,c,s*1.5,.62,-.05,.85,.17,.6);f.rotation.z=-s*.15;
    ellipsoid(g,'#233a45',s*1.1,1.3,1.46,.085,.105,.105);ellipsoid(g,'#fff9e4',s*1.13,1.34,1.5,.025,.025,.025);
    const t=ellipsoid(g,c,s*.65,1.1,-2.5,.9,.18,.52);t.rotation.z=s*.2;}
  tube(g,'#30566d',[[-.7,.8,2.05],[0,.69,2.35],[.7,.8,2.05]],.025);
  ring(g,'#a9d3dd',.28,.09,0,2.02,-.2,Math.PI/2);
  for(let i=0;i<4;i++)tube(g,'#b8d9dd',[[-1.05,.78,1.15-i*.38],[0,.36,1.5-i*.38],[1.05,.78,1.15-i*.38]],.012);
}
function arch(g,c){
  tube(g,c,[[-2,0,0],[-2,1.7,0],[-1.65,3.15,0],[0,3.65,0],[1.65,3.15,0],[2,1.7,0],[2,0,0]],.4);
  for(const x of [-2,2]){ellipsoid(g,'#ffe8a2',x,.28,0,.69,.27,.7);ring(g,'#f5d18d',.41,.04,x,1.3,0,Math.PI/2);}
  for(let i=0;i<5;i++)ellipsoid(g,['#f8d674','#c4b6df','#8bcfc6'][i%3],(i-2)*.65,3.48+Math.cos((i-2)*.5)*.3,.03,.4,.43,.45);
}
function airship(g,c){
  ellipsoid(g,c,0,2,0,1.45,1.4,3.2);
  for(const z of [-1.9,-.8,.8,1.9]){const r=ring(g,'#fff0c5',1.25,.035,0,2,z);r.scale.x=Math.sqrt(1-z*z/12);r.scale.y=r.scale.x;}
  box(g,'#5e8d86',0,.45,0,.95,.55,1.65);
  for(const x of [-.45,.45])for(const z of [-.65,.65])tube(g,'#f2e2b7',[[x,.6,z],[x*1.6,1.2,z*1.6]],.028);
  for(const s of [-1,1]){const fin=ellipsoid(g,'#f2d799',s*.6,2,-2.7,.8,.14,.9);fin.rotation.z=s*.3;}
  ellipsoid(g,'#f2d799',0,2.8,-2.7,.14,.75,.8);
  eyes(g,0,2.3,3,.5);
}
function label(text,color='#285357',bg='#fff3ce',width=512){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,width,128);ctx.fillStyle=color;ctx.font='bold 43px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,65,width-36);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width/128*1.2,1.2),new THREE.MeshStandardMaterial({map:t,roughness:.8,side:THREE.DoubleSide}));
}

export function createScene(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b8d9dd');scene.fog=new THREE.Fog('#b8d9dd',90,260);
  const camera=new THREE.PerspectiveCamera(66,1,.08,500);camera.position.set(0,1.8,18);camera.rotation.order='YXZ';camera.rotation.x=-.12;scene.add(camera);
  scene.add(new THREE.HemisphereLight('#fff2d8','#629b9a',2.4));
  const sun=new THREE.DirectionalLight('#ffe4b1',3.4);sun.position.set(-45,65,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-80;sun.shadow.normalBias=.08;sun.target.position.set(0,0,-30);scene.add(sun,sun.target);
  // Quiet low-poly sea and a real traversable 3D promenade.
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),new THREE.MeshStandardMaterial({color:'#78b6bc',roughness:.32,metalness:.25}));water.rotation.x=-Math.PI/2;water.position.y=-.7;scene.add(water);
  const ground=box(scene,'#dcd5b5',0,-.4,-27,59,.7,117);ground.castShadow=false;
  box(scene,'#a7c7bc',0,-.02,-26,47,.12,105).castShadow=false;
  box(scene,'#ecdfc3',0,.05,-23,5,.1,111).castShadow=false;
  for(let z=26;z>-83;z-=3)for(const x of [-27.5,27.5]){
    box(scene,'#f4e3be',x,.65,z,.12,1.3,.12);
    box(scene,'#efdfc4',x,1.08,z-1.5,.07,.09,3);box(scene,'#efdfc4',x,.6,z-1.5,.07,.06,3);
  }
  for(let z=19;z>-76;z-=9){
    box(scene,'#e4d3b0',0,.12,z,4.9,.015,.05).castShadow=false;
    for(const x of [-24,24]){
      box(scene,'#456b68',x,1.8,z,.09,3.6,.09);
      ellipsoid(scene,'#fff1bb',x,3.63,z,.24,.22,.24);
      box(scene,'#416f6d',x,0.25,z,1.1,.45,1.1);
      for(let i=0;i<5;i++){let a=i/5*Math.PI*2;const leaf=ellipsoid(scene,'#669f85',x+Math.cos(a)*.25,.75,z+Math.sin(a)*.25,.12,.6,.12);leaf.rotation.z=Math.cos(a)*.4;}
    }
  }
  // Small seaside cabins add a readable human scale.
  for(const [x,z,c] of [[-20,18,'#dc8d72'],[20,15,'#699b99'],[-21,-13,'#d3b36d'],[21,-23,'#88aabd']]){
    box(scene,c,x,1.65,z,4,3.3,4);box(scene,'#f2e4c5',x,3.4,z,4.5,.24,4.5);
    box(scene,'#2f555b',x,1.6,z+2.03,1.3,2.5,.04);
    const s=label('ЛЕТО', '#355a5e');s.scale.setScalar(.55);s.position.set(x,3.1,z+2.2);scene.add(s);
    for(let i=-2;i<=2;i++)box(scene,i%2?'#e89c7c':'#fff0c5',x+i*.75,2.8,z+2.5,.75,.15,1.2);
  }
  const welcome=label('БОЛЬШОЙ ВДОХ');welcome.position.set(-11,3.2,17);welcome.rotation.y=.3;scene.add(welcome);
  for(const x of [-13,-9])box(scene,'#517f77',x,1.6,17,.13,3.2,.13);
  for(let i=0;i<19;i++){
    const cloud=new THREE.Group();let x=Math.sin(i*8.3)*150,z=-130+Math.cos(i*4.1)*100;
    for(let n=0;n<4;n++)ellipsoid(cloud,'#ecf1e7',n*6,0,0,7,2.2+Math.sin(n+i),3.8);
    cloud.position.set(x,32+(i%4)*8,z);scene.add(cloud);
  }
  for(let i=0;i<70;i++){
    const wave=new THREE.Mesh(new THREE.PlaneGeometry(4+(i%4)*3,.1),new THREE.MeshBasicMaterial({color:'#d7e9da',transparent:true,opacity:.27}));
    wave.rotation.x=-Math.PI/2;wave.position.set((i%2?1:-1)*(36+i%9*6),-.66,35-Math.floor(i/2)*5);scene.add(wave);
  }
  const models=OBJECTS.map(o=>{
    const root=new THREE.Group();root.position.set(o.x,.16,o.z);scene.add(root);
    const body=new THREE.Group();root.add(body);
    if(o.type==='duck')duck(body,o.color);else if(o.type==='flower')flower(body,o.color);else if(o.type==='whale')whale(body,o.color);else if(o.type==='arch')arch(body,o.color);else if(o.type==='airship')airship(body,o.color);
    else{ring(body,o.color,.72,.29,0,.34,0,Math.PI/2);ring(body,'#fff1c5',.72,.018,0,.58,0,Math.PI/2);}
    const plate=new THREE.Mesh(new THREE.CircleGeometry(Math.max(1.2,o.radius*.8),48),new THREE.MeshStandardMaterial({color:'#8fb1a7',roughness:1,transparent:true,opacity:.32}));plate.rotation.x=-Math.PI/2;plate.position.y=-.01;root.add(plate);
    const valve=new THREE.Group();valve.position.set(0,.25,Math.min(o.radius,3));root.add(valve);
    ring(valve,'#ecba64',.17,.045,0,0,0);ellipsoid(valve,'#395f61',0,0,0,.13,.13,.05);
    const marker=ring(root,'#f4d58c',.3,.025,0,.65,Math.min(o.radius,3));
    body.scale.set(o.scale,o.scale*.025,o.scale);
    return {root,body,marker,valve,display:0};
  });
  const nozzle=new THREE.Group();nozzle.position.set(.48,-.39,-.73);nozzle.rotation.set(.08,-.1,0);camera.add(nozzle);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.48,20),material('#517d79'));barrel.rotation.x=Math.PI/2;barrel.castShadow=false;nozzle.add(barrel);
  ring(nozzle,'#efc477',.14,.034,0,0,-.26);ring(nozzle,'#233f48',.09,.033,0,0,-.27);
  box(nozzle,'#e5ba76',0,-.22,.1,.13,.32,.13).castShadow=false;
  const fan=new THREE.Group();fan.position.z=-.25;nozzle.add(fan);
  for(let i=0;i<3;i++){const blade=box(fan,'#c8dfd6',0,.05,0,.025,.11,.015);blade.rotation.z=i*Math.PI*2/3;blade.position.set(Math.sin(i*Math.PI*2/3)*.05,Math.cos(i*Math.PI*2/3)*.05,0);}
  const beams=[];
  for(let i=0;i<12;i++){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36*3),3));
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#f4f5d5',transparent:true,opacity:.45}));line.frustumCulled=false;line.visible=false;scene.add(line);beams.push(line);
  }
  const particles=[];const particleGeo=new THREE.SphereGeometry(.045,6,4), particleMat=new THREE.MeshBasicMaterial({color:'#fff6cc',transparent:true,opacity:.65});
  for(let i=0;i<90;i++){const p=new THREE.Mesh(particleGeo,particleMat);p.visible=false;scene.add(p);particles.push(p);}
  const direction=new V(),start=new V(),end=new V(),forward=new V();
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function render(state,dt,time,targets,pumping,reducedMotion=false){
    for(let i=0;i<models.length;i++){
      const o=OBJECTS[i],m=models[i],p=state.filled[i]/o.capacity;
      m.display += (p-m.display)*Math.min(1,dt*10);
      const t=m.display,eased=Math.pow(t,.7);
      m.body.scale.set(o.scale*(1.08-.08*eased),o.scale*(.025+.975*eased),o.scale*(1.06-.06*eased));
      m.body.rotation.z=reducedMotion?0:Math.sin(time*1.5+i)*.012*eased;
      m.body.position.y=o.type==='airship'?Math.pow(eased,3)*8:0;
      m.marker.visible=p<1;
      m.marker.material=material(targets.includes(o.id)?'#fff3b6':'#759f94');
      m.marker.scale.setScalar(targets.includes(o.id)?1.2: .7);
      m.marker.position.y=.65+(reducedMotion?0:Math.sin(time*2+i)*.06);
    }
    nozzle.position.y=-.39+(pumping&&!reducedMotion?Math.sin(time*23)*.005:0);fan.rotation.z+=dt*(pumping?38:1);
    nozzle.getWorldPosition(start);camera.getWorldDirection(forward);start.addScaledVector(forward,.32);
    for(let i=0;i<beams.length;i++){
      const line=beams[i],id=targets[i];line.visible=pumping&&id!==undefined;
      if(!line.visible)continue;
      models[Number(id)].valve.getWorldPosition(end);
      const arr=line.geometry.attributes.position.array;
      for(let n=0;n<36;n++){const a=n/35;const ripple=Math.sin(a*Math.PI)*(reducedMotion?0:.08);arr[n*3]=THREE.MathUtils.lerp(start.x,end.x,a)+Math.sin(time*12+n*.8+i)*ripple;arr[n*3+1]=THREE.MathUtils.lerp(start.y,end.y,a)+Math.cos(time*8+n*.7+i)*ripple;arr[n*3+2]=THREE.MathUtils.lerp(start.z,end.z,a);}
      line.geometry.attributes.position.needsUpdate=true;
    }
    for(let i=0;i<particles.length;i++){
      const p=particles[i];p.visible=pumping&&targets.length>0&&!reducedMotion;
      if(!p.visible)continue;
      const id=Number(targets[i%targets.length]);models[id].valve.getWorldPosition(end);
      const a=(time*1.3+i*.117)%1;p.position.lerpVectors(start,end,a);p.position.x+=Math.sin(i*8+time*4)*a*.16;p.position.y+=Math.cos(i*4+time*3)*a*.16;
    }
    renderer.render(scene,camera);
  }
  return {camera,resize,render,getDirection:()=>camera.getWorldDirection(direction),renderer,scene};
}
