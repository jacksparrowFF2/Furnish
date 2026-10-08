const assert=require('node:assert/strict'),D=require('./design-core.js');
const f={id:'f',type:'chair',name:'旧椅',cx:500,cy:500,w:400,d:400,h:800,rot:30,resizeAnchor:'left',price:300,purchaseStatus:'received',catalogId:'old',obj:{positions:[1]}};
const c={id:'new',type:'custom',shape:'rect',name:'新椅',w:600,d:450,h:900,color:'#abcdef',price:900,brand:'甲',model:'B'};
const next=D.replaceFurniture(f,c);assert.equal(next.id,f.id);assert.equal(next.rot,f.rot);assert(Math.abs(D.bounds(next)[0]-D.bounds(f)[0])<1e-8);assert.equal(next.purchaseStatus,'planned');assert.equal(next.catalogId,'new');assert.equal(next.price,undefined);assert.equal(next.referencePrice,900);assert.equal(next.obj,undefined);assert.equal(f.purchaseStatus,'received');assert.throws(()=>D.replaceFurniture({...f,locked:true},c),/锁定/);
const basic=D.replaceFurniture(f,{...c,id:undefined,h:undefined,type:'chair'});assert.equal(basic.h,undefined);assert.equal(basic.catalogId,undefined);
