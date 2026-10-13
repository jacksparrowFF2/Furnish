const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/service-core.js');
const base={id:'right-kitchen',type:'counter',name:'厨房',cx:3000,cy:3000,w:2400,d:2100,rot:0,color:'#e9e5de'};
const config={version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:900,role:'sink'},{run:0,width:900,role:'drawer'},{run:1,width:900,role:'hob'},{run:1,width:600,role:'empty'}]};
const left=K.configure(base,config),right=K.configure(base,{...config,corner:'right'});
assert.equal(K.cornerSide(left),'left');assert.equal(left.kitchen.corner,undefined,'old left data stays absent');
assert.equal(K.cornerBlock(left).x,-900);assert.equal(K.cornerBlock(right).x,900);
assert.equal(K.layout(right)[2].rot,90);assert.equal(K.layout(left)[2].rot,270);
assert.equal(K.area(left),K.area(right));assert.deepEqual([right.cx,right.cy,right.w,right.d],[left.cx,left.cy,left.w,left.d]);
assert.throws(()=>K.configure(base,{...config,corner:'bad'}));
for(const rot of [0,90,37,270])for(const flip of [false,true]){
 const host={...structuredClone(right),rot,flip},m=K.layout(host)[2],hob=K.attach({id:'hob',type:'stove',name:'灶具',cx:0,cy:0,w:750,d:450,rot:0,color:'#111'},host,2),list=[host,hob];K.normalize(list);
 assert.equal(hob.rot,((rot+(flip?-90:90)+360)%360));assert.deepEqual([hob.cx,hob.cy],K.world(host,m.x,m.y));assert.equal(hob.counterElevation,860);
 const restored=D.restoreFurniture(list,{makeId:()=>{throw Error('unexpected id repair');},colorFor:()=> '#eee'});assert.deepEqual(restored,list);
 const point=K.world(host,-500,400),chair={id:'chair',type:'chair',cx:point[0],cy:point[1],w:100,d:100,rot};assert(!G.volumeOverlap(host,chair),'right L void stays free after transform');assert(!S.bodyHit(host,{at:point,radius:40,vertical:{bottom:0,top:2800}}));
 const openings=K.openingZones(host,{passage:0}).filter(z=>z.column===2);assert(openings.length>0);assert(openings.every(z=>z.ranges.every(([a,b])=>a>=0&&b<=820)));
 const payload={planId:'test',current:{furniture:list},designs:[{name:'右转角方案',work:{furniture:list}}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)).current.furniture,list);assert.deepEqual(P.unpack(P.pack(payload)).designs[0].work.furniture,list);
 const bigger=D.resizeFurniture(host,{w:3000,d:2400});assert.equal(bigger.kitchen.corner,'right');K.validate(bigger);
}
// Verify the solid geometry and holes produced by the exact room constructor.
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const hob=K.attach({id:'hob',type:'stove',cx:0,cy:0,w:750,d:450,rot:0},right,2),model=ctx.FurnishKitchenModel.build(THREE,right,box,{furniture:[hob]});model.updateMatrixWorld(true);
 const ray=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0)).intersectObject(model,true);
 assert.equal(ray(-.5,.4).length,0,'left interior has no solid geometry');assert(ray(.9,-.75).some(v=>Math.abs(v.point.y-.86)<1e-6),'right blind corner is topped by slab');assert(!ray(.9,0).some(v=>v.object.userData.kitchenSlab),'right return hob has a true cutout');
 assert(Math.abs(new THREE.Box3().setFromObject(model).max.y-.86)<1e-6);
 console.log('PASS right kitchen corner: legacy left omission, geometry, opening ranges, appliance orientation, rotated/mirrored void, resize and named-project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
