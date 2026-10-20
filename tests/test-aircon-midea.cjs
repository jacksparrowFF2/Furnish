const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/aircon-midea-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='aircon_midea_ultra_2hp');
assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[395,436,1856]);assert.equal(e[5],0);
const f={id:'aircon-midea',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:100,cy:200,rot:37,flip:true};
assert.equal(R.height({type:f.type}),1856);assert.deepEqual(R.vertical(f),{bottom:0,top:1856,source:'recorded'});
const work={furniture:[f]},round=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'空调',work}],catalog:[]}));
assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[f]);
assert.equal(D.pasteFurniture({items:[f],cx:100,cy:200},{x:600,y:600},{x:0,y:0,w:3000,h:3000},()=> 'copy').items[0].type,f.type);
const replacement=D.replaceFurniture({...f,type:'tea_bar_mijia_pro',teaBarUpperOpen:true,teaBarLowerOpen:true},{...f,price:0});assert.equal(replacement.teaBarUpperOpen,undefined);assert.equal(replacement.teaBarLowerOpen,undefined);
assert.equal(replacement.brand,'美的/Midea');assert.equal(replacement.model,'KFR-51LW/N8KS1-1U');
assert.deepEqual(R.vertical({type:f.type}),{bottom:0,top:1856,source:'model'});
const legacy=D.restoreFurniture([{...f,h:undefined}],{makeId:()=> 'unused',colorFor:()=> '#eee'})[0];assert.equal(legacy.h,undefined);assert.equal(R.height(legacy),1856);
const issue={kind:'beam',id:f.id,beamId:'beam'};
assert(!/NaN|undefined/.test(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f)));
const plan={id:'aircon-midea-room',rooms:[{id:'room',name:'Room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]],ceilingHeight:3000}],walls:[],doors:[],beams:[],ceilingHeight:3000};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const unit={...round.current.furniture[0],cx:2500,cy:2500,rot,flip},beam={id:'beam',name:'Beam',poly:[[2000,2000],[3000,2000],[3000,3000],[2000,3000]],topHeight:2100};
 const hits=bottom=>P.spaceCheck({...plan,beams:[{...beam,...(bottom===undefined?{}:{bottomHeight:bottom})}]},[unit],{scanPassages:false}).filter(v=>v.kind==='beam');
 assert.equal(hits(1856).length,0,'touching unit top clears');assert(hits(1855.9).some(v=>!v.pending),'unit height enters beam collision');assert(hits(undefined).some(v=>v.pending),'unknown beam remains pending');
}
assert.equal(P.checkFingerprint(issue,plan,[f],800),P.checkFingerprint(issue,plan,[{...f,price:123,color:'#fff'}],800));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const [w,d,h]of [[395,436,1856],[1200,600,900],[50,50,50]])for(const rot of [0,37,90])for(const flip of [false,true]){
  const o=Model.build(T,{...f,w,d,h});o.rotation.y=-rot*Math.PI/180;o.scale.x=flip?-1:1;
  const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),a=rot*Math.PI/180;
  near(b.min.y,0);near(size.y,R.vertical({...f,h}).top/1000);
  const boundX=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)/1000,boundZ=(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)/1000;
  if(rot===0||rot===90){near(size.x,boundX);near(size.z,boundZ);}else {assert(size.x<=boundX+2e-6);assert(size.z<=boundZ+2e-6);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,{...f,rot:0,flip:false});o.updateMatrixWorld(true);
 const hit=(x,y,z,dir)=>new T.Raycaster(new T.Vector3(x,y,z),new T.Vector3(0,0,dir)).intersectObject(o,true)[0]?.object.userData.airconPart;
 assert.equal(hit(0,1.08,1,-1),'vertical-vane');assert.equal(hit(.12,.3,1,-1),'body');assert.equal(hit(0,1,-1,1),'rear-filter');
 assert.equal(hit(.0085,1.08,1,-1),'outlet-back','wind outlet is recessed through shell');
 const roofHit=z=>new T.Raycaster(new T.Vector3(0,3,z),new T.Vector3(0,-1,0)).intersectObject(o,true)[0];
 assert(roofHit(-.19).point.y-roofHit(.19).point.y>.02,'lid front edge sits below rear');
 assert.equal(roofHit(0).object.userData.airconPart,'lid');
 assert(roofHit(.19).point.y>1.81&&roofHit(.19).point.y<1.85,'rolled front stays within nominal height');
 console.log('PASS Midea indoor AC: catalog, persistence, restoration, copy/replacement, SVG, dimensions, rotation/mirror and finite geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
