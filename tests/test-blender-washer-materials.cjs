'use strict';
// Inspect the actual exchange file: a runtime material cannot reveal a missing
// GLB assignment caused by empty Boolean material slots in a newer Blender.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),C=require('../src/core/washer-motion-core.js');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../assets/models/washer-tg10k60w/washer-tg10k60w-v1.glb')),buffer=fs.readFileSync(file),doc=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),parts=C.reference({type:'washer_littleswan_tg10k60w'}),nodes=doc.nodes.filter(n=>n.extras?.furnishStablePart?.startsWith('washer-tg10k60w-v1:'));
assert.equal(nodes.length,47);
for(const part of parts){
 const node=nodes.find(n=>n.name===part.name);assert(node,part.name+' missing');const mesh=doc.meshes[node.mesh],materials=new Set();
 for(const primitive of mesh.primitives){assert(Number.isInteger(primitive.material)&&doc.materials[primitive.material],part.name+' has faces without a valid GLB material');materials.add(primitive.material);}
 assert.equal(materials.size,1,part.name+' must have one declared material');const material=doc.materials[[...materials][0]];
 assert.equal(material.name,part.material,part.name+' uses the wrong product material');
 if(part.name==='door-glass'){assert.equal(material.alphaMode,'BLEND');assert(Math.abs(material.pbrMetallicRoughness.baseColorFactor[3]-.12)<1e-5);}
 else assert(!material.alphaMode||material.alphaMode==='OPAQUE',part.name+' unexpectedly transparent');
}
console.log('PASS TG10K60W exchange materials: 47 named parts, valid assignments on every primitive, declared material and glass-only alpha');
