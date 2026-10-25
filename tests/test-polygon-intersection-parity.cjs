'use strict';
const assert=require('node:assert/strict'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
// Frozen reference: preserve SAT axis normalization, 5 mm threshold and touching.
function reference(A,B){for(const axis of [0,1])if(Math.max(...A.map(p=>p[axis]))<=Math.min(...B.map(p=>p[axis]))||Math.max(...B.map(p=>p[axis]))<=Math.min(...A.map(p=>p[axis])))return false;for(const poly of [A,B])for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],nx=b[1]-a[1],ny=a[0]-b[0],l=Math.hypot(nx,ny);if(!l)continue;const pa=A.map(p=>(p[0]*nx+p[1]*ny)/l),pb=B.map(p=>(p[0]*nx+p[1]*ny)/l);if(Math.max(...pa)<=Math.min(...pb)+5||Math.max(...pb)<=Math.min(...pa)+5)return false;}return true;}
const box=(x,y,w,d,angle=0,flip=false)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>{a*=flip?-1:1;return [x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle)];});
let seed=9251,count=0;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
for(let i=0;i<2000;i++){const a=box(random()*1000,random()*1000,random()*1200+1,random()*1200+1,random()*Math.PI,i%2===0),b=box(random()*1000,random()*1000,random()*1200+1,random()*1200+1,random()*Math.PI,i%3===0);if(i%5===0)a.splice(1,0,a[0]);assert.equal(P.intersects(a,b),reference(a,b));count++;}
for(const overlap of [0,4.999999,5,5.000001,50]){const a=box(0,0,100,100),b=box(100-overlap,0,100,100);assert.equal(P.intersects(a,b),reference(a,b));}
const zone={poly:box(0,0,100,100),ranges:[[100,200]]},poly=box(0,0,50,50);
for(const vertical of [null,{bottom:0,top:100},{bottom:200,top:300},{bottom:199.999,top:300},{bottom:120,top:180}]){
 const expected=reference(zone.poly,poly)&&(!vertical||zone.ranges.some(([bottom,top])=>Math.min(top,vertical.top)-Math.max(bottom,vertical.bottom)>1e-6));
 assert.equal(C.openingIntersects(zone,poly,vertical,P.intersects),expected);
}
console.log('PASS: '+count+' rotated/mirrored SAT pairs, exact 5 mm boundary, repeated vertices and known/unknown opening heights');
