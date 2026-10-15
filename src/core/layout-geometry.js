/* Browser / Node module with explicit inputs and no app state or DOM.
 * Coordinates and lengths use mm; area() returns m² and perim() returns m. */
(function(root){
'use strict';
const area = poly => Math.abs(poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
const perim = poly => poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
const bbox = poly => { const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
function aabb(f){ const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return {hw:f.w/2*c + f.d/2*s, hh:f.w/2*s + f.d/2*c}; }
const inPoly = (x, y, poly) => { let c = false;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++){ const [xi,yi] = poly[i], [xj,yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) c = !c; }
  return c; };
function corners(f){
  const a = f.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a), hw = f.w/2, hd = f.d/2;
  return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([x,y]) => [f.cx + x*c - y*s, f.cy + x*s + y*c]);
}
// 分离轴定理判断两个旋转矩形是否重叠；重叠不足 5mm（刚好贴边）不算
function obbOverlap(a, b){
  if(a.kitchen||b.kitchen)return footprints(a).some(A=>footprints(b).some(B=>polygonOverlap(A,B)));
  const A = corners(a), B = corners(b);
  for (const P of [A, B]) for (let i = 0; i < 2; i++){
    const nx = P[i+1][1] - P[i][1], ny = P[i][0] - P[i+1][0], L = Math.hypot(nx, ny) || 1;
    const pa = A.map(p => (p[0]*nx + p[1]*ny)/L), pb = B.map(p => (p[0]*nx + p[1]*ny)/L);
    if (Math.max(...pa) <= Math.min(...pb) + 5 || Math.max(...pb) <= Math.min(...pa) + 5) return false;
  }
  return true;
}
function footprints(f){const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);return f.kitchen?K.footprints(f):[corners(f)];}
function polygonOverlap(A,B){for(const P of [A,B])for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length],nx=q[1]-P[i][1],ny=P[i][0]-q[0],L=Math.hypot(nx,ny)||1,pa=A.map(p=>(p[0]*nx+p[1]*ny)/L),pb=B.map(p=>(p[0]*nx+p[1]*ny)/L);if(Math.max(...pa)<=Math.min(...pb)+5||Math.max(...pb)<=Math.min(...pa)+5)return false;}return true;}
function bodyParts(f){const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null),K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);return f.kitchen?K.bodyParts(f):[{p:corners(f),vertical:D?.furnitureVerticalBounds(f)}];}
function volumeOverlap(a,b){return bodyParts(a).some(A=>bodyParts(b).some(B=>verticalOverlap(a,b,[A.vertical,B.vertical])&&polygonOverlap(A.p,B.p)));}
// 不参与碰撞检查：地毯、墙挂 / 吊装、台面上的设备、绿植（枝叶可伸到家具上方）；椅子推进桌下也属正常
const NOCOLLIDE = new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','plant']);
const SEATS = new Set(['chair','barstool','officechair','armchair']), TABLES = new Set(['table','roundtable','desk','island']);
// Shared with project review: seats may be tucked under a tabletop.
const tuckedSeatPair = (a,b) => SEATS.has(a.type)&&TABLES.has(b.type)||SEATS.has(b.type)&&TABLES.has(a.type);
// Unknown heights stay conservative. Both the canvas and project review use
// this rule so stacked appliances do not produce contradictory findings.
function verticalOverlap(a,b,ranges){
  const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null);
  const [A,B]=ranges||[D?.furnitureVerticalBounds(a),D?.furnitureVerticalBounds(b)];
  return !(A&&B&&Math.min(A.top,B.top)-Math.max(A.bottom,B.bottom)<=1e-6);
}
const solidForCollision=f=>!NOCOLLIDE.has(f.type)&&!(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null))?.definition(f)?.embedded;
function collisions(furniture){
  const L = furniture.filter(solidForCollision), out = [];
  const box = L.map(aabb);
  const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null),vertical=L.map(f=>D?.furnitureVerticalBounds(f));
  for (let i = 0; i < L.length; i++) for (let j = i+1; j < L.length; j++){
    const a = L[i], b = L[j];
    if (Math.abs(a.cx-b.cx) >= box[i].hw+box[j].hw || Math.abs(a.cy-b.cy) >= box[i].hh+box[j].hh) continue;   // 外包盒快速排除
    if (tuckedSeatPair(a,b)) continue;
    if(!verticalOverlap(a,b,[vertical[i],vertical[j]]))continue;
    const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
    if(C&&(C.fridgeFitsBay(a,b)||C.fridgeFitsBay(b,a)||C.hoodBayFit(a,b)?.fits||C.hoodBayFit(b,a)?.fits))continue;
    if (a.kitchen||b.kitchen?volumeOverlap(a,b):obbOverlap(a,b)) out.push([a.id, b.id]);
  }
  return out;
}
const groupBox = items => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  items.forEach(f => { const {hw, hh} = aabb(f); x0 = Math.min(x0, f.cx-hw); y0 = Math.min(y0, f.cy-hh); x1 = Math.max(x1, f.cx+hw); y1 = Math.max(y1, f.cy+hh); });
  return [x0, y0, x1, y1]; };


// Local Z offset puts the closed leaf inside the wall, flush with the hinge face.
// THREE's local Z at the closed angle maps to [-c.y, c.x] in plan coordinates.
function doorLeafOffset(d, thickness=40){
  const normal=[-d.c[1],d.c[0]],center=[(d.rect[0]+d.rect[2])/2,(d.rect[1]+d.rect[3])/2];
  const inward=(center[0]-d.h[0])*normal[0]+(center[1]-d.h[1])*normal[1];
  return Math.sign(inward)*thickness/2;
}
const api={solidForCollision,area,perim,bbox,aabb,inPoly,corners,footprints,bodyParts,volumeOverlap,obbOverlap,groupBox,collisions,verticalOverlap,tuckedSeatPair,doorLeafOffset};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
