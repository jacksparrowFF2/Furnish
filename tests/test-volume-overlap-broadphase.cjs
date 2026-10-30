'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('../src/core/layout-geometry.js'),M=require('../src/core/cabinet-motion.js');
let reads=0,sections=0;
const scope={module:{exports:{}},require:createRequire(file),FurnishProducts:{},FurnishKitchen:{},FurnishDesign:{},FurnishCabinetMotion:{...M,supportsSolids:()=>true,solidParts:f=>{reads++;return f.parts;},section:(...args)=>{sections++;return M.section(...args);}}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),scope);const G=scope.module.exports;
function part(x,z,bottom=0,top=100,rot=0,actualBoard=true,tilt=0){
 const c=Math.cos(rot),s=Math.sin(rot),poly=[[-50,-40],[50,-40],[50,40],[-50,40]].map(([a,b])=>[x+a*c-b*s,z+a*s+b*c]);
 const vertices=[bottom,top].flatMap((y,i)=>poly.map(([a,b])=>[a+i*tilt,y,b]));
 return {p:M.section({vertices},null),vertices,vertical:{bottom,top},actualBoard};
}
// Reference preserves the original narrow-phase predicate, independently of
// the optimized candidate traversal and without relying on elapsed time.
const reference=(a,b)=>a.parts.some(A=>b.parts.some(B=>G.verticalOverlap(a,b,[A.vertical,B.vertical])&&G.polygonOverlap(M.section(A,B.vertical),M.section(B,A.vertical),A.actualBoard||B.actualBoard?1e-6:5)));
const a={parts:Array.from({length:20},(_,i)=>part(i*300,0))},b={parts:Array.from({length:20},(_,i)=>part(i*300,500))};
assert.equal(G.volumeOverlap(a,b),false);assert.equal(reads,2,'resolve each production record set once per object pair');assert.equal(sections,0,'separated board bounds need no height clipping');
for(const rot of [0,Math.PI/5,Math.PI/2])for(const offset of [0,94,95,99.999,100,100.001,350])for(const height of [0,99,100,101])for(const actualBoard of [false,true]){
 const left={parts:[part(0,0,0,100,rot,actualBoard,30)]},right={parts:[part(offset,0,height,height+100,-rot,actualBoard)]};
 assert.equal(G.volumeOverlap(left,right),reference(left,right),JSON.stringify({rot,offset,height,actualBoard}));
 right.parts[0].vertical=null;assert.equal(G.volumeOverlap(left,right),reference(left,right),'unknown heights stay conservative');
}
const overlapping={parts:[part(0,0)]};assert.equal(G.volumeOverlap(overlapping,overlapping),true);
assert.equal(G.volumeOverlap({parts:[]},b),false);
console.log('PASS board bounds prune only separated candidates; original clipped predicate matches rotations, tilted prisms, contact/tolerance thresholds and unknown heights');
