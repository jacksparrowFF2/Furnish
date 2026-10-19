const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),S=require('../src/core/snapping.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);let serial=0;
for(const side of ['left','right'])for(const rot of [0,37,90,270]){
 const items=K.createLaundryCabinet({id:'base',cx:2000,cy:2000,rot,color:'#f5f4ef'},()=>`part${++serial}`,side),f=items[0],before=JSON.stringify(items),bay=K.layout(f).find(m=>m.role==='empty');
 // Canonical left is the sink end. The displayed edge reverses with mirroring.
 const edge=f.flip?'right':'left',start=K.world(f,-f.w/2,0),end=K.world(f,-f.w/2+200,0);
 const changed=S.resizeKitchenOuter(f,edge,{x:end[0],y:end[1]},{start:{x:start[0],y:start[1]},grid:10,scale:1}).furniture;
 assert.equal(changed.w,f.w-200);assert.equal(changed.kitchen.modules[0].width,f.kitchen.modules[0].width-200);assert.equal(changed.kitchen.laundry.assembly.sink.w,f.kitchen.laundry.assembly.sink.w-200);assert.equal(changed.kitchen.modules[bay.index].width,bay.width);
 const next=[changed,structuredClone(items[1])];K.normalize(next,items);near(next[1].cx,items[1].cx);near(next[1].cy,items[1].cy);assert.deepEqual({...next[1],cx:0,cy:0},{...items[1],cx:0,cy:0});assert.equal(JSON.stringify(items),before);
 const round=P.unpack(P.pack({planId:'test',current:{furniture:next},designs:[{name:'缩小',work:{furniture:next}}],catalog:[]}));assert.deepEqual(round.current.furniture,next);
 const restored=D.restoreFurniture(next,{makeId:()=>`r${++serial}`,colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(restored,{makeId:()=>`r${++serial}`,colorFor:()=> '#fff'}),restored);
 assert.throws(()=>K.resizeOuter(f,'left',-600));assert.equal(JSON.stringify(items),before);assert.throws(()=>K.resizeOuter({...f,locked:true},'left',-10),/锁定/);
 const limit=K.resizeOuter(f,'left',-420);assert.equal(limit.kitchen.laundry.assembly.sink.w,180);assert.throws(()=>K.resizeOuter(f,'left',-420.01),/缺口/);assert.equal(K.resizeOuter(f,'top',-30).d,600);assert.throws(()=>K.resizeOuter(f,'top',-30.01),/净深/);
 const grow=K.resizeOuter(changed,'left',200);near(grow.cx,f.cx);near(grow.cy,f.cy);assert.deepEqual(grow.kitchen,f.kitchen);
 const vessel=structuredClone(changed);Object.assign(vessel.kitchen.laundry.assembly.sink,{sinkStyle:'vessel',sinkBowlHeight:150,d:400});delete vessel.kitchen.laundry.assembly.sink.sinkNotch;K.validate(vessel);
 const sink=K.laundryParts(vessel).find(p=>p.key==='sink').furniture,ring=K.openingRing(sink);near(Math.max(...ring.map(p=>p[0]))-Math.min(...ring.map(p=>p[0])),45);assert.equal(R.vertical(sink).bottom,sink.counterElevation);assert.equal(R.vertical(sink).top,sink.counterElevation+300);
 const saved=P.unpack(P.pack({planId:'test',current:{furniture:[vessel,items[1]]},designs:[],catalog:[]}));assert.deepEqual(saved.current.furniture,[vessel,items[1]]);
 const smaller=K.resizeOuter(vessel,'left',-50);assert.equal(smaller.kitchen.laundry.assembly.sink.w,sink.w-50);
 const deviceEnd=K.resizeOuter(f,'right',-20);assert.equal(deviceEnd.kitchen.modules[0].width,f.kitchen.modules[0].width);assert.deepEqual(deviceEnd.kitchen.laundry.assembly.sink,f.kitchen.laundry.assembly.sink);
}
const basin={id:'basin',type:'ksink',name:'台上盆',cx:0,cy:0,w:560,d:400,rot:0,color:'#f5f4ef',sinkStyle:'vessel',sinkBowlHeight:150,counterElevation:920};
assert.throws(()=>P.validateWork({furniture:[{...basin,sinkStyle:'bad'}]}));assert.throws(()=>R.validate({...basin,sinkBowlHeight:49}));assert.throws(()=>R.validate({...basin,w:79}));
assert.throws(()=>D.resizeFurniture(basin,{w:79}));
const contextPlan={rooms:[],walls:[],doors:[]},fingerprint=f=>P.checkFingerprint({kind:'overlap',id:f.id},contextPlan,[f],800);
assert.notEqual(fingerprint(basin),fingerprint({...basin,sinkStyle:'inset'}));assert.notEqual(fingerprint(basin),fingerprint({...basin,sinkBowlHeight:200}));assert.equal(fingerprint(basin),fingerprint({...basin,color:'#123456',price:123,purchaseStatus:'bought'}));
const tiny=D.replaceFurniture({...basin,sinkStyle:'inset',sinkNotch:{side:'left',width:100,depth:100}}, {...basin,w:80,d:80});assert.equal(tiny.sinkStyle,'vessel');assert.equal(tiny.sinkNotch,undefined);
const replaced=D.replaceFurniture({...basin,sinkStyle:'inset'}, {...basin,sinkBowlHeight:200});assert.equal(replaced.sinkStyle,'vessel');assert.equal(replaced.sinkBowlHeight,200);
assert.equal(P.procurement({rooms:[]},{furniture:[basin,{...basin,id:'taller',sinkBowlHeight:200}]}).items.length,2);
const copy=D.pasteFurniture({items:[basin],cx:0,cy:0},{x:2000,y:2000},{x:0,y:0,w:10000,h:10000},()=> 'basin-copy').items[0];assert.equal(copy.sinkStyle,'vessel');assert.equal(copy.sinkBowlHeight,150);
assert.equal(D.replaceFurniture(basin,{type:'washer',name:'洗衣机',w:600,d:600,color:'#fff'}).sinkStyle,undefined);assert.equal(D.replaceFurniture(basin,{type:'ksink',name:'定制盆',w:500,d:400,color:'#fff'}).sinkStyle,'vessel');
assert.equal(K.catalogSpec(require('../src/data/catalog.js').findItem('ksink','阳台台上盆 · 圆角单盆')).sinkStyle,'vessel');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js')});
 for(const name of ['solid-cut','cabinet-model','sink-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const model=ctx.FurnishSinkModel.buildVessel(T,basin);model.position.y=(basin.counterElevation-862)/1000;model.updateMatrixWorld(true);let walls;model.traverse(o=>{if(o.userData.sinkPart==='vessel-walls')walls=o;});const bounds=new T.Box3().setFromObject(walls);near(bounds.min.y,.920);near(bounds.max.y,1.070);near(bounds.max.x-bounds.min.x,.560);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const [host]=K.createLaundryCabinet({id:'host',cx:0,cy:0,rot:0,color:'#fff'},()=>`g${++serial}`,'right');Object.assign(host.kitchen.laundry.assembly.sink,{sinkStyle:'vessel',sinkBowlHeight:150,d:400});delete host.kitchen.laundry.assembly.sink.sinkNotch;K.validate(host);
 const full=ctx.FurnishKitchenModel.build(T,host,box),sink=K.laundryParts(host).find(p=>p.key==='sink').furniture,[x,z]=K.local(host,sink.cx,sink.cy);full.updateMatrixWorld(true);
 const slabs=[];full.traverse(o=>{if(o.userData.kitchenSlab)slabs.push(o);});
 const ray=(dx,dz)=>new T.Raycaster(new T.Vector3(x/1000+dx,1.3,z/1000+dz),new T.Vector3(0,-1,0)).intersectObjects(slabs,true);
 assert.equal(ray(0,0).length,0,'drain passes through top');assert(ray(.1,0).length>0,'top is solid under the bowl away from drain');
 console.log('Laundry end resize and vessel sink: transforms, fixed washer, atomic rejection, persistence, production bowl and drain passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
