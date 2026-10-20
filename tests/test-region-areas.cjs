const assert=require('node:assert/strict'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],room={id:'area-a',poly:rect(0,0,2000,2000)},b={id:'area-b',poly:rect(2000,0,2000,2000)},f={id:'floor',type:'washer',cx:1900,cy:1000,w:1000,d:1000,rot:0,h:850,mountHeight:0};
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
close(G.regionAreas([room,b]).empty,8);
close(G.regionAreas([room,b,room],[f,{...f,id:'overlap'}]).free,7);
close(G.regionAreas([room],[f]).occupied,.6);
for(const mountHeight of [0,.0000005,.000002,1000])close(G.regionAreas([room,b],[{...f,mountHeight}]).occupied,mountHeight<=1e-6?1:0);
for(const type of ['acwall','tv','waterheater','rug','curtain'])close(G.regionAreas([room,b],[{...f,type,mountHeight:undefined}]).occupied,0);
for(const host of [{laundryHostId:'lower'},{counterLink:{hostId:'counter'}}])close(G.regionAreas([room,b],[{...f,...host}]).occupied,0);
const hole={...room,rings:[room.poly,rect(500,500,1000,1000).reverse()]};
close(G.regionAreas([hole]).empty,3);close(G.regionAreas([hole],[{...f,cx:1000,cy:1000}]).occupied,0);
const unknown={...f,type:'unrecognized',h:undefined,mountHeight:undefined};assert.deepEqual(G.regionAreas([room],[unknown]).pending,['floor']);assert.deepEqual(G.regionAreas([room],[{...unknown,cx:8000}]).pending,[]);
for(const rot of [0,45,90,180])for(const flip of [false,true])close(G.regionAreas([{poly:rect(-4000,-4000,8000,8000)}],[{...f,cx:0,cy:0,rot,flip}]).occupied,1);
const kitchen=K.configure({id:'k',type:'counter',cx:0,cy:0,w:100,d:100,rot:0},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'door'},{run:1,width:900,role:'door'}]});
for(const rot of [0,45,90])for(const flip of [false,true])close(G.regionAreas([{poly:rect(-5000,-5000,10000,10000)}],[{...kitchen,rot,flip}]).occupied,K.footprints(kitchen).reduce((n,p)=>n+G.area(p),0));
// Existing project chain stores furniture and room boundaries, never this derived selection/result.
const plan={id:'area-test',rooms:[room,b]},work={rooms:{},furniture:[{...f,name:'Washer',color:'#ffffff',price:0}]};
let payload={planId:plan.id,current:work,designs:[],catalog:[]};const expected=G.regionAreas(plan.rooms,work.furniture);
for(let i=0;i<3;i++){payload=P.unpack(P.pack(payload));assert.deepEqual(G.regionAreas(plan.rooms,payload.current.furniture),expected);}
console.log('region areas: union, clipping, holes, floor placement, rotation/mirror, kitchen and project round-trip passed');
