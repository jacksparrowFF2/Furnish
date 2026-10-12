async(page)=>{
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 for(const [mode,url,offline]of [['file','file:///'+root+'index.html',true],['http','http://127.0.0.1:8765/index.html',false]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8765'))external.push(r.url());});
  const check=(v,m)=>{if(!v)throw Error(mode+': '+m);},backup=async()=>{await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();};
  const structure=async()=>{await backup();await p.locator('[data-project-tab="structure"]').click();};
  const issues=()=>p.evaluate(()=>FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{scanPassages:false}).filter(v=>/beam-/.test(v.message)));
  const heights=async(i,b,t)=>{await p.locator('#beam-bottom-'+i).fill(String(b));await p.locator('#beam-top-'+i).fill(String(t));await p.locator('[data-beam-apply="'+i+'"]').click();};
  await p.goto(url);await p.locator('#lib').waitFor();await backup();await p.locator('#pr-file').setInputFiles(root+'tests/fixtures/beam-heights-project.json');await p.locator('#pr-restore-confirm').click();
  check((await issues()).some(v=>v.pending),'legacy unknown beam');await structure();
  await heights(0,'1850','');check((await p.locator('#project-error').innerText()).includes('同时录入'),'partial height rejected');
  check(await p.evaluate(()=>state.architecture.draft.beams[0].bottomHeight===undefined),'invalid input atomic');
  await heights(0,1850,2200);await heights(1,0,1000);await heights(2,2400,3500);
  check((await p.locator('[data-beam-form="beam-door"] [data-beam-status]').innerText()).includes('参与三维'),'recorded status');
  await p.locator('#dlgClose').click();const known=await issues();
  for(const [id,kind]of [['peg','cabinetdoor'],['drawer','cabinetdrawer'],['side','cabinetdoor']])check(known.some(v=>v.id===id&&v.kind===kind&&!v.pending),'known beam '+id);
  await p.evaluate(()=>selectIds(['side']));check((await p.locator('#fit-feedback').innerText()).includes('房梁'),'panel conflict');await p.locator('#cabinet-edit').click();await p.locator('#cab-preview canvas').waitFor();check((await p.locator('#cab-space').innerText()).includes('房梁'),'cabinet editor conflict');await p.getByRole('button',{name:'取消',exact:true}).click();
  await structure();await heights(0,3900,4000);await p.locator('#dlgClose').click();check(!(await issues()).some(v=>v.id==='peg'),'high beam clear');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check((await issues()).some(v=>v.id==='peg'&&!v.pending),'undo beam');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(!(await issues()).some(v=>v.id==='peg'),'redo beam');
  await structure();await p.locator('#beam-bottom-0').fill('500');await p.locator('[data-beam-cancel="0"]').click();check(await p.locator('#beam-bottom-0').inputValue()==='3900','cancel input');
  await heights(0,'','');check((await p.locator('[data-beam-form="beam-door"] [data-beam-status]').innerText()).includes('待录入'),'clear unknown');await heights(0,1850,2200);
  await p.screenshot({path:root+'output/playwright/beam-heights/'+mode+'-heights.png'});await p.locator('#dlgClose').click();
  await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));
  check(await p.locator('#view3d canvas').count()>0,'3D canvas');
  await p.screenshot({path:root+'output/playwright/beam-heights/'+mode+'-3d.png'});
  await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));
  await backup();const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const file=await downloading,path=root+'output/playwright/beam-heights/'+mode+'.json';await file.saveAs(path);await p.locator('#pr-file').setInputFiles(path);await p.locator('#pr-restore-confirm').click();await p.waitForTimeout(800);await p.reload();
  check(await p.evaluate(()=>state.architecture.draft.beams[0].bottomHeight===1850&&state.architecture.draft.beams[2].topHeight===3500),'download reimport reload');check((await issues()).some(v=>v.id==='side'&&!v.pending),'reload conflict');
  await p.setViewportSize({width:390,height:844});await structure();await p.screenshot({path:root+'output/playwright/beam-heights/'+mode+'-mobile.png'});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
  check(errors.length===0,errors.join('\n'));check(external.length===0,'external network');results.push({mode,passed:true,pageErrors:errors,externalRequests:external.length});await context.close();
 }
 return {passed:true,results};
}
