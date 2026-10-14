const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),M=require('../src/data/catalog.js').materials;
const rect={poly:[[0,0],[6000,0],[6000,4000],[0,4000]]},L={poly:[[0,0],[6000,0],[6000,2000],[3000,2000],[3000,4000],[0,4000]]};
assert.equal(D.netSpans(rect,[3000,2000]).horizontal.value,6000);assert.equal(D.netSpans(rect,[3000,2000]).vertical.value,4000);
assert.equal(D.netSpans(L,[1500,3000]).horizontal.value,3000);assert.equal(D.netSpans(L,[4500,1000]).vertical.value,2000);assert.equal(D.netSpans(L,[4500,3000]),null);assert.equal(D.netSpans(L,[3000,3000]),null);
const hole={...rect,rings:[rect.poly,[[2000,1000],[4000,1000],[4000,3000],[2000,3000]]]};
assert.equal(D.netSpans(hole,[1000,2000]).horizontal.value,2000);assert.equal(D.netSpans(hole,[3000,500]).vertical.value,1000);assert.equal(D.netSpans(hole,[3000,2000]),null);assert.equal(D.netSpans(rect,[0,2000]),null);
const slant={poly:[[0,0],[4000,0],[2000,4000]]};assert.equal(D.netSpans(slant,[2000,2000]).horizontal.value,2000);
for(const angle of [0,90,180,270]){const rotate=p=>D.rotate(p,angle),r={poly:L.poly.map(rotate)},s=D.netSpans(r,rotate([1500,3000]));assert(s);assert(Math.abs(([90,270].includes(angle)?s.vertical:s.horizontal).value-3000)<1e-6);for(const raw of [-135,-90,-45,0,45,90,135])assert(Math.abs(D.textAngle(raw,angle)+angle)<=90);}
const spans=D.netSpans(hole,[1000,2000]),measures=[spans.horizontal,spans.vertical].map(d=>({a:{x:d.a[0],y:d.a[1]},b:{x:d.b[0],y:d.b[1]}})),work={furniture:[],measures},payload={planId:'room-net',current:work,designs:[{name:'测量',work}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)),payload);
const plan={id:'room-net',rooms:[],defaults:[]},restore=W.create({makeId:()=> 'id',colorFor:()=> '#fff',materials:M}).restore,first=restore(structuredClone(work),plan);assert.deepEqual(restore(structuredClone(first),plan),first);assert.deepEqual(first.measures,measures);
console.log('PASS interior sections, L-shapes, holes, exact boundaries, slanted faces, four rotations and production project/restore endpoints');
