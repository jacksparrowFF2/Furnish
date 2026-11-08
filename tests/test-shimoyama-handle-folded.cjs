'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),J=require('../src/core/project-core.js'),M=require('../src/render/storage-supply-model.js'),A=require('../src/data/toolbox-shimoyama-9l-blender-asset.js'),C=require('../src/data/catalog.js');
const near=(a,b)=>assert(Math.abs(a-b)<.03,`${a} != ${b}`);
(async()=>{
 const item=C.library.flatMap(c=>c.items).find(i=>i[0]==='toolbox_shimoyama_9l');assert.equal(item[6],180);assert.equal(P.height({type:item[0]}),180);
 const handle=A.parts.find(p=>p.name==='handle'),body=A.parts.find(p=>p.name==='body');assert(handle&&body);assert.deepEqual(A.sizeMm,[340,180,240]);
 const bounds=p=>[0,1,2].map(k=>{const v=p.positions.filter((_,i)=>i%3===k);return [Math.min(...v)*1000,Math.max(...v)*1000];});
 const h=bounds(handle);near(h[1][1],180);near(h[1][0],167);near(h[2][1]-h[2][0],43);near(h[0][1]-h[0][0],109);near(bounds(body)[1][1],145);
 const T=await import(JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const height of [180,220]){
  const f={id:'saved-height',name:item[1],color:item[4],type:item[0],w:340,d:240,h:height,cx:0,cy:0,rot:0,mountHeight:900};
  const scene=M.build(T,f),box=new T.Box3().setFromObject(scene);near(box.min.y*1000,900);near(box.max.y*1000,900+height);
  const project=J.pack({planId:'p',current:{furniture:[f]},designs:[],catalog:[]});assert.deepEqual(J.unpack(project).current.furniture[0],f);
  let restored=[f];for(let n=0;n<3;n++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(restored,[f]);
 }
 assert.equal(P.definition(item[0]).solidModel.geometryVersion,2);assert.equal(P.definition('toolbox_jiabangshou_390').solidModel.geometryVersion,1);
 console.log('PASS Shimoyama folded handle: actual rigid dimensions, 180mm default, saved 220mm retained, elevation once and project/recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
