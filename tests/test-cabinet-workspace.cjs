const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),round=f=>P.unpack(P.pack({planId:'p',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];
let checks=0;
for(const type of ['wardrobe','book','sideboard-open','sideboard-fridge']){
 const f=C.upgradeDesign({id:'cab',type:type.startsWith('sideboard')?'cabinet':type==='book'?'bookshelf':type,cx:3000,cy:3000,rot:37,flip:true,...C.preset(type)}),before=structuredClone(f),index=f.cabinet.columns.findIndex(c=>!c.fridgeBay),n=f.cabinet.columns.length;
 for(const grow of [true,false])for(const operation of ['add','copy','delete','move']){
  if(operation==='delete'&&n===1||operation==='move'&&n<2)continue;
  const at=operation==='move'?index:index+1,result=C.editModules(f,operation,index,{at,width:400,grow}),next=result.furniture;
  assert.deepEqual(f,before,'operation is immutable');near(C.moduleWidths(next).reduce((a,b)=>a+b,0),next.w);assert.deepEqual(round(next),next);
  for(const [old,i] of result.remap){const {width:a,...actual}=next.cabinet.columns[i],{width:b,...expected}=f.cabinet.columns[old];assert.deepEqual(actual,expected,'retained interior settings stay with module');}
  if(!grow||operation==='move')near(next.w,f.w);if(grow&&operation==='add')near(next.w,f.w+400);
  checks++;
 }
 assert.throws(()=>C.editModules({...f,locked:true},'add',index));
}
const fridge={id:'f',type:'cabinet',cx:1000,cy:1000,rot:90,flip:true,...C.preset('sideboard-fridge')},board=C.structuralBoards(fridge).find(b=>b.section==='fridgeCeiling'),edited=C.editStructuralBoard(fridge,board.section,'upper',board.upper+31.125);
near(edited.cabinet.sideboard.fridgeHeight,board.position-31.125);near(edited.h,fridge.h);assert.deepEqual(round(edited),edited);assert.deepEqual(D.restoreFurniture(D.restoreFurniture([edited],{makeId:()=>'',colorFor:()=>''}),{makeId:()=>'',colorFor:()=>''}),D.restoreFurniture([edited],{makeId:()=>'',colorFor:()=>''}));
for(const value of [board.min,board.max])near(C.editStructuralBoard(fridge,board.section,'position',value).cabinet.sideboard.fridgeHeight,value);
assert.throws(()=>C.editStructuralBoard(fridge,board.section,'position',board.min-.01));assert.throws(()=>C.editStructuralBoard(fridge,board.section,'position',board.max+.01));
assert.throws(()=>C.editModules(fridge,'copy',0));assert.throws(()=>C.editModules(fridge,'move',0,{at:1}));
for(const row of C.structuralBoards(fridge))for(const side of row.section==='counter'?['position']:['lower','upper','position']){
 const value=(side==='position'?row.position:row[side])+10.125,next=C.editStructuralBoard(fridge,row.section,side,value),actual=C.structuralBoards(next).find(b=>b.section===row.section);
 near(side==='position'?actual.position:actual[side],value);near(next.h,fridge.h);
 if(row.section==='displayBottom')near(C.structuralBoards(next).find(b=>b.section==='displayTop').position,C.structuralBoards(fridge).find(b=>b.section==='displayTop').position);
}
for(const type of ['counter','kitchenwall'])for(const shape of ['straight','L','U'])for(const grow of [true,false]){
 const modules=Array.from({length:shape==='U'?3:shape==='L'?2:1},(_,run)=>({run,width:800,role:'door'}));modules.splice(1,0,{run:0,width:800,role:'door',shelves:[150]});
 const f=K.configure({id:'k',type,cx:3000,cy:3000,rot:43,flip:true},{version:1,shape,depth:type==='kitchenwall'?350:600,baseHeight:type==='kitchenwall'?700:830,thickness:type==='kitchenwall'?0:20,modules}),before=structuredClone(f);
 for(const operation of ['add','copy','delete','move']){
  const result=K.editModules(f,operation,0,{at:1,width:400,grow}),next=result.furniture;assert.deepEqual(f,before);assert.deepEqual(round(next),next);
  if(!grow||operation==='move')near(K.runLength(next,0),K.runLength(f,0));
  for(const [old,i] of result.remap){assert.equal(next.kitchen.modules[i].run,f.kitchen.modules[old].run);if(operation==='move')assert.deepEqual(next.kitchen.modules[i],f.kitchen.modules[old]);}
  if(operation==='move'){const device={counterLink:{hostId:f.id,module:1}},remapped=result.remap.get(device.counterLink.module);assert.equal(remapped,0);assert.deepEqual(next.kitchen.modules[remapped].shelves,[150],'linked module retains its original internal structure');}
  checks++;
 }
 if(shape!=='straight')assert.throws(()=>K.editModules(f,'move',0,{at:2}));
}
console.log(`PASS ${checks} module edits: grow/fixed totals, order, interiors, run index maps, immutable input and project round trips`);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishCabinet:C,FurnishKitchen:K,FurnishPartIdentity:require('../src/core/part-identity.js')});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const model=ctx.FurnishCabinetModel.build(T,edited,box);let mesh;model.traverse(o=>{if(o.userData.cabinetInspect?.section==='fridgeCeiling')mesh=o;});assert.equal(mesh.userData.cabinetInspect.kind,'structure');model.updateMatrixWorld(true);near(new T.Box3().setFromObject(mesh).min.y*1000,edited.cabinet.sideboard.fridgeHeight);near(new T.Box3().setFromObject(mesh).max.y*1000,edited.cabinet.sideboard.fridgeHeight+edited.cabinet.thickness);
 console.log('PASS structural board limits, project restore and actual production faces match inspector control');
})().catch(e=>{console.error(e);process.exitCode=1;});
