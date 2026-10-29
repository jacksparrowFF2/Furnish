'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs');
async function main(){
 const berlin=process.argv.includes('--berlin'),profile=berlin?'armchair-berlin':'armchair',type=berlin?'armchair_yeswood_berlin':'armchair_yeswood_y09hs';
 const project=path.resolve(__dirname,'../..'),run=path.join(project,'output/'+profile+'-validation'),root=path.join(run,'workspace');fs.mkdirSync(root,{recursive:true});
 for(const name of ['src','styles','assets','vendor','templates'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'),{recursive:true});fs.copyFileSync(path.join(project,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));
 const generated=cp.spawnSync(process.execPath,[path.join(project,'scripts/preview-armchair.cjs')],{env:{...process.env,FURNISH_VERIFY_ROOT:root,FURNISH_ARMCHAIR_PROFILE:berlin?'berlin':'original'},encoding:'utf8',windowsHide:true});assert.equal(generated.status,0,generated.stderr);
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;const config=V.configuration();let browser;const results=[];
 try{browser=await V.launch();for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});const base=mode==='file'?config.fileBase:server.baseURL;
  await page.goto(base+'index.html');await page.locator('#lib .item').first().waitFor();
  assert.equal(await page.locator('#lib .item').filter({hasText:berlin?'柏林单人沙发椅':'源氏木语 单人沙发椅'}).count(),1);
  await page.evaluate(({type,berlin})=>mutate(()=>{state.furniture=[{id:'chair-test',type,name:'单人沙发',w:berlin?710:725,d:berlin?850:900,h:berlin?845:905,cx:3500,cy:3300,rot:37,flip:true,color:berlin?'#bd915f':'#be9465'}];}),{type,berlin});
  const before=await page.evaluate(()=>JSON.stringify(state.furniture));await page.evaluate(()=>mutate(()=>{state.furniture[0]=FurnishDesign.resizeFurniture(state.furniture[0],{w:state.furniture[0].w*1.2,d:state.furniture[0].d*1.2,h:state.furniture[0].h*1.2});}));
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),before);await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>state.furniture[0].w),berlin?852:870);await config.waitForCache(page);await page.reload();assert.equal(await page.evaluate(()=>state.furniture.find(f=>f.id==='chair-test').h),berlin?1014:1086);
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1200);
  const bytes=await page.evaluate(async()=>Array.from(new Uint8Array((await View3D.blenderScene({includeHidden:true,expandInstances:true})).buffer))),buffer=Buffer.from(bytes);fs.writeFileSync(path.join(run,mode+'-production.glb'),buffer);
  const doc=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),nodes=doc.nodes.filter(n=>n.extras?.furnishId==='chair-test');assert.equal(nodes.length,28);assert(nodes.every(n=>n.extras.furnishPartKey?.startsWith(berlin?'explicit:armchair-berlin-v1:':'explicit:armchair-v1:')));
  await page.screenshot({path:path.join(run,mode+'-app.png')});
  await page.goto(base+'output/'+profile+'/preview.html');await page.waitForFunction(()=>window.previewReady);assert.equal(await page.evaluate(()=>chairPreview.model.userData.furnishAsset),berlin?'armchair-yeswood-berlin@1':'armchair-yeswood-y09hs@1');
  for(const view of ['front','angle','side','back']){await page.locator('#'+view).click();await page.screenshot({path:path.join(run,mode+'-'+view+'.png')});}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(run,mode+'-narrow.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({mode,undoRedo:true,refresh:true,offline:true,productionParts:nodes.length,narrow:true});await context.close();
 }fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS armchair HTTP and offline file browser: '+run);
 }finally{if(browser)await browser.close();await server.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
