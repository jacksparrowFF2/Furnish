const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
function fixture(){let i=0;const f=K.createLaundryCabinet({id:'basin-joins',cx:2000,cy:2000,color:'#f3f1ec'},()=>`bj${++i}`,'right')[0];
 Object.assign(f,{w:1204,d:620});Object.assign(f.kitchen,{depth:600,counterDepth:620,baseHeight:870});f.kitchen.modules[0].width=564;
 Object.assign(f.kitchen.laundry,{notch:{side:'left',width:170,depth:220},assembly:{sink:{w:420,d:380,module:0,x:0,y:50,sinkNotch:{side:'left',width:100,depth:100}}}});return f;}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:C});
 for(const name of ['solid-cut','cabinet-model','sink-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const flip of [false,true])for(const rot of [0,37,90,270]){
  const f=fixture();Object.assign(f,{flip,rot});K.validate(f);const a=f.kitchen.laundry.assembly.sink;
  const centered=structuredClone(f);centered.kitchen.laundry.assembly.sink.y=0;assert.throws(()=>K.validate(centered),/缺口|缺角/);
  a.y=10;K.validate(f);a.y=9;assert.throws(()=>K.validate(f),/缺口|缺角/);a.y=50;
  for(const depth of [50,200,220,400]){a.sinkBowlHeight=depth;K.validate(f);const sink=K.laundryParts(f)[0].furniture,model=ctx.FurnishSinkModel.buildNotched(T,sink),bounds=new T.Box3().setFromObject(model);assert(Math.abs(bounds.min.y-(.862-depth/1000))<1e-6);assert.equal(R.vertical(sink).bottom,890-depth);}
  a.sinkBowlHeight=49;assert.throws(()=>K.validate(f),/50/);delete a.sinkBowlHeight;
  assert.equal(R.sinkBodyDepth(K.laundryParts(f)[0].furniture),220);
  const legacy=structuredClone(f);a.sinkBowlHeight=260;const sink=K.laundryParts(f)[0].furniture;assert.equal(P.procurement({rooms:[]},{furniture:[sink,{...sink,id:'other',sinkBowlHeight:200}]}).items.length,2);
  assert.equal(legacy.kitchen.laundry.assembly.sink.sinkBowlHeight,undefined);
  let current={furniture:[f]};for(let i=0;i<3;i++)current={furniture:D.restoreFurniture(P.unpack(P.pack({planId:'test',current,designs:[{name:'named',work:current}],catalog:[]})).current.furniture,{makeId:()=> 'unused',colorFor:()=> '#ddd'})};assert.deepEqual(current.furniture[0].kitchen,f.kitchen);
 }
 for(const side of ['left','right']){
  const f=fixture();delete f.kitchen.laundry.assembly;if(side==='right')f.kitchen.modules.reverse();f.kitchen.laundry.notch.side=side;K.validate(f);
  const boards=K.laundryNotchBoards(f);assert.equal(boards.length,2);
  const [horizontal,vertical]=boards;assert(Math.abs(horizontal.y+horizontal.d/2-(vertical.y+vertical.d/2))<1e-8,'return panel reaches the outer corner');
  const model=ctx.FurnishKitchenModel.build(T,f,box),panels=[];model.traverse(o=>{if(o.userData.laundryNotchBoard)panels.push(o);});model.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(vertical.x/1000,2,(horizontal.y)/1000),new T.Vector3(0,-1,0));assert(ray.intersectObjects(panels).length>0,'production mesh fills the former corner gap');
 }
 console.log('PASS laundry basin actual offsets, 420x380, contact/outside, depth geometry/ranges, repeated restore and solid corner joins');
})().catch(e=>{console.error(e);process.exitCode=1;});
