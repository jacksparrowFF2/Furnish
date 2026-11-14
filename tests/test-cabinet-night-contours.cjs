'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const L=require('../src/core/lighting-core.js'),B=require('../src/core/cabinet-builder-core.js'),M=require('../src/render/cabinet-model.js');
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const f=B.create({id:'contours',cx:0,cy:0,rot:0}),saved=JSON.stringify(f),scene=M.build(T,f,box),preview=M.build(T,f,box,{outlines:true,removableHints:true});
 const contours=g=>{const a=[];g.traverse(o=>{if(o.userData.cabinetOutline)a.push(o);});return a;},edges=contours(scene),editor=contours(preview);
 assert(edges.length>0);assert.equal(editor.length,edges.length);
 const colors=edges.map(o=>o.material.color.clone()),previewColors=editor.map(o=>o.material.color.clone()),boards=[];scene.traverse(o=>{if(o.isMesh)boards.push([o,o.material.color.clone()]);});
 for(let i=0;i<4;i++){
  L.cabinetContours(scene,L.environment(true));L.cabinetContours(scene,L.environment(true));
  edges.forEach((o,j)=>assert(o.material.color.equals(colors[j].clone().multiplyScalar(.015/1.1)),'night attenuates without cumulative drift'));
  L.cabinetContours(scene,L.environment(false));edges.forEach((o,j)=>assert(o.material.color.equals(colors[j]),'day restores exact original color'));
 }
 editor.forEach((o,j)=>assert(o.material.color.equals(previewColors[j]),'editor retains independent original contours'));
 boards.forEach(([o,color])=>assert(o.material.color.equals(color),'board materials unchanged'));
 assert.equal(JSON.stringify(f),saved,'no persisted furniture change');
 const rebuilt=M.build(T,f,box);L.cabinetContours(rebuilt,L.environment(true));contours(rebuilt).forEach((o,j)=>assert(o.material.color.equals(colors[j].clone().multiplyScalar(.015/1.1)),'newly rebuilt furniture receives night attenuation'));
 console.log('PASS production cabinet night/day contours, repeated switching, rebuild, independent editor and unchanged boards/data');
})().catch(e=>{console.error(e);process.exitCode=1;});
