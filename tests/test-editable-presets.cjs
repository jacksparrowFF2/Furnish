const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),plans=require('../src/data/plans.js');
const clone=v=>JSON.parse(JSON.stringify(v));
for(const preset of plans){
 const initial=JSON.stringify(preset),{draft,shift}=C.fromPlan(preset,'custom_'+preset.id),copy=C.build(draft);
 assert.equal(JSON.stringify(preset),initial,'copy must not mutate '+preset.id);
 assert.equal(copy.rooms.length,preset.rooms.length);
 preset.rooms.forEach((room,i)=>{assert.equal(copy.rooms[i].name,room.name);assert.deepEqual(copy.rooms[i].poly,room.poly.map(p=>p.map(v=>v+shift)));assert.equal(P.area(copy.rooms[i].poly),P.area(room.poly));});
 for(const [kind,list,refs,newList] of [['door',preset.doors,copy.doorRefs,copy.doors],['window',preset.wins,copy.winRefs,copy.wins],['slide',preset.slides,copy.slideRefs,copy.slides]]){
  assert.equal(newList.length,list.length);
  list.forEach((o,i)=>{const n=newList[refs.indexOf('preset_'+kind+i)];assert.ok(n);n.rect.forEach((v,j)=>assert.ok(Math.abs(v-o.rect[j]-shift)<1e-6));if(kind==='door'){assert.deepEqual(n.h,o.h.map(v=>v+shift));assert.deepEqual(n.c,o.c);assert.deepEqual(n.o,o.o);}if(kind==='window'){assert.equal(n.sill,o.sill);assert.equal(n.bayGroup,o.bayGroup);}});
 }
 // Sample every cell in the combined rectangle decomposition, including each
 // wall classification. Rejoining a door must not turn partitions into bearing walls.
 const old=preset.walls.map(r=>[...r.slice(0,4).map(v=>v+shift),r[4]]),all=old.concat(copy.walls),xs=[...new Set(all.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b),ys=[...new Set(all.flatMap(r=>[r[1],r[3]]))].sort((a,b)=>a-b);
 const at=(walls,x,y)=>[...new Set(walls.filter(r=>x>r[0]+1e-6&&x<r[2]-1e-6&&y>r[1]+1e-6&&y<r[3]-1e-6).map(r=>r[4]))].sort();
 for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++)assert.deepEqual(at(copy.walls,(xs[i]+xs[i-1])/2,(ys[j]+ys[j-1])/2),at(old,(xs[i]+xs[i-1])/2,(ys[j]+ys[j-1])/2),preset.id+' wall faces');
 const payload=P.pack({planId:draft.id,current:{furniture:[],architecture:{draft,phase:'survey'}},designs:[],catalog:[]});assert.deepEqual(C.build(P.unpack(payload).current.architecture.draft).walls,copy.walls);
 const grouped=C.batchWalls(draft,[draft.walls[0].id],{group:'new_group'});assert.deepEqual(C.build(grouped).rooms,copy.rooms);
}
const d=C.fromPlan(plans.find(p=>p.id==='p10'),'custom_edit').draft,o=d.openings.find(o=>o.id==='preset_window0');
const changed=C.editOpening(d,o.id,{t:o.t+.01,length:1500});assert.equal(d.openings.find(v=>v.id===o.id).length,1700);assert.equal(changed.openings.find(v=>v.id===o.id).length,1500);assert.deepEqual(C.build(changed).rooms,C.build(d).rooms);
assert.throws(()=>C.editOpening(d,o.id,{t:-1}),/Invalid opening/);assert.throws(()=>C.editOpening(d,o.id,{length:7000}),/Invalid opening/);assert.throws(()=>C.editOpening(d,o.id,{t:.99}),/overlaps/);
const clash=clone(d);clash.openings.push({...o,id:'overlap'});assert.throws(()=>C.build(clash),/overlaps/);
P.assertStructure(d,d);assert.throws(()=>P.assertStructure(d,changed),/locked/);
const caps=clone(d);caps.walls.find(w=>w.kind==='e').caps[0]=10;assert.throws(()=>P.assertStructure(d,caps),/locked/);
const editor=fs.readFileSync(path.join(__dirname,'../src/ui/floorplan-editor.js'),'utf8');
for(const name of ['complete','blank']){const asset='templates/furnish-template-'+name+'.dxf';assert.ok(editor.includes("href:'"+asset+"'"));assert.ok(fs.statSync(path.join(__dirname,'..',asset)).size>0);}
console.log('PASS all 12 preset copies: exact walls, classifications, room areas, opening geometry, orientation, grouping and portable roundtrip; collision and lock protection; download assets');
