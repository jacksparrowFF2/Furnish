const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/shoe-bench-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='bench_yeswood_oak');
assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[800,300,450]);assert.equal(e[5],0);
const f={id:'shoe-bench',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:2500,cy:2500,rot:37,flip:true};
assert.equal(R.height({type:f.type}),450);assert.equal(R.vertical(f).top,450);
const work={furniture:[f]},round=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'换鞋凳',work}],catalog:[]}));
assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[f]);
assert.equal(D.pasteFurniture({items:[f],cx:2500,cy:2500},{x:600,y:600},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].type,f.type);
assert.equal(D.replaceFurniture({...f,type:'tea_bar_mijia_pro',teaBarUpperOpen:true},{...f,price:0}).teaBarUpperOpen,undefined);
assert(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f).includes('#d7d1c5'));
const plan={id:'room',rooms:[{id:'room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]],ceilingHeight:3000}],walls:[],doors:[],beams:[],ceilingHeight:3000};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const unit={...round.current.furniture[0],rot,flip},beam={id:'beam',poly:[[1800,1800],[3200,1800],[3200,3200],[1800,3200]],topHeight:1100};
 const hits=bottom=>P.spaceCheck({...plan,beams:[{...beam,...(bottom===undefined?{}:{bottomHeight:bottom})}]},[unit],{scanPassages:false}).filter(v=>v.kind==='beam');
 assert.equal(hits(450).length,0,'top contact');assert(hits(449.9).some(v=>!v.pending),'below top intersects');assert(hits(undefined).some(v=>v.pending),'unknown beam height');
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace(/from (['"])three\1/g,(_,q)=>'from '+q+imports.three+q);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const [w,d,h] of [[800,300,450],[960,480,800],[50,50,50]])for(const rot of [0,37,90])for(const flip of [false,true]){
  const o=Model.build(T,{...f,w,d,h},RoundedBoxGeometry);o.rotation.y=-rot*Math.PI/180;o.scale.x=flip?-1:1;
  const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),a=rot*Math.PI/180;
  near(b.min.y,0);near(size.y,h/1000);const ex=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)/1000,ez=(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)/1000;assert(size.x<=ex+2e-6&&size.x>ex-Math.max(w,d)*.04/1000);assert(size.z<=ez+2e-6&&size.z>ez-Math.max(w,d)*.04/1000);if(rot===0){near(size.x,w/1000);near(size.z,d/1000);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,f,RoundedBoxGeometry);o.updateMatrixWorld(true);const parts={};o.traverse(v=>{if(v.userData.shoeBenchPart)(parts[v.userData.shoeBenchPart]??=[]).push(v);});
 const bounds=o=>new T.Box3().setFromObject(o);
 assert.equal(parts.leg.length,4);assert.equal(parts['shoe-rod'].length,10);
 near(bounds(parts.cushion[0]).min.y,.410);near(bounds(parts.cushion[0]).max.y,.450);
 near(bounds(parts.cushion[0]).getSize(new T.Vector3()).x,.745);
 const legs=parts.leg.map(bounds);near(legs[2].min.x-legs[0].max.x,.740);near(legs[1].min.z-legs[0].max.z,.240);
 near(bounds(parts['shelf-end'][0]).min.y,.060);near(bounds(parts['shoe-rod'][0]).min.y,.070);
 near(bounds(parts['shoe-rod'][5]).max.y,.235);near(bounds(parts['seat-apron'][0]).min.y-.235,.135);
 const hit=y=>new T.Raycaster(new T.Vector3(0,y,1),new T.Vector3(0,0,-1)).intersectObject(o,true);
 assert.equal(hit(.15).length,0,'open shelf');assert.equal(hit(.04).length,0,'floor gap');assert(hit(.079).length,'actual shoe rods');
 console.log('PASS shoe bench: defaults, roundtrip, restore, copy, replacement, production dimensions, shelves, scaling and rotation/mirror');
})().catch(e=>{console.error(e);process.exitCode=1;});
