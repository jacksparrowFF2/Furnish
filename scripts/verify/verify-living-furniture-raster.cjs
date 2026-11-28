'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const {_electron}=require('playwright');
const artifacts=require('../lib/test-artifacts.cjs');
const {runtimeFiles}=require('../package-desktop.cjs');
const {desktopExecutable}=require('../launch-desktop.cjs');

const root=path.resolve(__dirname,'../..');
const [project,baseline]=process.argv.slice(2);
const files=['index.html','src/ui/canvas-interactions.js','src/render/yeswood-sofa-model.js','src/render/cherry-coffee-table-model.js'];
const camera=process.env.FURNISH_RASTER_CAMERA?JSON.parse(process.env.FURNISH_RASTER_CAMERA):
 {mode:'orbit',position:{x:9530,y:5320,z:1470},target:{x:7600,y:3800,z:610},horizontalFov:51};
const defaultTargets=['fmv5bzynf3','fmvglvcws1'];
const targets=(process.env.FURNISH_RASTER_TARGETS||defaultTargets.join(',')).split(',');
const customTargets=!!process.env.FURNISH_RASTER_TARGETS;
const daylightFile='src/render/interior-daylight.js';
const secondCamera=process.env.FURNISH_RASTER_SECOND_CAMERA?JSON.parse(process.env.FURNISH_RASTER_SECOND_CAMERA):null;
const gestureCamera=process.env.FURNISH_RASTER_GESTURE_CAMERA?JSON.parse(process.env.FURNISH_RASTER_GESTURE_CAMERA):null;
const rooms=process.env.FURNISH_RASTER_ROOMS?JSON.parse(fs.readFileSync(process.env.FURNISH_RASTER_ROOMS,'utf8')):null;
const trialGTAO=process.env.FURNISH_RASTER_GTAO==='1';
const trialBloom=process.env.FURNISH_RASTER_BLOOM==='1';
const trialSMAA=process.env.FURNISH_RASTER_SMAA==='1';
const revisionRound=process.env.FURNISH_RASTER_ROUND||'';
const scenePreset=process.env.FURNISH_RASTER_SCENE||'';
const traceRotation=process.env.FURNISH_RASTER_TRACE_ROTATION==='1';
const traceDrag=process.env.FURNISH_RASTER_TRACE_DRAG==='1';
const kitchenRotation=revisionRound==='kitchen-rotation';
const furnitureDrag=revisionRound==='furniture-drag';
const dragSnapToggle=revisionRound==='drag-snap-toggle';
const diagnose=revisionRound==='bedroom-rotation'||kitchenRotation||furnitureDrag||dragSnapToggle||traceDrag;
if(diagnose)files.push('src/ui/workflow-tools.js');
if(furnitureDrag)files.push('src/core/snapping.js','src/core/cabinet-core.js','src/core/layout-geometry.js');
if(dragSnapToggle)files.push('src/app.js','src/core/snapping.js');
if(revisionRound==='latex-paint')files.push('src/render/ceiling-model.js');
const kitchenRound=revisionRound==='kitchen-light';
const ceilingAreaRound=revisionRound==='ceiling-area';
const kitchenProbes=kitchenRound&&process.env.FURNISH_RASTER_KITCHEN_PROBES==='1';
if(kitchenRound||ceilingAreaRound)files.push('src/render/downlight-model.js','src/render/bath-heater-model.js');
const bedRound=revisionRound==='bed-bedding';
if(bedRound)files.push('src/render/basic-furniture-model.js','src/core/product-rules.js');
const finishRound=revisionRound==='finish-surfaces';
const windowRound=revisionRound==='window-glass';
const washTrial=revisionRound==='bedside-wash';
if(washTrial)files.push('src/render/cove-light-model.js','src/render/downlight-model.js');
const materialRound=revisionRound==='material-response';
const captureTrajectory=trialSMAA||materialRound||revisionRound==='thin-edges';
const nightTrial=trialBloom||trialSMAA||!!revisionRound&&scenePreset!=='day';
const trialEffect=trialGTAO?'viewport-gtao':trialBloom?'viewport-bloom':trialSMAA?'viewport-smaa':null;
const halfTrack=materialRound?.095:.052;
const trackAngles=Array.from({length:29},(_,i)=>-halfTrack+(i/28)*2*halfTrack);
const trackCrops=materialRound?{
 living:[['cloth',[.065,.31,.51,.55]],['stone',[.25,.55,.57,.42]]],
 dining:[['cabinet',[.63,.28,.36,.62]]]
}:{
 living:[['window',[.485,.405,.27,.34]],['strip',[.26,.135,.56,.245]]],
 dining:[['seam',[.663,.258,.30,.425]]]
};
const panCamera=rooms||process.env.FURNISH_RASTER_PAN==='1';
const previewHours=(process.env.FURNISH_RASTER_HOURS||'').split(',').filter(Boolean).map(Number);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFileSync(file);
const dragVariants=['both-on','snap-off','collision-off','both-off'];
const variants=(process.env.FURNISH_RASTER_RUNS||(dragSnapToggle?'both-on,snap-off,collision-off,both-off,snap-off,both-on':
 (trialEffect||revisionRound)?'before,after,after,before':'before,after,no-sheen,no-sheen,after,before')).split(',');
const collectSource=()=>Object.fromEntries([...files,daylightFile].map(file=>[file,read(path.join(root,file))]));
const summary=values=>{
 const sorted=[...values].sort((a,b)=>a-b);
 const percentile=p=>sorted[Math.ceil(sorted.length*p)-1];
 return {n:sorted.length,p50:percentile(.5),p95:percentile(.95),max:sorted.at(-1)};
};

