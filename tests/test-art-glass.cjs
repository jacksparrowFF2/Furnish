'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js'),M=require('../src/render/art-glass-model.js');
const base={id:'glass',name:'艺术玻璃隔断',type:'art_glass_partition',w:900,d:8,h:2400,cx:0,cy:0,rot:0,color:'#ffffff',mountHeight:0,artGlassPattern:'fluted'};
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
assert.deepEqual(P.initial(base),{mountHeight:0,artGlassPattern:'fluted',frontClearance:0});
for(const delta of [{d:2.9},{d:30.1},{w:99},{w:6001},{h:99},{h:6001},{mountHeight:-1},{artGlassPattern:'unknown'}])assert.throws(()=>P.validate({...base,...delta}));
assert.equal(require('../src/render/furniture-svg.js').render(base.type,900,8,'#fff',{ink:'#333'}).includes('data-art-glass'),true);
assert.throws(()=>P.validateField({type:'block'},'artGlassPattern','fluted'));
assert.throws(()=>D.resizeFurniture(base,{d:31}));assert.equal(D.resizeFurniture(base,{d:3}).d,3);
assert.equal(D.resizeFurniture(base,{w:1800}).d,8);assert.throws(()=>D.resizeFurniture({...base,locked:true},{w:1000}));
const legacy={...base};delete legacy.artGlassPattern;assert.equal(P.artGlass(legacy).pattern,'fluted');assert.equal(P.migrate(legacy).artGlassPattern,undefined);
const signatures=new Set();for(const pattern of Object.keys(P.artGlassPatterns)){const b=M.normalPixels(pattern);assert.equal(b.length,256*256*4);signatures.add(crypto.createHash('sha256').update(b).digest('hex'));}
assert.equal(signatures.size,9,'nine distinct embedded normal maps');
for(const pattern of Object.keys(P.artGlassPatterns)){
 const pixels=M.normalPixels(pattern),again=M.normalPixels(pattern);assert.deepEqual(pixels,again,'surface is fixed, not animated');
 for(let i=0;i<pixels.length;i+=4){const n=[0,1,2].map(k=>pixels[i+k]/127.5-1);assert(Math.abs(Math.hypot(...n)-1)<.014);assert(n[2]>0,'outward optical normal');}
 for(const t of [.13,.49,.81]){near(M.relief(pattern,0,t),M.relief(pattern,1,t));near(M.relief(pattern,t,0),M.relief(pattern,t,1));}
}
const fp=J.checkFingerprint({kind:'overlap',id:base.id},{rooms:[],walls:[]},[base],800);
assert.equal(J.checkFingerprint({kind:'overlap',id:base.id},{rooms:[],walls:[]},[{...base,artGlassPattern:'pear',color:'#fefefe',price:200}],800),fp,'optical edits keep spatial review');
assert.notEqual(J.checkFingerprint({kind:'overlap',id:base.id},{rooms:[],walls:[]},[{...base,d:10}],800),fp);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const pattern of Object.keys(P.artGlassPatterns)){
  const f={...base,w:1234,h:1765,d:6.5,mountHeight:200,artGlassPattern:pattern},g=M.build(T,f),b=new T.Box3().setFromObject(g),mesh=g.children[0];
  near((b.max.x-b.min.x)*1000,f.w);near((b.max.z-b.min.z)*1000,f.d);near(b.min.y*1000,200);near(b.max.y*1000,1965);
  assert.equal(mesh.material[4].transmission,1);assert.equal(mesh.material[4].ior,1.5);assert(mesh.material[4].normalMap);assert.equal(mesh.material[5].normalMap,null);assert.equal(mesh.userData.furnishStablePart,'art-glass:pane');
  const optical=mesh.material[4],grain=pattern==='pear'||pattern==='mist';assert.equal(!!optical.roughnessMap,grain);assert.equal(mesh.material[5].roughnessMap,null,'polished rear stays clear');
  if(grain){assert.deepEqual(optical.roughnessMap.repeat.toArray(),optical.normalMap.repeat.toArray());assert.equal(optical.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(optical.metalnessMap,optical.roughnessMap);assert.equal(optical.opacity,1);const data=optical.roughnessMap.image.data,green=data.filter((_,i)=>i%4===1);assert(Math.min(...green)<Math.max(...green));assert(data.every((v,i)=>i%4!==2||v===0),'packed blue metalness is zero');assert(Math.max(...green)/255*optical.roughness<.25,'roughness stays within the intended subtle range');}
  const resized=M.build(T,{...f,w:f.w*2,h:f.h*2}).children[0].material[4];assert.notEqual(resized.normalMap,optical.normalMap);assert.equal(resized.normalMap.repeat.x,optical.normalMap.repeat.x*2);assert.equal(resized.normalMap.repeat.y,optical.normalMap.repeat.y*2);assert.deepEqual(resized.normalMap.image.data,optical.normalMap.image.data,'resize repeats, never stretches the microscopic surface');
  assert(Array.from(mesh.geometry.attributes.normal.array).every(Number.isFinite));const parts=G.bodyParts(f);assert.equal(parts.length,1);near(parts[0].vertical.bottom,200);near(parts[0].vertical.top,1965);
 }
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const f={...base,rot,flip},a=rot*Math.PI/180,point=(x,z)=>({cx:x*Math.cos(a)-z*Math.sin(a),cy:x*Math.sin(a)+z*Math.cos(a)}),probe={id:'p',type:'block',w:100,d:100,h:100,mountHeight:100,rot,...point(0,0)};
  assert(G.volumeOverlap(f,probe));assert(!G.volumeOverlap(f,{...probe,mountHeight:2400}));assert(G.volumeOverlap(f,{...probe,mountHeight:2399.9}));assert(G.volumeOverlap(f,{...probe,type:'unknown',h:undefined,mountHeight:undefined}));
  const b=G.bbox(G.footprints(f).flat()),other={...probe,rot:0,cx:b[2]+150,cy:0,w:100,d:5000};near(S.directional(f,{furniture:[other]}).r.distance,100);
  assert(S.directional(f,{furniture:[{...other,cx:0,w:5000}]}).r.containedBoundary);
 }
 const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),work={...W.fresh(plan),furniture:[base]};
 const C=require('../src/core/cabinet-core.js'),cab=C.setSideClosures({id:'cab',type:'wardrobe',cx:3000,cy:3000,rot:0,color:'#ad9678',...C.preset('wardrobe')},{left:50,right:0});assert.equal(J.formatVersion([{furniture:[cab]}]),45);assert.equal(J.formatVersion([{furniture:[cab,base]}]),46);
 const payload={planId:plan.id,current:work,designs:[{name:'玻璃',work:structuredClone(work)}],catalog:[{...base,id:'my-pane',price:0}]};assert.equal(J.pack(payload).version,46);assert.deepEqual(J.unpack(J.pack(payload)),payload);
 const workspace={v:46,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};assert.deepEqual(R.parse(JSON.parse(R.text(workspace))).work[plan.id].furniture,[base]);
 assert.deepEqual(Cache.load({read:key=>key==='huxing-design-v46'?JSON.stringify(workspace):null,key:'huxing-design-v46',firstPlan:plan,restore:W.restore}).work[plan.id].furniture,[base]);
 assert.equal(Cache.load({read:key=>key==='huxing-design-v44'?JSON.stringify({...workspace,v:44}):null,key:'huxing-design-v46',firstPlan:plan,restore:W.restore}).v,44);
 let restored=work;for(let i=0;i<3;i++)restored=W.restore(structuredClone(restored),plan);assert.deepEqual(restored.furniture,[base]);
 assert.throws(()=>J.validateWork({furniture:[{...base,artGlassPattern:'bad'}]}));
 const sourceItem={...base,id:'my-pane',price:0};const replaced=D.replaceFurniture(base,sourceItem);J.validateWork({furniture:[replaced]});assert.equal(replaced.catalogSnapshot.d,8);
 const copied=D.pasteFurniture({items:[base],cx:0,cy:0},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0];assert.equal(copied.artGlassPattern,'fluted');assert.equal(copied.d,8);
 assert.equal(D.replaceFurniture(base,{type:'block',name:'占位',w:500,d:500,h:500,color:'#fff'}).artGlassPattern,undefined);
 assert.equal(D.replaceFurniture({...base,artGlassPattern:'pear'},{...base,w:1000}).artGlassPattern,'pear');
 const procure=J.procurement({rooms:[]},{furniture:[base,{...base,id:'pear',artGlassPattern:'pear'}]});assert.equal(procure.items.length,2);assert(procure.items[1].model.includes('香梨'));
 console.log('PASS art glass: nine optical maps, actual production bounds/normals/materials, thin dimensions, validation/resize/locks, rotated/mirrored spatial contact/overlap/unknown height/directional containment, v46 project/workspace/cache and legacy repeat restore, copy/replace and spatial review');
})().catch(e=>{console.error(e);process.exitCode=1;});
