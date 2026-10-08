const assert=require('node:assert/strict'),fs=require('fs'),D=require('./dxf-import.js'),P=require('./project-core.js');
const p=D.parse(fs.readFileSync('furnish-template-example.dxf','utf8')),draft=D.draft(p,{id:'custom_original',name:'分享',mmPerUnit:1,layers:p.layers.map(l=>l.name),thickness:200});
const arch=P.architecture({draft,phase:'design'});arch.originalRevisions=[structuredClone(draft)];const work={plan:draft.id,furniture:[],architecture:arch};
const payload={planId:draft.id,current:work,designs:[{name:'方案A',planId:draft.id,work:structuredClone(work)}],catalog:[]};const copied=P.copyProject(P.unpack(P.pack(payload)),'custom_copy');
assert.equal(copied.current.architecture.draft.id,'custom_copy');assert.equal(copied.current.architecture.baseline.id,'custom_copy');assert.equal(copied.current.architecture.originalRevisions[0].id,'custom_copy');assert.equal(copied.designs[0].work.plan,'custom_copy');assert.equal(payload.planId,'custom_original');P.unpack(P.pack(copied));assert.throws(()=>P.copyProject(payload,'p1'),/自定义/);
console.log('PASS shared project roundtrip and independent identity across current/design/baseline/revision without source mutation');
