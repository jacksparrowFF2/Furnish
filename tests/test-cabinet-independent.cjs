'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js'),M=require('../src/core/cabinet-motion.js'),SVG=require('../src/render/furniture-svg.js');
const G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`),sum=a=>a.reduce((a,b)=>a+b,0),round=f=>P.unpack(P.pack({planId:'p',current:{furniture:[f]},designs:[{id:'saved',name:'saved',planId:'p',work:{furniture:[f]}}],catalog:[]})).current.furniture[0];
let cases=0;
for(const template of ['wardrobe','storage','book','shoe'])for(const rot of [0,37,90,270])for(const flip of [false,true])for(const panels of [{left:0,right:0},{left:18,right:18},{left:12.5,right:0}]){
 const f=C.repartition({id:'independent',type:template==='wardrobe'?'wardrobe':'cabinet',cx:3000,cy:4000,rot,flip,...C.preset(template)},3),before=structuredClone(f),n=C.setConstruction(f,'independent',panels),p=sum(Object.values(panels));
 assert.deepEqual(f,before);near(n.w,f.w);near(sum(C.moduleWidths(n))+p,n.w);near(sum(C.widths(n))+6*n.cabinet.thickness+p,n.w);assert.deepEqual(n.cabinet.columns.map(({width,...col})=>col),f.cabinet.columns.map(({width,...col})=>col));assert.deepEqual(round(n),n);
 const restored=D.restoreFurniture([n],{makeId:()=>'',colorFor:()=>''});assert.deepEqual(D.restoreFurniture(restored,{makeId:()=>'',colorFor:()=>''}),restored);assert.deepEqual(C.setConstruction(n,'independent',panels),n);
 const back=C.setConstruction(n,'shared');C.moduleWidths(back).forEach((v,i)=>near(v,C.moduleWidths(f)[i]));
 for(const op of ['add','copy','delete','move'])for(const grow of [true,false]){const result=C.editModules(n,op,1,{at:0,width:400,grow}).furniture;near(sum(C.moduleWidths(result))+p,result.w);assert.deepEqual(round(result),result);if(!grow||op==='move')near(result.w,n.w);}
 const grown=C.adjustModuleWidth(n,1,C.moduleWidths(n)[1]+30.125);near(grown.w,n.w+30.125);near(C.moduleWidths(grown)[0],C.moduleWidths(n)[0]);
 const fixedSource=structuredClone(n);fixedSource.cabinet.columns.forEach(col=>col.drawers=[]);const fixedMax=C.moduleWidthLimits(fixedSource,1,{grow:false}).max,fixed=C.adjustModuleWidth(fixedSource,1,fixedMax,{grow:false});near(fixed.w,n.w);near(C.moduleWidths(fixed)[2],150);assert.throws(()=>C.adjustModuleWidth(fixedSource,1,fixedMax+.01,{grow:false}));
 const scaled=C.resize(n,{...n,w:n.w+100});near(sum(C.moduleWidths(scaled))+p,scaled.w);assert.deepEqual(scaled.cabinet.endPanels,n.cabinet.endPanels);
 const repart=C.repartition(n,4);near(sum(C.moduleWidths(repart))+p,n.w);C.moduleWidths(repart).forEach(w=>near(w,(n.w-p)/4));
 const boards=M.boards(n,{includeStatic:true});assert.equal(boards.filter(b=>b.metadata.cabinetEndPanel).length,Object.values(panels).filter(Boolean).length);
 for(let i=0;i<3;i++)assert.equal(C.boxParts(n)[i].furniture.cabinet.columns.length,1);
 const zones=C.openingZones(n).filter(z=>z.kind==='cabinetdoor'),oldZones=C.openingZones(f).filter(z=>z.kind==='cabinetdoor');assert.equal(zones.length,oldZones.length);if(zones.length)near(zones[0].ranges[0][1],oldZones[0].ranges[0][1]);cases++;
}
const source=C.repartition({id:'case',type:'wardrobe',cx:0,cy:0,rot:0,...C.preset('wardrobe'),w:2295,h:2450},3),caseF=C.setConstruction(source,'independent',{left:18,right:18});
caseF.cabinet.columns.forEach((col,i)=>col.width=[416.4,866.8,867.8][i]);C.validate(caseF);C.moduleWidths(caseF).forEach((v,i)=>near(v,[452.4,902.8,903.8][i]));
const minimal={...caseF,w:186,cabinet:{...caseF.cabinet,columns:[{door:'left',doorOpen:false,shelves:[],drawers:[],width:114}]}};C.validate(minimal);assert.throws(()=>C.validate({...minimal,w:185.99,cabinet:{...minimal.cabinet,columns:[{...minimal.cabinet.columns[0],width:113.99}]}}));
for(const value of [NaN,Infinity,-1,50.01,'18',null])assert.throws(()=>C.setConstruction(source,'independent',{left:value,right:0}));
assert.throws(()=>C.setConstruction(source,'bogus',{left:0,right:0}));assert.throws(()=>C.setConstruction(source,'shared',{left:18,right:18}));assert.throws(()=>C.setConstruction({...source,locked:true},'independent',{left:0,right:0}));assert.throws(()=>C.setConstruction({...source,...C.preset('sideboard-fridge')},'independent',{left:0,right:0}));assert.throws(()=>C.validate({...caseF,cabinet:{...caseF.cabinet,endPanels:[]}}));
const packed=P.pack({planId:'p',current:{furniture:[source]},designs:[{id:'d',name:'d',planId:'p',work:{furniture:[caseF]}}],catalog:[]});assert.equal(packed.version,26);assert.equal(P.pack({planId:'p',current:{furniture:[source]},designs:[],catalog:[]}).version,1);assert(R.workspaceVersions.includes(26));
const key=C.spatialConfig(caseF);assert.deepEqual(C.spatialConfig({...caseF,color:'#123456'}),key);assert.notDeepEqual(C.spatialConfig(C.setConstruction(caseF,'independent',{left:0,right:18})),key);
assert.equal(D.replaceFurniture(caseF,{type:'chair',name:'chair',w:500,d:500,color:'#fff'}).cabinet,undefined);assert.equal(D.applyCabinetTemplate(caseF,'book').cabinet.boxConstruction,undefined);
const copy=D.pasteFurniture({cx:0,cy:0,items:[caseF]},{x:500,y:500},{x:-5000,y:-5000,w:10000,h:10000},()=> 'cabinet-copy').items[0];assert.deepEqual(copy.cabinet,caseF.cabinet);copy.cabinet.columns[0].width=114;assert.equal(caseF.cabinet.columns[0].width,416.4);
const svg=SVG.render(caseF.type,caseF.w,caseF.d,'#fff',{ink:'#000'},caseF);assert.equal((svg.match(/data-independent-box/g)||[]).length,3);assert.equal((svg.match(/data-end-panel/g)||[]).length,2);
for(const rot of [0,37,90,270])for(const flip of [false,true]){
 const host={...caseF,cx:3000,cy:3000,rot,flip},bay=C.layout(host)[0],a=rot*Math.PI/180,world=x=>[host.cx+x*(flip?-1:1)*Math.cos(a),host.cy+x*(flip?-1:1)*Math.sin(a)],at=world(bay.center),device={id:'inside',type:'block',name:'test block',w:100,d:100,h:50,mountHeight:host.cabinet.plinth+host.cabinet.thickness+C.spaces(host,0)[0].bottom+10,cx:at[0],cy:at[1],rot};
 const gaps=S.directional(device,{furniture:[host,device],rotation:-rot});near(gaps.l.distance,(bay.width-100)/2);near(gaps.r.distance,(bay.width-100)/2);assert(gaps.l.cabinetInterior);assert(!G.volumeOverlap(host,device));
 for(const delta of [-.001,0,.001]){const p=world(bay.left+50-delta);assert.equal(G.volumeOverlap(host,{...device,cx:p[0],cy:p[1]}),delta>0);}
 const panel=world(host.w/2-9);assert(G.volumeOverlap(host,{...device,cx:panel[0],cy:panel[1],w:10}));assert(!G.volumeOverlap(host,{...device,mountHeight:3000}));assert(S.cabinetInterior({...device,type:'unregistered',h:undefined},{furniture:[host]}).pending);
 const outside=world(-host.w/2-90),external={...device,cx:outside[0],cy:outside[1]},distances=S.directional(external,{furniture:[host],rotation:-rot});assert(Object.values(distances).some(m=>m&&Math.abs(m.distance-40)<1e-4));assert(!G.volumeOverlap(host,external));const partial=world(-host.w/2+10);assert(G.volumeOverlap(host,{...device,cx:partial[0],cy:partial[1]}));
}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),identity=require('../src/core/part-identity.js'),ctx=vm.createContext({FurnishCabinet:C,FurnishPartIdentity:identity});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const model=ctx.FurnishCabinetModel.build(T,caseF,box);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model);near(bounds.min.x*1000,-caseF.w/2);near(bounds.max.x*1000,caseF.w/2);near(bounds.max.y*1000,caseF.h);
 const sides=[],panels=[],shelves=[];model.traverse(o=>{if(o.userData.cabinetSide)sides.push(o);if(o.userData.cabinetEndPanel)panels.push(o);if(o.userData.cabinetShelf)shelves.push(o);if(o.isMesh){assert(Object.values(o.geometry.attributes).every(a=>a.array.every(Number.isFinite)));}});assert.equal(sides.length,6);assert.equal(panels.length,2);assert(shelves.some(o=>o.userData.cabinetShelf.column===2));
 const ordered=sides.map(o=>new T.Box3().setFromObject(o)).sort((a,b)=>a.min.x-b.min.x);for(const b of ordered)near((b.max.x-b.min.x)*1000,18);near((ordered[1].max.x-ordered[2].min.x)*1000,0);near((ordered[3].max.x-ordered[4].min.x)*1000,0);
 const numeric=M.boards(caseF,{includeStatic:true});assert.equal(numeric.filter(b=>b.metadata.cabinetSide).length,6);for(const side of numeric.filter(b=>b.metadata.cabinetSide)){const left=Math.min(...side.poly.map(p=>p[0]));assert(ordered.some(b=>Math.abs(b.min.x*1000-left)<1e-5));}
 for(const part of C.boxParts(caseF)){const hit=new T.Raycaster(new T.Vector3(part.center/1000,.3,-1),new T.Vector3(0,0,1)).intersectObject(model,true);assert(hit.some(x=>x.object.userData.cabinetBay?.column===part.column));}
 console.log(`PASS ${cases} independent-box cases: panel/width chains, edits, old/project restore, production sides, global part identity, opening and numeric recorder`);
})().catch(e=>{console.error(e);process.exitCode=1;});
