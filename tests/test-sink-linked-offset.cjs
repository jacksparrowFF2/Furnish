const assert=require('node:assert/strict'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js'),R=require('../src/core/product-rules.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),clone=structuredClone;
const plan={id:'sink-offset',walls:[],wins:[],rooms:[{id:'room',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}]};
function scene({type='sink_arrow_750',shape='straight',rot=0,flip=false,run=0,mode='top'}={}){
 const host=K.configure({id:'top',type:'counter',name:'厨房',cx:4000,cy:4000,rot,flip,w:1200,d:600,color:'#ddd'},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:run===0?'sink':'door'},...(shape==='straight'?[]:[{run:1,width:1200,role:run===1?'sink':'door'}]),...(shape==='U'?[{run:2,width:1200,role:run===2?'sink':'door'}]:[])]});
 const sink={id:'sink',type,name:'水槽',cx:4000,cy:4000,w:750,d:450,h:240,rot:0,color:'#888',...R.initial({type}),...(type==='ksink'?{}:{sinkInstall:mode})};
 return K.normalize([host,K.attach(sink,host,run)]);
}
let count=0;
for(const shape of ['straight','L','U'])for(const run of shape==='straight'?[0]:shape==='L'?[0,1]:[0,1,2])for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const mode of ['top','flush','under']){
 const items=scene({shape,run,rot,flip,mode}),before=JSON.stringify(items),options={rotation:-rot},gap=S.directional(items[1],{furniture:items,...options}).r.distance;
 const moved=D.placeAtDirectionalGap(plan,{furniture:items},'sink','r',gap-10,options),next=[clone(items[0]),moved];
 assert.equal(JSON.stringify(items),before,'core edit is atomic');assert.equal(moved.counterLink.hostId,'top');near(S.directional(moved,{furniture:next,...options}).r.distance,gap-10);
 K.normalize(next,items);near(next[1].cx,moved.cx);near(next[1].cy,moved.cy);K.validateList(next);
 const ring=K.deviceOpenings(next[0],next)[0].ring,actual=K.openingRing(moved).map(p=>K.local(next[0],...K.world(moved,...p)));
 ring.forEach((p,i)=>p.forEach((v,a)=>near(v,actual[i][a])));
 const saved={planId:plan.id,current:{furniture:next},designs:[{name:'偏移水槽',work:{furniture:next}}],catalog:[]},round=P.unpack(P.pack(saved));assert.deepEqual(round,saved);P.validateWork(round.current);
 let restored=round.current.furniture;for(let n=0;n<3;n++){restored=D.restoreFurniture(restored,{makeId:()=> 'unused',colorFor:()=> '#ddd'});assert.deepEqual(restored,next,'repeated recovery must not drift');}
 const transformed=clone(next);Object.assign(transformed[0],{cx:4500,cy:4300,rot:(rot+90)%360,flip:!flip});transformed[0].kitchen.baseHeight=900;K.normalize(transformed,next);K.validateList(transformed);
 const m=K.layout(transformed[0])[run],o=moved.counterLink.offset,a=m.rot*Math.PI/180,point=K.world(transformed[0],m.x+o.x*Math.cos(a)-o.y*Math.sin(a),m.y+o.x*Math.sin(a)+o.y*Math.cos(a));near(transformed[1].cx,point[0]);near(transformed[1].cy,point[1]);assert.deepEqual(transformed[1].counterLink,moved.counterLink);
 count++;
}
for(const type of ['sink_arrow_680','sink_arrow_750','ksink'])for(const dir of ['l','r','t','b']){
 const items=scene({type}),current=S.directional(items[1],{furniture:items})[dir].distance;
 for(const gap of [0,.001,current-1,current,current+1]){
  const next=D.placeAtDirectionalGap(plan,{furniture:items},'sink',dir,gap);near(S.directional(next,{furniture:[items[0],next]})[dir].distance,gap);assert(next.counterLink);
 }
 const before=JSON.stringify(items);assert.throws(()=>D.placeAtDirectionalGap(plan,{furniture:items},'sink',dir,current*2+.001),/完整留在|超出台面/);assert.equal(JSON.stringify(items),before);
}
for(const rotation of [0,37,90,180,270])for(const dir of ['l','r','t','b']){const list=scene({rot:37,flip:true}),gap=S.directional(list[1],{furniture:list,rotation})[dir].distance,next=D.placeAtDirectionalGap(plan,{furniture:list},'sink',dir,gap-10,{rotation});near(S.directional(next,{furniture:[list[0],next],rotation})[dir].distance,gap-10);}
const overhang=scene();overhang[0]=K.configure(overhang[0],{...overhang[0].kitchen,counterDepth:630});const contact=D.placeAtDirectionalGap(plan,{furniture:overhang},'sink','b',0);near(contact.cy-overhang[1].cy,105);assert(K.onSurface(contact,overhang[0]));
const items=scene(),f=items[1],h=items[0],next=D.placeAtDirectionalGap(plan,{furniture:items},'sink','r',125),shifted=[clone(h),next];
let n=0;const copy=D.pasteFurniture({items:shifted,cx:4000,cy:4000},{x:6000,y:6000},{x:0,y:0,w:10000,h:10000},()=> 'copy'+ ++n).items;assert.equal(copy[1].counterLink.hostId,copy[0].id);assert.deepEqual(copy[1].counterLink.offset,next.counterLink.offset);
const solo=D.pasteFurniture({items:[next],cx:next.cx,cy:next.cy},{x:6000,y:6000},{x:0,y:0,w:10000,h:10000},()=> 'solo').items[0];assert.equal(solo.counterLink,undefined);
assert.notEqual(P.checkFingerprint({kind:'overlap'},plan,items,600),P.checkFingerprint({kind:'overlap'},plan,shifted,600),'spatial confirmation reads the offset');assert.notDeepEqual(K.deviceSignature(h,items),K.deviceSignature(h,shifted),'production cache reads offset holes');
const candidate={type:'chair',name:'椅子',w:500,d:500,color:'#ddd',price:0};assert.equal(D.replaceFurniture(next,candidate).counterLink,undefined);
assert.equal(K.attach(next,h,0).counterLink.offset,undefined,'relink centres the sink');
const legacy=scene();assert.equal(legacy[1].counterLink.offset,undefined);for(let i=0;i<3;i++)K.normalize(legacy);assert.deepEqual(legacy,items,'legacy stays centred without materialising offsets');
for(const offset of [null,[],{}, {x:0}, {x:NaN,y:0},{x:Infinity,y:0},{x:20000.001,y:0},{x:0,y:'0'},{x:0,y:0,z:1}])assert.throws(()=>P.validateWork({furniture:[h,{...f,counterLink:{...f.counterLink,offset}}]}),/偏移/);
assert.throws(()=>K.validateLink({...f,type:'stove',counterLink:{...f.counterLink,offset:{x:0,y:0}}}),/偏移/);
const outside={...next,counterLink:{...next.counterLink,offset:{x:226,y:0}}};assert.throws(()=>P.validateWork({furniture:[h,outside]}),/完整留在/);
assert.throws(()=>D.placeAtDirectionalGap(plan,{furniture:[{...h,locked:true},f]},'sink','r',125),/解锁/);
const dragged=clone(shifted);dragged[1].cx+=1;K.normalize(dragged,shifted);assert.equal(dragged[1].counterLink,undefined,'ordinary drag retains explicit detach behaviour');
const cut=clone(items);cut[0].kitchen.autoAvoid=true;cut[0].kitchen.obstacleFit={depths:[],cuts:[[[380,-300],[600,-300],[600,300],[380,300]]]};assert.throws(()=>K.moveLinkedSink(cut[1],cut[0],f.cx+100,f.cy),/超出台面/);
const resized=K.configure(h,{...h.kitchen,modules:[{run:0,width:900,role:'sink'}]});assert.throws(()=>K.fit(next,resized,0),/完整留在/);
console.log(`PASS linked sink offsets: ${count} transformed shape/run/install cases; four directions, contact/outside, production openings, legacy/no drift, current/named project, copies/replacements, locks, cut surfaces and ordinary drag`);
