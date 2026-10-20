const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.01,`${a} != ${b}`);
const host={id:'host',type:'cabinet',...C.preset('base'),cx:2000,cy:2000,rot:0};host.cabinet.plinth=80;host.cabinet.columns=[{door:'double',doorOpen:false,handle:'none',shelves:[],drawers:[]}];
const device={id:'device',type:'water_purifier_mijia_1200g',name:'净水器',color:'#fff',cx:2000,cy:2000,w:163,d:445,h:379,mountHeight:98,rot:0};
const options={furniture:[host,device]},before=JSON.stringify(options),gaps=S.directional(device,options),expected={l:300.5,r:300.5,t:59.5,b:59.5};
for(const [dir,n]of Object.entries(expected)){near(gaps[dir].distance,n);assert(gaps[dir].cabinetInterior);assert(gaps[dir].entity.boardKey);assert(!gaps[dir].containedBoundary);}
let interior=S.cabinetInterior(device,options);near(interior.bottom.distance,0);near(interior.top.distance,355);assert.equal(interior.collisions.length,0);assert(!G.volumeOverlap(host,device));assert.deepEqual(G.collisions(options.furniture),[]);
near(S.cabinetInterior({...device,mountHeight:0},options).bottom.distance,-98); // Device is below the actual inner floor, rather than "no bottom board".
const plan={walls:[],wins:[],doors:[],rooms:[{id:'room',name:'厨房',poly:[[0,0],[8000,0],[8000,8000],[0,8000]]}]};
assert(!P.spaceCheck(plan,options.furniture,{scanPassages:false}).some(i=>i.kind==='overlap'));
for(const gap of [0,.001,40,300.5]){const moved=D.placeAtDirectionalGap(plan,{furniture:options.furniture},device.id,'l',gap);near(S.directional(moved,{furniture:[host,moved]}).l.distance,gap);assert(!G.volumeOverlap(host,moved));}
assert.throws(()=>D.placeAtDirectionalGap(plan,{furniture:options.furniture},device.id,'l',1000),/重叠|参考|阻挡/);
for(const delta of [-.001,0,.001]){const f={...device,cx:host.cx-300.5-delta};assert.equal(G.volumeOverlap(host,f),delta>0,'actual side board contact/penetration');}
const shelf=structuredClone(host);shelf.cabinet.columns[0].shelves=[450];near(S.cabinetInterior(device,{furniture:[shelf]}).top.distance,71);
shelf.cabinet.columns[0].shelves=[300];assert(S.cabinetInterior(device,{furniture:[shelf]}).collisions.some(v=>v.boardName==='层板'));assert(G.collisions([shelf,device]).length);assert(P.spaceCheck(plan,[shelf,device],{scanPassages:false}).some(i=>i.kind==='overlap'));
const high={...device,mountHeight:900};assert(Object.values(S.directional(high,{furniture:[host]})).every(m=>m===null));
const unknown={...device,type:'unregistered',h:undefined};assert(S.cabinetInterior(unknown,{furniture:[host]}).pending);
// Every device type uses geometry, including imported envelope-only devices.
for(const type of ['water_purifier_mijia_1200g','dishwasher','washer','unregistered']){const f={...device,type},h={...host,laundryFloorOpen:true};assert(!G.volumeOverlap(h,f));near(S.directional(f,{furniture:[h]}).l.distance,300.5);}
// Same physical cabinet/device pose under arbitrary world rotations and mirrors.
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){const h={...host,rot,flip},f={...device,rot,flip},m=S.directional(f,{furniture:[h,f],rotation:-rot});for(const [dir,n]of Object.entries(expected))near(m[dir].distance,n);assert(!G.volumeOverlap(h,f));near(S.cabinetInterior(f,{furniture:[h]}).top.distance,355);}
const open=structuredClone(host);open.cabinet.columns[0].doorOpen=true;open.cabinet.columns[0].doorAngle=90;assert.equal(S.directional(device,{furniture:[open]}).b,null,'no invented wall across an opened front');
const mixed=[{...device,id:'low',cx:1900,h:100},{...device,id:'high',cx:2100,mountHeight:600,h:100}];open.cabinet.columns[0].door='up';open.cabinet.columns[0].doorAngle=57;
const combined=S.directional(mixed,{furniture:[open]});for(const dir of ['l','r','t','b']){const individual=mixed.map(f=>S.directional(f,{furniture:[open]})[dir]).filter(Boolean);if(individual.length)near(combined[dir].distance,Math.min(...individual.map(v=>v.distance)));else assert.equal(combined[dir],null);}
const raisedGap=S.directional(device,{furniture:[open]}).b.distance,underDoor=D.placeAtDirectionalGap(plan,{furniture:[open,device]},device.id,'b',raisedGap-100);near(underDoor.cy,device.cy+100);assert(!G.volumeOverlap(open,underDoor),'movement uses the same height-clipped door as measurement');
const kitchen=K.configure({...host,type:'counter',cabinet:undefined},{version:1,shape:'straight',depth:600,baseHeight:820,thickness:20,modules:[{run:0,width:800,role:'sink'}]});
for(const shape of ['straight','L','U'])for(const rot of [0,37,90,270])for(const flip of [false,true]){const k=structuredClone(kitchen.kitchen);k.shape=shape;if(shape!=='straight')k.modules.push({run:1,width:800,role:'door'});if(shape==='U')k.modules.push({run:2,width:800,role:'door'});const h=K.configure({...kitchen,rot,flip},k),module=K.cabinetLayout(h).find(m=>m.index===0),at=K.world(h,module.x,module.y),f={...device,mountHeight:118,cx:at[0],cy:at[1],rot:((rot+(flip?-module.rot:module.rot))+360)%360};const m=S.directional(f,{furniture:[h,f],rotation:-rot});assert(Object.values(m).some(v=>v?.cabinetInterior));assert(!G.volumeOverlap(h,f),shape+' real cavity');}
const restored=P.unpack(P.pack({planId:'inside',current:{furniture:[host,device]},designs:[{name:'柜内',work:{furniture:[host,device]}}],catalog:[]}));assert.deepEqual(S.directional(restored.current.furniture[1],{furniture:restored.current.furniture}),gaps);for(let i=0;i<3;i++)restored.current.furniture=D.restoreFurniture(restored.current.furniture,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(restored.current.furniture,[host,device]);assert.equal(JSON.stringify(options),before);
assert(P.checkFingerprint({kind:'overlap',id:device.id},plan,[host,device],800).includes('cabinet-inner-solids-v1'));
const issue={kind:'overlap',id:device.id},fingerprint=P.checkFingerprint(issue,plan,[host,device],800),painted=structuredClone(host);painted.color='#112233';painted.cabinet.columns[0].doorColor='#ff0000';painted.cabinet.columns[0].finish='wood';painted.price=100;painted.purchaseStatus='planned';assert.equal(P.checkFingerprint(issue,plan,[painted,device],800),fingerprint,'cosmetics and purchasing do not invalidate board geometry confirmation');
const legacy={id:'legacy',type:'cabinet',name:'收纳柜',cx:2000,cy:2000,w:1000,d:450,rot:0};assert.notEqual(P.checkFingerprint(issue,plan,[legacy,device],800),P.checkFingerprint(issue,plan,[{...legacy,name:'餐边柜'},device],800),'effective legacy default geometry is part of confirmation');
const broken={...host,id:'broken',cabinet:{...host.cabinet,entry:{editable:false},columns:null}},brokenSnapshot=JSON.stringify(broken);assert.deepEqual(S.directional(device,{furniture:[broken,host]}),gaps);assert(P.review(plan,{furniture:[broken,device],rooms:{}}).some(i=>i.kind==='model'&&i.pending));assert.equal(JSON.stringify(broken),brokenSnapshot,'invalid saved models remain intact and cannot break valid board measurements');
// Compare every static and moving recorder board to production meshes, including
// sideboard/entry special structures and current open door/drawer transforms.
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.position.set(x,y+h/2,z);return mesh;};let checked=0;
 for(const [id]of C.templates)for(const opened of [false,true]){
  const f={id:'test',type:C.templateType(id),...C.preset(id),cx:0,cy:0,rot:0};if(f.type==='kitchenwall')f.mountHeight=0;
  if(opened)for(const col of f.cabinet.columns){col.doorOpen=true;col.doorAngle=57;col.topOpen=true;col.drawers.forEach(d=>{d.open=true;d.extension=.65;});}
  const model=Model.buildRaw(T,f,box);model.updateMatrixWorld(true);const solids=M.solidParts(f),meshes=[];model.traverse(o=>{if(o.isMesh&&o.geometry.type!=='SphereGeometry')meshes.push(o);});
  for(const [i,mesh]of meshes.entries()){
   const parts=solids.filter(p=>p.boardKey==='board:'+i);const geometry=new T.Box3().setFromObject(mesh);if(geometry.getSize(new T.Vector3()).toArray().some(v=>v<=0))continue;assert(parts.length,id+' board '+i);
   const vertices=parts.flatMap(p=>p.vertices);for(const [axis,key]of [[0,'x'],[1,'y'],[2,'z']]){near(Math.min(...vertices.map(p=>p[axis])),geometry.min[key]*1000);near(Math.max(...vertices.map(p=>p[axis])),geometry.max[key]*1000);}checked++;
  }
 }
 let rays=0;
 for(const door of ['up','down']){
  const f={...structuredClone(open),cx:0,cy:0};f.cabinet.columns[0].door=door;
  const model=Model.buildRaw(T,f,box);model.updateMatrixWorld(true);const meshes=[];model.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.leaf===0)meshes.push(o);});
  const part=M.solidParts(f).find(p=>p.boardName==='柜门／抽屉');assert(part);
  for(const range of [{bottom:100,top:150},{bottom:450,top:500},{bottom:750,top:800}]){
   const poly=M.section(part,range);
   for(let x=-350.123;x<400;x+=100)for(let q=-350.321;q<1100;q+=75){
    const hits=new T.Raycaster(new T.Vector3(x/1000,-10,q/1000),new T.Vector3(0,1,0)).intersectObjects(meshes,true).map(h=>h.point.y*1000),actual=hits.length&&Math.min(range.top,Math.max(...hits))-Math.max(range.bottom,Math.min(...hits))>1e-6;
    assert.equal(poly.length>2&&G.inPoly(x,q,poly),!!actual,'height-clipped lift door follows actual production rays');rays++;
   }
  }
 }
 console.log(`PASS cabinet interiors: six directions, signed penetration, placement, shelves, unknowns, generic devices, mixed-height groups, open doors, straight/L/U transforms, project/restore, ${checked} production boards and ${rays} height-clipped door rays`);
})().catch(e=>{console.error(e);process.exitCode=1;});
