'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),Model=require('../src/render/sliding-opening-model.js'),E=require('../src/io/blender-export.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),camera=new T.PerspectiveCamera();
 const read=(f,products=P)=>{const g=Model.create(T,{products}).build(f);g.userData.fid='pocket';const s=E.snapshot(T,{groups:[g],camera,includeHidden:true,expandInstances:true});try{return s.scene.children.filter(n=>n.isMesh).map(n=>[n.userData.furnishPartKey,new T.Box3().setFromObject(n).getCenter(new T.Vector3()).toArray()]).sort((a,b)=>a[0].localeCompare(b[0]));}finally{s.dispose();}};
 for(const type of ['pocketdoor_double','pocketdoor_triple']){
  const f={type,w:2800,d:220,h:2640,slidingOpen:false,slidingStackSide:'left'},layout=P.pocketLayout(f),before=read(f),keys=before.map(x=>x[0]);
  assert.equal(new Set(layout.parts.map(p=>p.partId)).size,layout.parts.length);
  assert.equal(before.length,layout.parts.length);assert.equal(new Set(keys).size,keys.length);
  assert.deepEqual(read(f,{...P,pocketLayout:f=>({...P.pocketLayout(f),parts:P.pocketLayout(f).parts.reverse()})}),before,'physical part identities survive layout reordering');
  for(const patch of [{w:3100,h:2800,d:240},{slidingOpen:true},{slidingStackSide:'right'}])assert.deepEqual(read({...f,...patch}).map(x=>x[0]),keys,'resize/pose/stack side preserve physical identities');
  assert.throws(()=>read(f,{...P,pocketLayout:f=>{const l=P.pocketLayout(f);l.parts[1].partId=l.parts[0].partId;return l;}}),/Duplicate generator item/);
 }
 console.log('PASS pocket production identities: physical roles, reorder, resize, pose, stack side and duplicate rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
