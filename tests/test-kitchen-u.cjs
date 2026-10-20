const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),W=require('../src/core/work-state.js');
const base={id:'u',name:'U 形厨房',type:'counter',cx:4500,cy:4500,rot:0,color:'#f3f1ec'};
const config={version:1,shape:'U',depth:600,counterDepth:630,baseHeight:820,thickness:20,modules:[{run:0,width:900,role:'hob'},{run:1,width:700,role:'door'},{run:2,width:900,role:'sink'},{run:0,width:600,role:'drawer'},{run:1,width:500,role:'door'}],endExtensions:[{run:0,length:500,depth:250,cabinetDepth:220,backPanel:false},{run:2,length:200,depth:200,cabinetDepth:180,backPanel:true}]};
const plan={id:'p',name:'测试',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[-10000,-10000],[20000,-10000],[20000,20000],[-10000,20000]]}],walls:[],doors:[],wins:[],slides:[],beams:[],defaults:[],ceilingHeight:2800};
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),pointNear=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const fixture=items=>({planId:'p',current:{furniture:items},designs:[{name:'U 形',work:{furniture:items}}],catalog:[]});
function obstacle(f,m,intrusion=350,height=2800){const normal=K.runNormal(m),[cx,cy]=K.world(f,m.x+normal[0]*(intrusion/2-(m.depth??600)/2),m.y+normal[1]*(intrusion/2-(m.depth??600)/2));return {id:'flue',type:'block',name:'烟道',cx,cy,w:m.width/2,d:intrusion,h:height,rot:(f.rot+(f.flip?-m.rot:m.rot)+360)%360,color:'#aaa'};}
for(const corner of ['left','right'])for(const rot of [0,37,90,270])for(const flip of [false,true]){
 const f=K.configure({...base,rot,flip},{...config,corner});assert.deepEqual([f.w,f.d],[2600,2400]);assert.equal(K.cornerBlocks(f).length,2);assert.equal(K.cornerBoards(f).length,10);assert.equal(K.cornerPlinth(f).length,4);
 near(K.area(f),K.slabs(f).reduce((sum,s)=>sum+s.w*s.d,0)/1e6);assert.equal(K.topGeometry(f).rings.length,1);
 const gap=K.world(f,corner==='right'?-300:300,0),chair={id:'chair',name:'椅',type:'chair',cx:gap[0],cy:gap[1],w:100,d:100,rot};
 assert(!G.obbOverlap(f,chair));assert(!G.volumeOverlap(f,chair));assert(!P.spaceCheck(plan,[f,chair],{scanPassages:false}).some(v=>v.kind==='overlap'));
 const sink=K.attach({id:'sink',name:'水槽',type:'ksink',cx:0,cy:0,rot:0,w:760,d:450,color:'#eee'},f,2),hob=K.attach({id:'hob',name:'灶具',type:'stove',cx:0,cy:0,rot:0,w:750,d:450,color:'#eee'},f,0),items=[f,sink,hob];K.normalize(items);K.validateList(items);
 const m=K.layout(f)[2];pointNear([sink.cx,sink.cy],K.world(f,m.x,m.y));assert.equal(sink.rot,(rot+(flip?-180:180)+360)%360);assert.equal(sink.counterElevation,840);
 const saved=P.unpack(P.pack(fixture(items)));assert.deepEqual(saved.current.furniture,items);assert.deepEqual(saved.designs[0].work.furniture,items);
 const rules=W.create({makeId:()=> 'new',colorFor:()=> '#fff',materials:{tile:{}}}),work={furniture:structuredClone(items)};rules.restore(work,plan);const stable=JSON.stringify(work);for(let i=0;i<3;i++)rules.restore(work,plan);assert.equal(JSON.stringify(work),stable);
 const positions=K.layout(f).map(m=>K.world(f,m.x,m.y)),extended=K.configure(f,{...f.kitchen,endExtensions:[{...f.kitchen.endExtensions[0],length:800},f.kitchen.endExtensions[1]]});K.layout(extended).forEach((m,i)=>pointNear(K.world(extended,m.x,m.y),positions[i]));
 const reverted=K.changeShape(f,'L',corner),converted=K.changeShape(reverted.furniture,'U',corner).furniture;K.layout(reverted.furniture).forEach((m,i)=>{const current=K.layout(converted)[i];pointNear(K.world(reverted.furniture,m.x,m.y),K.world(converted,current.x,current.y));});
 const resized=D.resizeFurniture(f,{w:2900,d:2700});near(resized.w,2900);near(resized.d,2700);assert.equal(resized.kitchen.endExtensions[0].length,500);assert.equal(resized.kitchen.endExtensions[1].depth,200);K.validate(resized);
 const rows=K.elevationRuns(f);assert.equal(rows.length,3);assert.deepEqual(rows.flatMap(r=>r.indices.filter(i=>i!==null)).sort(),[0,1,2,3,4]);assert.deepEqual(rows.map(r=>r.blind.length),[1,2,1]);assert.deepEqual(rows.map(r=>r.furniture.w),[2600,2400,1700]);for(const row of rows)K.validate(row.furniture);
 const end=K.endLayout(f).find(m=>m.run===2);assert(K.openingZones(f).some(z=>z.column===end.index));assert.deepEqual(K.specification(K.toggle(f,end.index)),K.specification(f));
 let n=0;const copy=D.pasteFurniture({items,cx:f.cx,cy:f.cy},{x:9000,y:9000},{x:0,y:0,w:15000,h:15000},()=> 'copy'+ ++n).items;assert.equal(copy[1].counterLink.hostId,copy[0].id);assert.equal(copy[2].counterLink.hostId,copy[0].id);assert.equal(D.replaceFurniture(f,{type:'chair',w:500,d:500,name:'椅',color:'#eee',price:0}).kitchen,undefined);
 // Check the new reverse-facing arm, connector and both narrowed ends.
 const automatic=K.configure(f,{...f.kitchen,autoAvoid:true,modules:f.kitchen.modules.map(m=>({...m,role:'door'}))});
 for(const slot of [...K.layout(automatic).filter(m=>[1,2].includes(m.run)),...K.endLayout(automatic)]){
  const intrusion=slot.depth?slot.depth-150:450,block=obstacle(automatic,slot,intrusion),fit=K.adaptObstacles(automatic,plan,[automatic,block]).furniture,actual=K.cabinetLayout(fit).find(m=>m.index===slot.index),normal=K.runNormal(slot);near(actual.depth,150);pointNear([actual.x+normal[0]*actual.depth/2,actual.y+normal[1]*actual.depth/2],[slot.x+normal[0]*(slot.depth??600)/2,slot.y+normal[1]*(slot.depth??600)/2]);assert(!G.volumeOverlap(fit,block));assert.deepEqual(K.adaptObstacles(fit,plan,[fit,block]).furniture,fit);
  assert(!K.adaptObstacles(fit,plan,[fit]).furniture.kitchen.obstacleFit);
 }
}
const f=K.configure(base,config),before=JSON.stringify(f);
const svg=require('../src/render/furniture-svg.js').render(f.type,f.w,f.d,f.color,{ink:'#222'},f);assert.equal((svg.match(/转角空腔/g)||[]).length,2);assert.equal((svg.match(/<path/g)||[]).length,1,'U surface is one continuous 2D outline');assert(!/NaN|undefined/.test(svg));
for(const mutate of [k=>k.modules.splice(2,1),k=>k.modules[0].run=3,k=>k.endExtensions[1].run=1,k=>k.shape='O',k=>k.endExtensions[0].cabinetDepth=49.99]){const k=structuredClone(config);mutate(k);assert.throws(()=>K.configure(f,k));assert.equal(JSON.stringify(f),before);}
const tight={...config,counterDepth:700,modules:[{run:0,width:600,role:'door'},{run:1,width:200,role:'door'},{run:2,width:600,role:'door'}]};assert.throws(()=>K.configure(base,tight),/相交|封闭/);assert.throws(()=>K.configure(base,{...tight,modules:tight.modules.map(m=>({...m,width:m.run===1?199.99:m.width}))}));assert.doesNotThrow(()=>K.configure(base,{...tight,modules:tight.modules.map(m=>({...m,width:m.run===1?200.01:m.width}))}));
const left=K.changeShape(f,'L'),u=K.changeShape(left.furniture,'U');assert.equal(left.remap.has(2),false);assert.equal(left.furniture.kitchen.endExtensions[1].run,1);assert.equal(u.furniture.kitchen.endExtensions[1].run,2);assert.equal(u.furniture.kitchen.endExtensions[0].length,500);assert.equal(K.changeShape(f,'straight').furniture.kitchen.modules.length,2);
const auto=K.configure(f,{...config,autoAvoid:true,modules:config.modules.map(m=>({...m,role:'door'}))}),third=K.layout(auto)[2];
const unknown={...obstacle(auto,third),type:'unknown',h:undefined};assert(K.adaptObstacles(auto,plan,[auto,unknown]).notes.some(n=>n.includes('未知')));
const below=K.adaptObstacles(auto,plan,[auto,obstacle(auto,third,450.01)]);assert(below.notes.some(n=>n.includes('不足')));assert(!below.furniture.kitchen.obstacleFit.depths.length);
const high={...obstacle(auto,third),type:'kitchenwall',mountHeight:1000,h:700};assert(!K.adaptObstacles(auto,plan,[auto,high]).furniture.kitchen.obstacleFit);
const touching=obstacle(auto,third,100);touching.cy+=100;assert(!K.adaptObstacles(auto,plan,[auto,touching]).furniture.kitchen.obstacleFit);
const issue={kind:'wall',id:f.id},key=P.checkFingerprint(issue,plan,[f],800),priced=structuredClone(f);priced.price=100;priced.color='#abcabc';priced.purchaseStatus='ordered';assert.equal(P.checkFingerprint(issue,plan,[priced],800),key);const changed=K.configure(f,{...f.kitchen,modules:f.kitchen.modules.map((m,i)=>({...m,width:m.width+(i===2?1:0)}))});assert.notEqual(P.checkFingerprint(issue,plan,[changed],800),key);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const corner of ['left','right'])for(const style of Object.keys(K.edgeStyles)){
  const host=K.configure(base,{...config,corner,edgeStyle:style,modules:config.modules.map(m=>({...m,role:'door'}))}),g=ctx.FurnishKitchenModel.build(T,host,box);g.updateMatrixWorld(true);
  const all=[];g.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));if(o.userData.kitchenCornerBoard)all.push(o);});assert.equal(all.length,10);
  const bounds=new T.Box3().setFromObject(g);near(bounds.getSize(new T.Vector3()).x,host.w/1000);near(bounds.getSize(new T.Vector3()).z,host.d/1000);near(bounds.max.y,.84);
  const slabHits=(x,y,group=g)=>new T.Raycaster(new T.Vector3(x/1000,2,y/1000),new T.Vector3(0,-1,0)).intersectObject(group,true).filter(h=>h.object.userData.kitchenSlab);
  const gap=corner==='right'?-300:300;assert.equal(slabHits(gap,0).length,0,'U inner void is a real empty mesh region');
  for(const m of K.layout(host))assert(slabHits(m.x,m.y).length,'all three arms have stone');for(const m of K.endLayout(host)){assert(slabHits(m.x,m.y).length);assert.equal(slabHits(m.x,m.y+K.runNormal(m)[1]*(m.depth/2+80)).length,0,'narrow end preserves flue clearance');}
  for(const [i,b] of K.cornerBlocks(host).entries()){
   assert(slabHits(b.x,b.y).length,'both corner tops continuous');for(const direction of [new T.Vector3(corner==='right'?-1:1,0,0),new T.Vector3(0,0,i===0?1:-1)])assert(!new T.Raycaster(new T.Vector3(b.x/1000,.4,b.y/1000),direction).intersectObject(g,true).some(h=>h.distance<.35),'both hollow corners open into adjoining modules');
  }
  const single=K.configure(host,{...host.kitchen,modules:host.kitchen.modules.filter((m,i)=>m.run!==1||i===1).map(m=>({...m,width:m.run===1?600:m.width}))}),connector=K.layout(single).find(m=>m.run===1);assert.deepEqual(K.adjacentSides(single,connector).sort(),['left','right']);const singleModel=ctx.FurnishKitchenModel.build(T,single,box);singleModel.updateMatrixWorld(true);for(const z of [-1,1])assert(!new T.Raycaster(new T.Vector3(connector.x/1000,.4,connector.y/1000),new T.Vector3(0,0,z)).intersectObject(singleModel,true).some(h=>h.distance<.35),'single connector production side panels open at both ends');
  // Production cutout on reverse-facing run 2 is wide along X, never swapped.
  const applianceHost=K.configure(host,{...host.kitchen,modules:host.kitchen.modules.map((m,i)=>({...m,role:i===2?'sink':m.role}))}),sink=K.attach({id:'sink',type:'ksink',w:760,d:450,cx:0,cy:0,rot:0},applianceHost,2),cut=ctx.FurnishKitchenModel.build(T,applianceHost,box,{furniture:[sink]});cut.updateMatrixWorld(true);const slot=K.layout(applianceHost)[2];assert.equal(slabHits(slot.x+300,slot.y,cut).length,0);assert(slabHits(slot.x,slot.y+250,cut).length);
  for(const row of K.elevationRuns(host)){const preview=ctx.FurnishKitchenModel.build(T,row.furniture,box,{previewBlind:row.blind,previewMirror:row.mirror});assert.equal(preview.children.filter(o=>o.userData.kitchenPreviewBlind).length,row.blind.length);}
 }
 console.log('PASS U three-run geometry, real continuous stone and void, two hollow corners, narrow ends, reverse arm holes, transforms, opening, obstacle thresholds, shape conversion, copy and project/work restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
