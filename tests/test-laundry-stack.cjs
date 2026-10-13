const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js');
const washer={id:'washer',type:'washer',name:'洗衣机',cx:0,cy:0,w:600,d:600,rot:0,color:'#e6ebee'};
const dryer={...washer,id:'dryer',type:'dryer',name:'烘干机',h:900,mountHeight:850};
assert.equal(G.collisions([washer,dryer]).length,0);
assert.equal(G.collisions([washer,{...dryer,mountHeight:849}]).length,1);
assert.equal(G.collisions([washer,{...dryer,mountHeight:0}]).length,1);
assert.equal(G.collisions([{...washer,h:950},dryer]).length,1);
assert.deepEqual(D.furnitureVerticalBounds(dryer),{bottom:850,top:1750,source:'recorded'});
assert.deepEqual(D.planFurnitureOrder([dryer,washer]).map(f=>f.id),['washer','dryer']);
for(const value of [-1,20001,NaN,Infinity,'850',null])assert.throws(()=>P.validateWork({furniture:[{...dryer,mountHeight:value}]}),/离地高度/);
const work={furniture:[washer,dryer]};
assert.deepEqual(P.unpack(P.pack({planId:'p1',current:work,designs:[{name:'叠放',work}],catalog:[]})).current,work);
assert.equal(D.replaceFurniture(dryer,{...washer,h:850}).mountHeight,850);
assert.equal(D.replaceFurniture(dryer,{...washer,type:'fridge'}).mountHeight,undefined);
assert.equal(D.replaceFurniture({...washer,type:'waterheater_flat',mountHeight:1650},dryer).mountHeight,undefined);
assert.equal(D.resizeFurniture(dryer,{h:1000}).mountHeight,850);
const stacked=D.normalizeLaundryStacks([{...washer},{...dryer}]);
assert.equal(stacked[1].mountHeight,870);
D.normalizeLaundryStacks(stacked);assert.equal(stacked[1].mountHeight,870,'connector is idempotent');
const previous=structuredClone(stacked);stacked[0].h=950;D.normalizeLaundryStacks(stacked,previous);assert.equal(stacked[1].mountHeight,970,'lower height change carries upper appliance');
assert.equal(D.normalizeLaundryStacks([{...washer},{...dryer,cx:100}])[1].mountHeight,850,'side-by-side has no connector');
assert.equal(D.normalizeLaundryStacks([{...washer},{...dryer,rot:90}])[1].mountHeight,850,'crossed appliances do not stack');
assert.equal(D.normalizeLaundryStacks([{...washer},{...dryer,mountHeight:849}])[1].mountHeight,849,'penetration remains visible');
assert.equal(D.normalizeLaundryStacks([{...washer},{...dryer,mountHeight:900}])[1].mountHeight,900,'larger intentional gap retained');
assert.equal(D.normalizeLaundryStacks([{...washer},{...dryer,locked:true}])[1].mountHeight,850,'locked item is not raised');
assert.equal(P.unpack(P.pack({planId:'p1',current:{furniture:stacked},designs:[],catalog:[]})).current.furniture[1].mountHeight,970);
for(const thickness of [0,1,35,1000]){
 const custom=D.normalizeLaundryStacks([{...washer},{...dryer,stackHeight:thickness,mountHeight:850}]);
 assert.equal(custom[1].mountHeight,850+thickness);
 const old=structuredClone(custom);custom[1].stackHeight=10;D.normalizeLaundryStacks(custom,old);assert.equal(custom[1].mountHeight,860,'changing connector height carries upper device, including reduction');
 const restored=P.unpack(P.pack({planId:'p1',current:{furniture:custom},designs:[{name:'custom connector',work:{furniture:custom}}],catalog:[]}));
 assert.equal(restored.current.furniture[1].stackHeight,10);assert.equal(restored.designs[0].work.furniture[1].mountHeight,860);
 assert.equal(D.replaceFurniture(custom[1],washer).stackHeight,10);assert.equal(D.replaceFurniture(custom[1],{...washer,type:'fridge'}).stackHeight,undefined);
 assert.equal(D.pasteFurniture({cx:0,cy:0,items:custom},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=>String(Math.random())).items[1].stackHeight,10);
}
for(const value of [-1,1001,NaN,Infinity,'35',null])assert.throws(()=>P.validateWork({furniture:[{...dryer,stackHeight:value}]}),/连接层高度/);
assert.throws(()=>P.validateWork({furniture:[{...washer,type:'fridge',stackHeight:20}]}),/连接层高度/);
const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
const transaction=vm.createContext({FurnishKitchen:require('../src/core/kitchen-core.js'),FurnishDesign:D,state:{furniture:[{...washer},{...dryer,mountHeight:0}]},undoStack:[],redoStack:[],save(){this.saved=JSON.stringify(this.state);},snapshot(){}});
// Exercise the actual commit hook used by property changes and planar dragging.
transaction.save=()=>{transaction.saved=JSON.stringify(transaction.state);};
vm.runInContext(app.match(/function commit\(before\)\{[^\n]+/)[0],transaction);
const oldWork=JSON.stringify(transaction.state);transaction.state.furniture[1].mountHeight=850;transaction.before=oldWork;
vm.runInContext('commit(before)',transaction);assert.equal(JSON.parse(transaction.saved).furniture[1].mountHeight,870);assert.equal(JSON.parse(transaction.undoStack[0]).furniture[1].mountHeight,0);
transaction.before=JSON.stringify(transaction.state);transaction.state.furniture[1].stackHeight=35;
vm.runInContext('commit(before)',transaction);assert.equal(JSON.parse(transaction.saved).furniture[1].mountHeight,885);assert.equal(JSON.parse(transaction.saved).furniture[1].stackHeight,35);assert.equal(JSON.parse(transaction.undoStack[1]).furniture[1].mountHeight,870);
assert.equal(D.pasteFurniture({cx:0,cy:0,items:[dryer]},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].mountHeight,850);
const elements=Object.fromEntries(['#full-product-details','#fName','#fMountHeight','#fStackHeight','#fH','#fC'].map(id=>[id,{}]));
let current={...dryer},errors=[],history=[];
const ctx=vm.createContext({window:{},FurnishCabinet:{supported:()=>false},FurnishDesign:D,$:id=>elements[id],document:{querySelectorAll:()=>[]},getF:()=>current,mutate:fn=>{const before=JSON.stringify(current);fn();history.push(before);},toast:e=>errors.push(e),renderPanel:()=>{}});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ctx);ctx.renderPanel=()=>{};ctx.f=current;vm.runInContext('bindFurnPanel(f)',ctx);
elements['#fMountHeight'].onchange({target:{value:'0'}});assert.equal(current.mountHeight,0);
current=JSON.parse(history.pop());assert.equal(current.mountHeight,850);
elements['#fH'].onchange({target:{value:'1000'}});assert.equal(current.h,1000);
for(const value of ['','-1','20001','bad'])elements['#fMountHeight'].onchange({target:{value}});
assert.equal(current.mountHeight,850);current.locked=true;elements['#fH'].onchange({target:{value:'800'}});assert.equal(current.h,1000);
current.locked=false;elements['#fStackHeight'].onchange({target:{value:'35'}});assert.equal(current.stackHeight,35);
for(const value of ['','-1','1001','bad'])elements['#fStackHeight'].onchange({target:{value}});assert.equal(current.stackHeight,35);
elements['#fStackHeight'].onchange({target:{value:'0'}});assert.equal(current.stackHeight,0);current.locked=true;elements['#fStackHeight'].onchange({target:{value:'50'}});assert.equal(current.stackHeight,0);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const roundedSource=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString('utf8').replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(roundedSource).toString('base64'));
 const modelCtx=vm.createContext({THREE,RoundedBoxGeometry,FurnishDesign:D,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o}),screenMat:()=>new THREE.MeshStandardMaterial({color:'#1f6f6a'})});
 vm.runInContext(html.slice(html.indexOf('const asMat ='),html.indexOf('/* ======================= 建筑')),modelCtx);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
 for(const type of ['washer','dryer'])for(const h of [undefined,700,1000])for(const mountHeight of [undefined,0,850])for(const rot of [0,90])for(const flip of [false,true]){
  modelCtx.f={...washer,type,h,mountHeight,rot,flip};const model=vm.runInContext('buildFurniture(f)',modelCtx),bounds=new THREE.Box3().setFromObject(model);
  near(bounds.min.y,(mountHeight??0)/1000);near(bounds.max.y,((mountHeight??0)+(h??850))/1000);
  model.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
 }
 modelCtx.state={furniture:[dryer]};modelCtx.furnG=new THREE.Group();modelCtx.clearGroup=g=>g.clear();modelCtx.opt={furn:true};modelCtx.applyGrow=()=>{};
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildLabels(')),modelCtx);
 vm.runInContext('buildFurn()',modelCtx);const before=modelCtx.furnG.children[0];
 modelCtx.state.furniture=[{...dryer,cx:500}];vm.runInContext('buildFurn()',modelCtx);assert.equal(modelCtx.furnG.children[0],before);near(before.position.y,.85);
 modelCtx.state.furniture=[{...dryer,h:1000,mountHeight:950}];vm.runInContext('buildFurn()',modelCtx);assert.notEqual(modelCtx.furnG.children[0],before);near(new THREE.Box3().setFromObject(modelCtx.furnG.children[0]).max.y,1.95);
 for(const h of [700,900,1000]){
  modelCtx.state.furniture=D.normalizeLaundryStacks([{...washer},{...dryer,h}]);vm.runInContext('buildFurn()',modelCtx);
  const upper=modelCtx.furnG.children.find(o=>o.userData.fid==='dryer'),connector=upper.children.find(o=>o.userData.laundryConnector);
  assert.ok(connector);upper.updateWorldMatrix(true,true);const bound=new THREE.Box3().setFromObject(connector);near(bound.min.y,.85);near(bound.max.y,.87);
  near(new THREE.Box3().setFromObject(upper).max.y,.87+h/1000);
  const old=upper;modelCtx.state.furniture=modelCtx.state.furniture.filter(f=>f.id==='dryer');vm.runInContext('buildFurn()',modelCtx);
  assert.notEqual(modelCtx.furnG.children[0],old);assert.ok(!modelCtx.furnG.children[0].children.some(o=>o.userData.laundryConnector));
 }
 for(const thickness of [0,1,35,1000]){
  modelCtx.state.furniture=D.normalizeLaundryStacks([{...washer},{...dryer,stackHeight:thickness}]);vm.runInContext('buildFurn()',modelCtx);
  const upper=modelCtx.furnG.children.find(o=>o.userData.fid==='dryer'),connector=upper.children.find(o=>o.userData.laundryConnector);upper.updateWorldMatrix(true,true);
  near(upper.position.y,.85+thickness/1000);
  if(thickness===0)assert.equal(connector,undefined);else{const b=new THREE.Box3().setFromObject(connector);near(b.min.y,.85);near(b.max.y,.85+thickness/1000);}
 }
 console.log('PASS laundry stacking, panel editing/lock/undo, persistence/copy/replacement, 3D height/offset/rotation and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
