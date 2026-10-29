/* SE2 or --bookcase: private workspace, HTTP + offline file, real WebGL and GLB. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const V=require('../lib/browser-verification.cjs');
async function main(){
 const bookcase=process.argv.includes('--bookcase'),profile=bookcase?'y52y09':'se2',preview=bookcase?'bookcase-y52y09':'bath-heater-se2';
 const project=path.resolve(__dirname,'../..'),runs=path.join(project,'output/playwright');fs.mkdirSync(runs,{recursive:true});const run=fs.mkdtempSync(path.join(runs,'blender-'+profile+'-')),root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','assets','vendor','templates'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'));fs.copyFileSync(path.join(project,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));
 const generated=cp.spawnSync(process.execPath,[path.join(project,'scripts/preview-'+preview+'.cjs')],{env:{...process.env,FURNISH_VERIFY_ROOT:root},encoding:'utf8',windowsHide:true});if(generated.status!==0)throw Error(generated.stderr);
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;const config=V.configuration();let browser;const results=[];
 try{
  browser=await V.launch();
  for(const mode of ['http','file']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});
   const base=mode==='file'?config.fileBase:server.baseURL;
   await page.goto(base+'index.html');await page.locator('#lib .item').first().waitFor();
   await page.evaluate(bookcase=>mutate(()=>{state.furniture=[{...(bookcase?{...FurnishCabinet.preset('book-y52y09-low'),type:'bookshelf_yeswood_y52y09'}:{type:'bath_heater_aopu_se2',name:'SE2 Blender 试点',w:300,d:600,h:112,mountHeight:2500,color:'#f5f5f3'}),id:'blender-pilot',cx:3500,cy:3300,rot:37,flip:true}];}),bookcase);
   const before=await page.evaluate(()=>JSON.stringify(state.furniture));
   await page.evaluate(bookcase=>mutate(()=>{if(bookcase)state.furniture[0]=FurnishDesign.resizeFurniture(state.furniture[0],{w:1500,d:300,h:900});else{const f=state.furniture[0];f.w=360;f.mountHeight=2400;}}),bookcase);await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),before);
   await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>state.furniture[0].w),bookcase?1500:360);await page.reload();assert.equal(await page.evaluate(bookcase=>{const f=state.furniture.find(f=>f.id==='blender-pilot');return bookcase?f.h:f.mountHeight;},bookcase),bookcase?900:2400);
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1200);
   const exported=await page.evaluate(async()=>{const out=await View3D.blenderScene({includeHidden:true,expandInstances:true});return Array.from(new Uint8Array(out.buffer));});const buffer=Buffer.from(exported);fs.writeFileSync(path.join(run,mode+'-scene.glb'),buffer);
   const doc=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),nodes=doc.nodes.filter(n=>n.extras?.furnishId==='blender-pilot');
   assert.equal(nodes.length,require('../../src/data/'+profile+'-blender-asset.js').parts.length,'Production export must contain the imported pilot parts');assert(nodes.every(n=>n.extras.furnishPartVersion===3));
   if(bookcase)assert(nodes.every(n=>n.extras.furnishPartKind==='BufferGeometry'),'Production export used a fallback instead of imported board buffers');
   await page.screenshot({path:path.join(run,mode+'-app.png')});
   await page.goto(base+'output/'+preview+'/preview.html');await page.waitForFunction(()=>window.previewReady);assert.equal(await page.evaluate(bookcase=>(bookcase?bookcasePreview:se2Preview).model.userData.furnishAsset,bookcase),bookcase?'bookcase-y52y09@1':'bath-heater-aopu-se2@1');
   if(bookcase)await page.locator('#front').click();await page.screenshot({path:path.join(run,mode+'-face.png')});await page.locator(bookcase?'#angle':'#side').click();await page.screenshot({path:path.join(run,mode+'-side.png')});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(run,mode+'-narrow.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({mode,passed:true,undoRedo:true,refresh:true,productionExportParts:nodes.length,offlineAsset:true,narrow:true});await context.close();
  }
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS pilot browser: '+run);
 }finally{if(browser)await browser.close();await server.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
