/* Optional local HTTP server for PDF reference imports. No npm installation needed. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.FURNISH_PORT||8765);
const runtime=require('./server-runtime.cjs'),codeFingerprint=runtime.fingerprint(__filename);
if(process.env.FURNISH_BACKEND_EXPECTED&&process.env.FURNISH_BACKEND_EXPECTED!==codeFingerprint){console.error('后台代码在预检后再次变化；保留原服务，稍后重试更新。');process.exit(1);}
if(runtime.ownerStopped(fs.realpathSync(root),process.env.FURNISH_BACKEND_OWNER))process.exit(0);
const recovery=require('./server-recovery.cjs');
const instance={app:'furnish',protocol:1,root:fs.realpathSync(root),fingerprint:codeFingerprint,pid:process.pid,token:require('node:crypto').randomUUID(),...(process.env.FURNISH_BACKEND_OWNER?{owner:process.env.FURNISH_BACKEND_OWNER}:{})};
const repository=require('./repository-server.cjs').create(root);
const blender=require('./blender-server.cjs').create(root);
const updates=require('./backend-update.cjs').create({entry:__filename,root:instance.root,port,instance,busy:()=>blender.busy});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.pdf':'application/pdf','.wasm':'application/wasm','.dxf':'text/plain','.obj':'text/plain'};
function control(req,res){
 const route=req.url.split('?')[0];if(!['/api/furnish/server','/api/furnish/server/ensure','/api/furnish/server/restart','/api/furnish/server/shutdown'].includes(route))return false;
 const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const host=req.headers.host||'',origin=req.headers.origin;
 if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site'){reply(403,{error:'Local same-origin requests only'});return true;}
 if(route==='/api/furnish/server'&&req.method==='GET')reply(200,updates.status());
 else if(req.method==='POST'&&req.headers['x-furnish-restart']===instance.token){
  if(route==='/api/furnish/server/ensure'){req.resume();reply(200,updates.ensure());}
  else if(route==='/api/furnish/server/restart'||route==='/api/furnish/server/shutdown'){
   if(route.endsWith('/restart')&&blender.busy){reply(409,{error:'渲染任务进行中，后台更新等待任务结束',code:'BACKEND_UPDATE_BUSY'});return true;}
   reply(200,{restarting:true});server.close(()=>process.exit(0));
  }else reply(403,{error:'Invalid control request'});
 }else reply(403,{error:'Invalid control request'});
 return true;
}
function updateBeforeWrite(req,res){
 const route=req.url.split('?')[0];if(!['PUT','POST'].includes(req.method)||!route.startsWith('/api/furnish/'))return false;
 const host=req.headers.host||'',origin=req.headers.origin;
 // Only an already authenticated application write can start a local launcher.
 if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site'||!['workspace-v1','blender-v1'].includes(req.headers['x-furnish-request']))return false;
 const state=updates.ensure();if(!state.updateAvailable&&!state.updating)return false;
 req.resume();res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'2'}).end(JSON.stringify({code:'BACKEND_UPDATING',error:state.updateError||state.lastUpdateError||(state.updateBusy?'正在渲染，后台更新将等待任务结束；编辑保留在恢复缓存':'后台代码已更新，正在自动接替服务；编辑保留在恢复缓存，请稍候')}));return true;
}
const server=http.createServer(async(req,res)=>{if(control(req,res)||updateBeforeWrite(req,res)||await blender.handle(req,res)||await repository.handle(req,res))return;let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||file.slice(root.length+1).split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}}catch{res.writeHead(400).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});});
server.on('close',()=>blender.close());
// A desktop can close during the brief handoff gap. The stopped owner marker
// prevents a late replacement from outliving that desktop, even without IPC.
const ownerTimer=instance.owner?setInterval(()=>{if(runtime.ownerStopped(instance.root,instance.owner))server.close(()=>process.exit(0));},500):null;
ownerTimer?.unref();server.on('close',()=>clearInterval(ownerTimer));
const url=`http://127.0.0.1:${port}/`;
function openPage(){
 if(!process.argv.includes('--open')||process.platform!=='win32')return;
 const browser=require('node:child_process').spawn('explorer.exe',[url],{stdio:'ignore'});
 browser.on('error',e=>console.error(`Open the URL above in your browser: ${e.message}`));
 browser.unref();
}
let restartRetries=0,recoveryAttempted=false,stopRecovery;
function reuse(existing){
 if(existing?.app!=='furnish'||existing.protocol!==1||existing.root!==instance.root||existing.fingerprint!==codeFingerprint)return false;
 console.log(`Furnish is already running: ${url}`);openPage();return true;
}
async function recoverStalled(){
 if(recoveryAttempted)return false;recoveryAttempted=true;
 if(!await recovery.recover(instance.root,port))return false;
 console.log('Furnish was unresponsive. Recovering the local service on the same port...');
 restartRetries=50;setTimeout(listen,200);return true;
}
server.on('error',async e=>{
 if(e.code==='EADDRINUSE'){
  if(restartRetries){
   if(--restartRetries){setTimeout(listen,100);return;}
   // A simultaneous launcher may have won the newly released port.
   if(reuse(await runtime.request(url+'api/furnish/server'))||await recoverStalled())return;
   console.error('Furnish restart timed out; the original service has not released the port.');process.exitCode=1;return;
  }
  const existing=await runtime.request(url+'api/furnish/server');
  if(existing?.app==='furnish'&&existing.protocol===1&&existing.root===instance.root&&typeof existing.token==='string'){
   if(reuse(existing))return;
   console.log('Furnish backend code changed. Restarting the local service...');
   if((await runtime.request(url+'api/furnish/server/restart',{method:'POST',token:existing.token}))?.restarting){restartRetries=1200;listen();return;}
   if(await recoverStalled())return;
   console.error('Furnish could not restart the existing service. Please close its server window and try again.');process.exitCode=1;return;
  }
  if(!existing&&await recoverStalled())return;
 }
 console.error(e.code==='EADDRINUSE'?`Port ${port} is occupied by another or unrecognized service. Automatic recovery could not verify an unresponsive Furnish instance for this directory. Close its server window if you recognize it, or set FURNISH_PORT to another port.`:e.message);
 process.exitCode=1;
});
server.on('close',()=>stopRecovery?.());
server.on('listening',async()=>{
 try{stopRecovery=await recovery.start(instance,server.address().port);}catch(error){console.error('Furnish recovery control unavailable: '+error.message);}
 console.log(`Furnish: ${url}`);
 console.log('Close this window or press Ctrl+C to stop the server.');
 openPage();
});
function listen(){if(runtime.ownerStopped(instance.root,instance.owner)){process.exit(0);return;}server.listen(port,'127.0.0.1');}
listen();
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
// Only a real IPC parent (the desktop host) can request this graceful shutdown.
if(process.send){
 const shutdown=()=>server.close(()=>process.exit(0));
 process.on('message',message=>{if(message?.type==='furnish-shutdown')shutdown();});
 process.on('disconnect',shutdown);
}
