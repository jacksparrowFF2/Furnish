const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
const base={id:'k',type:'counter',name:'厨房',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#ddd',price:321,brand:'保留',purchaseStatus:'ordered'};
const host={...base,kitchen:{...K.defaults(base),modules:[{run:0,width:900,role:'sink'},{run:0,width:900,role:'drawer'}]}};
const broken={...host,w:2200,d:650},device={id:'s',type:'ksink',name:'水槽',color:'#ddd',cx:111,cy:222,w:760,d:450,rot:90,counterLink:{hostId:'k',module:0},counterElevation:860};
const snapshot=JSON.stringify([broken,device]);
assert.match(R.modelError(broken),/外包尺寸/);
const options={makeId:()=> 'new',colorFor:()=> '#ddd'};
assert.equal(JSON.stringify(D.restoreFurniture([broken,device],options)),snapshot);
assert.equal(JSON.stringify(D.restoreFurniture(D.restoreFurniture([broken,device],options),options)),snapshot,'repeat restoration retains broken records and links');
const invalidCabinet={...base,id:'broken-cabinet',type:'cabinet',cabinet:{version:1,columns:null}},invalidKitchen={...host,id:'missing-modules',kitchen:{...host.kitchen,modules:null}};
for(const invalid of [invalidCabinet,invalidKitchen]){
 const saved=structuredClone(invalid),healthy={...base,id:'healthy-cabinet',type:'cabinet'},restored=D.restoreFurniture([invalid,healthy],options);
 assert.deepEqual(restored[0],saved,'failed upgrade retains complete invalid record for manual recovery');assert(restored[1].cabinet,'healthy sibling still upgrades');assert(R.modelError(restored[0]));
 assert.deepEqual(D.restoreFurniture(restored,options),restored,'repeated recovery does not drift');assert.throws(()=>P.validateWork({furniture:restored}),'strict import still rejects broken structures');assert.deepEqual(invalid,saved,'upgrade failure never changes input');
}
const plan={walls:[],wins:[],doors:[],slides:[],rooms:[{id:'room',name:'房间',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}],bounds:{x:0,y:0,w:5000,h:5000},markers:[]};
const normal={...base,id:'normal',type:'custom',w:800,d:400};
const issues=P.spaceCheck(plan,[broken,device,normal],{scanPassages:false});
assert(issues.some(v=>v.kind==='model'&&v.id==='k'&&v.pending));assert.equal(JSON.stringify([broken,device]),snapshot);
for(const shape of ['straight','L'])for(const rot of [0,90,37])for(const flip of [false,true]){
 const f=shape==='straight'?{...broken,rot,flip}:K.configure({...host,rot,flip},{...host.kitchen,shape:'L',corner:'right',modules:[...host.kitchen.modules,{run:1,width:800,role:'hob'}]});
 const input={...f,w:f.w+400,d:f.d+100},before=JSON.stringify(input),next=K.repairDimensions(input);
 K.validate(next);assert.deepEqual([next.w,next.d],[input.w,input.d]);assert.equal(next.cx,input.cx);assert.equal(next.rot,rot);assert.equal(next.flip,flip);assert.equal(next.price,321);assert.equal(next.brand,'保留');assert.deepEqual(next.kitchen.modules.map(m=>m.role),input.kitchen.modules.map(m=>m.role));
 assert.equal(JSON.stringify(input),before,'repair is immutable');assert.deepEqual(K.repairDimensions(next),next,'repeat repair has no drift');
 const canonical=K.repairDimensions(input,false);assert.deepEqual(canonical.kitchen,input.kitchen);K.validate(canonical);
 const bundle={planId:'test',current:{furniture:[next]},designs:[{name:'保留方案',work:{furniture:[next]}}],catalog:[]};assert.deepEqual(P.unpack(P.pack(bundle)).current.furniture,[next]);
}
assert.throws(()=>K.repairDimensions({...broken,locked:true}),/锁定/);
assert.throws(()=>K.repairDimensions({...broken,kitchen:{...broken.kitchen,modules:[]}}));
assert.throws(()=>K.repairDimensions({...broken,w:100}),/模块宽/);
// Exercise the production pointermove listener, rather than just calling resize.
const source=fs.readFileSync(require.resolve('../src/ui/canvas-interactions.js'),'utf8');
for(const rot of [0,90,37])for(const flip of [false,true]){
 const f={...structuredClone(host),rot,flip,resizeAnchor:'right'},events={},el={textContent:'',innerHTML:'',addEventListener(){}};
 const ctx=vm.createContext({TAP:4,state:{furniture:[f]},ui:{layers:{wallSnap:false}},view:{s:1},FurnishDesign:D,FurnishSnapping:S,document:{addEventListener(){},querySelector:()=>null},svg:{addEventListener:(name,fn)=>events[name]=fn},$:()=>el,getF:()=>f,toMM:e=>({x:e.clientX,y:e.clientY}),clearTimeout(){},renderFurn(){},renderSel(){},syncFurnOrder(){},furnT:()=>''});
 vm.runInContext(source,ctx);ctx.toMM=e=>({x:e.clientX,y:e.clientY});require('./helpers/pointer-frames.cjs')(ctx);vm.runInContext('initializeCanvasInteractions()',ctx);ctx.original=structuredClone(f);
 vm.runInContext("drag={kind:'size',id:'k',original,startPoint:{x:0,y:0},sx:0,sy:0,axis:'both'}",ctx);
 const angle=rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),dx=300*c-100*s,dy=300*s+100*c;
 events.pointermove({pointerId:1,clientX:dx,clientY:dy,target:{closest:()=>null}});K.validate(f);assert.deepEqual([f.w,f.d],[2100,700]);
 const corner={x:host.cx+host.w/2*c-host.d/2*s+dx,y:host.cy+host.w/2*s+host.d/2*c+dy},expected=S.resize({...host,rot,flip},corner,{axis:'both',scale:1,wallSnap:false,rects:[]}).furniture;
 assert.deepEqual([f.cx,f.cy],[expected.cx,expected.cy],'pointer anchor takes precedence over property resizeAnchor');
}
console.log('PASS broken furniture retention, explicit immutable repairs, project roundtrip and actual kitchen pointer resize');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),records=[{...base,id:'throwing'},{...normal,id:'healthy'}],before=JSON.stringify(records),errors=new Map();
 const scene=vm.createContext({THREE,state:{furniture:records},furnitureError:()=>null,furnitureRenderErrors:errors,syncModelErrors(){},furnG:new THREE.Group(),opt:{furn:true},applyGrow(){},M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,FurnishCabinet:{sideOpenings:()=>null,joinedSideFinishes:()=>null,sharedSides:()=>null},clearGroup:g=>g.clear(),buildFurniture:f=>{if(f.id==='throwing')throw Error('constructor failure');const g=new THREE.Group();g.userData.fid=f.id;return g;}});
 Object.assign(scene,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),scene);scene.buildFurn();
 assert.equal(scene.furnG.children.length,2);assert(scene.furnG.children.find(g=>g.userData.fid==='throwing').userData.modelError);assert(!scene.furnG.children.find(g=>g.userData.fid==='healthy').userData.modelError);assert.equal(errors.get('throwing'),'constructor failure');assert.equal(JSON.stringify(records),before);
 const old=scene.furnG.children.find(g=>g.userData.fid==='healthy');scene.buildFurn();assert.equal(scene.furnG.children.length,2);assert.equal(scene.furnG.children.find(g=>g.userData.fid==='healthy'),old,'healthy cached geometry survives failing sibling');
 console.log('PASS actual 3D constructor failure isolation, placeholders and healthy cache retention');
})().catch(e=>{console.error(e);process.exitCode=1;});
