const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/product-rules.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),base=C.configureHoodBay({...C.preset('wall'),id:'wall',type:'kitchenwall',name:'烟机柜',w:970,cx:3000,cy:3000,rot:0,mountHeight:1660,color:'#ddd'}),hood={id:'hood',type:'rangehood_fotile_jcd10ta',name:'烟机',w:900,d:350,h:520,cx:3000,cy:3000,rot:0,mountHeight:1315,color:'#111'};
assert.equal(base.cabinet.hoodBayCeiling,undefined);assert(C.hoodBayCeiling(base));
const open={...base,cabinet:{...base.cabinet,hoodBayCeiling:false}};C.validate(open);assert(!C.hoodBayCeiling(open));
for(const value of [null,0,'false'])assert.throws(()=>C.validate({...base,cabinet:{...base.cabinet,hoodBayCeiling:value}}),/横板开关/);
const noBay=structuredClone(open);delete noBay.cabinet.hoodBayHeight;assert.throws(()=>C.validate(noBay),/横板开关/);
for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const gap of [0,.001,5,10,108.999,109]){
 const host={...open,rot,flip},f=C.setHoodSideGap(host,hood,gap),aligned=C.centerHoodInBay(f,hood,true),fit=C.hoodBayFit(f,aligned);assert(fit.fits);close(C.widths(f)[1],480+2*gap);close(fit.clearances.left,gap);close(fit.clearances.right,gap);assert.equal(f.w,970);assert.equal(f.mountHeight,1660);assert(!C.hoodBayCeiling(f));
}
for(const gap of [-.001,109.001,Infinity,NaN])assert.throws(()=>C.setHoodSideGap(open,hood,gap));
assert.equal(C.widths(C.setHoodSideGap(open,{...hood,w:1080},5))[1],586,'clearances use the actual scaled cover, not a copied nominal width');
const work={furniture:[K.fromWall(open),hood]},payload={planId:'hood',current:work,designs:[{name:'无横板',work}],catalog:[]},restored=P.unpack(P.pack(payload));assert.deepEqual(restored,payload);
let list=restored.current.furniture;for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'x',colorFor:()=> '#ddd'});assert.deepEqual(list,work.furniture);assert(!C.hoodBayCeiling(K.hoodHosts(list[0])[0]));assert.equal(K.specification(list[0]).modules[0].structure.cabinet.hoodBayCeiling,false);
let nextId=0;const copies=D.pasteFurniture({items:work.furniture,cx:3000,cy:3000},{x:5000,y:5000},{x:0,y:0,w:10000,h:10000},()=> 'copy-'+(++nextId)).items;assert.equal(copies[0].kitchen.modules[0].structure.cabinet.hoodBayCeiling,false);
assert.equal(D.replaceFurniture(open,{type:'chair',name:'椅',w:500,d:500,color:'#ddd',price:0}).cabinet,undefined);
// Exercise the real editor reader, including typing back to the original value after a live preview.
const editor=vm.createContext({window:{},FurnishCabinet:C,FurnishKitchen:K,FurnishProducts:R,structuredClone,getF:id=>id===hood.id?hood:null});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/kitchen-editor.js'),'utf8'),editor);
const fields={'#hood-bay-width':{value:'500'},'#hood-bay-height':{value:'175'},'#hood-bay-ceiling':{checked:false},'#hood-bay-side-gap':{value:'5',defaultValue:'10',dataset:{hoodDevice:hood.id}}},form={querySelector:key=>fields[key]};
assert.equal(C.hoodBay(editor.readHoodBayFields(base,form,true)).width,490);fields['#hood-bay-width'].value='480';fields['#hood-bay-side-gap'].value='10';const typedBack=editor.readHoodBayFields(base,form,true);assert.equal(C.hoodBay(typedBack).width,500);assert.equal(typedBack.cabinet.hoodBayCeiling,false);fields['#hood-bay-side-gap'].value='-1';assert.throws(()=>editor.readHoodBayFields(base,form,true),/非负/);
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(map.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C,FurnishProducts:R});for(const name of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{assert(w>0&&h>0&&d>0);const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const f of [base,open,C.setHoodSideGap(open,hood,0),C.setHoodSideGap(open,hood,5)]){
  const snapshot=JSON.stringify(f),model=ctx.FurnishCabinetModel.buildRaw(T,f,box);model.updateMatrixWorld(true);const ceilings=[],bottoms=[];model.traverse(o=>{if(o.userData.cabinetSection==='hoodCeiling')ceilings.push(o);if(o.userData.cabinetSection==='hoodSideBottom')bottoms.push(o);});assert.equal(ceilings.length,C.hoodBayCeiling(f)?1:0);assert.equal(bottoms.length,2);
  const bay=C.hoodBay(f),t=f.cabinet.thickness,left=bay.left/1000,right=(bay.left+bay.width)/1000;
  // Bottom boards extend under both full divider thicknesses; the cavity itself remains empty.
  close(new T.Box3().setFromObject(bottoms[0]).max.x,left);close(new T.Box3().setFromObject(bottoms[1]).min.x,right);
  for(const x of [left-t/2000,right+t/2000]){const ray=new T.Raycaster(new T.Vector3(x,-.01,0),new T.Vector3(0,1,0)),hit=ray.intersectObject(model,true)[0];assert(hit);close(hit.point.y,0);}
  const centerRay=new T.Raycaster(new T.Vector3(0,-.01,0),new T.Vector3(0,1,0)),centerHit=centerRay.intersectObject(model,true)[0];assert(centerHit);close(centerHit.point.y,(C.hoodBayCeiling(f)?175:f.h-t)/1000);
  const module=K.fromWall(f),production=ctx.FurnishKitchenModel.build(T,module,box),moduleCeilings=[];production.traverse(o=>{if(o.userData.cabinetSection==='hoodCeiling')moduleCeilings.push(o);});assert.equal(moduleCeilings.length,ceilings.length);assert.equal(JSON.stringify(f),snapshot);
 }
 console.log('PASS hood cavity details: optional ceiling with historical default, full divider-bottom joints without corner voids, actual scaled side clearances/limits, production rays, module construction, validation, copies/replacement and repeated project restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
