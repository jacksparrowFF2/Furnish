const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),C=require('../src/core/cabinet-core.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const opts={grid:10,scale:.2,wallSnap:true,guides:true,rects:[],furniture:[]};
// Actual TV-cabinet dimensions and nearby TV: the TV midpoint used to pull
// the already flush cabinet 40 mm away from the wall and 15 mm along it.
for(const type of C.types)for(const turn of [false,true])for(const flip of [false,true]){
 let f={id:'moving',type,cx:9931,cy:4195,w:2560,d:350,rot:90,flip},tv={id:'tv',type:'tv',cx:10026,cy:4180,w:1450,d:80,rot:270};
 let wall=[10106,2500,10256,6500];
 if(turn){const swap=o=>({...o,cx:o.cy,cy:o.cx,rot:90-o.rot});f=swap(f);tv=swap(tv);wall=[wall[1],wall[0],wall[3],wall[2]];}
 const o={...opts,rects:[wall],furniture:[f,tv]},before=JSON.stringify([f,tv]);
 const result=S.move(f,f.cx,f.cy,o);near(result.position[turn?1:0],turn?f.cy:f.cx);assert(!result.guides.some(g=>g.point),'overlapping TV midpoint must not break face contact');
 // Furniture boundary contacts receive the same protection.
 const target={id:'side',type:'cabinet',cx:(wall[0]+wall[2])/2,cy:(wall[1]+wall[3])/2,w:wall[2]-wall[0],d:wall[3]-wall[1],rot:0};
 near(S.move(f,f.cx,f.cy,{...o,rects:[],furniture:[f,tv,target]}).position[turn?1:0],turn?f.cy:f.cx);
 assert.equal(JSON.stringify([f,tv]),before);
}
let count=0;
const sliding={id:'slide',type:'tvstand',cx:800,cy:2000,w:2560,d:350,rot:90};
near(S.move(sliding,800,2000,{...opts,rects:[[975,0,1100,4000],[400,3300,975,3400]],furniture:[sliding]}).position[1],2020);
for(const template of C.templates)for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const axis of ['w','d']){
 const f={...C.preset(template[0]),id:'moving',type:C.templateType(template[0]),cx:4000,cy:4000,rot,flip};
 const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};
 const point=(w,d)=>({x:anchor.x+w*c-d*s,y:anchor.y+w*s+d*c});
 const value=f[axis]+120.375,w=axis==='w'?value:f.w,d=axis==='d'?value:f.d;
 // Reference cabinet starts exactly on the stretched edge; arbitrary rotation
 // uses real parallel edges, never its world AABB.
 const at=axis==='w'?point(value+100,d/2):point(w/2,value+100);
 const target={id:'target',type:'cabinet',cx:at.x,cy:at.y,w:axis==='w'?200:f.w,d:axis==='d'?200:f.d,rot,flip};
 const raw=point(w+(axis==='w'?30:0),d+(axis==='d'?30:0));
 const result=S.resize(f,raw,{...opts,axis,furniture:[f,target]}),next=result.furniture;
 near(next[axis],value);assert.equal(next[axis==='w'?'d':'w'],f[axis==='w'?'d':'w']);
 near(next.cx-next.w/2*c+next.d/2*s,anchor.x);near(next.cy-next.w/2*s-next.d/2*c,anchor.y);assert.equal(result.guides.length,1);
 const corners=G.corners(next);assert(corners.some(p=>Math.hypot(p[0]-point(w,d).x,p[1]-point(w,d).y)<1e-5));
 assert.equal(S.resize(f,raw,{...opts,axis,guides:false,furniture:[target]}).guides.length,0);
 const off={...target,cx:target.cx-10000*s,cy:target.cy+10000*c};
 if(axis==='w')assert.equal(S.resize(f,raw,{...opts,axis,furniture:[off]}).guides.length,0,'finite boundary');
 count++;
}
// Inclusive capture threshold, no snapping just outside, wall/furniture toggles,
// both-dimension handles, minimum size, and exact fractional persistence.
const f={id:'f',type:'tvstand',cx:600,cy:200,w:1200,d:400,rot:0},target={id:'t',type:'cabinet',cx:1700.375,cy:200,w:200,d:400,rot:0};
for(const error of [-50,50])near(S.resize(f,{x:1600.375+error,y:400},{...opts,axis:'w',furniture:[target]}).furniture.w,1600.375);
assert.equal(S.resize(f,{x:1650.376,y:400},{...opts,axis:'w',furniture:[target]}).guides.length,0);
near(S.resize(f,{x:1580,y:400},{...opts,axis:'w',guides:false,rects:[[1600.375,0,1700,800]]}).furniture.w,1600.375);
assert.equal(S.resize(f,{x:1580,y:400},{...opts,axis:'w',wallSnap:false,rects:[[1600.375,0,1700,800]]}).guides.length,0);
assert.equal(S.resize(f,{x:1202,y:400},{...opts,axis:'w',furniture:[f]}).guides.length,0,'self excluded');
const corner=S.resize(f,{x:1580,y:680},{...opts,rects:[[1600.375,0,1700,1000],[0,700.25,2000,800]]});near(corner.furniture.w,1600.375);near(corner.furniture.d,700.25);assert.equal(corner.guides.length,2);
const endContact=S.resize(f,{x:1580,y:400},{...opts,rects:[[1600,390,1700,600],[0,370,2000,380]]});near(endContact.furniture.w,1600);near(endContact.furniture.d,390);assert.equal(endContact.guides.length,2,'finite endpoint contact remains valid for a corner grip');
let saved=S.resize(f,{x:1580,y:400},{...opts,axis:'w',furniture:[target]}).furniture;
for(let i=0;i<3;i++){saved=P.unpack(P.pack({planId:'snap',current:{furniture:[saved],measures:[]},designs:[{name:'snap',work:{furniture:[saved],measures:[]}}],catalog:[]})).current.furniture[0];near(saved.w,1600.375);near(saved.cx-saved.w/2,0);}
console.log(`PASS all ${C.types.length} legacy cabinet types, ${C.templates.length} templates / ${count} rotated/mirrored axis resize cases, finite contacts, thresholds, switches, fixed anchors and repeated project roundtrip`);
