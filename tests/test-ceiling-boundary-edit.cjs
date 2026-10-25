'use strict';
const assert=require('node:assert/strict'),G=require('../src/core/zone-geometry.js'),C=require('../src/core/ceiling-core.js');
const poly=[[0,0],[3000,0],[3000,2000],[0,2000]],original=JSON.stringify(poly),near=(a,b)=>assert(Math.abs(a-b)<1e-6);
assert.deepEqual(G.moveOrthogonalVertex(poly,0,[250,400]),[[250,400],[3000,400],[3000,2000],[250,2000]]);assert.equal(JSON.stringify(poly),original);
assert.deepEqual(G.moveOrthogonalVertex([...poly.slice(0,1),[1500,0],...poly.slice(1)],1,[1600,300]),[[0,300],[1600,300],[3000,300],[3000,2000],[0,2000]]);
const sloping=[[0,0],[3000,600],[3000,2000],[0,2000]];assert.deepEqual(G.moveOrthogonalVertex(sloping,0,[100,80]),[[100,80],[3000,600],[3000,2000],[100,2000]]);
for(const p of [poly,poly.map(([x,y])=>[-x,y]),poly.map(([x,y])=>[-y,x])]){const moved=G.moveOrthogonalVertex(p,0,[p[0][0]+100,p[0][1]+100]);C.polygon(moved,'吊顶区域');for(let i=0;i<p.length;i++){const j=(i+1)%p.length;for(let a=0;a<2;a++)if(p[i][a]===p[j][a])assert.equal(moved[i][a],moved[j][a]);}}
for(const distance of [11.999,12]){const hit=G.snapBoundaryPoint([1500,distance],{polygons:[poly],radius:12});assert.equal(hit.kind,'edge');assert.deepEqual(hit.point,[1500,0]);}
assert.equal(G.snapBoundaryPoint([1500,12.001],{polygons:[poly],radius:12}).kind,null);
const corner=G.snapBoundaryPoint([8,8],{polygons:[poly],radius:12});assert.equal(corner.kind,'vertex');assert.deepEqual(corner.point,[0,0]);
assert.deepEqual(G.alignPoint([1008,2507],[[1000,900],[400,2500]],12).point,[1000,2500]);
const diagonal=[[0,0],[2000,1000],[0,2000]],hit=G.snapBoundaryPoint([1000,509],{polygons:[diagonal],radius:12});assert.equal(hit.kind,'edge');near(hit.point[1],hit.point[0]/2);
const constrained=G.snapBoundaryPoint([1000,510],{polygons:[diagonal],radius:12,anchor:[500,500],orthogonal:true});assert.deepEqual(constrained.point,[1000,500]);
assert.deepEqual(G.snapBoundaryPoint([1200,540],{polygons:[poly],radius:12,anchor:[500,500],orthogonal:true,snap:false}).point,[1200,500]);
assert.deepEqual(G.snapBoundaryPoint([1200,540],{polygons:[poly],radius:12,snap:false}).point,[1200,540]);
assert.deepEqual(G.projectSegment([200,300],[0,0],[0,0]),{point:[0,0],t:0});
console.log('PASS ceiling boundary orthogonal movement, shared alignment, boundary/vertex thresholds, sloping intersections, rotated/mirrored outlines and free movement');
