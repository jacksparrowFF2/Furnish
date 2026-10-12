const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext({FurnishCabinet:C});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const near=(a,b,message)=>assert(Math.abs(a-b)<1e-7,message);
 for(const template of ['tv-floor','sideboard-drawers'])for(const thickness of [12,18,30])for(const extension of [0,.5,1]){
  const f={type:'cabinet',color:'#cbb08b',...C.preset(template)};const before=structuredClone(f);f.cabinet.thickness=thickness;C.scaleWidths(before,f);
  if(template==='tv-floor')for(const col of f.cabinet.columns)for(const drawer of col.drawers)drawer.height=f.h-2*thickness;
  for(const col of f.cabinet.columns){col.topOpen=extension>0;for(const drawer of col.drawers){drawer.open=extension>0;drawer.extension=extension;}}
  C.validate(f);const model=ctx.FurnishCabinetModel.build(THREE,f,box),groups=new Set();model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')groups.add(o.parent);});
  assert.equal(groups.size,template==='tv-floor'?5:8);
  for(const group of groups){
   const parts=group.children.filter(o=>o.userData.cabinetDrawerBoard),bounds=role=>parts.filter(o=>o.userData.cabinetDrawerBoard===role).map(o=>new THREE.Box3().setFromObject(o));
   const [front]=bounds('front'),[bottom]=bounds('bottom'),sides=bounds('side'),[back]=bounds('back');
   near(bottom.max.z,front.min.z,'bottom joins front panel');
   for(const side of sides){near(side.max.z,front.min.z,'side joins front panel');near(side.min.y,bottom.max.y,'side rests on bottom panel');assert(side.max.x>=front.min.x&&side.min.x<=front.max.x);if(back)near(side.min.z,back.max.z,'side joins rear panel');}
   if(back)near(bottom.min.z,back.max.z,'bottom joins rear panel');
  }
 }
 console.log('PASS drawer panel joints remain connected when closed, half open and fully open across panel thicknesses');
})().catch(e=>{console.error(e);process.exit(1)});
