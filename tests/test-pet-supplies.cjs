'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const M=require('../src/render/pet-supply-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.01,`${a} != ${b}`);
(async()=>{const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const [profile,type,size,count,version]of [['pet-bowl','pet_bowl_petstar_180',[180,65,180],4,'v1'],['litter-bag','cat_litter_yanxuan_25kg',[250,80,220],6,'v7']]){
 const A=require('../src/data/'+profile+'-blender-asset.js'),glb=fs.readFileSync(require.resolve('../assets/models/'+profile+'/'+version+'/'+profile+'-v1.glb'));assert.equal(A.sourceSha256,crypto.createHash('sha256').update(glb).digest('hex'));assert.equal(A.parts.length,count);assert.equal(new Set(A.parts.map(p=>p.identity)).size,count);
 const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===type);assert(entry);assert.equal(entry[5],undefined,'price stays unknown');
 const f={id:profile,type,color:entry[4],name:entry[1],w:size[0],h:size[1],d:size[2],cx:0,cy:0,rot:0,mountHeight:75};
 for(const edited of [{},{w:size[0]*1.2,d:size[2]*.9,h:size[1]*1.4}]){const q={...f,...edited},model=M.build(T,q);model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model);near(b.min.y*1000,75);for(const [axis,k]of [['x','w'],['y','h'],['z','d']])near((b.max[axis]-b.min[axis])*1000,q[k]);assert.equal(G.bodyParts(q).length,count);}
 for(const rot of [0,37,90])for(const flip of [false,true]){const q={...f,rot,flip},b=G.bbox(G.footprints(q).flat()),wall={id:'outside',type:'block',w:100,d:2000,h:1000,cx:b[2]+150,cy:0,rot:0};near(S.directional(q,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(q,wall));assert(G.volumeOverlap(q,{...wall,cx:0,w:1000,d:1000}));assert(!G.volumeOverlap(q,{...wall,cx:0,w:1000,d:1000,mountHeight:2000}));
 const packed=J.pack({planId:'p',current:{furniture:[q]},designs:[{name:'saved',work:{furniture:[q]}}],catalog:[]});assert.equal(packed.version,53);assert.deepEqual(J.unpack(packed).current.furniture[0],q);let restored=[q];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(restored,[q]);}
 const replaced=D.replaceFurniture({id:'old',type:'block',w:600,d:450,h:1000,cx:123,cy:456,rot:90,mountHeight:18},f,{anchor:'center'});assert.equal(replaced.id,'old');near(replaced.cx,123);near(replaced.cy,456);assert.equal(replaced.type,type);assert.equal(P.supports(f,'mountHeight'),true);
 if(profile==='pet-bowl'){const g=M.build(T,{...f,mountHeight:0});g.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(g,true)[0];assert.equal(hit.object.name,'water-surface');near(hit.point.y*1000,49);const steel=g.children.find(c=>c.name==='steel-liner');const cavity=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(steel,true)[0];near(cavity.point.y*1000,10);assert(steel.material.metalness===1);}
 if(profile==='litter-bag'){
  const g=M.build(T,{...f,mountHeight:0});g.updateMatrixWorld(true);const body=g.children.find(c=>c.name==='soft-package'),handle=g.children.find(c=>c.name==='folded-handle'),ray=(obj,x,z)=>new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(0,-1,0)).intersectObject(obj,true);
  for(const [x,z]of [[0,0],[.08,.04],[-.08,.04],[.08,-.04],[-.08,-.04]])near(ray(body,x,z)[0].point.y*1000,79.76);
  assert.equal(ray(handle,0,-.055).length,0,'handle has a real capsule hole');assert(ray(handle,.075,-.055).length>0,'handle is a separate thin flap around the hole');assert.equal(P.definition(f).solidModel.geometryVersion,2);
 }
}
// Ten flat bag envelopes: two independent floor stacks, not ten layers on a suspended shelf.
const bags=Array.from({length:10},(_,i)=>({id:'bag'+i,type:'cat_litter_yanxuan_25kg',w:250,d:220,h:80,cx:i%2?130:-130,cy:0,rot:0,mountHeight:18+Math.floor(i/2)*80}));
for(let i=0;i<bags.length;i++)for(let j=i+1;j<bags.length;j++)assert(!G.volumeOverlap(bags[i],bags[j]),'stored bags do not interpenetrate');
const cabinet={id:'cab',type:'cabinet',cx:0,cy:0,rot:0,w:682.816265060241,d:350,h:2350,cabinet:{version:1,template:'storage',boxConstruction:'independent',thickness:18,plinth:0,columns:[{door:'double',doorOpen:false,width:646.816265060241,drawers:[],shelves:[500,1000,1550,1900]}]}};C.validate(cabinet);for(const f of bags)assert(!G.volumeOverlap(f,cabinet),'bags clear actual cabinet boards');
console.log('PASS pet supplies: source hashes, production dimensions/cavity/materials, elevation, scaling, rotated/mirrored space, v53/recovery/replacement, ten independent bags and cabinet-board clearance');
})().catch(e=>{console.error(e);process.exitCode=1;});
