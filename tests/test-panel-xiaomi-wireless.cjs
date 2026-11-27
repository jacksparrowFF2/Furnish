'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const P=require('../src/core/product-rules.js'),E=require('../src/core/electrical-core.js'),
 D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),
 J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),
 W=require('../src/core/work-state.js'),S=require('../src/core/snapping.js'),
 M=require('../src/render/panel-bull-g12-model.js'),A=require('../src/data/panel-xiaomi-wireless-blender-asset.js');
const variant='xiaomi-wireless-2-white';
const base={id:'panel',type:'panel_bull_g12',name:'86面板',cx:0,cy:0,rot:0,w:86,d:10,h:86,color:'#f5f5f2',mountHeight:647};
const wireless=P.editPanelVariant(base,variant),spec=P.panelSpec(wireless);
const near=(actual,expected)=>assert(Math.abs(actual-expected)<.025,`${actual} != ${expected}`);
assert.equal(P.value(base,'panelVariant'),'socket5-diagonal');
assert.equal(P.initial({type:base.type}).mountHeight,0);
assert.equal(spec.gangs,2);
assert.equal(spec.depth,11);
assert.equal(wireless.model,'XMWS01XS');
assert.equal(wireless.sourceUrl,'https://item.m.jd.com/product/100197232066.html');
assert.equal(wireless.mountHeight,647);
assert.equal(wireless.d,11);
assert.equal(P.editPanelVariant({...base,d:12},variant).d,12);
assert.equal(P.editPanelVariant(wireless,'socket5-diagonal').d,10);
assert.equal(P.editPanelVariant(wireless,'xiaomi-2pro-2-white').d,5);
assert.equal(E.endpointKind(wireless),null);
assert.equal(E.endpointKind(P.editPanelVariant(wireless,'xiaomi-2pro-2-white')),'power');
const pair=E.controlPairs([
 {...wireless,name:'E02 · 床头无线开关与 E01 米家联动'},
 {...P.editPanelVariant(wireless,'xiaomi-2pro-2-white'),id:'main',name:'E01 · 门口双开'}
]);
assert(pair.links.get('panel').get('main').has('mijia'));
const source=require.resolve('../assets/models/panel-xiaomi-wireless/v1/panel-xiaomi-wireless-v1.glb');
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'));
assert.deepEqual(A.parts.map(p=>p.name).sort(),['housing','left-indicator','left-rocker','mounting-back','right-indicator','right-rocker']);
const issue={kind:'overlap',id:base.id},planContext={rooms:[],walls:[]};
const fingerprint=f=>J.checkFingerprint(issue,planContext,[f],800);
assert.notEqual(fingerprint(base),fingerprint(wireless));
assert.equal(fingerprint(wireless),fingerprint({...wireless,color:'#ffffff',price:35}));
const probe={id:'probe',type:'block',cx:0,cy:0,rot:0,w:100,d:1000,h:86,mountHeight:647};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const f={...wireless,rot,flip};
 const solids=G.bodyParts(f),bbox=G.bbox(G.footprints(f).flat());
 assert.equal(solids.length,6);
 assert(solids.every(p=>p.partRole.startsWith('panel-xiaomi-wireless-v1:')));
 near(S.directional(f,{furniture:[{...probe,cx:bbox[2]+150}]}).r.distance,100);
 assert(S.directional(f,{furniture:[{...probe,w:1000}]}).r.containedBoundary);
 assert(G.volumeOverlap(f,{...probe,w:1000}));
 assert(!G.volumeOverlap(f,{...probe,w:1000,mountHeight:733}));
 assert(G.volumeOverlap(f,{...probe,w:1000,mountHeight:732.9}));
}
const plan=require('../src/data/plans.js')[0],catalog=require('../src/data/catalog.js');
const storage=W.create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:catalog.materials});
const current={...storage.fresh(plan),furniture:[wireless]},designs=[{name:'无线双开',work:current}];
const payload={planId:plan.id,current,designs,catalog:[{...wireless,id:'library-variant',price:0}]};
const packed=J.pack(payload);
assert.equal(packed.version,85);
assert.deepEqual(J.unpack(packed),payload);
const workspace={v:85,planId:plan.id,work:{[plan.id]:current},designs:[],customPlans:[],custom:[],updatedAt:100};
assert.deepEqual(R.parse(JSON.parse(R.text(workspace))).work[plan.id].furniture,[wireless]);
assert.deepEqual(storage.restore(storage.restore(current,plan),plan).furniture,[wireless]);
const duplicate=D.pasteFurniture({items:[wireless],cx:0,cy:0},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0];
assert.equal(duplicate.panelVariant,variant);
assert.equal(duplicate.mountHeight,647);
assert.equal(D.replaceFurniture(wireless,{...base,w:100}).panelVariant,variant);
const wired=P.editPanelVariant({...base,id:'wired'},'xiaomi-2pro-2-white');
assert.equal(J.procurement(planContext,{furniture:[wireless,wired]}).items.length,2);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const model=M.build(T,wireless),bounds=new T.Box3().setFromObject(model);
 near(bounds.min.y*1000,647);
 near((bounds.max.y-bounds.min.y)*1000,86);
 near((bounds.max.x-bounds.min.x)*1000,86);
 near((bounds.max.z-bounds.min.z)*1000,11);
 for(const m of model.children)assert(m.geometry.attributes.normal.array.every(Number.isFinite));
 console.log('PASS XMWS01XS panel identity, wireless route exclusion, geometry, elevation, measurements and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
