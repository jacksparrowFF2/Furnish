const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js');
assert.deepEqual(D.rasterSize({w:8000,h:6000}),{width:3200,height:2400});
for(const [w,h] of [[1000,1000000],[1000000,1000],[6000,9000],[1000,1],[1,1000]]){const size=D.rasterSize({w,h});assert(size.width>=1&&size.height>=1);assert(size.width<=8192&&size.height<=8192);assert(size.width*size.height<=16e6);assert(Math.abs(size.height-size.width*h/w)<=1+h/w);}
for(const box of [{w:0,h:1},{w:1,h:-1},{w:Infinity,h:1}])assert.throws(()=>D.rasterSize(box));
console.log('PASS export raster dimensions, portrait/landscape aspect, long drawings, finite size and pixel budget');
