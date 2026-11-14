'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),M=require('../src/render/acwall-midea-model.js');
const type='acwall_midea_mxc3p',f={id:'wall-ac',type,name:'风尊三代 Pro',w:870,d:199,h:295,cx:1000,cy:500,rot:0,mountHeight:2200,color:'#f4f4f1',price:0},near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),asset=require('../src/data/acwall-midea-mxc3p-blender-asset.js');
 for(const p of asset.parts)for(let i=0;i<p.normals.length;i+=3)assert(Math.hypot(...p.normals.slice(i,i+3))>.9,p.name+' must have usable normals');
 assert.equal(asset.parts.length,17);assert.equal(new Set(asset.parts.map(p=>p.identity)).size,17);
 const file=require('node:path').resolve(__dirname,'../assets/models/acwall-midea-mxc3p/v2/acwall-midea-mxc3p-v1.glb');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),asset.sourceSha256);
 assert.equal(P.initial({type}).mountHeight,2200);assert(P.supports(f,'mountHeight'));assert.equal(P.kind(f),'壁挂空调');P.validate(f);J.validateWork({furniture:[f]});assert(M.supported(f));assert(!M.supported({...f,type:'acwall'}));
 for(const mountHeight of [0,1800,2200])for(const rot of [0,90,37])for(const flip of [false,true]){
  const a={...f,mountHeight,rot,flip},g=M.build(T,a);g.position.set(a.cx/1000,0,a.cy/1000);g.rotation.y=-rot*Math.PI/180;g.scale.x=flip?-1:1;g.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(g,true);near(b.min.y*1000,mountHeight);near(b.max.y*1000,mountHeight+295);
  const pts=G.bodyParts(a).flatMap(p=>p.vertices);for(const [k,axis]of ['x','y','z'].entries()){near(b.min[axis]*1000,pts.reduce((m,p)=>Math.min(m,p[k]),Infinity));near(b.max[axis]*1000,pts.reduce((m,p)=>Math.max(m,p[k]),-Infinity));}
 }
 const base={...f,mountHeight:0},touch={...base,id:'probe',type:'block',w:2000,d:2000,h:50,mountHeight:295};assert(!G.volumeOverlap(base,touch));assert(G.volumeOverlap(base,{...touch,mountHeight:294}));
 const rule=P.definition(f);assert.equal(rule.clearanceReview,'missing');assert.equal(P.initial({type:'acwall'}).mountHeight,2170,'legacy default must remain unchanged');
 const fixture=require('./helpers/wall-finish-fixture.cjs').fixture(),work={...fixture.work,furniture:[f]},restore=W.create({makeId:()=> 'x',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}).restore;let saved=work;
 for(let i=0;i<3;i++){const packed=J.pack({planId:fixture.plan.id,current:saved,designs:[{name:'空调',work:saved}],catalog:[f]}),unpacked=J.unpack(packed);assert.deepEqual(unpacked.designs[0].work.furniture,[f]);assert.deepEqual(unpacked.catalog,[f]);saved=restore(unpacked.current,fixture.plan);assert.deepEqual(saved.furniture,[f]);}
 assert.notEqual(J.checkFingerprint({},fixture.plan,[f],800),J.checkFingerprint({},fixture.plan,[{...f,mountHeight:2300}],800));assert.equal(J.checkFingerprint({},fixture.plan,[f],800),J.checkFingerprint({},fixture.plan,[{...f,color:'#fff',price:20}],800));
 const roomPlan={...fixture.plan,walls:[],doors:[],wins:[],beams:[],rooms:[{id:'r',name:'r',poly:[[0,0],[3000,0],[3000,3000],[0,3000]],mat:'tile800'}]};delete roomPlan.physicalRooms;
 const hanging={...f,cx:2200,cy:1400,mountHeight:2100},hasPassage=items=>J.spaceCheck(roomPlan,items).some(i=>i.kind==='passage');
 assert(!hasPassage([hanging]),'at 2100 mm no floor passage projection');assert(hasPassage([{...hanging,mountHeight:2099}]),'below planning headroom threshold stays conservative');assert(hasPassage([{...hanging,type:'block',mountHeight:0}]),'floor obstacle remains active');
 const hit=J.spaceCheck(roomPlan,[hanging,{...hanging,id:'intersecting',type:'block',w:40,d:40,h:400,mountHeight:2150}]);assert(hit.some(i=>i.kind==='overlap'),'suspended passage exclusion does not exempt actual collisions');
 const replaced=P.replacement(f,{...f,type:'chair'},{type:'chair'});assert.notEqual(P.bottomHeight(replaced),2200,'cross-product replacement clears native mount datum');
 const item=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===type);assert.deepEqual([item[2],item[3],item[6]],[870,199,295]);
 console.log('PASS MXC3P source/hash, 17 identities, shared actual geometry at 18 mount/rotation/mirror combinations, height contact/overlap, replacement, fingerprints, repeated current/named/catalog restoration');
})().catch(e=>{console.error(String(e.stack||e).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'three-r160'));process.exitCode=1;});
