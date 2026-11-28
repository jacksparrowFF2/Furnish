/* Experimental shells always start from an explicitly marked private workspace. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),marker='.furnish-tauri-workspace.json';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function freePort(){const s=net.createServer();await new Promise((r,j)=>s.once('error',j).listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function prepare({sourceRoot=root,source=process.env.FURNISH_TEST_PROJECT||require('./workspace-files.cjs').create(sourceRoot).info({inspect:false}).file}={}){
 const job=require('./lib/test-artifacts.cjs').createRun({parent:path.join(root,'verification.noindex/tauri-comparison'),prefix:'compare-',env:{...process.env,FURNISH_KEEP_TEST_WORKSPACES:'1'}});
 const before=hash(source),workspace=path.join(job.dir,'workspace');fs.mkdirSync(workspace,{recursive:true});
 for(const name of ['src','styles','vendor','assets','index.html','manifest.webmanifest'])if(fs.existsSync(path.join(sourceRoot,name)))job.copy(path.join(sourceRoot,name),path.join('workspace',name));
 job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
 for(const name of require('./package-desktop.cjs').runtimeFiles)job.copy(path.join(sourceRoot,'scripts',name),path.join('workspace/scripts',name));
 const metadata={version:1,source:path.resolve(source),sourceHash:before,createdAt:new Date().toISOString()};
 fs.writeFileSync(path.join(workspace,marker),JSON.stringify(metadata,null,2));
 if(hash(source)!==before)throw Error('源工作区在复制期间发生变化，请重新建立对照副本');
 job.finish(true);return workspace;
}
function verifyWorkspace(workspace){
 const data=JSON.parse(fs.readFileSync(path.join(workspace,marker),'utf8'));
 if(data.version!==1||!data.sourceHash)throw Error('Not a Tauri comparison workspace');
 return require('../desktop/policy.cjs').workspaceRoot({appRoot:workspace});
}
function lock(workspace){
 const file=path.join(workspace,'.tauri-compare.lock');
 if(fs.existsSync(file)){
  const old=JSON.parse(fs.readFileSync(file,'utf8'));let alive=true;
  try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}
  if(alive)throw Error('该对照副本正在使用，先退出另一个对照应用');fs.unlinkSync(file);
 }
 fs.writeFileSync(file,JSON.stringify({pid:process.pid}),{flag:'wx'});
 return ()=>fs.unlinkSync(file);
}
async function launch({workspace,engine='tauri',probe,executable}={}){
 if(engine==='tauri'&&process.platform==='darwin'&&Number(require('node:os').release().split('.')[0])<23)throw Error('Tauri 对照版需要 macOS 14+，以隔离 WebKit 缓存');
 if(!['tauri','electron'].includes(engine))throw Error('engine must be tauri or electron');
 // Check the executable before creating a potentially large workspace snapshot.
 const macApp=engine==='tauri'&&process.platform==='darwin'&&!executable?JSON.parse(fs.readFileSync(path.join(root,'output/tauri-build.noindex/current-app.json'),'utf8')).bundle:null;
 const binary=macApp||executable|| (engine==='tauri'?path.join(root,'output/tauri-build.noindex/release/furnish-tauri'+(process.platform==='win32'?'.exe':'')):require('electron'));
 if(!fs.existsSync(binary))throw Error('找不到 '+binary+'；请先 npm run tauri:build');
 workspace=verifyWorkspace(path.resolve(workspace||prepare()));
 const unlock=lock(workspace),run=path.dirname(workspace);let backend,child,exportsDirectory;
 try{
  const metadata=JSON.parse(fs.readFileSync(path.join(workspace,marker)));
  const port=metadata.port||await freePort();
  if(!metadata.port){metadata.port=port;fs.writeFileSync(path.join(workspace,marker),JSON.stringify(metadata,null,2));}
  const profile=path.join(run,'profile-'+engine);fs.mkdirSync(profile,{recursive:true});
  const profileIdentity=metadata.legacyProfileRoot?path.join(metadata.legacyProfileRoot,'profile-'+engine):profile;
  const env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:profile,FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1',FURNISH_TAURI_URL:`http://127.0.0.1:${port}/`,FURNISH_TAURI_PROFILE:profile,FURNISH_TAURI_PROFILE_ID:crypto.createHash('sha256').update(profileIdentity).digest('hex').slice(0,32)};
  if(probe){env.FURNISH_TAURI_PROBE=path.resolve(probe);env.FURNISH_TAURI_PROBE_SOURCE=fs.readFileSync(path.resolve(probe),'utf8');}else{delete env.FURNISH_TAURI_PROBE;delete env.FURNISH_TAURI_PROBE_SOURCE;}
  if(engine==='tauri'){exportsDirectory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'furnish-tauri-exports-'));env.FURNISH_TAURI_EXPORTS=exportsDirectory;}
  delete env.ELECTRON_RUN_AS_NODE;
  if(engine==='tauri')backend=await require('../desktop/backend.cjs').connect({root:workspace,executable:process.execPath,port});
  const stamp=Date.now(),stdoutFile=path.join(run,'tauri-native-'+stamp+'-stdout.log'),stderrFile=path.join(run,'tauri-native-'+stamp+'-stderr.log');
  const args=macApp?['-n','-W','--stdout',stdoutFile,'--stderr',stderrFile,...Object.entries(env).filter(([key])=>key.startsWith('FURNISH_')).flatMap(([key,value])=>['--env',key+'='+value]),macApp]:engine==='electron'?[path.join(root,probe?'tests/helpers/tauri-electron-host.cjs':'desktop/main.cjs')]:[];
  child=spawn(macApp?'/usr/bin/open':binary,args,{env,stdio:['ignore','pipe','pipe']});
  const started={engine,...(macApp?{bundle:macApp,stdoutFile,stderrFile,exportsDirectory}:{}),pid:child.pid,launcherPid:process.pid,workspace,profile,port,source:JSON.parse(fs.readFileSync(path.join(workspace,marker))),startedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(run,engine+'-launch.json'),JSON.stringify(started,null,2));
  console.log(JSON.stringify(started,null,2));
  child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
  let outOffset=0,errOffset=0;
  const pump=()=>{for(const [file,stream,isOut]of [[stdoutFile,process.stdout,true],[stderrFile,process.stderr,false]]){if(!fs.existsSync(file))continue;const data=fs.readFileSync(file),offset=isOut?outOffset:errOffset;if(data.length<offset)throw Error('Native log truncated');const chunk=data.subarray(offset);if(isOut){outOffset=data.length;const match=chunk.toString().match(/FURNISH_HOST_PID=(\d+)/);if(match){started.pid=Number(match[1]);fs.writeFileSync(path.join(run,engine+'-launch.json'),JSON.stringify(started,null,2));}}else errOffset=data.length;if(chunk.length)stream.write(chunk);}};
  const logTimer=macApp?setInterval(pump,100):null;
  const stop=()=>{if(macApp&&started.pid!==child.pid){try{process.kill(started.pid,'SIGTERM');}catch{}}child.kill('SIGTERM');};process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try{return await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal,...started}));});}
  finally{if(logTimer){clearInterval(logTimer);pump();}process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
 }finally{try{try{if(exportsDirectory)fs.cpSync(exportsDirectory,path.join(run,'exports-tauri'),{recursive:true,force:false,errorOnExist:true});}finally{await backend?.close();}}finally{unlock();}}
}
async function main(){
 const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);if(i<0)return;const v=args[i+1];if(!v||v.startsWith('--'))throw Error('Missing '+name);return v;};
 const result=await launch({workspace:get('--workspace'),engine:get('--engine')||'tauri',probe:get('--probe')});process.exitCode=result.code??1;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={prepare,verifyWorkspace,lock,launch,freePort};
