'use strict';
const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js'),G=require('../src/core/layout-geometry.js'),Design=require('../src/core/design-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),base={id:'a',type:'block',w:250,d:220,h:80,cx:5000,cy:6000,mountHeight:500,rot:0};
for(const rot of [0,37,90,180])for(const flip of [false,true])for(const rotation of [0,90,180,270]){
 const a={...base,rot,flip},delta=D.rotate([0,220],rot),members=Array.from({length:4},(_,i)=>({...a,id:'m'+i,cx:a.cx+i*delta[0],cy:a.cy+i*delta[1],inventoryArray:{id:'array',index:i,columns:1,rows:4,gapX:0,gapZ:0,gapY:0,pattern:'grid',angle:0}})),before=JSON.stringify(members);
 for(const items of [members,Design.transformFurniture(members,{rotationAxis:'x',angle:37})]){
  const groups=D.selectionFurnitureDirections(items,{scale:.5,rotation});assert.equal(groups.length,1);assert.equal(groups[0].directions.length,4);assert.equal(groups[0].arrayId,'array');
  const points=items.flatMap(f=>G.footprints(f).flat()).map(p=>D.rotate(p,-rot)),lo=[0,1].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1].map(i=>Math.max(...points.map(p=>p[i])));
  for(const mark of groups[0].directions){const edge=D.rotate(mark.edge,-rot),axis=['front','back'].includes(mark.key)?1:0,high=mark.key==='front'||mark.key===(flip?'left':'right');near(edge[axis],high?hi[axis]:lo[axis]);near(edge[1-axis],(lo[1-axis]+hi[1-axis])/2);}
 }
 assert.equal(JSON.stringify(members),before);
 const second=members.slice(0,2).map(f=>({...f,id:'second-'+f.id,cx:f.cx+1000,inventoryArray:{...f.inventoryArray,id:'second'}}));assert.equal(D.selectionFurnitureDirections([...members,...second,a]).length,3,'separate arrays and ordinary units keep separate axes');
 assert.equal(D.selectionFurnitureDirections(members.map(({inventoryArray,...f})=>f)).length,4,'detached items restore individual direction sets');
 assert.deepEqual(D.selectionFurnitureDirections([a])[0].directions,D.furnitureDirections(a));assert.equal(D.selectionFurnitureDirections(members.slice(1,3)).length,1,'visible subset still collapses to one set');
}
assert.deepEqual(D.selectionFurnitureDirections([]),[]);console.log('PASS one outer direction set per array, distinct arrays/ordinary/detached units, actual tilted footprints, arbitrary yaw/mirror/drawing rotations and no mutations');
