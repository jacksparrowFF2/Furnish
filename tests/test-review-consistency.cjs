const assert=require('node:assert/strict'),P=require('../src/core/project-core.js');
const plan={rooms:[{id:'r',name:'房间',poly:[[0,0],[4000,0],[4000,3000],[0,3000]]}],walls:[[0,0,200,3000,'n']],doors:[]};
const f={id:'a',type:'chair',name:'椅',cx:2000,cy:1500,w:400,d:400,rot:0},work={furniture:[f,{...f,id:'b'}],spaceThreshold:800};
const original=P.spaceCheck(plan,work.furniture),key=P.checkFingerprint(original.find(v=>v.kind==='overlap'),plan,work.furniture,800);work.spaceIgnored=[key,'invalid legacy record','null','[]'];
for(const [p,w] of [[plan,work],[plan,{...work,spaceThreshold:900}],[plan,{...work,furniture:[{...f,cx:2100},work.furniture[1]]}],[{...plan,walls:[]},work],[plan,{...work,spaceIgnored:[]}]]){const expected=P.spaceCheck(p,w.furniture,{passage:w.spaceThreshold}).map(v=>({...v,ignored:w.spaceIgnored.includes(P.checkFingerprint(v,p,w.furniture,w.spaceThreshold))}));assert.deepEqual(P.review(p,w),expected);}
console.log('PASS optimized review matches legacy confirmations, geometry/threshold invalidation and malformed record handling');
