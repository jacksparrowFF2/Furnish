const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js');
const f=(id,type,extra={})=>({id,type,name:id,w:1000,d:400,cx:0,cy:0,rot:0,color:'#cbb08b',...extra});
const tv=f('tv','tv',{d:80}),cab=f('cab','cabinet',C.preset('tv-floor')),heater=f('heater','waterheater_flat',{h:100,mountHeight:400});
const ids=items=>D.planFurnitureOrder(items).map(f=>f.id);
for(const input of [[tv,heater,cab],[tv,cab,heater],[heater,tv,cab],[heater,cab,tv],[cab,tv,heater],[cab,heater,tv]])assert.deepEqual(ids(input),['cab','heater','tv']);
assert.deepEqual(ids([tv,cab]),['cab','tv']);assert.deepEqual(ids([cab,tv]),['cab','tv']);
assert.deepEqual(ids([tv,{...cab,cx:5000}]),['tv','cab'],'unrelated footprints retain order');
assert.deepEqual(ids([tv,{...cab,h:2000}]),['tv','cab'],'overlapping vertical envelopes retain manual order');
const unknown=f('unknown','unfamiliar');assert.deepEqual(ids([tv,unknown]),['tv','unknown']);
assert.deepEqual(ids([tv,{...cab,h:D.furnitureVerticalBounds(tv).bottom}]),['cab','tv'],'touching vertical ranges are separated');
assert.deepEqual(ids([{...tv,w:1000,d:100,rot:45},{...cab,w:1000,d:100,cx:-100,cy:100,rot:45}]),['tv','cab'],'rotated footprints do not overlap despite overlapping AABBs');
assert.deepEqual(ids([{...tv,rot:90,flip:true},{...cab,rot:90,flip:true}]),['cab','tv']);
const rug=f('rug','rug'),lamp=f('lamp','pendant');assert.deepEqual(ids([lamp,tv,cab,rug]),['rug','cab','tv','lamp']);
const original=[tv,cab],before=JSON.stringify(original);ids(original);assert.equal(JSON.stringify(original),before,'display sorting must not mutate project order');
// A chair back can be taller than the table while its seat tucks underneath.
// Missing legacy heights must still use the existing seat/table relationship.
for(const type of ['table','roundtable','desk','island'])for(const seatType of ['chair','barstool','officechair','armchair'])for(const recorded of [false,true])for(const rot of [0,37,90,180]){
 const table=f('table',type,{w:900,d:1400,rot,flip:true,...recorded?{h:750}:{}}),seat=f('seat',seatType,{w:450,d:500,rot:rot+90,flip:true,...recorded?{h:860}:{}});
 const input=[table,seat],snapshot=JSON.stringify(input);
 assert.deepEqual(ids(input),['seat','table'],'table covers a tucked seat regardless of backrest height or rotation');
 assert.deepEqual(ids([seat,table]),['seat','table']);
 assert.deepEqual(ids([table,{...seat,cx:5000}]),['table','seat'],'unrelated seats retain manual order');
 assert.equal(JSON.stringify(input),snapshot,'sorting never changes persisted furniture');
}
const dining=f('dining','table',{w:900,d:1400}),chairs=[-1,1].flatMap(side=>[-1,1].map(row=>f(`chair${side}${row}`,'chair',{w:450,d:550,cx:side*500,cy:row*310,rot:side*90})));
assert.deepEqual(ids([dining,...chairs]),[...chairs.map(v=>v.id),'dining'],'all four chairs tuck below the dining surface');
assert.deepEqual(ids([lamp,dining,...chairs,rug]),['rug',...chairs.map(v=>v.id),'dining','lamp'],'rug and pendant layers remain intact');
const children=[{dataset:{fid:'tv'}},{dataset:{fid:'cab'}}],g={children,innerHTML:'',setAttribute(){},appendChild(node){children.splice(children.indexOf(node),1);children.push(node);}},nodes={'#gFurn':g,'#emptyHint':{hidden:true},'#furnHidden':{hidden:true}};
const nodeFor=id=>({dataset:{fid:id},toggleAttribute(name,on){this[name]=on;}});children.splice(0,children.length,...children.map(v=>nodeFor(v.dataset.fid)));
const ctx=vm.createContext({FurnishDesign:D,state:{furniture:original},furnitureRenderErrors:new Map(),furnitureError:D.products().modelError,renderableFurniture:()=>original.filter(f=>!D.products().modelError(f)),ui:{layers:{furn:true,collide:false}},$:s=>nodes[s],PAL:{text:'#111'},collisions:()=>[],furnSVG:()=>'<rect/>',esc:s=>s,nm:s=>s});
vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx);
ctx.refreshHobOpenings=()=>{}; // This DOM fixture exercises furniture ordering only.
ctx.renderFurn();assert(g.innerHTML.indexOf('data-fid="cab"')<g.innerHTML.indexOf('data-fid="tv"'),'real SVG adapter emits lower first');
ctx.syncFurnOrder();assert.deepEqual(children.map(n=>n.dataset.fid),['cab','tv']);
cab.cx=5000;ctx.syncFurnOrder();assert.deepEqual(children.map(n=>n.dataset.fid),['tv','cab'],'moving away restores unrelated manual order');cab.cx=0;
original.splice(0,original.length,dining,...chairs);
children.splice(0,children.length,...original.map(v=>nodeFor(v.id)));
ctx.renderFurn();assert(g.innerHTML.indexOf('data-fid="chair-1-1"')<g.innerHTML.indexOf('data-fid="dining"'),'production SVG emits chair below table');
ctx.syncFurnOrder();assert.deepEqual(children.map(n=>n.dataset.fid),[...chairs.map(v=>v.id),'dining']);
dining.cx=5000;ctx.syncFurnOrder();assert.equal(children[0].dataset.fid,'dining','dragging the table away restores manual order');
dining.cx=0;ctx.syncFurnOrder();assert.equal(children.at(-1).dataset.fid,'dining','dragging back under the table restores occlusion');
ctx.FurnishGeometry=require('../src/core/layout-geometry.js');
for(const type of ['table','roundtable','desk']){
 dining.type=type;ctx.drag={kind:'move',moved:true,ids:[chairs[0].id]};ctx.syncTuckedSeatPreview();
 assert.equal(children.find(n=>n.dataset.fid==='dining')['data-seat-preview'],true,'a tabletop fades while a chair is moved under it');
 assert.equal(children.find(n=>n.dataset.fid===chairs[0].id)['data-seat-preview'],false,'the chair remains opaque');
 for(const drag of [null,{kind:'move',moved:false,ids:[chairs[0].id]},{kind:'locked',moved:true,ids:[chairs[0].id]},{kind:'rot',moved:true,ids:[chairs[0].id]},{kind:'move',moved:true,ids:['dining',chairs[0].id]}]){
  ctx.drag=drag;ctx.syncTuckedSeatPreview();assert.equal(children.find(n=>n.dataset.fid==='dining')['data-seat-preview'],false,'idle, unmoved, rotation and moving-table cases do not fade');
 }
}
ctx.drag={kind:'move',moved:true,ids:[chairs[0].id]};const previous=chairs[0].cx;chairs[0].cx=5000;ctx.syncTuckedSeatPreview();assert.equal(children.find(n=>n.dataset.fid==='dining')['data-seat-preview'],false,'leaving the table clears preview immediately');chairs[0].cx=previous;
for(const rot of [0,37,90])for(const overlap of [0,4,6]){
 const angle=rot*Math.PI/180;Object.assign(dining,{type:'table',rot,flip:true});Object.assign(chairs[0],{cx:(-725+overlap)*Math.cos(angle),cy:(-725+overlap)*Math.sin(angle),rot:rot+90,flip:true});
 ctx.syncTuckedSeatPreview();assert.equal(children.find(n=>n.dataset.fid==='dining')['data-seat-preview'],overlap>5,'preview shares rotated/mirrored overlap and 5 mm tolerance');
}
console.log('PASS plan height stacking: TV/cabinet, chains, manual order, unknown heights, rotation, layers and live DOM reordering');
