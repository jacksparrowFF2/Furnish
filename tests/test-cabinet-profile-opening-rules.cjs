'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),B=require('../src/core/cabinet-builder-core.js'),Profiles=require('../src/core/cabinet-component-profiles.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const make=template=>({...C.preset(template),id:'profile',type:C.templateType(template),cx:4000,cy:4000,rot:0});
for(const template of ['pantry500','chest','sideboard-fridge']){
 const source=make(template),f=Profiles.convert(source),before=JSON.stringify(f),zones=Profiles.zones(f),drawers=zones.filter(z=>z.kind==='cabinetdrawer'),passages=zones.filter(z=>z.kind==='cabinetpassage');
 assert.equal(passages.length,drawers.length,template+' only drawers have a front operating passage');
 for(const passage of passages)assert(drawers.some(z=>z.componentId===passage.componentId&&z.column===passage.column&&z.section===passage.section&&z.leaf===passage.leaf));
 if(template==='pantry500'){assert(zones.some(z=>z.kind==='cabinetdoor'));assert.equal(passages.length,0);}
 assert.equal(Profiles.zones(f,{passage:0}).filter(z=>z.kind==='cabinetpassage').length,0);
 const packed=P.pack({planId:'profile',current:{furniture:[f]},designs:[{name:'saved',work:{furniture:[f]}}],catalog:[]});assert.deepEqual(P.unpack(packed).current.furniture[0],f);assert.deepEqual(D.restoreFurniture([f],{makeId:()=> 'id',colorFor:()=> '#fff'}),[f]);assert.equal(JSON.stringify(f),before);
}
const source=make('pantry500'),profile=Profiles.convert(source),hinge=M.boards(source).find(b=>b.motion.axis==='y').motion.pivot;
for(const rot of [0,37,90])for(const flip of [false,true])for(const [offset,diameter,hit]of [[0,100,false],[400/Math.sqrt(2),20,true],[0,2000,false]]){
 const f={...profile,rot,flip},a=rot*Math.PI/180,x=(hinge[0]+offset)*(flip?-1:1),y=hinge[2]+offset,marker={id:'pipe',kind:'gas',name:'test pipe',at:[f.cx+x*Math.cos(a)-y*Math.sin(a),f.cy+x*Math.sin(a)+y*Math.cos(a)],pipeDiameter:diameter},plan={id:'profile',walls:[],doors:[],wins:[],slides:[],rooms:[{id:'room',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}],markers:[marker],ceilingHeight:4000};
 const issues=P.spaceCheck(plan,[f],{scanPassages:false}).filter(v=>v.kind==='cabinetdoor'&&v.markerIds?.includes('pipe'));
 assert.equal(issues.some(v=>!v.pending),hit,JSON.stringify({rot,flip,offset,diameter,issues}));
}
assert.equal(B.spatial(profile).profileOpeningRule,'drawer-passage-v1');assert.equal(B.spatial(B.create()).profileOpeningRule,undefined);
const plan={id:'review',walls:[],doors:[],rooms:[],ceilingHeight:4000},key=f=>P.checkFingerprint({kind:'cabinetdoor',id:f.id},plan,[f],800),current=key(profile),plain=B.create({id:'plain'}),plainKey=key(plain),spatial=B.spatial;
try{B.spatial=f=>{const value=spatial(f);delete value.profileOpeningRule;return value;};assert.notEqual(key(profile),current);assert.equal(key(plain),plainKey);}finally{B.spatial=spatial;}
assert.equal(key({...profile,color:'#111111',price:123}),current);
console.log('PASS profile door/drawer passages, actual cut-board motion through 18 rotated/mirrored pipe scenarios, persistence and scoped confirmation rule');
