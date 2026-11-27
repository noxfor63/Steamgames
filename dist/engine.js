export const SAVE_VERSION=2;
export const PROJECTS=[
 {id:'lantern',name:'Светильник прилива',subtitle:'Первый свет на пустой набережной',description:'Бронзовый фонарь, который будет встречать корабли тёплым светом.',parts:['Основание','Световая камера','Венец'],capacity:[26,34,44],rewards:[20,30,50],height:3.6,radius:1.05},
 {id:'fountain',name:'Чаша истока',subtitle:'Вернуть площади голос воды',description:'Три яруса чеканной бронзы. После последней отливки по ним побежит вода.',parts:['Нижняя чаша','Водяная колонна','Верхняя чаша'],capacity:[100,160,200],rewards:[80,110,160],height:4,radius:1.65},
 {id:'orrery',name:'Небесный атлас',subtitle:'Подарить городу маленькую вселенную',description:'Армиллярная сфера: большие кольца, медленные орбиты и солнце в центре.',parts:['Постамент','Небесные кольца','Сердце атласа'],capacity:[340,520,720],rewards:[240,360,600],height:5,radius:1.85}
];
export const TOOLS=[{name:'Ручной тигель',flow:2.2,cost:0},{name:'Широкий носик',flow:8,cost:45},{name:'Двойной канал',flow:22,cost:180},{name:'Тигель великана',flow:48,cost:500}];
export const COOL_SECONDS=2.8,REVEAL_SECONDS=2.4;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function newGame(){return {version:SAVE_VERSION,cursor:0,amount:0,phase:'pour',phaseTime:0,credits:0,level:0,completed:0,elapsed:0,held:false};}
export function derive(s){const cursor=clamp(s.cursor,0,8),projectIndex=Math.floor(cursor/3),part=cursor%3,project=PROJECTS[projectIndex],capacity=project.capacity[part],tool=TOOLS[s.level];return {projectIndex,project,part,capacity,tool,nextTool:TOOLS[s.level+1]||null,progress:clamp(s.amount/capacity,0,1),overall:(s.phase==='finished'?9:s.cursor+s.amount/capacity)/9,finished:s.phase==='finished',stageName:project.parts[part],heat:s.phase==='pour'?1:s.phase==='cool'?1-s.phaseTime/COOL_SECONDS:0,canUpgrade:!!TOOLS[s.level+1]&&s.credits>=TOOLS[s.level+1].cost};}
export function act(s,a){
 if(a.type==='upgrade'){const n=TOOLS[s.level+1];return n&&s.credits>=n.cost?{...s,level:s.level+1,credits:s.credits-n.cost}:s;}
 if(a.type==='pickUp'&&a.reachable&&!s.held&&s.phase!=='reveal')return {...s,held:true};
 if(a.type==='putDown'&&a.reachable&&s.held&&s.phase!=='reveal')return {...s,held:false};
 if(a.type==='next'&&a.reachable&&s.phase==='ready'){
  if(s.cursor===8)return {...s,phase:'finished',completed:3};
  return {...s,cursor:s.cursor+1,amount:0,phase:'pour',phaseTime:0};
 }
 return s;
}
export function tick(s,dt,input={}){
 if(!Number.isFinite(dt)||dt<=0||s.phase==='finished'||s.phase==='ready')return s;
 dt=Math.min(dt,.25);const n={...s,elapsed:s.elapsed+dt},d=derive(s);
 if(s.phase==='pour'&&s.held&&input.pouring&&input.aimed){
  n.amount=Math.min(d.capacity,s.amount+dt*d.tool.flow);
  if(n.amount>=d.capacity){n.phase='cool';n.phaseTime=0;}
 }else if(s.phase==='cool'){
  n.phaseTime=Math.min(COOL_SECONDS,s.phaseTime+dt);
  if(n.phaseTime>=COOL_SECONDS){n.phase='sealed';n.phaseTime=0;}
 }else if(['sealed','reveal'].includes(s.phase)&&!s.held&&input.opening&&input.reachable){
  n.phase='reveal';n.phaseTime=Math.min(REVEAL_SECONDS,s.phaseTime+dt);
  if(n.phaseTime>=REVEAL_SECONDS){n.phase='ready';n.credits+=d.project.rewards[d.part];if(d.part===2)n.completed=Math.max(n.completed,d.projectIndex+1);}
 }
 return n;
}
export function restoreSave(raw){
 if(!raw||![1,SAVE_VERSION].includes(raw.version))return newGame();
 const o=newGame();o.cursor=Number.isInteger(raw.cursor)?clamp(raw.cursor,0,8):0;o.level=Number.isInteger(raw.level)?clamp(raw.level,0,TOOLS.length-1):0;o.credits=Number.isFinite(raw.credits)?clamp(raw.credits,0,100000):0;o.elapsed=Number.isFinite(raw.elapsed)?clamp(raw.elapsed,0,1e8):0;
 const d=derive(o);o.amount=Number.isFinite(raw.amount)?clamp(raw.amount,0,d.capacity):0;
 o.phase=['pour','cool','sealed','reveal','ready','finished'].includes(raw.phase)?raw.phase:'pour';
 if(o.phase==='finished'&&o.cursor!==8)o.phase='pour';
 if(raw.version===1&&o.phase==='reveal')o.phase='sealed';
 if(o.phase!=='pour')o.amount=d.capacity;
 o.phaseTime=Number.isFinite(raw.phaseTime)?clamp(raw.phaseTime,0,o.phase==='cool'?COOL_SECONDS:REVEAL_SECONDS):0;
 if(o.phase==='sealed')o.phaseTime=0;
 o.held=raw.version===1?o.phase==='pour'&&o.amount>0:raw.held===true;
 if(o.phase==='reveal')o.held=false;
 o.completed=Math.floor(o.cursor/3)+(o.cursor%3===2&&['ready','finished'].includes(o.phase)?1:0);
 return o;
}
