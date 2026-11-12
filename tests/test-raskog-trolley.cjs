'use strict';
const assert=require('node:assert/strict'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/product-rules.js'),J=require('../src/core/project-core.js');
const A=require('../src/data/trolley-ikea-raskog-large-blender-asset.js');
const f={id:'cart',type:'trolley_ikea_raskog_large',name:'拉斯克',w:350,d:450,h:770,cx:0,cy:0,rot:0,mountHeight:0};
const box=(id,w,h,d,cx,cy,bottom)=>({id,type:'block',w,h,d,cx,cy,rot:0,mountHeight:bottom});
assert.equal(A.parts.length,67);assert.equal(P.initial(f).mountHeight,0);
for(const y of [260,515,770]){
 // Basket interior is empty above its floor; the real front steel wall collides.
 assert(!G.volumeOverlap(f,box('inside',50,20,50,0,0,y-45)));
 assert(G.volumeOverlap(f,box('wall',12,12,12,157,0,y-35)));
}
assert(!G.volumeOverlap(f,box('between',100,80,100,0,0,300)));
const bay=[box('left',18,830,600,-194,0,0),box('right',18,830,600,194,0,0),box('back',370,830,18,0,-291,0),box('top',406,18,600,0,0,812)];
for(let extension=0;extension<=800;extension+=10)for(const wall of bay)assert(!G.volumeOverlap({...f,cy:extension},wall),wall.id+' at '+extension);
assert(!G.volumeOverlap(f,box('closed-door',370,810,18,0,291,0)));
assert(G.volumeOverlap({...f,cx:25},bay[1]),'lateral interference remains detectable');
assert(G.volumeOverlap({...f,mountHeight:55},bay[3]),'top interference remains detectable');
const named={...f,mountHeight:80,pose3D:[0,0,0,1]};
const input={planId:'p',current:{furniture:[named]},designs:[{name:'copy',work:{furniture:[named]}}],catalog:[]};
assert.deepEqual(J.unpack(J.pack(input)).current.furniture[0],named);
console.log('PASS RÅSKOG: 67 identities, three real basket cavities, walls, layer gaps, 81 pull-out positions in 370×564×812 bay, negative interferences and project round-trip');
