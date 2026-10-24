const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),fs=require('node:fs'),vm=require('node:vm');
const f={id:'a',type:'counter',cx:100.25,cy:200.375,w:400,d:500,rot:0},target={...f,id:'b',cx:700.25};
const base={grid:10,scale:1,wallSnap:true,guides:true,rects:[[1000,0,1200,2000]],furniture:[f,target],anchor:{x:f.cx,y:f.cy}};
for(const axis of ['x','y'])for(const rot of [0,37,90])for(const disabled of [false,true]){
 const item={...f,rot},next=S.move(item,304.75,504.625,{...base,axis,disabled});
 assert.equal(next.position[axis==='x'?1:0],axis==='x'?f.cy:f.cx,'grid and magnets cannot move locked coordinate');
 if(disabled)assert.equal(next.position[axis==='x'?0:1],axis==='x'?304.75:504.625);
}
const aligned=S.move(f,304.25,209,{...base,axis:'x'});assert.equal(aligned.position[0],300.25);assert.equal(aligned.position[1],f.cy);assert(aligned.guides.some(g=>g.point));
const off=S.move(f,304.25,209,{...base,axis:'x',furniture:[f,{...target,cy:f.cy+4}]});assert.equal(off.position[1],f.cy);assert(!off.guides.some(g=>g.point),'off-axis points cannot pull furniture off its path');
// The production release avoidance may only move along the chosen axis.
const ctx=vm.createContext({FurnishProducts:require('../src/core/product-rules.js'),aabb:G.aabb,inPoly:G.inPoly,roomAt:()=>({poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}),snapRects:()=>[[0,0,200,1000]]});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/furniture-actions.js'),'utf8'),ctx);
for(const axis of ['x','y']){const item={...f,cx:180.25,cy:500.375};ctx.item=item;ctx.axis=axis;vm.runInContext('pushOut(item,axis)',ctx);assert.equal(item[axis==='x'?'cy':'cx'],axis==='x'?500.375:180.25);}
console.log('PASS drag axis constraints with grid/features/Alt, fractional anchors, off-axis targets and production release avoidance');
