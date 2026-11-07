'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),A=require('../src/data/cat-food-2kg-blender-asset.js'),M=require('../src/render/storage-supply-model.js');
const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const f={type:'cat_food_myfoodie_2kg',w:260,d:120,h:400,mountHeight:710};
 const g=M.build(T,f),body=g.children.find(o=>o.name==='pouch-body');
 assert.equal(g.children.length,3);assert.equal(body.material.map.colorSpace,T.SRGBColorSpace);assert.equal(body.material.map.image.width,768);assert.equal(body.geometry.attributes.uv.count,body.geometry.attributes.position.count);assert.equal(body.material.map.image.data.length,768*768*4);
 const b=new T.Box3().setFromObject(g);assert(Math.abs(b.min.y-.710)<1e-6);assert(Math.abs(b.max.y-1.110)<1e-6);
 for(const mesh of g.children)assert.equal(mesh.userData.furnishStablePart,'cat-food-2kg-v1:'+mesh.name);
 const bodyPart=A.parts.find(p=>p.name==='pouch-body');assert.equal(bodyPart.recolor,false);assert(bodyPart.uvs.some(v=>v>.9),'reverse/side atlas must remain available');
 // Side correction must preserve the approved task scope: front pixels and all
 // existing physical vertices stay identical to the first published pouch.
 const rgba=Buffer.from(A.textures[0].rgba,'base64');
 assert.equal(hash(Buffer.concat(Array.from({length:768},(_,y)=>rgba.subarray(y*768*4,(y*768+384)*4)))),'2451a615cb55ca89ef189ff6b55c1a93600ada543d8b43f02be0e14790f6ed02');
 const original={'pouch-body':'72be4203ce083c097ca1bf36604d19d4f75d6389e8bb96ddcf535466d0e17017','zipper-1':'a26164306ce0c5e9807bc9fb4b6fde5fe3f894bef485c497b2520a9025a39b0b','zipper-2':'d9779ff4e397f9ddbdd03c8be8daadde9e4a373e2e92f02ddbdbed6c4b0e800b'};
 for(const part of A.parts)assert.equal(hash(JSON.stringify(part.positions)),original[part.name]);
 const sideColors=new Set();for(let y=150;y<700;y++)for(let x=690;x<765;x++){const i=(y*768+x)*4;sideColors.add(rgba.subarray(i,i+3).toString('hex'));}assert(sideColors.size>200,'right side must retain photographed logo/table detail, not a flat swatch');
 console.log('PASS cat food: offline label, UVs, sRGB, closed static body identities and independent elevation');
})().catch(e=>{console.error(e);process.exitCode=1;});
