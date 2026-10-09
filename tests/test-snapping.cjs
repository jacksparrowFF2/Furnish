const assert=require('node:assert/strict');
const S=require('../src/core/snapping.js');
const f={id:'moving',cx:0,cy:0,w:100,d:200,rot:0};
const base={grid:100,scale:1,wallSnap:true,guides:true,rects:[[0,0,0,1000]],furniture:[]};
assert.deepEqual(S.move(f,46,500,base),{position:[50,500],guides:[]});
assert.deepEqual(S.move(f,40,500,base).position,[0,500]); // Exact tolerance is excluded.
assert.deepEqual(S.move(f,46,3000,base).position,[0,3000]); // No wall alignment outside its span.
assert.deepEqual(S.move({...f,rot:90},98,500,base).position,[100,500]);
assert.deepEqual(S.move(f,46,500,{...base,wallSnap:false}).position,[0,500]);
assert.deepEqual(S.move(f,40,500,{...base,scale:.5}).position,[50,500]);
assert.deepEqual(S.move(f,-26,-24,{...base,wallSnap:false,grid:10}).position,[-30,-20]);
const other={id:'other',cx:200,cy:500,w:100,d:200,rot:0};
const options={...base,rects:[],furniture:[f,other]};
const before=structuredClone({f,options});
const aligned=S.move(f,194,500,options);
assert.deepEqual(aligned.position,[200,500]);assert.equal(aligned.guides.length,2);
assert.deepEqual(aligned.guides[0],{v:true,x:150,a:250,b:750});
assert.deepEqual({f,options},before);
assert.deepEqual(S.move(f,194,500,{...options,skip:new Set(['other'])}).guides,[]);
assert.deepEqual(S.move(f,194,500,{...options,guides:false}).guides,[]);
assert.deepEqual(S.move(f,194,500,{...options,furniture:[{...other,cy:7000}]}).guides,[]);
// A closer wall beats an alignment candidate; ties preserve wall precedence.
assert.deepEqual(S.move(f,46,500,{...base,furniture:[{...other,cx:103}]}).guides.filter(g=>g.v),[]);
assert.deepEqual(S.point({x:8,y:27},{scale:1,rects:[[0,20,50,30]]}),{x:10,y:30});
assert.deepEqual(S.point({x:7,y:27},{scale:1,rects:[[0,20,50,30]]}),{x:0,y:30});
assert.deepEqual(S.point({x:42,y:19},{scale:1,rects:[],anchor:{x:0,y:0}}),{x:40,y:0});
assert.deepEqual(S.point({x:19,y:42},{scale:1,rects:[],anchor:{x:0,y:0}}),{x:0,y:40});
assert.deepEqual(S.point({x:20,y:20},{scale:1,rects:[],anchor:{x:0,y:0}}),{x:0,y:20});
console.log('PASS grid, rotated bounds, tolerance, nearby guides, exclusions and measurement anchors');
