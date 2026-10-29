const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),Z=require('../src/core/zone-geometry.js'),P=require('../src/core/project-core.js');
const base={id:'cab',type:'wardrobe',cx:3000,cy:3000,rot:0,...C.preset('wardrobe-hanging')};
const select=(f,column,leaf,section='lower')=>{
 const row=M.boards(f,{includeStatic:true}).find(p=>p.metadata.cabinetDoorSize&&p.metadata.cabinetPart.column===column&&p.metadata.cabinetPart.leaf===leaf&&p.metadata.cabinetPart.section===section);
 assert(row);return M.solidParts(f).find(p=>p.boardKey==='board:'+row.boardIndex);
};
for(const thickness of [12,18,25])for(const construction of ['shared','independent'])for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const f={...structuredClone(base),rot,flip};f.cabinet.thickness=thickness;f.cabinet.boxConstruction=construction;
 for(const angle of [0,30,60,90]){
  let a=C.setPartOpening(f,{column:0,section:'lower'},angle);a=C.setPartOpening(a,{column:1,section:'lower'},angle);
  const l=select(a,0,1),r=select(a,1,0);assert(!G.polygonOverlap(l.p,r.p,1e-6),JSON.stringify({thickness,construction,rot,flip,angle,l:l.p,r:r.p}));
  if(angle===90){const dx=Math.cos(rot*Math.PI/180),dy=Math.sin(rot*Math.PI/180),project=p=>p.p.map(v=>v[0]*dx+v[1]*dy),A=project(l),B=project(r),gap=Math.max(Math.min(...A),Math.min(...B))-Math.min(Math.max(...A),Math.max(...B));assert(Math.abs(gap-2)<.00001,'90-degree faces retain the 2 mm gap');}
  // Current geometry must remain inside its full sweep at every sampled pose.
  for(const [column,leaf,part] of [[0,1,l],[1,0,r]]){const zone=C.openingZones(a,{passage:0}).find(z=>z.column===column&&z.leaf===leaf);const outside=Z.area(Z.decompose([part.p,zone.poly],p=>Z.inside(p,part.p)&&!Z.inside(p,zone.poly)));assert(outside<.001,'production face fits its finite-thickness sweep');}
 }
}
const f=C.config(base),span=C.frontSpan(base,0),closed=select(base,0,1),xs=closed.p.map(p=>p[0]-base.cx);
assert(Math.abs(Math.min(...xs)-((span.left+span.right)/2+1))<1e-6);assert(Math.abs(Math.max(...xs)-(span.right-1))<1e-6,'closed frontage stays unchanged');
const round=P.unpack(P.pack({planId:'test',current:{furniture:[base]},designs:[],catalog:[]}));assert.deepEqual(round.current.furniture[0].cabinet,base.cabinet);
console.log('PASS adjacent finite-thickness doors: 12/18/25 mm, shared/independent boxes, 0/30/60/90 degrees, rotated/mirrored production boards, 2 mm open gap, sweep containment and unchanged closed frontage');
