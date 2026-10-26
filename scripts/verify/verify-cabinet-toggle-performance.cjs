'use strict';
// Fresh browser profiles and GET-only server; the real workspace is read only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const V=require('../lib/browser-verification.cjs'),root=V.projectRoot,out=path.join(root,'output/playwright/cabinet-toggle');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const inputIndex=process.argv.indexOf('--workspace'),input=inputIndex<0?path.join(root,'projects/workspace.furnish.json'):path.resolve(process.argv[inputIndex+1]),source=fs.readFileSync(input),workspace=JSON.parse(source).workspace;
 const iterations=process.argv.includes('--smoke')?2:4;
 const baselineIndex=process.argv.indexOf('--baseline-ref'),baselineRef=baselineIndex<0?null:process.argv[baselineIndex+1];
 if(baselineIndex>=0&&(!baselineRef||baselineRef.startsWith('-')))throw Error('--baseline-ref requires a Git revision');
 const baseline=baselineRef?require('node:child_process').execFileSync('git',['show',baselineRef+':src/core/ceiling-core.js'],{cwd:root,encoding:'utf8'}):null;
 const baselineProject=baselineRef?require('node:child_process').execFileSync('git',['show',baselineRef+':src/core/project-core.js'],{cwd:root,encoding:'utf8'}):null;
 if(process.argv.includes('--core-only')){
  if(!baseline)throw Error('--core-only requires --baseline-ref');
  const Module=require('node:module'),filename=path.join(root,'src/core/ceiling-baseline.cjs'),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod._compile(baseline,filename);
  const C=require('../../src/core/ceiling-core.js'),P=require('../../src/core/project-core.js'),G=require('../../src/core/layout-geometry.js'),work=workspace.work[workspace.planId],plan=P.effectivePlan({},work),bodies=work.furniture.filter(f=>!['rug','plant','curtain'].includes(f.type)).flatMap(f=>G.bodyParts(f,plan,work.furniture).map(part=>({f,...part})));
  const times={before:[],after:[]};for(let i=0;i<12;i++)for(const key of i%2?['after','before']:['before','after']){const t=performance.now(),actual=(key==='before'?mod.exports:C).checks(plan,bodies);if(i>1)times[key].push(performance.now()-t);assert.deepEqual(actual,C.checks(plan,bodies),'core exact result parity');}
  const median=a=>{a.sort((a,b)=>a-b);return (a[4]+a[5])/2;},result={baselineRef,bodies:bodies.length,ceilings:plan.ceilings.items.length,beforeMedian:median(times.before),afterMedian:median(times.after),times,exactParity:true};fs.writeFileSync(path.join(out,'core-comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
 }
 const server=await V.staticServer(root),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions);
 const results=[];
 try{for(const {mode,legacy} of baseline?[{mode:'http',legacy:true},{mode:'http',legacy:false},{mode:'file',legacy:false}]:(process.argv.includes('--file')?[{mode:'file',legacy:false}]:[{mode:'http',legacy:false}])){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];
  if(legacy)await page.route('**/src/core/ceiling-core.js',route=>route.fulfill({body:baseline,contentType:'text/javascript'}));
  if(legacy)await page.route('**/src/core/project-core.js',route=>route.fulfill({body:baselineProject,contentType:'text/javascript'}));
  page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(ws=>localStorage.setItem('huxing-design-v23',JSON.stringify(ws)),workspace);
  await page.goto(mode==='file'?pathToFileURL(path.join(root,'index.html')).href:server.baseURL);await page.locator('#repository-loading').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching,{},{timeout:90000});await page.waitForTimeout(1500);
  const session=await context.newCDPSession(page);await session.send('Profiler.enable');await session.send('Profiler.start');
  const result=await page.evaluate(async iterations=>{
   const stats={},wrap=(o,k)=>{const original=o[k];if(typeof original!=='function')return;o[k]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const v=stats[k]??={calls:0,ms:0};v.calls++;v.ms+=performance.now()-t;}};};
   for(const [o,keys]of [[window,['commit','renderAll','renderPanel','renderFurn','renderSel','renderFab','save']],[View3D,['sync']],[FurnishProject,['effectivePlan','spaceCheck','review']],[FurnishKitchen,['normalize','normalizeObstacles']],[FurnishCabinet,['normalizePegboardHatches','sideOpenings','sharedSides','joinedSideFinishes']]])for(const k of keys)wrap(o,k);
   const usable=(f,i)=>f.cabinet.columns[i].pegboardHatch||FurnishCabinet.frontDoor(f,i)!=='none';
   const cabinets=state.furniture.filter(f=>f.cabinet&&!f.kitchen&&!furnitureLocked(f)&&f.cabinet.columns.some((c,i)=>usable(f,i)));
   const kitchen=state.furniture.find(f=>f.kitchen&&!furnitureLocked(f)&&f.kitchen.modules.some(m=>m.role!=='empty'&&FurnishKitchen.moduleDoor(f,m)!=='none'));
   const candidates=[...cabinets.slice(0,2),...cabinets.filter(f=>f.cabinet.template==='entry-pegboard').slice(0,1),...(kitchen?[kitchen]:[])];
   const rows=[];for(const f of candidates){
    const column=f.kitchen?f.kitchen.modules.findIndex(m=>m.role!=='empty'&&FurnishKitchen.moduleDoor(f,m)!=='none'):f.cabinet.columns.findIndex((c,i)=>usable(f,i)),part={column,...(f.cabinet?.columns[column]?.pegboardHatch?{section:'pegboardHatch',leaf:0}:{})};selectIds([f.id]);
    for(let i=0;i<iterations;i++){for(const k of Object.keys(stats))delete stats[k];const before=snap(),t=performance.now();FurnishCabinetEditor.toggleScene(f.id,part);const ms=performance.now()-t;if(snap()===before)throw Error('toggle did not change '+f.id);rows.push({id:f.id,name:f.name,ms,stats:structuredClone(stats)});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
   }
   const f=candidates[0],part={column:f.cabinet.columns.findIndex(c=>c.door!=='none')},before=snap();FurnishCabinetEditor.toggleScene(f.id,part);const opened=snap();if(before===opened)throw Error('toggle did not change state');undo();if(snap()!==before)throw Error('undo mismatch');redo();if(snap()!==opened)throw Error('redo mismatch');
   const packed=FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]}),loaded=FurnishProject.unpack(packed);if(JSON.stringify(loaded.current.furniture)!==JSON.stringify(state.furniture))throw Error('project roundtrip mismatch');
   window.__toggleExpected=opened;
   const issues=FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{scanPassages:false});
   return {plan:PLAN.name,count:state.furniture.length,rows,undoRedo:true,roundtrip:true,issues,expected:opened};
  },iterations);
  const {profile}=await session.send('Profiler.stop');fs.writeFileSync(path.join(out,mode+'-profile.json'),JSON.stringify(profile));
  await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});const restored=await page.evaluate(()=>snap());
  fs.writeFileSync(path.join(out,mode+'-restore.json'),JSON.stringify({before:JSON.parse(result.expected),after:JSON.parse(restored)}));
  assert.deepEqual(JSON.parse(restored),JSON.parse(result.expected),'refresh restore');delete result.expected;result.refresh=true;
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching,{},{timeout:90000});await page.waitForTimeout(800);
  const counts=new Map();for(const id of profile.samples||[])counts.set(id,(counts.get(id)||0)+1);console.log(JSON.stringify({mode,legacy,rows:result.rows.map(v=>({id:v.id,name:v.name,ms:v.ms})),undoRedo:result.undoRedo,roundtrip:result.roundtrip,refresh:true,top:profile.nodes.map(n=>({fn:n.callFrame.functionName,url:n.callFrame.url.slice(0,200),line:n.callFrame.lineNumber,hits:counts.get(n.id)||0})).sort((a,b)=>b.hits-a.hits).slice(0,5)},null,2));
  await page.screenshot({path:path.join(out,mode+'.png')});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>closeDrawers());await page.waitForTimeout(400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await page.screenshot({path:path.join(out,mode+'-mobile.png')});result.narrow=true;
  const record={mode,legacy,baselineRef:legacy?baselineRef:null,workspaceSha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),...result,errors};results.push(record);
  fs.writeFileSync(path.join(out,(legacy?'baseline-':'')+mode+'-results.json'),JSON.stringify(record,null,2));assert.deepEqual(errors,[]);await context.close();
 }
 if(baseline){for(const r of results)assert.deepEqual(r.issues,results[0].issues,'before/after/file exact space-check parity');
  const median=rows=>{const a=rows.map(v=>v.ms).sort((a,b)=>a-b);return (a[(a.length-1)>>1]+a[a.length>>1])/2;},before=results[0],comparison=before.rows.filter((r,i)=>i%iterations===0).map(row=>({id:row.id,name:row.name,beforeMedian:median(before.rows.filter(v=>v.id===row.id)),afterMedian:median(results[1].rows.filter(v=>v.id===row.id)),fileMedian:median(results[2].rows.filter(v=>v.id===row.id))}));
  fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({baselineRef,workspaceSha256:before.workspaceSha256,exactSpaceCheckParity:true,comparison},null,2));console.log(JSON.stringify(comparison));
 }
 }finally{await browser.close();await server.close();assert(source.equals(fs.readFileSync(input)),'input workspace changed');}
})().catch(e=>{console.error(e);process.exitCode=1;});
