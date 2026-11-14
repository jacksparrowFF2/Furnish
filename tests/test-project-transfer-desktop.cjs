'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {_electron}=require('playwright'),root=path.resolve(__dirname,'..'),A=require('../scripts/lib/test-artifacts.cjs');
(async()=>{
 const source=path.resolve(process.env.FURNISH_TEST_PROJECT||path.join(root,'projects/workspace.furnish.json')),hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),before=hash();
 const job=A.createRun({parent:path.join(root,'output/desktop-verification'),prefix:'project-transfer-'}),run=job.dir;
 const isolated=job.workspace('workspace',root,{directories:['src','styles','vendor','assets'],files:['index.html','manifest.webmanifest']});
 job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
 for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));
 job.discard('profile');const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 let app,passed=false;
 try{
 app=await _electron.launch({executablePath:require('../scripts/launch-desktop.cjs').desktopExecutable(root),env,timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(45000);
 await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
 const counts=await page.evaluate(()=>({designs:store.designs.filter(d=>d.planId===PLAN.id&&d.editable===true).length,history:store.designs.filter(d=>d.planId===PLAN.id&&d.editable!==true).length}));assert(counts.designs>0);
 const exported=path.join(run,'1601-full-project.furnish.json');
 await app.evaluate(({BrowserWindow},file)=>{globalThis.transferDownload=new Promise(resolve=>BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_e,item)=>{item.setSavePath(file);item.once('done',(_e,state)=>resolve(state));}));},exported);
 await page.locator('#fileMenu>summary').click();await page.waitForFunction(n=>document.querySelector('#file-project-scope').textContent.includes(n+' 个设计方案'),counts.designs);await page.waitForTimeout(250);
 await page.screenshot({path:path.join(run,'desktop-menu.png')});await page.locator('#file-backup').click();assert.equal(await app.evaluate(()=>globalThis.transferDownload),'completed');
 await page.locator('#fileMenu>summary').click();const chooser=page.waitForEvent('filechooser');await page.locator('#file-import').click();await (await chooser).setFiles(exported);
 await page.locator('#project-import-preview').waitFor();assert((await page.locator('#project-import-preview').innerText()).includes(counts.designs+' 份设计方案 · '+counts.history+' 份历史记录'));
 await page.locator('#import-design-list>summary').click();await page.screenshot({path:path.join(run,'desktop-import-preview.png')});await page.getByRole('button',{name:'导入并打开',exact:true}).click();
 assert.equal(await page.locator('#design-select option').count(),counts.designs+1);await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await page.locator('#design-select option').count(),counts.designs+1);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));await page.waitForFunction(()=>innerWidth===390);await page.locator('#fileMenu>summary').click();await page.waitForTimeout(150);const box=await page.locator('#fileMenu>.menu-pop').boundingBox();assert(box.x>=0&&box.x+box.width<=391&&box.y+box.height<=845);await page.screenshot({path:path.join(run,'desktop-narrow.png')});
 assert.equal(hash(),before);fs.writeFileSync(path.join(run,'result.json'),JSON.stringify({counts,sourceUnchanged:true,checks:['native export','matching design and history counts in import preview','import into independent plan','save and refresh','390px menu']},null,2));passed=true;console.log('PASS isolated packaged desktop transfer: '+run);
 }finally{if(app)await app.close();assert.equal(hash(),before);job.finish(passed);}
})().catch(e=>{console.error(e);process.exitCode=1;});
