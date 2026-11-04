'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),M=require('../src/render/circulator-model.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),D=require('../src/core/design-core.js');
const f={id:'fan-height',type:'fan_airmate_fa18_x231',name:'循环扇',w:300,d:300,h:1100,cx:0,cy:0,rot:0,color:'#eeeee9'},near=(a,b)=>assert(Math.abs(a-b)<.004,`${a} != ${b}`);
const Cache=require('../src/io/workspace-cache.js');
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
const ref=M.build(T,f),bounds=m=>new T.Box3().setFromObject(m),refHead=bounds(ref.children.find(m=>m.name==='barrel-shell'));
for(const [count,h]of [552,826,1100].entries())for(const mountHeight of [0,760]){
 const item={...f,h,mountHeight},model=M.build(T,item),b=bounds(model),layout=P.circulatorLayout(item);assert.equal(layout.count,count);assert.equal(model.children.length,27+count);near(b.min.y*1000,mountHeight);near(b.max.y*1000,mountHeight+h);assert.equal(new Set(model.children.map(m=>m.userData.furnishStablePart)).size,27+count);
 for(const name of ['barrel-shell','control-column','round-base','centre-badge']){
  const current=bounds(model.children.find(m=>m.name===name)),original=bounds(ref.children.find(m=>m.name===name));for(const axis of ['x','y','z'])near(current.max[axis]-current.min[axis],original.max[axis]-original.min[axis]);
 }
 const head=bounds(model.children.find(m=>m.name==='barrel-shell'));near((head.min.y-refHead.min.y)*1000,h-1100+mountHeight);
 const parts=G.bodyParts(item);assert.equal(parts.length,27+count);near(Math.min(...parts.map(p=>p.vertical.bottom)),mountHeight);near(Math.max(...parts.map(p=>p.vertical.top)),mountHeight+h);
 const control={type:'block',cx:0,cy:0,rot:0,w:80,d:80,h:30,mountHeight:mountHeight+h-420};assert(G.volumeOverlap(item,control));assert(!G.volumeOverlap(item,{...control,mountHeight:mountHeight+h+1}));
}
// A legacy short custom height remains loadable and does not silently increase its envelope.
for(const h of [400,700,950,1250]){const b=bounds(M.build(T,{...f,h}));near(b.max.y*1000,h);near(b.min.y,0);}
assert.equal(P.initial(f).mountHeight,0);assert.equal(P.value(f,'mountHeight'),0);assert.throws(()=>P.validateField(f,'mountHeight',-1));
for(const item of [f,{...f,h:552,mountHeight:760}])for(const place of ['current','named','catalog']){
 const payload={current:{furniture:place==='current'?[item]:[]},designs:place==='named'?[{name:'桌面档',work:{furniture:[item]}}]:[],catalog:place==='catalog'?[{...item,price:0}]:[]},packed=J.pack({planId:'fan-plan',...payload});assert.equal(packed.version,48);const restored=J.unpack(packed);assert.equal(restored.current.furniture.length,payload.current.furniture.length);
}
const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),work={...W.fresh(plan),furniture:[{...f,h:552,mountHeight:760}]},store={v:48,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};
assert.equal(JSON.parse(R.text(store)).version,48);assert.deepEqual(R.parse(JSON.parse(R.text(store))).work[plan.id].furniture,work.furniture);
assert.deepEqual(Cache.load({read:key=>key==='huxing-design-v48'?JSON.stringify(store):null,key:'huxing-design-v48',firstPlan:plan,restore:W.restore}),store);
const oldCache={...store,v:47,work:{[plan.id]:{...work,furniture:[f]}}};assert.equal(Cache.load({read:key=>key==='huxing-design-v47'?JSON.stringify(oldCache):null,key:'huxing-design-v48',firstPlan:plan,restore:W.restore}).v,47);
let restored=work;for(let i=0;i<3;i++)restored=W.restore(restored,plan);assert.deepEqual(restored.furniture,work.furniture);const legacy=W.restore({...work,furniture:[f]},plan);assert(!('mountHeight' in legacy.furniture[0]));
const next={...f,type:'chair',mountHeight:760};P.replacement({...f,mountHeight:760},next,{type:'chair'});assert(!('mountHeight'in next));
const confirmation=item=>J.checkFingerprint({kind:'cabinetdoor',id:item.id},{...plan,walls:[],wins:[],doors:[],beams:[],rooms:[]},[item],800);
assert.notEqual(confirmation(f),confirmation({...f,h:552}));assert.notEqual(confirmation(f),confirmation({...f,mountHeight:760}));assert.equal(confirmation(f),confirmation({...f,color:'#123456',price:199}));
console.log('PASS pole removal/rigid head and base, three presets, support elevation, legacy custom heights, shared solids/collision, v48 project/workspace roundtrip, no-drift restore/replacement and spatial confirmation');
})().catch(e=>{console.error(e);process.exitCode=1;});
