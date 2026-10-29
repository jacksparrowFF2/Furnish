'use strict';
const assert=require('node:assert/strict'),P=require('../src/core/product-rules.js'),Project=require('../src/core/project-core.js');
const plan={id:'confirmation',walls:[],wins:[],doors:[],beams:[],rooms:[{id:'room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}],ceilingHeight:3000},f={id:'tg',type:'washer_littleswan_tg10k60w',cx:2500,cy:2500,w:595,d:560,h:850,rot:37,flip:true,washerDoorAngle:55},generic={...f,id:'generic',type:'washer',w:600,d:600};
const fingerprint=item=>Project.checkFingerprint({kind:'cabinetdoor',id:item.id},plan,[item],800);
assert.equal(P.definition(f).washerGeometryVersion,2);const current=fingerprint(f),genericCurrent=fingerprint(generic),originalDesign=global.FurnishDesign;
const previousProducts={...P,definition:item=>{const definition=P.definition(item);return definition?.washerProfile==='tg10k60w'?{...definition,washerGeometryVersion:1}:definition;}};
try{global.FurnishDesign={...require('../src/core/design-core.js'),products:()=>previousProducts};assert.notEqual(fingerprint(f),current,'v1 spatial confirmation must expire after changing the reference door/hinge geometry');assert.equal(fingerprint(generic),genericCurrent,'other washer profiles must retain their confirmations');}finally{global.FurnishDesign=originalDesign;}
assert.equal(fingerprint({...f,color:'#ff0000',price:123,purchaseStatus:'ordered'}),current,'non-spatial edits preserve confirmation');
assert.notEqual(fingerprint({...f,washerDoorAngle:110}),current);assert.notEqual(fingerprint({...f,w:650}),current);
console.log('PASS TG front geometry v2: profile-scoped confirmation expiry, other profiles and non-spatial edits preserved, angle/size edits invalidate');
