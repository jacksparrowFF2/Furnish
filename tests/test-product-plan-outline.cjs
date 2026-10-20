const assert=require('node:assert/strict'),G=require('../src/core/layout-geometry.js'),R=require('../src/core/product-rules.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js');
const f={id:'ac',name:'空调',type:'aircon_midea_ultra_2hp',cx:0,cy:0,w:395,d:436,h:1856,rot:45};
const near=(a,b,tol=1e-7)=>assert(Math.abs(a-b)<tol,`${a} versus ${b}`);
for(const rot of [0,37,45,90,225])for(const flip of [false,true]){
 const unit={...f,rot,flip},points=G.footprints(unit)[0],box=G.bbox(points),B=G.aabb(unit),rect=G.bbox(G.corners(unit));
 near(B.hw,Math.max(-box[0],box[2]));near(B.hh,Math.max(-box[1],box[3]));assert.deepEqual(G.groupBox([unit]),box);assert(B.hw<=rect[2]+1e-6&&B.hh<=rect[3]+1e-6);
 const wall=box[2]+60,opts={rects:[[wall,-1000,wall+100,1000]],furniture:[unit]};
 near(S.directional(unit,opts).r.distance,60);near(S.nearest(unit,opts).distance,60);
 const rotated=S.directional(unit,{...opts,rotation:90});near(rotated.b.distance,60);
 const v=points.reduce((a,b)=>a[0]>b[0]?a:b),hit=S.measurePoint({x:v[0]+.1,y:v[1]+.1},{scale:10,furniture:[unit]});
 assert(S.nearest({...unit,id:'probe',cx:hit.point.x,cy:hit.point.y,w:.001,d:.001,type:'custom',rot:0},{furniture:[unit]}).distance<.01);
 const moved=S.move(unit,0,0,{grid:10,scale:1,wallSnap:true,guides:false,rects:[[box[2]+3,-1000,box[2]+103,1000]],furniture:[unit],skip:new Set([unit.id])});
 near(moved.position[0],3,.01);
}
const rectBox=G.bbox(G.corners(f)),actual=G.bbox(G.footprints(f)[0]);assert(rectBox[2]-actual[2]>40);
const other={id:'other',type:'custom',cx:rectBox[2]-10,cy:0,w:20,d:20,h:800,rot:0};
assert(!G.obbOverlap(f,other));assert.deepEqual(G.collisions([f,other]),[]);
const plan={rooms:[{id:'r',poly:[[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000]]}],walls:[],doors:[]};
assert(!P.spaceCheck(plan,[f,other],{scanPassages:false}).some(i=>i.kind==='overlap'));
assert(G.obbOverlap(f,{...other,cx:0}));assert(G.collisions([f,{...other,cx:0}]).length);
assert(!G.verticalOverlap(f,{...other,mountHeight:1856},[{bottom:0,top:1856},{bottom:1856,top:2000}]));
assert(G.verticalOverlap(f,other,[null,null]));
const unit={...f,rot:0},slab=depth=>({id:'slab',type:'custom',cx:395/2-depth+50,cy:0,w:100,d:2000,rot:0});
assert(!G.obbOverlap(unit,slab(5)));assert(G.obbOverlap(unit,slab(6)));
assert.equal(R.planOutline({...f,obj:{}}),null);assert.equal(R.planOutline({...f,type:'aircon'}),null);
const payload={planId:'test',current:{furniture:[f]},designs:[],catalog:[]};
let restored=payload;for(let i=0;i<3;i++){restored=P.unpack(P.pack(restored));assert.deepEqual(G.footprints(restored.current.furniture[0]),G.footprints(f));}
const issue={kind:'overlap',ids:['ac','other']},key=P.checkFingerprint(issue,plan,[f],800);
assert(key.includes('product-plan-shapes-v1'));assert(!P.checkFingerprint(issue,plan,[other],800).includes('product-plan-shapes-v1'));
assert.equal(key,P.checkFingerprint(issue,plan,[{...f,color:'#fff',price:100}],800));
console.log('PASS product outlines: rotated/mirrored bounds, directional/nearest distances, snapping, false/true overlaps, 5 mm threshold, unknown heights, rectangular fallback and repeated project roundtrip');

(async()=>{
 const fs=require('node:fs'),html=fs.readFileSync(require.resolve('../index.html'),'utf8'),T=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),Model=require('../src/render/aircon-midea-model.js');
 let max=0;
 for(const scale of [1,.7,1.4])for(const rot of [0,37,45,90])for(const flip of [false,true]){
  const unit={...f,w:f.w*scale,d:f.d*scale,rot,flip},o=Model.build(T,unit);o.rotation.y=-rot*Math.PI/180;o.scale.x=flip?-1:1;o.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(o,true),box=G.bbox(G.footprints(unit)[0]);
  const error=Math.max(...[b.min.x*1000-box[0],b.min.z*1000-box[1],b.max.x*1000-box[2],b.max.z*1000-box[3]].map(Math.abs));max=Math.max(max,error);assert(error<.3*scale,`production outline error ${error} mm`);
 }
 console.log(`PASS actual production mesh bounds (precise vertex transform), three sizes, rotations/mirrors; max difference ${max.toFixed(3)} mm`);
})().catch(e=>{console.error(e);process.exitCode=1;});
