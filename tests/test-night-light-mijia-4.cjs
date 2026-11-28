'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../src/core/product-rules.js'),J=require('../src/core/project-core.js');
const G=require('../src/core/layout-geometry.js'),L=require('../src/core/lighting-core.js');
const M=require('../src/render/night-light-mijia-4-model.js'),D=require('../src/render/downlight-model.js');
const fixture=require('../scripts/lib/model-profiles.cjs').profiles().find(p=>p.id==='night-light-mijia-4').fixture;
const near=(a,b,tolerance=.00001)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);

(async()=>{
 const {imports}=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
 const T=await import(imports.three);
 assert.equal(fixture.mountHeight,300);
 assert.equal(fixture.d,41.1);
 for(const mountHeight of [0,300,630]){
  const f={...fixture,mountHeight,rot:37,flip:true,lightPreviewLevel:20};
  const model=M.build(T,f);
  model.rotation.y=-f.rot*Math.PI/180;
  model.scale.x=-1;
  model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model,true);
  near(box.min.y*1000,mountHeight);
  near(box.max.y*1000,mountHeight+93.4);
  const points=G.bodyParts(f).flatMap(p=>p.vertices);
  for(const [i,axis] of ['x','y','z'].entries()){
   near(box.min[axis]*1000,Math.min(...points.map(p=>p[i])));
   near(box.max[axis]*1000,Math.max(...points.map(p=>p[i])));
  }
  const {rects,spots}=L.collect(T,[model]);
  assert.equal(rects.length,4);
  assert.equal(spots.length,0);
  const expected=new T.Vector3(0,0,-1).transformDirection(model.matrixWorld);
  for(const r of rects)assert(expected.distanceTo(new T.Vector3().fromArray(r.normal))<1e-8);
  near(rects.reduce((sum,r)=>sum+r.radiance*r.width*r.height,0)*683*Math.PI,3);
  D.setLights(model,false);
  assert.equal(L.collect(T,[model]).rects.length,0);
  assert.equal(L.collect(T,[M.build(T,{...f,lightPreviewLevel:0})]).rects.length,0);
  const roundtrip=J.unpack(J.pack({planId:'night-light-check',current:{furniture:[f]},designs:[{name:'夜灯',work:{furniture:[f]}}],catalog:[]}));
  assert.deepEqual(roundtrip.current.furniture,[f]);
  assert.deepEqual(roundtrip.designs[0].work.furniture,[f]);
 }
 console.log('PASS MJYD06YL: installed depth, bottom elevation, rotated and mirrored solids, rear-directed emission and project roundtrip');
})().catch(error=>{console.error(error);process.exitCode=1;});
