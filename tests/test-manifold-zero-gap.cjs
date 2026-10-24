const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./helpers/wall-finish-fixture.cjs'),R=require('../src/core/product-rules.js'),F=require('../src/core/wall-finish-core.js'),P=require('../src/core/project-core.js'),S=require('../src/core/snapping.js'),D=require('../src/core/design-core.js'),T=require('../src/core/wall-tiling-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),base=fixture(),room=base.plan.rooms[0].id;
function fixtureWork(rot,flip){let work=structuredClone(base.work);work.rooms[room].use='kitchen';work.furniture=[{id:'m',name:'分水器',type:'heating_manifold',w:800,d:180,h:600,cx:2000,cy:400,rot,flip,...R.initial({type:'heating_manifold'})}];for(const f of F.faces(base.plan))work=F.edit(work,f,{tileThickness:10,bondThickness:20});return T.setEnabled(work,P.effectivePlan(base.plan,work),[room],true);}
function measured(work,dir,rotation=0){const plan=P.effectivePlan(base.plan,work),sp=F.spatial(plan);return S.directional(work.furniture,{plan,rects:sp.walls.map(w=>w.slice(0,4)),solidWallCount:sp.walls.length,furniture:work.furniture,rotation})[dir];}
for(const [rot,dir,cx,cy,axis,raw,sign]of [[0,'t',2000,400,1,200,1],[90,'r',3800,1500,0,4000,-1],[180,'b',2000,2800,1,3000,-1],[270,'l',400,1500,0,200,1]])for(const flip of [false,true]){
 const work=fixtureWork(rot,flip);Object.assign(work.furniture[0],{cx,cy});const current=measured(work,dir);assert.equal(current.entity.wallDatum,'survey');near(axis?current.b.y:current.b.x,raw);
 for(const gap of [0,5,29.999,30,30.001,100]){
  const moved=D.placeSelectionAtDirectionalGap(P.effectivePlan(base.plan,work),work,['m'],dir,gap)[0],after=structuredClone(work);after.furniture=[moved];near((axis?moved.cy:moved.cx)-sign*90,raw+sign*gap);near(measured(after,dir).distance,gap);
  const plan=P.effectivePlan(base.plan,after);assert(!P.spaceCheck(plan,after.furniture,{scanPassages:false}).some(v=>['wall','outside','overlap','model'].includes(v.kind)),'numeric position, finish opening and collision agree');
  const repeated=D.placeSelectionAtDirectionalGap(plan,after,['m'],dir,gap)[0];near(repeated.cx,moved.cx);near(repeated.cy,moved.cy);
  const packed=P.unpack(P.pack({planId:base.plan.id,current:after,designs:[{name:'零距',work:after}],catalog:[]}));near(measured(packed.current,dir).distance,gap);
 }
}
const work=fixtureWork(0,false);near(measured(work,'t').distance,110);const normal=structuredClone(work);normal.furniture[0]={...normal.furniture[0],type:'block'};delete normal.furniture[0].manifoldLengths;delete normal.furniture[0].manifoldLoops;near(measured(normal,'t').distance,80);assert.equal(measured(normal,'t').entity.wallDatum,'finished','ordinary furniture retains finished-face zero');
assert.equal(measured(work,'b').entity.wallDatum,'finished','service front still measures to the actual finished face');
const moved=D.placeSelectionAtDirectionalGap(P.effectivePlan(base.plan,work),work,['m'],'r',0,{rotation:90})[0];near(moved.cy,290);near(moved.cx,2000);
const invalid=JSON.stringify(work);assert.throws(()=>D.placeSelectionAtDirectionalGap(P.effectivePlan(base.plan,work),work,['m'],'t',-1));assert.equal(JSON.stringify(work),invalid);
const renderer=fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx=vm.createContext({state:work,tr:(zh)=>zh,nm:v=>v});vm.runInContext(renderer.slice(0,renderer.indexOf('function measurementDirectionLabel')),ctx);ctx.value=measured(work,'t');assert(vm.runInContext('measurementReferenceName(value)',ctx).includes('毛坯墙面'),'reference label describes the measured structural face');
console.log('PASS manifold rear zero uses raw wall at contact and from a gap; four wall directions/mirrors, 0/5/30 mm boundaries, drawing rotation, actual tile/collision agreement, no drift, named roundtrip and ordinary-furniture behavior');
