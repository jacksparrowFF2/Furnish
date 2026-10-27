'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),Project=require('../src/core/project-core.js'),SVG=require('../src/render/furniture-svg.js');
const base={id:'20',name:'2+0',type:'telescopicdoor20',w:1800,d:90,h:2400,cx:0,cy:0,rot:0,color:'#41474b'},near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
assert.equal(P.value(base,'slidingStackSide'),'left');assert.equal(P.value(base,'slidingOpen'),false);assert.equal(P.slidingCorner(base,[]),null);
for(const [key,values] of Object.entries({slidingStackSide:['up',null,true],slidingOpen:[0,null,'true']}))for(const v of values)assert.throws(()=>Project.validateWork({furniture:[{...base,[key]:v}]}));
for(const side of ['left','right'])for(const open of [false,true]){
 const f={...base,slidingStackSide:side,slidingOpen:open},work={furniture:[f]},round=Project.unpack(Project.pack({planId:'20',current:work,designs:[{name:'门',work}],catalog:[]}));assert.deepEqual(round.current,work);assert.deepEqual(round.designs[0].work,work);
 let restored=work.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(restored,work.furniture);
 const replaced=D.replaceFurniture(f,{...base,type:'tv'});assert.equal(replaced.slidingOpen,undefined);assert.equal(replaced.slidingStackSide,undefined);
}
const plan={rooms:[],walls:[],doors:[]},key=f=>Project.checkFingerprint({kind:'overlap'},plan,[f],800);
assert.notEqual(key(base),key({...base,slidingOpen:true}));assert.notEqual(key(base),key({...base,slidingStackSide:'right'}));assert.equal(key(base),key({...base,color:'#fff',price:999}));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),models=require('../src/render/sliding-opening-model.js').create(T);
 for(const w of [600,1800,3200])for(const side of ['left','right'])for(const order of ['leading-front','leading-back'])for(const flip of [false,true])for(const rot of [0,37,90])for(const open of [false,true]){
  const f={...base,w,rot,flip,slidingStackSide:side,slidingTrackOrder:order,slidingOpen:open,floorTrack:true},layout=P.slidingLayout(f),g=models.build(f),door=g.userData.slidingDoor;
  assert.equal(door.leaves.length,2);assert.ok(door.leaves.every(l=>l.opened!==l.closed));assert.equal(g.getObjectByName('floor-track').children.length,2);assert.equal(door.open,open);
  g.updateWorldMatrix(true,true);
  door.leaves.forEach((l,i)=>{const at=l.node.getWorldPosition(new T.Vector3());near(at.x*1000,open?layout.leaves[i].opened:layout.leaves[i].x);near(at.z*1000,layout.leaves[i].z);near(l.width*1000,layout.width);});
  const sign=side==='left'?1:-1;assert.ok(layout.leaves.every(l=>l.opened*sign+l.width/2<=-w/2+1e-6));near(layout.leaves[0].opened,layout.leaves[1].opened);
  const svg=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f);assert.equal((svg.match(/data-sliding-leaf=/g)||[]).length,2);assert.ok(svg.includes(`x="${(open?layout.leaves[0].opened:layout.leaves[0].x)-layout.width/2}"`));
  g.rotation.y=-rot*Math.PI/180;g.scale.x=flip?-1:1;g.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(g),parts=G.bodyParts(f,undefined,[f]);assert.ok(parts.length>10);const vs=parts.flatMap(p=>p.p);near(box.min.x*1000,Math.min(...vs.map(p=>p[0])));near(box.max.x*1000,Math.max(...vs.map(p=>p[0])));
  let glass;g.traverse(o=>{if(o.material?.transparent)glass=o.material;});assert.equal(glass.color.getHexString(),'f7fcff');assert.equal(glass.depthWrite,false);
 }
 const closed=G.bodyParts(base),opened=G.bodyParts({...base,slidingOpen:true});assert.notDeepEqual(closed,opened,'numeric production cache changes with pose');
 assert.equal(models.build({...base,floorTrack:false}).getObjectByName('floor-track'),undefined);
 console.log('PASS 2+0: two moving leaves, left/right parking, actual meshes and numeric solids across sizes/rotation/mirror/order/poses, 2D, glass, field validation, replacement, repeat restore, named project roundtrip and review invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
