const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js');
const base={...C.preset('wall'),id:'wall',name:'吊柜',type:'kitchenwall',w:1600,cx:2000,cy:2000,rot:0,mountHeight:1660};
const host=C.configureHoodBay(base),hood={id:'hood',name:'烟机',type:'rangehood_fotile_jcd10ta',color:'#111',w:900,d:350,cx:1800,cy:2000,rot:0,mountHeight:1315};
assert.equal(base.cabinet.hoodBayHeight,undefined);assert.equal(C.hoodBay(host).center,0);assert.deepEqual(C.widths(host),[514,500,514]);
const centered=C.centerHoodInBay(host,hood);assert.equal(centered.cx,2000);assert.equal(centered.cy,hood.cy);assert.equal(centered.mountHeight,1315);
const plan={rooms:[{id:'r',name:'房间',poly:[[0,0],[8000,0],[8000,8000],[0,8000]]}],walls:[],doors:[],windows:[],beams:[]};
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const h={...host,rot,flip},f=C.centerHoodInBay(h,hood,true);assert(C.hoodBayFit(h,f).fits);assert.equal(f.mountHeight,1315);assert.equal(G.collisions([h,f]).length,0);assert(!P.spaceCheck(plan,[h,f],{scanPassages:false}).some(v=>v.kind==='overlap'));
 const shifted=C.centerHoodInBay(h,{...f,cx:f.cx+25*Math.cos(rot*Math.PI/180),cy:f.cy+25*Math.sin(rot*Math.PI/180)});assert(Math.abs(shifted.cx-f.cx)<1e-6&&Math.abs(shifted.cy-f.cy)<1e-6);
}
const exact=C.configureHoodBay(host,480,175),f=C.centerHoodInBay(exact,hood,true);assert(C.hoodBayFit(exact,f).fits);
assert(!C.hoodBayFit(C.configureHoodBay(host,479,175),f).fits);assert(!C.hoodBayFit(C.configureHoodBay(host,480,174),f).fits);
for(const bad of [{cx:f.cx+1},{cy:f.cy-1},{mountHeight:f.mountHeight+1},{rot:90},{mountHeight:NaN}])assert(!C.hoodBayFit(exact,{...f,...bad}).fits);
assert.throws(()=>C.centerHoodInBay(host,{...hood,locked:true}));assert.throws(()=>C.configureHoodBay({...base,w:600}));assert.throws(()=>C.editStructure(host,1,'addDrawer'));
assert.equal(C.widths(C.resize(host,{...host,w:1800,d:350,h:700}))[1],500);
const payload={planId:'test',current:{furniture:[host,f]},designs:[{id:'saved',name:'烟机',work:{furniture:[host,f]}}],catalog:[]},saved=P.unpack(P.pack(payload));assert.deepEqual(saved.current.furniture,[host,f]);assert.deepEqual(saved.designs[0].work.furniture,[host,f]);
let items=saved.current.furniture;for(let i=0;i<3;i++)items=D.restoreFurniture(items,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(items,[host,f]);
const replaced=D.replaceFurniture(host,{type:'cabinet',name:'替换柜',w:1600,d:350,h:700,color:'#eee'});assert.equal(replaced.cabinet?.hoodBayHeight,undefined);assert.equal(C.hoodBay(base),null);
let copyId=0;const copied=D.pasteFurniture({items:[host,f],cx:2000,cy:2000},{x:3000,y:3000},{x:0,y:0,w:8000,h:8000},()=> 'copy-'+(++copyId)).items;assert(C.hoodBayFit(copied[0],copied[1]).fits);assert.notEqual(copied[0].id,host.id);copied[0].cabinet.hoodBayHeight=180;assert.equal(host.cabinet.hoodBayHeight,175);
const issue={kind:'overlap',id:host.id,otherId:f.id},fingerprint=P.checkFingerprint(issue,plan,[host,f],800);assert.equal(P.checkFingerprint(issue,plan,[{...host,color:'#fff',price:100},f],800),fingerprint);assert.notEqual(P.checkFingerprint(issue,plan,[C.configureHoodBay(host,500,180),f],800),fingerprint);
assert.throws(()=>P.unpack(P.pack({...payload,current:{furniture:[{...host,type:'cabinet'},f]}})));
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C,FurnishProducts:R}));
 for(const name of ['cabinet-model','fotile-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const model=ctx.FurnishCabinetModel.build(THREE,host,box),appliance=ctx.FurnishFotileModel.build(THREE,{...hood,cx:0,cy:0}),parts=[];model.position.y=host.mountHeight/1000;model.updateMatrixWorld(true);appliance.updateMatrixWorld(true);let cover;
 const doorGroups=model.children.filter(o=>o.userData.motion?.kind==='cabinetdoor');assert.equal(doorGroups.length,2,'one pair of doors covers all three interior zones');
 assert.deepEqual(doorGroups.map(o=>o.userData.motion.column),[0,2]);assert(Math.abs(doorGroups[0].position.x+.8)<1e-6);assert(Math.abs(doorGroups[1].position.x-.8)<1e-6);
 const faces=doorGroups.map(o=>o.children.find(m=>m.isMesh&&m.geometry.parameters?.depth===.018)),bounds=faces.map(o=>new THREE.Box3().setFromObject(o));assert(Math.abs(bounds[0].min.x+.799)<1e-6&&Math.abs(bounds[0].max.x+.001)<1e-6);assert(Math.abs(bounds[1].min.x-.001)<1e-6&&Math.abs(bounds[1].max.x-.799)<1e-6);
 const zones=C.openingZones(host,{passage:0});assert.equal(zones.length,2);assert.deepEqual(zones.map(z=>z.column),[0,2]);
 const opened=C.toggle(C.toggle(host,0),2),openModel=ctx.FurnishCabinetModel.buildRaw(THREE,opened,box),openGroups=openModel.children.filter(o=>o.userData.motion?.kind==='cabinetdoor');assert(Math.abs(openGroups[0].rotation.y+Math.PI/2)<1e-6&&Math.abs(openGroups[1].rotation.y-Math.PI/2)<1e-6);
 const legacy=structuredClone(host);legacy.cabinet.columns[1].door='double';const beforeLegacy=JSON.stringify(legacy),legacyModel=ctx.FurnishCabinetModel.buildRaw(THREE,legacy,box);assert.equal(legacyModel.children.filter(o=>o.userData.motion?.kind==='cabinetdoor').length,2);assert.equal(JSON.stringify(legacy),beforeLegacy,'old saved structure is read without rewriting');
 appliance.traverse(o=>{if(o.userData.fotilePart==='chimney-cover')cover=new THREE.Box3().setFromObject(o);});model.traverse(o=>{if(o.isMesh)parts.push(new THREE.Box3().setFromObject(o));});
 assert(cover);assert(Math.abs(cover.min.y-1.660)<1e-6);assert(Math.abs(cover.max.y-1.835)<1e-6);
 for(const b of parts){const size=b.clone().intersect(cover).getSize(new THREE.Vector3());assert(size.x<1e-6||size.y<1e-6||size.z<1e-6,'production boards must not penetrate chimney');}
 const raw=ctx.FurnishCabinetModel.buildRaw(THREE,host,box);raw.updateMatrixWorld(true);assert(Math.abs(new THREE.Raycaster(new THREE.Vector3(0,-.1,0),new THREE.Vector3(0,1,0)).intersectObject(raw,true)[0].point.y-.175)<1e-6);
 const sides=C.layout(host);for(const i of [0,2]){const hit=new THREE.Raycaster(new THREE.Vector3(sides[i].center/1000,-.1,0),new THREE.Vector3(0,1,0)).intersectObject(raw,true)[0];assert(hit&&Math.abs(hit.point.y)<1e-6);}
 console.log('PASS hood bay: real board cavity/chimney fit, flush/center transforms, thresholds, collisions, validation, resize and project/restore roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
