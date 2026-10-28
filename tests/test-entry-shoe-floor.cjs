const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js');
const make=()=>({id:'shoe',type:'cabinet',cx:2000,cy:2000,rot:0,...C.preset('entry-console')});
const original=C.validate(C.resize(make(),{...make(),w:970,h:2350})),before=JSON.stringify(original);
const plan={rooms:[{id:'room',poly:[[0,0],[8000,0],[8000,8000],[0,8000]]}],walls:[],wins:[],doors:[]};
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const f={...original,rot,flip},a=rot*Math.PI/180,local=(x,z)=>({cx:f.cx+x*Math.cos(a)-z*Math.sin(a),cy:f.cy+x*Math.sin(a)+z*Math.cos(a)});
 const device={id:'probe',type:'water_purifier_mijia_1200g',w:60,d:60,h:10,mountHeight:0,rot,...local(0,0)};
 assert(!G.volumeOverlap(f,device),'floor-level object has no bottom board collision');
 const shelfTop=f.cabinet.entry.shoeHeight/2;
 assert(!G.volumeOverlap(f,{...device,mountHeight:shelfTop}),'contact with shoe shelf top');
 assert(G.volumeOverlap(f,{...device,mountHeight:shelfTop-.1}),'shoe shelf still blocks penetration');
 assert(G.volumeOverlap(f,{...device,...local(f.w/2-5,0)}),'side panel reaches floor');
 assert(G.volumeOverlap(f,{...device,...local(0,-f.d/2+5)}),'rear panel reaches floor');
 const restored=P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];
 assert.deepEqual(restored.cabinet,f.cabinet);assert(!G.volumeOverlap(restored,device),'round trip keeps open shoe floor');
}
const parts=M.solidParts(original,{furniture:[original]}),center=parts.filter(p=>p.bottom<10&&G.inPoly(original.cx,original.cy,p.poly));
assert.equal(center.length,0,'production board recorder contains no floor board');
const raised=structuredClone(original);raised.cabinet.plinth=80;C.validate(raised);
assert(G.volumeOverlap(raised,{id:'probe',type:'water_purifier_mijia_1200g',cx:2000,cy:2000,w:60,d:60,h:10,mountHeight:85,rot:0}),'explicit raised base retains its floor board');
const issue={id:original.id,kind:'overlap'},key=P.checkFingerprint(issue,plan,[original],800);
assert(key.includes('entry-shoe-floor-open-v1'),'old spatial confirmations become stale');
assert.equal(P.checkFingerprint(issue,plan,[{...original,color:'#123456'}],800),key,'color retains spatial confirmation');
assert.equal(JSON.stringify(original),before,'no saved configuration migration');
console.log('PASS entry shoe floor: actual boards, floor/side/rear contact, shelf penetration, rotation/mirror, raised base, project round trip and confirmation');
