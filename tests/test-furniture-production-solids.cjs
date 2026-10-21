'use strict';
const A=require('node:assert/strict'),fs=require('fs'),G=require('../src/core/layout-geometry'),S=require('../src/core/snapping'),M=require('../src/core/cabinet-motion'),P=require('../src/core/project-core');
const fixtures=[{type:'bench_yeswood_oak',w:800,d:300,clear:[0,25,120],solid:[0,0,75],top:450},{type:'coffeetable_yeswood_cherry',w:1200,d:650,clear:[0,0,310],solid:[0,0,260],top:450}];
const plan={id:'p',rooms:[{id:'r',poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}],walls:[],wins:[],doors:[],beams:[],ceilingHeight:3000};
const probe=(host,[x,z,y],size=10)=>{x*=host.flip?-1:1;const a=host.rot*Math.PI/180;return {id:'probe',type:'block',name:'探针',w:size,d:size,h:10,mountHeight:y,cx:host.cx+x*Math.cos(a)-z*Math.sin(a),cy:host.cy+x*Math.sin(a)+z*Math.cos(a),rot:host.rot,flip:host.flip};};
for(const source of fixtures)for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const host={...source,id:'host',name:'实体家具',h:450,cx:1200,cy:1500,rot,flip};
 const empty=probe(host,source.clear),solid=probe(host,source.solid);
 const throughGap={...plan,beams:[{id:'beam-gap',poly:G.footprints(empty)[0],bottomHeight:empty.mountHeight,topHeight:empty.mountHeight+empty.h}]};A(!P.spaceCheck(throughGap,[host],{scanPassages:false}).some(i=>i.kind==='beam'),'beam may pass through a known open height slice');
 A.equal(G.volumeOverlap(host,empty),false);A.equal(G.collisions([host,empty]).length,0);A(!P.spaceCheck(plan,[host,empty],{scanPassages:false}).some(x=>x.kind==='overlap'));
 A(G.volumeOverlap(host,solid));A.equal(G.collisions([host,solid]).length,1);A(P.spaceCheck(plan,[host,solid],{scanPassages:false}).some(x=>x.kind==='overlap'));
 const gap=S.cabinetInterior(empty,{furniture:[host,empty]});A(gap);A.equal(gap.collisions.length,0);A(gap.top.distance>0);if(source.type==='bench_yeswood_oak')A.equal(gap.bottom,null,'between rods is open downward');else A(gap.bottom.distance>0);
 for(const value of Object.values(S.directional(empty,{furniture:[host,empty]})).filter(Boolean))A(!value.containedBoundary,'known structures use actual board faces');
 A.equal(G.volumeOverlap(host,probe(host,[0,0,450])),false,'equal top contact');A(G.volumeOverlap(host,probe(host,[0,0,449.9])),'positive penetration');
 const round=P.unpack(P.pack({planId:'p',current:{furniture:[host,empty]},designs:[{name:'named',work:{furniture:[host,empty]}}],catalog:[]}));A.equal(G.collisions(round.current.furniture).length,0);A.equal(G.collisions(round.designs[0].work.furniture).length,0);
 A(M.solidParts(host).every(p=>p.vertices.every(v=>v.every(Number.isFinite))&&p.faces.length&&p.actualBoard));
}
// A known mesh is not a closed cabinet envelope in installation checks either.
const tallTable={id:'table-installation-fixture',type:'coffeetable_yeswood_cherry',w:1200,d:650,h:3000,cx:0,cy:0,rot:0},dish={id:'dish-installation-fixture',type:'dishwasher_mijia_countertop',w:550,d:350,h:598,mountHeight:1000,cx:0,cy:0,rot:0};
A(P.dishwasherChecks(plan,dish,{furniture:[dish,tallTable]}).checks.filter(c=>c.kind==='dishwasher-overhead').every(c=>c.ok===true),'scaled mesh fixture uses real horizontal panels, not its full envelope');
// Unknown probe heights cannot be interpreted as a verified empty cavity.
const host={...fixtures[0],id:'h',h:450,cx:0,cy:0,rot:0},unknown={...probe(host,[0,25,120]),type:'unmodelled',h:undefined,mountHeight:undefined};A(S.cabinetInterior(unknown,{furniture:[host,unknown]}).pending);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),roundedSource=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace(/from (['"])three\1/g,(_,q)=>'from '+q+imports.three+q),Rounded=(await import('data:text/javascript;base64,'+Buffer.from(roundedSource).toString('base64'))).RoundedBoxGeometry;
 for(const source of fixtures){
  const f={...source,h:450,cx:0,cy:0,rot:0},Model=require('../src/render/'+(source.type==='bench_yeswood_oak'?'shoe-bench':'cherry-coffee-table')+'-model'),model=Model.build(T,f,Rounded);model.updateMatrixWorld(true);
  const actual=new T.Box3().setFromObject(model),vertices=M.solidParts(f).flatMap(p=>p.vertices);
  for(const [axis,k] of [[0,'x'],[1,'y'],[2,'z']]){A(Math.abs(actual.min[k]*1000-Math.min(...vertices.map(v=>v[axis])))<.03);A(Math.abs(actual.max[k]*1000-Math.max(...vertices.map(v=>v[axis])))<.03);}
  for(const [i,[x,z,y]] of [source.clear,source.solid].entries()){const hits=new T.Raycaster(new T.Vector3(x/1000,(y+5)/1000,-2),new T.Vector3(0,0,1)).intersectObject(model,true);A.equal(hits.length>0,i===1,'actual production ray distinguishes open gap and occupied board');}
 }
 console.log('PASS production furniture solids: cavities, real intersections, exact contact, rotations/mirrors, height clipping, unknowns, canvas/project agreement, current/named roundtrip and real Three geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
