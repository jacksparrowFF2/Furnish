'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/zone-geometry.js');
const clone=v=>JSON.parse(JSON.stringify(v));
// The facade already has a solid-sided bump-out. The clear window is narrower than its recess.
const points=[[1000,1000],[2000,1000],[2000,400],[4000,400],[4000,1000],[5000,1000],[5000,5000],[1000,5000]];
const d={version:1,id:'custom_recessed_bay',name:'正面窗飘窗',source:'dxf',image:'',scale:10,width:600,height:600,
 walls:points.map((p,i)=>({id:'w'+i,a:p.map(v=>v/10),b:points[(i+1)%points.length].map(v=>v/10),kind:'e',thickness:200})),
 openings:[{id:'win',wall:'w2',t:.5,length:1200,kind:'window',side:1,entry:false,sill:450,head:2400}]};
const plain=C.build(d),converted=C.editOpening(d,'win',{bay:{type:'recessed',depth:600,height:450,head:2400}}),plan=C.build(converted),bay=plan.rooms.find(r=>r.bayId);
assert.deepEqual(plan.walls,plain.walls,'conversion preserves every existing wall');
assert.deepEqual(plan.wins[0].rect,plain.wins[0].rect,'front window stays in place');
assert.equal(plan.wins.length,1);assert.equal(bay.height,.45);assert.equal(bay.counted,false);
assert.equal(P.area(bay.poly),1.08,'platform fills the 1800 mm recess, not just the 1200 mm window');
assert.equal(Math.min(...bay.poly.map(p=>p[1])),500);assert.equal(Math.max(...bay.poly.map(p=>p[1])),1100);
assert.ok(Math.abs(P.quantities(plain).net-P.quantities(plan).net-1.08)<1e-8);
assert.equal(P.quantities(plan).paint,P.quantities(plain).paint,'platform boundary is not a new painted wall');
const settings=P.remapRooms(plain.rooms,plan.rooms,{room1:{name:'卧室',mat:'wood',use:'bedroom'}});
assert.deepEqual(settings[bay.id],{name:'飘窗台',mat:'marble',use:'bay'});
const customSettings={...settings,[bay.id]:{name:'卧室飘窗',mat:'tile800',use:'bay'}};
assert.deepEqual(P.remapRooms(plan.rooms,plan.rooms,customSettings)[bay.id],customSettings[bay.id]);
for(const r of plan.rooms.filter(r=>r.counted!==false))assert.equal(G.area(G.decompose([r.poly,bay.poly],p=>G.inside(p,r.poly)&&G.inside(p,bay.poly))),0);
assert.equal(P.openingSchedule(plan,{architecture:{draft:converted}})[0].type,'正面窗飘窗（两侧实墙）');
assert.equal(P.openingSchedule(plan,{architecture:{draft:converted}})[0].parts,1);
const passages=P.spaceCheck(plan,[],{passage:2000}).filter(v=>v.kind==='passage');
assert.ok(passages.every(v=>!G.inside(v.at,bay.poly)),'raised bay is not treated as a passage');
assert.ok(P.spaceCheck(plain,[],{passage:2000}).some(v=>v.kind==='passage'&&G.inside(v.at,bay.poly)),'baseline really scans the recess');
const variants=[clone(converted),clone(converted),clone(converted)];
variants[0].walls.forEach(w=>{[w.a,w.b]=[w.b,w.a];});
variants[1].walls.forEach(w=>{w.a.reverse();w.b.reverse();});
variants[2].walls.forEach(w=>{w.a[1]=600-w.a[1];w.b[1]=600-w.b[1];});
for(const v of variants){const p=C.build(v);assert.equal(p.wins.length,1);assert.equal(P.area(p.rooms.find(r=>r.bayId).poly),1.08);assert.ok(Math.abs(P.quantities(p).net-P.quantities(plan).net)<1e-8);}
const restore=C.editOpening(converted,'win',{bay:undefined,sill:450,head:2400});assert.deepEqual(C.build(restore).rooms,plain.rooms);
const locked=P.architecture({draft:d,phase:'design'});assert.throws(()=>P.assertStructure(locked.baseline,converted),/locked/);
const bad=clone(converted);bad.openings[0].bay.type='unknown';assert.throws(()=>C.build(bad),/类型/);
bad.openings[0].bay.type='recessed';bad.openings[0].bay.height=2500;assert.throws(()=>C.build(bad),/台高/);
const overlap=clone(converted);overlap.openings[0].length=600;overlap.openings[0].t=.3;overlap.openings.push({...clone(overlap.openings[0]),id:'other',t:.7});assert.throws(()=>C.build(overlap),/不能重叠/);
const zoned=C.addZone(converted,{id:'area_recess',parent:'room1',name:'窗边',use:'study',poly:[[210,50],[390,50],[390,160],[210,160]]});
assert.ok(Math.abs(P.quantities(C.build(zoned)).net-P.quantities(plan).net)<1e-8,'existing zones are clipped without double-counting');
const packed=P.unpack(P.pack({planId:converted.id,current:{furniture:[],architecture:{draft:converted,phase:'survey'}},designs:[],catalog:[]}));
assert.deepEqual(packed.current.architecture.draft.openings[0].bay,converted.openings[0].bay);
// The actual 3D floor/platform triangulation uses the generated convex pieces.
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 for(const r of plan.rooms){const shapes=(r.polys||[r.poly]).map(poly=>{const shape=new THREE.Shape();poly.forEach(([x,y],i)=>shape[i?'lineTo':'moveTo'](x/1000,y/1000));return shape;});
  const geo=r.counted===false?new THREE.ExtrudeGeometry(shapes,{depth:r.height,bevelEnabled:false}):new THREE.ShapeGeometry(shapes);
  geo.computeBoundingBox();assert.equal(geo.boundingBox.max.z,r.counted===false?Math.fround(.45):0);geo.dispose();
 }
 console.log('PASS recessed bay preserves solid walls/window, fills recess, subtracts floor, keeps paint, handles axes/zones/locks/backup and 3D extrusion');
})().catch(e=>{console.error(e);process.exit(1);});