async function measure(page,cdp,start,offset,check,modifiers=0){
 await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...start,modifiers});
 await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1,modifiers});
 await page.evaluate(()=>{
  const bench=window.furnitureBench;
  bench.samples=[];bench.moves=[];bench.inputs=[];bench.poseMove=null;
 });
 let last;
 const began=performance.now();
 const dispatches=[];
 for(let i=1;i<=72;i++){
  await delay(Math.max(0,began+i*1000/60-performance.now()));
  const point=offset(i/72);
  last={x:start.x+point.x,y:start.y+point.y};
  const sent=performance.now()-began;
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...last,button:'left',buttons:1,modifiers});
  if(diagnose)dispatches.push({sent,acknowledged:performance.now()-began});
 }
 if(diagnose)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const {frames,moves,inputs}=await page.evaluate(()=>window.furnitureBench.takeSamples());
 const changed=await check();
 await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...last,button:'left',buttons:0,clickCount:1,modifiers});
 assert.ok(changed,'The real pointer gesture did not move the camera or furniture');
 assert.ok(frames.length>=2,`Too few actual renderer frames (${frames.length}, ${moves.length} drag events)`);
 const intervals=frames.slice(1).map((f,i)=>f.at-frames[i].at);
 const changes=moves.filter(move=>move.changed);
 const responses=changes.flatMap(move=>{
  const frame=frames.find(f=>f.at>=move.at&&(!diagnose||f.poseMove===move.step));
  return frame?[frame.at+frame.cpu-move.at]:[];
 });
 const nativeResponses=diagnose?changes.flatMap(move=>{
  const frame=frames.find(f=>f.at>=move.at&&f.poseMove===move.step);
  return frame?[frame.at+frame.cpu-inputs[move.step].eventAt]:[];
 }):[];
 return {frameIntervalMs:summary(intervals),renderSubmissionMs:summary(frames.map(f=>f.cpu)),
  framesOver33ms:intervals.filter(ms=>ms>33.5).length,framesOver50ms:intervals.filter(ms=>ms>50).length,
  ...(moves.length?{snapMs:summary(moves.map(move=>move.cpu)),poseChanges:changes.length,
   poseInputToSubmissionMs:summary(responses),
   ...(diagnose?{poseEventToSubmissionMs:summary(nativeResponses)}:{})}:{}),
  frames,moves,...(diagnose?{inputs,dispatches}:{})};
}

async function traceGesture(cdp,file,run){
 const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
 const categories=['toplevel','devtools.timeline','v8','blink.user_timing','gpu','renderer.scheduler','cc',
  'disabled-by-default-devtools.timeline'];
 if(traceDrag)categories.push('disabled-by-default-v8.cpu_profiler');
 await cdp.send('Tracing.start',{transferMode:'ReturnAsStream',
  categories:categories.join(',')});
 try{return await run();}
 finally{
  await cdp.send('Tracing.end');
  const {stream}=await complete;
  const fd=fs.openSync(file,'w');
  try{
   let result;
   do{
    result=await cdp.send('IO.read',{handle:stream});
    fs.writeSync(fd,Buffer.from(result.data,result.base64Encoded?'base64':'utf8'));
   }while(!result.eof);
  }finally{fs.closeSync(fd);await cdp.send('IO.close',{handle:stream});}
 }
}

async function closeTestApp(app){
 // This only applies to a launched copy. Preserve its cache even on errors
 // without blocking on the desktop's unflushed-save dialog.
 await app.evaluate(({BrowserWindow})=>{
  for(const window of BrowserWindow.getAllWindows()){
   window.webContents.removeAllListeners('will-prevent-unload');
   window.webContents.on('will-prevent-unload',event=>event.preventDefault());
  }
 });
 await app.close();
}

