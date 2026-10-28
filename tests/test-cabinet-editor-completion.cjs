const assert=require('node:assert/strict'),K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),fs=require('node:fs'),vm=require('node:vm');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),round=f=>P.unpack(P.pack({planId:'p',current:{furniture:[f]},designs:[{name:'原方案',work:{furniture:[f]}}],catalog:[]})).current.furniture[0],restore=f=>D.restoreFurniture([f],{makeId:()=>'',colorFor:()=>''})[0];
let count=0;const edited=[];
for(const type of ['counter','kitchenwall'])for(const shape of ['straight','L','U'])for(const flip of [false,true]){
 const modules=Array.from({length:shape==='U'?3:shape==='L'?2:1},(_,run)=>({run,width:1000,role:'door'}));if(Object.hasOwn(K.moduleRoles({type}),'open'))modules.push({run:0,width:600,role:'open'});
 const f=K.configure({id:'k',type,cx:3000,cy:3000,rot:37,flip,color:'#f3f1ec'},{version:1,shape,depth:type==='kitchenwall'?350:600,baseHeight:type==='kitchenwall'?700:830,thickness:type==='kitchenwall'?0:20,modules}),before=structuredClone(f);
 for(let column=0;column<f.kitchen.modules.length;column++){
  const gap=K.moduleShelfClearances(f,column,0);
  for(const side of ['upper','lower'])for(const value of [gap[side].min,gap[side].max,(gap[side].min+gap[side].max)/2+.125]){
   const next=K.editModuleShelfClearance(f,column,0,side,value);near(K.moduleShelfClearances(next,column,0)[side].height,value);assert.equal(next.w,f.w);assert.equal(next.d,f.d);assert.equal(next.kitchen.baseHeight,f.kitchen.baseHeight);for(let i=0;i<f.kitchen.modules.length;i++)if(i!==column)assert.deepEqual(next.kitchen.modules[i],f.kitchen.modules[i]);assert.deepEqual(round(next),next);assert.deepEqual(restore(restore(next)),restore(next));assert.deepEqual(K.openingZones(next),K.openingZones(f));if(edited.length<4&&side==='upper')edited.push({f:next,column});count++;
  }
  for(const side of ['upper','lower']){assert.throws(()=>K.editModuleShelfClearance(f,column,0,side,gap[side].min-.01));assert.throws(()=>K.editModuleShelfClearance(f,column,0,side,gap[side].max+.01));}
 }
 const next=K.setModuleDoorAngle(f,0,1,37);assert.equal(K.moduleLeafAngle(next,next.kitchen.modules[0],1),37);assert.equal(K.moduleLeafAngle(next,next.kitchen.modules[0],0),0);assert.deepEqual(round(next),next);assert.deepEqual(K.specification(next),K.specification(f));assert.throws(()=>K.setModuleDoorAngle(f,0,1,181));assert.deepEqual(f,before,'default structures stay implicit');
 const end=K.configure(f,{...f.kitchen,endExtensions:[{run:0,length:200,depth:K.runCounterDepth(f,0),cabinetDepth:K.runDepth(f,0)}]}),endEdit=K.setModuleDoorAngle(end,end.kitchen.modules.length,0,25);assert.equal(endEdit.kitchen.endExtensions[0].doorLeaves[0].angle,25);assert.deepEqual(round(endEdit),endEdit);
}
const sample=edited[0].f,copy=D.pasteFurniture({items:[sample],cx:sample.cx,cy:sample.cy},{x:10000,y:10000},{x:0,y:0,w:30000,h:30000},()=> 'copy').items[0];assert.deepEqual(copy.kitchen,sample.kitchen);
const named=P.unpack(P.pack({planId:'p',current:{furniture:[sample]},designs:[{name:'净高',work:{furniture:[sample]}}],catalog:[]}));assert.deepEqual(named.designs[0].work.furniture[0].kitchen,sample.kitchen);
const changed=structuredClone(sample.kitchen);changed.modules[0].role='empty';assert.equal(K.configure(sample,changed).kitchen.modules[0].shelves,undefined,'role replacement clears unsupported shelf overrides');assert.equal(D.replaceFurniture(sample,{type:'chair',name:'椅',w:500,d:500,color:'#eee',price:0}).kitchen,undefined);
const locked={...edited[0].f,locked:true};assert.throws(()=>K.editModuleShelfClearance(locked,0,0,'upper',100));assert.throws(()=>K.setModuleDoorAngle(locked,0,0,20));
console.log(`PASS ${count} kitchen shelf edits: floor/wall modules, straight/L/U, mirror/rotation, limits, unchanged neighbors, implicit defaults, per-leaf/end doors and project recovery`);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishCabinet:C,FurnishKitchen:K,FurnishPartIdentity:require('../src/core/part-identity.js')});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const {f,column} of edited){const layout=K.cabinetLayout(f).find(m=>m.index===column),part=K.moduleFurniture(f,layout),gap=K.moduleShelfClearances(f,column,0),model=ctx.FurnishCabinetModel.build(T,part,box);model.updateMatrixWorld(true);let shelf;model.traverse(o=>{if(o.isMesh&&o.userData.cabinetShelf?.shelf===0)shelf=o;});assert(shelf);const bounds=new T.Box3().setFromObject(shelf);near(bounds.min.y*1000,part.cabinet.plinth+part.cabinet.thickness+gap.position);near(bounds.max.y*1000,bounds.min.y*1000+gap.thickness);}
 console.log('PASS edited kitchen shelf elevations match production board faces');
})().catch(e=>{console.error(e);process.exitCode=1;});
