const assert=require('node:assert/strict'),F=require('../src/core/floor-finish-core.js'),WF=require('../src/core/wall-finish-core.js'),P=require('../src/core/project-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const rooms=[{id:'a',poly:[[8,0],[9,0],[-20,0]]}];
assert.deepEqual(F.snapOrigin([0,0],rooms,12),{point:[8,0],snapped:true,roomId:'a'},'nearest corner is measured from the original pointer, without chaining');
assert.equal(F.snapOrigin([0,12],[{id:'a',poly:[[0,0]]}],12).snapped,true,'inclusive pixel threshold');
assert.equal(F.snapOrigin([0,12.001],[{id:'a',poly:[[0,0]]}],12).snapped,false);
const input=[700,800],result=F.snapOrigin(input,rooms,12);assert.deepEqual(result.point,input);assert.notEqual(result.point,input);assert.deepEqual(input,[700,800]);
assert.deepEqual(F.snapOrigin([101,99],[{id:'hole',rings:[[[0,0],[1000,0]],[[100,100],[200,100]]]}],12).point,[100,100]);
const {plan,work}=fixture(),face=WF.faces(plan).find(f=>f.wallId==='north'),finished=WF.spatial(P.effectivePlan(plan,WF.edit(work,face,{tileThickness:10,bondThickness:15}))),corner=finished.rooms[0].poly.find(p=>p[1]===225);
assert(corner);assert.deepEqual(F.snapOrigin([corner[0]+3,228],finished.rooms,12).point,corner,'uses derived finished face, preserving raw wall baseline');
for(const scale of [.03,.2,1,2])for(const angle of [0,90,180,270]){
 const radians=angle*Math.PI/180,offset=[8*Math.cos(radians)/scale,8*Math.sin(radians)/scale],near=[corner[0]+offset[0],corner[1]+offset[1]];
 assert.deepEqual(F.snapOrigin(near,[{id:'a',poly:[corner]}],12/scale).point,corner);
}
assert.deepEqual(F.snapOrigin([1,1],[],12),{point:[1,1],snapped:false});
console.log('PASS floor origin nearest corner, finished boundaries, exact threshold, holes, rotation/zoom and immutable inputs');
