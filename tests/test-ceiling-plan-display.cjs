/* Real browser regression; only a private workspace copy may be written. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const V=require('../scripts/lib/browser-verification.cjs');
async function main(){
 const output=path.join(V.projectRoot,'output/playwright');fs.mkdirSync(output,{recursive:true});
 const run=fs.mkdtempSync(path.join(output,'ceiling-plan-')),root=path.join(run,'workspace 离线 #');fs.mkdirSync(root);
 for(const name of ['src','styles','assets','vendor','templates'])if(fs.existsSync(path.join(V.projectRoot,name)))fs.cpSync(path.join(V.projectRoot,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(V.projectRoot,'index.html'),path.join(root,'index.html'));
 fs.mkdirSync(path.join(root,'projects'));fs.copyFileSync(path.join(V.projectRoot,'projects/workspace.furnish.json'),path.join(root,'projects/workspace.furnish.json'));
 const server=await V.staticServer(root),results=[];let browser;try{browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions);}catch(e){await server.close();throw e;}
 try{for(const mode of ['http','file']){
  const config=V.configuration({FURNISH_VERIFY_ROOT:root,FURNISH_VERIFY_URL:server.baseURL}),ctx=await browser.newContext({viewport:{width:1500,height:1100},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(workspace=>{if(!localStorage.getItem('display-test-seeded')){localStorage.setItem('huxing-design-v25',JSON.stringify(workspace));localStorage.setItem('display-test-seeded','1');}},JSON.parse(fs.readFileSync(path.join(root,'projects/workspace.furnish.json'),'utf8')).workspace);
  const ready=async()=>p.locator('#repository-loading').waitFor({state:'hidden'}),toggle=k=>p.locator(`[data-plan-mode="${k}"]`).click();
  try{
   await p.goto((mode==='http'?server.baseURL:config.fileBase)+'index.html');await ready();
   await p.evaluate(()=>{closeDrawers();select(null);fitView();});
   const initial=await p.evaluate(()=>({state:JSON.stringify(state),undo:undoStack.length,redo:redoStack.length}));
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-furniture.png')});await toggle('ceiling');
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-ceiling.png')});
   assert.deepEqual(await p.evaluate(()=>({state:JSON.stringify(state),undo:undoStack.length,redo:redoStack.length})),initial,'mode is not a design mutation');
   assert.equal(await p.locator('[data-plan-mode="ceiling"]').getAttribute('aria-pressed'),'true');
   await p.reload();await ready();assert.equal(await p.evaluate(()=>ui.planMode),'ceiling','refresh remembers mode');
   // Load a small known plan through the real import UI, retaining real-plan screenshots above.
   await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
   await p.locator('#pr-file').setInputFiles(path.join(V.projectRoot,'tests/fixtures/ceilings.furnish.json'));await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
   await p.evaluate(()=>{
    const C=FurnishCeiling,r={id:'display_area',name:'显示验收吊顶',polygon:[[500,500],[3500,500],[3500,2200],[500,2200]],style:'ring',height:2400,thickness:12,center:true,sections:[C.componentPreset('gypsum','low')]};
    const next=C.setRegion(state,r);mutate(()=>{state.ceilings=next.ceilings;state.furniture=[{id:'display_bed',type:'bed',name:'参考床',color:'#c9d6df',w:1800,d:2000,cx:1600,cy:1300,rot:0},{id:'display_light',type:'downlight_philips_dl269',name:'筒灯',w:85,d:85,cx:1800,cy:1200,rot:0,mountHeight:2400}];});closeDrawers();fitView();
   });
   assert.equal(await p.locator('#gFurn [data-fid="display_bed"]').getAttribute('opacity'),'.25');
   assert.equal(await p.locator('#gFurn [data-fid="display_light"]').getAttribute('opacity'),null);
   assert.match(await p.locator('[data-ceiling-level]').textContent(),/底部距地砖 2400 mm/);
   assert.equal(await p.evaluate(()=>document.querySelector('#gCeilings').nextElementSibling.id),'gLabels','ceiling drawn above furniture and walls');
   const hit=await p.evaluate(()=>{const c=state.ceilings.items.find(c=>c.regionId==='display_area'&&c.kind==='profile'),points=FurnishCeiling.footprint(c),a=points[0],b=points[1],pt=new DOMPoint((a[0]+b[0])/2,(a[1]+b[1])/2).matrixTransform(document.querySelector('#gCeilings').getScreenCTM());return {x:pt.x,y:pt.y};});await p.mouse.click(hit.x,hit.y);assert.equal(await p.evaluate(()=>ui.sel?.kind),'ceiling','real contour click selects ceiling');
   assert.equal(await p.locator('[data-ceiling-highlight]').count(),2,'complete region highlighted');
   assert.equal(await p.evaluate(()=>document.querySelector('#plan').lastElementChild.id),'gCeilingSelection');
   assert.equal(await p.locator('#gCeilingSelection').getAttribute('pointer-events'),'none');
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-selection.png')});
   assert.ok(await p.evaluate(()=>{const out=preparePlanSVG().svg;return !out.querySelector('#gCeilingSelection,[data-ceiling-target]')&&out.querySelector('[data-ceiling-level]')&&out.querySelector('#gFurn [data-fid="display_bed"]').getAttribute('opacity')==='.25';}),'export retains mode and excludes edit overlays');
   await toggle('furniture');assert.equal(await p.locator('[data-ceiling-id]').first().getAttribute('fill'),'none');assert.equal(await p.locator('[data-ceiling-id]').first().getAttribute('stroke-dasharray'),'6 4');
   assert.equal(await p.locator('#gFurn [data-fid="display_bed"]').getAttribute('opacity'),null);assert.equal(await p.locator('[data-ceiling-level]').count(),0);
   assert.equal(await p.locator('[data-ceiling-highlight]').count(),2,'selection remains on top in furniture mode');
   await p.evaluate(()=>{select(null);renderFurn();renderSel();});assert.equal(await p.locator('[data-ceiling-highlight]').count(),0);
   await toggle('ceiling');await p.evaluate(()=>{renderFurn();renderSel();});assert.equal(await p.locator('#gFurn [data-fid="display_bed"]').getAttribute('opacity'),'.25','partial redraw retains mode');
   await p.evaluate(()=>{state.drawing={...(state.drawing||{}),rotation:90};renderAll();fitView();});assert.equal(await p.locator('#gCeilings').getAttribute('transform'),'rotate(90)');
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-rotation.png')});
   await p.evaluate(()=>{const c=state.ceilings.items[0];FurnishCeilingUI.selectObject(c.id);});
   // Hidden default layer must hide normal drawing, labels and selection together.
   await p.evaluate(()=>{const next=FurnishLayers.update(state,'0',{visible:false});mutate(()=>state.objectLayers=next.objectLayers);});
   assert.equal(await p.locator('[data-ceiling-highlight]').count(),0);assert.equal(await p.locator('[data-ceiling-level]').count(),0);
   assert.ok(await p.evaluate(()=>preparePlanSVG({visibleLayers:false}).svg.querySelector('[data-ceiling-level]')),'complete export restores hidden ceiling labels');
   await p.locator('#undo').click();assert.ok(await p.locator('[data-ceiling-level]').count()>0);
   const data=await p.evaluate(()=>{const packed=FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]});const restored=FurnishProject.unpack(packed);return {before:JSON.stringify(state.ceilings),after:JSON.stringify(restored.current.ceilings)};});assert.equal(data.before,data.after,'project roundtrip');
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();fitView();});await toggle('furniture');await toggle('ceiling');
   const box=await p.locator('.plan-display').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,'mode control fits narrow viewport');
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-mobile.png')});
   assert.equal(await p.locator('[data-model-error]').count(),0,'valid reference furniture');
   await p.evaluate(()=>setLang('en'));assert.equal(await p.locator('[data-plan-mode="ceiling"]').textContent(),'Ceiling plan');await p.evaluate(()=>setTheme('dark'));
   await p.screenshot({animations:'disabled',path:path.join(run,mode+'-dark-en.png')});assert.deepEqual(errors,[]);results.push({mode,status:'PASS'});
  }catch(e){await p.screenshot({animations:'disabled',path:path.join(run,mode+'-failure.png')});throw e;}finally{await ctx.close();}
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(run,'results.json'),JSON.stringify(results,null,2));console.log('Evidence: '+run);}
 console.log('PASS 2D plan modes, persistence, layering, selection, hidden layers, exports, project roundtrip, rotation and narrow viewport over HTTP/file://');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
