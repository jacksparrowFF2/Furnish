const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/cherry-coffee-table-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='coffeetable_yeswood_cherry');
assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[1200,650,450]);assert.equal(e[5],0);
const f={id:'cherry-coffee',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:2500,cy:2500,rot:37,flip:true};
assert.equal(R.height({type:f.type}),450);assert.equal(R.vertical(f).top,450);
const work={furniture:[f]},round=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'茶几',work}],catalog:[]}));
assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);
let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[f]);
assert.equal(D.pasteFurniture({items:[f],cx:2500,cy:2500},{x:600,y:600},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].type,f.type);
assert.equal(D.replaceFurniture({...f,type:'tea_bar_mijia_pro',teaBarUpperOpen:true},{...f,price:0}).teaBarUpperOpen,undefined);
assert(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f).includes('#f5f5f1'));
const plan={id:'room',rooms:[{id:'room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]],ceilingHeight:3000}],walls:[],doors:[],beams:[],ceilingHeight:3000};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const unit={...round.current.furniture[0],rot,flip},beam={id:'beam',poly:[[1800,1800],[3200,1800],[3200,3200],[1800,3200]],topHeight:1100};
 const hits=bottom=>P.spaceCheck({...plan,beams:[{...beam,...(bottom===undefined?{}:{bottomHeight:bottom})}]},[unit],{scanPassages:false}).filter(v=>v.kind==='beam');
 assert.equal(hits(450).length,0,'top contact');assert(hits(449.9).some(v=>!v.pending),'below top intersects');assert(hits(undefined).some(v=>v.pending),'unknown beam height');
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const [w,d,h]of [[1200,650,450],[960,480,800],[50,50,50]])for(const rot of [0,37,90])for(const flip of [false,true]){
  const o=Model.build(T,{...f,w,d,h});o.rotation.y=-rot*Math.PI/180;o.scale.x=flip?-1:1;
  const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),a=rot*Math.PI/180;
  near(b.min.y,0);near(size.y,h/1000);near(size.x,(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)/1000);near(size.z,(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)/1000);
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,f);o.updateMatrixWorld(true);const parts={};o.traverse(v=>{if(v.userData.cherryCoffeePart)(parts[v.userData.cherryCoffeePart]??=[]).push(v);});
 const bounds=name=>new T.Box3().setFromObject(parts[name][0]);
 near(bounds('white-stone').min.y,.439);near(bounds('white-stone').max.y,.450);near(bounds('drawer-front').min.y,.120);near(bounds('shelf').max.y,.275);
 const sides=parts['side-panel'].map(p=>new T.Box3().setFromObject(p)).sort((a,b)=>a.min.x-b.min.x);
 near(sides[1].min.x-sides[0].max.x,.880);assert(sides[0].max.x-sides[0].min.x>.040,'bent board envelope includes the inward return');near(sides[0].max.y,.419);
 // Production rolled edges have real intermediate cross-sections and tangent normals.
 for(const [name,radius] of [['top-substrate',8],['white-stone',1.8],['shelf',7],['drawer-front',6]]){
  const g=parts[name][0].geometry,p=g.attributes.position,n=g.attributes.normal;
  assert.equal(g.userData.edgeRadius,radius);
  let diagonal=0;
  for(let i=0;i<n.count;i++){
   const v=new T.Vector3().fromBufferAttribute(n,i);near(v.length(),1);
   if(Math.abs(v.y)>.1&&Math.abs(v.y)<.95)diagonal++;
  }
  assert(diagonal>100,`${name}: curved thickness edges, not a hard extrusion`);
  for(let i=0;i<g.index.count;i+=3){
   const ids=[0,1,2].map(j=>g.index.getX(i+j)),v=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j));
   const face=new T.Vector3().subVectors(v[1],v[0]).cross(new T.Vector3().subVectors(v[2],v[0]));
   if(face.lengthSq()<1e-12)continue;
   const normal=ids.reduce((sum,j)=>sum.add(new T.Vector3().fromBufferAttribute(n,j)),new T.Vector3());
   assert(face.dot(normal)>0,`${name}: outward triangles`);
  }
 }
 assert.equal(parts['leg-wing'].length,4);assert.equal(parts['leg-inner-cleat'].length,4);assert.equal(parts['leg-mount-block'].length,4);assert.equal(parts['leg-fastener'].length,24);
 const leg=parts['side-panel'][1];leg.updateMatrixWorld(true);
 const outer=z=>new T.Raycaster(new T.Vector3(.6,.32,z),new T.Vector3(-1,0,0)).intersectObject(leg,true)[0].point.x;
 near(outer(.16),outer(.17));assert(outer(.235)<outer(.17)-.004,'inward bend starts near the ends');assert(outer(.26)<outer(.235)-.004,'inward return continues smoothly');
 for(const wing of parts['leg-wing']){
  const g=wing.geometry,{rows,cols}=g.userData.bentBoard,p=g.attributes.position,offset=rows*cols,row=13; // 200 mm, clear of edge roundovers.
  for(const col of [20,55,75,90]){
   const inner=new T.Vector3().fromBufferAttribute(p,row*cols+col),outer=new T.Vector3().fromBufferAttribute(p,offset+row*cols+col);
   assert(Math.abs(inner.distanceTo(outer)-28)<1e-4,'28 mm normal thickness through the bend');
   if(col>=75)assert(Math.abs(outer.z-inner.z)>4,'inner and outer faces turn together');
  }
 }
 assert(!new T.Raycaster(new T.Vector3(.6,.32,0),new T.Vector3(-1,0,0)).intersectObject(leg,true).length,'two wood wings leave the actual central spine opening');
 const shelfGeometry=parts.shelf[0].geometry,sp=shelfGeometry.attributes.position;
 assert(Array.from({length:sp.count},(_,i)=>[sp.getY(i),sp.getZ(i)]).some(([y,z])=>Math.abs(y-9)<1e-5&&Math.abs(z-263)<1e-5),'shelf top face rolls back 7 mm');
 assert(Array.from({length:sp.count},(_,i)=>[sp.getY(i),sp.getZ(i)]).some(([y,z])=>Math.abs(y-2)<1e-5&&Math.abs(z-270)<1e-5),'shelf outermost edge remains at the original envelope');
 assert.equal(parts['white-stone'][0].material.color.getHexString(),'f5f5f1');
 const hit=(x,y)=>new T.Raycaster(new T.Vector3(x,y,1),new T.Vector3(0,0,-1)).intersectObject(o,true)[0]?.object.userData.cherryCoffeePart;
 assert.equal(hit(0,.35),undefined,'open bay');assert.equal(hit(0,.06),undefined,'floor gap');assert.equal(hit(0,.20),'drawer-front');
 console.log('PASS cherry coffee table: defaults, project/named roundtrip, repeated restore, copy/replacement, white SVG, production geometry, scaled/rotated/mirrored bounds and open bay');
})().catch(e=>{console.error(e);process.exitCode=1;});
