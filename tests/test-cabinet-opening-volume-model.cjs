const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const source={id:'cab',type:'cabinet',cx:2500,cy:2500,rot:0,...C.preset('sideboard-wall')};Object.assign(source.cabinet.sideboard,{baseHeight:600,nicheHeight:300,displayHeight:1300});source.cabinet.doorMaxAngle=180;C.validate(source);
 let points=0;
 for(const angle of [0,30,65.5,90,120,150,180]){
  const f=structuredClone(source);f.cabinet.columns.forEach(col=>{col.displayOpen=true;col.displayAngle=angle;});
  const zones=C.openingZones(f),model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);
  model.traverse(o=>{if(!o.isMesh||o.userData.cabinetPart?.section!=='display')return;const column=o.userData.cabinetPart.column,zone=zones.find(z=>z.section==='display'&&z.column===column),profile=zone.sweep.profile;
   const attr=o.geometry.attributes.position;
   for(let i=0;i<attr.count;i++){const v=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld),x=v.x*1000,y=v.z*1000,z=v.y*1000;
    assert(x>=zone.sweep.left-.001&&x<=zone.sweep.right+.001,'actual door width matches extrusion');
    for(let j=0;j<profile.length;j++){const a=profile[j],b=profile[(j+1)%profile.length],distance=((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(y-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);assert(distance>=-.5,'production glass/frame vertex is within 0.5 mm angular approximation of sweep');}points++;
   }
  });
 }
 for(const template of ['entry-pegboard','entry-console','sideboard-fridge','tv-floor','sideboard-drawers']){
  const f={id:template,type:'cabinet',cx:0,cy:0,rot:0,...C.preset(template)};f.cabinet.columns.forEach(col=>{col.doorOpen=true;col.displayOpen=!!f.cabinet.sideboard;col.topOpen=col.top==='drawer';col.drawers.forEach(d=>{d.open=true;d.lanes?.forEach(v=>v.open=true);});});
  const zones=C.openingZones(f),model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);
  model.traverse(o=>{const part=o.userData.cabinetPart;if(!o.isMesh||!part||part.section==='display')return;const drawer=part.drawer!==undefined||part.lid,kind=drawer?'cabinetdrawer':'cabinetdoor',ranges=zones.filter(v=>v.column===part.column&&v.kind===kind).flatMap(v=>v.ranges||[]);if(!ranges.length)return;const bounds=new THREE.Box3().setFromObject(o);assert(ranges.some(([bottom,top])=>bounds.min.y*1000>=bottom-.001&&bounds.max.y*1000<=top+.001),template+' real moving slab lies in computed height band');});
 }
 console.log('PASS '+points+' actual production glass/frame vertices across 0–180°, plus entry/sideboard/TV door and drawer height envelopes');
})().catch(e=>{console.error(e);process.exitCode=1;});
