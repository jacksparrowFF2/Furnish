/* The application remains the source of production geometry and verification rules. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const Runtime=require('./runtime.cjs');
function rootOf(given){
 const candidates=given?[given]:[process.env.FURNISH_ROOT,process.cwd(),path.resolve(Runtime.plugin,'../..')].filter(Boolean);
 for(const start of candidates){let dir=path.resolve(start);while(true){if(fs.existsSync(path.join(dir,'scripts/lib/model-profiles.cjs'))&&fs.existsSync(path.join(dir,'src/core/product-rules.js')))return fs.realpathSync(dir);if(given)break;const up=path.dirname(dir);if(up===dir)break;dir=up;}}
 throw Error('Furnish checkout not found. Pass root or set FURNISH_ROOT; cached plugins cannot assume their checkout path.');
}
function jobDirectory(data,id){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id||''))throw Error('Invalid verification job id');return path.join(data,'verification',id);}
function status(data,id){const dir=jobDirectory(data,id),job=JSON.parse(fs.readFileSync(path.join(dir,'job.json'),'utf8'));if(job.state==='running'){try{process.kill(job.pid,0);}catch(e){if(e.code==='ESRCH'){job.state='interrupted';job.passed=false;job.error='Verification process exited without a final receipt';}}}return job;}
async function execute(a,{data=Runtime.dataDirectory()}={}){
 if(['status','collect'].includes(a.action)){
  const job=status(data,a.id);if(a.action==='collect'){const log=path.join(jobDirectory(data,a.id),'verify.log');job.logTail=fs.existsSync(log)?fs.readFileSync(log,'utf8').slice(-16000):'';}
  return job;
 }
 let binding;try{binding=JSON.parse(fs.readFileSync(path.join(data,'furnish.json'),'utf8'));}catch{}
 const root=rootOf(a.root||binding?.root);
 if(a.action==='bind'){fs.mkdirSync(data,{recursive:true});fs.writeFileSync(path.join(data,'furnish.json'),JSON.stringify({root},null,2));return {ok:true,root,bound:true};}
 const registry=require(path.join(root,'scripts/lib/model-profiles.cjs'));
 const profiles=registry.profiles();
 if(a.action==='profiles')return {ok:true,root,profiles:profiles.map(p=>({id:p.id,type:p.type,name:p.fixture.name,route:p.route,tests:p.tests}))};
 if(a.action==='doctor'){
  const blender=require(path.join(root,'scripts/blender-server.cjs')).findBlender();
  return {ok:!!blender,root,blender,profileCount:profiles.length,productionVerification:'scripts/verify/verify-model-pipeline.cjs',visualReview:'docs/BLENDER-VISUAL-REVIEW.md'};
 }
 if(a.action!=='verify')throw Error('Unknown Furnish action');
 if(!profiles.some(p=>p.id===a.profile))throw Error('Choose one registered profile id from profiles; batch all is not exposed.');
 const device=a.device||'auto';if(!['auto','gpu','cpu'].includes(device))throw Error('device must be auto, gpu or cpu');
 const id=crypto.randomUUID(),dir=jobDirectory(data,id);fs.mkdirSync(dir,{recursive:true});
 const initial={id,state:'starting',passed:null,root,profile:a.profile,device,started:new Date().toISOString(),log:path.join(dir,'verify.log')};
 fs.writeFileSync(path.join(dir,'job.json'),JSON.stringify(initial,null,2));
 const fd=fs.openSync(initial.log,'a'),child=spawn(process.execPath,[path.join(__dirname,'verify-worker.cjs'),root,a.profile,device,dir],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',fd,fd],env:process.env});
 let error;child.once('error',e=>{error=e;fs.writeFileSync(path.join(dir,'job.json'),JSON.stringify({...initial,state:'failed',passed:false,error:e.message}));});
 await new Promise(resolve=>{child.once('spawn',resolve);child.once('error',resolve);});fs.closeSync(fd);child.unref();if(error)throw error;
 return {...initial,state:'running',pid:child.pid};
}
module.exports={execute,rootOf,status};
