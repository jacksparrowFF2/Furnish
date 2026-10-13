// Uses an isolated 1601 copy and a synthetic cabinet/pipe; never attaches to
// or writes the user's current browser profile.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js');
const {chromium}=require(process.env.FURNISH_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),root=path.resolve(__dirname,'..'),out=path.join(root,'output/playwright/cut-board-motion');fs.mkdirSync(out,{recursive:true});
 const data=P.unpack(JSON.parse(fs.readFileSync('D:/1601装修/图纸/设计方案/Furnish导入验证/imported.furnish.json','utf8'))),draft=data.current.architecture.draft,marker=draft.markers[0],center=marker.at.map(v=>v*draft.scale);
 const f={id:'motion-cabinet',name:'切孔连续开启验收',type:'cabinet',...C.preset('pantry500'),cx:center[0],cy:center[1],rot:0};f.cabinet.columns[0].handle='none';
 const board=M.boards(f).find(b=>b.motion.axis==='y'),hinge=[board.motion.pivot[0]+center[0],board.motion.pivot[2]+center[1]];marker.at=hinge.map(v=>v/draft.scale);marker.pipeDiameter=100;data.current.furniture=[f];
 const fixture=path.join(out,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(P.pack(data)));
 for(const [mode,url]of [['http','http://127.0.0.1:8765/index.html'],['file','file:///'+root.replaceAll('\\','/')+'/index.html']]){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#lib').waitFor();await page.locator('#projectWorkspace').click();await page.getByRole('button',{name:'备份／加载项目',exact:true}).click();await page.locator('#pr-file').setInputFiles(fixture);await page.locator('#pr-restore-confirm').click();
  const hits=()=>page.evaluate(id=>FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{scanPassages:false}).filter(v=>v.kind==='cabinetdoor'&&v.markerIds?.includes(id)),marker.id);
  assert.equal((await hits()).length,0);await page.evaluate(()=>selectIds(['motion-cabinet']));await page.locator('#cabinet-edit').click();await page.locator('#cab-preview canvas').waitFor();assert(!(await page.locator('#cab-space').innerText()).includes('切孔后板件运动相交'));await page.getByRole('button',{name:'全部打开',exact:true}).click();await page.screenshot({path:path.join(out,mode+'-clear-open.png')});await page.getByRole('button',{name:'取消',exact:true}).click();
  const edit=async(x,y,d)=>{await page.locator('#tracePlan').click();await page.locator('.trace-menu').filter({has:page.locator('#trace-dxf')}).locator('summary').click();await page.locator('#trace-services').click();await page.locator('[data-edit-service]').first().click();await page.locator('#service-x').fill(String(x));await page.locator('#service-y').fill(String(y));await page.locator('#service-diameter').fill(String(d));await page.getByRole('button',{name:'确认修改',exact:true}).click();await page.locator('#trace-finish').click();};
  await edit(hinge[0]+400/Math.sqrt(2),hinge[1]+400/Math.sqrt(2),20);assert((await hits()).some(v=>!v.pending));
  await page.evaluate(()=>selectIds(['motion-cabinet']));await page.locator('#cabinet-edit').click();assert((await page.locator('#cab-space').innerText()).includes('切孔后板件运动相交'));await page.screenshot({path:path.join(out,mode+'-intermediate-hit.png')});await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'撤销',exact:true}).first().click();assert.equal((await hits()).length,0);await page.getByRole('button',{name:'重做',exact:true}).first().click();assert((await hits()).length>0);
  await edit(center[0],center[1]+300,2000);assert.equal((await hits()).length,0);await page.reload();await page.locator('#lib').waitFor();assert.equal((await hits()).length,0);
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.locator('#view3d canvas').waitFor({state:'visible'});await page.waitForFunction(()=>is3D()&&!switching);await page.screenshot({path:path.join(out,mode+'-removed-board.png')});
  assert.deepEqual(errors,[]);console.log('PASS',mode,'cut hinge clear, intermediate collision, editor agreement, moved/expanded pipe, undo/redo, refresh and 3D');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
