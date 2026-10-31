const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),C=require('../src/core/washer-motion-core.js'),Model=require('../src/render/washer-model.js'),G=require('../src/core/layout-geometry.js'),Cab=require('../src/core/cabinet-core.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js');
const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials});
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const type of ['washer','washer_littleswan_tg10k60w']){
 const f={id:'side',name:'洗衣机',type,w:type==='washer'?600:595,d:type==='washer'?600:560,h:850,cx:3000,cy:3000,mountHeight:200,rot:0,color:'#fff'};
 assert.equal(P.initial(f).washerDoorSide,'left');assert.equal(P.value(f,'washerDoorSide'),'left');
 for(const invalid of ['up','',null,1,true])assert.throws(()=>P.validateField(f,'washerDoorSide',invalid));assert.throws(()=>P.validateField({...f,type:'dryer'},'washerDoorSide','right'));
 const right={...f,washerDoorSide:'right'},work={...W.fresh(plan),furniture:[right]},payload={planId:plan.id,current:work,designs:[{name:'方向',work}],catalog:[]};
 assert.equal(J.formatVersion([], [{...right,price:0}]),43);
 assert.equal(J.pack(payload).version,43);assert.deepEqual(J.unpack(J.pack(payload)),payload);
 const store={v:43,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};assert.equal(JSON.parse(R.text(store)).version,43);assert.deepEqual(R.parse(JSON.parse(R.text(store))).work[plan.id].furniture,[right]);
 assert.equal(Cache.load({read:k=>k==='huxing-design-v43'?JSON.stringify(store):null,key:'huxing-design-v43',firstPlan:plan,restore:W.restore}).v,43);
 assert.equal(Cache.load({read:k=>k==='huxing-design-v42'?JSON.stringify({...store,v:42}):null,key:'huxing-design-v43',firstPlan:plan,restore:W.restore}).v,42);
 let restored=work;for(let i=0;i<3;i++)restored=W.restore(restored,plan);assert.deepEqual(restored.furniture,[right]);assert.equal(W.restore({...work,furniture:[f]},plan).furniture[0].washerDoorSide,undefined);
 assert.equal(D.replaceFurniture(right,{...f,type:type==='washer'?'washer_littleswan_tg10k60w':'washer'}).washerDoorSide,'right');assert.equal(D.replaceFurniture(right,{...f,type:'dryer'}).washerDoorSide,undefined);
 assert.equal(D.pasteFurniture({items:[right],cx:3000,cy:3000},{x:3500,y:3500},{x:0,y:0,w:8000,h:8000},()=> 'copy').items[0].washerDoorSide,'right');
 const fingerprint=x=>J.checkFingerprint({kind:'cabinetdoor',id:f.id},plan,[x],800);assert.notEqual(fingerprint(f),fingerprint(right));assert.equal(fingerprint(right),fingerprint({...right,color:'#222',price:100}));
 for(const washerDoorSide of ['left','right'])for(const angle of [0,55,110]){
 const host={...f,washerDoorSide,washerDoorAngle:angle},group=Model.build(T,host),parts=G.bodyParts(host),meshes=[];group.updateMatrixWorld(true);group.traverse(n=>{if(n.isMesh)meshes.push(n);});
 const zone=C.openingZones(host)[0];
 for(const [i,mesh]of meshes.entries()){
  const box=new T.Box3().setFromObject(mesh,true);for(const [k,axis]of ['x','y','z'].entries()){const offset=k===0?host.cx:k===2?host.cy:0;near(box.min[axis]*1000+offset,Math.min(...parts[i].vertices.map(v=>v[k])));near(box.max[axis]*1000+offset,Math.max(...parts[i].vertices.map(v=>v[k])));}
  if(['door-ring','door-glass','door-handle','door-glass-trim','door-button-mark'].includes(parts[i].partRole))for(const v of parts[i].vertices.filter((_,n)=>n%300===0))assert(Cab.openingIntersects(zone,[[v[0]-.01,v[2]-.01],[v[0]+.01,v[2]-.01],[v[0]+.01,v[2]+.01],[v[0]-.01,v[2]+.01]],{bottom:v[1]-.01,top:v[1]+.01},(a,b)=>G.polygonOverlap(a,b,0)),JSON.stringify({type,washerDoorSide,angle,v}));
 }
 if(angle){const mirrored=C.outline({...host,washerDoorSide:washerDoorSide==='left'?'right':'left'});near(Math.min(...C.outline(host).map(v=>v[0])),-Math.max(...mirrored.map(v=>v[0])));}
 }
 for(const rot of [0,37,90])for(const flip of [false,true])for(const washerDoorSide of ['left','right']){
 const host={...f,rot,flip,washerDoorSide,washerDoorAngle:110},sign=washerDoorSide==='right'?-1:1,x=(type==='washer'?-270:-345)*sign*(flip?-1:1),z=type==='washer'?480:508,a=rot*Math.PI/180,block={id:'block',type:'block',cx:host.cx+x*Math.cos(a)-z*Math.sin(a),cy:host.cy+x*Math.sin(a)+z*Math.cos(a),w:40,d:40,h:40,mountHeight:580,rot};
 {assert(G.volumeOverlap(host,block));assert(!G.volumeOverlap({...host,washerDoorAngle:0},block));assert(!G.volumeOverlap(host,{...block,mountHeight:1200}));assert(J.spaceCheck({...plan,walls:[],wins:[],doors:[],beams:[],rooms:[]},[host,block],{scanPassages:false}).some(i=>i.section==='washer:door'&&!i.pending));}
 }
}
console.log('PASS washer sides: both production models, live/numeric bounds, sweep vertices, rotated/mirrored collisions, defaults/validation/replacement/paste, v43 project/named/catalog/workspace/cache and repeat restore, targeted confirmation');
})().catch(e=>{console.error(e);process.exitCode=1;});
