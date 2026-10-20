const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),pointNear=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const base={id:'k',type:'counter',name:'厨房台面',cx:7000,cy:7000,rot:0,color:'#eee'},config={version:1,shape:'U',corner:'right',depth:600,counterDepth:630,baseHeight:820,thickness:20,modules:[{run:0,width:482,role:'door'},{run:0,width:482,role:'door'},{run:0,width:482,role:'door'},{run:1,width:560,role:'door'},{run:2,width:748,role:'door'}],endExtensions:[{run:0,length:550,depth:250,cabinetDepth:220}]};
const box=(f,x,y,w,d,id='ref')=>{const [cx,cy]=K.world(f,x,y);return {id,type:'custom',name:'冰箱',cx,cy,w,d,rot:f.rot,color:'#aaa'};};
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f=K.configure({...base,rot,flip},config),start={x:123,y:456},origin=K.world(f,0,0),tip=K.world(f,0,1),u=tip.map((v,i)=>v-origin[i]),targetDepth=73.25,targetWidth=123.75,h=K.runHandles(f)[2];
 const ref=box(f,h.x-targetWidth+300,f.d/2+targetDepth+300,600,600),p={x:start.x+u[0]*55,y:start.y+u[1]*55},before=JSON.stringify([f,ref]);
 const result=S.resizeKitchenOuter(f,'bottom',p,{start,grid:10,scale:.2,guides:true,furniture:[f,ref]}),next=result.furniture;
 assert.equal(result.guides.length,1);near(K.runDepth(next,2),600+targetDepth);assert.deepEqual(next.kitchen.modules,f.kitchen.modules);assert.deepEqual(next.kitchen.endExtensions,f.kitchen.endExtensions);pointNear(K.world(f,0,-f.d/2),K.world(next,0,-next.d/2));
 const fresh=K.runHandles(next)[2],a=K.world(next,fresh.x,fresh.y),b=K.world(next,fresh.x+fresh.dx,fresh.y+fresh.dy),axis=b.map((v,i)=>v-a[i]),move={x:start.x+axis[0]*100,y:start.y+axis[1]*100};
 const run=S.resizeKitchenRun(next,2,move,{start,grid:10,scale:.2,guides:true,furniture:[next,ref]});assert.equal(run.guides.length,1);near(run.furniture.kitchen.modules[4].width,748+targetWidth);near(K.runDepth(run.furniture,2),600+targetDepth);assert.deepEqual(run.furniture.kitchen.modules.slice(0,4),next.kitchen.modules.slice(0,4));
 const disabled=S.resizeKitchenRun(next,2,move,{start,grid:10,scale:.2,guides:false,furniture:[next,ref]});near(disabled.furniture.kitchen.modules[4].width,848);assert.equal(disabled.guides.length,0);
 const distant=box(next,fresh.x-targetWidth+300,next.d/2+500+300,600,600);assert.equal(S.resizeKitchenRun(next,2,move,{start,grid:10,scale:.2,furniture:[distant]}).guides.length,0,'remote edge extensions never attract');
 const host=K.configure(next,{...next.kitchen,modules:next.kitchen.modules.map((m,i)=>({...m,role:i===4?'sink':m.role}))}),own={...ref,id:'own',type:'ksink',counterLink:{hostId:f.id,module:4}};assert.equal(S.resizeKitchenRun(host,2,move,{start,grid:10,scale:.2,furniture:[host,own]}).guides.length,0,'host and its linked devices are excluded');
 assert.deepEqual(S.resizeKitchenRun(next,2,start,{start,grid:10,scale:.2,furniture:[ref]}).furniture,next);assert.deepEqual(S.resizeKitchenOuter(f,'bottom',start,{start,grid:10,scale:.2,furniture:[ref]}).furniture,f);assert.equal(JSON.stringify([f,ref]),before,'proposal does not mutate source or references');
 const guide=run.guides[0];if(rot===37)assert.equal(guide.line.length,2,'rotated reference has a real sloped guide');else assert.equal(typeof guide.v,'boolean');
 assert.deepEqual(P.unpack(P.pack({planId:'p',current:{furniture:[run.furniture,ref]},designs:[],catalog:[]})).current.furniture,[run.furniture,ref]);
}
const f=K.configure(base,config),h=K.runHandles(f)[2],a=K.world(f,h.x,h.y),b=K.world(f,h.x+h.dx,h.y+h.dy),u=b.map((v,i)=>v-a[i]),start={x:0,y:0},pointer={x:u[0]*100,y:u[1]*100};
// Capture radius and end-span gap are inclusive at exactly 10 screen pixels.
for(const gap of [0,50,50.01])for(const error of [49.99,50,50.01]){
 const ref=box(f,h.x-(100+error)+300,f.d/2+gap+300,600,600),r=S.resizeKitchenRun(f,2,pointer,{start,grid:10,scale:.2,furniture:[ref]});assert.equal(r.guides.length,gap<=50&&error<=50?1:0);
}
// A wall touching only the corner of an outer row must still supply a magnet.
const lo=K.world(f,f.w/2-100,f.d/2+75),hi=K.world(f,f.w/2,f.d/2+75),wall=[...lo,...hi];const outside=S.resizeKitchenOuter(f,'bottom',{x:0,y:60},{start,grid:10,scale:.2,wallSnap:true,rects:[wall],guides:false});near(K.runDepth(outside.furniture,2),675);assert.equal(outside.guides.length,1);
// Previous automatic trimming must not remove the selected nominal outer-edge magnet.
const trimmed=K.configure(f,{...config,autoAvoid:true});trimmed.kitchen.obstacleFit={depths:[],cuts:[[[-f.w/2,f.d/2-10],[f.w/2,f.d/2-10],[f.w/2,f.d/2],[-f.w/2,f.d/2]]]};K.validate(trimmed);const ref=box(f,0,f.d/2+73.25+300,600,600),trimSnap=S.resizeKitchenOuter(trimmed,'bottom',{x:0,y:55},{start,grid:10,scale:.2,furniture:[trimmed,ref]});near(K.runDepth(trimSnap.furniture,2),673.25);assert.equal(trimSnap.guides.length,1);
// Skip an impossible magnet, then try the next admissible edge before normal grid.
const tall=K.configure(f,{...config,runDepths:[600,600,1180]}),bad=box(tall,0,tall.d/2+30+300,600,600,'bad'),good=box(tall,0,tall.d/2+10+300,600,600,'good');const guarded=S.resizeKitchenOuter(tall,'bottom',{x:0,y:28},{start,grid:1,scale:.2,furniture:[bad,good]});near(K.runDepth(guarded.furniture,2),1190);assert.equal(guarded.guides.length,1);
// Real renderer consumes sloped guides, rather than producing undefined SVG values.
const node={},ctx=vm.createContext({FurnishBayWindows:{selected:()=>null},PLAN:{},window:{},ui:{layers:{furn:false},guides:[{line:[{x:10,y:20},{x:30,y:40}]}]},view:{s:1},selIds:()=>[],PAL:{halo:'#fff'},$:()=>node});vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx);ctx.renderSelectedGeometry();assert.match(node.innerHTML,/x1="10" y1="20" x2="30" y2="40"/);assert(!/undefined|NaN/.test(node.innerHTML));
console.log('PASS outer and short-run furniture magnets, complete finite edge/end contact, exact pixel thresholds, transforms, toggles, linked/self exclusion, invalid candidates, fractional persistence and real rotated guide SVG');
