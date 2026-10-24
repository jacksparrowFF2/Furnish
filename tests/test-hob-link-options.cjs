const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const base={id:'k',type:'counter',name:'厨房',cx:2000,cy:2000,w:766,d:600,rot:0,color:'#eee'};
const host=K.configure(base,{...K.defaults(base),modules:[{run:0,width:766,role:'door'}]});
const hob={id:'hob',type:'stove_fotile_th36b',name:'TH36B-T',cx:0,cy:0,w:750,d:440,rot:0,color:'#111',...R.initial({type:'stove_fotile_th36b'})};
const list=[host,hob],before=JSON.stringify(list);
assert.deepEqual(K.attachmentTargets(hob,list).map(t=>[t.m.index,t.convert,t.reason]),[[0,true,'']]);
const linked=K.attachment(list,hob.id,host.id,0),items=[linked.host,linked.device];K.normalize(items);K.validateList(items);
assert.equal(JSON.stringify(list),before,'candidate evaluation and attachment leave inputs unchanged');
assert.equal(items[0].kitchen.modules[0].role,'hob');assert.equal(items[0].kitchen.modules[0].shelves,undefined);
assert.deepEqual(K.moduleFurniture(items[0],K.layout(items[0])[0]).cabinet.columns[0].shelves,[]);
assert.deepEqual(items[1].counterLink,{hostId:'k',module:0});assert.equal(items[1].counterElevation,860);
assert.equal(K.attachmentTargets(items[1],items)[0].reason,'','current link is not considered occupied');
const fixture={planId:'test',current:{furniture:items},designs:[{id:'saved',name:'厨房',work:{furniture:items}}],catalog:[]};
const saved=P.unpack(P.pack(fixture));assert.deepEqual(saved.current.furniture,items);assert.deepEqual(saved.designs[0].work.furniture,items);
let restored=items;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,items);
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const next=structuredClone(items);next[0].rot=rot;next[0].flip=flip;next[0].cx+=100;next[0].kitchen.baseHeight=900;K.normalize(next,items);K.validateList(next);
 const m=K.layout(next[0])[0];assert.deepEqual([next[1].cx,next[1].cy],K.world(next[0],m.x,m.y));assert.equal(next[1].counterElevation,940);
}
for(const width of [750,749.99]){
 const h=K.configure(host,{...host.kitchen,modules:[{run:0,width,role:'hob'}]});
 if(width===750)assert.doesNotThrow(()=>K.attach(hob,h,0));else assert.throws(()=>K.attach(hob,h,0),/面板/);
}
for(const width of [726,726.01]){
 const f={...hob,hobCutout:{w:width,d:350}};
 if(width===726)assert.doesNotThrow(()=>K.attachment([host,f],f.id,host.id,0));else assert.throws(()=>K.attachment([host,f],f.id,host.id,0),/边距/);
}
for(const depth of [560,560.01]){
 const f={...hob,hobCutout:{w:660,d:depth},d:580};
 if(depth===560)assert.doesNotThrow(()=>K.attachment([host,f],f.id,host.id,0));else assert.throws(()=>K.attachment([host,f],f.id,host.id,0),/边距/);
}
for(const locked of [0,1]){const values=structuredClone(list);values[locked].locked=true;assert.match(K.attachmentTargets(values[1],values)[0].reason,/解锁/);assert.throws(()=>K.attachment(values,'hob','k',0),/解锁/);}
const other={...hob,id:'other',counterLink:{hostId:'k',module:0}};assert.match(K.attachmentTargets(hob,[...list,other])[0].reason,/已关联/);
for(const role of ['sink','drawer','empty']){const h=K.configure(host,{...host.kitchen,modules:[{run:0,width:766,role}]});assert.equal(K.attachmentTargets(hob,[h,hob]).length,0);assert.throws(()=>K.attachment([h,hob],'hob','k',0));}
const wall={...host,id:'wall',type:'kitchenwall'};assert.equal(K.attachmentTargets(hob,[wall,hob]).length,0);
// Production cabinet and slab must reflect the role change, including a real hole.
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishCabinet:require('../src/core/cabinet-core.js')}));
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const model=ctx.FurnishKitchenModel.build(THREE,items[0],box,{furniture:items});model.updateMatrixWorld(true);
 const ray=x=>new THREE.Raycaster(new THREE.Vector3(x,2,0),new THREE.Vector3(0,-1,0)).intersectObject(model,true).filter(hit=>hit.object.userData.kitchenSlab);
 assert.equal(ray(0).length,0,'hole at hob center in production countertop');assert(ray(.37).length>0,'actual countertop remains beside the hole');
 console.log('PASS hob link options: door conversion, thresholds, locks, occupancy, transforms, restore, project and production hole');
})().catch(e=>{console.error(e);process.exitCode=1;});
