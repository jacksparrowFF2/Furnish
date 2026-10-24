const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/ceiling-core.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/downlight-model.js'),Ceiling=require('../src/render/ceiling-model.js');
const e=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='downlight_philips_dl269');assert(e);assert.deepEqual([e[2],e[3],e[6]],[85,85,45]);
const f={id:'downlight',name:e[1],type:e[0],w:85,d:85,h:45,color:e[4],cx:500,cy:500,rot:0,mountHeight:2498};
const c={id:'flat',name:'平顶',kind:'flat',roomId:'r',polygon:[[0,0],[1000,0],[1000,1000],[0,1000]],height:2500,thickness:12};
const plan={rooms:[{id:'r',poly:c.polygon}],walls:[],beams:[],ceilings:{version:1,items:[c]}};
const body=f=>({f,p:G.corners(f),vertical:D.furnitureVerticalBounds(f,plan,[f])});
assert.equal(C.fitDownlight(plan,f),2498);assert.equal(C.downlightHoles(c,[body(f)]).length,1);assert.equal(C.checks(plan,[body(f)]).length,0);
for(const rot of [0,37,90])for(const flip of [false,true])assert.equal(C.downlightHoles(c,[body({...f,rot,flip})]).length,1);
for(const dx of [0,.01,-.01]){const b=body({...f,cx:42.5+dx});assert.equal(C.downlightHoles(c,[b]).length,dx<0?0:1);}
for(const patch of [{mountHeight:2498.01},{mountHeight:2497.99},{w:86},{h:46}]){const b=body({...f,...patch});assert.equal(C.downlightHoles(c,[b]).length,0);assert(C.checks(plan,[b]).length);}
assert.equal(C.downlightHoles(c,[{...body(f),vertical:null}]).length,0);
assert.equal(C.downlightHoles(c,[body(f),body({...f,id:'other',cx:570})]).length,0);
assert.equal(C.downlightHoles(c,[body(f),body({...f,id:'other',cx:576.5})]).length,2);
assert.throws(()=>C.fitDownlight({...plan,ceilings:undefined},f));
const work={furniture:[f],ceilings:plan.ceilings};const round=P.unpack(P.pack({planId:'test',current:work,designs:[{name:'筒灯',work}],catalog:[]}));assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.ceilings,work.ceilings);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'x',colorFor:()=> '#fff'});assert.deepEqual(restored,[f]);
assert.equal(D.pasteFurniture({items:[f],cx:500,cy:500},{x:700,y:700},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].mountHeight,2498);
assert.equal(R.initial({type:f.type}).mountHeight,2500);assert.equal(R.vertical({...f,mountHeight:0}).bottom,0);assert.equal(D.replaceFurniture(f,{type:'chair',name:'椅子',w:500,d:500,color:'#fff'}).mountHeight,undefined);
{
 const {fixture}=require('./helpers/wall-finish-fixture.cjs'),F=require('../src/core/floor-finish-core.js');const source=fixture({partition:true}),roomId=source.plan.rooms[0].id;
 let w=F.setLayers(source.work,source.plan,[roomId],{rawZ:0,tileThickness:10,baseThickness:50});w.furnitureDatum='finished-floor';
 const flat={...c,roomId,polygon:[[500,1000],[1500,1000],[1500,2000],[500,2000]]};w.ceilings={version:1,items:[flat]};const item={...f,cx:1000,cy:1500,mountHeight:2438};w.furniture=[item];const effective=P.effectivePlan(source.plan,w);
 assert.equal(C.fitDownlight(effective,item,[item]),2438);assert.equal(D.furnitureVerticalBounds(item,effective,[item]).bottom,2498);assert.equal(C.checks(effective,G.bodyParts(item,effective,[item]).map(part=>({f:item,...part}))).filter(v=>v.id===item.id).length,0);
 const missing=JSON.parse(JSON.stringify(w));delete missing.floorFinishes.areas[roomId].baseThickness;assert.throws(()=>C.fitDownlight(P.effectivePlan(source.plan,missing),item,[item]),/未知/);
 assert.throws(()=>C.fitDownlight({...plan,ceilings:{items:[c,{...c,id:'second'}]}},f),/多个/);
}
{
 const Buy=require('../src/core/purchasing-core.js');
 for(const watts of [5,7])for(const kelvin of [3000,4000,6500]){
  const item={...f,downlightWatts:watts,downlightKelvin:kelvin},spec=R.downlightSpec(item);assert.equal(spec.lumens,watts===5?(kelvin===3000?360:380):(kelvin===3000?480:500));
  const current={furniture:[item]},r=P.unpack(P.pack({planId:'test',current,designs:[{name:'variant',work:current}],catalog:[]}));assert.deepEqual(r.current.furniture,[item]);assert.deepEqual(r.designs[0].work.furniture,[item]);
  const restored=D.restoreFurniture([item],{makeId:()=> 'copy',colorFor:()=> '#fff'});assert.deepEqual(restored,[item]);
  assert.equal(D.pasteFurniture({items:[item],cx:500,cy:500},{x:700,y:700},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].downlightKelvin,kelvin);
  assert.equal(D.replaceFurniture(item,{type:'chair',name:'chair',w:500,d:500,color:'#fff'}).downlightWatts,undefined);
 }
 for(const key of ['downlightWatts','downlightKelvin'])for(const v of [0,6,'5',null,NaN,Infinity])assert.throws(()=>P.unpack(P.pack({planId:'test',current:{furniture:[{...f,[key]:v}]},designs:[],catalog:[]})));
 assert.equal(f.downlightWatts,undefined);assert.equal(R.downlightSpec(f).watts,5);assert.equal(R.downlightSpec(f).kelvin,4000);
 const old={...f,name:'飞利浦品焕筒灯 DL269 · 5W 4000K',model:'品焕 DL269 · 5W 4000K'};assert.equal(R.editDownlight(old,'downlightWatts',7).name,'飞利浦品焕筒灯 DL269');assert.equal(R.editDownlight({...old,name:'我的灯',model:'采购备注型号'},'downlightWatts',7).model,'采购备注型号');
 const changed={...f,downlightWatts:7,downlightKelvin:6500},issue={kind:'ceiling',id:f.id,ceilingId:'flat'};assert.equal(P.checkFingerprint(issue,plan,[f],800),P.checkFingerprint(issue,plan,[changed],800),'lighting does not invalidate spatial confirmation');
 const a=Buy.demand({...plan,wins:[],doors:[],rooms:plan.rooms.map(r=>({...r,mat:'tile'}))},{furniture:[f]}, {tile:{name:'地砖',price:0}},()=>0)[0],b=Buy.demand({...plan,wins:[],doors:[],rooms:plan.rooms.map(r=>({...r,mat:'tile'}))},{furniture:[changed]}, {tile:{name:'地砖',price:0}},()=>0)[0];assert.notEqual(a.signature,b.signature,'orders detect changed variant');
 assert.equal(P.procurement(plan,{furniture:[f,changed]},()=>0).items.length,2,'procurement separates variants');
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const downlightWatts of [5,7])for(const downlightKelvin of [3000,4000,6500]){
  const item={...f,downlightWatts,downlightKelvin},m=Model.build(T,item),spec=R.downlightSpec(item),light=m.getObjectByProperty('isSpotLight',true);const nearFlux=light.intensity*2*Math.PI*(1-Math.cos(light.angle));assert(Math.abs(nearFlux-spec.lumens)<1e-6);assert.equal(light.color.getHexString(),new T.Color(spec.color).getHexString());
 }
 const o=Model.build(T,{...f,mountHeight:0}),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());
 const near=(a,b)=>assert(Math.abs(a-b)<2e-7,`${a} != ${b}`);near(size.x,.085);near(size.z,.085);near(size.y,.045);near(b.min.y,0);
 o.traverse(v=>{if(v.isMesh)for(const k of ['position','normal'])assert(v.geometry.attributes[k].array.every(Number.isFinite));});
 const lamp=o.getObjectByProperty('isSpotLight',true);assert(lamp);near(lamp.angle,50*Math.PI/180);near(lamp.intensity*2*Math.PI*(1-Math.cos(lamp.angle)),380);assert(lamp.target.position.y<lamp.position.y);
 Model.setLights(o,false);assert.equal(lamp.visible,false);Model.setLights(o,true);assert.equal(lamp.visible,true);
 const E=require('../src/io/blender-export.js');o.position.set(1,2,3);o.rotation.y=.7;o.updateMatrixWorld(true);const snapshot=E.snapshot(T,{groups:[o],camera:new T.PerspectiveCamera(45,1,.1,20)});const exported=snapshot.scene.getObjectByProperty('isSpotLight',true);assert(exported,'actual spotlight exported');exported.updateWorldMatrix(true,true);const lightAt=exported.getWorldPosition(new T.Vector3()),targetAt=exported.target.getWorldPosition(new T.Vector3());assert(targetAt.y<lightAt.y-.9);near(exported.intensity,lamp.intensity);snapshot.dispose();
 const ceiling=Ceiling.build(T,plan.ceilings,{bodies:[body(f)]});ceiling.updateMatrixWorld(true);
 const ray=(x,z)=>new T.Raycaster(new T.Vector3(x,2.4,z),new T.Vector3(0,1,0)).intersectObject(ceiling,true);
 assert.equal(ray(.5,.5).length,0,'actual production hole');assert(ray(.55,.5).length,'board outside hole');
 console.log('PASS downlight catalog, height, restore, copy/replacement, finished-floor/unknown datum, project roundtrip, fit/cutout boundaries, rotation/mirror, unknown height, real geometry, cone photometry and production ceiling hole');
})().catch(e=>{console.error(e);process.exitCode=1;});
