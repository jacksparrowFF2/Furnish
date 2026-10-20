const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/project-core.js'),C=require('../src/core/floorplan-core.js');
const project=P.unpack(JSON.parse(fs.readFileSync(require.resolve('./fixtures/browser/region-split-verified.furnish.json'),'utf8'))),work=project.current,draft=work.architecture.draft,before=JSON.stringify(draft),plan=C.build(draft);
const rooms=['起居区','阅读区','餐厅'].map(name=>plan.rooms.find(r=>(work.rooms[r.id]?.name||r.name)===name)),ids=rooms.map(r=>r.id),next=C.mergeRegions(draft,ids,{id:'area_rounded_merge',name:'合并起居区',use:'living'}),merged=C.build(next),room=merged.rooms.find(r=>r.id==='area_rounded_merge');
assert(Math.abs(P.area(room.poly)-15.25)<1e-7);assert.equal(JSON.stringify(draft),before);
for(const old of plan.rooms.filter(r=>!ids.includes(r.id)))assert(Math.abs(P.area(merged.rooms.find(r=>r.id===old.id).poly)-P.area(old.poly))<1e-7,'unselected room area retained');
assert.deepEqual(C.build(next),merged);C.validate(next);
const current=structuredClone(work);current.architecture.draft=next;
const result=P.unpack(P.pack({planId:project.planId,current,designs:[{name:'合并',work:current}],catalog:[]}));assert.deepEqual(result.current.architecture.draft,next);assert.deepEqual(result.designs[0].work.architecture.draft,next);
console.log('PASS real rounded-face three-region merge: tiny numerical ring excluded, area/other rooms retained, immutable input, repeated build and current/named round trip');
