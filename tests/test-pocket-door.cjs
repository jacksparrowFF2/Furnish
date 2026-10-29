const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),M=require('../src/core/cabinet-motion.js'),Project=require('../src/core/project-core.js'),Model=require('../src/render/sliding-opening-model.js');
const f={id:'pocket',type:'pocketdoor_double',name:'口袋门草模',w:2800,d:160,h:2640,cx:2000,cy:2000,rot:0,slidingOpen:true,color:'#c5b59d'},l=P.pocketLayout(f);
assert.equal(l.opening,1300);assert.equal(l.clearHeight,2340);assert.equal(l.parts.length,9);
assert.equal(P.initial({type:f.type}).slidingOpen,true);assert.equal(P.value({...f,slidingOpen:undefined},'slidingOpen'),true);
for(const patch of [{w:1599},{d:119},{h:1799}])assert.throws(()=>P.validate({...f,...patch}),/至少/);
assert.throws(()=>P.validate({...f,slidingOpen:'yes'}));
assert.equal(D.replaceFurniture(f,{type:'desk',name:'桌子',w:1400,d:600,color:'#aaa'}).slidingOpen,undefined);
const round=Project.unpack(JSON.parse(JSON.stringify(Project.pack({planId:'test',current:{furniture:[f]},designs:[{name:'打开',work:{furniture:[f]}}],catalog:[]}))));assert.deepEqual(round.current.furniture,[f]);
const probe={id:'probe',type:'block',name:'通行探针',cx:2000,cy:2000,w:100,d:100,h:1800,rot:0,mountHeight:0};
for(const rot of [0,90,37])for(const flip of [false,true]){
 const item={...f,rot,flip};assert.equal(M.solidParts(item).length,9);assert.equal(G.volumeOverlap(item,probe,null,[item,probe]),false,'open central passage remains empty');
 assert.equal(G.volumeOverlap({...item,slidingOpen:false},probe,null,[item,probe]),true,'closed panels occupy central passage');
}
const plan={floorFinish:{areas:{}},rooms:[],walls:[]};
assert.equal(G.volumeOverlap(f,{...probe,cx:3000,cy:2075},null,[f,probe]),true,'pocket skin is solid');
assert.equal(G.volumeOverlap(f,{...probe,h:50,mountHeight:2800},plan,[f,probe]),false,'height separation');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const slidingOpen of [true,false]){const item={...f,slidingOpen},o=Model.build(T,item),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());for(const [a,n]of [[size.x,2.8],[size.y,2.64],[size.z,.16],[b.min.y,0]])assert(Math.abs(a-n)<1e-6);assert.equal(o.userData.slidingDoor.leaves.length,2);
  const ray=new T.Raycaster(new T.Vector3(.1,1,1),new T.Vector3(0,0,-1));o.updateMatrixWorld(true);assert.equal(ray.intersectObject(o,true).length>0,!slidingOpen,'production opening matches saved pose');
 }
 console.log('PASS pocket door: real meshes, open/closed void, 9 solids, dimensions, validation, rotation/mirror, height separation and persistence');
})().catch(e=>{console.error(e);process.exitCode=1;});
