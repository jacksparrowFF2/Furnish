const assert=require('node:assert/strict'),fs=require('fs'),F=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
const data=P.unpack(JSON.parse(fs.readFileSync('tests/fixtures/beam-heights-project.json','utf8'))),d=data.current.architecture.draft;
const original=JSON.stringify(d),known=F.editBeam(d,'beam-door',1850,2200);
assert.equal(JSON.stringify(d),original);assert.equal(F.beamVertical(d.beams[0]),null);
assert.deepEqual(F.build(known).beams[0].poly,d.beams[0].poly.map(p=>p.map(v=>v*d.scale)));
assert.deepEqual(F.beamVertical(F.build(known).beams[0]),{bottom:1850,top:2200});
for(const [b,t]of [[0,0],[2000,1900],[-1,2000],[0,20001],['1850',2200],[null,2200],[1850,undefined],[undefined,2200],[NaN,2200],[0,Infinity]])assert.throws(()=>F.editBeam(d,'beam-door',b,t));
assert.throws(()=>F.editBeam(d,'missing',0,100));assert.deepEqual(F.editBeam(known,'beam-door').beams,d.beams);
const plan=F.build(d);plan.ceilingHeight=4000;plan.rooms.forEach(r=>r.ceilingHeight=4000);
for(const [fid,bid,kind]of [['peg','beam-door','cabinetdoor'],['drawer','beam-drawer','cabinetdrawer'],['side','beam-lift','cabinetdoor']]){
 const f=data.current.furniture.find(f=>f.id===fid),z=C.openingZones(f).find(z=>z.kind===kind&&(fid!=='side'||z.section==='display')),b=plan.beams.find(b=>b.id===bid);
 const check=(beam)=>P.spaceCheck({...plan,beams:[beam]},[f],{scanPassages:false}).filter(v=>v.kind===kind&&(fid!=='side'||v.section==='display'));
 assert(check(b).some(v=>v.pending),'unknown height remains pending');
 assert.equal(check({...b,bottomHeight:3900,topHeight:4000}).length,0,'beam entirely above travel clears');
 assert(check({...b,bottomHeight:0,topHeight:3900}).some(v=>!v.pending&&/房梁/.test(v.message)),'known beam conflicts');
 const top=z.ranges[0][1];assert.equal(check({...b,bottomHeight:top,topHeight:top+100}).length,0,'vertical contact clears');
 if(fid!=='side')assert(check({...b,bottomHeight:top-1,topHeight:top+100}).some(v=>!v.pending),'1mm penetration detected');
}
// Above-hinge beam and empty sweep-envelope corner, including arbitrary rotation/mirror.
const lift=data.current.furniture.find(f=>f.id==='side');
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={...lift,rot,flip},z=C.openingZones(f).find(v=>v.section==='display'),sw=z.sweep,x=(sw.left+sw.right)/2,front=-f.d/2+f.cabinet.sideboard.upperDepth,pivot=f.cabinet.sideboard.baseHeight+f.cabinet.sideboard.counterThickness+f.cabinet.sideboard.nicheHeight+f.cabinet.sideboard.displayHeight-1;
 const beam=(y,bottom)=>{const angle=rot*Math.PI/180,xx=x*(flip?-1:1),cx=f.cx+xx*Math.cos(angle)-y*Math.sin(angle),cy=f.cy+xx*Math.sin(angle)+y*Math.cos(angle);return {id:'top',name:'顶部梁',review:'beam-height',poly:P.polygon({cx,cy,w:20,d:20,rot}),bottomHeight:bottom,topHeight:bottom+20};};
 const hits=(b,cab=f)=>P.spaceCheck({...plan,beams:[b]},[cab],{scanPassages:false}).filter(v=>v.section==='display'&&/顶部梁/.test(v.message));
 assert(hits(beam(front+100,pivot+160)).some(v=>!v.pending),'above-hinge beam');
 const ninety=structuredClone(f);ninety.cabinet.doorMaxAngle=90;
 assert.equal(hits(beam(front+100,pivot+160),ninety).length,0,'90 degrees cannot reach upper beam');
 // Far-forward/top corner is outside the circular sweep, despite the common AABB.
 assert.equal(hits(beam(front+1250,pivot+1200)).length,0,'empty envelope corner');
}
data.current.architecture={draft:known,baseline:d,phase:'design'};P.architecture(data.current.architecture);
data.designs=[{id:'named',name:'梁高方案',planId:d.id,work:structuredClone(data.current)}];
const restored=P.unpack(P.pack(data));assert.deepEqual(restored.current.architecture.draft.beams,known.beams);assert.deepEqual(restored.current.architecture.baseline.beams,d.beams);assert.deepEqual(restored.designs[0].work.architecture.draft.beams,known.beams);
console.log('PASS beam heights: absolute units, atomic validation, clearing, legacy unknown, known doors/drawers/lift sweep, face contact, locked baseline and named backup');
(async()=>{
 const vm=require('node:vm'),html=fs.readFileSync('index.html','utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const source=html.slice(html.indexOf('  for(const beam of syncIdentity.records('),html.indexOf('  syncIdentity.each("index.html:generator-45",WALLS,(w, i) => {',html.indexOf('function buildArch(){')));
 const shape=html.match(/function shapeOf\(poly, flip\).*$/m)[0];
 const context=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,FurnishDraft:F,PLAN:F.build(known),M:v=>v/1000,wx:v=>v/1000-5,wz:v=>v/1000-5,mat:()=>new THREE.MeshStandardMaterial(),opt:{cut:2.8},top:2.8,archUp:new THREE.Group()}));
 vm.runInContext(shape+'\n'+source,context);assert.equal(context.archUp.children.length,1,'unknown beams have no invented 3D solids');
 const mesh=context.archUp.children[0],bounds=new THREE.Box3().setFromObject(mesh);assert(Math.abs(bounds.min.y-1.85)<1e-6);assert(Math.abs(bounds.max.y-2.2)<1e-6);
 assert(Math.abs(bounds.min.x-(Math.min(...known.beams[0].poly.map(p=>p[0]))*d.scale/1000-5))<1e-6);assert(Math.abs(bounds.min.z-(Math.min(...known.beams[0].poly.map(p=>p[1]))*d.scale/1000-5))<1e-6);
 context.archUp.clear();context.opt.cut=1.2;context.top=1.2;vm.runInContext(source,context);assert.equal(context.archUp.children[0].visible,false);
 const signature=html.match(/const a = (JSON\.stringify\(\[.*?\]\)), f =/);assert(signature,'production architecture cache expression');
 context.state={rooms:{},demolished:{},open:{}};context.H=2.8;context.PLAN=F.build(d);
 const unknownSignature=vm.runInContext(signature[1],context);context.PLAN=F.build(known);
 assert.notEqual(vm.runInContext(signature[1],context),unknownSignature,'beam height edits invalidate production architecture geometry');
 console.log('PASS production Three.js beam extrusion, true XYZ placement, unknown omission, cut visibility and cache dependency');
})().catch(e=>{console.error(e);process.exitCode=1;});
