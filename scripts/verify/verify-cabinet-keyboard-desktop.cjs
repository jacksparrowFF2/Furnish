/* Production EXE, private workspace/cache; no writes to the source project. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.join(root,'projects/workspace.furnish.json'),before=hash(source),run=fs.mkdtempSync(path.join(root,'output/playwright/cabinet-keyboard-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),env,timeout:60000}),errors=[];let browser;
 const ready=p=>p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
 try{
  const p=await desktop.firstWindow();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));await ready(p);
  let shot=0;const verify=new Function('return ('+fs.readFileSync(path.join(__dirname,'verify-cabinet-keyboard.browser.js'),'utf8')+'\n);')();const {checks}=await verify(p,{desktop:true,screenshot:()=>p.screenshot({path:path.join(run,'desktop-keyboard-'+(++shot)+'.png')})});
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,desktop:true,sourceUnchanged:true,checks,errors},null,2));console.log('PASS cabinet keyboard desktop: '+run);
 }finally{await browser?.close();await desktop.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
