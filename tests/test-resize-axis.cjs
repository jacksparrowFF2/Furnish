const assert=require('node:assert/strict');
const S=require('../src/core/snapping.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const corner=f=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};};
for(const rot of [0,37,90,180,270])for(const axis of ['w','d']){
  const f={type:'custom',cx:2000,cy:2000,w:1320,d:610.5,rot};
  const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),anchor=corner(f);
  // Deliberate off-axis pointer travel must never change the inactive dimension.
  const p={x:anchor.x+1580*c-850*s,y:anchor.y+1580*s+850*c};
  const next=S.resize(f,p,{axis,scale:.2,wallSnap:true,rects:[[0,0,3600,3600]]}).furniture;
  assert.equal(next[axis==='w'?'d':'w'],f[axis==='w'?'d':'w']);
  near(corner(next).x,anchor.x);near(corner(next).y,anchor.y);
  const tiny=S.resize(f,anchor,{axis,scale:.2,wallSnap:false,rects:[]}).furniture;
  assert.equal(tiny[axis],100);assert.equal(tiny[axis==='w'?'d':'w'],f[axis==='w'?'d':'w']);
}
for(const rot of [0,90,180,270])for(const axis of ['w','d']){
  const f={type:'curtain',cx:2000,cy:2000,w:1320,d:610.5,rot};
  const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),anchor=corner(f);
  const w=axis==='w'?1600:f.w,d=axis==='d'?800:f.d;
  const p={x:anchor.x+w*c-d*s,y:anchor.y+w*s+d*c};
  const vx=axis==='w'?c:-s,vy=axis==='w'?s:c;
  const rect=Math.abs(vx)>.5?[p.x+35*vx,0,p.x+35*vx,5000]:[0,p.y+35*vy,5000,p.y+35*vy];
  const result=S.resize(f,p,{axis,scale:.2,wallSnap:true,rects:[rect]});
  near(result.furniture[axis],(axis==='w'?w:d)+35);
  assert.equal(result.furniture[axis==='w'?'d':'w'],f[axis==='w'?'d':'w']);
  assert.equal(result.guides.length,1);
}
const precision=S.resize({type:'custom',cx:0,cy:0,w:1320,d:610,rot:180},{x:-660,y:-305},{scale:.2,wallSnap:true,rects:[]}).furniture;
assert.equal(String(precision.d),'610');
// Exercise the actual pointer handlers, grabbing away from the handle center.
const fs=require('node:fs'),vm=require('node:vm');
for(const axis of ['w','d','both']){
  const f={id:'f',type:'custom',cx:2000,cy:2000,w:1320,d:610,rot:90};
  const listeners={},nodes={},svg={addEventListener:(name,fn)=>listeners[name]=fn,setPointerCapture(){},
    createSVGPoint:()=>({matrixTransform(){return {x:this.x,y:this.y};}}),getScreenCTM:()=>({inverse:()=>null})};
  const context=require('./helpers/layer-context.cjs').createContext({svg,$:key=>nodes[key]||= {},document:{querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
    closeCtx(){},closeDrawers(){},ui:{tool:'select',layers:{furn:true,wallSnap:false}},view:{s:.2},TAP:3,
    state:{furniture:[f]},getF:()=>f,selIds:()=>['f'],snap:()=>JSON.stringify({furniture:[f]}),
    FurnishSnapping:S,FurnishDesign:require('../src/core/design-core.js'),FurnishCabinet:{supported:()=>false},clearTimeout(){},renderFurn(){},syncFurnOrder(){},renderSel(){},furnT:()=>''});
  vm.runInContext(fs.readFileSync(require.resolve('../src/ui/canvas-interactions.js'),'utf8'),context);
  require('./helpers/pointer-frames.cjs')(context);context.initializeCanvasInteractions();
  const handle={dataset:{handle:'size',axis}},target={closest:selector=>selector==='[data-handle]'?handle:null};
  const event={button:0,pointerType:'mouse',pointerId:1,clientX:1770,clientY:2710,target};
  listeners.pointerdown(event);
  // At 90 degrees, width changes along +Y, depth changes along -X.
  listeners.pointermove({...event,clientX:event.clientX-20,clientY:event.clientY+80});
  assert.equal(f.w,axis==='d'?1320:1400);assert.equal(f.d,axis==='w'?610:630);
  listeners.pointermove(event);assert.equal(f.w,1320);assert.equal(f.d,610);
}
const f={id:'f',type:'custom',cx:0,cy:0,w:1320,d:610.0000000000001,rot:0},node={};
const renderer=require('./helpers/layer-context.cjs').createContext({window:{},FurnishGeometry:require('../src/core/layout-geometry.js'),ui:{layers:{furn:false},guides:null},view:{s:.2},COARSE:false,
  selIds:()=>['f'],getF:()=>f,tr:zh=>zh,PAL:{halo:'#fff'},furnT:()=>'',aabb:()=>({hh:f.d/2}),$:()=>node});
vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),renderer);
renderer.renderSelectedGeometry();assert.match(node.innerHTML,/data-axis="w"/);assert.match(node.innerHTML,/data-axis="d"/);
assert.match(node.innerHTML,/1320 × 610<\/text>/);
f.locked=true;renderer.renderSelectedGeometry();assert.doesNotMatch(node.innerHTML,/data-handle=/);
console.log('PASS independent width/depth, rotated fixed edges, active-axis wall snapping and dimension precision');
