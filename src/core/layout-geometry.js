/* Browser / Node module with explicit inputs and no app state or DOM.
 * Coordinates and lengths use mm; area() returns m² and perim() returns m. */
(function(root){
'use strict';
const area = poly => Math.abs(poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
const perim = poly => poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
const bbox = poly => { const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
function localOutline(f){return (root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null)).planOutline(f);}
function aabb(f){ if(localOutline(f)){const [x0,y0,x1,y1]=bbox(footprints(f).flat());return {hw:Math.max(f.cx-x0,x1-f.cx),hh:Math.max(f.cy-y0,y1-f.cy)};}const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return {hw:f.w/2*c + f.d/2*s, hh:f.w/2*s + f.d/2*c}; }
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
  if(a.kitchen||b.kitchen||localOutline(a)||localOutline(b))return footprints(a).some(A=>footprints(b).some(B=>polygonOverlap(A,B)));
  const A = corners(a), B = corners(b);
  for (const P of [A, B]) for (let i = 0; i < 2; i++){
    const nx = P[i+1][1] - P[i][1], ny = P[i][0] - P[i+1][0], L = Math.hypot(nx, ny) || 1;
    const pa = A.map(p => (p[0]*nx + p[1]*ny)/L), pb = B.map(p => (p[0]*nx + p[1]*ny)/L);
    if (Math.max(...pa) <= Math.min(...pb) + 5 || Math.max(...pb) <= Math.min(...pa) + 5) return false;
  }
  return true;
}
function footprints(f){const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);if(f.kitchen)return K.footprints(f);const outline=localOutline(f);if(!outline)return [corners(f)];const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [outline.map(([x,y])=>{x*=f.flip?-1:1;return [f.cx+x*c-y*s,f.cy+x*s+y*c];})];}
// Union the chosen rooms, then subtract the union of floor-standing envelopes.
// Uses the saved room boundaries (including holes), independent of layer visibility.
function regionAreas(rooms,furniture=[]){
  const Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),D=root.FurnishDesign||require('./design-core.js'),P=root.FurnishProducts||require('./product-rules.js');
  const regions=rooms.map(r=>r.rings?Z.ringPath(r.rings):r.poly),inRooms=p=>regions.some(r=>Z.inside(p,r));
  if(!regions.length)return {empty:0,occupied:0,free:0,pending:[]};
  const empty=Z.area(Z.decompose(regions,inRooms))/1e6,obstacles=[],pending=[];
  for(const f of furniture){
    const polys=footprints(f),touches=()=>Z.area(Z.decompose([...regions,...polys],p=>inRooms(p)&&polys.some(q=>Z.inside(p,q))))>1e-6;
    const standing=P.floorStanding(f,D.furnitureVerticalBounds(f));
    if(standing===null){if(touches())pending.push(f.id);continue;}
    if(standing)obstacles.push(...polys);
  }
  const occupied=obstacles.length?Z.area(Z.decompose([...regions,...obstacles],p=>inRooms(p)&&obstacles.some(q=>Z.inside(p,q))))/1e6:0;
  return {empty,occupied,free:Math.max(0,empty-occupied),pending};
}
function polygonOverlap(A,B,tolerance=5){for(const P of [A,B])for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length],nx=q[1]-P[i][1],ny=P[i][0]-q[0],L=Math.hypot(nx,ny)||1,pa=A.map(p=>(p[0]*nx+p[1]*ny)/L),pb=B.map(p=>(p[0]*nx+p[1]*ny)/L);if(Math.max(...pa)<=Math.min(...pb)+tolerance||Math.max(...pb)<=Math.min(...pa)+tolerance)return false;}return true;}
function bodyParts(f,plan,furniture){
  const parts=relativeBodyParts(f);if(!plan)return parts;
  const base=(root.FurnishProducts||require('./product-rules.js')).floorBase(plan,f,furniture);
  return parts.map(p=>({...p,vertical:p.vertical&&base.known?{...p.vertical,bottom:p.vertical.bottom+base.z,top:p.vertical.top+base.z}:null}));
}
function relativeBodyParts(f){
  const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null),K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),P=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);
  if(f.kitchen)return K.bodyParts(f);
  const panels=P.pipeBoxPanels(f);
  if(panels){const a=(f.rot||0)*Math.PI/180;return panels.map(b=>{const x=b.x*(f.flip?-1:1);return {p:corners({...f,w:b.w,d:b.d,cx:f.cx+x*Math.cos(a)-b.z*Math.sin(a),cy:f.cy+x*Math.sin(a)+b.z*Math.cos(a)}),vertical:{bottom:b.bottom,top:b.bottom+b.h,source:'model'}};});}
  const hood=P.hoodInstallation(f);
  if(hood){
    // The chimney shares the cabinet's height; the wider main body sits below it.
    // Reuse production dimensions rather than extending the main body's box upward.
    const bottom=P.value(f,'mountHeight'),a=(f.rot||0)*Math.PI/180;
    return [{w:f.w,d:f.d,offset:0,bottom,top:bottom+hood.bodyHeight},{w:hood.coverWidth,d:hood.coverDepth,offset:hood.coverOffset,bottom:bottom+hood.bodyHeight,top:bottom+P.height(f)}].map(part=>({p:corners({...f,w:part.w,d:part.d,cx:f.cx-Math.sin(a)*part.offset,cy:f.cy+Math.cos(a)*part.offset}),vertical:{bottom:part.bottom,top:part.top,source:'model'}}));
  }
  return footprints(f).map(p=>({p,vertical:D?.furnitureVerticalBounds(f)}));
}
function volumeOverlap(a,b,plan,furniture){return bodyParts(a,plan,furniture).some(A=>bodyParts(b,plan,furniture).some(B=>verticalOverlap(a,b,[A.vertical,B.vertical])&&polygonOverlap(A.p,B.p)));}
// 不参与碰撞检查：地毯、墙挂 / 吊装、台面上的设备、绿植（枝叶可伸到家具上方）；椅子推进桌下也属正常
const NOCOLLIDE = new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','plant']);
const SEATS = new Set(['chair','barstool','officechair','armchair']), TABLES = new Set(['table','roundtable','desk','island']);
// Shared with project review: seats may be tucked under a tabletop.
  const tuckedSeatUnder = (a,b) => SEATS.has(a.type)&&(TABLES.has(b.type)||(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null)).family(b,'folding-table'));
  const tuckedSeatPair = (a,b) => tuckedSeatUnder(a,b)||tuckedSeatUnder(b,a);
