const fs=require('fs'),assert=require('node:assert/strict'),D=require('./dxf-import.js'),C=require('./floorplan-core.js'),P=require('./project-core.js');
const p=D.parse(fs.readFileSync('furnish-template-example.dxf','utf8')),d=D.draft(p,{id:'custom_window',name:'窗尺寸',mmPerUnit:1,layers:['FURNISH_EXTERIOR','FURNISH_BEARING','FURNISH_PARTITION'],layerKinds:{FURNISH_EXTERIOR:'e',FURNISH_BEARING:'b',FURNISH_PARTITION:'n'},thickness:200});
d.openings.push({id:'win',wall:d.walls.find(w=>w.kind==='b').id,t:.25,length:1300,kind:'window',side:1,entry:false,sill:875,head:2175});
const plan=C.build(d);assert.equal(plan.wins[0].sill,.875);assert.equal(plan.wins[0].head,2.175);assert.ok(Math.abs(P.quantities(plan).net-21.28)<1e-8);
const locked=P.architecture({draft:d,phase:'design'}),changed=JSON.parse(JSON.stringify(d));changed.openings[0].length=1400;assert.throws(()=>P.assertStructure(locked.baseline,changed),/locked/);assert.equal(P.architecture({draft:changed,phase:'survey'}).phase,'survey');
changed.openings[0].head=3000;assert.throws(()=>C.build(changed),/窗台高/);
const backup=P.unpack(P.pack({planId:d.id,current:{furniture:[],architecture:{draft:d,phase:'survey'},open:{w:{0:{sill:.875,head:2.175}}}},designs:[],catalog:[]}));assert.equal(backup.current.architecture.draft.openings[0].head,2175);
assert.throws(()=>P.validateWork({furniture:[],open:{w:{0:{sill:1,head:.5}}}}),/窗高度/);P.validateWork({furniture:[],open:{w:{0:.9}}});
console.log('PASS precise window height/sill, unchanged floor area, locked vs survey editing, bounds, backup and legacy overrides');
