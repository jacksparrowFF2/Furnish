/* Native macOS startup without FURNISH_DESKTOP_ROOT; private data and profile. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),A=require('./lib/test-artifacts.cjs');
async function freePort(){const server=require('node:http').createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}
function checkPrivateBundle(app){
 if(fs.realpathSync(app)!==app)throw Error('Expected a private app copy before signing');
 for(const entry of fs.readdirSync(app,{recursive:true,withFileTypes:true})){
  if(!entry.isSymbolicLink())continue;
  const link=path.join(entry.parentPath,entry.name),target=fs.realpathSync(link);
  if(!target.startsWith(app+path.sep))throw Error('Test bundle link points outside the private copy: '+link);
 }
}
async function main(){
 if(process.platform!=='darwin')throw Error('This acceptance requires a real macOS desktop');
 const executable=fs.realpathSync(require('./launch-desktop.cjs').desktopExecutable(root)),bundle=path.resolve(path.dirname(executable),'../..');
 if(path.extname(bundle)!=='.app'||!fs.statSync(bundle).isDirectory())throw Error('Expected a macOS .app bundle');
 // Retain this signed runtime and screenshots as evidence; never sweep bundles
 // containing framework symlinks with the generic disposable-file cleaner.
 const job=A.createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'native-startup-',env:{...process.env,FURNISH_KEEP_TEST_WORKSPACES:'1'}});
 let passed=false,desktop;
 try{
  const isolated=job.workspace('workspace',root),out=job.workspace('bundle space #',root);
  const app=path.join(out,'Furnish.app');
  fs.cpSync(bundle,app,{recursive:true,verbatimSymlinks:true,mode:fs.constants.COPYFILE_FICLONE});
  checkPrivateBundle(app);
  const policy=path.join(app,'Contents/Resources/app/policy.cjs');
  if(fs.realpathSync(policy)!==policy)throw Error('Expected the policy file inside the private app copy');
  fs.copyFileSync(path.join(root,'desktop/policy.cjs'),policy);
  execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-','--timestamp=none',app],{stdio:'pipe'});
  execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'pipe'});
  const config=path.join(out,'furnish-desktop.json'),results=[];
  const shortcuts=path.join(job.dir,'Applications');fs.mkdirSync(shortcuts);
  const shortcut=path.join(shortcuts,'Furnish.app');fs.symlinkSync(app,shortcut,'dir');
  for(const mode of ['configured','shortcut','portable']){
   const workspace=mode==='portable'?out:isolated;
   if(mode!=='portable')fs.writeFileSync(config,JSON.stringify({root:workspace}));else fs.unlinkSync(config);
   const project=path.join(workspace,'projects/workspace.furnish.json'),before=crypto.createHash('sha256').update(fs.readFileSync(project)).digest('hex');
   const env={...process.env,FURNISH_DESKTOP_PROFILE:path.join(job.dir,'profile-'+mode),FURNISH_PORT:String(await freePort()),FURNISH_MCP_DISABLE:'1'};
   delete env.FURNISH_DESKTOP_ROOT;delete env.ELECTRON_RUN_AS_NODE;delete env.ELECTRON_FORCE_IS_PACKAGED;
   desktop=await _electron.launch({executablePath:path.join(mode==='shortcut'?shortcut:app,'Contents/MacOS/Electron'),cwd:'/private/tmp',env,timeout:60000});
   const page=await desktop.firstWindow();
   await page.waitForURL(/^http:\/\/127\.0\.0\.1:/);
   await page.locator('#repository-loading').waitFor({state:'hidden',timeout:60000});
   await page.waitForFunction(()=>typeof repositoryClient!=='undefined'&&repositoryClient.status.mode==='saved');
   const state=await desktop.evaluate(({app})=>({isPackaged:app.isPackaged,appPath:app.getAppPath(),profile:app.getPath('userData')}));
   assert.equal(state.isPackaged,false,'Exercise the stock Electron name, without forcing the flag');
   const expected=require('../src/core/repository-core.js').parse(JSON.parse(fs.readFileSync(project,'utf8')));
   assert.equal(await page.evaluate(()=>PLAN.id),expected.planId);
   assert.equal(await page.evaluate(()=>state.furniture.length),expected.work[expected.planId].furniture.length);
   const id=crypto.createHash('sha256').update(fs.realpathSync(workspace)).digest('hex').slice(0,16);
   // The configured profile is independent of the daily desktop cache.
   assert.equal(state.profile,env.FURNISH_DESKTOP_PROFILE);
   await page.screenshot({path:path.join(job.dir,mode+'.png')});
   await desktop.close();desktop=null;
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync(project)).digest('hex'),before);
   results.push({mode,...state,workspaceId:id,sourceUnchanged:true,rootOverride:false});
  }
  fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify({passed:true,results},null,2));
  console.log('PASS native configured, symlink shortcut and portable .app startup without root override; evidence: '+job.dir);
  passed=true;
 }finally{if(desktop)await desktop.close();job.finish(passed);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
