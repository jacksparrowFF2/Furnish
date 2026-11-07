'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),A=require('../scripts/lib/test-artifacts.cjs'),{runtimeFiles}=require('../scripts/package-desktop.cjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const source=process.env.FURNISH_SOAK_SOURCE||path.join(root,'projects/workspace.furnish.json'),before=hash(source),job=A.createRun({parent:path.join(root,'output/desktop-verification'),prefix:'3d-soak-'});
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'Furnish-desktop-soak-')),runtimeRoot=path.dirname(require('electron')),installed=path.dirname(require('../scripts/launch-desktop.cjs').desktopExecutable(root));
 let app,passed=false;const records=[],errors=[];const started=Date.now();
 try{
  const work=job.workspace('workspace',root,{directories:['src','styles','vendor','assets'],files:['index.html','manifest.webmanifest']});fs.copyFileSync(source,path.join(work,'projects/workspace.furnish.json'));for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));job.discard('profile');
  // Copy only the original runtime file set, then install the exact current shell.
  for(const name of fs.readdirSync(runtimeRoot)){const installedName=name==='electron.exe'?'Furnish.exe':name;if(fs.existsSync(path.join(installed,installedName)))fs.cpSync(path.join(installed,installedName),path.join(runtime,installedName),{recursive:true});}
  const shell=path.join(runtime,'resources/app');fs.mkdirSync(shell,{recursive:true});for(const name of ['main.cjs','policy.cjs','backend.cjs','diagnostics.cjs'])fs.copyFileSync(path.join(root,'desktop',name),path.join(shell,name));fs.writeFileSync(path.join(shell,'package.json'),JSON.stringify({name:'furnish-desktop',main:'main.cjs'}));
  const executable=path.join(runtime,'Furnish.exe');require('../scripts/windows-integrity.cjs').assertDesktopIntegrity(executable);
  const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:path.join(job.dir,'profile'),FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
  console.log('Isolated 3D soak: '+job.dir);app=await _electron.launch({executablePath:executable,env,timeout:60000});app.process().once('exit',(code,signal)=>{records.push({event:'exit',time:Date.now(),code,signal});console.log('Desktop exited: '+JSON.stringify({code,signal}));});
  const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setTitle('Furnish · 三维持续运行测试（隔离副本）'));page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));page.on('close',()=>records.push({event:'page-close',time:Date.now()}));
  await page.waitForFunction(()=>typeof FurnishMcp!=='undefined'&&!repositoryBooting);await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});
  const duration=Number(process.env.FURNISH_SOAK_MS||390000),end=Date.now()+duration;
  await page.screenshot({path:path.join(job.dir,'3d-start.png')});
  while(Date.now()<end){await new Promise(r=>setTimeout(r,15000));assert(!page.isClosed(),'3D window closed during soak');const sample=await Promise.race([app.evaluate(({app,BrowserWindow})=>({windows:BrowserWindow.getAllWindows().length,metrics:app.getAppMetrics().map(p=>({pid:p.pid,type:p.type,cpu:p.cpu.percentCPUUsage,memory:p.memory.workingSetSize}))})),new Promise((_,reject)=>setTimeout(()=>reject(Error('Main process unresponsive for 15 seconds')),15000))]);records.push({event:'sample',elapsed:Date.now()-started,...sample});console.log('Alive '+Math.round((Date.now()-started)/1000)+'s '+sample.metrics.map(m=>m.type+':'+Math.round(m.memory/1024)+'MB').join(' '));}
  await page.screenshot({path:path.join(job.dir,'3d-end.png')});assert.deepEqual(errors,[]);passed=true;
 }catch(e){records.push({event:'failure',message:e.message});throw e;}
 finally{if(app)await app.close().catch(e=>errors.push('close: '+e.message));const events=path.join(job.dir,'workspace/.local/desktop-runtime/events.jsonl');if(fs.existsSync(events))fs.copyFileSync(events,path.join(job.dir,'desktop-events.jsonl'));fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify({passed,elapsedMs:Date.now()-started,errors,records},null,2));assert.equal(hash(source),before);job.finish(passed);const absolute=path.resolve(runtime);assert(absolute.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(absolute).startsWith('Furnish-desktop-soak-'));fs.rmSync(absolute,{recursive:true,force:true});console.log('Soak report: '+job.dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
