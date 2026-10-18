const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),catalog=require('../src/data/catalog.js');
function make(side='left',rot=0){let n=0;return K.createLaundryArea({id:'base',cx:2000,cy:2000,rot,color:'#f3f1ec'},()=> 'member'+(++n),'area',side);}
for(const side of ['left','right'])for(const rot of [0,37,90,270]){
 const items=make(side,rot),base=items[0],washer=items[1],sink=items[2],upper=items[3],open=items[4],text=JSON.stringify(items);
 P.validateWork({furniture:items});assert.equal(items.length,5);assert.equal(new Set(items.map(f=>f.groupId)).size,1);assert.equal(K.laundrySide(base),side);assert.equal(upper.mountHeight+upper.h,2400);assert.equal(open.mountHeight+open.h,upper.mountHeight);assert.equal(sink.counterElevation,920);assert.equal(sink.counterLink.hostId,base.id);assert(!G.volumeOverlap(base,washer));
 const opened=K.setLaundryDoors(items,base.id,true);assert.equal(JSON.stringify(items),text);assert(opened[0].kitchen.modules[0].doorOpen);assert(opened[3].cabinet.columns.every(c=>c.doorOpen));assert(opened[4].cabinet.columns.every(c=>!c.doorOpen));assert.equal(opened[1],washer);assert.equal(opened[2],sink);
 const closed=K.setLaundryDoors(opened,base.id,false);assert(closed[3].cabinet.columns.every(c=>!c.doorOpen));assert(!closed[0].kitchen.modules[0].doorOpen);
 const reflected=K.switchLaundrySides(opened,base.id);K.normalize(reflected,opened);assert.notEqual(K.laundrySide(reflected[0]),side);assert(reflected[3].cabinet.columns.every(c=>c.doorOpen));assert.equal(reflected[2].counterLink.hostId,base.id);
 const payload={planId:'test',current:{furniture:reflected},designs:[{name:'完整洗衣区',work:{furniture:reflected}}],catalog:[]},restored=P.unpack(P.pack(payload));assert.deepEqual(restored.current.furniture,reflected);assert.deepEqual(restored.designs[0].work.furniture,reflected);
 const recover=v=>D.restoreFurniture(v,{makeId:()=> 'unused',colorFor:()=> '#eee'});assert.deepEqual(recover(recover(reflected)),recover(reflected));
 let count=0;const copied=D.pasteFurniture({items,cx:2000,cy:2000},{x:4000,y:4000},{x:0,y:0,w:10000,h:10000},()=> 'copy'+(++count)).items;assert.equal(new Set(copied.map(f=>f.groupId)).size,1);assert.notEqual(copied[0].groupId,base.groupId);assert.equal(copied[2].counterLink.hostId,copied[0].id);assert.equal(D.expandGroups(copied,[copied[3].id]).length,5);
 assert.throws(()=>K.setLaundryDoors(items.map(f=>f.id===upper.id?{...f,locked:true}:f),base.id,true),/锁定/);assert.equal(JSON.stringify(items),text);
}
assert(K.isLaundryAreaItem(catalog.findItem('counter','完整阳台洗衣区 · 左洗衣机')));assert(K.isLaundryAreaItem(catalog.findItem('counter','完整阳台洗衣区 · 右洗衣机')));assert(!K.isLaundryAreaItem(catalog.findItem('counter','洗衣机柜 · 左洗衣机／右水槽')));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C,FurnishProducts:R});for(const n of ['solid-cut','cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+n+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const items=make(),opened=K.setLaundryDoors(items,'base',true);
 for(const index of [0,3]){const builder=index===0?ctx.FurnishKitchenModel:ctx.FurnishCabinetModel,closedModel=builder.build(T,items[index],box,{furniture:items}),openModel=builder.build(T,opened[index],box,{furniture:opened});const closedBox=new T.Box3().setFromObject(closedModel),openBox=new T.Box3().setFromObject(openModel);assert(openBox.max.z>closedBox.max.z+.1,'real production doors swing forward');}
})().catch(e=>{console.error(e);process.exitCode=1;});
