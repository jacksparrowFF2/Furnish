'use strict';
// Native Electron window + OS single-instance/relaunch acceptance; backend timing is controlled.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function main(){
 const run=fs.mkdtempSync(path.join(root,'output/playwright/desktop-lifecycle-'));
 const log=path.join(run,'events.jsonl'),closeRequest=path.join(run,'close'),entry=path.join(run,'entry.cjs');
 const server=http.createServer((_req,res)=>res.end('<!doctype html><title>Lifecycle acceptance</title><p>Furnish window lifecycle</p>'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 fs.writeFileSync(entry,`
 const fs=require('node:fs'),{app,BrowserWindow,dialog}=require('electron');
 const log=${JSON.stringify(log)},closeRequest=${JSON.stringify(closeRequest)};
 const events=()=>fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\\n').filter(Boolean).map(JSON.parse):[];
 const generation=events().filter(e=>e.type==='primary').length+1;
 const record=(type,extra={})=>fs.appendFileSync(log,JSON.stringify({type,pid:process.pid,generation,...extra})+'\\n');
 process.on('uncaughtException',e=>{record('error',{message:e.stack});app.exit(1);});
 dialog.showErrorBox=(title,message)=>{record('error',{title,message});app.exit(1);};
 app.on('second-instance',()=>record('second-instance'));
 app.on('quit',()=>record('quit'));
 const backendPath=${JSON.stringify(path.join(root,'desktop/backend.cjs'))};
 require.cache[require.resolve(backendPath)]={exports:{connect:async()=>({url:${JSON.stringify('http://127.0.0.1:')}+${server.address().port}+'/',close:()=>new Promise(resolve=>{record('cleanup-start');setTimeout(()=>{record('cleanup-done');resolve();},1500);})})}};
 app.on('browser-window-created',(_e,win)=>{
  record('primary');
  win.once('show',()=>{record('loaded');if(generation===2)setTimeout(()=>win.close(),100);});
  win.on('closed',()=>record('closed'));
  if(generation===1){
   const timer=setInterval(()=>{if(fs.existsSync(closeRequest)){clearInterval(timer);win.close();}},30);
   app.on('second-instance',()=>setTimeout(()=>record('activated',{destroyed:win.isDestroyed(),visible:!win.isDestroyed()&&win.isVisible()}),100));
  }
 });
 require(${JSON.stringify(path.join(root,'desktop/main.cjs'))});
 `);
 const env={...process.env,FURNISH_DESKTOP_ROOT:root,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const events=()=>fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 async function until(test){const end=Date.now()+20000;while(Date.now()<end){const es=events();assert.ok(!es.some(e=>e.type==='error'),JSON.stringify(es));if(test(es))return es;await new Promise(r=>setTimeout(r,50));}throw Error('Native lifecycle timeout: '+JSON.stringify(events()));}
 const children=[];const launch=()=>{const child=spawn(require('electron'),[entry],{env,windowsHide:true,stdio:'ignore'});children.push(child);return child;};
 try{
  launch();await until(es=>es.some(e=>e.type==='loaded'));
  launch();await until(es=>es.some(e=>e.type==='activated'&&e.visible));
  fs.writeFileSync(closeRequest,'close');await until(es=>es.some(e=>e.type==='cleanup-start'));
  launch();await until(es=>es.filter(e=>e.type==='second-instance').length===2);
  const es=await until(es=>es.some(e=>e.type==='cleanup-done'&&e.generation===2)&&es.some(e=>e.type==='quit'&&e.generation===2));
  assert.equal(es.filter(e=>e.type==='primary').length,2);
  assert.ok(es.findIndex(e=>e.type==='cleanup-done'&&e.generation===1)<es.findIndex(e=>e.type==='primary'&&e.generation===2));
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({passed:true,checks:['real second launch activates existing window','real second launch during delayed cleanup queues native relaunch','backend cleanup precedes new primary window','relaunch closes cleanly without destroyed-object errors'],events:es},null,2));
  console.log('Native Electron lifecycle passed: '+run);
 }finally{
  for(const child of children)if(child.exitCode===null)child.kill();
  const es=events();for(const e of es.filter(e=>e.type==='primary'))if(!es.some(q=>q.type==='quit'&&q.pid===e.pid)){try{process.kill(e.pid);}catch{}}
  await new Promise(r=>server.close(r));
 }
}
fs.mkdirSync(path.join(root,'output/playwright'),{recursive:true});main().catch(e=>{console.error(e);process.exitCode=1;});
