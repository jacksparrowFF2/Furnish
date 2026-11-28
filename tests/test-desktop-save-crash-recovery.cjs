'use strict';
// Opt-in macOS fault injection using the signed desktop app and a copied workspace.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),{once}=require('node:events');
const root=path.resolve(__dirname,'..');
const {createRun}=require('../scripts/lib/test-artifacts.cjs');
const {runtimeFiles}=require('../scripts/package-desktop.cjs');
const {desktopExecutable}=require('../scripts/launch-desktop.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,label,timeout=30000){
 const deadline=Date.now()+timeout;
 do{const result=await read();if(result)return result;await wait(5);}while(Date.now()<deadline);
 throw Error('Timed out: '+label);
}
async function freePort(){
 const socket=http.createServer();
 await new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',resolve);});
 const port=socket.address().port;
 await new Promise(resolve=>socket.close(resolve));return port;
}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}}
function lockFiles(directory){
 return fs.readdirSync(directory).filter(name=>name==='.workspace.lock'||name.startsWith('.workspace-owner-')).sort();
}
async function main(){
 if(process.platform!=='darwin'||!process.env.FURNISH_TEST_PROJECT){
  console.log('SKIP desktop crash recovery: set FURNISH_TEST_PROJECT to a workspace file on macOS');
  return;
 }
 const {_electron}=require('playwright');
 const source=fs.realpathSync(process.env.FURNISH_TEST_PROJECT);
 const executable=fs.realpathSync(desktopExecutable(root,{executable:process.argv[2]&&path.resolve(process.argv[2])}));
 const initialHash=hash(source),job=createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'save-crash-recovery-'});
 const result={executable,source,initialHash,executableSha256:hash(executable),checks:[],responses:[],rendererErrors:[]};
 console.log('EVIDENCE '+job.dir);
 const resultFile=path.join(job.dir,'result.json');
 const checkpoint=(name,extra={})=>{
  result.checks.push({name,at:new Date().toISOString(),...extra});
  fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n');
  console.log('PASS '+name+' '+JSON.stringify(extra));
 };
 const profile=job.discard('profile');
 let desktop=null,stoppedPid=null,knownBackend=null,error;
 try{
  const workspace=path.join(job.dir,'workspace');
  for(const name of ['src','styles','vendor','assets','templates','index.html','manifest.webmanifest']){
   job.copy(path.join(root,name),path.join('workspace',name));
  }
  const disk=job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
  for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),'workspace/scripts/'+name);
  const directory=path.dirname(disk),lock=path.join(directory,'.workspace.lock');
  assert.equal(hash(disk),initialHash);assert.deepEqual(lockFiles(directory),[]);
  const port=await freePort(),url='http://127.0.0.1:'+port;
  result.port=port;
  const env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:profile,FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_FORCE_IS_PACKAGED;
  const responseInfo=async()=>{try{
   const r=await fetch(url+'/api/furnish/server',{signal:AbortSignal.timeout(2000)});
   return r.ok?await r.json():null;
  }catch{return null;}};
  async function launch(stage){
   desktop=await _electron.launch({executablePath:executable,env,timeout:60000});
   const consoleFile=path.join(job.dir,'electron.log');
   for(const stream of [desktop.process().stdout,desktop.process().stderr])stream?.on('data',data=>fs.appendFileSync(consoleFile,data));
   const shellPid=desktop.process().pid;
   const shell=await desktop.evaluate(({app})=>({appPath:app.getAppPath(),profile:app.getPath('userData'),version:process.versions.electron}));
   assert.equal(fs.realpathSync(shell.appPath),path.resolve(path.dirname(executable),'../Resources/app'));
   assert.equal(shell.profile,profile);
   const page=await desktop.firstWindow();
   page.on('pageerror',e=>result.rendererErrors.push({stage,message:e.message}));
   page.on('response',r=>{
    if(r.url()===url+'/api/furnish/workspace'&&r.request().method()==='PUT'){
     result.responses.push({stage,status:r.status()});
    }
   });
   await page.waitForURL(url+'/');
   const backend=await until(responseInfo,'backend startup');
   assert.equal(backend.app,'furnish');assert.equal(backend.root,workspace);
   assert.equal(backend.updateAvailable,false);assert.notEqual(backend.pid,shellPid);
   knownBackend=backend.pid;
   const ready=()=>page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting,null,{timeout:120000});
   return {page,backend,shellPid,shell,ready};
  }
  const initial=await launch('first-window');
  await initial.ready();
  const selection=await initial.page.evaluate(()=>{
   const f=state.furniture.find(v=>!furnitureLocked(v)&&!v.obj&&v.price!==2637.19);
   if(!f)throw Error('No suitable editable furniture');
   if(!propertyPanelVisible())document.querySelector('.app').classList.remove('hide-panel');
   selectIds([f.id]);
   return {planId:PLAN.id,designId:store.activeDesigns?.[PLAN.id],furnitureId:f.id,name:f.name,oldPrice:f.price??null,furniture:state.furniture.length,mode:repositoryClient.status.mode,revision:repositoryClient.revision};
  });
  assert.equal(selection.mode,'saved');assert.match(selection.revision,/^[a-f0-9]{64}$/);
  checkpoint('Packaged desktop loaded the isolated copy', {...selection,electron:initial.shell.version,shellPid:initial.shellPid,backendPid:initial.backend.pid});
  const value=2637.19;
  const price=initial.page.locator('#fP');
  await price.fill(String(value));await price.press('Tab');
  await initial.page.waitForFunction(({id,value})=>getF(id).price===value&&repositoryClient.status.mode==='dirty'&&!savePending&&!saveErr,{id:selection.furnitureId,value},{timeout:30000});
  const cached=await initial.page.evaluate(async id=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('furnish-project-storage');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   try{
    const data=await new Promise((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('store');r.onsuccess=()=>resolve(JSON.parse(r.result));r.onerror=()=>reject(r.error);});
    return {price:data.work[data.planId].furniture.find(f=>f.id===id).price,revision:data._repository.revision};
   }finally{db.close();}
  },selection.furnitureId);
  assert.deepEqual(cached,{price:value,revision:selection.revision});
  assert.equal(hash(disk),initialHash);
  await initial.page.screenshot({path:path.join(job.dir,'01-unsaved.png'),timeout:30000});
  checkpoint('Property edit reached IndexedDB while primary remained unchanged',{cachedPrice:value});
  const before=fs.statSync(disk);
  // Polling starts before the real keyboard shortcut. Wait for the
  // production owner lock, then stop the verified isolated writer before it can
  // finish the atomic replacement. No server module or timing hook is patched.
  const interrupted=until(()=>{
   const entry=fs.lstatSync(lock,{throwIfNoEntry:false});
   if(!entry)return null;
   const owner=fs.readFileSync(lock,'utf8');
   if(!owner.includes('-'+initial.backend.pid+'-'))return null;
   process.kill(initial.backend.pid,'SIGSTOP');stoppedPid=initial.backend.pid;
   const original=fs.statSync(disk),files=lockFiles(directory);
   assert.equal(original.ino,before.ino);assert.equal(original.mtimeMs,before.mtimeMs);
   assert.deepEqual(files,['.workspace.lock',owner].sort());
   process.kill(stoppedPid,'SIGKILL');stoppedPid=null;
   return {owner,ino:entry.ino,files};
  },'writer acquired production lock',45000);
  const key=initial.page.keyboard.press('Meta+s');
  const [residue]=await Promise.all([interrupted,key]);
  await until(()=>!alive(initial.backend.pid),'writer exited');
  assert.equal(fs.statSync(lock).ino,residue.ino);
  assert.equal(fs.readFileSync(lock,'utf8'),residue.owner);
  assert.equal(hash(disk),initialHash);
  assert.equal(result.responses.some(r=>r.stage==='first-window'&&r.status===200),false);
  checkpoint('SIGKILL interrupted a real save with its owner lock held',{writerPid:initial.backend.pid,lockInode:residue.ino,files:residue.files,primarySha256:initialHash});
  const firstExit=once(desktop.process(),'exit');
  // The writer is already dead. Exit just the isolated shell without another
  // shutdown save, to test what a separate desktop launch can recover.
  await desktop.evaluate(({app})=>app.exit(0)).catch(()=>{});
  await firstExit;
  desktop=null;
  assert.deepEqual(lockFiles(directory),residue.files);
  assert.equal(await responseInfo(),null);
  const recovered=await launch('reopened-window');
  assert.notEqual(recovered.shellPid,initial.shellPid);
  assert.notEqual(recovered.backend.pid,initial.backend.pid);
  await recovered.ready();
  const live=await recovered.page.evaluate(id=>{
   selectIds([id]);
   return {price:getF(id).price,mode:repositoryClient.status.mode,pending:repositoryClient.pending,revision:repositoryClient.revision,message:repositoryClient.status.message,label:document.querySelector('#saved').textContent};
  },selection.furnitureId);
  assert.equal(live.price,value);assert.equal(live.mode,'saved');assert.equal(live.pending,false);
  assert.match(live.message,/已恢复本机编辑并保存到本地正式文件/);
  assert.ok(result.responses.some(r=>r.stage==='reopened-window'&&r.status===200),JSON.stringify(result.responses));
  assert.deepEqual(lockFiles(directory),[]);
  const diskHash=hash(disk),data=JSON.parse(fs.readFileSync(disk,'utf8')).workspace;
  function priceIn(work){return work.furniture.find(f=>f.id===selection.furnitureId).price;}
  assert.notEqual(diskHash,initialHash);assert.equal(diskHash,live.revision);
  assert.equal(priceIn(data.work[selection.planId]),value);
  if(selection.designId)assert.equal(priceIn(data.designs.find(d=>d.id===selection.designId).work),value);
  const histories=fs.readdirSync(path.join(directory,'backups')).filter(n=>n.endsWith('.furnish.json'));
  assert.equal(histories.length,1);
  assert.equal(hash(path.join(directory,'backups',histories[0])),initialHash);
  await recovered.page.screenshot({path:path.join(job.dir,'02-auto-recovered-and-saved.png'),timeout:30000});
  checkpoint('Relaunch automatically recovered the edit, cleared the locks and acknowledged the new primary',{...live,shellPid:recovered.shellPid,backendPid:recovered.backend.pid,primarySha256:diskHash,historyBytesMatch:true,namedDesignChecked:!!selection.designId});
  await desktop.close();desktop=null;
  await until(()=>!alive(recovered.backend.pid),'restarted backend shut down');
  const check=await launch('second-reopen');
  await check.ready();
  const second=await check.page.evaluate(id=>({price:getF(id).price,mode:repositoryClient.status.mode,revision:repositoryClient.revision,message:repositoryClient.status.message}),selection.furnitureId);
  assert.equal(second.price,value);assert.equal(second.mode,'saved');assert.equal(second.revision,diskHash);
  assert.match(second.message,/已加载本地正式文件/);
  assert.equal(result.responses.some(r=>r.stage==='second-reopen'),false);
  assert.equal(hash(disk),diskHash);
  await desktop.close();desktop=null;
  await until(()=>!alive(check.backend.pid),'final backend shut down');
  assert.equal(hash(source),initialHash);
  checkpoint('A second restart read the new primary with no further write; original file SHA-256 unchanged');
  result.passed=true;
 }catch(e){error=e;result.error=e.stack;}
 finally{
  if(stoppedPid){try{process.kill(stoppedPid,'SIGKILL');}catch{}}
  if(desktop){
   const child=desktop.process();
   if(child.exitCode===null&&child.signalCode===null){
    const exited=once(child,'exit');
    await desktop.evaluate(({app})=>app.exit(0)).catch(()=>{});
    await exited;
   }
  }
  if(knownBackend&&alive(knownBackend)){
   await until(()=>!alive(knownBackend),'isolated backend shutdown',7000).catch(()=>{});
  }
  result.originalWorkspaceUnchanged=hash(source)===initialHash;
  result.isolatedBackendStopped=!knownBackend||!alive(knownBackend);
  if(!result.isolatedBackendStopped){
   result.passed=false;
   fs.writeFileSync(path.join(job.dir,'.keep'),'Isolated backend has not exited; keep its workspace.\n');
  }
  result.passed=result.passed===true&&result.originalWorkspaceUnchanged;
  fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n');
  job.finish(result.passed);
 }
 if(error)throw error;
 assert.equal(result.passed,true,'Original workspace changed or isolated backend did not exit');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
