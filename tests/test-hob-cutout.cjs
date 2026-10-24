const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../src/core/product-rules.js'),K=require('../src/core/kitchen-core.js'),S=require('../src/core/snapping.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),hob={id:'hob',type:'stove_fotile_th36b',name:'燃气灶',w:750,d:440,h:138,cx:2000,cy:2000,rot:0,color:'#111',counterElevation:860};
assert.equal(R.initial(hob).hobCutout,undefined);assert.equal(R.migrate(hob).hobCutout,undefined);assert.deepEqual(K.cutout(hob),{w:660,d:350});
const custom=R.editHobCutout(R.editHobCutout(hob,'w',620),'d',320);
custom.id='custom';
assert.deepEqual(custom.hobCutout,{w:620,d:320});assert.deepEqual(K.cutout(custom),custom.hobCutout);assert.equal(hob.hobCutout,undefined);
for(const value of [null,[],1,{x:5},{w:'620'},{w:0},{d:.999},{w:750.001},{d:440.001},{w:NaN},{d:Infinity},{d:20001}])assert.throws(()=>R.validate({...hob,hobCutout:value}));
for(const value of [{w:1,d:1},{w:750,d:440},{w:749.999,d:439.999},{}])R.validate({...hob,hobCutout:value});
assert.throws(()=>R.validate({...hob,type:'chair',hobCutout:{w:10}}));assert.throws(()=>R.validate({...hob,obj:{},hobCutout:{w:10}}));assert.throws(()=>R.editHobCutout({...hob,locked:true},'w',600));
const partial={...R.editHobCutout(hob,'w',620),id:'partial'};assert.deepEqual(K.cutout(partial),{w:620,d:350});
const bigger=D.resizeFurniture(custom,{w:900,d:600});assert.deepEqual(bigger.hobCutout,custom.hobCutout);assert.deepEqual(K.cutout(bigger),{w:620,d:320});
assert.throws(()=>D.resizeFurniture(custom,{w:619.999}));assert.throws(()=>D.resizeFurniture(custom,{d:319.999}));R.validate(D.resizeFurniture(custom,{w:620,d:320}));
const legacy={...custom,type:'stove',id:'legacy'};assert.deepEqual(K.cutout(legacy),{w:620,d:320});assert.deepEqual(K.cutout({...hob,type:'stove'}),{w:720,d:410});
const chair=D.replaceFurniture(custom,{type:'chair',name:'椅子',w:400,d:400,color:'#aaa',price:0});assert.equal(chair.hobCutout,undefined,'cross-type cleanup precedes replacement sizing');
assert.equal(D.replaceFurniture(custom,{type:'stove',name:'另一款灶',w:500,d:400,color:'#aaa',price:0}).hobCutout,undefined);
assert.deepEqual(D.replaceFurniture(custom,{...hob,price:0}).hobCutout,custom.hobCutout);assert.throws(()=>D.replaceFurniture(custom,{...hob,w:619,price:0}));
const copy=D.pasteFurniture({items:[custom],cx:2000,cy:2000},{x:3000,y:3000},{x:0,y:0,w:6000,h:6000},()=> 'copy').items[0];copy.hobCutout.w=600;assert.equal(custom.hobCutout.w,620);
const payload={planId:'hob',current:{furniture:[hob,custom,legacy,partial]},designs:[{name:'开孔',work:{furniture:[custom]}}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)),payload);
let restored=payload.current.furniture;for(let i=0;i<4;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#111'});assert.deepEqual(restored,payload.current.furniture);
const bad=structuredClone(payload);bad.designs[0].work.furniture[0].hobCutout.w=751;assert.throws(()=>P.unpack(P.pack(bad)));
const plan={rooms:[],walls:[],doors:[]},issue={kind:'test'},key=P.checkFingerprint(issue,plan,[custom],800);
assert.notEqual(key,P.checkFingerprint(issue,plan,[R.editHobCutout(custom,'w',621)],800));assert.equal(key,P.checkFingerprint(issue,plan,[{...custom,color:'#fff',price:500,purchaseStatus:'ordered'}],800));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const context=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/kitchen-model.js'),'utf8'),context);const Model=context.FurnishKitchenModel;
 for(const shape of ['straight','L','U'])for(const rot of [0,37,90])for(const flip of [false,true]){
  const h=K.configure({id:'top',type:'counter',cx:2000,cy:2000,w:2400,d:1800,rot,flip,color:'#ddd'},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},...(shape!=='straight'?[{run:1,width:1000,role:'door'}]:[]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]});
  const f=K.attach(custom,h,0),items=[h,f];K.normalize(items);R.validate(f);
  const o=S.hobOpening(f,{furniture:items});for(const [dir,n] of Object.entries({l:290,r:290,t:140,b:140}))near(o.gaps[dir].distance,n);
  const defaultDevice={...f};delete defaultDevice.hobCutout;assert.notDeepEqual(K.deviceSignature(h,items),K.deviceSignature(h,[h,defaultDevice]),'host mesh cache includes modified production opening');
  const model=Model.countertop(T,h,new T.MeshBasicMaterial({color:'#ddd'}),items);model.position.set(h.cx/1000,0,h.cy/1000);model.rotation.y=-rot*Math.PI/180;model.scale.x=flip?-1:1;model.updateMatrixWorld(true);
  const slabAt=(x,z)=>{const [wx,wz]=K.world(f,x,z);return new T.Raycaster(new T.Vector3(wx/1000,2,wz/1000),new T.Vector3(0,-1,0)).intersectObject(model,true).length>0;};
  for(const [x,z,hit] of [[0,0,false],[309,0,false],[311,0,true],[0,159,false],[0,161,true]])assert.equal(slabAt(x,z),hit,'production slab matches custom hole after transform');
  const rings=K.deviceOpenings(h,items)[0].ring;for(let i=0;i<rings.length;i++){const p=K.world(h,...rings[i]);near(p[0],o.ring[i][0]);near(p[1],o.ring[i][1]);}
  model.traverse(m=>{if(m.isMesh){for(const a of [m.geometry.attributes.position,m.geometry.attributes.normal])for(const n of a.array)assert(Number.isFinite(n));m.geometry.dispose();m.material.dispose();}});
 }
 console.log('PASS editable hob cutouts: absolute dimensions, bounds, defaults, panel sizing, copy/replacement, current/named project validation, restoration, review/cache invalidation and transformed production slab rays');
})().catch(e=>{console.error(e);process.exitCode=1;});
