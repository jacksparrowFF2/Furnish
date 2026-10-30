'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),M=require('../src/render/window-covering-model.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js');
const types=['blind_venetian','blind_honeycomb','blind_zebra','blind_bamboo','blind_roller'],base={id:'blind',cx:2500,cy:2500,w:1500,d:75,h:1800,rot:0,color:'#ddd'};
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const type of types)for(const mountHeight of [0,900,1500])for(const curtainOpen of [0,.5,1])for(const [rot,flip]of [[0,false],[37,true]]){
  const f={...base,type,mountHeight,curtainOpen,rot,flip},model=M.build(T,f);model.position.set(f.cx/1000,mountHeight/1000,f.cy/1000);model.rotation.y=-rot*Math.PI/180;model.scale.x=flip?-1:1;
  const bounds=new T.Box3().setFromObject(model),parts=G.bodyParts(f,undefined,[f]),vertices=parts.flatMap(p=>p.vertices),actual=[bounds.min.toArray(),bounds.max.toArray()],numeric=[0,1].map(k=>[0,1,2].map(axis=>Math[k?'max':'min'](...vertices.map(v=>v[axis]))/1000));
  for(let k=0;k<2;k++)for(let i=0;i<3;i++)assert(Math.abs(actual[k][i]-numeric[k][i])<.00002,`${type}/${mountHeight}/${curtainOpen}/${rot}: ${actual} != ${numeric}`);
 }
 const plan={rooms:[],walls:[],doors:[]},f={...base,type:'blind_roller',mountHeight:1500,curtainOpen:0},probe={id:'probe',type:'block',cx:2500,cy:2500,w:50,d:100,h:100,mountHeight:1000,rot:0};
 assert(!G.volumeOverlap(f,probe));assert(G.volumeOverlap(f,{...probe,mountHeight:1600}));assert(!G.volumeOverlap({...f,curtainOpen:1},{...probe,mountHeight:1600}));
 const rule=P.definition(f).solidModel,newKey=J.checkFingerprint({kind:'overlap'},plan,[f]),unrelated={...base,type:'desk'},desk=J.checkFingerprint({kind:'overlap'},plan,[unrelated]);
 const saved=global.FurnishDesign,legacyProducts={...P,definition:item=>{const d=P.definition(item);return d?.solidModel?{...d,solidModel:{...d.solidModel,base:undefined}}:d;}};
 global.FurnishDesign={...require('../src/core/design-core.js'),products:()=>legacyProducts};try{assert.notEqual(J.checkFingerprint({kind:'overlap'},plan,[f]),newKey);assert.equal(J.checkFingerprint({kind:'overlap'},plan,[unrelated]),desk);}finally{global.FurnishDesign=saved;}
 assert.equal(J.checkFingerprint({kind:'overlap'},plan,[{...f,color:'#123456',price:99}]),newKey);
 let restored=f;for(let i=0;i<3;i++)restored=J.unpack(J.pack({planId:'mounted',current:{furniture:[restored]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored,f);
 console.log('PASS five blind families: real production vs numeric bounds, 3 heights/3 poses/rotation/mirror, actual penetration and height separation, scoped confirmation invalidation, repeated restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
