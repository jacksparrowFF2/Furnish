'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
const plan={rooms:[{id:'r',name:'Room',poly:[[0,0],[8000,0],[8000,8000],[0,8000]],ceilingHeight:4000}],walls:[],doors:[],ceilingHeight:4000};
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const cabinet={id:'cab',name:'Cabinet',type:'cabinet',cx:2500,cy:2500,rot,flip,color:'#fff',...C.preset('sideboard-fridge')},a=rot*Math.PI/180,bed={id:'bed',name:'Repeated body',type:'bed',w:1800,d:900,h:850,cx:2500-500*Math.sin(a),cy:2500+500*Math.cos(a),rot,flip};
 const inspect=items=>P.spaceCheck(plan,[cabinet,...items],{scanPassages:false}).filter(i=>i.id==='cab'&&i.kind.startsWith('cabinet')&&i.message.includes(bed.name));
 const single=inspect([bed]);assert(single.length);for(const issue of single)assert.equal(issue.message.split(bed.name).length-1,1,'one furniture identity is listed once despite many solid hits');
 const two=inspect([bed,{...bed,id:'other-bed'}]);assert.equal(two.length,single.length);for(const issue of two)assert.equal(issue.message.split(bed.name).length-1,2,'distinct furniture with identical names remain distinct');
 const elevated=inspect([{...bed,type:'washer',mountHeight:3500,h:100}]);assert.equal(elevated.length,0,'message cleanup does not introduce false collisions across heights');
}
const double={id:'double',type:'cabinet',cx:2500,cy:2500,rot:0,...C.preset('base')};double.cabinet.columns=[{door:'double',doorOpen:false,handle:'none',shelves:[],drawers:[]}];
const obstacle={id:'blocker',name:'One blocker',type:'bed',cx:2500,cy:2900,w:1800,d:900,h:850,rot:0};
const doors=P.spaceCheck(plan,[double,obstacle],{scanPassages:false}).filter(i=>i.id===double.id&&i.kind==='cabinetdoor');assert.equal(doors.length,2,'different physical door sweeps remain independently locatable despite equal summaries');assert.notDeepEqual(doors[0].at,doors[1].at);
// A remote bed has many real production parts. None should reach the exact
// door-sweep predicate; near parts above still use it and retain their messages.
const far={...obstacle,id:'far',cx:6500,cy:6500},exact=C.openingIntersects;let remoteCalls=0;
try{C.openingIntersects=function(zone,poly,...args){if(poly.every(p=>p[0]>5000&&p[1]>5000))remoteCalls++;return exact(zone,poly,...args);};
 const result=P.spaceCheck(plan,[double,far],{scanPassages:false});assert(!result.some(i=>i.id===double.id&&i.kind==='cabinetdoor'));assert.equal(remoteCalls,0,'remote production boards must be rejected before repeated exact sweep tests');
}finally{C.openingIntersects=exact;}
console.log('PASS obstacle summaries: production multipart collisions, per-identity deduplication, distinct same-name furniture, rotated/mirrored geometry, vertical separation and remote-board broad phase');
