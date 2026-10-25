/* Isolated profiles and GET-only server: benchmark edits never save the workspace file. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url'),V=require('../lib/browser-verification.cjs');
const root=V.projectRoot,args=process.argv.slice(2),arg=name=>args.includes(name)?path.resolve(args[args.indexOf(name)+1]):null,baseline=arg('--baseline-dir'),source=fs.readFileSync(arg('--workspace')||path.join(root,'projects/workspace.furnish.json')),workspace=JSON.parse(source).workspace,out=path.join(root,'output/playwright/numeric-edit');
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
(async()=>{fs.mkdirSync(out,{recursive:true});const server=await V.staticServer(root),browser=await V.loadPlaywright().chromium.launch({headless:true,channel:process.env.FURNISH_BROWSER_CHANNEL||'chrome'}),results=[];try{
 for(const mode of [...(baseline?['before-http']:[]),'after-http','after-file']){
  const context=await browser.newContext({viewport:{width:1600,height:1100},offline:mode.endsWith('file')}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await context.addInitScript(ws=>{if(!localStorage.getItem('huxing-design-v18'))localStorage.setItem('huxing-design-v18',JSON.stringify(ws));},workspace);
   if(mode.startsWith('before'))for(const file of ['src/core/project-core.js','src/core/cabinet-core.js'])await page.route('**/'+file,r=>r.fulfill({path:path.join(baseline,file),contentType:'text/javascript'}));
   await page.goto(mode.endsWith('file')?pathToFileURL(path.join(root,'index.html')).href:server.baseURL);await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();
   const sample=await page.evaluate(()=>{
    const original=snap(),id=state.furniture.find(f=>f.type==='bed'&&!furnitureLocked(f)).id;selectIds([id]);
    const rows=[],answers=[],record=label=>{const plan=FurnishProject.effectivePlan(PLAN,state),f=getF(id);answers.push({label,state:snap(),gaps:directionalMeasurements([f]),snap:snapMove(f,f.cx+7,f.cy+11,new Set([id])),collisions:collisions(),review:FurnishProject.review(plan,state)});};
    for(const field of ['w','cx']){const times=[];for(let i=0;i<4;i++){const t=performance.now();mutate(()=>getF(id)[field]+=i%2?-1:1);times.push(performance.now()-t);}rows.push({field,times,mean:times.reduce((a,b)=>a+b)/times.length});record(field);}
    const edited=snap();undo();redo();if(snap()!==edited)throw Error('undo/redo drift');
    const packed=FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]});if(JSON.stringify(FurnishProject.unpack(packed).current)!==snap())throw Error('project roundtrip drift');
    state=JSON.parse(original);renderAll();selectIds([id]);return {id,name:PLAN.name,count:state.furniture.length,rows,answers};
   });console.log(mode,sample.rows.map(r=>({field:r.field,mean:r.mean})));
   // Exercise the actual size form, distance dialog, validation and history.
   const before=await page.evaluate(()=>snap());await page.locator('#fab [data-fab-edit="size"]').click();const width=Number(await page.locator('#fab-width').inputValue());await page.locator('#fab-width').fill(String(width+10));await page.locator('#fab-size-form [type="submit"]').click();assert.equal(await page.evaluate(id=>getF(id).w,sample.id),width+10);
   await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>snap()),before);await page.evaluate(()=>redo());
   await page.evaluate(()=>undo());
   const candidate=await page.evaluate(()=>{const plan=FurnishProject.effectivePlan(PLAN,state),failures=[];for(const f of state.furniture.filter(f=>!furnitureLocked(f)&&['sofa','bed','chair','dining','table'].includes(f.type))){const gaps=directionalMeasurements([f]);for(const dir of ['l','r','t','b']){const n=gaps[dir]?.distance;if(!(n>30))continue;try{FurnishDesign.placeSelectionAtDirectionalGap(plan,state,[f.id],dir,n-1,{rotation:drawingRotation(),visibleFurniture:ui.layers.furn});selectIds([f.id]);editDirectionalDistance(dir);return {id:f.id,dir,target:n-1};}catch(e){failures.push(f.id+':'+e.message);}}}throw Error('No valid numeric move: '+failures.join(';'));});
   const {dir,target}=candidate;
   await page.locator('#directional-gap-input').fill(String(target));await page.getByRole('button',{name:'应用距离',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#dlg').hidden||document.querySelector('#directional-gap-error')?.textContent);assert(await page.locator('#dlg').evaluate(el=>el.hidden),await page.evaluate(()=>document.querySelector('#directional-gap-error')?.textContent||''));
   const moved=await page.evaluate(()=>snap());assert(Math.abs(await page.evaluate(({id,dir})=>directionalMeasurements([getF(id)])[dir].distance,candidate)-target)<.1);await page.evaluate(()=>{undo();redo();});assert.deepEqual(JSON.parse(await page.evaluate(()=>snap())),JSON.parse(moved));
   await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert.deepEqual(JSON.parse(await page.evaluate(()=>snap())),JSON.parse(moved));
   await page.evaluate(id=>selectIds([id]),sample.id);await page.screenshot({path:path.join(out,mode+'.png')});assert.deepEqual(errors,[]);
   fs.writeFileSync(path.join(out,mode+'-answers.json'),JSON.stringify(sample.answers,null,2));results.push({mode,...sample,answers:undefined,answerSha256:hash(sample.answers),sizeForm:true,distanceDialog:true,undoRedo:true,refresh:true,projectRoundtrip:true,errors});
  }finally{await context.close();}
 }
 for(const result of results)assert.equal(result.answerSha256,results[0].answerSha256,'exact spatial and saved-value parity');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({workspaceSha256:hash(source),exactNumericalParity:true,results},null,2));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e.stack?.split('\n').filter(s=>s.includes('verify-numeric')||s.includes('Error')).join('\n')||e.message);if(e.actual&&e.expected){const a=typeof e.actual==='string'?JSON.parse(e.actual):e.actual,b=typeof e.expected==='string'?JSON.parse(e.expected):e.expected;const walk=(a,b,p='')=>{if(JSON.stringify(a)===JSON.stringify(b))return; if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);}else console.error('DIFF',p,String(a).slice(0,100),String(b).slice(0,100));};walk(a,b);}process.exitCode=1;});
