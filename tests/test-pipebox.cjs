const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/service-core.js');
const entry=require('../src/data/catalog.js').library.find(c=>c.cat==='柜体').items.find(i=>i[0]==='pipebox');
const f={id:'cover',type:'pipebox',name:entry[1],w:entry[2],d:entry[3],h:entry[6],cx:0,cy:0,rot:0,color:entry[4],...R.initial({type:'pipebox'})};
assert.equal(f.pipeBoxThickness,18);assert.equal(f.mountHeight,0);assert.equal(R.pipeBoxPanels(f).length,3);
assert.equal(R.pipeBoxPanels({...f,type:'chair'}),null);
for(const bad of [0,101,NaN,Infinity,null,'18'])assert.throws(()=>P.validateWork({furniture:[{...f,pipeBoxThickness:bad}]}));
for(const bad of [-1,20001,null,'0'])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight:bad}]}));
for(const t of [1,100])R.validate({...f,w:500,d:200,pipeBoxThickness:t});
for(const dims of [{w:200,d:300},{w:400,d:100}])assert.throws(()=>R.validate({...f,...dims,pipeBoxThickness:100}));
R.validate({...f,w:200.1,d:100.1,pipeBoxThickness:100});
assert.throws(()=>R.validate({...f,cabinet:{}}));assert.throws(()=>R.validate({...f,kitchen:{}}));
assert.throws(()=>R.validate({...f,type:'chair'}));
const thick={...f,pipeBoxThickness:40,mountHeight:750,rot:37,flip:true};
const before=JSON.stringify(thick);assert.throws(()=>D.resizeFurniture(thick,{w:80}));assert.equal(JSON.stringify(thick),before);
const resized=D.resizeFurniture(thick,{w:600,d:400,h:900});assert.equal(resized.pipeBoxThickness,40);assert.equal(resized.mountHeight,750);
assert.throws(()=>D.resizeFurniture({...thick,locked:true},{h:500}));
assert.deepEqual(D.furnitureVerticalBounds(thick),{bottom:750,top:3150,source:'recorded'});
const saved=P.unpack(P.pack({planId:'test',current:{furniture:[thick]},designs:[{id:'named',name:'包管柜',work:{furniture:[thick]}}],catalog:[]}));
assert.deepEqual(saved.current.furniture,[thick]);assert.deepEqual(saved.designs[0].work.furniture,[thick]);
let list=[thick];for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#eeeeee'});assert.deepEqual(list,[thick]);
const legacy={...f};delete legacy.pipeBoxShape;delete legacy.pipeBoxThickness;delete legacy.mountHeight;delete legacy.h;
assert.deepEqual(D.restoreFurniture([legacy],{makeId:()=> 'new',colorFor:()=> '#eeeeee'}),[legacy]);assert.equal(R.pipeBoxPanels(legacy)[0].h,2400);
const copied=D.pasteFurniture({items:[thick],cx:0,cy:0},{x:1000,y:1000},{x:-3000,y:-3000,w:6000,h:6000},()=> 'copy').items[0];assert.equal(copied.pipeBoxThickness,40);assert.equal(copied.mountHeight,750);
const candidate={type:'pipebox',name:f.name,w:400,d:300,h:2400,color:f.color,price:0};
const fromChair=D.replaceFurniture({...f,type:'chair',pipeBoxThickness:undefined,mountHeight:undefined},candidate);assert.equal(fromChair.mountHeight,0);assert.equal(fromChair.pipeBoxThickness,18);
assert.equal(D.replaceFurniture(thick,candidate).pipeBoxThickness,40);assert.equal(D.replaceFurniture(thick,candidate).mountHeight,750);
const chair=D.replaceFurniture(thick,{...candidate,type:'chair'});assert.equal(chair.pipeBoxThickness,undefined);assert.equal(chair.mountHeight,undefined);
const obstacle={...f,id:'inside',type:'custom',w:100,d:100,h:200,pipeBoxShape:undefined,pipeBoxThickness:undefined,mountHeight:undefined};
const plan={rooms:[],walls:[],doors:[],wins:[],slides:[],markers:[],beams:[],bounds:{x:-3000,y:-3000,w:6000,h:6000}};
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const cover={...f,rot,flip,mountHeight:50},a=rot*Math.PI/180,point=(x,z)=>{x*=flip?-1:1;return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];};
 const inner={...obstacle,rot};assert.equal(G.collisions([cover,inner]).length,0);
 const [cx,cy]=point(190,0),hit={...inner,cx,cy};assert.equal(G.collisions([cover,hit]).length,1);
 assert(!P.spaceCheck(plan,[cover,inner],{scanPassages:false}).some(i=>i.kind==='overlap'));
 assert(P.spaceCheck(plan,[cover,hit],{scanPassages:false}).some(i=>i.kind==='overlap'));
 assert(!S.bodyHit(cover,{at:point(0,0),radius:50}));assert(S.bodyHit(cover,{at:point(190,0),radius:20}));
 assert(!S.bodyHit(cover,{at:point(0,-180),radius:20}));assert(S.bodyHit(cover,{at:point(0,145),radius:20}));
 assert(!G.volumeOverlap({...cover,mountHeight:200},inner));
}
const pipePlan={...plan,markers:[{id:'pipe',kind:'drain',name:'竖管',at:[0,0],diameter:100}]};
assert(!P.spaceCheck(pipePlan,[f],{scanPassages:false}).some(i=>i.kind==='pipe'));
const svg=require('../src/render/furniture-svg.js').render(f.type,f.w,f.d,f.color,{ink:'#333'},f);assert.equal((svg.match(/<rect/g)||[]).length,3);assert(!/NaN|undefined/.test(svg));
assert.equal(P.procurement(plan,{furniture:[f,{...f,id:'thick',pipeBoxThickness:20}]}).items.length,2);
assert.equal(P.procurement(plan,{furniture:[f,{...legacy,h:f.h,id:'legacy'}]}).items.length,1);
assert.notEqual(P.checkFingerprint({kind:'pipe'},plan,[f],800),P.checkFingerprint({kind:'pipe'},plan,[{...f,pipeBoxThickness:20}],800));
// Shape is a persistent product capability; old records keep their exact saved structure.
assert.equal(R.value(legacy,'pipeBoxShape'),'three');assert.equal(f.pipeBoxShape,'three');
for(const bad of ['L','',4,null,{},['two']])assert.throws(()=>P.validateWork({furniture:[{...f,pipeBoxShape:bad}]}));
for(const shape of R.fields.pipeBoxShape.values){
 const cover={...thick,pipeBoxShape:shape};
 const packed=P.unpack(P.pack({planId:'test',current:{furniture:[cover]},designs:[{id:'shape',name:shape,work:{furniture:[cover]}}],catalog:[]}));
 assert.deepEqual(packed.current.furniture,[cover]);assert.deepEqual(packed.designs[0].work.furniture,[cover]);
 let restored=[cover];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[cover]);
 assert.equal(D.pasteFurniture({items:[cover],cx:0,cy:0},{x:1000,y:1000},plan.bounds,()=> 'copy').items[0].pipeBoxShape,shape);
 assert.equal(D.replaceFurniture(cover,candidate).pipeBoxShape,shape);assert.equal(D.replaceFurniture(cover,{...candidate,type:'chair'}).pipeBoxShape,undefined);
 const svg=require('../src/render/furniture-svg.js').render(f.type,f.w,f.d,f.color,{ink:'#333'},{...f,pipeBoxShape:shape});assert.equal((svg.match(/<rect/g)||[]).length,{four:4,three:3,two:2}[shape]);
 const minW=shape==='two'?100:200,minD=shape==='four'?200:100;
 for(const dims of [{w:minW,d:300},{w:minW-.1,d:300},{w:300,d:minD},{w:300,d:minD-.1}])assert.throws(()=>R.validate({...f,...dims,pipeBoxShape:shape,pipeBoxThickness:100}));
 R.validate({...f,w:minW+.1,d:minD+.1,pipeBoxShape:shape,pipeBoxThickness:100});
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const c={...f,pipeBoxShape:shape,rot,flip},a=rot*Math.PI/180,point=(x,z)=>{x*=flip?-1:1;return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];};
  for(const [x,z,solid] of [[0,0,false],[-195,0,true],[195,0,shape!=='two'],[0,-145,shape==='four'],[0,145,true]]){
   const at=point(x,z),o={...obstacle,w:10,d:10,rot,cx:at[0],cy:at[1]};
   assert.equal(S.bodyHit(c,{at,radius:10}),solid,`${shape} pipe at ${x},${z}`);
   assert.equal(G.volumeOverlap(c,o),solid,`${shape} body at ${x},${z}`);
  }
 }
 assert.equal(P.checkFingerprint({kind:'pipe'},plan,[cover],800),P.checkFingerprint({kind:'pipe'},plan,[{...cover,color:'#123456',price:123,purchaseStatus:'ordered'}],800));
}
assert.equal(P.procurement(plan,{furniture:R.fields.pipeBoxShape.values.map((shape,i)=>({...f,id:String(i),pipeBoxShape:shape}))}).items.length,3);
assert.notEqual(P.checkFingerprint({kind:'pipe'},plan,[f],800),P.checkFingerprint({kind:'pipe'},plan,[{...f,pipeBoxShape:'two'}],800));
assert.throws(()=>R.validateField({...f,w:150,pipeBoxThickness:100,pipeBoxShape:'two'},'pipeBoxShape','three'));
const directions=[
 ...['back','front','left','right'].map(open=>({pipeBoxShape:'three',pipeBoxOpenSide:open,expected:['left','right','front','back'].filter(k=>k!==open)})),
 ...['front-left','front-right','back-left','back-right'].map(corner=>({pipeBoxShape:'two',pipeBoxCorner:corner,expected:['left','right','front','back'].filter(k=>corner.split('-').includes(k))}))
];
for(const key of ['pipeBoxOpenSide','pipeBoxCorner'])for(const bad of [null,1,'',{},'front-back'])assert.throws(()=>P.validateWork({furniture:[{...f,[key]:bad}]}));
for(const {expected,...config} of directions){
 const cover={...thick,...config};assert.deepEqual(R.pipeBoxSides(cover),expected);assert.deepEqual(R.pipeBoxPanels(cover).map(b=>b.key),expected);
 const minW=expected.filter(k=>['left','right'].includes(k)).length*100,minD=expected.filter(k=>['front','back'].includes(k)).length*100;
 for(const dims of [{w:minW,d:300},{w:minW-.1,d:300},{w:300,d:minD},{w:300,d:minD-.1}])assert.throws(()=>R.validate({...cover,...dims,pipeBoxThickness:100}));
 R.validate({...cover,w:minW+.1,d:minD+.1,pipeBoxThickness:100});
 const svg=require('../src/render/furniture-svg.js').render(cover.type,cover.w,cover.d,cover.color,{ink:'#333'},cover);assert.equal((svg.match(/<rect/g)||[]).length,expected.length);
 const packed=P.unpack(P.pack({planId:'test',current:{furniture:[cover]},designs:[{id:'direction',name:'方向',work:{furniture:[cover]}}],catalog:[]}));assert.deepEqual(packed.current.furniture,[cover]);assert.deepEqual(packed.designs[0].work.furniture,[cover]);
 let restored=[cover];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[cover]);
 const pasted=D.pasteFurniture({items:[cover],cx:0,cy:0},{x:1000,y:1000},plan.bounds,()=> 'copy').items[0],replaced=D.replaceFurniture(cover,candidate),chair=D.replaceFurniture(cover,{...candidate,type:'chair'});
 for(const key of ['pipeBoxOpenSide','pipeBoxCorner']){assert.equal(pasted[key],cover[key]);assert.equal(replaced[key],cover[key]);assert.equal(chair[key],undefined);}
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const c={...f,...config,rot,flip},a=rot*Math.PI/180,point=(x,z)=>{x*=flip?-1:1;return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];};
  for(const [side,x,z] of [['left',-195,0],['right',195,0],['front',0,145],['back',0,-145]]){
   const at=point(x,z),o={...obstacle,w:10,d:10,rot,cx:at[0],cy:at[1]},solid=expected.includes(side);
   assert.equal(S.bodyHit(c,{at,radius:10}),solid);assert.equal(G.volumeOverlap(c,o),solid);assert.equal(P.spaceCheck(plan,[c,o],{scanPassages:false}).some(i=>i.kind==='overlap'),solid);
  }
 }
}
for(const shape of ['three','two']){
 const records=directions.filter(c=>c.pipeBoxShape===shape).map(({expected,...config},i)=>({...f,...config,id:String(i)}));assert.equal(P.procurement(plan,{furniture:records}).items.length,4);
 assert.equal(new Set(records.map(c=>P.checkFingerprint({kind:'pipe'},plan,[{...c,id:f.id}],800))).size,4);
}
assert.equal(P.checkFingerprint({kind:'pipe'},plan,[f],800),P.checkFingerprint({kind:'pipe'},plan,[{...f,pipeBoxCorner:'back-right'}],800));
assert.equal(P.procurement(plan,{furniture:[f,{...f,id:'explicit',pipeBoxOpenSide:'back'}]}).items.length,1);
assert.deepEqual(R.pipeBoxPanels({...f,pipeBoxShape:'two'}),R.pipeBoxPanels({...f,pipeBoxShape:'two',pipeBoxCorner:'front-left'}));
assert.doesNotThrow(()=>P.review(plan,{furniture:[{...f,pipeBoxOpenSide:'invalid'}]}));assert.doesNotThrow(()=>P.procurement(plan,{furniture:[{...f,pipeBoxCorner:'invalid'}]}));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=require("./helpers/layer-context.cjs").createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,RoundedBoxGeometry:undefined,mat:undefined,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')}));
 ctx.FurnishArmchairModel=require('../src/render/armchair-model.js');
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const shape of R.fields.pipeBoxShape.values)for(const dims of [[400,300,2400,18],[600,400,500,40],[50,50,10,1]])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  ctx.f={...f,pipeBoxShape:shape,w:dims[0],d:dims[1],h:dims[2],pipeBoxThickness:dims[3],mountHeight:750,rot,flip};const o=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(o),size=bounds.getSize(new THREE.Vector3()),a=rot*Math.PI/180;
  const points=R.pipeBoxPanels(ctx.f).flatMap(b=>[-1,1].flatMap(sx=>[-1,1].map(sz=>{const x=(b.x+sx*b.w/2)*(flip?-1:1),z=b.z+sz*b.d/2;return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];})));
  near(size.x,(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))/1000);near(size.z,(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])))/1000);near(size.y,dims[2]/1000);near(bounds.min.y,.75);
  const meshes=[];o.traverse(v=>{if(v.isMesh){meshes.push(v);for(const k of ['position','normal'])assert(v.geometry.attributes[k].array.every(Number.isFinite));}});assert.equal(meshes.length,{four:4,three:3,two:2}[shape]);assert.deepEqual(meshes.map(m=>m.userData.pipeBoxPanel),shape==='two'?['left','front']:shape==='four'?['left','right','front','back']:['left','right','front']);
 }
 ctx.f={...f,mountHeight:750};const model=vm.runInContext('buildFurniture(f)',ctx);model.updateMatrixWorld(true);
 const hits=(origin,direction)=>new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(model,true);
 assert.equal(hits([0,4,0],[0,-1,0]).length,0);assert.equal(hits([0,.5,0],[0,1,0]).length,0);
 const front=hits([0,1,-.4],[0,0,1]);assert(front.length);assert(front.every(hit=>hit.object.userData.pipeBoxPanel==='front'));
 for(const shape of R.fields.pipeBoxShape.values){ctx.f={...f,pipeBoxShape:shape,mountHeight:750};const o=vm.runInContext('buildFurniture(f)',ctx);o.updateMatrixWorld(true);const ray=dir=>new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(...dir)).intersectObject(o,true);assert.equal(ray([0,1,0]).length,0);assert.equal(ray([0,-1,0]).length,0);assert(ray([-1,0,0]).length);assert(ray([0,0,1]).length);assert.equal(ray([1,0,0]).length>0,shape!=='two');assert.equal(ray([0,0,-1]).length>0,shape==='four');}
 for(const {expected,...config} of directions)for(const rot of [0,37,90])for(const flip of [false,true]){
  ctx.f={...f,...config,rot,flip,mountHeight:750};const o=vm.runInContext('buildFurniture(f)',ctx);o.updateMatrixWorld(true);const a=rot*Math.PI/180;
  const ray=(x,z)=>new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(x*(flip?-1:1)*Math.cos(a)-z*Math.sin(a),0,x*(flip?-1:1)*Math.sin(a)+z*Math.cos(a))).intersectObject(o,true);
  for(const [key,x,z] of [['left',-1,0],['right',1,0],['front',0,1],['back',0,-1]]){const hits=ray(x,z);assert.equal(hits.length>0,expected.includes(key),JSON.stringify(config)+' '+key);assert(hits.every(h=>h.object.userData.pipeBoxPanel===key));}
  const meshes=[];o.traverse(m=>{if(m.isMesh)meshes.push(m);});assert.equal(meshes.length,expected.length);
 }
 ctx.state={furniture:[{...f,mountHeight:750}]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=R.modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 vm.runInContext('buildFurn()',ctx);const original=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],original);
 ctx.state.furniture[0].pipeBoxThickness=30;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],original);
 for(const shape of ['four','two','three']){const previous=ctx.furnG.children[0];ctx.state.furniture[0].pipeBoxShape=shape;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],previous);assert.equal(ctx.furnG.children[0].children.filter(m=>m.isMesh).length,{four:4,three:3,two:2}[shape]);}
 for(const side of ['front','left','right','back']){const previous=ctx.furnG.children[0];ctx.state.furniture[0].pipeBoxOpenSide=side;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],previous);assert(!ctx.furnG.children[0].children.some(m=>m.userData.pipeBoxPanel===side));}
 ctx.state.furniture[0].pipeBoxShape='two';for(const corner of ['front-right','back-left','back-right','front-left']){const previous=ctx.furnG.children[0];ctx.state.furniture[0].pipeBoxCorner=corner;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],previous);assert.deepEqual(ctx.furnG.children[0].children.filter(m=>m.isMesh).map(m=>m.userData.pipeBoxPanel).sort(),corner.split('-').sort());}
 ctx.state.furniture[0].mountHeight=0;vm.runInContext('buildFurn()',ctx);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,0);
 console.log('PASS pipe enclosure dimensions, four/three/two production boards/openings, collision cavity, rotation/mirror, persistence, replacement and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
