const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const first={id:'a',type:'cabinet',cx:0,cy:0,rot:0,...C.preset('entry-pegboard')},second={id:'b',type:'cabinet',cx:937,cy:0,rot:0,...C.preset('entry-console')};
 assert.deepEqual(C.sharedSides(first,[second]),[{side:'right',owner:true}]);assert.deepEqual(C.sharedSides(second,[first]),[{side:'left',owner:false}]);
 for(const change of [{cx:947},{cy:10},{rot:90},{h:2300},{d:400}])assert.equal(C.sharedSides(first,[{...second,...change}]).length,0);
 assert.equal(C.sharedSides(first,[{...second,cabinet:{...second.cabinet,thickness:24}}]).length,0);
 assert.equal(C.sharedSides({...first,flip:true},[second])[0].side,'left');assert.equal(C.sharedSides({...first,rot:90},[{...second,cx:0,cy:937,rot:90}])[0].side,'right');
 const closed=structuredClone(second);closed.cabinet.entry.openSide='none';assert.equal(C.sharedSides(first,[closed]).length,1,'closed niche still uses one shared board');
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;},build=(f,items=[])=>ctx.FurnishCabinetModel.build(THREE,f,box,{furniture:items});
 const a=build(first,[second]),b=build(second,[first]);b.position.x=.937;const joined=new THREE.Group();joined.add(a,b);joined.updateMatrixWorld(true);
 const point=new THREE.Vector3(.328,.8,0),boards=[];joined.traverse(o=>{if(o.isMesh&&o.userData.cabinetSide&&new THREE.Box3().setFromObject(o).containsPoint(point))boards.push(o);});assert.equal(boards.length,1,'one physical board at the join');assert.equal(boards[0].userData.cabinetSharedSide,true);assert(Math.abs(boards[0].geometry.parameters.width-.018)<1e-9);
 let duplicate=false;b.traverse(o=>{if(o.userData.cabinetSide==='left')duplicate=true;});assert.equal(duplicate,false,'console does not build a second side');
 const size=new THREE.Box3().setFromObject(joined).getSize(new THREE.Vector3());assert(Math.abs(size.x-1.874)<1e-7);assert(Math.abs(size.z-.35)<1e-7);
 const hit=(x,y,z,dx,dy,dz)=>new THREE.Raycaster(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,dy,dz)).intersectObject(joined,true)[0];
 for(const [x,y] of [[-.33,2.2],[.33,2.2],[.34,2.2],[.93,2.2],[.34,.6],[.71,.6],[1.53,.6],[.33,.1],[.34,.9]]){const h=hit(x,y,1,0,0,-1);assert(h);assert.equal(h.object.material.color.getHex(),0xf3f1ec,'full-overlay face covers wood at '+x+','+y);assert(Math.abs(h.point.z-.175)<1e-7);}
 assert(hit(.4,1.1,0,-1,0,0).distance>.6,'shared board notch stays open');
 for(const x of [.32,.328,.336,.34]){const h=hit(x,1.03,.17,0,-1,0);assert(Math.abs(h.point.y-.98)<1e-7,'counter meets shared board');assert.equal(h.object.material.color.getHex(),0xbc936b);}
 const opened=build(C.toggle(first,0));opened.updateMatrixWorld(true);const exposed=new THREE.Raycaster(new THREE.Vector3(1,2.2,0),new THREE.Vector3(-1,0,0)).intersectObject(opened,true)[0];assert.equal(exposed.object.material.color.getHex(),0xbc936b,'the wooden side remains behind the open front-edge hinge');
 assert(Math.abs(new THREE.Box3().setFromObject(opened).max.z-.510)<1e-6,'production leaf actually reaches its 90-degree open pose');
 for(const model of [a,b,opened])model.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
 const standalone=build(second);let restored=false;standalone.traverse(o=>{if(o.userData.cabinetSide==='left')restored=true;});assert(restored,'separation restores own side');
 const zone=C.openingZones(first).find(v=>v.kind==='cabinetdoor');assert(Math.min(...zone.poly.map(p=>p[0]))<=-336,'finite-thickness sweep contains the closed full-overlay left edge');assert(Math.max(...zone.poly.map(p=>p[1]))>=510,'sweep includes the open production leaf reach');
 console.log('PASS shared 18 mm board: no duplicate side/lining, full-overlay white faces, wood behind open doors, notches, counter join, bounds, separation and rotated/mirrored adjacency');
})().catch(e=>{console.error(e);process.exit(1)});
