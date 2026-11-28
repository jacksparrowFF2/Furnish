/* Natural process-group RSS and macOS physical footprint, with no forced GC. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),{freePort}=require('./tauri-launch.cjs'),{snapshot}=require('./tauri-memory.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(label,workspace,directory,source){
 const revision=label==='before'?(process.env.FURNISH_RUNTIME_BASELINE||'f076ba37'):null;
 const files=(process.env.FURNISH_RUNTIME_FILES||'scripts/server-runtime.cjs,scripts/serve.cjs').split(',');
 if(revision)for(const name of files)fs.writeFileSync(path.join(workspace,name),execFileSync('git',['show',revision+':'+name],{cwd:root,maxBuffer:20000000}));
 const codeHashes=Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(workspace,name))).digest('hex')]));
 const env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:path.join(directory,'profile'),FURNISH_PORT:String(await freePort()),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:require('./launch-desktop.cjs').desktopExecutable(root),env,timeout:60000}),records=[],errors=[],timeline=[];
 let peakTimer=null,peakPhase='starting';const peakIntervalMs=2000;
 function reading(stage,i){const rss=snapshot(app.process().pid),row={time:new Date().toISOString(),phase:peakPhase,rss};if(process.platform==='darwin'){const target=path.join(directory,stage+'-'+i+'-footprint.json');try{execFileSync('/usr/bin/footprint',['-f','bytes','--noCategories','-j',target,...rss.processes.map(x=>String(x.pid))],{stdio:'pipe',timeout:20000});const physical=JSON.parse(fs.readFileSync(target));row.physicalMiB=physical['total footprint']/1048576;row.physicalProcesses=physical.processes.map(x=>({pid:x.pid,name:x.name,bytes:x.footprint}));row.footprintErrors=physical.errors;}catch(e){row.physicalError=e.message;}}return row;}
 try{
  const page=await app.firstWindow();await page.exposeFunction('__runtimeMemoryPhase',phase=>{peakPhase=phase;});page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>window.FurnishRepository&&typeof repositoryBooting!=='undefined'&&!repositoryBooting,null,{timeout:120000});
  await ready();
  await page.addInitScript(()=>{
   if(!globalThis.GPUDevice)return;
   const rows=[],sizes={rgba32float:16,rgba16float:8,rg32float:8,r32float:4,rgba8unorm:4,'bgra8unorm':4};
   for(const kind of ['Buffer','Texture']){const proto=GPUDevice.prototype,key='create'+kind,create=proto[key];proto[key]=function(d){const r=create.call(this,d),size=d.size;const row={kind,label:d.label||'',bytes:kind==='Buffer'?size:((Array.isArray(size)?size[0]:size.width)*(Array.isArray(size)?size[1]||1:size.height||1)*(Array.isArray(size)?size[2]||1:size.depthOrArrayLayers||1)*(sizes[d.format]||4)),format:d.format,size,alive:true};rows.push(row);const destroy=r.destroy.bind(r);r.destroy=()=>{row.alive=false;return destroy();};return r;};}
   globalThis.__gpuMemory=()=>({liveBytes:rows.filter(x=>x.alive).reduce((a,x)=>a+x.bytes,0),resources:rows.filter(x=>x.alive).sort((a,b)=>b.bytes-a.bytes),allocatedBytes:rows.reduce((a,x)=>a+x.bytes,0)});
  });
  await page.addInitScript(()=>localStorage.setItem('furnish-observation-v1','smooth'));await page.reload();await ready();
  async function sample(stage){
   const readings=[];
   for(let i=0;i<3;i++){
    const row=reading(stage,i);
    readings.push(row);if(i<2)await pause(1000);
   }
   const state=await page.evaluate(()=>({planId:PLAN.id,furniture:state.furniture.length,view:viewMode,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,progressiveStatus:document.querySelector('#progressive-status')?.textContent,settledImage:(()=>{const i=document.querySelector('#progressive-image');return i?[i.width,i.height]:null;})(),progressiveCanvases:Array.from(document.querySelector('#progressive-frame')?.contentDocument?.querySelectorAll('canvas')||[],c=>[c.width,c.height])}));
   const frame=page.frames().find(f=>f.url().includes('lighting-preview.html'));const gpu=frame?await frame.evaluate(()=>globalThis.__gpuMemory?.()):null;
   if(stage==='3d-detail'){
    const png=await page.evaluate(async()=>{const image=document.querySelector('#progressive-image');if(!image)return document.querySelector('#progressive-frame').contentDocument.querySelector('canvas').toDataURL('image/png');const blob=await(await fetch(image.dataset.source)).blob();return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});});fs.writeFileSync(path.join(directory,'detail-native.png'),Buffer.from(png.split(',')[1],'base64'));
    await page.screenshot({path:path.join(directory,'detail.png')});await page.locator('#progressive-image,#progressive-frame').screenshot({path:path.join(directory,'detail-frame.png')});}
   records.push({stage,state,readings,gpu});console.log(label+' '+stage+' RSS '+Math.round(readings[1].rss.attributedRssMiB)+' MiB; footprint '+Math.round(readings[1].physicalMiB)+' MiB');
  }
  await page.evaluate(()=>{
   window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.channel==='furnish-lighting-preview'){window.__runtimeMemoryPhase(e.data.message||e.data.type);if(e.data.type==='released')window.releaseAudits.push({releasedCpuBytes:e.data.releasedCpuBytes||0});}});
   const original=View3D.progressiveScene;window.sceneAudits=[];window.releaseAudits=[];View3D.progressiveScene=async function(...args){
    const T=await import(JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports.three),clone=T.BufferGeometry.prototype.clone,audit={clones:0,attributeBytes:0,uniqueSourceGeometries:0},seen=new WeakSet();
    T.BufferGeometry.prototype.clone=function(){const copy=clone.call(this);audit.clones++;if(!seen.has(this)){seen.add(this);audit.uniqueSourceGeometries++;}const buffers=new Set();for(const attr of [copy.index,...Object.values(copy.attributes),...Object.values(copy.morphAttributes).flat()])if(attr)buffers.add((attr.array||attr.data?.array).buffer);for(const buffer of buffers)audit.attributeBytes+=buffer.byteLength;return copy;};
    let data;try{data=await original.apply(this,args);}finally{T.BufferGeometry.prototype.clone=clone;}
    const digest=await crypto.subtle.digest('SHA-256',data.buffer);sceneAudits.push({hash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),bytes:data.buffer.byteLength,camera:data.camera,environment:data.environment,lighting:data.lighting,exportAudit:audit});return data;
   };
  });
  if(!process.argv.includes('--3d-only')){await pause(30000);await sample('2d-idle');}
  if(!process.argv.includes('--2d-only')){
   await page.evaluate(()=>setView('3d'));await page.waitForFunction(()=>viewMode==='3d'&&!switching);await pause(6000);await sample('3d-smooth');
   if(process.argv.includes('--peak')){peakPhase='before-export';timeline.push(reading('timeline',0));peakTimer=setInterval(()=>timeline.push(reading('timeline',timeline.length)),peakIntervalMs);}
   await page.locator('#progressive-mode').selectOption('detail');await page.waitForFunction(()=>document.querySelector('#progressive-status')?.textContent.includes('已收敛')||document.querySelector('#progressive-controls')?.dataset.state==='fallback',null,{timeout:180000});if(await page.locator('#progressive-controls').getAttribute('data-state')==='fallback')throw Error('Progressive fallback is not a comparable fine render');await pause(6000);await sample('3d-detail');if(peakTimer){clearInterval(peakTimer);peakTimer=null;}
   if(!process.argv.includes('--3d-only')){await page.evaluate(()=>setView('2d'));await pause(20000);await sample('return-2d');}
  }
  const unchanged=crypto.createHash('sha256').update(fs.readFileSync(source.source)).digest('hex')===source.sourceHash;
  const result={label,peakIntervalMs,maxSampledPhysicalMiB:timeline.length?Math.max(...timeline.map(x=>x.physicalMiB||0)):null,timeline,revision:revision||'working-tree',codeHashes,workspace,source,sourceUnchanged:unchanged,sceneAudits:await page.evaluate(()=>sceneAudits),releaseAudits:await page.evaluate(()=>releaseAudits),records,errors,forcedGC:false};fs.writeFileSync(path.join(directory,'runtime-memory.json'),JSON.stringify(result,null,2));await page.screenshot({path:path.join(directory,'final.png')});console.log(path.join(directory,'runtime-memory.json'));
  if(errors.length||!unchanged||process.platform==='darwin'&&[...timeline,...records.flatMap(r=>r.readings)].some(r=>!Number.isFinite(r.physicalMiB)||r.footprintErrors?.length))throw Error('Invalid run; inspect runtime-memory.json');
 }finally{if(peakTimer)clearInterval(peakTimer);await app.close();}
}
(async()=>{
 const A=require('./lib/test-artifacts.cjs'),job=A.createRun({parent:path.join(root,'verification.noindex/runtime-memory'),prefix:'profile-'});let passed=false;
 try{
  const sourceRoot=path.resolve(process.env.FURNISH_RUNTIME_SOURCE_ROOT||root),file=path.resolve(process.env.FURNISH_TEST_PROJECT||require('./workspace-files.cjs').create(sourceRoot).info({inspect:false}).file),source={source:file,sourceHash:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},options={directories:['src','styles','vendor','assets','scripts'],files:['index.html','manifest.webmanifest']};
  // Freeze all shared code once, before any variant starts. Only explicit files
  // differ between A and B. Owned source copies are removed after all apps close.
  const frozen=job.workspace('baseline',sourceRoot,options);job.copy(file,'baseline/projects/workspace.furnish.json',{disposable:false});for(const name of (process.env.FURNISH_RUNTIME_FILES||'scripts/server-runtime.cjs,scripts/serve.cjs').split(','))fs.copyFileSync(path.join(root,name),path.join(frozen,name));
  let i=0;for(const label of (process.env.FURNISH_RUNTIME_VARIANTS||'before,after').split(',')){
   const relative='run-'+i++,workspace=job.workspace(relative+'/workspace',frozen,options),directory=path.dirname(workspace);job.discard(relative+'/profile');
   await run(label,workspace,directory,source);
  }
  passed=true;
 }catch(error){fs.writeFileSync(path.join(job.dir,'failure.json'),JSON.stringify({message:error.message,stack:error.stack},null,2));throw error;}finally{job.finish(passed);console.log('Evidence: '+job.dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
