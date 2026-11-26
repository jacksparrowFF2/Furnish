'use strict';
const assert=require('node:assert/strict');
const Route=require('../src/core/route-core.js');
const rect=(x,y,X,Y)=>[[x,y],[X,y],[X,Y],[x,Y]];
const room={id:'room',poly:rect(0,0,4000,3000),ceilingHeight:2600};
const plan={rooms:[room],walls:[],doors:[],ceilingHeight:2600};
const check=(p=plan,items=[],options={})=>Route.check(p,items,{
 from:{x:400,y:500},to:{x:3600,y:500},width:600,height:1700,...options
});
const obstacle={id:'obstacle',name:'柜体',type:'block',w:600,d:1600,h:2000,cx:2000,cy:800,rot:0};
const direct=check();
assert.equal(direct.status,'path-found');
assert.deepEqual(direct.path,[[400,500],[3600,500]]);
assert.equal(direct.bottleneck.width,800);
const detour=check(plan,[obstacle]);
assert.equal(detour.status,'path-found');
assert(detour.path.length>2&&detour.path.some(point=>point[1]>=1900));
assert.equal(check(plan,[obstacle],{removeFurnitureId:obstacle.id}).length,direct.length);
assert.equal(check(plan,[obstacle],{usePositions:[{id:obstacle.id,cx:2000,cy:2200}]}).length,direct.length);
assert.equal(obstacle.cy,800);
assert.equal(check(plan,[{...obstacle,mountHeight:2000}]).length,direct.length);
assert.equal(check(plan,[{...obstacle,d:3000,cy:1500}]).status,'no-path-found');
assert.equal(check(plan,[],{width:800}).status,'path-found');
assert.equal(check(plan,[],{width:801}).status,'no-path-found');
assert.equal(check(plan,[],{width:800,depth:500}).status,'no-path-found');
assert.equal(check({...plan,beams:[{id:'unknown',poly:rect(1700,0,2300,3000)}]}).pending[0].id,'unknown');
const split={...plan,rooms:[{...room,poly:rect(0,0,1800,3000)},{...room,id:'room2',poly:rect(2200,0,4000,3000)}],
 walls:[[1800,0,2200,100],[1800,1000,2200,3000]],doors:[{rect:[1800,100,2200,1000],h:[1800,100],c:[0,1],o:[-1,0],len:900}]};
assert.equal(check(split).status,'needs-review');
assert.equal(check(split,[],{doorStates:[{index:0,state:'closed'}]}).status,'no-path-found');
assert.throws(()=>check(split,[],{doorStates:[{index:2,state:'open'}]}),/门编号/);
console.log('PASS continuous routes, turn, clearance threshold, height, moving envelope, unknown beam and door use');
