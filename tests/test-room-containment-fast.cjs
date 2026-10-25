const assert=require('node:assert/strict'),P=require('../src/core/project-core.js'),Z=require('../src/core/zone-geometry.js');
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],cases=[
 [rect(0,0,100,100)], [rect(0,0,50,100),rect(50,0,50,100)],
 [rect(0,0,100,30),rect(0,70,100,30),rect(0,30,30,40),rect(70,30,30,40)],
 [[[0,0],[100,0],[100,30],[30,30],[30,100],[0,100]]],
 [rect(0,0,100,100).reverse()], [rect(0,0,20,100),rect(80,0,20,100)]];
let count=0;
for(const polys of cases)for(const angle of [0,37,90])for(let x=-5;x<=105;x+=10)for(let y=-5;y<=105;y+=10){const a=angle*Math.PI/180,footprint=rect(-8,-8,16,16).map(([u,v])=>[x+u*Math.cos(a)-v*Math.sin(a),y+u*Math.sin(a)+v*Math.cos(a)]),expected=Z.area(Z.decompose([footprint,...polys],p=>Z.inside(p,footprint)&&!polys.some(q=>Z.inside(p,q))))<=1;assert.equal(P.fitsInRooms([{poly:polys[0],polys}],footprint),expected);count++;}
const poly=rect(0,0,100,100),rooms=[{poly,polys:[poly]}],footprint=rect(20,20,20,20);assert(P.fitsInRooms(rooms,footprint));poly.forEach(p=>p[0]+=200);assert(!P.fitsInRooms(rooms,footprint),'in-place polygon edits invalidate metadata');
console.log(`PASS ${count} convex/concave/union-seam/hole/reversed/rotated room checks match exact union, plus in-place cache invalidation`);
