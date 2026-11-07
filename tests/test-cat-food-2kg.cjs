'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),A=require('../src/data/cat-food-2kg-blender-asset.js'),M=require('../src/render/storage-supply-model.js');
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const f={type:'cat_food_myfoodie_2kg',w:260,d:120,h:400,mountHeight:710};
 const g=M.build(T,f),body=g.children.find(o=>o.name==='pouch-body');
 assert.equal(g.children.length,3);assert.equal(body.material.map.colorSpace,T.SRGBColorSpace);assert.equal(body.material.map.image.width,768);assert.equal(body.geometry.attributes.uv.count,body.geometry.attributes.position.count);assert.equal(body.material.map.image.data.length,768*768*4);
 const b=new T.Box3().setFromObject(g);assert(Math.abs(b.min.y-.710)<1e-6);assert(Math.abs(b.max.y-1.110)<1e-6);
 for(const mesh of g.children)assert.equal(mesh.userData.furnishStablePart,'cat-food-2kg-v1:'+mesh.name);
 const bodyPart=A.parts.find(p=>p.name==='pouch-body');assert.equal(bodyPart.recolor,false);assert(bodyPart.uvs.some(v=>v>.9),'reverse/side atlas must remain available');
 console.log('PASS cat food: offline label, UVs, sRGB, closed static body identities and independent elevation');
})().catch(e=>{console.error(e);process.exitCode=1;});
