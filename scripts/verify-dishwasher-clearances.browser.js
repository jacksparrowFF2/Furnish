async page=>{
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8765'))external.push(r.url());});
  const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);},select=id=>p.evaluate(id=>selectIds([id]),id),edit=async(selector,value)=>{await p.locator(selector).fill(String(value));await p.locator(selector).press('Tab');};
  const states=kind=>p.locator('#dishwasher-checks [data-dishwasher-check="dishwasher-'+kind+'"]').evaluateAll(els=>els.map(el=>el.dataset.checkOk));
  const backup=async()=>{await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();};
  const upperHeight=async value=>{await select('upper');await p.locator('#cabinet-edit').click();await p.locator('#cab-kitchen-mount-height').waitFor();await edit('#cab-kitchen-mount-height',value);await p.locator('[data-k-tab="space"]').click();return p.locator('#cab-kitchen-space').innerText();};
  try{
   await p.goto((mode==='file'?'file:///'+root:'http://127.0.0.1:8765/')+'index.html');await p.locator('#lib').waitFor();await backup();await p.locator('#pr-file').setInputFiles(root+'tests/fixtures/dishwasher-clearances-project.json');await p.locator('#pr-restore-confirm').click();
   await select('dish');await p.evaluate(()=>zoomToBox([2000,2300,4000,3900],60));
   for(const kind of ['side','overhead','opening'])check((await states(kind)).includes('false'),kind+' initial conflict');check((await states('support')).every(v=>v==='true'),'support 600');
   check((await p.locator('#fit-feedback').innerText()).includes('等于 80 mm 不满足'),'shared property feedback');check(await p.locator('[data-edit-overlay="dishwasher-clearance"]').count()===2,'closed pose has both reservations');check(await p.evaluate(()=>!preparePlanSVG().svg.querySelector('[data-edit-overlay="dishwasher-clearance"]')),'export removes edit reservations');
   await p.locator('#dishwasher-checks').scrollIntoViewIfNeeded();await p.screenshot({path:root+'output/playwright/dishwasher-clearances/'+mode+'-warnings.png'});
   await p.locator('#dishwasher-door').selectOption('open');check((await states('opening')).includes('false'),'open and closed check same reservation');await p.evaluate(()=>undo());check((await states('opening')).includes('false'),'undo pose keeps reservation');
   await p.locator('#fit-check').click();await p.locator('#space-run').click();const full=await p.locator('#space-results').innerText();for(const phrase of ['出气口侧面净距 199 mm','等于 80 mm 不满足','完全开门保守包络'])check(full.includes(phrase),'full check: '+phrase);
   const sideRow=p.locator('#space-results tr').filter({hasText:'出气口侧面净距 199 mm'}).first();await sideRow.getByRole('button',{name:'确认后忽略',exact:true}).click();check((await p.locator('#space-results').innerText()).includes('已确认忽略'),'accept actual check');await p.locator('#dlgClose').click();
   await select('side');await edit('#fX',2425);await select('dish');check((await states('side')).every(v=>v==='true'),'exact 200 side clearance');await p.evaluate(()=>undo());check((await states('side')).includes('false'),'undo side clearance');await p.evaluate(()=>redo());check((await states('side')).every(v=>v==='true'),'redo side clearance');
   const safe=await upperHeight(1510);check(!safe.includes('等于 80 mm 不满足'),'cabinet draft 650 clears dishwasher issue');await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();await select('dish');check((await states('overhead')).every(v=>v==='true'),'saved cabinet 650');
   await p.evaluate(()=>undo());check((await states('overhead')).includes('false'),'undo cabinet height');await p.evaluate(()=>redo());check((await states('overhead')).every(v=>v==='true'),'redo cabinet height');
   const low=await upperHeight(1507);check(low.includes('等于 80 mm 不满足'),'cabinet draft reports related dishwasher');await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();await select('upper');await edit('#fY',2934);await select('dish');check((await states('overhead')).every(v=>v==='true'),'81 outward offset permits top <50');
   await select('obstacle');await edit('#fY',3450);await select('dish');check((await states('opening')).every(v=>v==='true'),'exact open-depth edge');await p.evaluate(()=>undo());check((await states('opening')).includes('false'),'one mm opening occupation restored');await p.evaluate(()=>redo());
   await select('top');await edit('#fY',3124);await select('dish');check((await states('support')).includes('false'),'one mm countertop shortfall');await p.evaluate(()=>undo());check((await states('support')).every(v=>v==='true'),'undo support geometry');
   await p.evaluate(()=>mutate(()=>{Object.assign(getF('obstacle'),{cy:3449,type:'unmodelled'});delete getF('obstacle').h;}));check((await states('opening')).includes('unknown'),'unknown height pending');await p.evaluate(()=>undo());
   await p.evaluate(()=>{store.designs.push({id:'clearance-safe',name:'修正安装方案',planId:PLAN.id,ts:Date.now(),work:structuredClone(state)});});const before=await p.evaluate(()=>JSON.stringify(state.furniture));
   await p.locator('#dishwasher-checks').scrollIntoViewIfNeeded();await p.screenshot({path:root+'output/playwright/dishwasher-clearances/'+mode+'-corrected.png'});
   await backup();const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/dishwasher-clearances/'+mode+'.furnish.json';await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'real project roundtrip');check(await p.evaluate(()=>store.designs.some(d=>d.id==='clearance-safe'&&d.work.furniture.find(f=>f.id==='upper').mountHeight===1507)),'named plan roundtrip');
   await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'refresh');await select('dish');for(const kind of ['side','overhead','opening','support'])check((await states(kind)).every(v=>v==='true'),kind+' survives restore');
   await p.evaluate(()=>zoomToBox([2000,2300,4000,3900],60));await p.screenshot({path:root+'output/playwright/dishwasher-clearances/'+mode+'-plan.png'});
   await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();await p.locator('#dishwasher-checks').scrollIntoViewIfNeeded();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px no overflow');await p.screenshot({path:root+'output/playwright/dishwasher-clearances/'+mode+'-mobile.png'});
   check(!errors.length,errors.join(';'));check(!external.length,'external network requests');results.push({mode,passed:true,pageErrors:errors,externalRequests:external.length});
  }finally{await context.close();}
 }
 return results;
}
