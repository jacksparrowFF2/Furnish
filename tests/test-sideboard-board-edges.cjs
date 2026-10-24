const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));
 vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const id of ['sideboard-wall','sideboard-fridge'])for(const thickness of [18,22,30]){
  let f={id,type:'cabinet',cx:2000,cy:2000,rot:37,flip:true,...C.preset(id)};
  f.w+=(f.cabinet.columns.length+1)*(thickness-f.cabinet.thickness);f.cabinet.thickness=thickness;C.validate(f);
  f=C.resize(f,{...f,w:f.w+200,h:f.h+100,d:f.d+80});
  const before=JSON.stringify(f),g=ctx.FurnishCabinetModel.build(THREE,f,box),parts=new Map(),sides=[];
  g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3().setFromObject(o);if(o.userData.cabinetSide)sides.push(b);if(o.userData.cabinetSection&&!o.userData.cabinetPart)parts.set(o.userData.cabinetSection,b);});
  const s=f.cabinet.sideboard,back=-f.d/2000,t=thickness/1000;
  for(const section of ['bottom','baseTop','displayBottom','displayTop','top']){
   const b=parts.get(section),D=(['bottom','baseTop'].includes(section)?s.lowerDepth:s.upperDepth)/1000;
   assert(Math.abs(b.min.z-back)<1e-7);assert(Math.abs(b.max.z-(back+D-t))<1e-7,section+' is flush with side front, without a panel-thickness bump');
   assert(sides.some(side=>Math.abs(side.max.z-b.max.z)<1e-7),'matching side front exists');
   assert(Math.abs(b.max.x-f.w/2000)<1e-7,'horizontal boards align with outer right edge');
  }
  assert(Math.abs(parts.get('counter').max.z-(back+s.lowerDepth/1000))<1e-7,'counter keeps its full nominal depth');
  assert.equal(JSON.stringify(f),before,'production construction does not migrate stored configuration');
  const restored=P.unpack(P.pack({planId:'test',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored,f);
 }
 console.log('PASS sideboard structural fronts are flush with side panels at varied thickness/dimensions; full worktop and stored structure preserved');
})().catch(e=>{console.error(e.message);process.exit(1);});
