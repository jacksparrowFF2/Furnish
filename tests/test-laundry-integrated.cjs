const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
let serial=0;const id=()=>`part${++serial}`;
function make(side='left',rot=0){return K.createLaundryCabinet({id:'base',cx:2000,cy:2000,rot,color:'#f3f1ec'},id,side);}
for(const side of ['left','right'])for(const rot of [0,37,90,270]){
 const items=make(side,rot),f=items[0];assert.equal(items.length,2);assert(!items.some(p=>p.groupId));assert.equal(items[1].laundryHostId,f.id);P.validateWork({furniture:items});assert.equal(K.laundryHeight(f),2400);assert.doesNotThrow(()=>K.validate({...f,locked:true}));const locked=structuredClone(items);locked[0].locked=true;assert.doesNotThrow(()=>K.normalize(locked));assert.throws(()=>K.switchLaundrySides(locked,f.id),/锁定/);
 const bay=K.laundryBay(f,K.layout(f).find(m=>m.role==='empty'));assert.equal(bay.width,622);assert.equal(K.laundrySideBoards(f).length,1);assert.equal(K.moduleFurniture(f,K.layout(f)[0]).cabinet.plinth,0);
 assert.doesNotThrow(()=>K.centerLaundryInBay(f,{...items[1],w:622},bay.index));assert.throws(()=>K.centerLaundryInBay(f,{...items[1],w:623},bay.index),/净宽/);
 const plan={rooms:[{id:'r',poly:[[0,0],[10000,0],[10000,10000],[0,10000]],ceilingHeight:2700}],walls:[],doors:[],ceilingHeight:2700};assert.doesNotThrow(()=>P.spaceCheck(plan,items,{scanPassages:false}));
 const recolored=structuredClone(items);recolored[0].kitchen.laundry.assembly.upper.color='#123456';assert.deepEqual(P.checkFingerprint({kind:'cabinetdoor'},plan,recolored,800),P.checkFingerprint({kind:'cabinetdoor'},plan,items,800));recolored[0].kitchen.laundry.sidePanels.thickness=20;assert.notDeepEqual(P.checkFingerprint({kind:'cabinetdoor'},plan,recolored,800),P.checkFingerprint({kind:'cabinetdoor'},plan,items,800));
 const svg=require('../src/render/furniture-svg.js').render(f.type,f.w,f.d,f.color,{ink:'#333'},f);assert(svg.includes('data-laundry-basin'));
 const opened=K.setLaundryDoors(items,f.id,true);assert(opened[0].kitchen.laundry.assembly.upper.cabinet.columns.every(c=>c.doorOpen));assert(K.openingZones(f).some(z=>z.section==='laundry:upper'));
 const twice=K.switchLaundrySides(K.switchLaundrySides(opened,f.id),f.id);K.normalize(twice);assert(Math.abs(twice[1].cx-items[1].cx)<1e-6);assert.equal(K.laundrySide(twice[0]),side);
 const restored=D.restoreFurniture(JSON.parse(JSON.stringify(items)),{makeId:id,colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(restored,{makeId:id,colorFor:()=> '#fff'}),restored);const moved=structuredClone(items);moved[0].cx+=200;K.normalize(moved,items);assert(Math.abs(moved[1].cx-items[1].cx-200)<1e-6);
 const copied=D.pasteFurniture({items,cx:2000,cy:2000},{x:4000,y:4000},{x:0,y:0,w:10000,h:10000},id);assert.equal(copied.items[1].laundryHostId,copied.items[0].id);assert.notEqual(copied.items[0].id,f.id);
}
const legacy=K.createLaundryArea({id:'old',cx:2000,cy:2000},id,'legacy','left');legacy[1].purchaseStatus='bought';legacy[1].price=1234;
const integrated=K.integrateLaundryArea(legacy,'old');assert.equal(integrated[1].id,legacy[1].id);assert.equal(integrated[1].price,1234);assert.deepEqual(K.integrateLaundryArea(integrated,'old'),integrated);assert.equal(legacy.length,5);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:C});
 for(const n of ['solid-cut','cabinet-model','sink-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+n+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const items=make('right'),f=items[0],model=ctx.FurnishKitchenModel.build(T,f,box,{furniture:items});model.updateMatrixWorld(true);assert(Math.abs(new T.Box3().setFromObject(model).max.y-2.4)<.001);
 const panels=[];model.traverse(o=>{if(o.userData.laundrySidePanel)panels.push(o);});assert.equal(panels.length,1);assert(Math.abs(new T.Box3().setFromObject(panels[0]).min.y)<1e-6);
 // Downward ray inside the sink cabinet reaches the room floor, without a cabinet bottom/plinth.
 const sinkModule=K.layout(f)[0],ray=new T.Raycaster(new T.Vector3(sinkModule.x/1000,.15,.15),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(model,true).length,0);
 const closed=new T.Box3().setFromObject(model),opened=ctx.FurnishKitchenModel.build(T,K.setLaundryDoors(items,f.id,true)[0],box,{furniture:items});assert(new T.Box3().setFromObject(opened).max.z>closed.max.z+.1);
 const upper=K.laundryParts(f).find(p=>p.key==='upper').furniture;assert(K.bodyParts(f).some(p=>p.vertical.bottom===upper.mountHeight&&p.vertical.top===2400));
 console.log('integrated laundry cabinet: production side panel, floor cavity, upper doors and persistence passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
