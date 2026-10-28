'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),C=require('../src/data/catalog.js'),Project=require('../src/core/project-core.js'),SVG=require('../src/render/furniture-svg.js');
const base={id:'glass',name:'2+0',color:'#333',type:'telescopicdoor20',w:1800,d:100,h:2400,cx:0,cy:0,rot:0},near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
assert.equal(C.library.flatMap(c=>c.items).find(i=>i[0]===base.type)[3],100);assert.equal(P.footprintMinimum(base,'d'),80);assert.equal(P.footprintMinimum({...base,obj:{}},'d'),50);
assert.throws(()=>D.resizeFurniture(base,{d:79.99}));assert.throws(()=>Project.validateWork({furniture:[{...base,d:79.99}]}));assert.equal(P.slidingTracks({...base,d:80}).leafDepth,40);
for(const d of [80,90,100,150]){
 const f={...base,d},layout=P.slidingLayout(f);assert.equal(layout.leafDepth,40);near(Math.abs(layout.leaves[1].z-layout.leaves[0].z)-40,d-80);
 const work={furniture:[f]},round=Project.unpack(Project.pack({planId:'glass',current:work,designs:[{name:'door',work}],catalog:[]}));assert.deepEqual(round.current,work);let list=work.furniture;for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(list,work.furniture);
}
const plan={rooms:[],walls:[],doors:[]},key=f=>Project.checkFingerprint({kind:'overlap'},plan,[f],800);assert.ok(key(base).includes('telescopic-fixed-leaf-depth-v1'));assert.equal(key(base),key({...base,color:'#333',price:200}));assert.ok(!key({...base,type:'tripleslidingdoor'}).includes('telescopic-fixed-leaf-depth-v1'));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),models=require('../src/render/sliding-opening-model.js').create(T);
 for(const d of [80,90,100,150])for(const side of ['left','right'])for(const order of ['leading-front','leading-back'])for(const open of [false,true]){
  const f={...base,d,slidingStackSide:side,slidingTrackOrder:order,slidingOpen:open},g=models.build(f),door=g.userData.slidingDoor;g.updateWorldMatrix(true,true);
  for(const l of door.leaves){const b=new T.Box3().setFromObject(l.node);near((b.max.z-b.min.z)*1000,40);}
  const b=new T.Box3().setFromObject(g);near((b.max.z-b.min.z)*1000,d);
  const boxes=door.leaves.map(l=>new T.Box3().setFromObject(l.node));near(Math.max(boxes[0].min.z,boxes[1].min.z)-Math.min(boxes[0].max.z,boxes[1].max.z),(d-80)/1000);
  const svg=SVG.render(f.type,f.w,f.d,'#333',{ink:'#333'},f);assert.ok(svg.includes('height="40"'));assert.ok(svg.includes(P.slidingGlass.planColor));
 }
 for(const type of ['slidingdoor','doubleslidingdoor','tripleslidingdoor','tripleslidingwindow']){
  const f={...base,type,d:120},g=models.build(f);let glasses=0;g.traverse(o=>{if(o.material?.transparent){glasses++;assert.equal(o.material.color.getHexString(),P.slidingGlass.color.slice(1));}});assert.equal(glasses,g.userData.slidingDoor.leaves.length);assert.ok(SVG.render(type,f.w,f.d,'#333',{ink:'#333'},f).includes(P.slidingGlass.planColor));
 }
 const raw=models.buildOpening(2.4,.09,2.4,3);let rawGlass=0;raw.traverse(o=>{if(o.material?.transparent){rawGlass++;assert.equal(o.material.color.getHexString(),P.slidingGlass.color.slice(1));}});assert.equal(rawGlass,3);
 console.log('PASS fixed 40 mm leaves, 100 mm catalog default, complete depth incl recessed grip, 80 mm boundary/no overlap, legacy depths and project restoration, all sliding furniture and architectural ultra-clear glass, 2D/3D and review invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
