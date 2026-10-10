const assert = require('node:assert/strict');
const {create} = require('../src/core/work-state.js');
const plans = require('../src/data/plans.js');
const {materials,library} = require('../src/data/catalog.js');
const draft = require('../src/core/floorplan-core.js');
let sequence=0;
const colorFor=type=>library.flatMap(c=>c.items).find(f=>f[0]===type)?.[4]||'#d9d2c5';
const work=create({makeId:()=>`generated${++sequence}`,colorFor,materials});
const before=structuredClone(plans);
for(const plan of plans){
  const first=work.fresh(plan),second=work.fresh(plan);
  assert.equal(first.furniture.length,plan.defaults.length);
  assert.equal(Object.keys(first.rooms).length,plan.rooms.length);
  assert.equal(new Set([...first.furniture,...second.furniture].map(f=>f.id)).size,2*plan.defaults.length);
  assert.notEqual(first.rooms,second.rooms);assert.notEqual(first.notes,second.notes);
  assert.deepEqual(work.restore(structuredClone(first),plan),{...first,scene3d:{cut:2.8,furn:true,labels:true,night:false,hour:10}});
}
assert.deepEqual(plans,before);

const plan=plans[0],room=plan.rooms.find(r=>r.counted!==false);
const outside={id:'outside',type:'custom',name:'范围外',cx:-90000,cy:90000,w:800,d:400,rot:90,color:'#abc',price:12.345,locked:true,purchase:{status:'ordered'},catalogSpec:{name:'来源规格'}};
const legacy={furniture:[outside,{...outside,id:'outside',w:'900'},null,{cx:0,cy:0,w:0,d:10}],
  rooms:{[room.id]:{name:'名'.repeat(100),mat:'missing',use:'study'},oldRoom:{name:'extra'}},
  notes:[{id:'n',text:'有效',x:'12',y:'-3',color:'wrong',size:9},{id:'n',text:'字'.repeat(150),x:0,y:1},null,{text:' ',x:0,y:0},{text:'bad',x:'',y:0},{text:'bad',x:Infinity,y:0}],
  open:{w:{0:{sill:500,head:2200}}},measures:[{a:{x:0,y:0},b:{x:200,y:0}}],demolished:['wall'],
  budget:{paintPrice:0},attachments:[{name:'test'}],scene3d:{cut:1.2,furn:false,labels:false,night:true,hour:18}};
const geometry=structuredClone(legacy.furniture),saved=structuredClone(legacy);
assert.equal(work.restore(legacy,plan),legacy);
assert.deepEqual(legacy.furniture[0],outside);
assert.equal(legacy.furniture[1].w,900);assert.notEqual(legacy.furniture[1].id,'outside');
assert.equal(legacy.furniture.length,2);assert.deepEqual(geometry[0],outside);
assert.equal(legacy.rooms[room.id].name.length,80);assert.equal(legacy.rooms[room.id].mat,room.mat);assert.equal(legacy.rooms[room.id].use,'study');
assert.deepEqual(legacy.rooms.oldRoom,{name:'extra'});
assert.equal(legacy.notes.length,2);assert.deepEqual([legacy.notes[0].x,legacy.notes[0].y,legacy.notes[0].color,legacy.notes[0].size],[12,-3,'accent',1]);
assert.notEqual(legacy.notes[0].id,legacy.notes[1].id);assert.equal(legacy.notes[1].text.length,120);
for(const key of ['open','measures','demolished','budget','attachments','scene3d'])assert.deepEqual(legacy[key],saved[key]);
const empty=work.restore({},plan);assert.deepEqual(empty.furniture,[]);assert.deepEqual(empty.open,{});
const capped=work.restore({notes:Array.from({length:2001},(_,i)=>({id:`n${i}`,text:'a',x:0,y:0}))},plan);assert.equal(capped.notes.length,2000);

const customDraft={version:1,id:'custom_restore',name:'恢复测试',source:'dxf',width:1000,height:700,image:'',scale:10,
  walls:[[[100,100],[700,100]],[[700,100],[700,500]],[[700,500],[100,500]],[[100,500],[100,100]]].map(([a,b],i)=>({id:`wall${i}`,a,b,thickness:200,kind:'e'})),openings:[]};
const customPlan=draft.build(customDraft),custom=work.fresh(customPlan);
assert.equal(custom.architecture.phase,'survey');
assert.equal(work.restore(custom,customPlan).architecture.phase,'survey');
custom.architecture.phase='design';work.restore(custom,customPlan);
assert.deepEqual(custom.architecture.baseline,custom.architecture.draft);
assert.throws(()=>work.restore(structuredClone(custom),plan),/identity mismatch/);
const invalid=structuredClone(custom);invalid.architecture.draft.walls[0].a[0]=NaN;
assert.throws(()=>work.restore(invalid,customPlan));
const incoming=work.fresh(plan),untouched=structuredClone(incoming);
const prepared=work.prepareShared(incoming,plan);
assert.deepEqual(incoming,untouched);assert.notEqual(prepared,incoming);
const badShare=structuredClone(incoming);badShare.open={w:{99999:{sill:1,head:2}}};
assert.throws(()=>work.prepareShared(badShare,plan));assert.deepEqual(incoming,untouched);
const locked=structuredClone(custom.architecture);
assert.deepEqual(work.prepareShared(custom,customPlan,locked).architecture.baseline,locked.baseline);
console.log('PASS work restoration, independent defaults, legacy fields and custom architecture');
