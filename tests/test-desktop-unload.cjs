'use strict';
// Real Electron and the production workspace API, with an isolated copy of the file.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {parseArgs}=require('node:util');
const {once}=require('node:events');
const {_electron}=require('playwright');
const {createRun}=require('../scripts/lib/test-artifacts.cjs');
const {runtimeFiles}=require('../scripts/package-desktop.cjs');
const root=path.resolve(__dirname,'..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function freePort(){
 const server=http.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));return port;
}
async function main(){
 const {positionals:[executable],values}=parseArgs({options:{'save-only':{type:'boolean'}},allowPositionals:true});
 const source=path.resolve(process.env.FURNISH_TEST_PROJECT||path.join(root,'projects/workspace.furnish.json')),before=hash(source);
 const job=createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'unload-'});
 const profile=job.discard('profile'),report={checks:[],dialogs:[]};
 let desktop,passed=false,held;
 try{
  const workspace=job.workspace('workspace',root,{directories:['src','styles','vendor','assets'],files:['index.html']});
  const disk=job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
  for(const file of runtimeFiles)job.copy(path.join(root,'scripts',file),'workspace/scripts/'+file);
  const port=await freePort(),url='http://127.0.0.1:'+port;
  const env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:profile,FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  desktop=await _electron.launch({executablePath:executable||require('electron'),args:executable?[]:[path.join(root,'desktop/main.cjs')],env});
  const ready=async page=>page.waitForFunction(()=>!!window.FurnishRepository&&!repositoryBooting,null,{timeout:90000});
  let page=await desktop.firstWindow();await ready(page);
  await desktop.evaluate(({dialog})=>{
   globalThis.testDialogs=[];globalThis.testChoice=0;
   dialog.showMessageBox=async(_win,options)=>{
    testDialogs.push(options);
    return {response:options.buttons.length>1?testChoice:0};
   };
  });
  const optionalChoice=response=>desktop.evaluate((_electron,n)=>{globalThis.testChoice=n;},response);
  const dialogs=()=>desktop.evaluate(()=>globalThis.testDialogs);
  async function waitForDialogs(count){
   const until=Date.now()+10000;
   while(Date.now()<until){
    const observed=await dialogs();
    if(observed.length>=count)return observed;
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   throw Error('Expected '+count+' dialogs');
  }
  const setColor=(target,color)=>target.evaluate(c=>{
   const f=state.furniture.find(f=>!f.locked);
   if(!f)throw Error('No editable furniture in fixture');
   mutate(()=>{f.color=c;});
   return f.id;
  },color);
  const diskColor=id=>{
   const data=JSON.parse(fs.readFileSync(disk,'utf8')).workspace;
   return data.work[data.planId].furniture.find(f=>f.id===id).color;
  };
  const liveColor=(target,id)=>target.evaluate(id=>state.furniture.find(f=>f.id===id).color,id);
  const windowAction=action=>desktop.evaluate(({BrowserWindow,app,Menu},action)=>{
   const window=BrowserWindow.getAllWindows()[0];
   if(action==='close')window.close();
   else if(action==='quit')app.quit();
   else Menu.getApplicationMenu().items.find(item=>item.label==='视图').submenu.items[0].click(null,window);
  },action);
  const enter=deferred();held=deferred();
  if(!values['save-only'])await page.route('**/api/furnish/workspace',async route=>{
   if(route.request().method()!=='PUT')return route.continue();
   enter.resolve();await held.promise;await route.continue();
  });
  const edited=await setColor(page,'#538a72');
  await page.screenshot({path:path.join(job.dir,'before-refresh.png')});
  const measured=Date.now();
  await Promise.all([page.waitForNavigation({timeout:45000}), (async()=>{
   await windowAction('refresh');
   if(values['save-only'])return;
   await enter.promise;
   assert.notEqual(diskColor(edited),'#538a72');assert.equal((await dialogs()).length,0);
   held.resolve();
  })()]);
  report.saveAndReloadMs=Date.now()-measured;
  await ready(page);
  await page.unrouteAll({behavior:'wait'});
  assert.equal(await liveColor(page,edited),'#538a72');assert.equal(diskColor(edited),'#538a72');assert.equal((await dialogs()).length,0);
  await page.screenshot({path:path.join(job.dir,'after-refresh.png')});
  report.checks.push('Refresh waits for an in-flight write, reloads automatically and shows no modal');
  if(values['save-only']){passed=true;return;}

  // Change the official file through the real API while the desktop keeps its old revision.
  const current=await (await fetch(url+'/api/furnish/workspace')).json();
  current.workspace.work[current.workspace.planId].furniture.find(f=>f.id===edited).color='#a96853';
  const external=await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace:current.workspace,baseRevision:current.revision})});
  assert.equal(external.status,200,await external.text());
  await setColor(page,'#792f7a');
  await windowAction('close');
  await page.waitForFunction(()=>repositoryClient.status.mode==='conflict');
  report.dialogs=await waitForDialogs(1);
  assert.match(report.dialogs[0].message,/保存冲突/);
  assert.match(report.dialogs[0].detail,/正式文件包含其他修改/);
  assert.equal(await liveColor(page,edited),'#792f7a');assert.equal(diskColor(edited),'#a96853');
  await page.evaluate(()=>{
   window.originalRecoveryWrite=FurnishStorage.writeSerialized;
   window.originalQuickWrite=FurnishStorage.writeQuick;
   FurnishStorage.writeSerialized=async()=>{throw Error('test: storage unavailable');};
   FurnishStorage.writeQuick=()=>false;
  });
  await optionalChoice(1);await windowAction('refresh');
  report.dialogs=await waitForDialogs(3);
  assert.match(report.dialogs[2].message,/无法确认最新编辑/);
  assert.equal(await liveColor(page,edited),'#792f7a');
  await page.evaluate(()=>{
   FurnishStorage.writeSerialized=window.originalRecoveryWrite;
   FurnishStorage.writeQuick=window.originalQuickWrite;
  });
  const afterConflict=page.waitForNavigation();await windowAction('refresh');await afterConflict;await ready(page);
  assert.equal(await liveColor(page,edited),'#a96853');assert.equal(diskColor(edited),'#a96853');
  const recoveries=await (await fetch(url+'/api/furnish/recoveries')).json();
  assert.ok(recoveries.some(({workspace})=>workspace.work[workspace.planId].furniture.find(f=>f.id===edited)?.color==='#792f7a'));
  report.checks.push('Conflict is specific, cancel keeps edits, failed cache write keeps window open, verified cache refresh preserves the draft and never overwrites the newer file');

  await setColor(page,'#427a86');
  if(process.platform==='darwin'){
   const closed=page.waitForEvent('close');
   await windowAction('close');await closed;
   assert.equal(diskColor(edited),'#427a86');
   await desktop.evaluate(({app})=>app.emit('activate'));
   page=await desktop.firstWindow();await ready(page);
   assert.equal(await liveColor(page,edited),'#427a86');await setColor(page,'#596097');
  }
  report.dialogs=await dialogs();assert.equal(report.dialogs.length,4);
  const [[exitCode]]=await Promise.all([once(desktop.process(),'exit',{signal:AbortSignal.timeout(30000)}),windowAction('quit')]);
  assert.equal(exitCode,0);desktop=null;
  assert.equal(diskColor(edited),process.platform==='darwin'?'#596097':'#427a86');
  report.checks.push('Native close/quit wait for remaining changes before unloading');
  passed=true;
 }finally{
  held?.resolve();
  if(desktop){
   if(passed)await desktop.close();
   else if(desktop.process().exitCode===null&&desktop.process().signalCode===null){
    const exited=new Promise(resolve=>desktop.process().once('exit',resolve));
    desktop.process().kill();await exited;
   }
  }
  report.passed=passed&&hash(source)===before;
  fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify(report,null,2)+'\n');
  job.finish(report.passed);assert.equal(hash(source),before);
  console.log('Desktop unload evidence: '+job.dir);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
