'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const B=require('../src/core/bay-window-core.js'),F=require('../src/core/wall-finish-core.js'),P=require('../src/core/project-core.js'),M=require('../src/render/bay-window-model.js');
const clone=v=>structuredClone(v);
function fixture(axis=0,sign=1){
 const map=([x,y])=>axis?[sign*y,x]:[x,sign*y],bay={id:'bay',bayId:'win',bayType:'recessed',counted:false,poly:[[0,0],[1800,0],[1800,700],[0,700]].map(map)},room={id:'room',poly:[[0,700],[1800,700],[1800,4000],[0,4000]].map(map),ceilingHeight:2700};
 const q=[[0,-200],[1800,0]].map(map),rect=[Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1])),Math.max(...q.map(p=>p[0])),Math.max(...q.map(p=>p[1]))];
 return {id:'bay-header-test',walls:[],doors:[],slides:[],wins:[{rect,sill:.65,head:2.3,bayId:'win',bayType:'recessed'}],rooms:[room,bay],ceilingHeight:2800};
}
for(const axis of [0,1])for(const sign of [-1,1]){
 const plan=fixture(axis,sign),before=clone(plan),parts=B.upperWalls(plan);assert.equal(parts.length,1);assert.equal(parts[0].bottom,2300);assert.equal(parts[0].top,2700);assert.deepEqual(plan,before);
 const spatial=F.spatial(plan);assert.equal(spatial.walls.length,1);assert.equal(F.spatial(spatial),spatial);assert.deepEqual(F.vertical(spatial.walls[0],plan),{bottom:2300,top:2700});
 const at=axis?{cx:350*sign,cy:900}:{cx:900,cy:350*sign},probe={id:'probe',name:'header probe',type:'block',w:100,d:100,h:100,rot:37,...at};
 const issues=delta=>P.spaceCheck(plan,[{...probe,...delta}],{scanPassages:false}).filter(i=>i.kind==='wall');
 assert.equal(issues({mountHeight:2200}).length,0,'exact underside contact');assert.equal(issues({mountHeight:2200.1}).length,1,'0.1mm upward penetration');assert.equal(issues({mountHeight:2700}).length,0,'above wall');assert.equal(issues({h:undefined,mountHeight:undefined,type:'unknown'}).length,1,'unknown height conservative');
 const unrelated={...plan,rooms:plan.rooms.map(r=>({...r,bayType:undefined})),wins:plan.wins.map(w=>({...w,bayType:undefined}))};assert.equal(B.upperWalls(unrelated).length,0,'three sided bay and ordinary windows unchanged');
 const fp=P.checkFingerprint({kind:'wall',id:'probe'},plan,[probe],800);assert.notEqual(P.checkFingerprint({kind:'wall',id:'probe'},{...plan,wins:plan.wins.map(w=>({...w,head:2.4}))},[probe],800),fp);assert.equal(P.checkFingerprint({kind:'wall',id:'probe'},plan,[{...probe,color:'#111111',price:50}],800),fp);
}
const noRoof=fixture();delete noRoof.ceilingHeight;delete noRoof.rooms[0].ceilingHeight;assert.equal(B.upperWalls(noRoof).length,0,'unknown roof is not guessed');
const short=fixture();short.rooms[0].ceilingHeight=2200;assert.equal(B.upperWalls(short).length,0,'roof at or below header produces no inverted solid');
const plan=fixture(),work={furniture:[],open:{w:{0:{head:2.4}}}},updated=B.applyWindows(clone(plan),work.open.w);assert.equal(B.upperWalls(updated)[0].bottom,2400);
const derived=F.spatial(plan);assert(!JSON.stringify(P.pack({planId:plan.id,current:{furniture:[]},catalog:[],designs:[]})).includes('bay-upper-wall'),'derived walls are not persisted');
// Real architectural restore/project chain, with a room height differing from the global roof.
const D=require('../src/core/floorplan-core.js'),points=[[1000,1000],[2000,1000],[2000,400],[4000,400],[4000,1000],[5000,1000],[5000,5000],[1000,5000]],draft={version:1,id:'custom_header_roundtrip',name:'窗上墙体',source:'dxf',image:'',scale:10,width:600,height:600,walls:points.map((p,i)=>({id:'w'+i,a:p.map(v=>v/10),b:points[(i+1)%points.length].map(v=>v/10),kind:'e',thickness:200})),openings:[{id:'win',wall:'w2',t:.5,length:1200,kind:'window',side:1,entry:false,bay:{type:'recessed',depth:600,height:450,head:2400}}]};
const base=D.build(draft),arch=P.architecture({draft,phase:'survey'}),current={furniture:[],architecture:arch,ceilingHeight:2800,rooms:{[base.rooms.find(r=>r.counted!==false).id]:{ceilingHeight:2650}}},payload={planId:base.id,current,designs:[{name:'窗套方案',work:clone(current)}],catalog:[]};
const beforeHeaders=B.upperWalls(P.effectivePlan(base,current));assert.equal(beforeHeaders[0].top,2650);const restored=P.unpack(P.pack(payload));assert.deepEqual(B.upperWalls(P.effectivePlan(base,restored.current)),beforeHeaders);assert.deepEqual(B.upperWalls(P.effectivePlan(base,restored.designs[0].work)),beforeHeaders);assert.deepEqual(restored.current.architecture.draft,draft);assert.equal(P.formatVersion([restored.current]),16);
(async()=>{const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const [top,count,hi] of [[Infinity,1,2.7],[2400,1,2.4],[2300,0,0]]){const model=M.buildHeaders(T,plan,{top}),box=new T.Box3().setFromObject(model);assert.equal(model.children.length,count);if(count){assert(Math.abs(box.min.y-2.3)<1e-6);assert(Math.abs(box.max.y-hi)<1e-6);assert(Math.abs(box.max.x-box.min.x-1.8)<1e-6);assert(Math.abs(box.max.z-box.min.z-.7)<1e-6);assert.equal(model.children[0].userData.bayHeaderPart,B.upperWalls(plan)[0].id);}}
 console.log('PASS recessed bay upper walls: actual full-depth production geometry, roof/window heights, horizontal/vertical/reversed transforms, contact/penetration/unknown roof, spatial idempotence, confirmation, no persisted structure changes and cut views');
})().catch(e=>{console.error(e);process.exitCode=1;});
