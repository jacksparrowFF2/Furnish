'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/ceiling-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const {plan,work}=fixture(),copy=v=>JSON.parse(JSON.stringify(v));
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],region=(id,polygon,patch={})=>({id,name:id,polygon,style:'flat',height:2400,thickness:12,sections:[],center:true,...patch});
const build=regions=>regions.reduce((w,r)=>C.setRegion(w,r),work);
const original=[region('a',rect(200,200,800,900)),region('b',rect(200,1100,1600,300),{height:2480}),region('c',rect(1400,1400,400,1000)),region('d',rect(1800,1100,150,1300)),region('keep',rect(2500,200,500,500))];
const input=build(original),before=copy(input),merged=C.mergeFlatRegions(input,['a','b','c','d'],{sourceId:'a'}),r=merged.ceilings.regions.find(r=>r.id==='a');
const stable=build(original.map(r=>({...r,centerId:r.id+'_board',partIds:[]}))),stableResult=C.mergeFlatRegions(stable,['a','b','c','d'],{sourceId:'b'});assert.equal(stableResult.ceilings.items.find(c=>c.regionId==='b').id,'b_board');
assert.deepEqual(input,before);assert.equal(merged.ceilings.regions.length,2);assert.equal(merged.ceilings.items.length,2);assert.equal(Math.abs(C.area(r.polygon)),1795000);assert.deepEqual(merged.ceilings.regions.find(r=>r.id==='keep'),original[4]);assert.equal(r.name,'a');assert.equal(r.height,2480,'highest elevation wins even when source is lower');
assert.equal(C.inside([500,2000],r.polygon),false,'concave notch remains empty');
for(const key of Object.keys(input))if(key!=='ceilings')assert.deepEqual(merged[key],input[key]);
for(const transform of [p=>p,p=>[-p[0],p[1]],p=>[p[0]*Math.cos(.63)-p[1]*Math.sin(.63)+5000,p[0]*Math.sin(.63)+p[1]*Math.cos(.63)-1000]])for(const reverse of [false,true]){
 const transformed=original.slice(0,4).map(r=>({...r,polygon:r.polygon.map(transform)}));if(reverse)transformed.forEach(r=>r.polygon.reverse());
 const result=C.mergeFlatRegions(build(transformed),['d','c','b','a']);assert(Math.abs(Math.abs(C.area(result.ceilings.regions[0].polygon))-1795000)<.1);C.validate(result.ceilings);
}
const pair=(p,patch={})=>build([region('a',rect(0,0,1000,1000)),region('b',p,patch)]);
for(const ids of [[],['a'],['a','a'],['a','missing']])assert.throws(()=>C.mergeFlatRegions(input,ids));
for(const p of [rect(1000,1000,500,500),rect(1000.001,0,500,500)])assert.throws(()=>C.mergeFlatRegions(pair(p),['a','b']),/共边/);
for(const patch of [{thickness:13},{style:'aluminum'},{style:'ring',center:false}])assert.throws(()=>C.mergeFlatRegions(pair(rect(1000,0,500,1000),patch),['a','b']),/平面|板厚/);
assert.throws(()=>C.mergeFlatRegions(input,['a','b'],{sourceId:'keep'}),/来源/);
for(const p of [rect(500,0,1000,1000),rect(100,100,200,200),rect(0,0,1000,1000),rect(1000,100,500,500)]){
 const result=C.mergeFlatRegions(pair(p),['a','b']);C.validate(result.ceilings);assert.equal(result.ceilings.items.length,1);
}
const frame=build([region('a',rect(0,0,3000,500)),region('b',rect(0,500,500,2000)),region('c',rect(2500,500,500,2000)),region('d',rect(0,2500,3000,500))]);assert.throws(()=>C.mergeFlatRegions(frame,['a','b','c','d']),/无孔/);
const restore=W.create({makeId:()=> 'restored',colorFor:()=> '#ddd',materials:require('../src/data/catalog.js').materials}).restore;
let restored=merged;for(let i=0;i<3;i++){const packed=P.pack({planId:plan.id,current:restored,designs:[{name:'合并平顶',work:restored}],catalog:[]}),loaded=P.unpack(packed);restored=restore(loaded.current,plan);assert.deepEqual(restored.ceilings,merged.ceilings);assert.deepEqual(loaded.designs[0].work.ceilings,merged.ceilings);}
assert.notEqual(P.checkFingerprint({kind:'outside',id:'body'},P.effectivePlan(plan,input),input.furniture,800),P.checkFingerprint({kind:'outside',id:'body'},P.effectivePlan(plan,merged),merged.furniture,800));
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/ceiling-model.js'),model=M.build(THREE,C.resolve(merged.ceilings)),mesh=model.children.find(m=>m.userData.ceiling.id===merged.ceilings.items.find(c=>c.regionId==='a').id),pos=mesh.geometry.attributes.position.array;
 let volume=0;for(let i=0;i<pos.length;i+=9){const a=new THREE.Vector3(...pos.slice(i,i+3)),b=new THREE.Vector3(...pos.slice(i+3,i+6)),c=new THREE.Vector3(...pos.slice(i+6,i+9));volume+=a.dot(b.cross(c))/6;}
 assert(Math.abs(volume-1795000*12/1e9)<1e-6);assert(Math.abs(Math.min(...Array.from(pos).filter((v,i)=>i%3===1))-2.48)<1e-6,'production underside uses highest elevation');assert.equal(new THREE.Raycaster(new THREE.Vector3(.5,3,2),new THREE.Vector3(0,-1,0)).intersectObject(mesh).length,0);
 console.log('PASS flat ceiling union: connected/overlapping/contained, T and concave, rotation/mirror, rejection atomicity, restoration and production volume/notch');
})().catch(e=>{console.error(e);process.exitCode=1;});
