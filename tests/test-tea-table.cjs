const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/tea-table-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='tea_table_800');
assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[800,400,720]);assert.equal(e[5],0);
const f={id:'tea-table',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:100,cy:200,rot:37,flip:true};
assert.equal(R.height({type:f.type}),720);assert.deepEqual(R.vertical(f),{bottom:0,top:897,source:'model'});
const work={furniture:[f]},round=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'茶台',work}],catalog:[]}));
assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[f]);
assert.equal(D.pasteFurniture({items:[f],cx:100,cy:200},{x:600,y:600},{x:0,y:0,w:3000,h:3000},()=> 'copy').items[0].type,f.type);
const replacement=D.replaceFurniture({...f,type:'tea_bar_mijia_pro',teaBarUpperOpen:true,teaBarLowerOpen:true},{...f,price:0});assert.equal(replacement.teaBarUpperOpen,undefined);assert.equal(replacement.teaBarLowerOpen,undefined);
assert(!/NaN|undefined/.test(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f)));
const plan={id:'tea-table-room',rooms:[{id:'room',name:'Room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]],ceilingHeight:3000}],walls:[],doors:[],beams:[],ceilingHeight:3000};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const unit={...round.current.furniture[0],cx:2500,cy:2500,rot,flip},beam={id:'beam',name:'Beam',poly:[[2000,2000],[3000,2000],[3000,3000],[2000,3000]],topHeight:1100};
 const hits=bottom=>P.spaceCheck({...plan,beams:[{...beam,...(bottom===undefined?{}:{bottomHeight:bottom})}]},[unit],{scanPassages:false}).filter(v=>v.kind==='beam');
 assert.equal(hits(897).length,0,'touching accessory top clears');assert(hits(896.9).some(v=>!v.pending),'accessory height enters beam collision');assert(hits(undefined).some(v=>v.pending),'unknown beam remains pending');
}
const issue={kind:'beam',id:f.id,beamId:'beam'},fingerprint=P.checkFingerprint(issue,plan,[f],800);
assert(fingerprint.includes('tea-table-accessories-v1'));assert.equal(fingerprint,P.checkFingerprint(issue,plan,[{...f,price:99,color:'#ffffff'}],800),'price and color retain spatial confirmation');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const [w,d,h]of [[800,400,720],[1200,600,900],[50,50,50]])for(const rot of [0,37,90])for(const flip of [false,true]){
  const o=Model.build(T,{...f,w,d,h});o.rotation.y=-rot*Math.PI/180;o.scale.x=flip?-1:1;
  const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),a=rot*Math.PI/180;
  near(b.min.y,0);near(size.y,R.vertical({...f,h}).top/1000);near(size.x,(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)/1000);near(size.z,(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)/1000);
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,{...f,rot:0,flip:false});o.updateMatrixWorld(true);
 const accessories=[];o.traverse(v=>{if(v.userData.teaTableAccessory)accessories.push(v);});
 const count=kind=>accessories.filter(v=>v.userData.teaTableAccessory===kind).length;
 assert.equal(count('glass-kettle'),2);assert.equal(count('tea-cup'),7);assert.equal(count('ceramic-teapot'),1);assert.equal(count('tea-strainer'),1);
 assert.equal(count('glass-tea-jar'),2);assert.equal(count('ceramic-tea-jar'),2);assert.equal(count('storage-canister'),3);
 for(const g of accessories){
  const b=new T.Box3().setFromObject(g);assert(b.min.x>=-.38&&b.max.x<=.38&&b.min.z>=-.19&&b.max.z<=.19,'accessories fit cabinet footprint');
  const kind=g.userData.teaTableAccessory;
  if(['glass-tea-jar','ceramic-tea-jar'].includes(kind)){near(b.min.y,.379);assert(b.max.y<.667,'upper jars fit shelf bay');}
  else if(kind==='storage-canister'){near(b.min.y,.062);assert(b.max.y<.271,'lower jars clear drawer');}
  else {near(b.min.y,.697);assert(b.max.y<=.897001,'tea ware sits on tray and stays in envelope');}
 }
 const tallest=accessories.filter(v=>v.userData.teaTableAccessory==='glass-kettle').map(v=>new T.Box3().setFromObject(v).max.y);near(Math.max(...tallest),R.vertical(f).top/1000);
 const hit=(x,y)=>new T.Raycaster(new T.Vector3(x,y,1),new T.Vector3(0,0,-1)).intersectObject(o,true)[0].object.userData.teaTablePart;
 assert.equal(hit(-.14,.62),'back','upper left bay stays open');assert.equal(hit(-.14,.266),'back','lower left bay stays open');assert.equal(hit(-.22,.32),'drawer');assert.equal(hit(.281,.4),'cane-panel');
 console.log('PASS tea table: catalog/defaults, project/named roundtrip, repeated restore, copy/replacement, SVG, production dimensions, rotation/mirror, finite geometry and open bay raycasts');
})().catch(e=>{console.error(e);process.exitCode=1;});