async function run(){
 assert.ok(project&&baseline,'Usage: verify-living-furniture-raster.cjs <1601 workspace file> <before commit>');
 assert.ok(previewHours.every(hour=>Number.isFinite(hour)&&hour>=0&&hour<=24),'Invalid preview hour');
 assert.ok([trialGTAO,trialBloom,trialSMAA].filter(Boolean).length<=1,'Vary only one viewport effect');
 if(captureTrajectory)assert.ok(secondCamera||rooms?.every(r=>r.secondCamera),'Trajectory comparison needs both room cameras');
 assert.ok(variants.every(v=>dragSnapToggle?dragVariants.includes(v):
  v==='before'||v==='after'||(!trialEffect&&v==='no-sheen')||(kitchenRound&&v==='no-kitchen-return')),'Unknown benchmark variant');
 if(dragSnapToggle)assert.ok(rooms?.length===1&&rooms[0].targets?.length===1,'Drag toggle tests need one room and one movable item');
 const source=read(project),after=collectSource(),before=Object.fromEntries(files.map(file=>
  [file,execFileSync('git',['show',baseline+':'+file],{cwd:root,maxBuffer:8*1024*1024})]));
 if(execFileSync('git',['ls-tree',baseline,'--',daylightFile],{cwd:root}).length)
  before[daylightFile]=execFileSync('git',['show',baseline+':'+daylightFile],{cwd:root});
 const job=artifacts.createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:rooms||customTargets?'room-raster-':'living-furniture-'});
 const cases=rooms||[{camera,targets,secondCamera}];
 const report={sourceHash:hash(source),baseline,trialGTAO,trialBloom,trialSMAA,revisionRound,scenePreset,...(gestureCamera?{gestureCamera}:{}),
  ...(captureTrajectory?{trajectory:{anglesRadians:trackAngles,crops:trackCrops},gtao:false,bloom:false}:{}),
  ...(rooms?{rooms}:{camera,targets,...(secondCamera?{secondCamera}:{})}),results:[]};
 let passed=false,app;
 console.log(job.dir);
 try{
  const work=job.workspace('workspace',root,{directories:['src','styles','vendor'],files:['index.html','manifest.webmanifest']});
  for(const file of runtimeFiles)job.copy(path.join(root,'scripts',file),path.join('workspace/scripts',file));
  const save=path.join(work,'projects/workspace.furnish.json');
  const compareCurrent=trialEffect||dragSnapToggle;
  report.sources=Object.fromEntries(files.map(file=>[file,{before:hash(compareCurrent?after[file]:before[file]),after:hash(after[file])}]));
  if(trialEffect)for(const name of ['viewport-gtao','viewport-bloom',...(nightTrial?['ceiling-model']:[])]){
   const file='src/render/'+name+'.js',digest=hash(read(path.join(root,file)));
   report.sources[file]={before:digest,after:digest};
  }
  if(trialSMAA)for(const file of ['src/render/viewport-smaa.js','vendor/three-r160/smaa.offline.js']){
   const digest=hash(read(path.join(root,file)));
   report.sources[file]={before:digest,after:digest};
  }
  report.sources[daylightFile]={...(before[daylightFile]?{before:hash(compareCurrent?after[daylightFile]:before[daylightFile])}:{}),after:hash(after[daylightFile])};
  for(const [i,variant] of variants.entries()){
   const profile=job.discard('profile-'+i);
   fs.writeFileSync(save,source);
   const version=variant==='before'&&!trialEffect?before:after;
   for(const [file,buffer] of Object.entries(version)){
    let code=buffer.toString();
    if(file.endsWith('yeswood-sofa-model.js')&&variant==='no-sheen'){
     code=code.replace(/sheen:\s*[.\d]+(?=,sheenColor)/,'sheen:0');
     assert.notEqual(code,buffer.toString(),'Could not isolate the sheen parameter');
    }
    if(file==='index.html'){
     const render=/function renderScene\((?:onlySun=false)?\)\{/g;
     assert.equal([...code.matchAll(render)].length,1,'Production render hook changed');
     code=code.replace(render,`function renderScene(onlySun=false){const started=performance.now();
      const diagnostics=${diagnose}?{shadowPending:renderer.shadowMap.needsUpdate,programs:renderer.info.programs.length}:null;
      if(${traceRotation||traceDrag}&&window.furnitureBench.samples)performance.mark('furnish-draw-start');
      drawBenchmarkScene(onlySun);
      if(${traceRotation||traceDrag}&&window.furnitureBench.samples)performance.mark('furnish-draw-end');
      const metrics=window.furnitureBench;
      if(${kitchenRound||ceilingAreaRound}&&!metrics.kitchenState)metrics.kitchenState=()=>{
       const positions=[];
       const faces=metrics.lampState(state.furniture.map(f=>f.id));
       furnG.traverse(o=>{
        if(!o.isSpotLight||!FurnishLighting.isPreviewLight(o))return;
        let parent=o.parent;
        while(parent&&!parent.userData.fid)parent=parent.parent;
        if(!parent)return;
        positions.push({id:parent.userData.fid,name:o.name,active:o.visible&&FurnishLighting.requested(o),
         shadow:o.castShadow,map:!!o.shadow.map,fov:o.shadow.camera.fov,intensity:o.intensity,color:o.color.getHexString(),
         area:!!o.userData.ceilingArea,part:o.userData.panelSample});
       });
       return {positions,faces,capabilities:{textures:renderer.capabilities.maxTextures,uniforms:renderer.capabilities.maxFragmentUniforms}};
      };
      if(${kitchenProbes&&variant==='before'}&&!metrics.kitchenProbe)metrics.kitchenProbe=label=>{
       metrics.probe=label;
       const shadowOwners=['fmv9mqxz91','fmv9qrzqy1'];
       for(const group of furnG.children.filter(model=>shadowOwners.includes(model.userData.fid))){
        group.traverse(o=>{
         if(!o.isMesh)return;
         o.userData.benchShadow??=o.castShadow;
         const hood=group.userData.fid===shadowOwners[1];
         o.castShadow=o.userData.benchShadow&&label!==(hood?'no-hood-caster':'no-upper-caster');
         if(hood&&['sloped-glass','fixed-lower-glass'].includes(o.name)){
          o.userData.benchColor??=o.material.color.clone();
          o.material.color.copy(o.userData.benchColor);
          if(label==='light-glass')o.material.color.set('#747474');
         }
        });
       }
       furnG.traverse(o=>{if(o.isSpotLight&&o.name.startsWith('Panel diffuser '))o.shadow.focus=1;});
       invalidate(true);
      };
      if(metrics.samples)metrics.samples.push({
       at:started,cpu:performance.now()-started,...(${nightTrial}?{pixelRatio:renderer.getPixelRatio()}: {}),
       ...(diagnostics?{...diagnostics,newPrograms:renderer.info.programs.length-diagnostics.programs,poseMove:metrics.poseMove}: {})
      });
      if(!metrics.target)metrics.target=(id)=>{
       const rect=renderer.domElement.getBoundingClientRect();
       const model=furnG.children.find(o=>o.userData.fid===id);
       if(!model)return null;
       const bounds=new THREE.Box3().setFromObject(model);
       const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
       for(const yRatio of [.55,.82,.3])for(const xRatio of [0,.22,-.22,.39,-.39])for(const zRatio of [0,.22,-.22]){
        const at=new THREE.Vector3(center.x+xRatio*size.x,bounds.min.y+yRatio*size.y,center.z+zRatio*size.z).project(camera);
        const x=rect.left+(at.x+1)*rect.width/2,y=rect.top+(1-at.y)*rect.height/2;
        if(Number.isFinite(x)&&Number.isFinite(y)&&document.elementFromPoint(x,y)===renderer.domElement&&pick({clientX:x,clientY:y})?.fid===id)return {x,y};
       }
       return null;
      };
      if(!metrics.captureBeauty)metrics.captureBeauty=()=>{
       if(typeof viewportAO==='undefined'||!viewportAO?.draw(scene,camera,{aoEnabled:false}))return null;
       return renderer.domElement.toDataURL('image/png');
      };
      if(${captureTrajectory}&&!metrics.holdTrack)metrics.holdTrack=active=>{
       viewportPointer=active?{moving:true}:null;syncViewportPixelRatio();
      };
      if(${captureTrajectory}&&!metrics.trackFrame)metrics.trackFrame=(yaw,regions)=>{
       const original=curPose();
       try{
        camera.position.copy(original.p).sub(original.t)
         .applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(original.t);
        camera.lookAt(original.t);camera.updateMatrixWorld(true);
        applyObservationLayers();drawBenchmarkScene();
        const source=renderer.domElement,output=document.createElement('canvas');
        const ctx=output.getContext('2d');
        const crops=regions.map(([label,[x,y,w,h]])=>{
         const sx=Math.round(x*source.width),sy=Math.round(y*source.height);
         output.width=Math.round(w*source.width);output.height=Math.round(h*source.height);
         ctx.drawImage(source,sx,sy,output.width,output.height,0,0,output.width,output.height);
         return [label,output.toDataURL('image/png')];
        });
        return {crops,position:camera.position.toArray(),target:original.t.toArray(),size:[source.width,source.height]};
       }finally{
        camera.position.copy(original.p);camera.lookAt(original.t);camera.updateMatrixWorld(true);
       }
      };
      if(!metrics.info)metrics.info=()=>{
       const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
       const lights=[];
       if(${trialBloom})scene.traverseVisible(o=>{
        if(o.isLight&&FurnishLighting.isPreviewLight(o))lights.push(o);
       });
       return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
        canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:devicePixelRatio,
        calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,exposure:renderer.toneMappingExposure,
        ...(${trialBloom}?{lights:lights.length,lightShadows:lights.filter(o=>o.castShadow).length}:{})};
      };
      if(!metrics.lampState)metrics.lampState=ids=>{
       const lamps={};
       furnG.traverseVisible(o=>{
        if(!o.userData.lightingRects?.length)return;
        let model=o;
        while(model&&!model.userData.fid)model=model.parent;
        if(!ids.includes(model?.userData.fid))return;
        const faces=lamps[model.userData.fid]??=[];
        for(const face of o.userData.lightingRects)faces.push({
         name:face.name,normal:face.normal,emission:face.material?.emissiveIntensity??0,
         position:new THREE.Vector3().fromArray(face.position).applyMatrix4(o.matrixWorld).toArray(),
         width:face.width,height:face.height,color:face.color
        });
       });
       return lamps;
      };
      if(${washTrial}&&!metrics.washState)metrics.washState=id=>{
       const fixture=furnG.children.find(model=>model.userData.fid===id);
       const lights=[];
       fixture?.traverseVisible(o=>{
        if(o.isSpotLight&&o.intensity>0)lights.push({span:o.userData.coveSpan??0,shadow:o.castShadow});
       });
       return lights;
      };
      if(${washTrial}&&!metrics.washBlocker)metrics.washBlocker=(id,enabled)=>{
       if(enabled){
        const fixture=furnG.children.find(model=>model.userData.fid===id);
        const face=fixture.userData.lightingRects[0],block=new THREE.Mesh(
         new THREE.BoxGeometry(.44,.025,.20),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false})
        );
        block.position.fromArray(face.position);
        block.position.x-=face.width/4;
        block.position.y+=.12;
        block.castShadow=true;
        fixture.add(block);
        metrics.block=block;
       }else{
        const block=metrics.block;
        block.removeFromParent();block.geometry.dispose();block.material.dispose();metrics.block=null;
       }
       invalidate(true);
      };
      if(${trialBloom}&&!metrics.emitters)metrics.emitters=()=>{
       const emitters=[];
       scene.traverseVisible(o=>{
        if(!FurnishViewportBloom.sourceWeight(o)&&!FurnishViewportBloom.washSource(o))return;
        const center=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).project(camera);
        emitters.push({name:o.name||o.userData.ceiling?.part||o.userData.cabinetSection||
         (FurnishCeilingModel.washMask(o)?'ceiling wash':'unnamed'),emission:o.material.emissiveIntensity,
         position:[(center.x+1)/2,(1-center.y)/2,center.z]});
       });
       return emitters;
      };
      if(!metrics.exportModels)metrics.exportModels=async ids=>{
       const groups=furnG.children.filter(model=>ids.includes(model.userData.fid));
       const {buffer}=await FurnishBlenderExport.encode(THREE,{groups,camera});
       return await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);
        reader.readAsDataURL(new Blob([buffer]));
       });
      };
     }function drawBenchmarkScene(onlySun=false){`);
    }
    if(file==='index.html'&&kitchenProbes&&variant==='before')code=code.replace(
     'if(budget.coveShadowAdded)renderer.shadowMap.needsUpdate=true;',
     `if(['all-panel-shadows','finite-panel-shadows','no-upper-caster','no-hood-caster'].includes(window.furnitureBench.probe)){
      const active=[];
      const panel=[];
      scene.traverse(o=>{
       if(!o.isSpotLight)return;
       o.castShadow=false;
       if(o.name.startsWith('Panel diffuser ')&&o.parent.userData.fid==='fmvqr5qlt1')panel.push(o);
       else if(o.visible&&FurnishLighting.isPreviewLight(o))active.push(o);
      });
      for(const o of panel){
       o.visible=o.castShadow=true;
       o.shadow.focus=window.furnitureBench.probe==='all-panel-shadows'?1:.85;
      }
      const eye=camera.position;
      const distance=o=>o.getWorldPosition(new THREE.Vector3()).distanceToSquared(eye);
      active.sort((a,b)=>distance(a)-distance(b));
      for(const o of active.slice(budget.lights-panel.length))o.visible=false;
      renderer.shadowMap.needsUpdate=true;
     }
     if(budget.coveShadowAdded)renderer.shadowMap.needsUpdate=true;`);
    if(file===daylightFile&&variant==='no-kitchen-return'){
     const original=code;
     code=code.replace('float gain=mix(0.32,0.19,abs(receiver.y));','float gain=0.0;');
     assert.notEqual(code,original,'Kitchen return gain changed');
    }
    fs.writeFileSync(path.join(work,file),code);
   }
   const server=http.createServer();
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
   const {port}=server.address();
   await new Promise(resolve=>server.close(resolve));
   const env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:profile,FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};
   delete env.ELECTRON_RUN_AS_NODE;
   app=await _electron.launch({executablePath:desktopExecutable(root),env,timeout:60000});
   const page=await app.firstWindow();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if((message.type()==='error'&&/WebGLProgram|Shader Error/.test(message.text()))||(trialEffect&&/Furnish (?:GTAO|Bloom|SMAA):|INVALID_(?:FRAMEBUFFER_OPERATION|OPERATION)/.test(message.text())))errors.push(message.text());});
   await app.context().addInitScript(({diagnose,tracing})=>{
    localStorage.setItem('furnish-observation-v1','smooth');
    window.furnitureBench={samples:null,moves:null,takeSamples(){
     const result={frames:this.samples,moves:this.moves,inputs:this.inputs};
     this.samples=this.moves=this.inputs=null;
     return result;
    }};
    window.addEventListener('pointermove',e=>{
     const bench=window.furnitureBench;
     bench.inputAt=performance.now();
     if(diagnose&&bench.samples){
      (bench.inputs??=[]).push({at:bench.inputAt,eventAt:e.timeStamp,x:e.clientX,y:e.clientY});
      if(tracing)performance.mark('furnish-pointer');
     }
    },true);
   },{diagnose,tracing:traceRotation||traceDrag});
   await page.waitForURL(`http://127.0.0.1:${port}/`);
   await page.reload();
   await page.locator('#repository-loading').waitFor({state:'hidden',timeout:60000});
   const cdp=await page.context().newCDPSession(page);
   // Pair the variants with the same room order, with each room going first
   // in half of a four-round run.
   const orderedRooms=diagnose&&!kitchenRotation&&variants.length>=4&&i>=variants.length/2?[...cases].reverse():cases;
   for(const {name,camera,targets=[],secondCamera,lampIds=[],stripId,motionCamera} of orderedRooms){
    const scene=await page.evaluate(async ({camera,targets,nightTrial,revisionRound,scenePreset})=>{
     if(FurnishElectricalUI.active())FurnishElectricalUI.setMode('furniture');
     drawer('lib',false);drawer('panel',false);
     select(null);
     if(nightTrial&&scenePreset!=='saved')mutate(()=>{
      state.scene3d=FurnishDesign.patchSceneSettings(state.scene3d,{hour:21,night:true,lamps:true,nightLights:false});
      const lampLayer=FurnishLayers.layerId(state,'furniture:fmwf2mkf01');
      if(!FurnishLayers.visible(state,'furniture:fmwf2mkf01')){
       state.objectLayers=FurnishLayers.update(state,lampLayer,{visible:true}).objectLayers;
      }
     },{sceneFirst:true});
     else if(revisionRound&&scenePreset==='day')mutate(()=>{
      state.scene3d=FurnishDesign.patchSceneSettings(state.scene3d,{hour:11,night:false,lamps:false,nightLights:false});
     },{sceneFirst:true});
     await setView('3d');
     const pose=await View3D.automationCamera(camera);
     const effective=FurnishProject.effectivePlan(PLAN,state);
     const openings=effective.wins?.map((opening,index)=>({
      ref:effective.winRefs?.[index],rect:opening.rect,sill:opening.sill,head:opening.head
     }));
     return {name:PLAN.name,count:state.furniture.length,settings:state.scene3d,pose,openings,
      lampLayerVisible:FurnishLayers.visible(state,'furniture:fmwf2mkf01'),
      targets:targets.map(id=>({id,type:getF(id)?.type,locked:furnitureLocked(getF(id))}))};
    },{camera,targets,nightTrial,revisionRound,scenePreset});
    assert.ok(scene.targets.every(f=>f.type),'Missing benchmark furniture');
    if(!rooms&&!customTargets)assert.deepEqual(scene.targets.map(f=>f.type),['sofa_yeswood_cherry','coffeetable_yeswood_cherry']);
    const movable=scene.targets.at(-1);
    assert.ok(scene.pose,'Production 3D did not open');
    await page.waitForFunction(()=>document.querySelector('#progressive-controls')?.dataset.state==='smooth');
    assert.equal(await page.locator('#progressive-frame').count(),0);
    if(revisionRound){
     for(const id of ['gtao','bloom','smaa'])assert.equal(await page.locator('#viewport-'+id).getAttribute('aria-pressed'),'false');
    }
    if(dragSnapToggle){
     const prefs=()=>page.evaluate(()=>({wallSnap:ui.layers.wallSnap,guides:ui.layers.guides,collide:ui.layers.collide,grid:ui.grid}));
     const planAids=await prefs(),beforeState=await page.evaluate(()=>snap());
     scene.dragOptions={grid:planAids.grid,snap:variant==='both-on'||variant==='collision-off',collision:variant==='both-on'||variant==='snap-off'};
     const menu=page.locator('#showMenu');
     for(const [name,enabled] of [['snap',scene.dragOptions.snap],['collision',scene.dragOptions.collision]]){
      await menu.evaluate(element=>{element.open=true;});
      const control=page.locator('#scene-drag-'+name);
      assert.ok(await control.isVisible());
      assert.equal(await control.getAttribute('aria-pressed'),'true');
      if(!enabled)await control.click();
      assert.equal(await control.getAttribute('aria-pressed'),String(enabled));
      await menu.evaluate(element=>{element.open=false;});
     }
     assert.deepEqual(await prefs(),planAids,'3D switches must keep 2D preferences');
     assert.equal(await page.evaluate(()=>snap()),beforeState,'Toggling 3D drag aids must leave the project alone');
    }
    if(trialEffect){
     await page.locator('#showMenu').evaluate(menu=>{menu.open=true;});
     await page.locator('#viewport-quality-toggle').click();
     const control=page.locator('#'+trialEffect);
     assert.ok(await control.isVisible());
     assert.equal(await control.getAttribute('aria-pressed'),'false');
     if(nightTrial)assert.equal(await page.locator('#viewport-gtao').getAttribute('aria-pressed'),'false');
     if(trialSMAA)assert.equal(await page.locator('#viewport-bloom').getAttribute('aria-pressed'),'false');
     if(variant!=='before')await control.click();
     await page.locator('#showMenu').evaluate(menu=>{menu.open=false;});
     assert.equal(await control.getAttribute('aria-pressed'),String(variant!=='before'));
    }
    await page.evaluate(()=>View3D.automationReady());
    if(lampIds.length){
     scene.lamps=await page.evaluate(ids=>furnitureBench.lampState(ids),lampIds);
     for(const id of lampIds){
      const lit=scene.lamps[id]?.some(face=>face.emission>0)??false;
      assert.equal(lit,scene.settings.lamps,'Unexpected visible emission for '+id);
     }
    }
    const capture=async (suffix,beauty=false)=>{
     const png=await page.evaluate(beauty=>beauty?furnitureBench.captureBeauty():View3D.image(),beauty);
     assert.ok(png,'Viewport capture is unavailable');
     const buffer=Buffer.from(png.split(',')[1],'base64');
     fs.writeFileSync(path.join(job.dir,variant+'-'+i+(name?'-'+name:'')+suffix+'.png'),buffer);
     return hash(buffer);
    };
    const visual=await capture('');
    if(ceilingAreaRound){
     scene.lighting=await page.evaluate(()=>furnitureBench.kitchenState());
     if(name==='kitchen'&&variant==='after'){
      const lighting=scene.lighting.positions.filter(o=>o.id==='fmvqr5qlt1'&&o.active&&o.part);
      assert.equal(lighting.length,4);
      assert.ok(lighting.every(o=>o.area&&o.part==='tile'&&o.shadow&&o.map));
     }
    }
    if(revisionRound==='upper-edge'&&!report.results.some(result=>result.variant===variant)){
     scene.activeFixtures=await page.evaluate(()=>{
      const faces=furnitureBench.lampState(state.furniture.map(f=>f.id));
      return state.furniture.filter(f=>faces[f.id]?.some(face=>face.emission>0))
       .map(({id,name})=>({id,name,faces:faces[id]}));
     });
    }
    if(kitchenRound&&name==='kitchen'){
     scene.kitchen=await page.evaluate(()=>furnitureBench.kitchenState());
     if(variant==='after'){
      const panel=scene.kitchen.positions.filter(o=>o.id==='fmvqr5qlt1'&&o.name.startsWith('Panel diffuser'));
      const direct=panel.filter(o=>o.active);
      assert.ok(direct.length>=4&&direct.every(o=>o.shadow&&o.map&&o.fov<180));
      assert.ok(Math.abs(direct.reduce((sum,o)=>sum+o.intensity,0)*683-60)<1e-6);
     }
     if(kitchenProbes&&variant==='before'){
      scene.probes={};
      for(const label of ['all-panel-shadows','finite-panel-shadows','no-upper-caster','no-hood-caster','light-glass','restored']){
       await page.evaluate(label=>furnitureBench.kitchenProbe(label),label);
       await page.evaluate(()=>View3D.automationReady());
       scene.probes[label]=await capture('-'+label);
      }
      assert.equal(scene.probes.restored,visual);
     }
    }
    if(bedRound||finishRound||(['upper-return','upper-edge','ceiling-area','kitchen-rotation'].includes(revisionRound)&&['master','kitchen'].includes(name))||
     (kitchenRound&&['kitchen','hall'].includes(name))||(windowRound&&name==='kitchen')){
     scene.controlImages={};
     const apply=patch=>page.evaluate(patch=>mutate(()=>{
      state.scene3d=FurnishDesign.patchSceneSettings(state.scene3d,patch);
     },{sceneFirst:true}),patch);
     const controls=bedRound||finishRound?[['day',{lamps:false,night:false,hour:11}]]:
      [['lamps-off',{lamps:false}],['day',{lamps:false,night:false,hour:11}]];
     for(const [label,patch] of controls){
      await apply(patch);
      await page.evaluate(()=>View3D.automationReady());
      scene.controlImages[label]=await capture('-'+label);
     }
     await apply(scene.settings);
     await page.evaluate(pose=>View3D.automationCamera(pose),camera);
     if(revisionRound==='upper-edge'&&variant==='after'&&name==='master'){
      const original=await page.evaluate(()=>state.objectLayers);
      await page.evaluate(()=>mutate(()=>{
       const room='floor:area_fmv3p1fkz7',id='test-floor-return';
       const layers=FurnishLayers.assign(FurnishLayers.create(state,id,'回光测试地板'),[room],id);
       state.objectLayers=FurnishLayers.update(layers,id,{visible:false}).objectLayers;
      }));
      await page.evaluate(()=>View3D.automationReady());
      scene.controlImages.floorHidden=await capture('-floor-hidden');
      await page.evaluate(layers=>mutate(()=>{state.objectLayers=layers.objectLayers;}),{objectLayers:original});
      await page.evaluate(pose=>View3D.automationCamera(pose),camera);
     }
    }
    if(washTrial){
     assert.ok(stripId&&scene.lamps[stripId]?.length);
     scene.strip=await page.evaluate(id=>{
      const {cx,cy,rot,w,d,h,mountHeight,lightKelvin,lightPreviewLevel}=getF(id);
      return {cx,cy,rot,w,d,h,mountHeight,lightKelvin,lightPreviewLevel};
     },stripId);
     const spots=()=>page.evaluate(id=>furnitureBench.washState(id),stripId);
     scene.stripSpots=await spots();
     assert.equal(scene.strip.lightPreviewLevel,30);
     assert.equal(scene.strip.lightKelvin,3000);
     if(variant==='after'){
      assert.ok(scene.stripSpots.length&&scene.stripSpots.every(s=>s.shadow&&s.span>0));
      assert.ok(Math.abs(scene.stripSpots.reduce((sum,s)=>sum+s.span,0)-scene.lamps[stripId][0].width)<1e-6);
     }
     const reference=report.results.find(result=>result.name===name);
     if(reference){
      for(const field of ['pose','settings','lamps','strip','lampLayerVisible'])assert.deepEqual(scene[field],reference.scene[field],field);
      assert.equal(await page.evaluate(()=>furnitureBench.info().exposure),reference.render.exposure);
     }
     if(i<=1){
      const dim=level=>page.evaluate(({id,level})=>mutate(()=>{
       getF(id).lightPreviewLevel=level;
      }),{id:stripId,level});
      const setOn=lamps=>page.evaluate(lamps=>mutate(()=>{
       state.scene3d=FurnishDesign.patchSceneSettings(state.scene3d,{lamps});
      },{sceneFirst:true}),lamps);
      const hide=hidden=>page.evaluate(({id,hidden})=>mutate(()=>{
       const layer='test-bedside-strip';
       if(hidden){
        furnitureBench.originalLayers=state.objectLayers;
        const added=FurnishLayers.create(state,layer,'洗墙验证');
        const placed=FurnishLayers.assign(added,['furniture:'+id],layer);
        state.objectLayers=FurnishLayers.update(placed,layer,{visible:false}).objectLayers;
       }else{
        state.objectLayers=furnitureBench.originalLayers;
       }
      }),{id:stripId,hidden});
      await dim(0);
      await page.evaluate(()=>View3D.automationReady());
      assert.equal((await page.evaluate(id=>furnitureBench.lampState([id])[id],stripId))[0].emission,0);
      assert.deepEqual(await spots(),[]);
      assert.notEqual(await capture('-strip-off'),visual);
      await dim(scene.strip.lightPreviewLevel);
      await setOn(false);
      await page.evaluate(()=>View3D.automationReady());
      assert.equal((await page.evaluate(id=>furnitureBench.lampState([id])[id],stripId))[0].emission,0);
      assert.deepEqual(await spots(),[]);
      assert.notEqual(await capture('-lamps-off'),visual);
      await setOn(true);
      await hide(true);
      await page.evaluate(()=>View3D.automationReady());
      assert.equal(await page.evaluate(id=>furnitureBench.lampState([id])[id],stripId),undefined);
      assert.deepEqual(await spots(),[]);
      assert.notEqual(await capture('-layer-hidden'),visual);
      await hide(false);
      await page.evaluate(pose=>View3D.automationCamera(pose),camera);
      await page.evaluate(()=>View3D.automationReady());
      assert.deepEqual(await spots(),scene.stripSpots);
      if(variant==='after'){
       const unobstructed=await capture('-restored');
       const blocker=enabled=>page.evaluate(({id,enabled})=>furnitureBench.washBlocker(id,enabled),{id:stripId,enabled});
       await blocker(true);
       assert.notEqual(await capture('-shadow-probe'),unobstructed);
       await blocker(false);
       assert.equal(await capture('-shadow-cleared'),unobstructed);
      }
     }
    }
    if(trialBloom)scene.emitters=await page.evaluate(()=>furnitureBench.emitters());
    if(trialEffect&&variant!=='before'){
     const unprocessed=await capture('-beauty',true);
     assert.notEqual(unprocessed,visual,'The selected effect made no visible change');
     await page.evaluate(()=>View3D.automationReady());
    }
    if(secondCamera){
     await page.evaluate(pose=>View3D.automationCamera(pose),secondCamera);
     const secondaryVisual=await capture('-secondary');
     if(trialBloom)scene.secondaryEmitters=await page.evaluate(()=>furnitureBench.emitters());
     if((trialBloom||trialSMAA)&&variant!=='before')assert.notEqual(await capture('-secondary-beauty',true),secondaryVisual);
     await page.evaluate(pose=>View3D.automationCamera(pose),camera);
    }
    if(bedRound&&variant==='after'&&name==='master'&&!report.productionExport){
     const data=await page.evaluate(ids=>furnitureBench.exportModels(ids),targets);
     const glb=Buffer.from(data.split(',')[1],'base64');
     const asset=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
     const fabric=asset.materials.filter(m=>m.extensions?.KHR_materials_sheen);
     assert.ok(fabric.length>=4&&fabric.every(m=>m.normalTexture&&m.pbrMetallicRoughness.baseColorTexture));
     assert.ok(asset.meshes.some(mesh=>mesh.primitives.some(p=>p.attributes.COLOR_0!==undefined)));
     fs.writeFileSync(path.join(job.dir,'production-bed.glb'),glb);
     report.productionExport={filename:'production-bed.glb',sha256:hash(glb),fabricMaterials:fabric.length};
    }
    if(previewHours.length){
     const originalHour=scene.settings.hour;
     const previewHour=hour=>page.evaluate(hour=>{
      const slider=document.getElementById('sun');
      slider.value=hour;slider.dispatchEvent(new Event('input',{bubbles:true}));
      return +slider.value;
     },hour);
     for(const hour of previewHours){
      assert.equal(await previewHour(hour),hour);
      await capture('-hour-'+hour);
     }
     assert.equal(await page.evaluate(()=>state.scene3d.hour),originalHour,'Preview overwrote the saved scene time');
     assert.equal(await previewHour(originalHour),originalHour);
     await page.evaluate(()=>View3D.automationReady());
    }
    const render=await page.evaluate(()=>furnitureBench.info());
    if(diagnose){
     scene.imageHash=visual;
     const reference=report.results.find(result=>result.name===name);
     if(reference){
      for(const field of ['settings','pose','lamps','lampLayerVisible','imageHash'])assert.deepEqual(scene[field],reference.scene[field],field);
      assert.equal(render.exposure,reference.render.exposure);
     }
    }
    if(trialBloom){
     assert.ok(scene.emitters.some(source=>source.name==='diffuser'&&source.emission>1),'The installed lamp shade was hidden or unlit');
     assert.equal(render.canvas[0],Math.floor((await page.locator('#view3d canvas').first().boundingBox()).width*Math.min(2,render.dpr)));
    }
    const recordTrack=async()=>{
     if(!captureTrajectory||i>1)return;
     scene.track={};
     for(const [room,pose] of [['living',camera],['dining',secondCamera]]){
      await page.evaluate(pose=>View3D.automationCamera(pose),pose);
      // Hold the interaction DPR for a complete sequence so GPU targets stay warm.
      await page.evaluate(()=>furnitureBench.holdTrack(true));
      try{
       scene.track[room]=[];
       for(const [step,yaw] of trackAngles.entries()){
        const {crops,...frame}=await page.evaluate(({yaw,regions})=>furnitureBench.trackFrame(yaw,regions),{yaw,regions:trackCrops[room]});
        scene.track[room].push(frame);
        for(const [label,png] of crops){
         const filename=[variant,String(i),name,label,String(step).padStart(2,'0')].filter(Boolean).join('-')+'.png';
         fs.writeFileSync(path.join(job.dir,filename),Buffer.from(png.split(',')[1],'base64'));
        }
       }
      }finally{await page.evaluate(()=>furnitureBench.holdTrack(false));}
     }
    };
    await recordTrack();
    if(scene.track&&i===1)assert.deepEqual(scene.track,report.results.find(result=>result.name===name)?.scene.track,
     'Camera trajectory or interaction resolution differed between the two variants');
    if(!movable&&!motionCamera){report.results.push({variant,name,scene,render});continue;}
    const motion=motionCamera||gestureCamera||camera;
    if(motion!==camera||scene.track)await page.evaluate(pose=>View3D.automationCamera(pose),motion);
    const motionRender=motionCamera?await page.evaluate(()=>furnitureBench.info()):undefined;
    const box=await page.locator('#view3d canvas').first().boundingBox();
    const from={x:box.x+box.width*.45,y:box.y+box.height*.49};
    const rotation=()=>measure(page,cdp,from,t=>({x:34*Math.sin(t*4*Math.PI)+12*t,y:8*Math.sin(t*2*Math.PI)}),
     async()=>Math.abs((await page.evaluate(()=>View3D.automationCamera())).position.y-motion.position.y)>1);
    const translate=async()=>{
     if(!panCamera)return;
     await page.evaluate(pose=>View3D.automationCamera(pose),motion);
     // Shift+left is OrbitControls' alternate pan gesture (CDP Shift=8).
     return measure(page,cdp,from,t=>({x:96*t,y:14*Math.sin(t*Math.PI)}),async()=>{
      const {target}=await page.evaluate(()=>View3D.automationCamera());
      return Math.hypot(target.x-motion.target.x,target.y-motion.target.y)>1;
     },8);
    };
    let rotate,pan;
    const traceFile=path.join(job.dir,`trace-${variant}-${i}-${name||'room'}.json`);
    if(kitchenRotation&&traceRotation){
     await traceGesture(cdp,traceFile,async()=>{
      await page.evaluate(()=>performance.mark('furnish-rotation'));
      rotate=await rotation();
      await page.evaluate(()=>performance.mark('furnish-pan'));
      pan=await translate();
     });
    }else{
     rotate=traceRotation?await traceGesture(cdp,traceFile,rotation):await rotation();
     pan=await translate();
    }
    if(!movable){
     if(kitchenRotation){
      assert.equal(await page.locator('#progressive-frame').count(),0);
      await page.waitForFunction(width=>furnitureBench.info().canvas[0]===width,render.canvas[0]);
     }
     report.results.push({variant,name,scene,render,motionRender,rotate,pan});
     console.log(variant,name,'camera',JSON.stringify({rotate:rotate.frameIntervalMs,pan:pan?.frameIntervalMs}));
     continue;
    }
    const drag=await page.evaluate(async ({camera,id,diagnose,traceDrag,dragSnapToggle})=>{
     await View3D.automationCamera(camera);
     selectIds([id]);ui.sceneMove=true;View3D.sync();renderFab();
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     furnitureBench.originalSnap??=snapMove;
     snapMove=(f,...args)=>{
      const start=performance.now();
      if(traceDrag&&furnitureBench.samples)performance.mark('furnish-snap-start');
      const position=furnitureBench.originalSnap(f,...args);
      if(traceDrag&&furnitureBench.samples)performance.mark('furnish-snap-end');
      const changed=position[0]!==f.cx||position[1]!==f.cy;
      const step=furnitureBench.inputs?.length-1;
      if(diagnose&&changed)furnitureBench.poseMove=step;
      furnitureBench.moves?.push({at:furnitureBench.inputAt,cpu:performance.now()-start,changed,
       ...(diagnose?{step,projection:args.slice(0,2),position}: {})});
      return position;
     };
     if(dragSnapToggle){
      furnitureBench.originalPushOut=pushOut;
      furnitureBench.dropChecks=0;
      pushOut=(...args)=>{furnitureBench.dropChecks++;return furnitureBench.originalPushOut(...args);};
     }
     const f=getF(id);
     return {point:furnitureBench.target(id),cx:f.cx,cy:f.cy,locked:furnitureLocked(f)};
    },{camera:motion,id:movable.id,diagnose,traceDrag,dragSnapToggle});
    assert.ok(drag.point&&!drag.locked,`Furniture ${movable.id} must be pickable and unlocked`);
    if(diagnose)scene.dragStart=drag;
    const dragFurniture=()=>measure(page,cdp,drag.point,t=>({x:30+110*t+29*Math.sin(t*2*Math.PI),y:18+23*Math.sin(t*Math.PI)}),
     ()=>page.evaluate(({id,cx,cy})=>getF(id).cx!==cx||getF(id).cy!==cy,{...drag,id:movable.id}));
    const move=traceDrag?
     await traceGesture(cdp,path.join(job.dir,`trace-drag-${variant}-${i}-${name||'room'}.json`),dragFurniture):await dragFurniture();
    if(diagnose){
     scene.dragEnd=await page.evaluate(id=>{const {cx,cy}=getF(id);return {cx,cy};},movable.id);
     const reference=report.results.find(result=>result.name===name);
     const poses=result=>result.moves.map(({projection,position})=>({projection,position}));
     if(reference){
      assert.deepEqual(drag,reference.scene.dragStart,'drag starting pose or picked point changed');
      if(dragSnapToggle){
       const inputs=result=>result.inputs.map(({x,y})=>[x,y]);
       const projection=result=>result.moves.map(({step,projection})=>[step,projection]);
       assert.deepEqual(inputs(move),inputs(reference.move),'drag pointer path changed');
       assert.deepEqual(projection(move),projection(reference.move),'drag ground projection changed');
      }else assert.deepEqual(poses(move),poses(reference.move),'drag projection or snapped path changed');
     }
    }
    if(dragSnapToggle){
     const {grid,snap,collision}=scene.dragOptions;
     const sameState=report.results.find(result=>result.name===name&&result.variant===variant);
     if(sameState){
      assert.deepEqual(move.moves.map(m=>m.position),sameState.move.moves.map(m=>m.position),'same switches produced a different trajectory');
      assert.deepEqual(scene.dragEnd,sameState.scene.dragEnd,'same switches produced a different drop position');
     }
     if(!snap)for(const {projection,position} of move.moves)
      assert.deepEqual(position,projection.map(value=>Math.round(value/grid)*grid),'disabled attraction should use only the grid step');
     scene.dropChecks=await page.evaluate(()=>{pushOut=furnitureBench.originalPushOut;return furnitureBench.dropChecks;});
     assert.equal(scene.dropChecks,collision?1:0,'wall correction did not follow the collision switch');
    }
    assert.equal(await page.locator('#progressive-frame').count(),0);
    if(nightTrial)assert.equal(await page.locator('#viewport-gtao').getAttribute('aria-pressed'),'false');
    if(trialSMAA)assert.equal(await page.locator('#viewport-bloom').getAttribute('aria-pressed'),'false');
    if(nightTrial){
     for(const gesture of [rotate,pan,move].filter(Boolean))assert.ok(gesture.frames.some(frame=>frame.pixelRatio===Math.min(1.25,render.dpr)));
     await page.waitForFunction(ratio=>furnitureBench.info().canvas[0]===ratio,render.canvas[0]);
    }
    assert.deepEqual(errors,[]);
    report.results.push({variant,name,scene,render,...(motionRender?{motionRender}:{}),rotate,...(pan?{pan}:{}),move});
    console.log(variant,name||'',JSON.stringify({render,rotate:rotate.frameIntervalMs,...(pan?{pan:pan.frameIntervalMs}:{}),move:move.frameIntervalMs,
     snap:move.snapMs,poseChanges:move.poseChanges,poseInputToSubmissionMs:move.poseInputToSubmissionMs}));
    if(rooms){
     const restored=await page.evaluate(id=>{
      snapMove=furnitureBench.originalSnap;undo();
      select(null);ui.sceneMove=false;View3D.sync();
      const {cx,cy}=getF(id);
      return [cx,cy];
     },movable.id);
     assert.deepEqual(restored,[drag.cx,drag.cy]);
     continue;
    }
    if(variant==='after'&&!report.productionExport){
     const id=movable.id;
     const positions=await page.evaluate(id=>{
      const at=()=>[getF(id).cx,getF(id).cy];
      const moved=at();
      undo();const undone=at();
      redo();const redone=at();
      return {moved,undone,redone};
     },id);
     assert.notDeepEqual(positions.moved,[drag.cx,drag.cy]);
     assert.deepEqual(positions.undone,[drag.cx,drag.cy]);
     assert.deepEqual(positions.redone,positions.moved);
     assert.ok(await page.evaluate(()=>saveNow()),'Isolated workspace save failed');
     await page.reload();
     await page.locator('#repository-loading').waitFor({state:'hidden',timeout:60000});
     assert.deepEqual(await page.evaluate(id=>[getF(id).cx,getF(id).cy],id),positions.moved);
     const data=await page.evaluate(async ({camera,scene})=>{
      await setView('3d');await View3D.automationCamera(camera);
      return await furnitureBench.exportModels(scene.targets.map(f=>f.id));
     },{camera,scene});
     if(trialEffect)assert.equal(await page.locator('#'+trialEffect).getAttribute('aria-pressed'),'true','Effect preference did not survive reload');
     const glb=Buffer.from(data.split(',')[1],'base64');
     const document=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
     const fabrics=document.materials.filter(m=>m.extensions?.KHR_materials_sheen);
     assert.ok(document.nodes.length&&document.materials.length,'Furniture GLB must contain production geometry');
     if(!customTargets){
      assert.equal(fabrics.length,1);
      assert.ok(fabrics[0].normalTexture&&fabrics[0].pbrMetallicRoughness.baseColorTexture);
     }
     const filename=customTargets?'production-models.glb':'two-production-models.glb';
     fs.writeFileSync(path.join(job.dir,filename),glb);
     report.productionExport={filename,sha256:hash(glb),nodes:document.nodes.length,
      sheenMaterials:fabrics.length,undoRedo:true,reload:true};
    }
   }
   await cdp.detach();
   assert.deepEqual(errors,[]);
   assert.ok(await page.evaluate(()=>saveNow()),'Isolated workspace save failed');
   if(dragSnapToggle&&variant==='both-off'){
    await page.reload();
    await page.locator('#repository-loading').waitFor({state:'hidden',timeout:60000});
    await page.evaluate(()=>setView('3d'));
    const menu=page.locator('#showMenu');
    const controls=['scene-drag-snap','scene-drag-collision'].map(id=>page.locator('#'+id));
    for(const control of controls)assert.equal(await control.getAttribute('aria-pressed'),'false','switch preference did not survive reload');
    const captureMenu=async state=>{
     await menu.evaluate(element=>{element.open=true;});
     await menu.locator('.showsec.only3d').screenshot({path:path.join(job.dir,`drag-settings-${i}-${state}.png`)});
    };
    await captureMenu('off');
    for(const control of controls){
     await menu.evaluate(element=>{element.open=true;});
     await control.click();
     assert.equal(await control.getAttribute('aria-pressed'),'true');
    }
    await captureMenu('on');
   }
   await closeTestApp(app);
   app=null;
  }
  passed=true;
 }catch(error){
  report.error=error.message;
  console.error(error);
  throw error;
 }finally{
  if(app)await closeTestApp(app);
  report.sourceUnchanged=hash(read(project))===report.sourceHash;
  report.passed=passed&&report.sourceUnchanged;
  fs.writeFileSync(path.join(job.dir,'results.json'),JSON.stringify(report,null,2));
  job.finish(report.passed);
  assert.ok(report.sourceUnchanged,'Source project changed during measurement');
 }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
