const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const wall=C.configureHoodBay({...C.preset('wall'),id:'wall',name:'吊柜',type:'kitchenwall',w:970,d:368,cx:3000,cy:3000,rot:0,mountHeight:1660,color:'#eee'},450,175);wall.cabinet.hoodBayCeiling=false;
const hood={id:'hood',name:'烟机',type:'rangehood_fotile_jcd10ta',w:900,d:368,h:523,cx:3000,cy:3000,rot:0,mountHeight:1315,hoodGeometry:{coverWidth:400,coverDepth:320},color:'#111'};
const fit=C.hoodBayFit(wall,hood);assert(!fit.fits);assert.equal(fit.reasons.length,1);assert.match(fit.reasons[0],/高出柜底 1\.99 mm/);
const aligned=C.centerHoodInBay(wall,hood,true);close(aligned.mountHeight,1313.0096153846152);assert(C.hoodBayFit(wall,aligned).fits);
const cases=[];
for(const modular of [false,true])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const host={...(modular?K.fromWall(wall):structuredClone(wall)),rot,flip},before=JSON.stringify(host),device=C.centerHoodInBay(host,hood,true);assert(C.hoodBayFit(host,device).fits);assert.deepEqual(G.collisions([host,device]),[]);
 const snapshot={planId:'p',current:{furniture:[host,device]},designs:[{name:'齐平',work:{furniture:[host,device]}}],catalog:[]},restored=P.unpack(P.pack(snapshot));assert.deepEqual(restored,snapshot);let list=restored.current.furniture;for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(list,[host,device]);assert(C.hoodBayFit(list[0],list[1]).fits);assert.equal(JSON.stringify(host),before);
}
function section(coverHeight){return {...hood,h:345+coverHeight,hoodGeometry:{bodyHeight:345,coverWidth:400,coverDepth:320}};}
for(const kind of ['ceiling','back','top','shelf']){
 const host=structuredClone(wall);if(kind==='ceiling')host.cabinet.hoodBayCeiling=true;if(kind==='top'||kind==='shelf')host.cabinet.backPanel=false;if(kind==='shelf')host.cabinet.columns[1].shelves=[250];
 const limit={ceiling:175,back:193,top:682,shelf:268}[kind];
 for(const delta of [-.001,0,.001]){const device=section(limit+delta),result=C.hoodBayFit(host,device);assert.equal(result.fits,delta<=0,kind+' actual board threshold');cases.push({host,device,fits:result.fits});}
}
// Moving the cover's back face into contact with the back panel's front face
// removes that vertical constraint, while the top board remains an obstacle.
for(const offset of [17.999,18,18.001]){const device={...section(200),cy:wall.cy+offset};assert.equal(C.hoodBayFit(wall,device).fits,offset>=18);cases.push({host:wall,device,fits:offset>=18});}
assert(!C.hoodBayFit(wall,{...aligned,mountHeight:NaN}).fits);
const plan={walls:[],wins:[],doors:[],beams:[],rooms:[{id:'r',name:'厨房',poly:[[0,0],[8000,0],[8000,8000],[0,8000]]}]};assert(!P.spaceCheck(plan,[wall,aligned],{scanPassages:false}).some(i=>i.kind==='overlap'));
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(map.three),ctx=vm.createContext({FurnishCabinet:C,FurnishProducts:R});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);const M=require('../src/render/fotile-model.js');
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const {host,device,fits} of cases){
  const model=ctx.FurnishCabinetModel.buildRaw(T,host,box);model.position.y=host.mountHeight/1000;model.updateMatrixWorld(true);const appliance=M.build(T,device);appliance.position.z=(device.cy-host.cy)/1000;appliance.updateMatrixWorld(true);let cover;appliance.traverse(o=>{if(o.userData.fotilePart==='chimney-cover')cover=new T.Box3().setFromObject(o);});let hits=0;model.traverse(o=>{if(!o.isMesh)return;const overlap=new T.Box3().setFromObject(o).intersect(cover).getSize(new T.Vector3());if(overlap.x>1e-8&&overlap.y>1e-8&&overlap.z>1e-8)hits++;});assert.equal(hits===0,fits,'fit follows actual ceiling/back/top/shelf intersections');
 }
 const bodyModel=M.build(T,hood);bodyModel.updateMatrixWorld(true);let bodyTop=-Infinity;bodyModel.traverse(o=>{if(o.isMesh&&o.userData.fotilePart!=='chimney-cover')bodyTop=Math.max(bodyTop,new T.Box3().setFromObject(o).max.y);});close(bodyTop*1000-wall.mountHeight,1.99038461538464);
 console.log('PASS hood cavity checks follow actual ceiling/back/top/shelf boards, exact contacts, measured body penetration, modular transforms, flush alignment and repeated project restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
