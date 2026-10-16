if(!process.env.FURNISH_VERIFY_ROOT){require('../verify-browser.cjs').main(['pipe-collisions']).catch(e=>{console.error(e);process.exitCode=1;});}else{
// Isolated 1601 fixture: no writes to the user's browser profile or original files.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),P=require('../../src/core/project-core.js'),C=require('../../src/core/cabinet-core.js');
const verification=require('../lib/browser-verification.cjs').configuration();
(async()=>{
 const browser=await require('../lib/browser-verification.cjs').launch(),root=verification.root,out=path.join(root,'output/playwright/pipe-collisions');fs.mkdirSync(out,{recursive:true});
 const data=P.unpack(JSON.parse(fs.readFileSync(verification.fixture('imported.furnish.json'),'utf8'))),draft=data.current.architecture.draft;
 const marker=draft.markers[0],center=marker.at.map(v=>v*draft.scale);marker.pipeDiameter=200;
 const cabinet={id:'test-cab',name:'管道避让柜',type:'cabinet',...C.preset('sideboard-drawers'),cx:center[0],cy:center[1],rot:0};
 const drawer=C.openingZones(cabinet).find(z=>z.kind==='cabinetdrawer'),at=drawer.poly.reduce((a,p)=>[a[0]+p[0]/drawer.poly.length,a[1]+p[1]/drawer.poly.length],[0,0]);
 draft.markers.push({id:'test-front-pipe',name:'开启范围测试管',kind:'drain',at:at.map(v=>v/draft.scale),radius:50,pipeDiameter:100});
 const counterAt=draft.markers[1].at.map(v=>v*draft.scale);
 data.current.furniture=[{id:'test-counter',name:'橱柜台面避让',type:'counter',cx:counterAt[0],cy:counterAt[1],w:1600,d:600,rot:90},cabinet,{id:'test-chair',name:'管道相交椅子',type:'chair',cx:center[0],cy:center[1],w:400,d:400,rot:0}];
 const fixture=path.join(out,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(P.pack(data)));
 for(const [mode,url]of [['http',(verification.baseURL+'index.html')],['file',(verification.fileBase+'index.html')]]){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#lib').waitFor();await page.locator('#projectWorkspace').click();await page.getByRole('button',{name:'备份／加载项目',exact:true}).click();await page.locator('#pr-file').setInputFiles(fixture);await page.locator('#pr-restore-confirm').click();
  const issues=()=>page.evaluate(()=>FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{scanPassages:false}));
  let results=await issues();assert(results.some(v=>v.kind==='pipe'&&v.id==='test-chair'));assert(results.some(v=>v.kind==='cabinetdrawer'&&v.markerIds?.includes('test-front-pipe')));
  assert(await page.locator('#gFurn mask').count()>0);await page.evaluate(()=>selectIds(['test-cab']));await page.locator('#cabinet-edit').click();await page.locator('#cab-preview canvas').waitFor();assert.match(await page.locator('#cab-space').innerText(),/竖管/);await page.screenshot({path:path.join(out,mode+'-preview.png')});await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.locator('#view3d canvas').waitFor({state:'visible'});await page.waitForFunction(()=>is3D()&&!switching);await page.screenshot({path:path.join(out,mode+'-cut.png')});
  await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);
  const before=await page.evaluate(()=>structuredClone(state.furniture));await page.locator('#tracePlan').click();await page.locator('.trace-menu').filter({has:page.locator('#trace-dxf')}).locator('summary').click();await page.locator('#trace-services').click();await page.locator('[data-edit-service]').first().click();await page.locator('#service-x').fill(String(center[0]+3000));await page.getByRole('button',{name:'确认修改',exact:true}).click();await page.locator('#trace-finish').click();
  results=await issues();assert(!results.some(v=>v.kind==='pipe'&&v.markerId===marker.id));assert.deepEqual(await page.evaluate(()=>state.furniture),before);
  await page.getByRole('button',{name:'撤销',exact:true}).first().click();assert((await issues()).some(v=>v.kind==='pipe'&&v.markerId===marker.id));await page.getByRole('button',{name:'重做',exact:true}).first().click();assert(!(await issues()).some(v=>v.kind==='pipe'&&v.markerId===marker.id));
  await page.reload();await page.locator('#lib').waitFor();assert(!(await issues()).some(v=>v.kind==='pipe'&&v.markerId===marker.id));assert.deepEqual(errors,[]);console.log('PASS',mode,'pipe bodies, drawer sweep, cabinet preview, real 3D cuts, edited position, undo/redo, refresh, unchanged furniture');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

}
