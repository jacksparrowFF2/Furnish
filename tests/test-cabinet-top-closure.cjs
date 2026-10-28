const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js'),Motion=require('../src/core/cabinet-motion.js');
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;},near=(a,b)=>assert(Math.abs(a-b)<.001,a+' / '+b);
 for(const mode of ['shared','independent'])for(const t of [12,18,30]){
  let f={id:'cap',type:'wardrobe',cx:3000,cy:3000,rot:0,...C.preset('wardrobe')};f.h=2450;f.cabinet.thickness=t;for(const col of f.cabinet.columns)col.shelves=[500,1200,1800];C.scaleWidths({...f,cabinet:{...f.cabinet,thickness:18}},f);
  f=C.setConstruction(f,mode,{left:mode==='independent'?18:0,right:mode==='independent'?18:0});
  const old=JSON.stringify(f),next=C.setTopClosure(f,{height:50,doorGap:10});assert.equal(JSON.stringify(f),old);assert.equal(next.h,2450);assert.equal(C.bodyHeight(next),2400);assert.deepEqual(next.cabinet.columns,f.cabinet.columns);assert.equal(C.spaces(next,0).at(-1).top,2400-next.cabinet.plinth-2*t);
  const model=Model.build(THREE,next,box),caps=[],doors=[],tops=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.userData.cabinetTopClosure)caps.push(o);if(o.userData.cabinetDoorSize)doors.push(o);if(o.userData.cabinetTop)tops.push(o);});
  const tokens=[];model.traverse(o=>{if(o.isMesh)tokens.push(o.userData.furnishPartToken);});assert(tokens.every(Boolean));assert.equal(new Set(tokens).size,tokens.length,'all production meshes retain unique part identities');
  assert.equal(caps.length,mode==='independent'?next.cabinet.columns.length:1);let b=new THREE.Box3().setFromObject(caps[0]);near(b.min.y*1000,2400);near(b.max.y*1000,2450);near(b.max.z*1000,next.d/2-t);
  for(const top of tops)near(new THREE.Box3().setFromObject(top).max.y*1000,2400);
  assert(doors.length);for(const door of doors){const b=new THREE.Box3().setFromObject(door);near(b.max.y*1000,2440);near(b.min.y*1000,next.cabinet.plinth+next.cabinet.columns[door.userData.cabinetPart.column].drawers.reduce((s,d)=>s+d.height,0)+1);assert(door.userData.cabinetDoorSize.height>2100);}
  const solids=Motion.boards(next,{includeStatic:true});assert.equal(solids.filter(b=>b.metadata.cabinetTopClosure).length,mode==='independent'?next.cabinet.columns.length:1);near(solids.find(b=>b.metadata.cabinetTopClosure).top,2450);
  assert(C.openingZones(next).filter(z=>z.kind==='cabinetdoor').every(z=>z.ranges[0][1]===2440));
  const packed=P.pack({planId:'p',current:{furniture:[next]},designs:[{name:'top',work:{furniture:[next]}}],catalog:[]});assert.equal(packed.version,27);const restored=P.unpack(packed);assert.deepEqual(restored.current.furniture[0].cabinet,next.cabinet);assert.deepEqual(restored.designs[0].work.furniture[0].cabinet,next.cabinet);
  const once=D.restoreFurniture([next],{makeId:()=> 'n',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(once,{makeId:()=> 'n',colorFor:()=> '#fff'}),once);
  const resized=C.resize(next,{...next,h:2550});assert.equal(C.bodyHeight(resized),2500);assert.deepEqual(resized.cabinet.topClosure,{height:50,doorGap:10});C.validate(resized);
  const work={v:27,planId:'p',work:{p:{furniture:[next]}},designs:[]};assert.equal(JSON.parse(R.text(work)).version,27);
  for(const bad of [{height:-1,doorGap:10},{height:301,doorGap:10},{height:50,doorGap:51},{height:'50',doorGap:10},{height:NaN,doorGap:10},{height:50,doorGap:10,extra:1}])assert.throws(()=>C.setTopClosure(f,bad));
  const bad=structuredClone(next);bad.cabinet.doorOverlay='inset';assert.throws(()=>C.validate(bad));
 }
 const legacy={type:'wardrobe',...C.preset('wardrobe')},saved=JSON.stringify(legacy);assert.deepEqual(C.setTopClosure(legacy,{height:0,doorGap:0}),legacy);assert.equal(JSON.stringify(legacy),saved);assert.equal(P.pack({planId:'p',current:{furniture:[legacy]},designs:[],catalog:[]}).version,1);
 const replaced=D.replaceFurniture(C.setTopClosure({id:'replace',cx:1000,cy:1000,rot:0,...legacy},{height:50,doorGap:10}),{type:'cabinet',...C.preset('storage')});assert.equal(replaced.cabinet.topClosure,undefined,'new template clears old closure');
 const plan={rooms:[{id:'r',poly:[[0,0],[8000,0],[8000,8000],[0,8000]],ceilingHeight:2700}],walls:[],doors:[],ceilingHeight:2700};
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const f=C.setTopClosure({id:'cap',type:'wardrobe',cx:3000,cy:3000,rot,flip,...C.preset('wardrobe'),h:2450},{height:50,doorGap:10}),key=P.checkFingerprint({},plan,[f],800),color=structuredClone(f);color.color='#445566';assert.equal(P.checkFingerprint({},plan,[color],800),key);assert.notEqual(P.checkFingerprint({},plan,[{...f,cabinet:{...f.cabinet,topClosure:{height:50,doorGap:11}}}],800),key);
  const x=C.layout(f)[0].left+30,z=f.d/2+80,a=rot*Math.PI/180,X=x*(flip?-1:1),obstacle={id:'o',type:'washer',w:10,d:10,h:10,mountHeight:2440,rot,cx:3000+X*Math.cos(a)-z*Math.sin(a),cy:3000+X*Math.sin(a)+z*Math.cos(a)};
  const hits=b=>P.spaceCheck(plan,[f,b],{scanPassages:false}).filter(i=>i.id==='cap'&&i.kind==='cabinetdoor');assert.equal(hits(obstacle).length,0);assert(hits({...obstacle,mountHeight:2439}).length,'1mm intrusion into actual door top');
 }
 console.log('PASS top closure: shared/independent, 12/18/30mm, real 50mm strips above body, exact 10mm door gap, production solids, project/workspace v27, no restoration drift, rotation/mirror contact and 1mm intrusion, legacy preservation');
})().catch(e=>{console.error(e);process.exit(1);});
