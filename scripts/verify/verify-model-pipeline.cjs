/* Rebuild and validate in a disposable COPY. Never publishes into the caller's repo. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const project=path.resolve(__dirname,'../..'),B=require('../blender-server.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function options(args){
 const profile=args[0],device=args[1]||'auto';
 if(profile!=='washer-tg10k60w'||!['auto','gpu','cpu'].includes(device)||args.length>2)throw Error('Usage: node scripts/verify/verify-model-pipeline.cjs washer-tg10k60w [auto|gpu|cpu] (only this profile is integrated)');
 return {profile,device};
}
function execute(exe,args,cwd,log,env=process.env,timeout=10*60*1000){
 return new Promise((resolve,reject)=>{
  const stream=fs.createWriteStream(log),child=cp.spawn(exe,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',error;
  const timer=setTimeout(()=>{error=Error('Command timed out; see '+log);child.kill();},timeout);
  child.stdout.on('data',b=>{stdout+=b;stream.write(b);});child.stderr.pipe(stream,{end:false});
  child.on('error',e=>{error=e;});child.on('close',code=>{clearTimeout(timer);stream.end();if(error||code!==0)reject(error||Error('Exit '+code+'; see '+log));else resolve(stdout);});
 });
}
// Store launcher may return before Python completes. A result file is required.
async function blenderCheck(blender,script,args,result,cwd,log){
 let failure;const child=execute(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',script,'--',...args],cwd,log).catch(e=>{failure=e;});
 const deadline=Date.now()+120000;
 while(!fs.existsSync(result)){if(failure)throw failure;if(Date.now()>deadline)throw Error('Blender result missing; see '+log);await new Promise(r=>setTimeout(r,250));}
 // File completion is the protocol; consume the child promise even for launchers.
 await child;if(failure)throw failure;const data=JSON.parse(fs.readFileSync(result));if(!data.passed)throw Error('Blender check failed: '+result);return data;
}
async function main(args=process.argv.slice(2)){
 const {profile,device}=options(args),blender=B.findBlender();if(!blender)throw Error('Blender not found');
 const parent=path.join(project,'output/model-pipeline');fs.mkdirSync(parent,{recursive:true});const run=fs.mkdtempSync(path.join(parent,profile+'-')),root=path.join(run,'workspace');
 const protectedFiles=['src/data/'+profile+'-blender-asset.js','assets/models/'+profile+'/'+profile+'-v1.blend','assets/models/'+profile+'/'+profile+'-v1.glb','projects/workspace.furnish.json'];
 const before=Object.fromEntries(protectedFiles.map(p=>[p,hash(path.join(project,p))]));
 const report={passed:false,profile,device,blender,revision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:project,encoding:'utf8',windowsHide:true}).trim(),started:new Date().toISOString(),run,stages:[],sourceHashes:before};
 const save=()=>fs.writeFileSync(path.join(run,'report.json'),JSON.stringify(report,null,2));
 async function stage(name,work){const row={name,started:new Date().toISOString(),passed:false};report.stages.push(row);save();console.log(name);try{row.result=await work();row.passed=true;}catch(e){row.error=e.message;report.failedStage=name;throw e;}finally{row.finished=new Date().toISOString();save();}}
 const env={...process.env,FURNISH_BLENDER:blender};
 const node=(name,args)=>execute(process.execPath,args,root,path.join(run,name+'.log'),env);
 try{
  await stage('isolate',async()=>{
   fs.mkdirSync(root);for(const name of ['scripts','src','styles','assets','vendor','templates','tests'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
   fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'));fs.copyFileSync(path.join(project,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));return {root};
  });
  const authored=path.join(root,'output/authored'),glb=path.join(authored,profile+'-v1.glb');
  await stage('author-preflight',async()=>JSON.parse((await node('author',['scripts/blender-asset.cjs','author-'+profile,authored])).trim()));
  await stage('preflight-negative',async()=>{
   const spec=path.join(run,'washer-spec.json');fs.writeFileSync(spec,JSON.stringify(require(path.join(root,'src/core/washer-motion-core.js')).spec({type:'washer_littleswan_tg10k60w'})));
   return blenderCheck(blender,path.join(root,'scripts/verify/verify-model-preflight.py'),[path.join(authored,profile+'-v1.blend'),spec,path.join(run,'preflight-negative.json')],path.join(run,'preflight-negative.json'),root,path.join(run,'preflight-negative.log'));
  });
  await stage('publish',async()=>{
   const result=JSON.parse((await node('publish',['scripts/blender-asset.cjs','publish-'+profile,glb])).trim());
   for(const ext of ['blend','glb'])fs.copyFileSync(path.join(authored,profile+'-v1.'+ext),path.join(root,'assets/models',profile,profile+'-v1.'+ext));
   return {...result,glbSha256:hash(glb),blendSha256:hash(path.join(authored,profile+'-v1.blend')),runtimeSha256:hash(path.join(root,'src/data',profile+'-blender-asset.js'))};
  });
  await stage('geometry-state',async()=>{
   const tests=['test-blender-washer-materials','test-blender-washer-tg10k60w','test-washer-front-confirmation','test-washer-project-v35'];
   for(const test of tests)await node(test,['tests/'+test+'.cjs']);return {passed:true,tests};
  });
  let browserRun;
  await stage('http-file-production',async()=>{
   const stdout=await node('browser',['scripts/verify/verify-blender-appliance.cjs','--tg10k60w']);
   browserRun=stdout.match(/PASS pilot browser: (.+)/)?.[1]?.trim();if(!browserRun||!path.resolve(browserRun).startsWith(root+path.sep))throw Error('Browser output escaped isolated workspace');
   return {run:browserRun,...JSON.parse(fs.readFileSync(path.join(browserRun,'summary.json')))};
  });
  await stage('blender-production-readback',()=>blenderCheck(blender,path.join(root,'scripts/verify/verify-blender-appliance.py'),[browserRun,'--tg10k60w'],path.join(browserRun,'blender-result.json'),root,path.join(run,'readback.log')));
  const studio=path.join(run,'studio');
  await stage('studio-production-export',async()=>{await node('studio',[path.join(project,'scripts/verify/verify-model-studio.cjs'),root,studio]);return JSON.parse(fs.readFileSync(path.join(studio,'studio.json')));});
  const {render}=require('./verify-model-render.cjs');
  for(const view of ['front','oblique','open'])await stage('render-'+view,()=>render(root,path.join(studio,view+'.glb'),path.join(studio,view),device));
  await stage('downloaded-blend-reopen',()=>blenderCheck(blender,path.join(root,'scripts/verify/verify-model-reopen.py'),[run],path.join(run,'reopen.json'),root,path.join(run,'reopen.log')));
  report.passed=true;
 }finally{
  report.sourceUnchanged=protectedFiles.every(p=>hash(path.join(project,p))===before[p]);
  report.finished=new Date().toISOString();if(!report.sourceUnchanged){report.passed=false;report.sourceWarning='Source changed during the run; no source writes were requested by this runner.';}save();console.log('Report: '+path.join(run,'report.json'));
 }
 if(!report.passed)throw Error('Pipeline did not pass; inspect report');return report;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={options,main};
