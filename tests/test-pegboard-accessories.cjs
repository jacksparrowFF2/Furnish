const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const f={id:'peg',type:'cabinet',cx:3000,cy:3000,rot:37,flip:true,...C.preset('entry-pegboard')},rule=R.pegboardAssembly,near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`),counts=boards=>Object.fromEntries(['displayShelf','hook','light'].map(key=>[key,boards.filter(b=>b.metadata.cabinetAccessory===key).length]));
for(let mask=0;mask<128;mask++){
 const next=structuredClone(f);next.cabinet.pegboardParts=Object.fromEntries(rule.parts.map((key,i)=>[key,!!(mask&(1<<i))]));C.validate(next);const parts=C.pegboardParts(next),boards=M.boards(next,{includeStatic:true});
 assert.deepEqual(counts(boards),{displayShelf:parts.displayShelves?2:0,hook:parts.hooks?6:0,light:parts.light?1:0});
 if(C.movablePegboard(next)){
  const before=structuredClone(next);next.cabinet.pegboardBottom=600;const raised=M.boards(next,{includeStatic:true});assert.equal(raised.length,boards.length);raised.forEach((b,i)=>{near(b.bottom-boards[i].bottom,222);near(b.top-boards[i].top,222);assert.deepEqual(b.poly,boards[i].poly);});
  const bounds=C.assemblyBounds(next);near(bounds.bottom,600);near(bounds.h,1418);near(bounds.d,parts.light?308:parts.displayShelves?120:parts.hooks?57.5:18);
  assert.equal(C.purePegboard(next),!parts.displayShelves&&!parts.hooks&&!parts.light);
  const q=P.unpack(P.pack({planId:'p',current:{furniture:[next]},designs:[{name:'独立附件',work:{furniture:[next]}}],catalog:[]}));assert.deepEqual(q.current.furniture,[next]);assert.deepEqual(q.designs[0].work.furniture,[next]);let restored=q.current.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=>'',colorFor:()=>''});assert.deepEqual(restored,[next]);assert.equal(before.cabinet.pegboardBottom,undefined);
 }
}
for(const legacy of [undefined,false,true]){
 const old=structuredClone(f);old.cabinet.pegboardParts=legacy===undefined?{}:{accessories:legacy};const before=JSON.stringify(old);assert.deepEqual(counts(M.boards(C.upgradeDesign(old),{includeStatic:true})),legacy===false?{displayShelf:0,hook:0,light:0}:{displayShelf:2,hook:6,light:1});C.upgradeDesign(old);assert.equal(JSON.stringify(old),before);
 const mixed=structuredClone(old);mixed.cabinet.pegboardParts.hooks=legacy===false;C.validate(mixed);assert.equal(C.pegboardParts(C.upgradeDesign(mixed)).hooks,legacy===false);assert.equal(C.pegboardParts(C.upgradeDesign(mixed)).displayShelves,legacy!==false);assert.equal(C.pegboardParts(C.upgradeDesign(mixed)).light,legacy!==false);
}
for(const key of rule.accessoryParts){const bad=structuredClone(f);bad.cabinet.pegboardParts[key]='false';assert.throws(()=>C.validate(bad),/组件/);}
(async()=>{
 const fs=require('fs'),Model=require('../src/render/cabinet-model.js'),imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(let mask=0;mask<8;mask++){const next=structuredClone(f);next.cabinet.pegboardParts={...Object.fromEntries(rule.structureParts.map(k=>[k,false])),...Object.fromEntries(rule.accessoryParts.map((k,i)=>[k,!!(mask&(1<<i))]))};const before=Model.build(T,next,box);next.cabinet.pegboardBottom=675.5;const after=Model.build(T,next,box);assert.equal(after.children.length,before.children.length);near(new T.Box3().setFromObject(after).min.y*1000,675.5);for(let i=0;i<after.children.length;i++){near((after.children[i].position.y-before.children[i].position.y)*1000,297.5);near(after.children[i].position.x,before.children[i].position.x);near(after.children[i].position.z,before.children[i].position.z);}}
 console.log('PASS independent pegboard accessories: all 128 structural/accessory combinations, legacy aggregate fallback and explicit overrides, real meshes, height linkage, depth, validation and current/named project repeated restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
