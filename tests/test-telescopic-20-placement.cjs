'use strict';
const A=require('node:assert/strict'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
const near=(a,b)=>A.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6,JSON.stringify({a,b}));
for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const side of ['left','right'])for(const open of [false,true]){
 const f={id:'20',type:'telescopicdoor20',name:'2+0',w:1345,d:90,h:2400,cx:100,cy:200,rot,flip,slidingStackSide:side,slidingOpen:open},frame=P.slidingResizeFrame(f),before=structuredClone(f);
 const resized=D.resizeFurniture(f,{w:2200,d:130});near(P.slidingResizeFrame(resized).anchor,frame.anchor);A.deepEqual(f,before);
 const proxy=P.slidingResizeFrame(P.resizeSliding(f,{w:2000,d:150})).proxy,a=proxy.rot*Math.PI/180,point={x:proxy.cx+proxy.w/2*Math.cos(a)-proxy.d/2*Math.sin(a),y:proxy.cy+proxy.w/2*Math.sin(a)+proxy.d/2*Math.cos(a)},r=S.resize(f,point,{scale:1,wallSnap:false,rects:[],axis:'both'}).furniture;
 near(P.slidingResizeFrame(r).anchor,frame.anchor);A.equal(r.w,2000);A.equal(r.d,150);
 const b=G.bbox(G.footprints({...f,cx:0,cy:0}).flat()),expected=-b[0],options={scale:1,grid:10,wallSnap:true,guides:false,rects:[[-200,-4000,0,4000]],furniture:[f]};
 const hit=S.move(f,expected+3,0,options);near(hit.position,[expected,0]);A.deepEqual(f,before);
 if(rot===0){near(S.move(f,expected+32,0,options).position,[expected,0]);A.ok(Math.abs(S.move(f,expected+32.01,0,options).position[0]-expected)>1);}
 const shifted={...f,cx:hit.position[0],cy:hit.position[1]},bounds=G.bbox(G.footprints(shifted).flat());A.ok(Math.abs(bounds[0])<1e-6);
 const bypass=S.move(f,expected+3,0,{...options,disabled:true});near(bypass.position,[expected+3,0]);
}
const vm=require('node:vm'),fs=require('node:fs'),context={FurnishProducts:P,FurnishGeometry:G,aabb:G.aabb,roomAt:()=>({poly:[]}),inPoly:()=>true,snapRects:()=>[[-200,-4000,0,4000]]};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/ui/furniture-actions.js'),'utf8'),context);
for(const side of ['left','right'])for(const flip of [false,true]){
 const f={id:'20',type:'telescopicdoor20',w:1345,d:90,h:2400,cx:0,cy:0,rot:0,slidingStackSide:side,flip},bounds=G.bbox(G.footprints(f).flat());f.cx=-bounds[0];context.f=f;const before=f.cx;vm.runInContext('pushOut(f)',context);A.equal(f.cx,before,'release must not pull exact wall snap away with symmetric AABB');
}
console.log('PASS 2+0 resize fixed stacking datum via numeric and drag, complete rail wall snaps, bypass, 40 rotations/mirrors/directions/poses, no mutation');
