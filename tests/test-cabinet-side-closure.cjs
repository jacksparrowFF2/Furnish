const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js'),Products=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),Motion=require('../src/core/cabinet-motion.js'),SVG=require('../src/render/furniture-svg.js'),Cache=require('../src/io/workspace-cache.js');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} / ${b}`);
const plan={rooms:[{id:'r',poly:[[0,0],[10000,0],[10000,10000],[0,10000]],ceilingHeight:3000}],walls:[],doors:[],ceilingHeight:3000};
const seed=()=>({id:'host',type:'wardrobe',cx:3000,cy:3000,rot:0,color:'#ad9678',...C.preset('wardrobe')});
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const mode of ['shared','independent'])for(const sides of [{left:50,right:0},{left:0,right:75},{left:1,right:300}]){
  let base=C.setConstruction(seed(),mode,{left:mode==='independent'?18:0,right:0});base=C.setTopClosure(base,{height:50,doorGap:10});base.cabinet.columns[0].doorColor='#a12345';base.cabinet.columns.at(-1).doorColor='#147abc';
  const before=structuredClone(base),f=C.setSideClosures(base,sides);assert.deepEqual(base,before);assert.deepEqual(f.cabinet.columns,base.cabinet.columns);assert.equal(f.w,base.w);assert.equal(f.cx,base.cx);
  assert.equal(Products.dimensions(f).w,f.w+sides.left+sides.right);
  const model=Model.build(THREE,f,box),strips=[],tokens=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh)tokens.push(o.userData.furnishPartToken);if(o.userData.cabinetSideClosure)strips.push(o);});
  assert.equal(new Set(tokens).size,tokens.length);assert(tokens.every(Boolean));assert.equal(strips.length,Object.values(sides).filter(Boolean).length,'one strip per enabled physical side, including grouped boxes');
  for(const strip of strips){const side=strip.userData.cabinetSideClosure,b=new THREE.Box3().setFromObject(strip);near(b.min.y*1000,0);near(b.max.y*1000,f.h);near(b.max.z*1000,f.d/2);near((b.max.x-b.min.x)*1000,sides[side]);near((b.max.z-b.min.z)*1000,f.cabinet.thickness);near((side==='left'?b.max.x:b.min.x)*1000,(side==='left'?-1:1)*f.w/2);assert.equal('#'+strip.material.color.getHexString(),side==='left'?'#a12345':'#147abc');}
  assert.equal(Motion.boards(f,{includeStatic:true}).filter(b=>b.metadata.cabinetSideClosure).length,strips.length);
  const svg=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f);for(const side of ['left','right'])assert.equal(svg.includes(`data-side-closure="${side}"`),!!sides[side]);
  const packed=P.pack({planId:'p',current:{furniture:[f]},designs:[{name:'saved',work:{furniture:[f]}}],catalog:[]});assert.equal(packed.version,45);const restored=P.unpack(packed);assert.deepEqual(restored.current.furniture[0].cabinet,f.cabinet);assert.deepEqual(restored.designs[0].work.furniture[0].cabinet,f.cabinet);
  assert.equal(P.pack({planId:'p',current:{furniture:[]},designs:[],catalog:[f]}).version,45);
  const planId=require('../src/data/plans.js')[0].id,text=R.text({v:45,planId,work:{[planId]:{furniture:[f]}},designs:[]});assert.equal(JSON.parse(text).version,45);assert.deepEqual(R.parse(JSON.parse(text)).work[planId].furniture[0].cabinet,f.cabinet);
  let recovered=[f];for(let i=0;i<3;i++)recovered=D.restoreFurniture(recovered,{makeId:()=> 'n',colorFor:()=> '#fff'});assert.deepEqual(recovered[0].cabinet,f.cabinet);assert.equal(recovered[0].w,f.w);
  const key=P.checkFingerprint({},plan,[f],800),color=structuredClone(f);color.color='#555555';color.cabinet.columns[0].doorColor='#888888';assert.equal(P.checkFingerprint({},plan,[color],800),key);assert.notEqual(P.checkFingerprint({},plan,[base],800),key);
  const resized=C.resize(f,{...f,w:f.w+100});assert.deepEqual(resized.cabinet.sideClosures,sides);assert.equal(resized.w,f.w+100);
  assert.equal(D.replaceFurniture(f,{type:'cabinet',...C.preset('storage')}).cabinet.sideClosures,undefined);
  assert.equal(C.setSideClosures(f,{left:0,right:0}).cabinet.sideClosures,undefined);
 }
 // The strip's physical solid, not a full-depth extension, drives collisions and measurement.
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const f=C.setSideClosures({...seed(),rot,flip},{left:50,right:75}),angle=rot*Math.PI/180;
  const obstacle=(x,z,bottom=100,h=100)=>{x*=flip?-1:1;return {id:'obstacle',type:'block',w:10,d:10,h,mountHeight:bottom,rot,cx:f.cx+x*Math.cos(angle)-z*Math.sin(angle),cy:f.cy+x*Math.sin(angle)+z*Math.cos(angle)};};
  const part=C.sideClosureParts(f)[1],hit=obstacle(part.x,part.z),empty=obstacle(part.x,-f.d/4);
  assert(G.volumeOverlap(f,hit));assert.equal(G.collisions([f,hit]).length,1);assert(!G.volumeOverlap(f,empty),'space behind front strip stays empty');
  assert(!G.volumeOverlap(f,obstacle(part.x,part.z,f.h)));assert(G.volumeOverlap(f,obstacle(part.x,part.z,f.h-1)));
  const contact=obstacle(f.w/2+75+5,part.z);assert(!G.volumeOverlap(f,contact));assert(G.volumeOverlap(f,obstacle(f.w/2+75+4,part.z)));
  const external=obstacle(f.w/2+75+105,part.z),gap=S.directional(external,{rotation:-rot,furniture:[f]});assert(Object.values(gap).some(g=>g&&Math.abs(g.distance-100)<.001),'distance reads the actual external strip');
  assert(G.volumeOverlap(f,{...hit,h:undefined,type:'unknown'}),'unknown height remains conservative');
 }
 for(const id of ['sideboard-fridge','entry-console','wall','tv-floor','book-y52y09-low']){const base={id:'special',type:C.templateType(id),cx:3000,cy:3000,rot:0,...C.preset(id)},f=C.setSideClosures(base,{left:50,right:50});C.validate(f);const model=Model.build(THREE,f,box),strips=[];model.traverse(o=>{if(o.userData.cabinetSideClosure)strips.push(o);});assert.equal(strips.length,id==='sideboard-fridge'?3:2);assert.equal(new Set(strips.map(o=>o.userData.furnishPartToken)).size,strips.length);}
 const K=require('../src/core/kitchen-core.js');
 const wall=K.fromWall(C.setSideClosures({id:'wall',type:'kitchenwall',cx:3000,cy:3000,rot:0,mountHeight:1000,...C.preset('wall')},{left:50,right:75}));
 const laundry=K.configure({id:'laundry',type:'counter',cx:3000,cy:3000,rot:0,color:'#ddd'},K.laundryPreset()),upper=C.setSideClosures({type:'kitchenwall',...C.preset('wall')},{left:50,right:75});
 laundry.kitchen.laundry.assembly={upper:{w:laundry.w,d:upper.d,h:upper.h,mountHeight:1800,x:0,y:0,cabinet:C.resize(upper,{...upper,w:laundry.w}).cabinet}};
 for(const host of [wall,laundry])for(const rot of [0,37,90])for(const flip of [false,true]){
  const f={...host,rot,flip},parts=K.sideClosureParts(f);assert.equal(parts.length,2);const outline=G.bbox(G.footprints(f).flat()),actual=Motion.solidParts(f).filter(p=>p.boardName.includes('收口'));assert.equal(actual.length,2);for(const p of actual)for(const [x,,z]of p.vertices){assert(x>=outline[0]-.01&&x<=outline[2]+.01);assert(z>=outline[1]-.01&&z<=outline[3]+.01);}
  const p=parts[1],point=K.world(f,p.x,p.z),o={id:'overlap',type:'block',cx:point[0],cy:point[1],rot,w:10,d:10,h:10,mountHeight:host===wall?1100:1900};assert(G.volumeOverlap(f,o));assert.equal(G.collisions([f,o]).length,1,'parent broad phase includes embedded strips');assert.equal((SVG.render(f.type,f.w,f.d,f.color||'#ddd',{ink:'#333'},f).match(/data-side-closure=/g)||[]).length,2);
  assert.equal(P.pack({planId:'p',current:{furniture:[f]},designs:[],catalog:[]}).version,45);const roundtrip=P.unpack(P.pack({planId:'p',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(K.sideClosureParts(roundtrip),parts);
 }
 const base=seed();for(const value of [null,[],{left:-1,right:0},{left:.5,right:0},{left:301,right:0},{left:'50',right:0},{left:NaN,right:0},{left:50},{left:50,right:0,extra:1}])assert.throws(()=>C.setSideClosures(base,value));assert.throws(()=>C.setSideClosures({...base,locked:true},{left:50,right:0}));
 assert.deepEqual(C.sideClosures(base.cabinet),{left:0,right:0});assert.equal(P.pack({planId:'p',current:{furniture:[base]},designs:[],catalog:[]}).version,1);
 const old={v:44,updatedAt:1},latest={v:45,updatedAt:2},loaded=Cache.load({read:key=>key.endsWith('v44')?JSON.stringify(old):key.endsWith('v45')?JSON.stringify(latest):null,key:'huxing-design-v45'});assert.deepEqual(loaded,latest);assert.deepEqual(Cache.candidates({read:key=>key.endsWith('v44')?JSON.stringify(old):null})[0],old);
 console.log('PASS side closure: left/right/default-range, real production boards/colors/identities, 2D, special cabinets, asymmetric rotated/mirrored solids and distances, contact/1mm overlap/height/unknown, v45 project/workspace/catalog/cache, restoration/resize/replacement/confirmation');
})().catch(e=>{console.error(e);process.exit(1);});
