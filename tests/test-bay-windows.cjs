const {rootPath}=require('./helpers/paths.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/floorplan-core.js'),D=require('../src/io/dxf-import.js'),P=require('../src/core/project-core.js');
const p=D.parse(fs.readFileSync(rootPath('templates/furnish-template-example.dxf'),'utf8')),d=D.draft(p,{id:'custom_bay',name:'飘窗测试',mmPerUnit:1,layers:['FURNISH_EXTERIOR','FURNISH_BEARING','FURNISH_PARTITION'],layerKinds:{FURNISH_EXTERIOR:'e',FURNISH_BEARING:'b',FURNISH_PARTITION:'n'},thickness:200});
const clone=v=>JSON.parse(JSON.stringify(v)),top=d.walls.find(w=>w.kind==='b');
d.openings.push({id:'bay_test',wall:top.id,t:0.25,length:1200,kind:'window',side:1,entry:false,bay:{depth:600,height:450,head:2400}});
const plan=C.build(d),q=P.quantities(plan),bay=plan.rooms.find(r=>r.bayId);
const front=plan.wins.find(w=>w.bayPart==='front'),leftFace=plan.wins.find(w=>w.bayPart==='left'),rightFace=plan.wins.find(w=>w.bayPart==='right');
assert.deepEqual(front.frameLine[0],leftFace.frameLine[1]);assert.deepEqual(front.frameLine[1],rightFace.frameLine[1]);
for(const pt of front.frameLine){for(const face of [front,pt===front.frameLine[0]?leftFace:rightFace])assert.ok(pt[0]>=face.rect[0]&&pt[0]<=face.rect[2]&&pt[1]>=face.rect[1]&&pt[1]<=face.rect[3]);}
assert.equal(plan.wins.length,3);assert.equal(plan.rooms.filter(r=>r.counted!==false).length,2);assert.equal(bay.counted,false);assert.equal(bay.height,.45);assert.ok(Math.abs(q.net-21.28)<1e-8);assert.equal(new Set(plan.winRefs).size,3);
const topY=top.a[1]*d.scale;assert.ok(bay.poly.some(p=>p[1]<topY-200));assert.ok(plan.wins.every(w=>w.sill===.45&&w.head===2.4));
const plain=clone(d);delete plain.openings[0].bay;const baselinePaint=P.quantities(C.build(plain)).paint;assert.ok(Math.abs(q.paint-(baselinePaint-1.2*(.9-.45)))<1e-8);
const reversed=clone(d),w=reversed.walls.find(w=>w.id===top.id);[w.a,w.b]=[w.b,w.a];reversed.openings[0].t=.75;assert.deepEqual(C.build(reversed).rooms.find(r=>r.bayId).poly,bay.poly);
const vertical=clone(d),left=vertical.walls.find(w=>w.a[0]===w.b[0]&&w.a[0]<d.width/2);vertical.openings[0].wall=left.id;vertical.openings[0].t=.5;assert.equal(C.build(vertical).wins.length,3);
// Side frames attach outside the wall end; their inner edges align to the clear opening.
for(const draft of [d,reversed,vertical]){
 const built=C.build(draft),o=draft.openings[0],wall=draft.walls.find(w=>w.id===o.wall),axis=wall.a[1]===wall.b[1]?0:1,normal=1-axis;
 const faces=built.wins.filter(w=>w.bayId===o.id),f=faces.find(w=>w.bayPart==='front'),l=faces.find(w=>w.bayPart==='left'),r=faces.find(w=>w.bayPart==='right'),hole=f.paintRect;
 assert.deepEqual(l.frameLine[1],f.frameLine[0]);assert.deepEqual(r.frameLine[1],f.frameLine[1]);
 assert.equal(l.rect[axis+2],hole[axis]);assert.equal(r.rect[axis],hole[axis+2]);
 assert.equal(l.rect[normal+2]-l.rect[normal],o.bay.depth);assert.equal(r.rect[normal+2]-r.rect[normal],o.bay.depth);
 for(const face of [l,r])assert.ok(face.frameLine[0][normal]===hole[normal]||face.frameLine[0][normal]===hole[normal+2]);
}
const interior=clone(d);interior.openings[0].wall=interior.walls.find(w=>w.kind==='n').id;interior.openings[0].t=.5;assert.throws(()=>C.build(interior),/外围墙/);
// A side frame outside the facade must not falsely collide with a nearby interior partition.
const nearJamb=clone(d),partition=nearJamb.walls.find(w=>w.kind==='n'),partitionRect=C.wallRect(partition,nearJamb.scale,nearJamb.walls),nearOpening=nearJamb.openings[0];
const nearCenter=partitionRect[2]+20+nearOpening.length/2;
nearOpening.t=(nearCenter-top.a[0]*d.scale)/((top.b[0]-top.a[0])*d.scale);
assert.equal(C.build(nearJamb).wins.length,3);
const bad=clone(d);bad.openings[0].bay.height=2500;assert.throws(()=>C.build(bad),/台高/);
const crossing=clone(d);crossing.openings[0].t=.5;assert.throws(()=>C.build(crossing),/junction/);
const locked=P.architecture({draft:d,phase:'design'}),change=clone(d);change.openings[0].bay.depth=800;assert.throws(()=>P.assertStructure(locked.baseline,change),/locked/);
const packed=P.unpack(P.pack({planId:d.id,current:{furniture:[],architecture:{draft:d,phase:'survey'}},designs:[],catalog:[]}));assert.deepEqual(packed.current.architecture.draft.openings[0].bay,d.openings[0].bay);
console.log('PASS bay platform, 3 faces, area/paint, horizontal/vertical/reversed walls, invalid placement/heights, structural lock and backup roundtrip');
