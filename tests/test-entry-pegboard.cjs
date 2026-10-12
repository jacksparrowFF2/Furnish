const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const f={id:'entry',type:'cabinet',cx:0,cy:0,rot:0,...C.preset('entry-pegboard')};C.validate(f);
 const col=f.cabinet.columns[0];assert.equal(col.doorBottom-f.cabinet.thickness-col.drawers.reduce((n,v)=>n+v.height,0),1418);
 const resized=C.resize(f,{...f,h:2600});C.validate(resized);assert.equal(resized.cabinet.columns[0].doorBottom,resized.cabinet.columns[0].shelves[0]+18);
 const moved=C.moveShelf(f,0,0,1700);assert.equal(moved.cabinet.columns[0].doorBottom,1718);assert.equal(f.cabinet.columns[0].doorBottom,1796);
 for(const value of [-1,NaN,2400,'1796']){const bad=structuredClone(f);bad.cabinet.columns[0].doorBottom=value;assert.throws(()=>C.validate(bad));}
 const bad=structuredClone(f);bad.cabinet.columns[0].shelves=[];assert.throws(()=>C.validate(bad),/层板/);
 const opened=C.toggle(C.toggle(f,0),0,1);assert.deepEqual(C.specification(opened),C.specification(f));
 assert.deepEqual(P.unpack(P.pack({planId:'demo',current:{furniture:[opened]},designs:[],catalog:[]})).current.furniture[0].cabinet,opened.cabinet);
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext({FurnishCabinet:C});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const build=f=>ctx.FurnishCabinetModel.build(THREE,f,box),closed=build(f),bounds=new THREE.Box3().setFromObject(closed),size=bounds.getSize(new THREE.Vector3());
 for(const [axis,mm] of [['x',f.w],['y',f.h],['z',f.d]])assert(Math.abs(size[axis]-mm/1000)<1e-7,axis+' bounds');
 let board,door;closed.traverse(o=>{if(o.userData.cabinetPegboard)board=o;if(o.isMesh&&o.userData.cabinetPart?.column===0&&o.userData.cabinetPart.drawer===undefined)door=o;if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
 assert(board.geometry.parameters.shapes.holes.length>100);assert(Math.abs(new THREE.Box3().setFromObject(door).min.y-1.797)<1e-7);
 const open=build(opened);let front;open.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front'&&o.userData.cabinetPart.drawer===1)front=o;});assert(Math.abs(front.getWorldPosition(new THREE.Vector3()).z-(.175-.009+.245))<1e-7);
 console.log('PASS entry pegboard: 1418 mm niche, exterior bounds, upper doors, drawer travel, shelf linkage, resize, validation and project round trip');
})().catch(e=>{console.error(e);process.exit(1)});
