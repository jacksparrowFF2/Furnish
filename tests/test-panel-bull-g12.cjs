'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js'),M=require('../src/render/panel-bull-g12-model.js'),A=require('../src/data/panel-bull-g12-blender-asset.js');
const base={id:'panel',name:'86面板',type:'panel_bull_g12',w:86,d:10,h:86,cx:0,cy:0,rot:0,color:'#f5f5f2',mountHeight:1200,panelVariant:'socket5-diagonal'};
const near=(a,b)=>assert(Math.abs(a-b)<.025,`${a} != ${b}`),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const keys=Object.keys(P.panelVariants);assert.equal(keys.length,37);assert.deepEqual(Object.keys(A.variants),keys);
const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===base.type);assert(entry);assert.equal(entry[3],10);assert.equal(entry[5],undefined);
assert.equal(P.initial({type:base.type}).mountHeight,0);assert.equal(P.initial(base).panelVariant,'socket5-diagonal');assert.equal(P.catalogMinimum(base,'d'),2);
assert.throws(()=>P.validate({...base,panelVariant:'bad'}));assert.throws(()=>P.validateField({type:'block'},'panelVariant','blank'));assert.throws(()=>P.validate({...base,mountHeight:-1}));
const old={...base};delete old.panelVariant;assert.equal(P.value(old,'panelVariant'),'socket5-diagonal');assert.equal(P.migrate(old).panelVariant,undefined);
assert(require('../src/render/furniture-svg.js').render(base.type,86,10,'#fff',{ink:'#222'},base).includes('data-wall-panel'));
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const sourceDir=path.dirname(path.join(__dirname,'..',require('../scripts/lib/model-profiles.cjs').sourceFiles('panel-bull-g12').glb));
 for(const key of keys){
  const f={...base,panelVariant:key},asset=A.variants[key];assert.equal(asset.sourceSha256,sha(path.join(sourceDir,key+'.glb')));assert.equal(new Set(asset.parts.map(p=>p.identity)).size,asset.parts.length);
  const model=M.build(T,f);model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model);
  near((b.max.x-b.min.x)*1000,86);near((b.max.y-b.min.y)*1000,86);near((b.max.z-b.min.z)*1000,10);near(b.min.y*1000,1200);
  assert(model.children.filter(m=>m.isMesh).every(m=>m.userData.furnishStablePart.startsWith('panel-bull-g12:'+key+':')));
  for(const m of model.children.filter(m=>m.isMesh)){assert(m.geometry.attributes.normal.array.every(Number.isFinite));assert(m.material.roughness>=0&&m.material.roughness<=1);}
  const solids=G.bodyParts(f);assert.equal(solids.length,asset.parts.length,'all production parts are recorded after variant changes');
  const meshNames=solids.map(s=>s.partRole).sort();assert(meshNames.every(n=>n.includes(key+':')),'solid cache reads variant');
  const resized=M.build(T,{...f,w:129,d:15,h:103.2,mountHeight:0}),rb=new T.Box3().setFromObject(resized);near(rb.min.y*1000,0);near(rb.max.y*1000,103.2);near((rb.max.x-rb.min.x)*1000,129);near((rb.max.z-rb.min.z)*1000,15);
  if(key.startsWith('switch'))assert.equal(model.children.filter(o=>/^rocker-\d/.test(o.name)).length,Number(key[6]));
 }
 // Real openings: a ray enters below the white face, rather than hitting a black decal.
 const socket=M.build(T,base);socket.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(-.0195,1.262,.05),new T.Vector3(0,0,-1)),hits=ray.intersectObject(socket,true);assert(hits.length);assert(hits[0].point.z<.002,'open two-pin slot is recessed');
 const blank=M.build(T,{...base,panelVariant:'blank'});blank.updateMatrixWorld(true);near(ray.intersectObject(blank,true)[0].point.z*1000,5);
 // All height/rotation/mirror paths use common production solids and directional measurement.
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const f={...base,rot,flip},b=G.bbox(G.footprints(f).flat()),probe={id:'probe',type:'block',w:100,d:1000,h:86,cx:b[2]+150,cy:0,rot:0,mountHeight:1200};near(S.directional(f,{furniture:[probe]}).r.distance,100);
  assert(G.volumeOverlap(f,{...probe,w:1000,cx:0}));assert(!G.volumeOverlap(f,{...probe,w:1000,cx:0,mountHeight:1286}));assert(G.volumeOverlap(f,{...probe,w:1000,cx:0,mountHeight:1285.9}));
  assert(G.volumeOverlap(f,{...probe,w:1000,cx:0,type:'unknown',h:undefined,mountHeight:undefined}));assert(S.directional(f,{furniture:[{...probe,w:1000,cx:0}]}).r.containedBoundary);
 }
 const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),work={...W.fresh(plan),furniture:keys.map((key,i)=>({...base,id:'panel-'+i,panelVariant:key}))};
 const payload={planId:plan.id,current:work,designs:[{name:'面板',work:structuredClone(work)}],catalog:[{...base,id:'my-panel',price:0}]},packed=J.pack(payload);assert.equal(packed.version,84);assert.deepEqual(J.unpack(packed),payload);
 const workspace={v:84,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};assert.deepEqual(R.parse(JSON.parse(R.text(workspace))).work[plan.id].furniture,work.furniture);
 assert.deepEqual(Cache.load({read:key=>key==='huxing-design-v84'?JSON.stringify(workspace):null,key:'huxing-design-v84',firstPlan:plan,restore:W.restore}).work[plan.id].furniture,work.furniture);
 assert.equal(Cache.candidates({read:key=>key==='huxing-design-v83'?JSON.stringify({...workspace,v:83}):null})[0].v,83);
 let restored=work;for(let i=0;i<3;i++)restored=W.restore(structuredClone(restored),plan);assert.deepEqual(restored.furniture,work.furniture);
 const copy=D.pasteFurniture({items:[base],cx:0,cy:0},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0];assert.equal(copy.panelVariant,base.panelVariant);assert.equal(copy.mountHeight,base.mountHeight);
 assert.equal(D.replaceFurniture({...base,panelVariant:'socket4'},{...base,w:100}).panelVariant,'socket4');assert.equal(D.replaceFurniture(base,{type:'block',name:'占位',w:100,d:100,h:100,color:'#fff'}).panelVariant,undefined);
 const issue={kind:'overlap',id:base.id},fp=J.checkFingerprint(issue,{rooms:[],walls:[]},[base],800);assert.notEqual(J.checkFingerprint(issue,{rooms:[],walls:[]},[{...base,panelVariant:'blank'}],800),fp);assert.equal(J.checkFingerprint(issue,{rooms:[],walls:[]},[{...base,color:'#fff',price:20}],800),fp);
 const procurement=J.procurement({rooms:[]},{furniture:[base,{...base,id:'blank',panelVariant:'blank'}]});assert.equal(procurement.items.length,2);assert(procurement.items[1].model.includes('白板'));
 assert(J.pack({planId:plan.id,current:{furniture:[]},designs:[],catalog:[]}).version<84);
 console.log('PASS G12: 37 source hashes/production bounds/identities/materials, true holes, variant cache, elevation/scaling, directional clearance/contact/containment/unknown height, rotation/mirror, v84 project/workspace/cache, old missing field, repeat restore, copy/replace, procurement and spatial review');
})().catch(e=>{console.error(e);process.exitCode=1;});
