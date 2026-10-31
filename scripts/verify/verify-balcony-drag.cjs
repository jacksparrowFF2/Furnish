/* Real desktop pointer profiling; copies the workspace and never edits the source. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{_electron}=require('playwright');
const project=path.resolve(__dirname,'../..'),source=path.resolve(process.argv[2]||'D:/1601装修/Furnish项目/workspace.furnish.json'),baseline=process.argv[3]||'f927c4a8',run=fs.mkdtempSync(path.join(project,'output/playwright/balcony-drag-')),root=path.join(run,'workspace'),hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),originalHash=hash();
fs.mkdirSync(root);for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
fs.mkdirSync(path.join(root,'scripts'));for(const name of require('../package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(project,'scripts',name),path.join(root,'scripts',name));fs.mkdirSync(path.join(root,'projects'));
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function freePort(){const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function exercise(mode){let desktop;try{
 fs.copyFileSync(source,path.join(root,'projects/workspace.furnish.json'));
 fs.writeFileSync(path.join(root,'src/core/furniture-solids.js'),mode==='before'?execFileSync('git',['show',baseline+':src/core/furniture-solids.js'],{cwd:project}):fs.readFileSync(path.join(project,'src/core/furniture-solids.js')));
 const port=await freePort(),env={...process.env,FURNISH_DESKTOP_ROOT:root,FURNISH_DESKTOP_PROFILE:path.join(run,mode+'-profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 desktop=await _electron.launch({executablePath:path.join(project,'output/desktop/Furnish-win32-x64/Furnish.exe'),env,timeout:60000});const page=await desktop.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);await page.waitForURL('http://127.0.0.1:'+port+'/');await page.locator('#lib .item').first().waitFor();await page.waitForFunction(()=>!repositoryBooting);await page.locator('#repository-loading').waitFor({state:'hidden'});
 await page.evaluate(async()=>{const p=await FurnishMcp.execute('get_current_plan',{});await FurnishMcp.execute('set_camera',{planId:p.plan.id,revision:p.revision,requestId:'isolated-perf-2d',view:'2d'});window.dragSamples=[];const original=processCanvasPointerMove;processCanvasPointerMove=function(e){const started=performance.now();try{return original(e);}finally{if(drag?.kind==='move'&&drag.moved)dragSamples.push(performance.now()-started);}};});
 const results=[];
 for(const [name,id]of [['rack','fmvwksrbq1'],['plant','fmvwkt9fr2'],['robot','fmv3wcfw38']]){
  const initial=await page.evaluate(id=>{ui.layers.clear=true;focusItem(id);closeDrawers();for(const el of document.querySelectorAll('#gFurn > [data-fid]'))el.style.pointerEvents=el.dataset.fid===id?'':'none';return JSON.stringify(state.furniture);},id);
  const point=await page.evaluate(id=>{const el=document.querySelector('#gFurn > [data-fid="'+id+'"]'),b=el.getBoundingClientRect();for(let y=.15;y<.95;y+=.1)for(let x=.15;x<.95;x+=.1){const px=b.x+b.width*x,py=b.y+b.height*y,t=document.elementFromPoint(px,py);if(t?.closest('[data-fid]')?.dataset.fid===id&&!t.closest('[data-handle]'))return {x:px,y:py};}throw Error('No visible mouse target: '+id);},id);
  await page.keyboard.down('Alt');await page.mouse.move(point.x,point.y);await page.mouse.down();assert.equal(await page.evaluate(()=>drag?.kind),'move');await page.evaluate(()=>dragSamples=[]);
  for(let i=1;i<=12;i++){await page.mouse.move(point.x-i*3,point.y+i);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  await page.mouse.up();await page.keyboard.up('Alt');const samples=await page.evaluate(()=>dragSamples.slice());assert(samples.length>=10,'actual move frames');assert.notEqual(await page.evaluate(()=>JSON.stringify(state.furniture)),initial,'pointer moved the item');
  await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),initial,'undo restores full layout');
  results.push({name,frames:samples.length,medianMs:median(samples.slice(1)),maxMs:Math.max(...samples),samples});console.log(mode+' '+name+' '+results.at(-1).medianMs.toFixed(1)+'ms');
 }
 await page.screenshot({path:path.join(run,mode+'.png')});assert.deepEqual(errors,[]);await page.evaluate(()=>FurnishRepository.flush());await page.waitForFunction(()=>!savePending);return {mode,results,errors,undoRestores:true};
 }finally{if(desktop)await desktop.evaluate(({app})=>app.exit());assert.equal(hash(),originalHash,'official file unchanged');}}
(async()=>{const results=[];for(const mode of ['before','after'])results.push(await exercise(mode));fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({passed:true,baseline,sourceUnchanged:true,results},null,2));console.log('PASS isolated desktop drag: '+run);})().catch(e=>{console.error(e.message);process.exitCode=1;});
