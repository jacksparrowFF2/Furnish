if(!process.env.FURNISH_VERIFY_ROOT){require('./verify-browser.cjs').main(['beam-roof']).catch(e=>{console.error(e);process.exitCode=1;});}else{
// Isolated browser/storage and a 1601 backup copy. No changes to the user's project.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),P=require('../src/core/project-core.js');
const verification=require('./lib/browser-verification.cjs').configuration();
(async()=>{
 const browser=await require('./lib/browser-verification.cjs').launch(),root=verification.root,out=path.join(root,'output/playwright/beam-roof');fs.mkdirSync(out,{recursive:true});
 const data=P.unpack(JSON.parse(fs.readFileSync(verification.fixture('imported.furnish.json'),'utf8')));data.current.ceilingHeight=3200;
 for(const b of data.current.architecture.draft.beams){delete b.bottomHeight;delete b.topHeight;delete b.ceilingThickness;}
 data.current.furniture=[{id:'test-bed',name:'验收床',type:'bed',cx:3000,cy:3000,w:1800,d:2000,rot:37}];const fixture=path.join(out,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(P.pack(data)));const id=data.current.architecture.draft.beams[0].id;
 for(const [mode,url]of [['http',(verification.baseURL+'index.html')],['file',(verification.fileBase+'index.html')]]){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#lib').waitFor();await page.locator('#projectWorkspace').click();await page.getByRole('button',{name:'备份／加载项目',exact:true}).click();await page.locator('#pr-file').setInputFiles(fixture);await page.locator('#pr-restore-confirm').click();
  const before=await page.evaluate(()=>({furniture:structuredClone(state.furniture),draft:structuredClone(state.architecture.draft)}));
  const enter3d=async()=>{await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.locator('#view3d canvas').waitFor({state:'visible'});await page.waitForFunction(()=>is3D()&&!switching);};
  await enter3d();const label=page.locator('.beam-label[data-beam-label="'+id+'"]');await label.waitFor({state:'visible'});assert.match(await label.innerText(),/2900 mm/);assert.match(await label.innerText(),/默认示意/);await page.screenshot({path:path.join(out,mode+'-default-3d.png')});
  await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);await page.screenshot({path:path.join(out,mode+'-2d.png')});await page.locator('#tracePlan').click();await page.screenshot({path:path.join(out,mode+'-2d-editor.png')});await page.locator('#trace-canvas [data-beam]').first().click();assert(await page.locator('#beam-follow-roof').isChecked());assert(await page.locator('#beam-roof-top').isDisabled());
  await page.locator('#beam-thickness').fill('5000');await page.getByRole('button',{name:'确认梁设置',exact:true}).click();assert.match(await page.locator('#beam-editor-error').innerText(),/梁厚/);
  await page.locator('#beam-thickness').fill('400');assert.match(await page.locator('#beam-bottom-distance').innerText(),/2800 mm/);await page.screenshot({path:path.join(out,mode+'-edit.png')});await page.getByRole('button',{name:'确认梁设置',exact:true}).click();await page.locator('#trace-finish').click();
  const after=await page.evaluate(()=>({furniture:structuredClone(state.furniture),draft:structuredClone(state.architecture.draft)}));assert.deepEqual(after.furniture,before.furniture);for(const key of ['walls','openings','zones','zoneSplits','scale','width','height'])assert.deepEqual(after.draft[key],before.draft[key]);assert.equal(after.draft.beams[0].ceilingThickness,400);
  await enter3d();assert.match(await label.innerText(),/2800 mm/);assert(!(await label.innerText()).includes('默认示意'));await page.screenshot({path:path.join(out,mode+'-confirmed-3d.png')});
  await page.getByRole('button',{name:'撤销',exact:true}).first().click();assert.match(await label.innerText(),/2900 mm/);await page.getByRole('button',{name:'重做',exact:true}).first().click();assert.match(await label.innerText(),/2800 mm/);
  await page.locator('#projectWorkspace').click();await page.getByRole('button',{name:'备份／加载项目',exact:true}).click();await page.locator('[data-project-tab="settings"]').click();await page.locator('#project-ceiling-height').fill('3400');await page.locator('#project-ceiling-save').click();assert.match(await label.innerText(),/3000 mm/);
  await page.reload();await page.locator('#lib').waitFor();assert.equal(await page.evaluate(()=>state.architecture.draft.beams[0].ceilingThickness),400);assert.deepEqual(await page.evaluate(()=>state.furniture),before.furniture);
  await page.locator('#tracePlan').click();await page.locator('.trace-menu').filter({has:page.locator('#trace-dxf')}).locator('summary').click();await page.locator('#trace-beams').click();await page.locator('[data-edit-beam]').first().click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,mode+'-narrow.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS',mode,'1601 default 3D beams, direct editor click, thickness/bottom, validation, roof follow, undo/redo, refresh, narrow, unchanged walls/furniture');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

}
