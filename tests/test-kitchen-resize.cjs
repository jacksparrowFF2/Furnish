const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js'),S=require('../src/core/snapping.js'),W=require('../src/core/work-state.js');
const base={id:'k',name:'厨房',type:'counter',cx:7000,cy:7000,rot:0,color:'#eee'};
const config={version:1,shape:'U',depth:600,counterDepth:630,baseHeight:820,thickness:20,modules:[{run:0,width:500,role:'door'},{run:0,width:900,role:'sink'},{run:0,width:700,role:'drawer'},{run:1,width:800,role:'door'},{run:1,width:900,role:'door'},{run:2,width:450,role:'door'},{run:2,width:650,role:'door'}],endExtensions:[{run:0,length:500,depth:250,cabinetDepth:220},{run:2,length:200,depth:200,cabinetDepth:180}]};
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),widths=f=>f.kitchen.modules.map(m=>m.width);
const plan={id:'p',name:'测试',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[0,0],[20000,0],[20000,20000],[0,20000]]}],walls:[],wins:[],doors:[],slides:[],beams:[],defaults:[]};
for(const shape of ['straight','L','U'])for(const corner of ['left','right'])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const k={...structuredClone(config),shape,corner};k.modules=k.modules.filter(m=>K.runs({kitchen:k}).includes(m.run));k.endExtensions=k.endExtensions.filter(e=>K.endRuns({kitchen:k}).includes(e.run));
 const f=K.configure({...base,rot,flip},k),original=JSON.stringify(f),end=shape!=='straight'&&corner==='right'?0:2,grown=D.resizeFurniture(f,{w:f.w+300});
 const expected=widths(f);expected[end]+=300;assert.deepEqual(widths(grown),expected,'only free-end main bay changes');near(grown.w,f.w+300);near(grown.d,f.d);assert.equal(grown.kitchen.depth,600);assert.equal(grown.kitchen.counterDepth,630);assert.deepEqual(grown.kitchen.endExtensions,f.kitchen.endExtensions);
 if(shape!=='straight'){
  const deep=D.resizeFurniture(f,{d:f.d+200}),expected=widths(f);expected[4]+=200;assert.deepEqual(widths(deep),expected,'only terminal connector/return bay absorbs changed length');assert.equal(deep.w,f.w);assert.equal(deep.kitchen.depth,600);
 }
 const sink=K.attach({id:'sink',type:'ksink',name:'水槽',cx:0,cy:0,rot:0,w:760,d:450,color:'#ddd'},grown,1),items=[grown,sink];K.normalize(items);K.validateList(items);assert.equal(sink.counterLink.module,1);assert.equal(grown.kitchen.modules[1].width,900);
 const restored=P.unpack(P.pack({planId:'p',current:{furniture:items},designs:[{name:'定宽拉伸',work:{furniture:items}}],catalog:[]}));assert.deepEqual(restored.current.furniture,items);assert.deepEqual(restored.designs[0].work.furniture,items);
 const rules=W.create({makeId:()=> 'x',colorFor:()=> '#eee',materials:{tile:{}}}),work={furniture:structuredClone(items)};rules.restore(work,plan);const stable=JSON.stringify(work);rules.restore(work,plan);assert.equal(JSON.stringify(work),stable);
 const minWidth=150,delta=minWidth-f.kitchen.modules[end].width,atLimit=D.resizeFurniture(f,{w:f.w+delta});assert.equal(atLimit.kitchen.modules[end].width,150);assert.throws(()=>D.resizeFurniture(f,{w:f.w+delta-.01}));
 const maxDelta=3000-f.kitchen.modules[end].width;assert.equal(D.resizeFurniture(f,{w:f.w+maxDelta}).kitchen.modules[end].width,3000);assert.throws(()=>D.resizeFurniture(f,{w:f.w+maxDelta+.01}));assert.equal(JSON.stringify(f),original,'invalid and valid proposals do not mutate source');
}
// At a tied outer edge, change the main arm only; never trim the other arm.
const equal={...config,endExtensions:[],modules:[{run:0,width:1600,role:'door'},{run:1,width:600,role:'door'},{run:2,width:1600,role:'door'}]},tie=K.configure(base,equal);
assert.deepEqual(widths(D.resizeFurniture(tie,{w:tie.w+300})),[1900,600,1600]);
const unequal=K.configure(base,{...equal,modules:equal.modules.map((m,i)=>({...m,width:i===2?1100:m.width}))});assert.deepEqual(widths(D.resizeFurniture(unequal,{w:1700})),[1100,600,1100]);assert.throws(()=>D.resizeFurniture(unequal,{w:1699.99}),/另一边/);assert.throws(()=>D.resizeFurniture(tie,{w:tie.w-1}),/另一边/);
const longerReturn=K.configure(base,{...equal,modules:equal.modules.map((m,i)=>({...m,width:i===0?1100:m.width}))});assert.deepEqual(widths(D.resizeFurniture(longerReturn,{w:longerReturn.w+300})),[1100,600,1900]);
// Replay the actual pointer branch with the screenshot's three fixed 482 mm bays.
for(const corner of ['left','right'])for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const axis of ['w','d','both']){
 const f=K.configure({...base,rot,flip},{...config,corner,modules:[...Array.from({length:3},()=>({run:0,width:482,role:'door'})),{run:1,width:450,role:'door'},{run:2,width:600,role:'door'}],endExtensions:[{run:0,length:550,depth:250,cabinetDepth:220}]}),original=structuredClone(f),events={},el={addEventListener(){}};
 const ctx=vm.createContext({TAP:4,state:{furniture:[f]},ui:{layers:{wallSnap:false}},view:{s:1},FurnishDesign:D,FurnishSnapping:S,document:{addEventListener(){},querySelector:()=>null},svg:{addEventListener:(name,fn)=>events[name]=fn},$:()=>el,getF:()=>f,clearTimeout(){},renderFurn(){},renderSel(){},syncFurnOrder(){},furnT:()=>''});
 vm.runInContext(fs.readFileSync(require.resolve('../src/ui/canvas-interactions.js'),'utf8'),ctx);ctx.toMM=e=>({x:e.clientX,y:e.clientY});ctx.initializeCanvasInteractions();ctx.original=original;ctx.axis=axis;vm.runInContext("drag={kind:'size',id:'k',original,startPoint:{x:0,y:0},sx:0,sy:0,axis}",ctx);
 const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dw=axis==='d'?0:300,dd=axis==='w'?0:200;events.pointermove({pointerId:1,clientX:dw*c-dd*s,clientY:dw*s+dd*c,target:{closest:()=>null}});
 const targetW=axis==='d'?original.w:Math.round((original.w+dw)/10)*10,targetD=axis==='w'?original.d:Math.round((original.d+dd)/10)*10,expected=[482,482,482,450,600];expected[corner==='right'?0:2]+=targetW-original.w;expected[3]+=targetD-original.d;assert.deepEqual(widths(f),expected);assert.equal(f.kitchen.depth,600);assert.equal(f.kitchen.endExtensions[0].length,550);near(f.w,targetW);near(f.d,targetD);
 // Replaying input uses the drag snapshot, never the previously resized widths.
 const stable=JSON.stringify(f);for(let i=0;i<3;i++)events.pointermove({pointerId:1,clientX:dw*c-dd*s,clientY:dw*s+dd*c,target:{closest:()=>null}});assert.equal(JSON.stringify(f),stable);
}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;},f=K.configure(base,config),next=D.resizeFurniture(f,{w:f.w+300,d:f.d+200}),models=[f,next].map(f=>ctx.FurnishKitchenModel.build(T,f,box));
 const bodyWidth=(g,index)=>{const m=g.children.find(o=>o.userData.kitchenModule===index);m.updateMatrixWorld(true);return new T.Box3().setFromObject(m).getSize(new T.Vector3()).x;};near(bodyWidth(models[0],1),bodyWidth(models[1],1));assert(bodyWidth(models[1],2)>bodyWidth(models[0],2),'only end production cabinet grows');assert.equal(next.kitchen.modules[5].width,f.kitchen.modules[5].width);assert.equal(next.kitchen.modules[6].width,f.kitchen.modules[6].width);
 console.log('PASS kitchen terminal-only resize, fixed middle and short arms, limits, production widths, links, rotation/mirror, real pointer branch and project/work restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
