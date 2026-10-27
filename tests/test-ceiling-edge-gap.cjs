'use strict';
const assert=require('node:assert/strict'),G=require('../src/core/zone-geometry.js'),C=require('../src/core/ceiling-core.js');
const poly=[[0,0],[3000,0],[3000,2000],[0,2000]],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const gap of [0,11.999,12]){
 const reference=[[3000+gap,-200],[4000,-200],[4000,500]],hit=G.moveBoundaryEdge(poly,0,[1500,-192],{polygons:[reference],radius:12});
 assert.equal(hit.kind,'edge');near(hit.polygon[0][1],-200);near(hit.polygon[1][1],-200);assert.equal(hit.separated,true);
 const contact=G.moveBoundaryEdge(hit.polygon,0,[1500,-200],{polygons:[reference],radius:1e-6,gapRadius:12});assert.equal(contact.kind,'edge');assert.equal(contact.separated,true);
}
assert.equal(G.moveBoundaryEdge(poly,0,[1500,-192],{polygons:[[[3012.001,-200],[4000,-200],[4000,500]]],radius:12}).kind,null);
assert.equal(G.moveBoundaryEdge(poly,0,[1500,-187.999],{polygons:[[[3008,-200],[4000,-200],[4000,500]]],radius:12}).kind,null);
assert.equal(G.moveBoundaryEdge(poly,0,[1500,-192],{polygons:[[[3008,-200],[4000,-200],[4000,500]]],radius:12,snap:false}).kind,null);
// Reproduce the photographed plan: wall separates the bedroom from the beam.
const bedroom=[[839.5,2337],[3706,2329],[3706,5155],[839.5,5155]],beam=[[3841,5420],[4092.460415,5420],[4092.460415,6486],[3841,6486]];
const hit=G.moveBoundaryEdge(bedroom,2,[2272.75,5412],{polygons:[beam],radius:180});assert.equal(hit.kind,'edge');assert.equal(hit.separated,true);near(hit.polygon[2][1],5420);near(hit.polygon[3][1],5420);assert.deepEqual(hit.polygon.slice(0,2),bedroom.slice(0,2));C.polygon(hit.polygon);
const skew=[[0,8],[3000,0],[3000,2000],[0,2000]],ref=[[-200,-200],[3200,-200],[3200,2200],[-200,2200]];
for(const angle of [0,.4,Math.PI/2])for(const mirror of [1,-1]){
 const transform=([x,y])=>[(x*mirror)*Math.cos(angle)-y*Math.sin(angle)+5000,(x*mirror)*Math.sin(angle)+y*Math.cos(angle)-1000],shape=skew.map(transform),reference=ref.map(transform),target=transform([1500,-196]),before=JSON.stringify(shape),moved=G.moveBoundaryEdge(shape,0,target,{polygons:[reference],radius:12});
 assert.equal(moved.kind,'edge');const a=reference[0],b=reference[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(const p of moved.polygon.slice(0,2))near(((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))/length,0);
 assert.deepEqual(moved.polygon.slice(2),shape.slice(2));assert.equal(JSON.stringify(shape),before);C.polygon(moved.polygon);
}
const tilted=[[0,150],[3000,0],[3000,2000],[0,2000]];assert.equal(G.moveBoundaryEdge(tilted,0,[1500,-192],{polygons:[ref],radius:12}).kind,null,'large angle must not rotate into a snap');
console.log('PASS separated edge screen thresholds, persistent alignment, actual bedroom/beam gap, bounded skew correction, rotations/mirrors and unchanged remote vertices');
