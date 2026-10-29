const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),M=require('../src/core/cabinet-motion.js'),Project=require('../src/core/project-core.js'),Model=require('../src/render/sliding-opening-model.js');
const f={id:'wide',type:'pocketdoor_triple',name:'单侧三联动口袋门',w:2863.5,d:220,h:2640,cx:2000,cy:2000,rot:0,color:'#c5b59d',slidingStackSide:'left',slidingOpen:true};
const key=item=>Project.checkFingerprint({kind:'overlap'},{rooms:[],walls:[],doors:[]},[item],800);assert.notEqual(key(f),key({...f,slidingOpen:false}));assert.notEqual(key(f),key({...f,slidingStackSide:'right'}));assert.equal(key(f),key({...f,color:'#ffffff',price:100}));
const old={...f,type:'pocketdoor_double',d:160};delete old.slidingStackSide;assert.notEqual(key(old),key({...old,slidingOpen:false}));
assert.equal(P.pocketLayout(f).opening,2057.625);assert.equal(P.pocketLayout(f).parts.length,7);
for(const patch of [{w:1999},{d:199},{h:1799}])assert.throws(()=>P.validate({...f,...patch}),/至少/);P.validate({...f,w:2000,d:200,h:1800});
for(const slidingStackSide of ['left','right'])for(const slidingOpen of [true,false])for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...f,slidingStackSide,slidingOpen,rot,flip},parts=M.solidParts(item),layout=P.pocketLayout(item);assert.equal(parts.length,7);
 const probe={id:'probe',type:'block',name:'中央通道探针',cx:2000,cy:2000,w:80,d:80,h:1800,rot:0,mountHeight:0};assert.equal(G.volumeOverlap(item,probe,null,[item,probe]),!slidingOpen);
 const leaves=layout.parts.filter(p=>p.key==='pocket-leaf');assert.equal(new Set(leaves.map(p=>p.z)).size,3);assert(leaves.every(p=>Math.abs(p.z)+p.d/2<item.d/2-P.definition(item).pocket.skin));
 if(slidingOpen){const skin=layout.parts[0],lo=skin.x-skin.w/2,hi=skin.x+skin.w/2;assert(leaves.every(p=>p.x-p.w/2>=lo+30&&p.x+p.w/2<=hi));}
}
const replaced=D.replaceFurniture(f,{type:'pocketdoor_double',name:'双侧',w:2863.5,d:160,h:2640,color:'#aaa'});assert.equal(replaced.slidingStackSide,undefined);assert.equal(P.pocketLayout(replaced).opening,1331.75);
const round=Project.unpack(JSON.parse(JSON.stringify(Project.pack({planId:'test',current:{furniture:[f]},designs:[{name:'关闭',work:{furniture:[{...f,slidingOpen:false}]}}],catalog:[]}))));assert.deepEqual(round.current.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'copy',colorFor:()=> '#ccc'});assert.deepEqual(restored,[f]);
(async()=>{const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const slidingStackSide of ['left','right'])for(const slidingOpen of [true,false]){const item={...f,slidingStackSide,slidingOpen},o=Model.build(T,item),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());for(const [a,n]of [[size.x,2.8635],[size.y,2.64],[size.z,.22],[b.min.y,0]])assert(Math.abs(a-n)<1e-6);o.updateMatrixWorld(true);assert.equal(o.userData.slidingDoor.leaves.length,3);
  const hits=new T.Raycaster(new T.Vector3(.1,1,1),new T.Vector3(0,0,-1)).intersectObject(o,true);assert.equal(hits.length>0,!slidingOpen);
  const door=o.userData.slidingDoor;assert(door.leaves[2].opened!==door.leaves[2].closed);assert(door.group.parent,'production controller remains attached to the returned model');
 }
 console.log('PASS wide pocket door: 2057.625 opening, left/right three lanes, actual meshes/solids/voids, bounds, rotation/mirror, legacy double dimensions, replacement and persistence');
})().catch(e=>{console.error(e);process.exitCode=1;});
