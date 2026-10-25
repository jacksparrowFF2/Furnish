const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),F=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js'),S=require('../src/core/service-core.js'),Downlight=require('../src/render/downlight-model.js');
const f={id:'cab',name:'柜',type:'cabinet',...C.preset('sideboard-drawers'),cx:3000,cy:3000,rot:0},other={id:'chair',name:'椅子',type:'chair',cx:3000,cy:3000,w:400,d:400,h:800,rot:0};
const plan={walls:[],doors:[],rooms:[],ceilingHeight:2800,markers:[{id:'pipe',name:'下水',kind:'drain',at:[3000,3000],radius:30}]};
const hits=(p=plan,obj=other)=>P.spaceCheck(p,[obj],{scanPassages:false});
assert(hits().some(v=>v.kind==='pipe'&&!v.pending));assert(hits(plan,f).some(v=>v.kind==='pipe'&&v.cut));
assert(hits(plan,f).some(v=>v.kind==='cabinetdrawer'&&v.markerId==='pipe'),'internal riser blocks a notched moving tray');
const tangent={...plan,markers:[{...plan.markers[0],at:[3250,3000]}]};assert(!hits(tangent).some(v=>v.kind==='pipe'));
assert(hits({...tangent,markers:[{...tangent.markers[0],pipeDiameter:140}]}).some(v=>v.kind==='pipe'));
assert(!hits(plan,{...other,type:'washer',mountHeight:2800}).some(v=>v.kind==='pipe'));
const door=C.openingZones(f).find(z=>z.kind==='cabinetdrawer'),center=door.poly.reduce((a,p)=>[a[0]+p[0]/door.poly.length,a[1]+p[1]/door.poly.length],[0,0]);
assert(hits({...plan,markers:[{...plan.markers[0],at:center}]},f).some(v=>v.kind==='cabinetdrawer'&&v.markerId==='pipe'));
const issue=hits()[0],key=P.checkFingerprint(issue,plan,[other],800);assert.notEqual(key,P.checkFingerprint(issue,tangent,[other],800));assert.notEqual(key,P.checkFingerprint(issue,{...plan,markers:[{...plan.markers[0],pipeDiameter:160}]},[other],800));
assert.equal(key,P.checkFingerprint(issue,plan,[{...other,color:'#fff',price:123}],800));
const local=S.local({...f,rot:90,flip:true},{at:[3100,3200]});assert(Math.abs(local.at[0]+200)<1e-8);assert(Math.abs(local.at[1]+100)<1e-8);
(async()=>{
 const html=fs.readFileSync('index.html','utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const context=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C,FurnishServices:S,FurnishProducts:require('../src/core/product-rules.js')}));for(const file of ['solid-cut','cabinet-model'])vm.runInContext(fs.readFileSync('src/render/'+file+'.js','utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide}));mesh.position.set(x,y+h/2,z);return mesh;};
 const build=(f,p=plan)=>context.FurnishCabinetModel.build(THREE,f,box,{plan:p});
 const ray=(g,x,z)=>new THREE.Raycaster(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0)).intersectObject(g,true);
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const cabinet={...f,rot,flip},pipe={...plan.markers[0],at:[f.cx+70,f.cy+40]},p={...plan,markers:[pipe]},g=build(cabinet,p),l=S.local(cabinet,S.pipes(p)[0]);
  assert.equal(ray(g,l.at[0]/1000,l.at[1]/1000).length,0,'through-hole clears production boards');assert(ray(g,-.5,-.12).length>0,'surrounding boards remain');
  g.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
 }
 const base=build(f),opened=build(C.toggle(f,0,0));let closedPart,openPart;for(const [g,name]of [[base,'closed'],[opened,'open']])g.traverse(o=>{if(o.isMesh&&o.userData.cabinetDrawerBoard==='bottom'&&o.userData.cabinetPart?.column===0){if(name==='closed')closedPart=o;else openPart=o;}});
 assert.deepEqual([...closedPart.geometry.attributes.position.array],[...openPart.geometry.attributes.position.array],'cut geometry remains fixed to the moving drawer');
 const cutCount=g=>{let n=0;g.traverse(o=>{if(o.userData.serviceCuts)n++;});return n;};assert(cutCount(base)>0);
 const away=build(f,{...plan,markers:[{...plan.markers[0],at:[9000,9000]}]});assert.equal(cutCount(away),0,'moving pipe away restores original boards');
 const edge=build(f,{...plan,markers:[{...plan.markers[0],at:[f.cx+f.w/2,f.cy]}]});assert.equal(ray(edge,f.w/2000-.01,0).length,0,'edge notch clears sides');
 const scene=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{state:{furniture:[f],rooms:{}},PLAN:plan,FurnishProducts:require('../src/core/product-rules.js'),FurnishServices:S,FurnishProject:P,FurnishCabinet:C,FurnishDesign:{laundryStack:()=>null},furnG:new THREE.Group(),opt:{furn:true},selKey:null,applyGrow:()=>{},M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,clearGroup:g=>g.clear(),buildFurniture:obj=>{const g=build(obj,scene.PLAN);g.userData.fid=obj.id;return g;}}));
 scene.FurnishDownlightModel=Downlight;scene.opt.lamps=true;
 scene.furnitureError=require('../src/core/product-rules.js').modelError;scene.furnitureRenderErrors=new Map();scene.syncModelErrors=()=>{};
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),scene);vm.runInContext('buildFurn()',scene);const first=scene.furnG.children[0];
 scene.PLAN={...plan,markers:[{...plan.markers[0],pipeDiameter:180}]};vm.runInContext('buildFurn()',scene);assert.notEqual(scene.furnG.children[0],first,'diameter changes invalidate actual cabinet cache');
 const second=scene.furnG.children[0];scene.state.furniture=[{...f,cx:f.cx+2500}];vm.runInContext('buildFurn()',scene);assert.notEqual(scene.furnG.children[0],second,'cabinet movement invalidates derived cuts');
 console.log('PASS pipe entities, drawer range, tangent, vertical separation, position/diameter confirmation invalidation, production holes, edge notches, rotation/mirror and moving cut parts');
})().catch(e=>{console.error(e);process.exitCode=1;});
