'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/repository-core.js'),P=require('../src/core/project-core.js');
const plan=require('../src/data/plans.js')[0],clone=v=>JSON.parse(JSON.stringify(v));
let id=0;const W=require('../src/core/work-state.js').create({makeId:()=> 'startup'+ ++id,colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials});
const work=W.fresh(plan),workspace={v:38,planId:plan.id,work:{[plan.id]:work},designs:Array.from({length:20},(_,i)=>({id:'design'+i,name:'方案'+i,planId:plan.id,work:clone(work)}))};
const preview=P.previewPlan;let previews=0,validated=0;
P.previewPlan=(payload,plans)=>{previews++;validated+=1+payload.designs.length;return preview(payload,plans);};
try{
 const before=JSON.stringify(workspace),checked=C.validate(workspace);
 assert.equal(previews,21,'derive one preview per current/named work');
 assert.equal(validated,21,'do not revalidate the entire history for each preview');
 assert.equal(JSON.stringify(workspace),before,'validation must not mutate caller data');
 assert.deepEqual(C.validate(checked),checked,'repeated restore must not drift');
 const bad=clone(workspace);bad.designs[19].work.open={w:{999999:0.5}};
 assert.throws(()=>C.validate(bad),/不存在于此方案/,'the last named work still needs plan reference validation');
 const invalid=clone(workspace);invalid.designs[19].work.furniture[0].w=-1;
 assert.throws(()=>C.validate(invalid),/家具尺寸/);
 const unknown=clone(workspace);unknown.planId='missing';unknown.work={missing:work};unknown.designs=[];
 assert.throws(()=>C.validate(unknown),/不存在的户型|户型编号/);
 console.log('PASS linear startup preview validation, all named works checked, no mutation and repeat restore without drift');
}finally{P.previewPlan=preview;}
