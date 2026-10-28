'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),Project=require('../src/core/project-core.js'),SVG=require('../src/render/furniture-svg.js');
const base={id:'a',type:'telescopicdoor20',name:'2+0',w:2400,d:100,h:2400,cx:0,cy:0,rot:0,color:'#41474b',slidingStackSide:'left'},near=(a,b)=>A.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
const actual=[{...base,id:'actual-a',cx:8666,cy:8959.666666666699,w:1227.3333333333035,rot:270,floorTrack:true,slidingOpen:true},{...base,id:'actual-b',cx:7989.333333333364,cy:8396,w:1253.3333333333644,floorTrack:true,slidingOpen:true}];
A.ok(actual.every(f=>P.slidingCorner(f,actual)));A.deepEqual(G.collisions(actual),[]);A.deepEqual(G.collisions(actual.map(f=>({...f,slidingOpen:false}))),[]);const plan={rooms:[],walls:[],doors:[]},key=items=>Project.checkFingerprint({kind:'overlap'},plan,items,800);A.ok(key(actual).includes('telescopic-20-corners-v1'));A.ok(!key([base]).includes('telescopic-20-corners-v1'));const work={furniture:actual},round=Project.unpack(Project.pack({planId:'20corner',current:work,designs:[{name:'corner',work}],catalog:[]}));A.deepEqual(round.current,work);A.deepEqual(round.designs[0].work,work);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),models=require('../src/render/sliding-opening-model.js').create(T);let cases=0;
 for(const pair of [['telescopicdoor20','telescopicdoor20'],['telescopicdoor20','doubleslidingdoor'],['telescopicdoor20','tripleslidingdoor'],['doubleslidingdoor','telescopicdoor20'],['tripleslidingdoor','telescopicdoor20']])for(const rot of [0,37,90,180])for(const flip of [false,true])for(const otherFlip of [false,true])for(const turn of [-1,1])for(const order of ['leading-front','leading-back'])for(const otherOrder of ['leading-front','leading-back']){
  const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),items=[{...base,type:pair[0],rot,flip,slidingStackSide:flip?'right':'left',slidingTrackOrder:order,floorTrack:true},{...base,id:'b',type:pair[1],w:1800,d:120,rot:rot+turn*90,flip:otherFlip,slidingStackSide:otherFlip?'left':'right',slidingTrackOrder:otherOrder,cx:1200*c-turn*900*s,cy:1200*s+turn*900*c,floorTrack:turn===1}];
  items.forEach(f=>{if(f.type!=='telescopicdoor20')delete f.slidingStackSide;});
  const edges=[],built=items.map(f=>{const g=models.build(f,{furniture:items});g.position.set(f.cx/1000,0,f.cy/1000);g.rotation.y=-f.rot*Math.PI/180;g.scale.x=f.flip?-1:1;g.updateWorldMatrix(true,true);return g;});
  items.forEach((f,j)=>{
   const corner=P.slidingCorner(f,items);A.ok(corner,JSON.stringify({cases,j,items}));const layout=P.slidingLayout(f,corner),g=built[j],door=g.userData.slidingDoor,track=g.getObjectByName('top-track'),positions=track.geometry.attributes.position,points=Array.from({length:positions.count},(_,i)=>track.localToWorld(new T.Vector3().fromBufferAttribute(positions,i)));
   let jambs=0;g.traverse(o=>{if(o.name==='side-jamb')jambs++;});A.equal(jambs,f.type==='telescopicdoor20'?0:1);A.equal(door.leaves.length,P.definition(f).telescopic.panels);
   const I=new T.Vector3(1.2*c,2.4,1.2*s);edges.push(points.filter(p=>p.y>2.399&&p.distanceTo(I)<.2));
   const angle=f.rot*Math.PI/180,world=([x,z],y)=>new T.Vector3((f.cx+x*(f.flip?-1:1)*Math.cos(angle)-z*Math.sin(angle))/1000,y,(f.cy+x*(f.flip?-1:1)*Math.sin(angle)+z*Math.cos(angle))/1000);
   if(f.type==='telescopicdoor20')A.deepEqual(G.localOutline(f,{furniture:items}),layout.railOutline);
   layout.railOutline.forEach(p=>A.ok(points.some(q=>q.distanceTo(world(p,2.4))<1e-6)));
   const svg=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f,{furniture:items}),rects=[...svg.matchAll(/data-sliding-leaf="\d+"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)];A.equal(rects.length,door.leaves.length);
   rects.forEach((r,i)=>{const l=door.leaves[i],at=l.node.getWorldPosition(new T.Vector3()),expected=world([Number(r[1])+Number(r[3])/2,Number(r[2])+Number(r[4])/2],at.y);A.ok(at.distanceTo(expected)<1e-6);near(Number(r[3]),l.width*1000);});
   door.leaves.forEach(l=>l.node.traverse(o=>{if(o.geometry)A.equal(o.geometry.type,'BoxGeometry');}));
   if(f.type==='telescopicdoor20'){const frame=P.slidingResizeFrame(f);A.ok(points.some(p=>Math.hypot(p.x*1000-frame.anchor[0],p.z*1000-frame.anchor[1])<.001),'joining preserves the actual far parking datum');}
   door.leaves.forEach(l=>l.node.position.x=l.opened);g.updateWorldMatrix(true,true);
   door.leaves.forEach(l=>{const b=new T.Box3().setFromObject(l.node),center=b.getCenter(new T.Vector3());A.ok(Math.hypot(center.x-I.x,center.z-I.z)>.4,'all leaves stack away from the joint');});
   door.leaves.forEach(l=>l.node.position.x=l.closed);g.updateWorldMatrix(true,true);
  });
  A.equal(edges[0].length,2);A.equal(edges[1].length,2);edges[0].forEach(p=>A.ok(edges[1].some(q=>p.distanceTo(q)<1e-6)));A.deepEqual(G.collisions(items),[],'closed panels '+JSON.stringify({cases,items}));
  const original=G.bodyParts(items[0],undefined,items),separate=G.bodyParts(items[0],undefined,[items[0],{...items[1],cx:items[1].cx+1000,cy:items[1].cy+1000}]);A.notDeepEqual(original,separate);cases++;
 }
 for(const f of actual){const g=models.build(f,{furniture:actual});let posts=0;g.traverse(o=>{if(o.name==='side-jamb')posts++;});A.equal(posts,0);A.equal(g.userData.slidingDoor.open,true);}
 const a={...base},b={...base,id:'b',cx:1200,cy:900,w:1800,rot:90,slidingStackSide:'right'};
 for(const change of [{cx:4000},{h:2401.01},{rot:85},{slidingStackSide:'left'}]){const items=[a,{...b,...change}];A.equal(P.slidingCorner(a,items),null);A.equal(P.slidingCorner(items[1],items),null);A.equal(models.build(a,{furniture:items}).getObjectByName('side-jamb')?.name,'side-jamb');}
 const chain=[a,{...b,slidingStackSide:'left'},{...base,id:'c',cx:300,cy:1800,w:1800}];A.equal(P.slidingCorner(a,chain),null,'a neighbor joined at its opposite end cannot remove this column');A.equal(P.slidingCorner(chain[1],chain).partnerId,'c');
 A.ok(P.slidingCorner(a,[a,{...b,h:2401}]));A.equal(P.slidingCorner(a,[a,b],{furnitureDatum:'finished-floor',rooms:[],floorFinish:{regions:[]}}),null);
 console.log('PASS '+cases+' 2+0/new-old corner combinations, no column, shared miter, rectangular closed contact, 2D/3D, fixed parking datum, open clearance, production cache, actual screenshot fixture, fallback and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
