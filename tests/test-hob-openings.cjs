const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),values=o=>Object.fromEntries(Object.entries(o.gaps).map(([key,v])=>[key,v?.distance]));
const host={id:'top',type:'counter',name:'台面',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#ddd'},hob={id:'hob',type:'stove_fotile_th36b',name:'燃气灶',cx:2100,cy:2010,w:750,d:440,rot:0,color:'#111',counterElevation:860};
const list=[host,hob],before=JSON.stringify(list),base=S.hobOpening(hob,{furniture:list});
assert.deepEqual(base.size,{w:660,d:350});assert.deepEqual(values(base),{l:670,r:470,t:135,b:115});
// Appliance axes and names follow its rotation and mirror, independent of the drawing.
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const h={...host,rot,flip},at=K.world(h,100,10),f={...hob,cx:at[0],cy:at[1],rot,flip},o=S.hobOpening(f,{furniture:[h,f]});
 for(const [key,v] of Object.entries(values(base)))close(values(o)[key],v);
 for(const m of Object.values(o.gaps)){assert.equal(m.entity.id,h.id);assert(m.surfaceBoundary);close(Math.hypot(m.a.x-m.b.x,m.a.y-m.b.y),m.distance);}
}
// Both legacy and Fotile cutouts retain their existing nominal-size contract.
const legacy={...hob,type:'stove'},old=S.hobOpening(legacy,{furniture:[host,legacy]});assert.deepEqual(old.size,{w:720,d:410});
assert.deepEqual(values(old),{l:640,r:440,t:105,b:85});
for(const delta of [0,.001,-.001]){
 const f={...hob,cx:host.cx+host.w/2-hob.w/2-delta},o=S.hobOpening(f,{furniture:[host,f]});
 if(delta<0)assert.equal(o,null);else close(o.gaps.r.distance,45+delta);
}
assert.equal(S.hobOpening(hob,{furniture:[hob]}),null);
assert.equal(S.hobOpening({...hob,type:'ksink'},{furniture:list}),null);
assert.equal(S.hobOpening({...hob,obj:'custom'},{furniture:list}),null);
// A nominal opening does not require a known mounting height, nor assert one.
const unknown={...hob};delete unknown.counterElevation;assert.deepEqual(values(S.hobOpening(unknown,{furniture:[host,unknown]})),values(base));
// Production openings, continuous L/U boundaries, repeated restores and project roundtrips agree.
for(const shape of ['straight','L','U'])for(const rot of [0,37,90])for(const flip of [false,true]){
 const h=K.configure({...host,rot,flip},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},...(shape!=='straight'?[{run:1,width:1000,role:'door'}]:[]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]}),f=K.attach(hob,h,0),items=[h,f];K.normalize(items);
 const o=S.hobOpening(f,{furniture:items}),production=K.deviceOpenings(h,items)[0].ring.map(p=>K.world(h,...p));
 for(let i=0;i<production.length;i++)for(let axis=0;axis<2;axis++)close(o.ring[i][axis],production[i][axis]);
 const expected={l:270,r:270,t:125,b:125};for(const key of Object.keys(expected))close(o.gaps[key].distance,expected[key]);
 let restored=P.unpack(P.pack({planId:'opening',current:{furniture:items},designs:[{name:'开孔',work:{furniture:items}}],catalog:[]})).current.furniture;
 for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});
 assert.deepEqual(restored,items);assert.deepEqual(S.hobOpening(restored[1],{furniture:restored}),o);
}
// Minimum material width uses the entire opening edge, including real notches.
const config={version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'}]};
for(const [extra,expected] of [
 [{counterDepth:630,endExtensions:[{run:0,length:500,depth:250,cabinetDepth:220}]},{l:270,r:270,t:125,b:155}],
 [{autoAvoid:true,obstacleFit:{depths:[],cuts:[[[-600,-300],[-500,-300],[-500,300],[-600,300]]]}},{l:170,r:270,t:125,b:125}]
]){
 const h=K.configure(host,{...config,...extra});if(extra.obstacleFit)h.kitchen.obstacleFit=structuredClone(extra.obstacleFit);
 const f=K.attach(hob,h,0),items=[h,f];K.normalize(items);assert.deepEqual(values(S.hobOpening(f,{furniture:items})),expected);
}
const rotatedHob={...hob,cx:2000,cy:2000,rot:37},large={...host,d:1400};
const angled=S.hobOpening(rotatedHob,{furniture:[large,rotatedHob]});assert(Object.values(angled.gaps).every(m=>m.distance>0));
assert.equal(JSON.stringify(list),before,'measurements never add saved fields or alter installation');
console.log('PASS nominal hob openings, four physical edge margins, production geometry, rotation/mirror, support thresholds, unknown height, legacy sizes, notches, narrow extensions and repeated project restoration');
