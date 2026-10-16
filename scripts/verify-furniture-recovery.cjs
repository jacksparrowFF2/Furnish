if(!process.env.FURNISH_VERIFY_ROOT){require('./verify-browser.cjs').main(['furniture-recovery']).catch(e=>{console.error(e);process.exitCode=1;});}else{
// Isolated browser profiles only; never modifies the user's browser or project files.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const verification=require('./lib/browser-verification.cjs').configuration();
const K=require('../src/core/kitchen-core.js'),W=require('../src/core/work-state.js'),catalog=require('../src/data/catalog.js'),plans=require('../src/data/plans.js');
(async()=>{
 const root=verification.root,out=path.join(root,'output/playwright/furniture-recovery');fs.mkdirSync(out,{recursive:true});
 const plan=plans[0],work=W.create({makeId:()=> 'unused',colorFor:()=> '#ddd',materials:catalog.materials}).fresh(plan);
 const kitchen={id:'broken-kitchen',type:'counter',name:'异常厨房',cx:6000,cy:6500,w:2200,d:650,rot:37,flip:true,color:'#ddd',price:321,brand:'保留品牌',purchaseStatus:'ordered',kitchen:K.defaults({w:1800,d:600})};kitchen.kitchen.modules[0].role='sink';
 const device={id:'linked-sink',type:'ksink',name:'关联水槽',cx:5300,cy:6200,w:500,d:400,rot:37,flip:true,color:'#ddd',counterLink:{hostId:kitchen.id,module:0},counterElevation:860};
 const cabinet={id:'broken-cabinet',type:'cabinet',name:'异常柜体',cx:3500,cy:6500,w:1200,d:450,rot:0,color:'#ddd',cabinet:{version:1,columns:null}};
 const bed={id:'normal-bed',type:'bed',name:'正常家具',cx:4000,cy:3500,w:1800,d:2000,rot:0,color:'#ddd'};
 work.furniture=[kitchen,device,cabinet,bed];const initial=structuredClone(work.furniture);
 const seed={v:2,planId:plan.id,work:{[plan.id]:work},designs:[{id:'named',planId:plan.id,name:'原始命名方案',work:structuredClone(work)}],custom:[],customPlans:[]};
 fs.writeFileSync(path.join(out,'original-work.json'),JSON.stringify(seed,null,2));
 const browser=await require('./lib/browser-verification.cjs').launch();
 try{for(const [mode,url]of [['http',(verification.baseURL+'index.html')],['file',(verification.fileBase+'index.html')]]){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(seed=>{if(!localStorage.getItem('huxing-design-v2'))localStorage.setItem('huxing-design-v2',JSON.stringify(seed));localStorage.setItem('huxing-panes','{"lib":true,"panel":true}');},seed);
  await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url);await p.locator('#lib .item').first().waitFor();
  const snapshot=()=>p.evaluate(()=>structuredClone(state.furniture));
  assert.deepEqual(await snapshot(),initial,mode+' startup retains all records');assert(await p.locator('#gWalls .wall').count()>0);assert(await p.locator('#gLabels text').count()>0);assert.equal(await p.locator('#gFurn [data-model-error]').count(),2);assert(await p.locator('#modelErrors').isVisible());
  await p.screenshot({path:path.join(out,mode+'-complete.png')});
  await p.evaluate(()=>selectIds(['linked-sink']));assert(await p.locator('#kitchen-link').count()>0,'healthy appliance properties survive broken host');
  await p.evaluate(()=>{ui.sel=null;ui.tab='quote';renderPanel();});assert.match(await p.locator('#panel').innerText(),/异常柜体/);await p.evaluate(()=>{ui.tab='overview';renderPanel();});assert.deepEqual(await snapshot(),initial);
  await p.locator('#modelErrors').click();assert(await p.locator('#repair-kitchen-envelope').isVisible());
  await p.screenshot({path:path.join(out,mode+'-repair.png'),animations:'disabled'});
  const backupEvent=p.waitForEvent('download');await p.locator('#broken-furniture-backup').click();const raw=await backupEvent;await raw.saveAs(path.join(out,mode+'-raw-backup.json'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,mode+'-raw-backup.json'),'utf8')).furniture,initial);
  await p.locator('#repair-kitchen-envelope').click();assert.equal(await p.locator('#gFurn [data-model-error]').count(),1);const repaired=await snapshot();K.validate(repaired[0]);assert.deepEqual([repaired[0].w,repaired[0].d],[2200,650]);assert.equal(repaired[0].brand,'保留品牌');
  await p.locator('#undo').click();assert.deepEqual(await snapshot(),initial);assert.equal(await p.locator('#gFurn [data-model-error]').count(),2);
  await p.locator('#redo').click();assert.deepEqual(await snapshot(),repaired);await p.reload();assert.deepEqual(await snapshot(),repaired);assert(await p.locator('#gWalls .wall').count()>0);
  assert.deepEqual(await p.evaluate(()=>store.designs[0].work.furniture),initial,'named scheme remains untouched');
  await p.evaluate(()=>selectIds(['broken-cabinet']));assert.match(await p.locator('#panel').innerText(),/原方案记录已保留/);
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);assert(await p.locator('#view3d canvas').isVisible());assert(await p.locator('#modelErrors').isVisible());await p.screenshot({path:path.join(out,mode+'-3d.png')});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  // Unexpected renderer failure is also isolated from siblings and other layers.
  await p.evaluate(()=>{const original=FurnishFurnitureSVG.render;FurnishFurnitureSVG.render=(...args)=>{if(args[5]?.id==='normal-bed')throw Error('injected renderer failure');return original(...args);};renderAll();});
  assert.equal(await p.locator('#gFurn [data-model-error]').count(),2);assert(await p.locator('#gWalls .wall').count()>0);assert(await p.locator('#lib .item').count()>0);assert.deepEqual(await snapshot(),repaired);
  await p.evaluate(()=>selectIds(['normal-bed']));assert.match(await p.locator('#panel').innerText(),/injected renderer failure/);
  await p.setViewportSize({width:390,height:844});await p.locator('#fab [data-act=prop]').click();await p.waitForFunction(()=>{const r=document.querySelector('#panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});await p.screenshot({path:path.join(out,mode+'-narrow.png'),animations:'disabled'});
  assert.deepEqual(errors,[],mode+' no uncaught page errors');await context.close();console.log('PASS '+mode+' startup, raw backup, repair, undo/redo, reload, named data, 3D, injected model failure, narrow screen');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

}
