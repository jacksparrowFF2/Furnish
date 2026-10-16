const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js'),G=require('../src/core/layout-geometry.js'),M=require('../src/render/fotile-model.js'),SVG=require('../src/render/furniture-svg.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const old={id:'hood',name:'烟机',type:'rangehood_fotile_jcd10ta',cx:2000,cy:2000,w:900,d:350,h:520,rot:0,mountHeight:1315,color:'#111214'};
const custom={...old,id:'custom',h:515,hoodGeometry:{bodyHeight:330,coverWidth:600,coverDepth:280}};
R.validate(custom);assert.equal(R.initial(old).hoodGeometry,undefined);assert.equal(R.migrate(old).hoodGeometry,undefined);
assert.deepEqual(R.hoodInstallation(custom),{bodyHeight:330,coverHeight:185,coverWidth:600,coverDepth:280,coverOffset:-35});
for(const v of [null,[],1,{unknown:1},{coverWidth:'600'},{bodyHeight:515},{coverDepth:351},{coverWidth:901},{bodyHeight:9.999},{coverWidth:NaN},{coverDepth:Infinity}])assert.throws(()=>R.validate({...custom,hoodGeometry:v}));
assert.throws(()=>R.validate({type:'chair',hoodGeometry:{}}));assert.throws(()=>R.editHoodGeometry({...custom,locked:true},'coverWidth',550));
for(const [key,n] of [['coverWidth',900],['coverDepth',350],['bodyHeight',10],['bodyHeight',514.999]])R.validate(R.editHoodGeometry(custom,key,n));
const edited=R.editHoodGeometry(old,'coverWidth',620);assert.deepEqual(edited.hoodGeometry,{coverWidth:620});assert.equal(old.hoodGeometry,undefined);
const scaled=D.resizeFurniture(custom,{w:1080,d:420,h:618});assert.deepEqual(scaled.hoodGeometry,{bodyHeight:396,coverWidth:720,coverDepth:336});assert.equal(scaled.mountHeight,1315);assert.deepEqual(custom.hoodGeometry,{bodyHeight:330,coverWidth:600,coverDepth:280});
const payload={planId:'hood',current:{furniture:[custom,old]},designs:[{id:'n',name:'烟机尺寸',work:{furniture:[custom]}}],catalog:[]};
assert.deepEqual(P.unpack(P.pack(payload)),payload);let list=[custom,old];for(let i=0;i<4;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#111214'});assert.deepEqual(list,[custom,old]);
const invalid=structuredClone(payload);invalid.designs[0].work.furniture[0].hoodGeometry.coverWidth=901;assert.throws(()=>P.unpack(P.pack(invalid)));
const copy=D.pasteFurniture({items:[custom],cx:2000,cy:2000},{x:4000,y:4000},{x:0,y:0,w:8000,h:8000},()=> 'copy').items[0];copy.hoodGeometry.coverWidth=500;assert.equal(custom.hoodGeometry.coverWidth,600);
assert.equal(D.replaceFurniture(custom,{type:'chair',name:'椅子',w:500,d:500,h:800,color:'#aaa',price:0}).hoodGeometry,undefined);
assert.deepEqual(D.replaceFurniture(custom,{type:old.type,name:'烟机',w:900,d:350,h:515,color:'#111214',price:0}).hoodGeometry,custom.hoodGeometry);
const plan={rooms:[],walls:[],doors:[],beams:[]},issue={kind:'test'},key=P.checkFingerprint(issue,plan,[custom],800);
for(const field of ['bodyHeight','coverWidth','coverDepth'])assert.notEqual(key,P.checkFingerprint(issue,plan,[R.editHoodGeometry(custom,field,custom.hoodGeometry[field]-1)],800));
assert.equal(key,P.checkFingerprint(issue,plan,[{...custom,color:'#fff',price:500,purchaseStatus:'ordered'}],800));
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const host=C.configureHoodBay({...C.preset('wall'),id:'wall',type:'kitchenwall',w:1600,cx:2000,cy:2000,rot,flip,mountHeight:1660},600,185),aligned=C.centerHoodInBay(host,{...custom,rot,flip},true);
 assert(C.hoodBayFit(host,aligned).fits);near(aligned.mountHeight,1330);
 for(const [field,value] of [['coverWidth',600.001],['bodyHeight',329.999]])assert(!C.hoodBayFit(host,R.editHoodGeometry(aligned,field,value)).fits);
 const unknown={...aligned,mountHeight:NaN};assert(!C.hoodBayFit(host,unknown).fits);
 const parts=G.bodyParts(aligned);near(parts[0].vertical.top,1660);near(parts[1].vertical.top,1845);
}
const svg=SVG.render(custom.type,900,350,'#111214',{ink:'#000'},custom);assert(svg.includes('x="-300" y="-175" width="600" height="280"'));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 for(const f of [old,custom,scaled,R.editHoodGeometry(custom,'bodyHeight',10),R.editHoodGeometry(custom,'bodyHeight',514.999)]){
  const model=M.build(T,f),spec=R.hoodInstallation(f),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());near(size.x,f.w/1000);near(size.y,f.h/1000);near(size.z,f.d/1000);near(bounds.min.y,f.mountHeight/1000);
  let cover;model.traverse(o=>{if(o.userData.fotilePart==='chimney-cover')cover=o;if(o.isMesh)for(const a of [o.geometry.attributes.position,o.geometry.attributes.normal])for(const n of a.array)assert(Number.isFinite(n));});
  const box=new T.Box3().setFromObject(cover),s=box.getSize(new T.Vector3());near(s.x,spec.coverWidth/1000);near(s.y,spec.coverHeight/1000);near(s.z,spec.coverDepth/1000);near(box.min.y,(f.mountHeight+spec.bodyHeight)/1000);near(box.min.z,-f.d/2000);
  model.scale.x=-1;model.rotation.y=-Math.PI/2;const turned=new T.Box3().setFromObject(model).getSize(new T.Vector3());near(turned.x,f.d/1000);near(turned.z,f.w/1000);
 }
 console.log('PASS editable hood geometry: production section dimensions, independent fields, limits, scaling, legacy recovery, copies/replacement, current/named projects, transformed fits and review invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
