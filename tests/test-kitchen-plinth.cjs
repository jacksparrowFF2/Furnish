const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),W=require('../src/core/work-state.js'),Motion=require('../src/core/cabinet-motion.js');
const base={id:'k',type:'counter',name:'厨房',cx:5000,cy:5000,rot:0,color:'#eeeeee'},cfg={version:1,shape:'U',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:800,role:'drawer'},{run:0,width:600,role:'door'},{run:1,width:800,role:'sink'},{run:2,width:700,role:'door'}],endExtensions:[{run:0,length:300,depth:200,cabinetDepth:180}]};
const plan={id:'p',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[0,0],[15000,0],[15000,15000],[0,15000]]}],walls:[],doors:[],wins:[],slides:[],beams:[],defaults:[],ceilingHeight:2800},near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
const old=K.configure(base,cfg),original=JSON.stringify(old),four=K.setDrawerCount(old,0,4);
assert.equal(K.plinth(old),100);assert.equal(old.kitchen.plinth,undefined);
assert.deepEqual(K.configure(old,old.kitchen),old,'unchanged legacy design does not materialize defaults');
for(const p of [0,50,100,150,250]){
 const next=K.configure(four,{...four.kitchen,plinth:p});
 for(const key of ['w','d','cx','cy'])assert.equal(next[key],old[key]);assert.equal(next.kitchen.baseHeight+next.kitchen.thickness,850);
 near(K.drawerSpan(next),830-p);K.drawerHeights(next,next.kitchen.modules[0]).forEach(v=>near(v,(830-p)/4));
 for(const m of K.cabinetLayout(next).filter(m=>m.role!=='empty')){const part=K.moduleFurniture(next,m);C.validate(part);assert.equal(part.cabinet.plinth,p);const boards=Motion.boards(part,{includeStatic:true}),bottom=boards.find(b=>b.metadata.cabinetSection==='bottom');near(bottom.bottom,p);near(bottom.top,p+18);const plinth=boards.find(b=>b.metadata.cabinetSection==='plinth');if(p){near(plinth.bottom,0);near(plinth.top,p);}else assert.equal(plinth,undefined);}
 assert(K.cornerBoards(next).filter(b=>b.bottom===p).length>=2);assert(K.cornerPlinth(next).every(b=>b.top===p));assert.equal(K.cornerPlinth(next).length,p?4:0);
 const solids=Motion.solidParts({...next,rot:37,flip:true}),bases=solids.filter(b=>b.boardName==='踢脚底座');assert.equal(bases.length,p?5:0);
 for(const b of bases){near(b.vertical.top,p);assert.deepEqual(Motion.section(b,{bottom:p,top:p+1}),[],'contact at base top has no solid overlap');assert(Motion.section(b,{bottom:p-.01,top:p}).length>2);assert.deepEqual(Motion.section(b,null),b.p,'unknown height keeps the board');}
 const door=K.moduleFurniture(next,K.cabinetLayout(next)[1]),zones=C.openingZones(door,{passage:0});assert(zones.length);near(Math.min(...zones.flatMap(z=>z.ranges.map(r=>r[0]))),p+1);
 const packed=P.unpack(P.pack({planId:'p',current:{furniture:[next]},designs:[{name:'底座',work:{furniture:[next]}}],catalog:[]}));assert.deepEqual(packed.current.furniture,[next]);assert.deepEqual(packed.designs[0].work.furniture,[next]);
 const work={furniture:[next]},rules=W.create({makeId:()=> 'x',colorFor:()=> '#eee',materials:{tile:{}}});for(let i=0;i<3;i++)rules.restore(work,plan);assert.deepEqual(work.furniture,[next]);
 assert.equal(D.pasteFurniture({items:[next],cx:5000,cy:5000},{x:7000,y:7000},{x:0,y:0,w:15000,h:15000},()=> 'copy').items[0].kitchen.plinth,p);
 assert.equal(D.replaceFurniture(next,{type:'chair',w:500,d:500,name:'椅',price:0,color:'#eeeeee'}).kitchen,undefined);
 assert.equal(K.specification(next).plinth,p);for(const row of K.elevationRuns(next))assert.equal(K.plinth(row.furniture),p);
 const fingerprint=v=>P.checkFingerprint({kind:'cabinetdoor',id:'k'},plan,[v],800);assert.notEqual(fingerprint(next),fingerprint(old));assert.equal(fingerprint({...next,color:'#123456',price:8}),fingerprint(next));
}
for(const p of [-.01,250.01,null,'100',NaN,Infinity])assert.throws(()=>K.validate({...old,kitchen:{...old.kitchen,plinth:p}}),/底座/);
assert.throws(()=>K.configure({...old,locked:true},{...old.kitchen,plinth:50}),/解锁/);
const wall=K.configure({...base,type:'kitchenwall',h:700,mountHeight:1480},{version:1,shape:'straight',depth:350,baseHeight:700,thickness:0,modules:[{run:0,width:600,role:'door'}]});assert.equal(K.plinth(wall),0);assert.throws(()=>K.validate({...wall,kitchen:{...wall.kitchen,plinth:100}}),/吊柜/);
assert.equal(JSON.stringify(old),original);
const historicalWall={...wall,kitchen:{...wall.kitchen,plinth:0}};K.validate(historicalWall);assert.equal(K.plinth(historicalWall),0);
const restoredWall=P.unpack(P.pack({planId:'p',current:{furniture:[historicalWall]},designs:[{name:'旧吊柜',work:{furniture:[historicalWall]}}],catalog:[]}));assert.deepEqual(restoredWall.current.furniture,[historicalWall]);assert.deepEqual(restoredWall.designs[0].work.furniture,[historicalWall]);
const basket=K.setDrawerStyle(old,0,'dish-basket'),raised=K.configure(basket,{...basket.kitchen,plinth:150});assert(K.drawerHeights(raised,raised.kitchen.modules[0]).every((v,i)=>v>=[300,220,100][i]));assert.throws(()=>K.configure(basket,{...basket.kitchen,plinth:250}),/碗碟篮/);
const invalid=P.unpack(P.pack({planId:'p',current:{furniture:[old]},designs:[],catalog:[]}));invalid.current.furniture[0].kitchen.plinth=-1;assert.throws(()=>P.unpack(P.pack(invalid)),/底座/);
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(map.three),ctx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishCabinet:C}));
 for(const name of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{assert(w>0&&h>0&&d>0);const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const shape of ['straight','L','U'])for(const p of [0,50,100,250])for(const corner of ['left','right'])for(const flip of [false,true]){
  const f=K.configure({...base,flip,rot:37},{...cfg,shape,corner,plinth:p,modules:cfg.modules.filter(m=>shape==='U'||m.run<(shape==='L'?2:1))}),g=ctx.FurnishKitchenModel.build(T,f,box);g.updateMatrixWorld(true);let bottoms=0,corners=0;
  g.traverse(o=>{if(o.userData.cabinetSection==='bottom'){near(new T.Box3().setFromObject(o).min.y*1000,p);bottoms++;}if(o.userData.kitchenCornerPlinth){near(new T.Box3().setFromObject(o).max.y*1000,p);corners++;}});assert(bottoms>=2);assert.equal(corners,shape==='straight'||p===0?0:shape==='U'?4:2);
  for(const row of K.elevationRuns(f))ctx.FurnishKitchenModel.build(T,row.furniture,box,{previewBlind:row.blind,previewMirror:row.mirror});
 }
 console.log('PASS configurable kitchen plinth: defaults/limits, production boards/corners/drawers/opening, shapes/mirrors/elevations, copy/replacement, current/named project roundtrip and repeated restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
