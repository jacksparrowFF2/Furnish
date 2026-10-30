const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Catalog=require('../src/data/catalog.js');
const near=(a,b,context='')=>assert(Math.abs(a-b)<2e-5,`${context}: ${a} != ${b}`),options={grid:10,scale:.2,wallSnap:true,guides:true,rects:[],furniture:[]};
const rows=Catalog.library.flatMap(g=>g.items),types=new Set(rows.map(r=>r[0]));let resizeCount=0,moveCount=0;
const kitchen=K.configure({id:'reference',type:'counter',cx:0,cy:0,w:2400,d:1800,rot:0},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'}]});
for(const row of rows)for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const angle=rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),world=(x,y)=>({x:5000+x*c-y*s,y:5000+x*s+y*c});
 const point=world(1500+row[2]/2,-650),f={id:'f',type:row[0],name:row[1],cx:point.x,cy:point.y,w:row[2],d:row[3],rot,flip},at=world(1515,-660),tv={id:'tv',type:'tv',cx:at.x,cy:at.y,w:80,d:200,rot};
 const target={...kitchen,cx:5000,cy:5000,rot,flip},before=JSON.stringify([f,target,tv]);
 const result=S.move(f,f.cx,f.cy,{...options,furniture:[f,target,tv]}).position;
 assert(Math.abs((result[0]-f.cx)*c+(result[1]-f.cy)*s)<2e-5,JSON.stringify({type:f.type,rot,flip,f,result}));assert.equal(JSON.stringify([f,target,tv]),before,'proposals are immutable');moveCount++;
 const moving=S.move(f,f.cx+10*c-90*s,f.cy+10*s+90*c,{...options,furniture:[f,target,tv]}).position;
 near((moving[0]-f.cx)*c+(moving[1]-f.cy)*s,0,`${f.type} rot=${rot} flip=${flip} move`);moveCount++;
 for(const axis of ['w','d']){
  const anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c},w=f.w+(axis==='w'?150.375:0),d=f.d+(axis==='d'?150.375:0);
  const p=(x,y)=>({x:anchor.x+x*c-y*s,y:anchor.y+x*s+y*c}),end=axis==='w'?p(w+100,d/2):p(w/2,d+100);
  const reference={id:'end',type:'block',cx:end.x,cy:end.y,w:axis==='w'?200:w,d:axis==='d'?200:d,rot,flip};
  const raw=p(w+(axis==='w'?25:0),d+(axis==='d'?25:0)),hit=S.resize(f,raw,{...options,axis,furniture:[f,reference]});
  near(hit.furniture[axis],axis==='w'?w:d);near(hit.furniture[axis==='w'?'d':'w'],f[axis==='w'?'d':'w']);
  near(hit.furniture.cx-hit.furniture.w/2*c+hit.furniture.d/2*s,anchor.x);near(hit.furniture.cy-hit.furniture.w/2*s-hit.furniture.d/2*c,anchor.y);
  assert.equal(hit.guides.length,1);resizeCount++;
 }
}
// Curved AC against a short boundary near its corner: rectangular side snapping
// used to show a guide despite a visible gap. Solve the real finite silhouette.
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={id:'ac',type:'aircon_midea_ultra_2hp',cx:2000,cy:2000,w:395,d:436,rot,flip},a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};
 const world=(x,y)=>({x:anchor.x+x*c-y*s,y:anchor.y+x*s+y*c}),at=world(570,390),target={id:'edge',type:'block',cx:at.x,cy:at.y,w:100,d:20,rot};
 const hit=S.resize(f,world(580,436),{...options,scale:.1,axis:'w',furniture:[target]});assert.equal(hit.guides.length,1);
 const outline=G.footprints(hit.furniture).flat().map(([x,y])=>({x:(x-anchor.x)*c+(y-anchor.y)*s,y:-(x-anchor.x)*s+(y-anchor.y)*c}));let support=-Infinity;
 for(let i=0;i<outline.length;i++){const p=outline[i],q=outline[(i+1)%outline.length];if(p.y>=380&&p.y<=400)support=Math.max(support,p.x);if(Math.abs(q.y-p.y)>1e-8)for(const y of [380,400]){const t=(y-p.y)/(q.y-p.y);if(t>=0&&t<=1)support=Math.max(support,p.x+t*(q.x-p.x));}}
 near(support,520);assert(hit.furniture.w>520,'corner silhouette must reach the finite edge');
 const saved=D.resizeFurniture(f,{w:hit.furniture.w,d:hit.furniture.d});Object.assign(saved,{cx:hit.furniture.cx,cy:hit.furniture.cy});
 near(P.unpack(P.pack({planId:'audit',current:{furniture:[saved]},designs:[],catalog:[]})).current.furniture[0].w,saved.w);
}
const curved={id:'curve',type:'aircon_midea_ultra_2hp',cx:197.5,cy:218,w:395,d:436,rot:0};
const both=S.resize(curved,{x:580,y:500},{...options,scale:.1,rects:[[520,380,620,400],[0,520,2000,620]]});
for(const guide of both.guides){const [a,b]=guide.line,rect=[Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y)];near(S.nearest(both.furniture,{rects:[rect]}).distance,0);}
console.log(JSON.stringify({passed:true,catalogRows:rows.length,types:types.size,rotations:[0,37,90,180,270],mirrors:true,moveCount,resizeCount,curvedFiniteEdgeCases:10}));
