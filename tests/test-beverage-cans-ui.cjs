'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),A=require('../scripts/lib/test-artifacts.cjs'),V=require('../scripts/lib/browser-verification.cjs'),{desktopExecutable}=require('../scripts/launch-desktop.cjs');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function capture(p,file){
 // Exporting 168 static parts as a base64 string avoids expanding every GLB
 // byte into a JSON array in the browser automation transport.
 const result=await p.evaluate(async()=>{for(let attempt=0;attempt<40;attempt++){try{const bytes=new Uint8Array((await View3D.blenderScene({includeHidden:false,expandInstances:true})).buffer);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return {data:btoa(text),ids:state.furniture.map(f=>f.id)};}catch(e){if(!/视角稳定|camera to settle/.test(e.message)||attempt===39)throw e;await new Promise(r=>setTimeout(r,50));}}});
 const data=Buffer.from(result.data,'base64');fs.writeFileSync(file,data);return require('../scripts/lib/glb-model-evidence.cjs').inspect(data,result.ids);
}
async function edit(p,key,value){const el=p.locator('[data-inventory-array="'+key+'"]');if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(String(value));else{await el.fill(String(value));await el.dispatchEvent('change');}}
async function verify(p,run,mode){
 await p.waitForFunction(()=>typeof FurnishMcp!=='undefined'&&typeof repositoryBooting!=='undefined'&&!repositoryBooting);await p.locator('#repository-loading').waitFor({state:'hidden'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const volume of [330,500]){
  const id='can-'+volume;await p.evaluate(({volume,id})=>{setPlan(PLANS[0].id);const item=FurnishCatalogData.library.flatMap(c=>c.items).find(it=>it[0]==='beverage_can_'+volume+'ml');if(!item)throw Error('missing catalog can');const f=createCatalogFurniture(item,8500,4000)[0];mutate(()=>{state.furniture=[{...f,id}];});selectIds([id]);}, {volume,id});
  const bottom=p.locator('#fBottomElevation:visible,#fMountHeight:visible').first();await bottom.fill('900');await bottom.press('Tab');assert.equal(await p.evaluate(()=>FurnishProducts.bottomHeight(state.furniture[0])),900);
  assert.equal(await p.locator('[data-inventory-array="count"]').inputValue(),'1');await edit(p,'count',24);assert.equal(await p.evaluate(()=>state.furniture.length),24);await p.evaluate(()=>undo());assert.equal(await p.evaluate(()=>state.furniture.length),1);await p.evaluate(()=>redo());assert.equal(await p.evaluate(()=>state.furniture.length),24);
  await edit(p,'columns',4);await edit(p,'rows',3);await edit(p,'gapX',2);await edit(p,'gapZ',3);await edit(p,'gapY',5);await edit(p,'pattern','stagger');await edit(p,'angle',90);
  const beforeBad=await p.evaluate(()=>JSON.stringify(state.furniture));await edit(p,'gapX',-1);assert.equal(await p.evaluate(()=>JSON.stringify(state.furniture)),beforeBad);
  assert.equal(await p.evaluate(()=>Math.min(...state.furniture.map(f=>FurnishProducts.bottomHeight(f)))),900);
  if(!await p.evaluate(()=>is3D())){await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);}
  const evidence=await capture(p,path.join(run.dir,mode+'-'+volume+'-array.glb'));assert.equal(evidence.parts.length,24*7);assert.equal(new Set(evidence.parts.map(x=>x.id)).size,24);const height=volume===330?115.2:168;assert(Math.abs((evidence.bounds[1][1]-evidence.bounds[0][1])*1000-(height*2+5))<.04);
  const saved=await p.evaluate(()=>structuredClone(state.furniture));if(mode==='desktop')await p.evaluate(()=>repositoryClient.flush());else await V.configuration().waitForCache(p);await p.reload();await p.locator('#repository-loading').waitFor({state:'hidden'});assert.deepEqual(await p.evaluate(()=>structuredClone(state.furniture)),saved);
  await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:420,height:900});await p.evaluate(()=>openSelectionProperties());await p.locator('[data-inventory-array="count"]').scrollIntoViewIfNeeded();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(run.dir,mode+'-'+volume+'-narrow.png')});await p.setViewportSize({width:1200,height:950});
  if(!await p.evaluate(()=>is3D())){await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);}
  await p.evaluate(async()=>{select(null);await View3D.automationCamera({mode:'walk',position:{x:9000,y:4650,z:1300},target:{x:8570,y:4100,z:1040},horizontalFov:40});});const image=await p.evaluate(()=>View3D.image());fs.writeFileSync(path.join(run.dir,mode+'-'+volume+'-array.png'),Buffer.from(image.split(',')[1],'base64'));
  await p.evaluate(id=>selectIds([id]),id);await p.locator('[data-inventory-detach]').click();assert(await p.evaluate(()=>state.furniture.length===24&&state.furniture.every(f=>!f.inventoryArray)));await p.evaluate(()=>undo());
 }
 assert.deepEqual(errors,[]);return {mode,passed:true,checks:['catalog creation','single-to-24 array UI','atomic undo/redo','columns/rows/gaps/stagger/yaw','negative-gap rejection','elevation','168 production parts / 24 unique units','actual two-layer height','save/reload','420px layout','detach']};
}
(async()=>{const source=path.join(root,'projects/workspace.furnish.json'),before=hash(source),run=A.createRun({prefix:'beverage-cans-ui-'}),work=run.workspace('workspace',root,{directories:['src','styles','vendor','scripts'],files:['index.html','manifest.webmanifest']}),report={passed:false,modes:[]};let app,browser,server;
 try{
  const ps=http.createServer();await new Promise(r=>ps.listen(0,'127.0.0.1',r));const port=ps.address().port;await new Promise(r=>ps.close(r));const env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:run.discard('profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
  report.executable=desktopExecutable(root);app=await require('playwright')._electron.launch({executablePath:report.executable,env,timeout:60000});let p=await app.firstWindow();p.setDefaultTimeout(25000);report.modes.push(await verify(p,run,'desktop'));await app.evaluate(({app})=>app.exit(0));await app.close().catch(()=>{});app=null;
  server=await V.staticServer(work);process.env.FURNISH_VERIFY_ROOT=work;process.env.FURNISH_VERIFY_URL=server.baseURL;browser=await V.launch();for(const mode of ['http','file']){const context=await browser.newContext({viewport:{width:1200,height:950},offline:mode==='file'}),p=await context.newPage();p.setDefaultTimeout(25000);await p.goto(mode==='file'?pathToFileURL(path.join(work,'index.html')).href:server.baseURL+'index.html');report.modes.push(await verify(p,run,mode));await context.close();}
  assert.equal(hash(source),before);report.sourceUnchanged=true;report.passed=true;
 }catch(e){report.error=e.stack;throw e;}finally{if(app){await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}if(browser)await browser.close();if(server)await server.close();fs.writeFileSync(path.join(run.dir,'report.json'),JSON.stringify(report,null,2));run.finish(report.passed);console.log('Report '+run.dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
