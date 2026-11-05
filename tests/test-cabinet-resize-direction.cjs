'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),Products=require('../src/core/product-rules.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),same=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const point=(f,x,y=0)=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [f.cx+x*c-y*s,f.cy+x*s+y*c];};
const seed=()=>({id:'resize-case',type:'wardrobe',cx:3000,cy:4000,rot:0,...C.preset('wardrobe-hanging')});let cases=0;
for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const anchor of ['center','local-left','local-right'])for(const delta of [-120.25,230.5]){
 const f={...seed(),rot,flip,resizeAnchor:anchor,mountHeight:123},before=structuredClone(f),n=D.resizeFurniture(f,{w:f.w+delta}),side=(anchor==='local-left'?-1:1)*(flip?-1:1);
 if(anchor==='center')same([n.cx,n.cy],[f.cx,f.cy]);else same(point(f,side*f.w/2),point(n,side*n.w/2));
 near(n.w,f.w+delta);near(n.mountHeight,123);assert.deepEqual(f,before);C.validate(n);
 const restored=P.unpack(P.pack({planId:'p',current:{furniture:[n]},designs:[{id:'named',name:'named',planId:'p',work:{furniture:[n]}}],catalog:[]}));assert.deepEqual(restored.current.furniture[0],n);assert.equal(restored.designs[0].work.furniture[0].resizeAnchor,anchor);
 if(anchor!=='center'){assert.equal(P.pack({planId:'p',current:{furniture:[n]},designs:[],catalog:[]}).version,51);same([D.resizeFurniture(f,{h:f.h+100}).cx,D.resizeFurniture(f,{h:f.h+100}).cy],[f.cx,f.cy]);}
 cases++;
}
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const axis of ['w','d','both'])for(const sideX of [-1,1])for(const sideY of [-1,1]){
 const f={...seed(),rot,flip},a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),anchor=point(f,-sideX*f.w/2,-sideY*f.d/2),w=f.w+(axis==='d'?0:120),d=f.d+(axis==='w'?0:60),p=point({rot,cx:anchor[0],cy:anchor[1]},sideX*w,sideY*d);
 const result=S.resize(f,{x:p[0],y:p[1]},{axis,sideX,sideY,scale:1,wallSnap:false,rects:[],guides:false}),n=result.furniture;
 near(n.w,w);near(n.d,d);same(point(n,-sideX*n.w/2,-sideY*n.d/2),anchor);
 const production=D.resizeFurniture(f,{w:n.w,d:n.d},'center');C.validate(production);
 const target={id:'target',type:'cabinet',rot,flip,cx:n.cx+sideX*(n.w+300)/2*c,cy:n.cy+sideX*(n.w+300)/2*s,w:300,d:n.d};
 if(axis==='w'){const snapped=S.resize(f,{x:p[0]+sideX*3*c,y:p[1]+sideX*3*s},{axis,sideX,sideY,scale:1,wallSnap:false,rects:[],guides:true,furniture:[target]});near(snapped.furniture.w,w);same(point(snapped.furniture,-sideX*snapped.furniture.w/2,-sideY*snapped.furniture.d/2),anchor);assert(snapped.guides.length);}
 cases++;
}
// Actual production pointer handler: grabbing either end overrides the numeric preference.
const source=fs.readFileSync(require.resolve('../src/ui/canvas-interactions.js'),'utf8');
for(const rot of [0,90,37])for(const flip of [false,true])for(const sideX of [-1,1])for(const axis of ['w','d']){
 const f={...seed(),rot,flip,resizeAnchor:'local-right'},events={},el={textContent:'',innerHTML:'',addEventListener(){}};
 const ctx=vm.createContext({TAP:4,state:{furniture:[f]},ui:{layers:{wallSnap:false}},view:{s:1},FurnishDesign:D,FurnishProducts:Products,FurnishSnapping:S,document:{addEventListener(){},querySelector:()=>null},svg:{addEventListener:(name,fn)=>events[name]=fn},$:()=>el,getF:()=>f,toMM:e=>({x:e.clientX,y:e.clientY}),clearTimeout(){},renderFurn(){},renderSel(){},syncFurnOrder(){},furnT:()=>''});
 vm.runInContext(source,ctx);ctx.toMM=e=>({x:e.clientX,y:e.clientY});require('./helpers/pointer-frames.cjs')(ctx);vm.runInContext('initializeCanvasInteractions()',ctx);ctx.original=structuredClone(f);ctx.side=sideX;ctx.resizeAxis=axis;
 vm.runInContext("drag={kind:'size',id:'resize-case',original,startPoint:{x:0,y:0},sx:0,sy:0,axis:resizeAxis,sideX:resizeAxis==='w'?side:1,sideY:resizeAxis==='d'?side:1}",ctx);
 const before=structuredClone(f),a=rot*Math.PI/180,u=axis==='w'?[Math.cos(a),Math.sin(a)]:[-Math.sin(a),Math.cos(a)];events.pointermove({pointerId:1,clientX:sideX*120*u[0],clientY:sideX*120*u[1],target:{closest:()=>null}});near(f[axis],before[axis]+120);same(point(f,axis==='w'?-sideX*f.w/2:0,axis==='d'?-sideX*f.d/2:0),point(before,axis==='w'?-sideX*before.w/2:0,axis==='d'?-sideX*before.d/2:0));C.validate(f);cases++;
}
const f=seed(),plan={rooms:[{id:'r',poly:[[0,0],[10000,0],[10000,10000],[0,10000]],ceilingHeight:3000}],walls:[],doors:[]};
assert.equal(P.checkFingerprint({},plan,[f],800),P.checkFingerprint({},plan,[{...f,resizeAnchor:'local-left'}],800));
const narrow={id:'limit',type:'cabinet',cx:1000,cy:1000,w:500,d:300,h:600,rot:37,flip:true,cabinet:{version:1,template:'storage',thickness:18,plinth:0,boxConstruction:'independent',columns:[{door:'none',doorOpen:false,shelves:[],drawers:[]}]}};
for(const anchor of ['local-left','local-right']){const n=D.resizeFurniture({...narrow,resizeAnchor:anchor},{w:150});C.validate(n);const side=(anchor==='local-left'?-1:1)*-1;same(point(n,side*n.w/2),point(narrow,side*narrow.w/2));assert.throws(()=>D.resizeFurniture({...narrow,resizeAnchor:anchor},{w:149.999}));}
assert(R.workspaceVersions.includes(51));assert.throws(()=>D.resizeFurniture({...f,locked:true},{w:2000},'local-left'));
console.log(`PASS ${cases} end-resize cases: local anchors, both-end signed snapping, finite edge magnets, actual pointer listener, rotation/mirror, unchanged numeric preference, physical dimension validation and v51 current/named roundtrips`);
