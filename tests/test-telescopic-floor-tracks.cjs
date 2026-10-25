'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),M=require('../src/render/sliding-opening-model.js'),G=require('../src/core/layout-geometry.js'),Project=require('../src/core/project-core.js'),SVG=require('../src/render/furniture-svg.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const base={id:'a',type:'tripleslidingdoor',name:'联动门',w:2400,d:90,h:2400,cx:0,cy:0,rot:0,color:'#41474b'};
for(const type of ['doubleslidingdoor','tripleslidingdoor']){
 const f={...base,type};assert.equal(P.value(f,'floorTrack'),false);assert.equal(f.floorTrack,undefined);
 const layout=P.slidingLayout(f);assert.equal(layout.floorTracks.length,layout.leaves.filter(l=>l.x!==l.opened).length);assert.ok(layout.floorTracks.every(t=>t.leafIndex>0));
 for(const floorTrack of [undefined,false,true]){
  const saved={...f,...(floorTrack===undefined?{}:{floorTrack})},work={furniture:[saved]},restored=Project.unpack(Project.pack({planId:'tracks',current:work,designs:[{name:'地轨',work}],catalog:[]}));assert.deepEqual(restored.current,work);assert.deepEqual(restored.designs[0].work,work);
 }
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),models=M.create(THREE);
 for(const type of ['doubleslidingdoor','tripleslidingdoor'])for(const order of ['leading-front','leading-back'])for(const rot of [0,37,90,180])for(const flip of [false,true])for(const floorTrack of [false,true])for(const joined of [false,true]){
  const f={...base,type,slidingTrackOrder:order,rot,flip,floorTrack},angle=rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),other={...base,id:'b',cx:1200*c-900*s,cy:1200*s+900*c,w:1800,d:120,rot:rot+90,floorTrack:true},items=joined?[f,other]:[f];
  const model=models.build(f,{furniture:items});model.position.set(f.cx/1000,0,f.cy/1000);model.rotation.y=-angle;model.scale.x=f.flip?-1:1;model.updateWorldMatrix(true,true);
  const door=model.userData.slidingDoor,moving=door.leaves.flatMap((l,i)=>Math.abs(l.closed-l.opened)>1e-9?[i]:[]),tracks=model.getObjectByName('floor-track'),parts=G.bodyParts(f,undefined,items).filter(p=>p.partRole==='floor-rail');
  const svg=SVG.render(type,f.w,f.d,f.color,{ink:'#333'},f,{furniture:items});assert.equal((svg.match(/data-sliding-floor-track=/g)||[]).length,floorTrack?moving.length:0);
  if(!floorTrack){assert.equal(tracks,undefined);assert.equal(parts.length,0);continue;}
  assert.equal(tracks.children.length,moving.length);assert.equal(parts.length,moving.length);assert.deepEqual(tracks.children.map(t=>t.userData.slidingLeafIndex),moving);
  const normal=new THREE.Vector3(-s,0,c),vertices=node=>Array.from({length:node.geometry.attributes.position.count},(_,i)=>node.localToWorld(new THREE.Vector3().fromBufferAttribute(node.geometry.attributes.position,i)).toArray()),before=tracks.children.map(vertices);
  tracks.children.forEach((track,i)=>{const values=before[i].map(v=>new THREE.Vector3(...v).dot(normal)),leaf=door.leaves[moving[i]],center=leaf.node.getWorldPosition(new THREE.Vector3());near((Math.min(...values)+Math.max(...values))/2,center.dot(normal));near(Math.min(...before[i].map(v=>v[1])),0);near(Math.max(...before[i].map(v=>v[1])),.008);});
  door.leaves.forEach(l=>l.node.position.x=l.opened);model.updateWorldMatrix(true,true);assert.deepEqual(tracks.children.map(vertices),before,'tracks remain fixed after all moving leaves open');
 }
 assert.equal(models.build({...base,type:'doubleslidingdoor',floorTrack:true}).getObjectByName('floor-track').children.length,1);
 assert.equal(models.build({...base,floorTrack:true}).getObjectByName('floor-track').children.length,2);
 assert.equal(models.build({...base,type:'slidingdoor',floorTrack:true}).getObjectByName('floor-track').children.length,2,'ordinary sliding door keeps historical lower rails');
 assert.equal(models.build({...base,type:'tripleslidingwindow',mountHeight:900,floorTrack:true}).getObjectByName('floor-track').children.length,3,'window lower frame keeps all lanes');
 assert.equal(models.buildOpening(2.4,.09,2.4,3,'#41474b',{floorTrack:true}).getObjectByName('floor-track').children.length,2,'architectural telescopic door has two moving rails');
 assert.equal(models.buildOpening(2.4,.09,1.5,3,'#41474b',{floorTrack:true,floorTrackMode:'all'}).getObjectByName('floor-track').children.length,3);
 assert.equal(models.buildOpening(3.2,.12,2.4,4,'#41474b',{floorTrack:true}).getObjectByName('floor-track').children.length,3,'count derives from actual travel, including more panels');
 const plan={rooms:[],walls:[],doors:[]},key=f=>Project.checkFingerprint({kind:'overlap'},plan,[f],800);assert.ok(!key(base).includes('telescopic-moving-floor-tracks-v1'));assert.ok(key({...base,floorTrack:true}).includes('telescopic-moving-floor-tracks-v1'));
 console.log('PASS telescopic floor tracks: hanging defaults, moving-only count, real rail alignment, fixed open-state rails, 2D/solids, rotation/mirror/order/corners, legacy windows/doors, and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
