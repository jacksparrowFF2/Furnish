const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js');
const hit=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const plan={walls:[[0,0,8000,200],[0,0,200,6000],[7800,0,8000,6000],[0,5800,8000,6000],[2000,0,2200,6000],[2300,0,2500,6000],[2550,0,2750,6000]],bounds:{x:0,y:0,w:8000,h:6000}};
const raw=D.dimensions(plan),original=JSON.stringify(raw);
for(const rotation of [0,90,180,270])for(const scale of [0,.025,.12]){
 const layout=D.dimensionLayout(raw,{rotation,scale}),boxes=layout.flatMap(d=>d.label?[d.label.box]:[]);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!hit(boxes[i],boxes[j]),'dimension text collision');
 assert.deepEqual(layout.map(d=>d.value),raw.map(d=>d.value));
 assert(layout.filter(d=>d.kind==='overall').every(d=>d.label));
}
assert.equal(JSON.stringify(raw),original);assert(D.dimensionLayout(raw,{scale:.12}).filter(d=>d.label).length>D.dimensionLayout(raw,{scale:.025}).filter(d=>d.label).length);
const room={id:'r',name:'卧室',at:[2000,2000],poly:[[0,0],[4000,0],[4000,4000],[0,4000]]},chair=[[1500,1500],[2500,1500],[2500,2500],[1500,2500]],before=JSON.stringify(room);
for(const rotation of [0,90,180,270]){const r=D.roomLabels([room],[chair],{rotation})[0];assert.equal(r.hits,0);assert(!hit(r.box,[1500,1500,2500,2500]));assert.notDeepEqual(r.at,room.at);}
const hole={...room,rings:[room.poly,[[1500,1500],[2500,1500],[2500,2500],[1500,2500]]]};assert.equal(D.roomLabels([hole])[0].hits,0);assert(!hit(D.roomLabels([hole])[0].box,[1500,1500,2500,2500]));
assert.equal(JSON.stringify(room),before);
console.log('PASS collision-free dimension labels, zoom-dependent detail, four rotations, furniture/hole avoidance and immutable drawing geometry');
