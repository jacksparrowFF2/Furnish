const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js');
const base={id:'laundry',type:'counter',name:'洗衣机柜',cx:2000,cy:2000,rot:0,color:'#f3f1ec'};
const host=K.configure(base,K.laundryPreset()),washer={id:'washer',name:'洗衣机',type:'washer',cx:0,cy:0,w:600,d:600,rot:0,color:'#fff'};
assert.deepEqual([host.w,host.d,host.kitchen.baseHeight+host.kitchen.thickness],[1340,630,920]);
assert(!K.isLaundry(K.configure(base,K.defaults({w:1340,d:630}))));
assert.deepEqual(K.catalogSpec(require('../src/data/catalog.js').findItem('counter','洗衣机柜 · 水槽与设备空位')).kitchen,host.kitchen);
for(const rot of [0,90,37,270])for(const flip of [false,true]){
 const f={...host,rot,flip},aligned=K.centerLaundryInBay(f,washer,1),[x,y]=K.local(f,aligned.cx,aligned.cy),m=K.layout(f)[1];
 assert(Math.abs(x-m.x)<1e-6);assert(Math.abs(y+washer.d/2-f.d/2)<1e-6);assert.equal(aligned.rot,rot);assert.equal(aligned.flip,flip);assert(!G.volumeOverlap(f,aligned),'empty bay has no solid carcass');
 assert.throws(()=>K.centerLaundryInBay(f,{...washer,w:641},1));
 K.centerLaundryInBay(f,{...washer,w:640,d:630,h:900},1);
 assert.throws(()=>K.centerLaundryInBay(f,{...washer,h:900.01},1));
 assert.throws(()=>K.centerLaundryInBay(f,{...washer,d:630.01},1));
 assert.throws(()=>K.centerLaundryInBay(f,{...washer,h:NaN},1));
 const tooHigh={...aligned,h:901};assert(G.volumeOverlap(f,tooHigh),'countertop still blocks oversized appliance');
 assert.throws(()=>K.centerLaundryInBay(f,{...washer,locked:true},1));
}
let notch=K.configure(host,{...host.kitchen,laundry:{countertop:true,notch:{side:'left',width:100,depth:100}}});
assert.equal(K.area(notch),(1340*630-10000)/1e6);
const point=K.world(notch,-640,-290),pipe={id:'pipe',type:'custom',cx:point[0],cy:point[1],w:30,d:30,h:2400,rot:0};assert(!G.volumeOverlap(notch,pipe));
for(const side of ['left','right']){
 const f=K.configure(host,{...host.kitchen,laundry:{notch:{side,width:100,depth:100}}});
 assert.equal(K.topGeometry(f).rings[0].length,6);
 const work={furniture:[f]},packed=P.unpack(P.pack({planId:'test',current:work,designs:[{name:'洗衣区',work}],catalog:[]}));assert.deepEqual(packed.current.furniture[0],f);assert.deepEqual(packed.designs[0].work.furniture[0],f);
 const restored=D.restoreFurniture([f],{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#fff'}),restored);
}
assert.throws(()=>K.configure(host,{...host.kitchen,laundry:{notch:{side:'left',width:100,depth:481}}}));K.configure(host,{...host.kitchen,laundry:{notch:{side:'left',width:20,depth:480}}});
const noTop=K.configure(host,{...host.kitchen,laundry:{countertop:false}});assert.equal(R.vertical(noTop).top,900);assert.equal(K.surfaceGeometry(noTop).polys.length,0);K.centerLaundryInBay(noTop,{...washer,h:1800},1);
const open=K.configure(host,{...host.kitchen,modules:[{run:0,width:700,role:'open'},{run:0,width:640,role:'empty'}]});const part=K.moduleFurniture(open,K.layout(open)[0]);C.validate(part);assert.equal(part.cabinet.columns[0].door,'none');assert.equal(part.cabinet.columns[0].shelves.length,1);assert.equal(K.openingZones(open).length,0);
const sink={id:'sink',name:'定制水槽',type:'ksink',cx:2000,cy:2000,w:600,d:500,rot:0,color:'#eee',sinkNotch:{side:'left',width:100,depth:100}};R.validate(sink);assert.equal(K.openingRing(sink).length,6);assert.equal(R.vertical(sink).bottom,642);
assert.throws(()=>R.validate({...sink,sinkNotch:{side:'right',width:521,depth:100}}));assert.throws(()=>D.resizeFurniture(sink,{w:150}));assert.equal(D.replaceFurniture(sink,{type:'washer',name:'洗衣机',w:600,d:600,color:'#fff'}).sinkNotch,undefined);
const restoredSink=D.restoreFurniture([sink],{makeId:()=> 'new',colorFor:()=> '#fff'})[0];assert.deepEqual(restoredSink.sinkNotch,sink.sinkNotch);
const plan={rooms:[],walls:[],doors:[]},issue={kind:'overlap',id:'laundry'};
const fingerprint=list=>P.checkFingerprint(issue,plan,list,800),before=fingerprint([host,sink]);
assert.equal(before,fingerprint([{...host,color:'#123456',price:500,purchaseStatus:'ordered'},sink]));
assert.notEqual(before,fingerprint([notch,sink]));assert.notEqual(before,fingerprint([host,{...sink,sinkNotch:{...sink.sinkNotch,width:120}}]));
const pasted=D.pasteFurniture({items:[host,sink],cx:2000,cy:2000},{x:2000,y:2000},{x:0,y:0,w:10000,h:10000},(()=>{let i=0;return()=> 'copy'+(++i);})()).items;assert.deepEqual(pasted[0].kitchen,host.kitchen);assert.deepEqual(pasted[1].sinkNotch,sink.sinkNotch);
// Side styles reuse flip and keep module identity, links and all dimensions.
const leftItem=require('../src/data/catalog.js').findItem('counter','洗衣机柜 · 左洗衣机／右水槽');assert.equal(K.catalogSpec(leftItem).flip,true);
assert.equal(K.laundrySide({...host,...K.catalogSpec(leftItem)}),'left');
assert.equal(D.replaceFurniture(host,{type:'counter',name:leftItem[1],w:leftItem[2],d:leftItem[3],color:leftItem[4],...K.catalogSpec(leftItem)}).flip,true);
for(const rot of [0,90,37,270])for(const flip of [undefined,true]){
 const h={...notch,rot,...(flip?{flip}:{}),groupId:'area'},w=K.centerLaundryInBay(h,washer,1),s=K.attach({...sink,rot:0},h,0),items=[h,w,s,{id:'upper',type:'kitchenwall',name:'吊柜',cx:h.cx+150,cy:h.cy,w:1340,d:350,h:600,mountHeight:1800,rot,groupId:'area'},{...washer,id:'unrelated',cx:9000,cy:9000}];K.normalize(items);
 const source=JSON.stringify(items),other=items[4],switched=K.switchLaundrySides(items,h.id);assert.equal(JSON.stringify(items),source,'pure edit');assert.equal(switched[4],other,'unrelated appliance stays');assert.notEqual(K.laundrySide(switched[0]),K.laundrySide(h));
 K.normalize(switched,items);assert.deepEqual(switched[2].counterLink,s.counterLink);assert.deepEqual(switched[2].sinkNotch,s.sinkNotch);assert.deepEqual(switched[0].kitchen,h.kitchen);assert.equal(switched[3].mountHeight,1800);
 assert(!G.volumeOverlap(switched[0],switched[1]));const twice=K.switchLaundrySides(switched,h.id);K.normalize(twice,switched);
 for(let i=0;i<items.length;i++){assert(Math.abs(twice[i].cx-items[i].cx)<1e-6);assert(Math.abs(twice[i].cy-items[i].cy)<1e-6);assert.equal(!!twice[i].flip,!!items[i].flip);assert.equal(twice[i].rot,items[i].rot);}
 const payload={planId:'test',current:{furniture:switched},designs:[{name:'左洗衣机',work:{furniture:switched}}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)).current.furniture,switched);
 assert.throws(()=>K.switchLaundrySides(items.map(f=>f.id===w.id?{...f,locked:true}:f),h.id),/锁定/);assert.equal(JSON.stringify(items),source);
}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C,FurnishProducts:R});
 for(const name of ['solid-cut','cabinet-model','kitchen-model','sink-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const side of ['left','right']){
  const f=K.configure(host,{...host.kitchen,laundry:{notch:{side,width:100,depth:100}}}),model=ctx.FurnishKitchenModel.build(T,f,box);model.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3((side==='left'?-640:640)/1000,2,-.29),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(model,true).length,0,'production notch contains no boards or stone');
  const surface=new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0));assert(surface.intersectObject(model,true).some(v=>v.object.userData.kitchenSlab),'production stone remains');
  const basin=ctx.FurnishSinkModel.buildNotched(T,{...sink,sinkNotch:{side,width:100,depth:100}});basin.updateMatrixWorld(true);const absent=new T.Raycaster(new T.Vector3(side==='left'?-.27:.27,2,-.22),new T.Vector3(0,-1,0));assert.equal(absent.intersectObject(basin,true).length,0,'production basin has a real concave corner');
  assert(new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0)).intersectObject(basin,true).some(v=>v.object.userData.sinkPart==='notched-floor'));
 }
 const naked=ctx.FurnishKitchenModel.build(T,noTop,box);let count=0;naked.traverse(o=>{if(o.userData.kitchenSlab)count++;});assert.equal(count,0);
})().catch(e=>{console.error(e);process.exitCode=1;});
