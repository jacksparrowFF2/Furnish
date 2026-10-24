/* Read-only 1601 benchmark. Fresh profiles + GET-only static server: never save
 * the real workspace. Optional --baseline-dir supplies pre-change source files. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const V=require('../lib/browser-verification.cjs'),root=V.projectRoot;
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const changed=['src/app.js','src/render/plan-renderer.js','src/ui/canvas-interactions.js','src/core/furniture-solids.js','src/core/snapping.js'];
const args=process.argv.slice(2),baseline=args.includes('--baseline-dir')?path.resolve(args[args.indexOf('--baseline-dir')+1]):null;
const out=path.join(root,'docs/validation/performance-2d-20261024');
async function sample(page){return page.evaluate(()=>{
 const initial=snap(),savedView={...view},id=state.furniture.find(f=>f.type==='bed'&&!furnitureLocked(f))?.id||state.furniture.find(f=>!furnitureLocked(f)).id;
 const stats={},wrap=(o,k)=>{const original=o[k];o[k]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const v=stats[k]||(stats[k]={calls:0,ms:0});v.calls++;v.ms+=performance.now()-t;}};};
 for(const k of ['effectivePlan'])wrap(FurnishProject,k);wrap(FurnishSnapping,'directional');wrap(FurnishGeometry,'bodyParts');
 const take=(name,fn,n=16)=>{fn(-1);for(const k of Object.keys(stats))delete stats[k];const times=[];for(let i=0;i<n;i++){const t=performance.now();fn(i);times.push(performance.now()-t);}const sorted=times.slice().sort((a,b)=>a-b);return {name,times,mean:times.reduce((a,b)=>a+b)/n,p95:sorted[Math.ceil(n*.95)-1],stats:JSON.parse(JSON.stringify(stats))};};
 ui.sel=null;
 const rows=[take('pan-unselected',i=>{view.x0+=i%2?1:-1;applyView();})];
 selectIds([id]);rows.push(take('pan-selected',i=>{view.x0+=i%2?1:-1;applyView();}));
 rows.push(take('zoom-selected',i=>{view.s*=i%2?1.01:1/1.01;applyView();}));
 rows.push(take('drag-work-selected',i=>{const f=getF(id);f.cx+=i%2?1:-1;snapMove(f,f.cx,f.cy,new Set([id]));syncFurnOrder();renderSel();}));
 rows.push(take('renderAll',()=>renderAll(),4));
 state=JSON.parse(initial);Object.assign(view,savedView);renderAll();
 return {id,plan:PLAN.name,count:state.furniture.length,svgNodes:svg.querySelectorAll('*').length,rows};
});}
async function accuracy(page){return page.evaluate(()=>{
 const original=snap(),answers=[],check=(ok,label)=>{if(!ok)throw Error(label);},equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const uncached=members=>{const plan=FurnishProject.effectivePlan(PLAN,state),spatial=FurnishWallFinish.spatial(plan),rects=state.wallFinishes?spatial.walls.map(w=>w.slice(0,4)).concat(spatial.wins.map(w=>w.rect)):WALLS.filter((w,i)=>!state.demolished.includes('w'+i)).map(w=>w.slice(0,4)).concat(WINS.map(w=>w.rect));return FurnishSnapping.directional(members,{plan,rects,solidWallCount:rects.length-WINS.length,furniture:ui.layers.furn?state.furniture:[],rotation:drawingRotation()});};
 const record=(label,members)=>{const actual=directionalMeasurements(members),expected=uncached(members);check(equal(actual,expected),'cached/uncached gaps: '+label);answers.push({label,gaps:actual});if(!label.startsWith('all:')){const value=collisions(),fresh=FurnishGeometry.collisions(renderableFurniture(),FurnishProject.effectivePlan(PLAN,state));check(equal(value,fresh),'canvas/fresh collisions: '+label);answers.push({label:'collision:'+label,value});}};
 const first=state.furniture.find(f=>f.type==='bed')||state.furniture[0],id=first.id;
 for(const f of state.furniture){record('all:'+f.id,[f]);answers.push({label:'snap:'+f.id,position:snapMove(f,f.cx+7,f.cy+11,new Set([f.id]))});}
 for(const rotation of [90,180]){state.drawing={...state.drawing,rotation};record('drawing:'+rotation,[getF(id)]);record('group:'+rotation,state.furniture.slice(0,3));}
 state=JSON.parse(original);record('restore',[getF(id)]);
 for(const [field,value]of [['cx',first.cx+137],['rot',37],['flip',!first.flip],['h',700],['mountHeight',0]]){state=JSON.parse(original);getF(id)[field]=value;record('source:'+field,[getF(id)]);}
 state=JSON.parse(original);const target=state.furniture.find(f=>f.id!==id&&!f.kitchen&&!f.cabinet);target.cx=first.cx+first.w;target.cy=first.cy;record('neighbour moved',[getF(id)]);target.type='unmodelled';delete target.h;delete target.mountHeight;record('neighbour unknown height',[getF(id)]);
 state=JSON.parse(original);const cabinet=state.furniture.find(f=>f.cabinet?.columns?.length);if(cabinet){const col=cabinet.cabinet.columns[0];col.doorOpen=!col.doorOpen;record('cabinet door',[getF(id)]);}
 state=JSON.parse(original);if(state.wallFinishes?.surfaces?.length){state.wallFinishes.surfaces[0].tileThickness+=5;record('wall finish',[getF(id)]);}
 state=JSON.parse(original);if(state.floorFinishes?.areas){Object.values(state.floorFinishes.areas)[0].baseThickness+=7;record('floor finish',[getF(id)]);}
 state=JSON.parse(original);state.furnitureDatum='survey';record('survey datum',[getF(id)]);
 state=JSON.parse(original);ui.layers.furn=false;record('hidden furniture',[getF(id)]);ui.layers.furn=true;
 state=JSON.parse(original);const plan=FurnishProject.effectivePlan(PLAN,state);answers.push({label:'collisions',value:FurnishGeometry.collisions(state.furniture,plan)},{label:'space',value:FurnishProject.spaceCheck(plan,state.furniture,{scanPassages:false})});
 const packed=FurnishProject.pack({planId:PLAN.id,current:state,designs:[{id:'test',name:'test',work:state}],catalog:[]}),round=FurnishProject.unpack(packed);state=round.current;record('project roundtrip',[getF(id)]);const once=JSON.stringify(state);state=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]})).current;check(JSON.stringify(state)===once,'repeat roundtrip drift');
 state=JSON.parse(original);selectIds([id]);const before=snap();mutate(()=>{getF(id).cx+=137;});const moved=snap();record('mutate',[getF(id)]);undo();check(snap()===before,'undo value');record('undo',[getF(id)]);redo();check(snap()===moved,'redo value');record('redo',[getF(id)]);
 state=JSON.parse(original);renderAll();return {answers,checks:answers.length,roundtrip:true,undoRedo:true};
});}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const source=fs.readFileSync(path.join(root,'projects/workspace.furnish.json')),workspace=JSON.parse(source).workspace;
 const server=await V.staticServer(root),browser=await V.loadPlaywright().chromium.launch({headless:true,channel:process.env.FURNISH_BROWSER_CHANNEL||'chrome'}),results=[];
 const report={workspaceSha256:hash(source),sourceHashes:Object.fromEntries(changed.map(f=>[f,{after:hash(fs.readFileSync(path.join(root,f))),...(baseline?{before:hash(fs.readFileSync(path.join(baseline,f)))}:{})}])),results};
 try{
  for(const mode of [...(baseline?['before-http']:[]),'after-http','after-file']){
   const context=await browser.newContext({viewport:{width:1900,height:1100},offline:mode.endsWith('file')}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(ws=>{if(!localStorage.getItem('huxing-design-v16'))localStorage.setItem('huxing-design-v16',JSON.stringify(ws));},workspace);
   if(mode.startsWith('before'))for(const file of changed)await page.route('**/'+file,route=>route.fulfill({path:path.join(baseline,file),contentType:'text/javascript'}));
   try{
    await page.goto(mode.endsWith('file')?pathToFileURL(path.join(root,'index.html')).href:server.baseURL);await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();await page.waitForTimeout(500);
    const benchmark=await sample(page);console.log(mode+' timing complete');const correctness=await accuracy(page),answerSha256=hash(correctness.answers);fs.writeFileSync(path.join(out,mode+'-answers.json'),JSON.stringify(correctness.answers,null,2));console.log(mode+' numerical checks complete');
    // Use real pointer capture and release, then the existing commit/history path.
    const start=await page.evaluate(id=>{selectIds([id]);const f=getF(id),point=svg.createSVGPoint();point.x=f.cx;point.y=f.cy;const at=point.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y,before:snap()};},benchmark.id);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+35,start.y+20,{steps:8});await page.mouse.up();
    const pointer=await page.evaluate(before=>{const moved=snap();if(before===moved)throw Error('real drag did not move furniture');undo();if(snap()!==before)throw Error('real drag undo');redo();if(snap()!==moved)throw Error('real drag redo');return {moved,selection:selIds()};},start.before);
    // Wait for the isolated profile cache, then exercise real page recovery.
    await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>snap()),pointer.moved,'refresh restore');
    await page.evaluate(id=>{selectIds([id]);applyView();},benchmark.id);await page.screenshot({path:path.join(out,mode+'.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{closeDrawers();applyView();});await page.waitForTimeout(350);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await page.screenshot({path:path.join(out,mode+'-mobile.png')});
    assert.deepEqual(errors,[]);results.push({mode,benchmark,answerSha256,checks:correctness.checks,roundtrip:true,undoRedo:true,pointerDrag:true,refresh:true,narrow:true,errors});
    console.log(mode,JSON.stringify(benchmark.rows.map(v=>({name:v.name,mean:+v.mean.toFixed(2),p95:+v.p95.toFixed(2)}))));
   }finally{await context.close();}
  }
  for(const result of results)assert.equal(result.answerSha256,results[0].answerSha256,'before/after/HTTP/file exact numerical parity');
  if(baseline){const before=results[0].benchmark.rows,after=results.find(r=>r.mode==='after-http').benchmark.rows;report.comparison=before.map(b=>{const a=after.find(v=>v.name===b.name);assert(a.mean<b.mean*.6,'performance improvement: '+b.name);return {name:b.name,beforeMean:b.mean,afterMean:a.mean,speedup:b.mean/a.mean};});}
  assert.equal(hash(fs.readFileSync(path.join(root,'projects/workspace.furnish.json'))),report.workspaceSha256,'real workspace unchanged');
  report.exactNumericalParity=true;report.workspaceUnchanged=true;
 }finally{await browser.close();await server.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
