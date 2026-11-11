const assert=require('node:assert/strict'),A=require('../src/core/cabinet-assembly-core.js'),B=require('../src/core/cabinet-builder-core.js'),K=require('../src/core/kitchen-core.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.002,a+' != '+b);
let cases=0;
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const side of ['left','right']){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'snap-resize',cx:4000,cy:4000,rot,flip,color:'#f3f1ec'},()=> 'part'+(++n),'left')[0]),rows=A.placementRows(f),edge=side==='left'?Math.min(...rows.filter(r=>r.id.startsWith('base:')).map(r=>r.x-r.furniture.w/2)):Math.max(...rows.filter(r=>r.id.startsWith('base:')).map(r=>r.x+r.furniture.w/2)),sign=side==='left'?-1:1;
 const dropped=A.drop(f,{kind:'box'},{x:edge+sign*80,y:300});f=dropped.furniture;const id=dropped.id,before=structuredClone(f),p=K.assemblyConfig(f)[id],fixed=p.x-sign*p.w/2;
 for(const w of [200,800,350,600]){
  const old=A.modules(f).find(r=>r.id===id).furniture;
  f=w===200?A.edit(f,id,{w}):A.setPart(f,id,B.update(old,{boxId:old.cabinet.boxes[0].id},{w}));
  const q=K.assemblyConfig(f)[id];near(q.w,w);near(q.x-sign*q.w/2,fixed);assert.deepEqual(f.kitchen.modules,before.kitchen.modules);near(f.kitchen.baseHeight,before.kitchen.baseHeight);
  const actual=M.solidParts(f,{}).filter(p=>p.boardKey.startsWith('laundry:'+id+'/'));assert(actual.length>=5);P.validateWork({furniture:[f]});
  const reloaded=JSON.parse(JSON.stringify(f));K.validate(reloaded);assert.deepEqual(A.editableKitchen(reloaded),reloaded);
 }
 f=A.edit(f,id,{w:250});near(K.assemblyConfig(f)[id].x-sign*125,fixed);
 // Explicit placement edits win; detached and height-separated boxes never jump back.
 f=A.edit(f,id,{x:p.x+sign*1000});const detached=K.assemblyConfig(f)[id].x;
 f=A.edit(f,id,{w:400});near(K.assemblyConfig(f)[id].x,detached);
 f=A.edit(f,id,{x:p.x,mountHeight:4000});f=A.edit(f,id,{w:550});near(K.assemblyConfig(f)[id].x,p.x);
 cases++;
}
console.log('PASS '+cases+' snapped width resize cases, component/module edits, repeated restore, detached and height-separated controls');

// Contact is measured in the cabinet's own axes, including quarter-turn inserts.
for(const rot of [90,180,270]){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'rot',cx:1000,cy:1000,rot:37,flip:true},()=> 'x'+(++n),'left')[0]),q=B.create(),a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cfg=K.assemblyConfig(f,true);
 for(const [key,x]of [['cabinet1',2000],['cabinet2',2600]])cfg[key]={w:600,d:450,h:720,x:x*c,y:x*s,mountHeight:2500,rot,cabinet:structuredClone(q.cabinet)};
 K.validate(f);const before=structuredClone(cfg.cabinet2);f=A.edit(f,'cabinet2',{w:200});const p=K.assemblyConfig(f).cabinet2;near((p.x-before.x)*c+(p.y-before.y)*s,-200);near(-(p.x-before.x)*s+(p.y-before.y)*c,0);
}
// Both-side contact is ambiguous: do not guess a fixed side or move neighbours.
{
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'both',cx:0,cy:0},()=> 'x'+(++n),'left')[0]),cfg=K.assemblyConfig(f,true),q=B.create();
 for(const [key,x]of [['cabinet1',1800],['cabinet2',2400],['cabinet3',3000]])cfg[key]={w:600,d:450,h:720,x,y:0,mountHeight:3000,cabinet:structuredClone(q.cabinet)};
 f=A.edit(f,'cabinet2',{w:200});near(K.assemblyConfig(f).cabinet2.x,2400);
}
console.log('PASS quarter-turn inserts and ambiguous two-side contact controls');

// A narrow gap or no depth intersection is not an existing snapped side.
{
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'gap',cx:0,cy:0},()=> 'x'+(++n),'left')[0]),q=B.create(),cfg=K.assemblyConfig(f,true);
 cfg.cabinet1={w:600,d:450,h:720,x:2000,y:0,mountHeight:3000,cabinet:structuredClone(q.cabinet)};
 cfg.cabinet2={w:600,d:450,h:720,x:2600.02,y:0,mountHeight:3000,cabinet:structuredClone(q.cabinet)};
 const moved=A.edit(f,'cabinet2',{w:200});near(K.assemblyConfig(moved).cabinet2.x,2600.02);
 cfg.cabinet2.x=2600;cfg.cabinet2.y=450;const separate=A.edit(f,'cabinet2',{w:200});near(K.assemblyConfig(separate).cabinet2.x,2600);
}
console.log('PASS non-contact and exactly depth-separated controls');
