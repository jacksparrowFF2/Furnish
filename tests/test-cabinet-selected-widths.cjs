'use strict';
const assert=require('node:assert/strict'),B=require('../src/core/cabinet-builder-core.js'),P=require('../src/core/project-core.js'),F=require('./helpers/cabinet-equalize-fixtures.cjs');
let cases=0;
for(const rot of [0,37,90])for(const flip of [false,true])for(const ids of [['box1','box2'],['box2','box3'],['box1','box3']]){
 const f={...F.boxes(),rot,flip,mountHeight:120},before=JSON.stringify(f),options={scope:'selected',boxIds:ids},next=B.equalBoxWidths(f,F.box,options),mean=f.cabinet.boxes.filter(b=>ids.includes(b.id)).reduce((n,b)=>n+b.w,0)/2;
 assert.equal(JSON.stringify(f),before);for(const b of next.cabinet.boxes){const old=f.cabinet.boxes.find(v=>v.id===b.id);assert.equal(b.w,ids.includes(b.id)?mean:old.w);assert.deepEqual({...b,w:old.w},old);}
 assert.equal(next.w,f.w);assert.equal(B.equalizeInfo(f,F.box,options).previewWidth,next.w);assert.deepEqual(B.equalBoxWidths(next,F.box,options),next);
 const restored=P.unpack(P.pack({planId:'demo',current:{furniture:[next]},designs:[],catalog:[]}));assert.deepEqual(restored.current.furniture[0],next);cases++;
}
const f=F.boxes();assert.throws(()=>B.equalBoxWidths(f,F.box,{scope:'selected',boxIds:[]}),/至少/);assert.throws(()=>B.equalBoxWidths(f,F.box,{scope:'selected',boxIds:['box1','box1']}),/至少/);assert.throws(()=>B.equalBoxWidths(f,F.box,{scope:'selected',boxIds:['box1','missing']}),/变化/);
console.log('PASS selected cabinet widths: '+cases+' rotated/mirrored layouts, preserved untargeted widths/components, total width, roundtrip and invalid selection');
