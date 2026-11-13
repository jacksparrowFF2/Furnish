'use strict';
const assert=require('node:assert/strict');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js'),C=require('../src/core/ceiling-core.js'),B=require('../src/render/bath-heater-model.js'),N=require('../src/render/panel-bull-g12-model.js'),L=require('../src/render/downlight-model.js');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<.02,`${a} != ${b}`);
const lamp={id:'soft',type:'surface_light',name:'通用规划占位',cx:1000,cy:1000,w:800,d:450,h:50,mountHeight:2500,rot:0,color:'#fff'};
(async()=>{
 const T=await import(JSON.parse(require('node:fs').readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 assert(require('../src/data/catalog.js').library.flatMap(c=>c.items).some(i=>i[0]===lamp.type));P.validate(lamp);assert.equal(P.initial(lamp).mountHeight,2500);assert(!P.definition(lamp).ceilingPanel,'surface light never opens an aluminum panel');
 const small=B.build(T,{...lamp,w:240,d:160}),smallLight=small.children.find(o=>o.isLight&&!o.userData.ceilingPanelBounce);near(smallLight.intensity,16);
 const before=copy(lamp),g=B.build(T,lamp),box=new T.Box3().setFromObject(g);near(box.min.y*1000,2500);near(box.max.y*1000,2550);near((box.max.x-box.min.x)*1000,800);assert.deepEqual(lamp,before);
 const floor={rooms:[{id:'r',poly:[[0,0],[3000,0],[3000,3000],[0,3000]],ceilingHeight:2700}],floorFinish:{areas:{r:{finishedZ:60}}},furnitureDatum:'finished-floor'},f={...lamp,mountHeight:2590},vertical=D.furnitureVerticalBounds(f,floor,[f]);near(vertical.bottom,2650);near(vertical.top,2700);
 for(const rot of [0,90,31])for(const flip of [false,true]){const item={...lamp,rot,flip},parts=G.bodyParts(item);assert(parts.length);near(Math.min(...parts.map(p=>p.vertical.bottom)),2500);near(Math.max(...parts.map(p=>p.vertical.top)),2550);}
 assert.equal(C.panelReplacements({id:'c',kind:'flat',height:2500,thickness:8,polygon:[[0,0],[3000,0],[3000,3000],[0,3000]],aluminum:C.aluminumDefaults()},[{f:lamp,vertical:D.furnitureVerticalBounds(lamp)}]).length,0);
 J.validateWork({furniture:[lamp]});assert.deepEqual(copy(lamp),lamp);const resized=D.resizeFurniture(lamp,{w:900,d:500,h:60});assert.equal(resized.mountHeight,2500);near(new T.Box3().setFromObject(B.build(T,resized)).max.y*1000,2560);
 const night={id:'night',name:'低位夜灯',type:'panel_bull_g12',cx:0,cy:0,w:86,d:10,h:86,rot:0,color:'#fff',mountHeight:300,panelVariant:'nightlight'},nightGroup=N.build(T,night),lights=[];nightGroup.traverse(o=>{if(o.userData.pathLight)lights.push(o);});assert.equal(lights.length,1);assert(!lights[0].visible);const diffuser=nightGroup.children.find(o=>o.name==='diffuser');assert(diffuser.material.userData.pathLightEmitter);
 L.setLights(nightGroup,false,{night:true});assert(lights[0].visible);assert(diffuser.material.emissiveIntensity>0);L.setLights(nightGroup,true,{night:false});assert(!lights[0].visible);assert.equal(diffuser.material.emissiveIntensity,0);
 const socket=N.build(T,{...night,panelVariant:'socket5-diagonal'});let wrong=0;socket.traverse(o=>{if(o.userData.pathLight||o.material?.userData?.pathLightEmitter)wrong++;});assert.equal(wrong,0,'other faceplates never become lamps');
 const heater={...lamp,type:'bath_heater_aopu_se2',w:300,d:600,h:112,mountHeight:2343},hg=B.build(T,heater),heaterLights=[];hg.traverse(o=>{if(o.userData.ceilingPanelLight)heaterLights.push(o);});assert.equal(heaterLights.length,3);assert(hg.children.find(o=>o.name==='diffuser').material.userData.ceilingPanelEmitter);L.setLights(hg,false,{night:true});assert(heaterLights.every(o=>!o.visible));L.setLights(hg,true);assert(heaterLights.every(o=>o.visible));
 let meshCount=0;hg.traverse(o=>{if(o.isMesh)meshCount++;});assert.equal(meshCount,29,'SE2 physical geometry unchanged');
 // A crowded forward-lit scene must stay within shader/sampler budgets and
 // restore the requested lights after camera movement or top-light toggles.
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),fixtures=[];
 for(let i=0;i<40;i++){const owner=new T.Group();owner.userData.fid='fixture'+i;owner.position.x=i;const light=new T.SpotLight();light.userData.ceilingPanelLight=true;light.castShadow=true;owner.add(light);scene.add(owner);fixtures.push(light);}
 L.setLights(scene,true);const budget=L.limitLights(scene,camera);assert.equal(budget.lights,24);assert.equal(budget.shadows,6);assert(fixtures[0].visible);assert(!fixtures[39].visible);
 camera.position.x=40;L.limitLights(scene,camera);assert(fixtures[39].visible);assert(!fixtures[0].visible);L.setLights(scene,false);assert.equal(L.limitLights(scene,camera).lights,0);L.setLights(scene,true);assert.equal(L.limitLights(scene,camera).lights,24);
 const smallGPU=L.limitLights(scene,camera,{maxFragmentUniforms:256,maxTextures:8});assert.equal(smallGPU.lights,8);assert.equal(smallGPU.shadows,0);
 scene.children.at(-1).visible=false;L.limitLights(scene,camera);assert(!fixtures[39].visible,'hidden parent never relights');
 console.log('PASS surface-light production dimensions/elevation/rotation/mirror, ordinary panel exclusion, project roundtrip; night-only preview and wrong-variant negative; SE2 light preview preserves 29 production meshes');
})().catch(e=>{console.error(e);process.exitCode=1;});
