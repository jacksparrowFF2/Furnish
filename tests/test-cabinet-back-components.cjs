'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),Products=require('../src/core/product-rules.js');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 let count=0;
 for(const [template]of C.templates)for(const thickness of [undefined,0,6,9.5,36,50]){
  const f={...C.preset(template),id:'back',type:C.templateType(template),cx:2000,cy:3000,rot:0,mountHeight:120};
  if(!C.backThicknessAvailable(f.cabinet)){assert.equal(template,'book-y52y09-low');continue;}
  if(thickness!==undefined)f.cabinet.backThickness=thickness;const saved=JSON.stringify(f);C.validate(f);
  const model=Model.build(THREE,f,box);model.updateMatrixWorld(true);let backs=0;
  model.traverse(o=>{if(!o.isMesh||!o.userData.cabinetBack)return;backs++;const meta=o.userData.cabinetBack,b=new THREE.Box3().setFromObject(o);near((b.max.z-b.min.z)*1000,thickness??C.backThickness(f.cabinet,meta.kind));assert(b.max.z*1000<=f.d/2+.001);});
  assert.equal(backs===0,thickness===0,`${template}: zero removes real rear panels`);
  const numeric=M.boards(f,{includeStatic:true}).filter(b=>b.metadata?.cabinetBack);assert.equal(numeric.length,backs,template+' recorder shares production rear components');
  assert(C.depthSections(f).length>=1);for(const depth of C.depthSections(f)){assert(depth.clearDepth>0);near(depth.clearDepth,depth.total-depth.rearInset-depth.backThickness-depth.doorThickness);}
  assert.equal(JSON.stringify(f),saved,'read paths do not migrate old instances');
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const placed={...f,rot,flip},work={furniture:[placed]},packed=P.pack({planId:'p',current:work,designs:[{name:'saved',work}],catalog:[]}),restored=P.unpack(packed).current.furniture[0];assert.deepEqual(restored.cabinet,f.cabinet);
   if(thickness!==undefined&&(f.cabinet.entry||f.cabinet.sideboard||f.cabinet.columns.some(col=>col.pegboard)))assert.equal(packed.version,60);
   const once=D.restoreFurniture([placed],{makeId:()=> 'copy',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(once,{makeId:()=> 'copy',colorFor:()=> '#fff'}),once);
   assert(M.solidParts(placed,{furniture:[placed]}).every(b=>b.vertices.flat().every(Number.isFinite)));
  }
  count++;
 }
 for(const template of ['entry-console','sideboard-fridge','entry-pegboard']){
  const f={...C.preset(template),id:'case',type:'cabinet',cx:2000,cy:3000,rot:0};f.cabinet.backThickness=6;
  const context=C.spatialConfig(f);assert.deepEqual(context,C.spatialConfig({...f,color:'#123456',price:20}));const other=structuredClone(f);other.cabinet.backThickness=9;assert.notDeepEqual(C.spatialConfig(other),context);
  const value=structuredClone(f);value.cabinet.thickness=25;C.scaleStructure(f,value);assert.equal(value.cabinet.backThickness,6,'side thickness does not move the back thickness');
 }
 const entry={...C.preset('entry-console'),id:'entry',type:'cabinet',cx:2000,cy:3000,rot:0,d:350};entry.cabinet.backThickness=6;
 for(const section of ['lower','upper'])near(C.depthLayout(entry,0,entry.cabinet,section).clearDepth,326);near(C.depthLayout(entry,0,entry.cabinet,'niche').clearDepth,344);
 const bay=C.layout(entry)[0],item={id:'item',type:'water_purifier_mijia_1200g',cx:entry.cx+bay.center,cy:entry.cy-175+6+25,w:100,d:50,h:100,mountHeight:entry.cabinet.plinth+entry.cabinet.entry.shoeHeight+30,rot:0};
 for(const delta of [-.001,0,.001])assert.equal(G.volumeOverlap(entry,{...item,cy:item.cy-delta}),delta>0,'entry back contact/penetration threshold');
 const peg={...C.preset('entry-pegboard'),id:'peg',type:'cabinet',cx:2000,cy:3000,rot:0};peg.cabinet.columns[0].pegboardHatch=C.defaultPegboardHatch(peg,0);peg.cabinet.backThickness=6;assert.equal(C.pegboardHatches(peg,0)[0].thickness,6);peg.cabinet.backThickness=0;assert.equal(C.pegboardHatches(peg,0).length,0);assert.equal(C.pegboardHatch(peg,0),null);assert(C.openingZones(peg).every(z=>z.section!=='pegboardHatch'));C.validate(peg);
 for(const shape of ['straight','L','U'])for(const thickness of [0,6,36]){
  const k=K.defaults({w:1800,d:600});k.shape=shape;k.backThickness=thickness;k.endExtensions=[{run:0,length:200,depth:200,cabinetDepth:200,backThickness:thickness,backPanel:false}];if(shape!=='straight')k.modules.push({run:1,width:1500,role:'door'});if(shape==='U')k.modules.push({run:2,width:1200,role:'door'});
  const f=K.configure({id:'k',type:'counter',cx:2000,cy:3000,w:1800,d:600,rot:0},k);
  for(const m of K.cabinetLayout(f).filter(m=>m.role!=='empty')){const part=K.moduleFurniture(f,m);assert.equal(part.cabinet.backThickness,thickness);C.validate(part);const v=C.depthLayout(part);near(v.backThickness,thickness);const rear=M.boards(part,{includeStatic:true}).filter(b=>b.metadata?.cabinetBack);assert.equal(rear.length===0,thickness===0);}
  for(const board of K.cornerBoards(f).filter(b=>b.partId.endsWith('/back')))near(board.d,thickness);
  if(thickness===0)assert(!K.cornerBoards(f).some(b=>b.partId.endsWith('/back')));
  const packed=P.pack({planId:'p',current:{furniture:[f]},designs:[],catalog:[]});assert.equal(packed.version,60);assert.deepEqual(P.unpack(packed).current.furniture[0].kitchen,f.kitchen);
 }
 let serial=0;const laundry=K.createLaundryCabinet({id:'laundry',cx:2000,cy:3000,rot:0,color:'#fff'},()=> 'part'+ ++serial,'left')[0];
 for(const thickness of [0,6,36]){const k=structuredClone(laundry.kitchen);k.backThickness=thickness;const host=K.configure(laundry,k);for(const part of K.laundryParts(host).filter(p=>p.furniture.cabinet))assert.equal(C.backThickness(part.furniture.cabinet),thickness);const rear=K.laundryNotchBoards(host).filter(p=>p.partId.endsWith('/rear'));assert.equal(rear.length===0,thickness===0);rear.forEach(p=>near(p.d,thickness));}
 for(const value of [-1,50.01,null,NaN]){const k=K.defaults({w:1800,d:600});k.backThickness=value;assert.throws(()=>K.configure({id:'bad',type:'counter',cx:0,cy:0,rot:0,w:1800,d:600},k),/背板/);}
 const shallow=K.defaults({w:1800,d:600});shallow.endExtensions=[{run:0,length:200,depth:50,cabinetDepth:50,backThickness:50}];assert.throws(()=>K.configure({id:'shallow',type:'counter',cx:0,cy:0,rot:0,w:1800,d:600},shallow),/板件|柜深/);
 const pure={...C.preset('entry-pegboard'),id:'pure',type:'cabinet'};pure.cabinet.pegboardParts=Object.fromEntries(Products.pegboardAssembly.parts.map(key=>[key,false]));assert(C.depthSections(pure).every(v=>v.storage===false));
 const scope=vm.createContext({window:{},FurnishCabinet:C,FurnishKitchen:K,FurnishProducts:Products});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/cabinet-form-controls.js'),'utf8'),scope);
 for(const template of ['storage','entry-console','sideboard-fridge','entry-pegboard']){const f={...C.preset(template),type:'cabinet'};const html=scope.cabinetBackControls(f);assert(html.includes('id="cab-back-thickness"'));assert(html.includes('min="0"'));assert(html.includes('净深'));}
 const fixed={...C.preset('book-y52y09-low'),type:'bookshelf_yeswood_y52y09'};assert(scope.cabinetBackControls(fixed).includes('disabled'));
 console.log(`PASS shared rear components across ${count} template/thickness cases, production/recorder, sections, zero/pegboard hatches, transforms, thresholds, v60 and straight/L/U inheritance`);
})().catch(e=>{console.error(e);process.exitCode=1;});
