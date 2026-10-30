'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const A=require('../src/core/model-solid-recorder.js'),S=require('../src/core/furniture-solids.js');
const near=(a,b,label)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert(Math.abs(a[i]-b[i])<1e-7,label+': '+a[i]+' vs '+b[i]);};
const parent=new A.T.Group(),child=new A.T.Group(),leaf=new A.T.Mesh(new A.T.BoxGeometry());parent.add(child);child.add(leaf);
parent.position.set(1000000,-3000,8000);parent.scale.set(-2,.7,1.4);parent.rotation.set(.2,-.4,.7);child.position.set(-4,2,7);child.rotation.set(-.4,.9,.3);child.scale.set(.3,2,-1);leaf.position.set(2,3,4);leaf.quaternion.setFromUnitVectors(new A.T.Vector3(0,1,0),new A.T.Vector3(1,1,2).normalize());
for(const stop of [undefined,parent,child]){const transform=A.transform(leaf,stop);for(let i=0;i<40;i++){const p=[Math.sin(i)*4,Math.cos(i)*5,i/7];near(transform(p),A.point(leaf,p,stop),'nested mirrored/nonuniform affine transform');}}
const file=require.resolve('../src/core/furniture-solids.js'),scope={module:{exports:{}},require:createRequire(file),FurnishModelSolidRecorder:{...A,transform:node=>v=>A.point(node,v)}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),scope);const reference=scope.module.exports;
const catalog=require('../src/data/catalog.js').library.flatMap(c=>c.items);let vertices=0,maxError=0;
for(const type of ['cat_tree','washer_littleswan_tg10k60w','coffeetable_yeswood_cherry','armchair_yeswood_berlin','pet_feeder_mijia_2']){
 const item=catalog.find(i=>i[0]===type);assert(item,type);
 for(const rot of [0,37]){
  const f={id:type,type,w:item[2],d:item[3],...(item[6]?{h:item[6]}:{}),cx:123,cy:456,rot,flip:rot!==0,...(type.startsWith('washer')?{washerDoorAngle:rot?63:0}:{})};
  const actual=S.parts(f),expected=reference.parts(f);assert.equal(actual.length,expected.length,type);
  for(let j=0;j<actual.length;j++){
   assert.equal(actual[j].boardKey,expected[j].boardKey);assert.equal(actual[j].partRole,expected[j].partRole);assert.deepEqual(JSON.parse(JSON.stringify(actual[j].faces)),JSON.parse(JSON.stringify(expected[j].faces)));
   for(let k=0;k<actual[j].vertices.length;k++){near(actual[j].vertices[k],expected[j].vertices[k],type+' production vertices');for(let n=0;n<3;n++)maxError=Math.max(maxError,Math.abs(actual[j].vertices[k][n]-expected[j].vertices[k][n]));vertices++;}
  }
 }
}
console.log('PASS compiled mesh transforms match per-vertex hierarchy walk: '+vertices+' production vertices, max error '+maxError+' mm; nested rotation, quaternion, mirror, scale and stop ancestor');
