if(!process.env.FURNISH_VERIFY_ROOT){require('./verify-browser.cjs').main(['dxf-supplement']).catch(e=>{console.error(e);process.exitCode=1;});}else{
// Isolated browser validation; never connects to the user's running browser storage.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const verification=require('./lib/browser-verification.cjs').configuration();
const P=require('../src/core/project-core.js');
(async()=>{
 const browser=await require('./lib/browser-verification.cjs').launch(),root=verification.root,out=path.join(root,'output/playwright/dxf-supplement');fs.mkdirSync(out,{recursive:true});
 const sourcePath=verification.fixture('1601-source.dxf');
 const data=P.unpack(JSON.parse(fs.readFileSync(verification.fixture('zone-vertices-verified.furnish.json'),'utf8')));
 // Deliberately reproduce a missed beam layer using a copy of the saved 1601.
 data.current.furniture=[{id:'validation-bed',name:'验收床',type:'bed',cx:3000,cy:2800,w:1800,d:2000,rot:0},{id:'validation-cabinet',name:'验收衣柜',type:'wardrobe',cx:7500,cy:5000,w:1600,d:600,rot:90}];data.current.architecture.draft.beams=[];delete data.current.architecture.draft.sourceDXF;
 const fixture=path.join(out,'1601-before.json');fs.writeFileSync(fixture,JSON.stringify(P.pack(data)));
 for(const [mode,url]of [['http',(verification.baseURL+'index.html')],['file',(verification.fileBase+'index.html')]]){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#lib').waitFor();
  await page.locator('#projectWorkspace').click();await page.getByRole('button',{name:'备份／加载项目',exact:true}).click();await page.locator('#pr-file').setInputFiles(fixture);await page.locator('#pr-restore-confirm').click();
  const before=await page.evaluate(()=>({furniture:structuredClone(state.furniture),draft:structuredClone(state.architecture.draft)}));
  await page.locator('#tracePlan').click();await page.locator('.trace-menu').filter({has:page.locator('#trace-dxf')}).locator('summary').click();
  await page.locator('#trace-dxf-supplement-file').setInputFiles(sourcePath);
  const layer=page.locator('label').filter({hasText:/^房梁/}).locator('[data-append-layer]');await layer.selectOption('beam');await page.getByRole('button',{name:'确认追加到户型草稿',exact:true}).click();await page.locator('#trace-dxf-supplement').click();await page.locator('label').filter({hasText:/^房梁/}).locator('[data-append-layer]').selectOption('beam');await page.locator('#dxf-append-preview').click();
  assert.match(await page.locator('#dxf-append-result').innerText(),/新增 0 根梁/);
  await page.screenshot({path:path.join(out,mode+'-preview.png')});await page.getByRole('button',{name:'确认追加到户型草稿',exact:true}).click();
  await page.locator('#trace-services').click();await page.locator('[data-edit-service]').first().click();await page.locator('#service-diameter').fill('140');await page.locator('#service-x').fill(String(Number(await page.locator('#service-x').inputValue())+100));await page.getByRole('button',{name:'确认修改',exact:true}).click();
  await page.locator('#trace-finish').click();const after=await page.evaluate(()=>({furniture:structuredClone(state.furniture),draft:structuredClone(state.architecture.draft)}));
  assert.deepEqual(after.furniture,before.furniture);for(const key of ['walls','openings','zones','zoneSplits','regionSettings','scale','width','height'])assert.deepEqual(after.draft[key],before.draft[key]);assert.equal(after.draft.markers[0].pipeDiameter,140);
  await page.getByRole('button',{name:'撤销',exact:true}).first().click();assert.equal(await page.evaluate(()=>state.architecture.draft.beams.length),0);await page.getByRole('button',{name:'重做',exact:true}).first().click();
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.locator('#view3d canvas').waitFor({state:'visible'});await page.waitForFunction(()=>is3D()&&!switching);await page.locator('#view3d').screenshot({path:path.join(out,mode+'-pipes.png')});await page.screenshot({path:path.join(out,mode+'-3d.png')});
  await page.reload();await page.locator('#lib').waitFor();assert.equal(await page.evaluate(()=>state.architecture.draft.markers[0].pipeDiameter),140);assert.deepEqual(await page.evaluate(()=>state.furniture),before.furniture);
  await page.locator('#tracePlan').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,mode+'-narrow.png')});await page.locator('.trace-menu').filter({has:page.locator('#trace-dxf')}).locator('summary').click();await page.locator('#trace-services').click();await page.locator('[data-edit-service]').first().click();await page.screenshot({path:path.join(out,mode+'-narrow-pipe.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS',mode,'1601 fixed frame, furniture, supplement, pipe edit, undo/redo, 3D, refresh, narrow screenshot');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

}
