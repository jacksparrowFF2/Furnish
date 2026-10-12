const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const f={id:'h',type:'waterheater_flat',cx:2000,cy:1500,w:700,d:320,h:565,mountHeight:1650,rot:0},plan={rooms:[],walls:[[2400,0,2500,4000]],wins:[],doors:[],ceilingHeight:2800},check=item=>D.waterheaterClearances(plan,item).socket,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6);
assert.equal(check(f).ok,null);assert.equal(check(f).gap,null);
for(const x of [1350,2650]){let c=check({...f,heaterSocket:{x,y:1500,z:1900}});near(c.gap,300);assert.equal(c.ok,true);}
assert.equal(check({...f,heaterSocket:{x:2649,y:1500,z:1900}}).ok,false);
near(check({...f,heaterSocket:{x:2000,y:1960,z:1900}}).gap,300);near(check({...f,heaterSocket:{x:2000,y:1500,z:2515}}).gap,300);
const s={x:2450,y:1500,z:2315};near(check({...f,heaterSocket:s}).gap,Math.SQRT2*100);
for(const rot of [0,45,90,180,270]){const a=rot*Math.PI/180,item={...f,rot,heaterSocket:{x:f.cx+650*Math.cos(a),y:f.cy+650*Math.sin(a),z:1900}};near(check(item).gap,300);near(check({...item,flip:true}).gap,300);}
const installed={...f,h:700,heaterSocket:{x:2650,y:1500,z:1900}};near(D.waterheaterClearances(plan,installed).top.gap,450);
const saved=P.unpack(P.pack({planId:'test',current:{furniture:[installed]},designs:[{name:'saved',work:{furniture:[installed]}}],catalog:[]}));assert.deepEqual(saved.current.furniture[0],installed);assert.deepEqual(check(saved.current.furniture[0]),check(installed));
assert.equal(D.replaceFurniture(installed,{...f,type:'waterheater'}).heaterSocket,undefined);
for(const s of [{x:0,y:0,z:-1},{x:0,y:0,z:20001},{x:'0',y:0,z:0},{x:0,z:0},null])assert.throws(()=>P.validateWork({furniture:[{...f,heaterSocket:s}]}),/插座/);
console.log('PASS unset and fixed socket coordinates, all sides/vertical/diagonal distances, 300 mm threshold, body height, save roundtrip, validation and replacement');
