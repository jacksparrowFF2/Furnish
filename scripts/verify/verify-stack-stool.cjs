'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs');
async function main(){
 const project=path.resolve(__dirname,'../..'),run=path.join(project,'output/stack-stool-validation'),root=path.join(run,'workspace');fs.mkdirSync(root,{recursive:true});
 for(const name of ['src','styles','assets','vendor','templates'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'),{recursive:true});fs.copyFileSync(path.join(project,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));
 const gen=cp.spawnSync(process.execPath,[path.join(project,'scripts/preview-stack-stool.cjs')],{env:{...process.env,FURNISH_VERIFY_ROOT:root},encoding:'utf8',windowsHide:true});assert.equal(gen.status,0,gen.stderr);
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;const config=V.configuration();let browser;const results=[];
 try{browser=await V.launch();for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});const base=mode==='file'?config.fileBase:server.baseURL;
  await page.goto(base+'index.html');await page.locator('#lib .item').first().waitFor();
  assert.equal(await page.locator('#lib .item').filter({hasText:'软包叠放方凳'}).count(),1);
  await page.evaluate(()=>{mutate(()=>{state.furniture=[{id:'stool-test',type:'stool_citylong_370',name:'软包方凳',w:370,d:370,h:467,cx:3500,cy:3300,rot:37,flip:true,color:'#eee9dc',...FurnishProducts.initial({type:'stool_citylong_370'})}];});ui.sel={kind:'furn',id:'stool-test'};ui.panelScope='object';renderPanel();});
  await page.locator('#stool-count').fill('4');await page.locator('#stool-count').press('Tab');assert.equal(await page.evaluate(()=>FurnishProducts.stoolStack(state.furniture[0]).height),677);
  await page.locator('#stool-pitch').fill('80');await page.locator('#stool-pitch').press('Tab');assert.equal(await page.evaluate(()=>FurnishProducts.stoolStack(state.furniture[0]).height),707);
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>state.furniture[0].stoolPitch),70);await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>state.furniture[0].stoolPitch),80);
  await page.locator('#stool-count').fill('2.5');await page.locator('#stool-count').press('Tab');assert.equal(await page.evaluate(()=>state.furniture[0].stoolCount),4);
  await page.locator('#stool-bottom').fill('98');await page.locator('#stool-bottom').press('Tab');assert.equal(await page.evaluate(()=>FurnishProducts.vertical(state.furniture[0]).bottom),98);
  // Lock guard rejects programmatic events as well as normal disabled controls.
  await page.evaluate(()=>{mutate(()=>state.furniture[0].locked=true);renderPanel();});assert(await page.locator('#stool-count').isDisabled());
  await page.evaluate(()=>{mutate(()=>state.furniture[0].locked=false);renderPanel();});
  await config.waitForCache(page);await page.reload();assert.equal(await page.evaluate(()=>state.furniture.find(f=>f.id==='stool-test').stoolCount),4);assert.equal(await page.evaluate(()=>state.furniture.find(f=>f.id==='stool-test').stoolPitch),80);assert.equal(await page.evaluate(()=>state.furniture.find(f=>f.id==='stool-test').mountHeight),98);
  await page.evaluate(()=>{ui.sel={kind:'furn',id:'stool-test'};ui.panelScope='object';renderPanel();});await page.screenshot({path:path.join(run,mode+'-properties.png')});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>drawer('panel',true));await page.waitForTimeout(350);await page.locator('#stool-count').scrollIntoViewIfNeeded();const narrowField=await page.locator('#stool-count').boundingBox();assert(narrowField.x>=0&&narrowField.x+narrowField.width<=390);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(run,mode+'-app-narrow.png')});await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(600);
  const bytes=await page.evaluate(async()=>Array.from(new Uint8Array((await View3D.blenderScene({includeHidden:true,expandInstances:true})).buffer))),buffer=Buffer.from(bytes);fs.writeFileSync(path.join(run,mode+'-production.glb'),buffer);
  const doc=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),nodes=doc.nodes.filter(n=>n.extras?.furnishId==='stool-test');assert.equal(nodes.length,20);assert.equal(new Set(nodes.map(n=>n.extras.furnishPartKey)).size,20);
  await page.goto(base+'output/stack-stool/preview.html');await page.waitForFunction(()=>window.previewReady);assert.equal(await page.evaluate(()=>stoolPreview.model.userData.furnishAsset),'stool-citylong-370@1');
  for(const view of ['angle','front']){await page.locator('#'+view).click();await page.screenshot({path:path.join(run,mode+'-four-'+view+'.png')});}
  await page.locator('#single').click();await page.locator('#angle').click();await page.screenshot({path:path.join(run,mode+'-single.png')});
  await page.locator('#four').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(run,mode+'-narrow.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({mode,fieldEdits:true,invalidInput:true,locked:true,undoRedo:true,refresh:true,offline:true,productionParts:nodes.length,narrow:true});await context.close();
 }fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS stool HTTP and offline file browser: '+run);
 }finally{if(browser)await browser.close();await server.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
