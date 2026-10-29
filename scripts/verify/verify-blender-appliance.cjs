/* Only the SE2 pilot: private workspace, HTTP + offline file, real WebGL and GLB. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const V=require('../lib/browser-verification.cjs');
async function main(){
 const project=path.resolve(__dirname,'../..'),runs=path.join(project,'output/playwright');fs.mkdirSync(runs,{recursive:true});const run=fs.mkdtempSync(path.join(runs,'blender-appliance-')),root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','assets','vendor','templates'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'));fs.copyFileSync(path.join(project,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));
 const generated=cp.spawnSync(process.execPath,[path.join(project,'scripts/preview-bath-heater-se2.cjs')],{env:{...process.env,FURNISH_VERIFY_ROOT:root},encoding:'utf8',windowsHide:true});if(generated.status!==0)throw Error(generated.stderr);
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;const config=V.configuration();let browser;const results=[];
 try{
  browser=await V.launch();
  for(const mode of ['http','file']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});
   const base=mode==='file'?config.fileBase:server.baseURL;
   await page.goto(base+'index.html');await page.locator('#lib .item').first().waitFor();
   await page.evaluate(()=>mutate(()=>{state.furniture=[{id:'blender-pilot',type:'bath_heater_aopu_se2',name:'SE2 Blender 试点',cx:3500,cy:3300,w:300,d:600,h:112,mountHeight:2500,rot:37,flip:true,color:'#f5f5f3'}];}));
   const before=await page.evaluate(()=>JSON.stringify(state.furniture));
   await page.evaluate(()=>mutate(()=>{const f=state.furniture[0];f.w=360;f.mountHeight=2400;}));await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),before);
   await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>state.furniture[0].w),360);await page.reload();assert.equal(await page.evaluate(()=>state.furniture.find(f=>f.id==='blender-pilot').mountHeight),2400);
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1200);
   const exported=await page.evaluate(async()=>{const out=await View3D.blenderScene({includeHidden:true,expandInstances:true});return Array.from(new Uint8Array(out.buffer));});const buffer=Buffer.from(exported);fs.writeFileSync(path.join(run,mode+'-scene.glb'),buffer);
   const doc=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),nodes=doc.nodes.filter(n=>n.extras?.furnishId==='blender-pilot');
   assert.equal(nodes.length,require('../../src/data/se2-blender-asset.js').parts.length,'Production export must contain the imported pilot parts');assert(nodes.every(n=>n.extras.furnishPartVersion===3));
   await page.screenshot({path:path.join(run,mode+'-app.png')});
   await page.goto(base+'output/bath-heater-se2/preview.html');await page.waitForFunction(()=>window.previewReady);assert.equal(await page.evaluate(()=>se2Preview.model.userData.furnishAsset),'bath-heater-aopu-se2@1');
   await page.screenshot({path:path.join(run,mode+'-face.png')});await page.locator('#side').click();await page.screenshot({path:path.join(run,mode+'-side.png')});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(run,mode+'-narrow.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({mode,passed:true,undoRedo:true,refresh:true,productionExportParts:nodes.length,offlineAsset:true,narrow:true});await context.close();
  }
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS pilot browser: '+run);
 }finally{if(browser)await browser.close();await server.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
