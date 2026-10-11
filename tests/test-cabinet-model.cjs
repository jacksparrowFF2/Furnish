const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const context=vm.createContext({FurnishCabinet:C});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const build=f=>context.FurnishCabinetModel.build(THREE,f,box);
 for(const t of C.templates){const f={type:'cabinet',color:'#efe6d8',...C.preset(t[0])},model=build(f),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert(Math.abs(size.y-f.h/1000)<1e-6);model.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});}
 let f={type:'cabinet',color:'#efe6d8',...C.preset('sideboard-drawers')},closed=build(f);f=C.toggle(f,0,0);const opened=build(f);
 const part=(model,drawer)=>{let found;model.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.column===0&&o.userData.cabinetPart.drawer===drawer&&!found)found=o;});return found;};
 const pos=o=>o.getWorldPosition(new THREE.Vector3());assert(Math.abs(pos(part(opened,0)).z-pos(part(closed,0)).z-f.d/1000*.7)<1e-6);
 const doorClosed=part(closed,undefined);f=C.toggle(f,0);const doorOpen=part(build(f),undefined);assert(Math.abs(doorOpen.parent.rotation.y)>1);assert.equal(doorClosed.parent.rotation.y,0);
 assert.deepEqual(C.specification(f),C.specification(C.toggle(f,0)),'opening does not change purchase specifications');
 const unequal=C.setColumnWidth(f,0,350),model=build(unequal),layout=C.layout(unequal);let shelfMesh;model.traverse(o=>{if(o.userData.cabinetShelf?.column===0)shelfMesh=o;});
 assert(Math.abs(shelfMesh.geometry.parameters.width-.35)<1e-8);assert(Math.abs(shelfMesh.position.x-layout[0].center/1000)<1e-8);
 const raised=build(C.moveShelf(unequal,0,0,600));let raisedMesh;raised.traverse(o=>{if(o.userData.cabinetShelf?.column===0)raisedMesh=o;});assert(Math.abs(raisedMesh.position.y-shelfMesh.position.y-(600-f.cabinet.columns[0].shelves[0])/1000)<1e-8);
 console.log('PASS all cabinet meshes have finite dimensions, correct heights, hinge rotations and drawer travel');
})().catch(e=>{console.error(e);process.exit(1)});
