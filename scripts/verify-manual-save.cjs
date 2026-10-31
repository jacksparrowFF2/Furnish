/* Real packaged desktop; all edits use a private copy of the current file. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{_electron,chromium}=require('playwright'),{runtimeFiles}=require('./package-desktop.cjs');
const root=path.resolve(__dirname,'..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function freePort(){const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}
async function main(){
 const source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json')),repositoryFile=path.join(root,'projects/workspace.furnish.json'),originals=[...new Set([source,repositoryFile])].map(file=>({file,sha256:hash(file)}));
 const run=path.join(root,'output/manual-save-verification',new Date().toISOString().replace(/[:.]/g,'-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated,{recursive:true});
 for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));const file=path.join(isolated,'projects/workspace.furnish.json');fs.copyFileSync(source,file);
 const executable=path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),port=await freePort(),env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const checks=[],errors=[];let desktop,browser,page;
 const saved=async p=>{await p.waitForFunction(()=>!manualSaveTask&&repositoryClient.status.mode==='saved',null,{timeout:120000});};
 const edit=async(p,name)=>p.evaluate(name=>{const f=state.furniture.find(f=>!f.locked);mutate(()=>f.name=name);return {id:f.id,planId:PLAN.id};},name);
 const diskName=({id,planId})=>JSON.parse(fs.readFileSync(file,'utf8')).workspace.work[planId].furniture.find(f=>f.id===id).name;
 try{
  desktop=await _electron.launch({executablePath:executable,env,timeout:60000});page=await desktop.firstWindow();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  await page.waitForURL(`http://127.0.0.1:${port}/`);await page.locator('#repository-loading').waitFor({state:'hidden'});await saved(page);
  assert((await page.evaluate(()=>repositoryClient.status.storage.file)).startsWith(isolated));
  checks.push('same packaged EXE, private workspace/cache/port and copied current file');
  let puts=0,fail=false;await page.route('**/api/furnish/workspace',async route=>{if(route.request().method()==='PUT'){puts++;if(fail)return route.fulfill({status:422,json:{error:'验收：文件暂不可写'}});await new Promise(r=>setTimeout(r,300));}await route.continue();});
  const before=hash(file),item=await edit(page,'手动保存验收');assert.equal(await page.locator('#saved').getAttribute('data-mode'),'dirty');
  await page.waitForTimeout(1800);assert.equal(hash(file),before);assert.equal(puts,0);await page.screenshot({path:path.join(run,'desktop-unsaved.png')});
  await page.keyboard.press('Control+s');await page.waitForFunction(()=>repositoryClient.status.mode==='pending');assert((await page.locator('#saved').innerText()).includes('正在保存'));await saved(page);assert.equal(diskName(item),'手动保存验收');assert.match(await page.locator('#saved').innerText(),/已保存.*\d{2}:\d{2}:\d{2}/);
  checks.push('visible unsaved state, no 650ms file write, real Ctrl+S, writing state and acknowledged save time');
  const count=puts,unchanged=hash(file);await page.keyboard.press('Control+s');await saved(page);assert.equal(puts,count);assert.equal(hash(file),unchanged);
  checks.push('Ctrl+S without edits does not create a redundant file revision');
  await page.evaluate(id=>selectIds([id]),item.id);await page.locator('#fName').fill('输入框中按 Ctrl+S');await page.keyboard.press('Control+s');await saved(page);assert.equal(diskName(item),'输入框中按 Ctrl+S');
  checks.push('Ctrl+S commits an ordinary focused property input before saving');
  await page.evaluate(()=>openDialog({title:'草稿保存范围验收',body:'<input id="manual-save-draft" value="未应用草稿">',actions:[{label:'取消'}]}));await page.locator('#manual-save-draft').fill('尚未应用');await page.keyboard.press('Control+s');await saved(page);assert((await page.locator('#toast').innerText()).includes('草稿需先应用'));assert.equal(await page.locator('#manual-save-draft').inputValue(),'尚未应用');await page.locator('#dlgClose').click();checks.push('Ctrl+S in a modal preserves unapplied draft and explains saved scope');
  await page.clock.install();const autoBefore=puts;await edit(page,'一分钟兜底初稿');await page.clock.fastForward(59000);assert.equal(puts,autoBefore);await edit(page,'一分钟兜底最新稿');await page.clock.fastForward(1000);await saved(page);assert.equal(puts,autoBefore+1);assert.equal(diskName(item),'一分钟兜底最新稿');
  checks.push('one-minute fallback saves latest edit even during continuous editing (browser clock advanced)');
  const fallbackBefore=puts;await edit(page,'手动保存取消旧倒计时');await page.clock.fastForward(20000);await page.keyboard.press('Control+s');await saved(page);await page.clock.fastForward(60000);assert.equal(puts,fallbackBefore+1);
  checks.push('manual save cancels the old fallback deadline');
  fail=true;const prior=hash(file);await edit(page,'失败保留的草稿');await page.keyboard.press('Control+s');await page.waitForFunction(()=>!manualSaveTask&&repositoryClient.status.mode==='error');assert.equal(hash(file),prior);assert(await page.locator('#saved').evaluate(el=>el.classList.contains('err')));assert((await page.locator('#saved').getAttribute('title')).includes('文件暂不可写'));
  fail=false;await page.keyboard.press('Control+s');await saved(page);assert.equal(diskName(item),'失败保留的草稿');checks.push('failed write stays unsaved with reason; Ctrl+S retries the preserved latest edit');
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));await page.waitForFunction(()=>innerWidth===390);await page.screenshot({path:path.join(run,'desktop-narrow.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1440,960));await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});await saved(page);assert.equal(await page.evaluate(id=>getF(id).name,item.id),'失败保留的草稿');await page.screenshot({path:path.join(run,'desktop-saved.png')});
  checks.push('390px desktop status and refresh roundtrip');
  browser=await chromium.launch({headless:true});let context=await browser.newContext(),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${port}/`);await p.locator('#repository-loading').waitFor({state:'hidden'});const web=await edit(p,'HTTP 手动保存');await p.keyboard.press('Control+s');await saved(p);assert.equal(diskName(web),'HTTP 手动保存');await context.close();checks.push('HTTP browser Ctrl+S uses the same file protocol');
  context=await browser.newContext();p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await context.route(/^https?:/,route=>route.abort());await p.goto(pathToFileURL(path.join(isolated,'index.html')).href);await p.locator('#repository-loading').waitFor({state:'hidden'});assert(await p.evaluate(()=>repositoryClient===null));await edit(p,'离线缓存保存');await p.keyboard.press('Control+s');await p.waitForFunction(()=>manualSaveTask===null);assert((await p.locator('#toast').innerText()).includes('本浏览器'));checks.push('offline file:// Ctrl+S saves recovery cache and explains project export');await context.close();
  assert.deepEqual(errors,[]);checks.push('no renderer exceptions');
 }catch(e){if(page&&!page.isClosed())await page.screenshot({path:path.join(run,'failure.png')}).catch(()=>{});throw e;}
 finally{if(browser)await browser.close();if(desktop)await desktop.close();for(const value of originals)assert.equal(hash(value.file),value.sha256,'Original design must not be changed');fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({executable,isolated,checks,errors,originals},null,2));console.log('Results: '+run);}
 console.log(checks.map(v=>'PASS '+v).join('\n'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
