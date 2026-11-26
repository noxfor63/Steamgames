const PALETTE = {
  ink: '#203f42', dark: '#18383c', cream: '#f3e8c9', brass: '#d8ad62', gold: '#eec77d',
  rust: '#ba673d', teal: '#4b8882', mint: '#b8c6a0', wood: '#855a3d', grass: '#a8b69c'
};
export const MACHINE_POINTS = {
  crane: { x: 360, y: 335, labelX: 320, labelY: 501, name: 'Портовый кран' },
  mill: { x: 800, y: 290, labelX: 830, labelY: 481, name: 'Старая мельница' },
  train: { x: 570, y: 600, labelX: 610, labelY: 704, name: 'Почтовый поезд' }
};
const TAU = Math.PI * 2;
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function seeded(i) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

export class TownScene {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = onSelect;
    this.width = 1200; this.height = 800; this.scale = 1; this.offsetX = 0; this.offsetY = 0;
    this.trainPos = { x: 570, y: 600 };
    this.lastOptions = {};
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || this.canvas.clientWidth || 1200);
    const h = Math.max(1, rect.height || this.canvas.clientHeight || 800);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = w; this.height = h;
    if (this.canvas.width !== Math.round(w * this.dpr) || this.canvas.height !== Math.round(h * this.dpr)) {
      this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
    }
    this.scale = Math.min(w / 1200, h / 800);
    this.offsetX = (w - 1200 * this.scale) / 2;
    this.offsetY = (h - 800 * this.scale) / 2;
  }
  hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.offsetX) / this.scale;
    const y = (clientY - rect.top - this.offsetY) / this.scale;
    for (const [id, p] of Object.entries(MACHINE_POINTS)) {
      if (Math.abs(x - p.labelX) < 112 && Math.abs(y - p.labelY) < 30) return id;
    }
    const t = this.trainPos;
    if (Math.abs(x - t.x) < 110 && Math.abs(y - (t.y - 42)) < 75) return 'train';
    if (x > 242 && x < 545 && y > 205 && y < 476) return 'crane';
    if (x > 710 && x < 930 && y > 155 && y < 438) return 'mill';
    return null;
  }
  poly(points, fill, stroke, lineWidth = 1) {
    const c = this.ctx; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  line(points, stroke, width = 1) {
    const c = this.ctx; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  ellipse(x, y, rx, ry, fill, stroke, width = 1) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  rect(x, y, w, h, fill, radius = 0, stroke = null, width = 1) {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, radius); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  text(text, x, y, size = 16, color = PALETTE.cream, weight = 500, align = 'center') {
    const c = this.ctx; c.font = `${weight} ${size}px "Trebuchet MS", sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(text, x, y);
  }
  gear(x, y, r, rotation = 0, color = PALETTE.brass, hub = PALETTE.dark, teeth = 12) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(rotation);
    const pts = [];
    for (let j = 0; j < teeth * 4; j++) { const a = j / (teeth * 4) * TAU; const rr = j % 4 === 0 || j % 4 === 3 ? r * .81 : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    this.poly(pts, color, '#704f35', 1.6); this.ellipse(0, 0, r * .61, r * .61, null, '#f2d399', 1.2);
    for (let j = 0; j < 6; j++) { const a = j * TAU / 6; this.ellipse(Math.cos(a) * r * .42, Math.sin(a) * r * .42, r * .09, r * .09, '#926443'); }
    this.ellipse(0, 0, r * .19, r * .19, hub, '#f3d797', 1); c.restore();
  }
  bolt(x, y, r = 3) { this.ellipse(x, y, r, r, '#d1b382', '#6b5940', .7); this.line([[x - r * .5, y], [x + r * .5, y]], '#6b5940', 1); }
  box(x, y, w, h, depth, color = '#d4b57e') {
    this.poly([[x, y], [x + depth, y - depth * .5], [x + w + depth, y - depth * .5], [x + w, y]], '#ebcc94', '#705c40', 1);
    this.poly([[x + w, y], [x + w + depth, y - depth * .5], [x + w + depth, y + h - depth * .5], [x + w, y + h]], '#a88753', '#705c40', 1);
    this.rect(x, y, w, h, color, 2, '#705c40', 1);
    this.line([[x + 6, y + 5], [x + w - 6, y + h - 5]], '#93713e', 4);
    this.line([[x + w - 6, y + 5], [x + 6, y + h - 5]], '#93713e', 4);
    this.rect(x + 1, y + 5, w - 2, 4, '#ebcf96'); this.rect(x + 1, y + h - 9, w - 2, 4, '#ebcf96');
  }
  tree(x, y, scale = 1, color = '#64877a') {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.ellipse(10, 1, 27, 11, '#385b4e33'); this.line([[0, 0], [0, -45]], '#836649', 8);
    this.poly([[-28, -28], [0, -91], [28, -28]], color); this.poly([[-23, -48], [0, -108], [23, -48]], '#829d82'); this.poly([[0, -108], [23, -48], [0, -48]], '#55796e');
    c.restore();
  }
  lamp(x, y, t, lit = false) {
    this.ellipse(x + 2, y, 12, 5, '#44605444'); this.line([[x, y], [x, y - 48], [x + 10, y - 54]], '#4e665d', 4);
    this.rect(x + 3, y - 64, 15, 17, lit ? '#f8d77f' : '#b4c6a2', 3, '#4a6057', 2); this.poly([[x, y - 65], [x + 10, y - 72], [x + 21, y - 65]], '#4a6057');
    if (lit) { const c = this.ctx; c.save(); const g = c.createRadialGradient(x + 11, y - 55, 1, x + 11, y - 55, 30); g.addColorStop(0, '#ffd88144'); g.addColorStop(1, '#ffd88100'); c.fillStyle = g; c.fillRect(x - 20, y - 85, 60, 60); c.restore(); }
  }
  house(x, y, scale = 1, color = '#c6ad7d', roof = '#648a86') {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.ellipse(10, 2, 40, 12, '#294b3b25');
    this.poly([[-30, -50], [25, -50], [25, 0], [-30, 0]], color, '#78664d', 1);
    this.poly([[25, -50], [47, -63], [47, -14], [25, 0]], '#9d9871', '#78664d', 1);
    this.poly([[-39, -48], [-3, -83], [31, -48]], roof, '#435e55', 2);
    this.poly([[-3, -83], [22, -98], [58, -63], [31, -48]], '#8ba195', '#435e55', 2);
    this.rect(-7, -29, 14, 29, '#43665f', 2); this.rect(-24, -35, 11, 13, '#e7d6a2', 1, '#6b785f', 2); this.rect(11, -35, 10, 13, '#e7d6a2', 1, '#6b785f', 2);
    this.rect(27, -91, 8, 20, '#be8b60'); this.line([[-39, -48], [31, -48]], '#cfc6a2', 3); c.restore();
  }
  foundation() {
    const c = this.ctx;
    const shadow = c.createRadialGradient(600, 565, 180, 600, 565, 560); shadow.addColorStop(0, '#061a21bb'); shadow.addColorStop(1, '#061a2100');
    c.save(); c.translate(0, 330); c.scale(1, .44); c.fillStyle = shadow; c.fillRect(0, 0, 1200, 1100); c.restore();
    const top = [[116, 350], [548, 191], [1083, 349], [1040, 586], [595, 744], [124, 571]];
    this.poly([[124, 571], [595, 744], [1040, 586], [1040, 619], [595, 779], [124, 607]], '#5d3f31', '#2c3932', 2);
    this.poly([[124, 571], [595, 744], [595, 778], [124, 606]], '#825637');
    this.line([[131, 589], [595, 759], [1034, 603]], '#b18351', 2);
    this.line([[131, 601], [595, 772], [1034, 616]], '#3e3027', 2);
    for (let j = 0; j < 15; j++) { let x = 144 + j * 30, y = 581 + j * 11; this.line([[x, y], [x, y + 26]], '#573a2c', 1); }
    this.poly(top, '#a8b79b', '#cfba85', 5);
    c.save(); c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip();
    const grassGrad = c.createLinearGradient(0, 190, 0, 740); grassGrad.addColorStop(0, '#b5c2a0'); grassGrad.addColorStop(1, '#8da78d'); c.fillStyle = grassGrad; c.fillRect(90, 180, 1010, 600);
    for (let j = 0; j < 700; j++) { const x = 100 + seeded(j + 1) * 1000, y = 190 + seeded(j + 2000) * 550; this.ellipse(x, y, .7 + seeded(j + 70) * 1.8, .7, j % 3 ? '#e0dccd22' : '#486e5f22'); }
    this.poly([[530, 223], [589, 240], [365, 565], [305, 550]], '#cbbf99');
    this.poly([[245, 413], [254, 450], [970, 445], [984, 418]], '#cbbf99');
    this.line([[240, 432], [990, 432]], '#aa9f80', 1.1);
    this.poly([[951, 312], [1002, 324], [1036, 570], [976, 591], [907, 495], [916, 433]], '#728c7a');
    this.poly([[952, 327], [989, 339], [1021, 560], [978, 574], [923, 493], [930, 433]], '#5b9f9e');
    this.poly([[952, 327], [961, 330], [944, 433], [937, 491], [987, 572], [978, 574], [923, 493], [930, 433]], '#367b80');
    for (let j = 0; j < 10; j++) this.line([[957 + j * 4, 375 + j * 17], [970 + j * 4, 374 + j * 17]], '#c7e3c455', 2);
    c.restore();
    for (const [x, y] of [[190, 371], [440, 280], [759, 255], [1022, 403], [997, 573], [780, 691], [470, 696], [191, 589]]) this.bolt(x, y, 4);
  }
  tracks() {
    const c = this.ctx, cx = 600, cy = 506, rx = 365, ry = 129;
    this.ellipse(cx, cy, rx + 9, ry + 8, null, '#71816d', 20);
    for (let j = 0; j < 76; j++) { const a = j / 76 * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; const nx = Math.cos(a), ny = Math.sin(a); this.line([[x - nx * 10, y - ny * 9], [x + nx * 10, y + ny * 9]], '#a28f68', 5); }
    this.ellipse(cx, cy, rx - 5, ry - 5, null, '#526b60', 3); this.ellipse(cx, cy, rx + 5, ry + 5, null, '#526b60', 3);
    this.ellipse(cx, cy - 1, rx - 5, ry - 5, null, '#d4cbac', 1); this.ellipse(cx, cy - 1, rx + 5, ry + 5, null, '#d4cbac', 1);
    // A timber bridge crosses the canal.
    for (let j = 0; j < 10; j++) this.line([[938 + j * 6, 481], [954 + j * 6, 514]], j % 2 ? '#ba9b6d' : '#a98a5c', 5);
    this.line([[934, 479], [993, 479]], '#5c7768', 4); this.line([[951, 515], [1011, 515]], '#5c7768', 4);
  }
  pipe(state, derived) {
    const c = this.ctx;
    const paths = {crane:[[600, 540], [548, 515], [482, 515], [380, 452]], mill:[[600, 540], [650, 500], [758, 500], [805, 415]], train:[[600, 540], [584, 566], [610, 610]]};
    for (const [id, p] of Object.entries(paths)) {
      const connected = state.machines?.[id]?.connected;
      this.line(p, '#47685d44', 12); this.line(p.map(([x,y])=>[x,y-4]), connected ? '#ba8a49' : '#7b8e75', 7);
      this.line(p.map(([x,y])=>[x,y-6]), connected ? '#e3bb76' : '#acb89b', 2);
      if (connected && derived.active?.includes(id)) {
        c.save(); c.setLineDash([3, 14]); c.lineDashOffset = -(state.time || 0) * 18; this.line(p.map(([x,y])=>[x,y-5]), '#ffe2a4', 3); c.restore();
      }
    }
    this.ellipse(600, 550, 52, 26, '#42645633');
    this.ellipse(600, 538, 42, 22, '#5d6250', '#384e46', 2);
    this.ellipse(600, 531, 42, 22, '#b18b55', '#e1bb7b', 2);
    this.gear(600, 529, 27, derived.active?.length ? (state.time || 0) * .4 : 0, derived.overloaded ? '#b46541' : '#dfbd78');
    this.rect(593, 496, 14, 30, '#776548', 4, '#d3b47a', 2);
    this.ellipse(600, 490, 17, 9, null, '#eed5a2', 7);
  }
  halo(x, y, rx, ry, selected, active) {
    if (!selected && !active) return;
    const c = this.ctx; c.save(); c.shadowColor = active ? '#f3ce8766' : '#d9ecc755'; c.shadowBlur = 20;
    this.ellipse(x, y, rx, ry, active ? '#ead69722' : '#e2eecb18', selected ? '#f7dfa2' : '#e0d9a466', selected ? 2.2 : 1); c.restore();
  }
  crane(state, derived, selected, t) {
    const m = state.machines.crane; const active = derived.active?.includes('crane');
    this.halo(367, 440, 109, 39, selected === 'crane', active);
    this.ellipse(369, 447, 91, 29, '#2f554633');
    this.poly([[283, 424], [340, 401], [442, 436], [383, 460]], '#a28f68', '#716b50', 2);
    for(let j=0;j<8;j++) this.line([[289+j*12,426+j*4],[345+j*12,405+j*4]], '#d0b583', 7);
    this.poly([[339, 427], [354, 420], [368, 437], [351, 443]], '#c8904f');
    this.poly([[373, 425], [390, 429], [382, 444], [365, 438]], '#c8904f');
    this.line([[349, 426], [360, 262], [381, 432]], '#795e3e', 16);
    this.line([[349, 426], [360, 262], [381, 432]], m.repaired ? '#dc9953' : '#b48b57', 10);
    this.line([[353, 380], [376, 380], [356, 337], [370, 337], [360, 293]], '#d1b06c', 6);
    this.line([[294, 265], [360, 231], [509, 289]], '#594f39', 15);
    this.line([[294, 262], [360, 228], [509, 286]], m.repaired ? '#d79851' : '#b38d59', 10);
    this.line([[295, 263], [509, 286]], '#e3bd78', 4);
    this.line([[326, 252], [348, 271], [360, 233], [382, 275], [406, 249], [429, 280], [451, 267], [476, 285]], '#e7bd75', 3);
    this.rect(277, 259, 29, 22, '#6d7e67', 3, '#3f5e53', 2);
    this.ellipse(360, 255, 13, 13, '#ab743d', '#edc57c', 3); this.bolt(360, 255, 5);
    const hookY = active ? 358 + Math.sin(t * 1.3) * 27 : 391;
    this.line([[508, 286], [508, hookY]], '#385247', 2); this.line([[513, 288], [513, hookY]], '#a4b59a', 1);
    this.rect(501, hookY, 20, 13, '#e0ad61', 3, '#705c40', 2);
    const c=this.ctx;c.beginPath();c.arc(510,hookY+19,8,-Math.PI/2,Math.PI*.9);c.strokeStyle='#3e554a';c.lineWidth=4;c.stroke();
    this.rect(332, 362, 54, 52, m.repaired ? '#487d72' : '#758677', 5, '#395c4e', 2);
    this.rect(340, 371, 17, 18, '#d6d9ad', 2, '#a2a67e', 1); this.rect(361, 371, 17, 18, '#aac7ab', 2);
    this.line([[337, 358],[385,358]],'#e0b475',6); this.gear(365,410,19, active ? t : 0, m.repaired?'#e0b475':'#a68c63');
    this.bolt(340,401);this.bolt(382,401);
    const remain = 1 - clamp((state.harbor || 0)/100,0,1);
    if(remain>.02) { this.box(443,430,45,32,13); if(remain>.35)this.box(477,449,48,35,14,'#bc9b68'); if(remain>.68)this.box(457,405,32,25,10,'#d8bd87'); }
    else { this.rect(443,430,77,5,'#e1c386',2); this.text('ПРИЧАЛ ОТКРЫТ',480,451,10,'#365a4d',800); }
    if(active && remain>.03) this.box(491,hookY+29,32,25,10);
    this.dust(359,352,75,85,m.clean,17);
    this.socket(319,420,m,selected==='crane');
  }
  mill(state, derived, selected, t) {
    const m=state.machines.mill, active=derived.active?.includes('mill');
    this.halo(816,419,103,34,selected==='mill',active);
    this.ellipse(825,430,103,26,'#264f3f33');
    this.poly([[741,419],[772,247],[855,247],[896,405],[823,446]],'#c6ad7c','#806d4e',2);
    this.poly([[817,258],[855,247],[896,405],[823,446]],'#9c9672','#806d4e',1);
    this.poly([[753,254],[803,183],[864,246]],m.repaired?'#ba6c46':'#a18158','#725b45',2);
    this.poly([[803,183],[845,197],[880,247],[864,246]],'#895d41','#725b45',1);
    this.line([[751,256],[863,250],[879,248]],'#e8c58a',5);
    for(let j=0;j<9;j++) { const y=266+j*17;const left=770-(y-267)*.15;this.line([[left,y],[815,y+3]],'#a28d63',1);if(j%2)this.line([[left+20,y],[left+20,y+16]],'#a28d63',1);else this.line([[left+38,y],[left+38,y+16]],'#a28d63',1); }
    this.rect(779,366,34,60,'#57756a',16,'#60715b',2);this.rect(786,378,19,27,'#c6c99b',5);this.line([[796,379],[796,405]],'#5b7569',2);this.bolt(807,413,2);
    this.rect(825,328,22,30,'#3c635b',3,'#ded1a1',4); this.line([[837,328],[837,358]],'#d6c69c',2);
    this.ellipse(810,286,14,14,'#5a6b55');
    const c=this.ctx;c.save();c.translate(810,285);c.rotate(active?t*.75:-.2);
    for(let j=0;j<4;j++) {c.save();c.rotate(j*Math.PI/2); this.line([[0,0],[0,-102]],'#654f35',6);this.poly([[-5,-30],[22,-32],[26,-105],[-5,-102]],m.repaired?'#e8d4a4':'#d1c8a1','#826a48',2);for(let k=0;k<6;k++)this.line([[-3,-37-k*11],[23,-39-k*11]],'#baa272',2);this.line([[8,-33],[10,-103]],'#a08b60',2);c.restore();}
    this.ellipse(0,0,13,13,'#b4874d','#f2d69b',3);this.bolt(0,0,5);c.restore();
    // Polishing drum and its canvas belt.
    this.rect(857,382,39,40,'#5d8171',8,'#3b6154',2);this.ellipse(878,383,20,10,'#c9b27d','#e1c791',2);this.ellipse(878,415,20,10,'#42685c');
    this.line([[850,373],[872,393]],'#746b4c',4);this.gear(846,375,15,active?-t:0,'#d1ad70');
    if(active){this.ellipse(878,382,12,5,null,'#f2d997',2);this.ellipse(875+Math.sin(t*3)*5,378,2,2,'#fff1be');}
    this.box(717,403,28,24,8,'#b69e72'); this.rect(706,425,36,4,'#cfbd8c');
    this.dust(798,354,78,62,m.clean,53);
    this.socket(756,411,m,selected==='mill');
  }
  train(state, derived, selected, t) {
    const m=state.machines.train, active=derived.active?.includes('train');
    let angle=Math.PI*.55;
    if(active) { this.trainAngle = (this.trainAngle ?? angle) + Math.min(.05, Math.max(0,t-(this.lastTrainT??t)))*.37; angle=this.trainAngle; }
    else angle=this.trainAngle??angle;
    this.lastTrainT=t;
    const x=600+Math.cos(angle)*365,y=506+Math.sin(angle)*129;
    this.trainPos={x,y};
    const c=this.ctx;c.save();c.translate(x,y); const direction=Math.sin(angle)>0?-1:1;c.scale(direction,1);
    this.halo(0,2,103,25,selected==='train',active);
    this.ellipse(0,4,103,20,'#294d403f');
    this.rect(-85,-41,39,31,'#b88c4f',3,'#675d40',2); this.poly([[-85,-41],[-75,-48],[-36,-48],[-46,-41]],'#d6b877');this.rect(-81,-37,31,4,'#e0c18c');
    this.line([[-42,-13],[-27,-13]],'#3c594d',4);
    this.rect(-30,-29,104,15,'#536250',3);this.rect(-34,-36,113,10,'#c28d4b',3,'#6a684e',1);
    this.rect(-25,-82,40,48,m.repaired?'#c6784e':'#aa8e6e',4,'#645e49',2);this.rect(-29,-89,48,10,m.repaired?'#4a7569':'#788778',3,'#385f52',2);
    this.rect(-18,-75,24,23,'#bcd5b8',3,'#526f60',3);this.line([[-6,-74],[-6,-52]],'#6c8671',2);
    this.rect(10,-64,58,30,m.repaired?'#3d827a':'#718e7d',9,'#365d51',2);
    this.ellipse(66,-49,12,16,m.repaired?'#59968b':'#829981','#31594d',2);this.ellipse(70,-49,5,8,'#dec18b');
    this.rect(40,-91,13,30,'#506d5d',2);this.rect(35,-96,23,7,'#334f44',3);this.rect(14,-72,15,10,'#ccad70',5,'#61705a',1);
    this.line([[74,-28],[86,-18],[68,-18]],'#536b56',3);
    for(const wx of [-71,-52,-11,22,52]) {this.ellipse(wx,-12,wx<-40?8:12,wx<-40?8:12,'#324f44','#a3a982',3);this.ellipse(wx,-12,3,3,'#d5bb81');if(active){const a=t*3;this.line([[wx-Math.cos(a)*7,-12-Math.sin(a)*7],[wx+Math.cos(a)*7,-12+Math.sin(a)*7]],'#b9ad80',2);}}
    this.line([[-11,-11],[52,-11]],'#e4bf7d',3); this.bolt(51,-49,3);this.bolt(24,-49,3);
    if(active){for(let j=0;j<4;j++){const p=(t*.6+j*.25)%1;this.ellipse(47-p*33,-103-p*50,5+p*12,4+p*9,`rgba(231,225,199,${.35*(1-p)})`);}}
    this.dust(0,-55,71,35,m.clean,107);
    this.socket(-37,-48,m,selected==='train');
    c.restore();
  }
  socket(x,y,m,selected){
    this.ellipse(x,y,13,13,m.repaired?'#d4b174':'#435b4e','#e1c58d',2);
    if(m.repaired){this.gear(x,y,9,0,'#e6c98d');}
    else {this.line([[x-5,y],[x+5,y]],m.clean>=1?'#f7da8e':'#9eaa89',2);this.line([[x,y-5],[x,y+5]],m.clean>=1?'#f7da8e':'#9eaa89',2);}
    if(selected)this.ellipse(x,y,18,18,null,'#f2db9d88',1);
  }
  dust(x,y,rx,ry,clean,seed){
    if(clean>=1)return; const c=this.ctx;c.save();c.globalAlpha=(1-(clean||0))*.7;
    for(let j=0;j<36;j++){const a=seeded(j+seed)*TAU,r=Math.sqrt(seeded(j+seed+400));this.ellipse(x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r,2+seeded(j+seed+700)*9,2+seeded(j+seed+900)*5,j%3?'#97866c':'#6c735d');}
    c.restore();
  }
  label(id,state,derived,selected){
    const p=MACHINE_POINTS[id],m=state.machines[id],active=derived.active?.includes(id),isSelected=selected===id;
    const w=192,h=48,x=p.labelX-w/2,y=p.labelY-h/2;
    const c=this.ctx;c.save();c.shadowColor='#102c3433';c.shadowBlur=12;c.shadowOffsetY=4;
    this.rect(x,y,w,h,isSelected?'#f0dfb9':'#183d40ed',12,isSelected?'#e5b975':'#9ebaa332',isSelected?2:1);c.restore();
    let status=m.clean<1?'Нужна чистка':!m.repaired?'Установите шестерню':!m.connected?'Не подключён':derived.overloaded?'Перегрузка':active?'Работает':'Подключён';
    const textColor=isSelected?'#25494a':'#f1e1bd';this.text(p.name,p.labelX-1,p.labelY-8,16,textColor,700);
    this.text(status,p.labelX,p.labelY+11,13,isSelected?'#617466':active?'#b7d2a3':'#a9bdb0',500);
    if(m.clean<1){this.rect(x+18,y+h-3,w-36,2,'#45665e',1);this.rect(x+18,y+h-3,(w-36)*m.clean,2,'#e1bd77',1);}
    if(active){this.ellipse(x+13,y+14,2.5,2.5,'#b9d59e');}
    if(state.reducer===id){this.rect(x+w-17,y-9,22,20,'#dcad60',6,'#f6d794',1);this.gear(x+w-6,y+1,7,0,'#fff0bb');}
  }
  render(state,derived={},options={}){
    if(!state?.machines)return;
    const rect=this.canvas.getBoundingClientRect();if(Math.abs(rect.width-this.width)>.5||Math.abs(rect.height-this.height)>.5)this.resize();
    const c=this.ctx,t=typeof options.time==='number'?options.time/1000:(state.time||0),selected=options.selected;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    const bg=c.createRadialGradient(this.width*.5,this.height*.45,10,this.width*.5,this.height*.55,Math.max(this.width,this.height)*.7);bg.addColorStop(0,'#3f6965');bg.addColorStop(.55,'#254c4e');bg.addColorStop(1,'#16383e');c.fillStyle=bg;c.fillRect(0,0,this.width,this.height);
    c.save();c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);
    // Floating dust catches the workshop lamplight.
    for(let j=0;j<26;j++){const x=60+seeded(j+900)*1080,y=45+seeded(j+1100)*670+Math.sin(t*.3+j)*5;this.ellipse(x,y,1.2,1.2,`rgba(231,215,169,${.08+seeded(j+1200)*.12})`);}
    this.foundation();this.tracks();
    this.tree(588,261,.7);this.tree(1024,351,.8);this.tree(217,398,.7);
    this.house(641,324,.77,'#d6c090','#ba7853');this.house(952,374,.6,'#b9b78c','#b57a51');this.house(693,363,.62,'#bca982','#668b7c');
    const trainBehind = Math.sin(this.trainAngle ?? Math.PI * .55) < 0;
    if(trainBehind) this.train(state,derived,selected,t);
    this.pipe(state,derived);
    this.crane(state,derived,selected,t);this.mill(state,derived,selected,t);
    this.lamp(239,500,t,!!derived.active?.length);this.lamp(682,599,t,!!derived.active?.length);this.lamp(934,440,t,!!derived.active?.length);
    this.tree(157,486,.68,'#5f8270');this.tree(1004,580,.55,'#658b73');
    if(!trainBehind) this.train(state,derived,selected,t);
    this.tree(278,607,.6,'#638b72');
    this.label('crane',state,derived,selected);this.label('mill',state,derived,selected);this.label('train',state,derived,selected);
    if(derived.completed){this.text('ГОРОД СНОВА ЖИВЁТ',600,160,15,'#f4ddb0',700);for(let j=0;j<12;j++){const a=t*.3+j*TAU/12;this.ellipse(600+Math.cos(a)*360,180+Math.sin(a)*25,1.5,1.5,'#f1cf88');}}
    c.restore();
  }
}
