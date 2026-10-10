const assert=require('node:assert/strict'),C=require('../src/core/floorplan-core.js'),plans=require('../src/data/plans.js');
const d=C.fromPlan(plans.find(p=>p.id==='p10'),'custom_reference').draft;
for(const id of ['preset_window0','preset_window2','preset_window3','preset_door1']){
 const o=d.openings.find(v=>v.id===id),refs=C.openingReferences(d,id);assert.ok(refs.length>=2);assert.equal(refs[0].distance,Math.min(...refs.map(r=>r.distance)));
 for(const ref of refs){
  // Re-entering the current face-to-jamb clearance must preserve the center.
  const values=C.openingPlacement(d,id,ref.id,ref.distance,o.length);assert.ok(Math.abs(values.t-o.t)<1e-10);
  const next=C.editOpening(d,id,C.openingPlacement(d,id,ref.id,ref.distance,o.length-100));
  const same=C.openingReferences(next,id).find(r=>r.id===ref.id);assert.ok(Math.abs(same.distance-ref.distance)<1e-6);assert.equal(next.openings.find(v=>v.id===id).reference,ref.id);
  assert.ok(C.openingDimension(next,id,ref.id).wall);
 }
 const reversed=JSON.parse(JSON.stringify(d)),wall=reversed.walls.find(v=>v.id===o.wall),r=reversed.openings.find(v=>v.id===id);[wall.a,wall.b]=[wall.b,wall.a];r.t=1-r.t;
 for(const ref of C.openingReferences(reversed,id)){const p=C.openingPlacement(reversed,id,ref.id,ref.distance,r.length);assert.ok(Math.abs(p.t-r.t)<1e-10);}
}
const second=d.openings.find(v=>v.id==='preset_window2'),w=d.walls.find(v=>v.id===second.wall),center=(w.a[0]+(w.b[0]-w.a[0])*second.t)*d.scale;
const nearest=C.openingReferences(d,second.id)[0];assert.ok(Math.abs(nearest.distance-(center-second.length/2-nearest.face))<1e-6);assert.equal(nearest.side,'low');assert.ok(nearest.distance<second.t*Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])*d.scale);
assert.throws(()=>C.openingPlacement(d,second.id,nearest.id,-1,900),/净距/);assert.throws(()=>C.openingPlacement(d,second.id,'missing',10,900),/参考墙/);
console.log('PASS nearest inner wall face, jamb clearance, explicit references, width changes anchored to clearance, horizontal/vertical/reversed walls and saved reference');
