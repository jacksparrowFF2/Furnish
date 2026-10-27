const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const opts={grid:10,scale:.2,wallSnap:true,guides:true,furniture:[]};
for(const rot of [0,90,180,270])for(const flip of [false,true])for(const axis of ['w','d']){
 const f={id:'cabinet',type:'cabinet',cx:3000,cy:3000,w:1200,d:400,rot,flip},a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),u=axis==='w'?[c,s]:[-s,c],v=axis==='w'?[-s,c]:[c,s];
 const anchor=[f.cx-f.w/2*c+f.d/2*s,f.cy-f.w/2*s-f.d/2*c],point=(w,d)=>({x:anchor[0]+w*c-d*s,y:anchor[1]+w*s+d*c});
 const value=f[axis]+123.375,span=f[axis==='w'?'d':'w'],center=[anchor[0]+u[0]*(value+500)+v[0]*(span+1800),anchor[1]+u[1]*(value+500)+v[1]*(span+1800)];
 const wall=G.bbox(G.corners({cx:center[0],cy:center[1],w:axis==='w'?1000:600,d:axis==='w'?600:1000,rot})),o={...opts,axis,rects:[wall]};
 const p=point(axis==='w'?value+30:f.w,axis==='d'?value+30:f.d),before=JSON.stringify(f),hit=S.resize(f,p,o),next=hit.furniture;
 near(next[axis],value);near(next.cx-next.w/2*c+next.d/2*s,anchor[0]);near(next.cy-next.w/2*s-next.d/2*c,anchor[1]);assert.equal(hit.guides.length,1);
 assert.equal(S.resize(f,p,{...o,guides:false}).guides.length,0);assert.equal(S.resize(f,p,{...o,wallSnap:false}).guides.length,0);
 const moved=S.move(f,next.cx+u[0]*30,next.cy+u[1]*30,{...opts,rects:[wall]});assert(moved.guides.length,'move draws wall alignment guide');
 near((moved.position[0]-anchor[0])*u[0]+(moved.position[1]-anchor[1])*u[1]+f[axis]/2,value);
 for(const error of [49.999,50,50.001]){const q=point(axis==='w'?value+error:f.w,axis==='d'?value+error:f.d);assert.equal(S.resize(f,q,o).guides.length,error<=50?1:0);}
 let saved=next;for(let i=0;i<3;i++){saved=P.unpack(P.pack({planId:'extension',current:{furniture:[saved]},designs:[],catalog:[]})).current.furniture[0];near(saved[axis],value);}
 assert.equal(JSON.stringify(f),before);
}
const kitchen=K.configure({id:'k',type:'counter',cx:3000,cy:3000,rot:0},{version:1,shape:'U',depth:600,baseHeight:820,thickness:20,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'},{run:2,width:1200,role:'door'}]});
const y=kitchen.cy+kitchen.d/2+113.375,wall=[6000,y,6500,y+1000],o={...opts,start:{x:0,y:0},rects:[wall]};
near(K.runDepth(S.resizeKitchenOuter(kitchen,'bottom',{x:0,y:90},o).furniture,2),713.375);
assert.equal(S.resizeKitchenOuter(kitchen,'bottom',{x:0,y:90},{...o,guides:false}).guides.length,0);
const f={id:'f',type:'cabinet',cx:0,cy:0,w:1200,d:400,rot:0};
assert.equal(S.resize(f,{x:723.375,y:200},{...opts,axis:'w',rects:[[723.375,7000,823.375,7600]]}).guides.length,0,'bounded alignment search');
console.log('PASS remote wall extension move/resize, cardinal rotations/mirrors/axes, capture thresholds, switches, fixed anchors, kitchen outer edge, bounded search and repeated project roundtrip');