// Unknown heights stay conservative. Both the canvas and project review use
// this rule so stacked appliances do not produce contradictory findings.
function verticalOverlap(a,b,ranges){
  const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null);
  const [A,B]=ranges||[D?.furnitureVerticalBounds(a),D?.furnitureVerticalBounds(b)];
  return !(A&&B&&Math.min(A.top,B.top)-Math.max(A.bottom,B.bottom)<=1e-6);
}
const solidForCollision=f=>!NOCOLLIDE.has(f.type)&&!(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null))?.definition(f)?.embedded;
function collisions(furniture,plan){
  const L = furniture.filter(solidForCollision), out = [];
  const box = L.map(aabb);
  const D=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null),vertical=L.map(f=>D?.furnitureVerticalBounds(f,plan,furniture)),bases=plan?L.map(f=>(root.FurnishProducts||require('./product-rules.js')).floorBase(plan,f,furniture)):null;
  for (let i = 0; i < L.length; i++) for (let j = i+1; j < L.length; j++){
    const a = L[i], b = L[j];
    if (Math.abs(a.cx-b.cx) >= box[i].hw+box[j].hw || Math.abs(a.cy-b.cy) >= box[i].hh+box[j].hh) continue;   // 外包盒快速排除
    if (tuckedSeatPair(a,b)) continue;
    if(!verticalOverlap(a,b,[vertical[i],vertical[j]]))continue;
    const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
    if(C&&(C.fridgeFitsBay(a,b)||C.fridgeFitsBay(b,a)||C.hoodBayFit(a,b)?.fits||C.hoodBayFit(b,a)?.fits)&&(!bases||bases[i].known&&bases[j].known&&Math.abs(bases[i].z-bases[j].z)<1e-6))continue;
    if (a.kitchen||b.kitchen||(root.FurnishProducts||require('./product-rules.js')).family(a,'pipe-box')||(root.FurnishProducts||require('./product-rules.js')).family(b,'pipe-box')?volumeOverlap(a,b,plan,furniture):obbOverlap(a,b)) out.push([a.id, b.id]);
  }
  return out;
}
const groupBox = items => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  items.forEach(f => { if(localOutline(f)){const b=bbox(footprints(f).flat());x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);return;}const {hw, hh} = aabb(f); x0 = Math.min(x0, f.cx-hw); y0 = Math.min(y0, f.cy-hh); x1 = Math.max(x1, f.cx+hw); y1 = Math.max(y1, f.cy+hh); });
  return [x0, y0, x1, y1]; };


function doorLeaves(d){
  if(d.doorType!=='double')return [d];
  return [{...d,len:d.len/2},{...d,h:d.h.map((v,i)=>v+d.c[i]*d.len),c:d.c.map(v=>-v),len:d.len/2}];
}
function doorSwingPolygons(d){
  return doorLeaves(d).map(leaf=>{const points=[leaf.h];for(let i=0;i<=20;i++){const a=i/20*Math.PI/2;points.push(leaf.h.map((v,k)=>v+leaf.len*(leaf.c[k]*Math.cos(a)+leaf.o[k]*Math.sin(a))));}return points;});
}
// Use the original wall face for legacy overrides that only reversed o.
function doorOverride(d,value){
  const base=d._base||d,next={...d,...base,...value};
  // Dimension-only plans also accept rectangular openings without swing vectors.
  for(const key of ['h','c','o'])if(Array.isArray(next[key]))next[key]=[...next[key]];
  const hasVectors=door=>['h','c','o'].every(key=>Array.isArray(door[key])&&door[key].length===2&&door[key].every(Number.isFinite));
  if(!hasVectors(base)||!hasVectors(next))return next;
  const normal=Math.abs(next.c[0])>.5?1:0,flipped=next.o[0]*base.o[0]+next.o[1]*base.o[1]<0;
  next.h[normal]=flipped?d.rect[normal]+d.rect[normal+2]-base.h[normal]:base.h[normal];
  next.doorType=value?.doorType??base.doorType;
  return next;
}
// Local Z puts the closed leaf inside the wall, flush with the hinge face.
// At the closed angle, THREE's local Z maps to [-c.y, c.x] in plan coordinates.
function doorLeafOffset(d, thickness=40){
  const normal=[-d.c[1],d.c[0]],center=[(d.rect[0]+d.rect[2])/2,(d.rect[1]+d.rect[3])/2];
  const inward=(center[0]-d.h[0])*normal[0]+(center[1]-d.h[1])*normal[1];
  return Math.sign(inward)*thickness/2;
}
  const api={localOutline,regionAreas,solidForCollision,area,perim,bbox,aabb,inPoly,corners,footprints,bodyParts,volumeOverlap,polygonOverlap,obbOverlap,groupBox,collisions,verticalOverlap,tuckedSeatUnder,tuckedSeatPair,doorLeaves,doorSwingPolygons,doorOverride,doorLeafOffset};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
