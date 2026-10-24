const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),W=require('../src/core/work-state.js');
const base={id:'k',type:'counter',name:'厨房',cx:5000,cy:5000,rot:0,color:'#eee'},cfg={version:1,shape:'U',corner:'right',depth:600,counterDepth:630,runDepths:[600,600,383.5],baseHeight:830,thickness:20,autoAvoid:true,modules:[{run:0,width:902.34,role:'door'},{run:0,width:543.66,role:'door'},{run:1,width:800,role:'sink'},{run:2,width:738,role:'door'}],endExtensions:[{run:0,length:550,depth:630,cabinetDepth:220}]};
const make=(shape='U',corner='right',flip=false)=>{const k=structuredClone(cfg);k.shape=shape;k.corner=corner;if(shape!=='U'){delete k.runDepths;k.modules=k.modules.filter(m=>m.run<2);}return K.configure({...base,flip},k);};
const withPanels=(f,panels)=>K.configure(f,{...f.kitchen,modules:f.kitchen.modules.map((m,i)=>i===2?{...m,cornerPartitions:panels}:m)});
const f=make(),old=JSON.stringify(f),plan={id:'p',name:'测试',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[0,0],[20000,0],[20000,20000],[0,20000]]}],walls:[],doors:[],wins:[],slides:[],beams:[],defaults:[],ceilingHeight:2800};
assert.deepEqual(K.partitionRules().sides,['left','right']);assert.deepEqual(K.cornerConnections(f,K.layout(f)[2]).map(o=>o.side).sort(),['left','right']);
assert.equal(K.cornerPartition(f.kitchen.modules[2],'left'),false);assert.equal(K.cornerPartition({role:'drawer'},'left'),true);assert.equal(K.cornerPartition({role:'drawer',cornerPartitions:{left:false}},'left'),false);
for(const bad of [null,[],false,4,'left',{left:1},{right:'false'},{front:true}])assert.throws(()=>withPanels(f,bad),/转角竖向隔板/);
for(const panels of [{left:true},{left:false,right:true},{left:true,right:true}]){
 const changed=withPanels(f,panels);assert.equal(changed.w,f.w);assert.equal(changed.d,f.d);assert.deepEqual(changed.kitchen.endExtensions,f.kitchen.endExtensions);assert.equal(K.cornerBoards(changed).filter(b=>b.shelf).length,2);
 const saved=P.unpack(P.pack({planId:'p',current:{furniture:[changed]},designs:[{name:'隔板',work:{furniture:[changed]}}],catalog:[]}));assert.deepEqual(saved.current.furniture,[changed]);assert.deepEqual(saved.designs[0].work.furniture,[changed]);
 const work={furniture:[changed]},rules=W.create({makeId:()=> 'x',colorFor:()=> '#eee',materials:{tile:{}}});rules.restore(work,plan);const stable=JSON.stringify(work);for(let i=0;i<3;i++)rules.restore(work,plan);assert.equal(JSON.stringify(work),stable);
 const copied=D.pasteFurniture({items:[changed],cx:changed.cx,cy:changed.cy},{x:10000,y:10000},{x:0,y:0,w:20000,h:20000},()=> 'copy').items[0];assert.deepEqual(copied.kitchen.modules[2].cornerPartitions,panels);
 assert.equal(D.replaceFurniture(changed,{type:'chair',w:500,d:500,name:'椅',price:0,color:'#eee'}).kitchen,undefined);
 assert.deepEqual(K.specification(changed).modules[2].cornerPartitions,panels);
 const issue={kind:'wall',id:f.id},key=P.checkFingerprint(issue,plan,[changed],800),priced={...changed,color:'#abcabc',price:123,purchaseStatus:'ordered'};assert.equal(P.checkFingerprint(issue,plan,[priced],800),key);assert.notEqual(P.checkFingerprint(issue,plan,[f],800),key);
 const moved=K.resizeRun(changed,2,K.runLength(changed,2)+100);assert.deepEqual(moved.kitchen.modules[2].cornerPartitions,panels);
 const role=K.configure(changed,{...changed.kitchen,modules:changed.kitchen.modules.map((m,i)=>i===2?{...m,role:'door'}:m)});assert.deepEqual(role.kitchen.modules[2].cornerPartitions,panels);
}
assert.equal(JSON.stringify(f),old);assert(!JSON.stringify(K.configure(f,f.kitchen)).includes('cornerPartitions'),'legacy configure does not write defaults');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishCabinet:C}));for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;},build=(f,options)=>{const g=ctx.FurnishKitchenModel.build(T,f,box,options);g.scale.x=f.flip?-1:1;g.rotation.y=-(f.rot||0)*Math.PI/180;g.updateMatrixWorld(true);return g;};
 function hasPanel(node,side){const sign=side==='left'?-1:1,depth=node.userData.testWidth,origin=new T.Vector3(sign*(depth/2000+.05),.3,0).applyMatrix4(node.matrixWorld),direction=new T.Vector3(-sign,0,0).transformDirection(node.matrixWorld);return new T.Raycaster(origin,direction).intersectObject(node,true).some(hit=>hit.object.userData.cabinetSide===side&&hit.distance<.08);}
 for(const shape of ['L','U'])for(const corner of ['left','right'])for(const flip of [false,true])for(const rot of [0,37,180])for(const left of [false,true])for(const right of [false,true]){
  const src=make(shape,corner,flip);src.rot=rot;const f=withPanels(src,{left,right}),g=build(f),m=K.cabinetLayout(f)[2],node=g.children.find(o=>o.userData.kitchenModule===2);node.userData.testWidth=m.width;
  for(const contact of K.cornerConnections(f,m))assert.equal(hasPanel(node,contact.side),f.kitchen.modules[2].cornerPartitions[contact.side],'real module-side board matches selected local side');
  let shelf=0;g.traverse(o=>{if(o.userData.kitchenCornerShelf)shelf++;});assert.equal(shelf,shape==='U'?2:1);assert(!node.children.some(o=>o.userData.kitchenShelf),'sink has no own shelf');
  for(const row of K.elevationRuns(f)){
   const i=row.indices.indexOf(2);if(i<0)continue;const preview=build(row.furniture,{previewBlind:row.blind,previewMirror:row.mirror}),local=K.cabinetLayout(row.furniture)[i],n=preview.children.find(o=>o.userData.kitchenModule===i);n.userData.testWidth=local.width;
   for(const contact of K.cornerConnections(row.furniture,local,[row.blind].flat())){const side=row.mirror?(contact.side==='left'?'right':'left'):contact.side;assert.equal(hasPanel(n,side),f.kitchen.modules[2].cornerPartitions[side],'unfolded actual board uses the same original local side after mirror');}
  }
 }
 // Actual corner reduction preserves optional boards and independent shelf geometry.
 const fitted=withPanels(make(),{left:true,right:false});fitted.kitchen.obstacleFit={depths:[{index:3,depth:364}],cuts:[],corners:[{index:1,width:600,depth:364}]};const model=build(fitted),n=model.children.find(o=>o.userData.kitchenModule===2);n.userData.testWidth=800;assert(hasPanel(n,'left'));assert(!hasPanel(n,'right'));
 console.log('PASS per-module left/right corner partitions, real retained/open boards and mirrored elevations, independent corner shelves, fitted depth, legacy defaults, validation, role/resize/copy/replacement, signatures and actual project/work restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
