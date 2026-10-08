const assert=require('node:assert/strict'),D=require('./design-core.js'),P=require('./project-core.js');
const base={x:0,y:0,w:4000,h:3000};
assert.deepEqual(D.deliveryBounds(base,[]),base);
assert.deepEqual(D.deliveryBounds(base,[[-1200,100,-100,500],[4200,3100,5000,3300]]),{x:-1450,y:-150,w:6700,h:3700});
assert.deepEqual(D.deliveryBounds(base,[[NaN,0,20,30],[5,5,1,1]]),base);
const m={a:{x:0,y:0},b:{x:3000,y:4000}},g=D.measurementGeometry(m);
assert.equal(g.length,5000);assert.equal(g.mx,1500);assert.equal(g.my,2000);assert.equal(g.textSize,180);
assert.ok(Math.abs(g.nx*(m.b.x-m.a.x)+g.ny*(m.b.y-m.a.y))<1e-8);
for(const b of [{x:-3000,y:4000},{x:-3000,y:-4000},{x:0,y:4000},{x:0,y:-4000}]){const v=D.measurementGeometry({a:m.a,b});assert.ok(v.angle>=-90&&v.angle<=90);assert.equal(v.textSize,180);}
assert.equal(D.measurementGeometry({a:m.a,b:m.a}),null);
const work={furniture:[],rooms:{},open:{},measures:[m],notes:[{id:'note',x:-1200,y:100,text:'现场核对 <A>',size:1,color:'paper'}]};
const data={planId:'p1',current:work,designs:[],catalog:[]};assert.deepEqual(P.unpack(P.pack(data)),data);
for(const measures of [{},[{}],[{a:null,b:m.b}],[{a:{x:'0',y:0},b:m.b}],Array(2001).fill(m)])assert.throws(()=>P.validateWork({...work,measures}),/测量线/);
console.log('PASS delivery bounds, off-plan content padding, stable measurement geometry, upright dimensions, project preservation and malformed measurement rejection');
