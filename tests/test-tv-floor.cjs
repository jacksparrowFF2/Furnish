const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),SVG=require('../src/render/furniture-svg.js');
(async()=>{
 const f={id:'floor-tv',type:'tvstand',cx:0,cy:0,rot:0,color:'#cbb08b',...C.preset('tv-floor')};C.validate(f);
 assert.equal(f.cabinet.plinth,0);assert.equal(C.layout(f).length,5);assert.equal(f.cabinet.columns[2].cableGap,30);
 for(const i of [0,1,3,4]){assert.equal(f.cabinet.columns[i].top,'fixed');assert.equal(f.cabinet.columns[i].drawers.length,1);assert.equal(f.cabinet.columns[i].drawers[0].height,204);}
 const opened=C.toggle(f,2,undefined,true);assert.equal(opened.cabinet.columns[2].topOpen,true);assert.equal(f.cabinet.columns[2].topOpen,false);assert.deepEqual(C.specification(opened),C.specification(f));
 assert.deepEqual(P.unpack(P.pack({planId:'demo',current:{furniture:[opened]},designs:[],catalog:[]})).current.furniture[0].cabinet,opened.cabinet);
 const resized=D.resizeFurniture(opened,{w:3600,h:200});C.validate(resized);assert.equal(resized.cabinet.columns[2].cableGap,30);
 assert.equal(C.openingZones(f).filter(z=>z.kind==='cabinetdrawer').length,5);
 const zone=C.openingZones({...f,rot:90,flip:true}).find(z=>z.kind==='cabinetdrawer'&&z.column===2);assert(Math.abs(zone.poly[2][0]-zone.poly[1][0]+280)<1e-8);
 for(const value of [-1,101,NaN,'30']){const bad=structuredClone(f);bad.cabinet.columns[2].cableGap=value;assert.throws(()=>C.validate(bad),/留缝/);}
 const bad=structuredClone(f);bad.cabinet.columns[2].drawers=[{height:60,open:false}];assert.throws(()=>C.validate(bad),/上盖/);
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const build=f=>ctx.FurnishCabinetModel.build(THREE,f,box),closed=build(f),size=new THREE.Box3().setFromObject(closed),v=size.getSize(new THREE.Vector3());
 assert(Math.abs(size.min.y)<1e-8);assert(Math.abs(v.x-f.w/1000)<1e-8);assert(Math.abs(v.y-f.h/1000)<1e-8);assert(Math.abs(v.z-f.d/1000)<1e-8);
 const ray=new THREE.Raycaster();const hit=(x,z)=>{ray.set(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(closed,true)[0];};
 assert.equal(hit(C.layout(f)[2].center/1000,0).object.userData.cabinetPart.lid,true);
 const sideOpen=build(C.toggle(f,0,0));sideOpen.updateMatrixWorld(true);const sideRay=new THREE.Raycaster(new THREE.Vector3(C.layout(f)[0].center/1000,1,0),new THREE.Vector3(0,-1,0));assert(Math.abs(sideRay.intersectObject(sideOpen,true)[0].point.y-.24)<1e-8,'ordinary side drawer leaves its top fixed');
 let sideFront;sideOpen.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.column===0&&o.userData.cabinetPart.drawer===0&&!sideFront)sideFront=o;});assert(Math.abs(sideFront.getWorldPosition(new THREE.Vector3()).z-(.2-.009+.28))<1e-8);
 assert(hit(0,-.19).point.y<.03,'rear slot reaches the open compartment, not a solid top');
 const openModel=build(opened);let lid;openModel.traverse(o=>{if(o.userData.cabinetPart?.lid&&o.userData.cabinetPart.column===2)lid=o;if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});assert.equal(lid.parent.rotation.x,0);assert(Math.abs(lid.parent.position.z-.48)<1e-8);assert(Math.abs(new THREE.Box3().setFromObject(openModel).max.y-.24)<1e-8);assert(new THREE.Box3().setFromObject(openModel).max.z>.47);
 const svg=SVG.render(f.type,f.w,f.d,f.color,{ink:'#111'},f);assert(!svg.includes('NaN'));assert(svg.includes('<path'));
 console.log('PASS floor TV cabinet: zero plinth, real cable opening, lid motion, bounds, resize, import and purchase specification');
})().catch(e=>{console.error(e);process.exit(1)});
