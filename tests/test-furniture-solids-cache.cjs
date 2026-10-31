'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('../src/core/furniture-solids.js'),source=fs.readFileSync(file,'utf8'),cached=require(file),P=require('../src/core/product-rules.js'),catalog=require('../src/data/catalog.js').library.flatMap(c=>c.items);
function fresh(f){const context={module:{exports:{}},require:createRequire(file)};vm.createContext(context);vm.runInContext(source,context);return JSON.parse(JSON.stringify(context.module.exports.parts(f)));}
const json=v=>JSON.parse(JSON.stringify(v));
let count=0;
for(const [type,rule]of Object.entries(P.types).filter(([,r])=>r.solidModel)){
 const item=catalog.find(i=>i[0]===type),f={id:'host',type,w:item[2],d:item[3],...(item[6]?{h:item[6]}:{}),cx:123,cy:456,rot:0,flip:false};
 const original=json(f),base=json(cached.parts(f));
 const cases=[{cx:f.cx+17},{cy:f.cy-29},{rot:37},{flip:true},{w:f.w*1.1},{d:f.d*1.1},{h:(f.h||P.height(f))*1.1},{mountHeight:250}];
 if(type==='tea_bar_mijia_pro')cases.push({teaBarUpperOpen:true},{teaBarLowerOpen:true});
 if(type==='heating_manifold'){const length=P.manifoldLayout(f).leftLength;cases.push({manifoldLoops:5},{manifoldLengths:{upper:length,lower:length*.7}});}
 for(const patch of cases){Object.assign(f,original,patch);const before=JSON.stringify(f);assert.deepEqual(json(cached.parts(f)),fresh(f),type+' fresh production parity '+JSON.stringify(patch));assert.equal(JSON.stringify(f),before,'no mutation');count++;for(const key of Object.keys(f))delete f[key];Object.assign(f,original);assert.deepEqual(json(cached.parts(f)),base,type+' restored geometry');}
 // An equal-value restored object must give the same geometry, independently of identity.
 assert.deepEqual(json(cached.parts(json(original))),base,type+' restored object');
}
console.log('PASS production world cache: '+count+' fresh-builder comparisons, position/rotation/mirror/size/height/install/doors, no mutation and restored objects');
// More unique shapes than the local LRU must still hit unchanged world meshes.
// Instrument the real production builder: a vertex comparison alone misses rebuilds.
{
 const model=require('../src/render/balcony-garden-model.js');let builds=0;
 const context={module:{exports:{}},require:createRequire(file),FurnishBalconyGardenModel:{...model,build(...args){builds++;return model.build(...args);}}};
 vm.createContext(context);vm.runInContext(source,context);const solids=context.module.exports;
 const rack={type:'balcony_plant_rack',w:1160,d:550,h:1600,cx:9785,cy:1480,rot:90};
 const first=solids.parts(rack);
 for(let i=1;i<=40;i++)solids.parts({...rack,w:rack.w+i});
 assert.equal(builds,41);assert.strictEqual(solids.parts({...rack}),first,'world hit survives local shape eviction');
 assert.equal(builds,41,'unchanged world hit must not reconstruct evicted local geometry');
 const moved={...rack,cx:rack.cx+20,rot:37,flip:true};
 assert.deepEqual(json(solids.parts(moved)),fresh(moved),'world miss rebuilds evicted shape with current pose');
 const plant={...rack,type:'plant_spider',w:450,d:450,h:450,mountHeight:800};
 const lower=json(solids.parts(plant));plant.mountHeight=1500;
 assert.deepEqual(json(solids.parts(plant)),fresh(plant),'installation height invalidates');
 assert.notDeepEqual(json(solids.parts(plant)),lower);plant.mountHeight=800;assert.deepEqual(json(solids.parts(plant)),lower);
 console.log('PASS world-first cache under 41 unique production shapes: no rebuild on hit; pose/installation changes and restore');
}
