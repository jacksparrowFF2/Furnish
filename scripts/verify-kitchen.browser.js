async (page,verification)=>{
 const root=verification.root,out=root+'output/playwright/kitchen/',results=[];
 for(const [mode,url,offline] of [['file',verification.fileBase+'index.html',true],['http',(verification.baseURL+'index.html'),false]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,label)=>{if(!ok)throw Error(mode+': '+label);};
  await p.goto(url);await p.locator('#lib').waitFor();
  await p.locator('#lib').getByText('橱柜台面',{exact:true}).first().click();
  check(await p.evaluate(()=>!!getF(selIds()[0]).kitchen),'catalog creates modular kitchen');
  await p.evaluate(()=>{const draft={version:1,id:'custom_kitchen_acceptance',name:'厨房验收空间',source:'dxf',width:700,height:700,image:'',scale:10,walls:[{id:'top',a:[0,0],b:[700,0],thickness:200,kind:'e'},{id:'right',a:[700,0],b:[700,700],thickness:200,kind:'e'},{id:'bottom',a:[700,700],b:[0,700],thickness:200,kind:'e'},{id:'left',a:[0,700],b:[0,0],thickness:200,kind:'e'}],openings:[]};const plan=FurnishDraft.build(draft);store.customPlans.push(draft);PLANS.push(plan);setPlan(plan.id);mutate(()=>{state.furniture=[{id:'legacy-kitchen',type:'counter',name:'兼容厨房',cx:3500,cy:3500,w:1800,d:600,rot:0,color:'#e9e5de'}];});selectIds(['legacy-kitchen']);});
  check(await p.locator('#kitchen-convert').count()===1,'legacy conversion available');await p.locator('#kitchen-convert').click();
  const save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click();await p.locator('#cabinet-edit').click();await p.locator('#cab-kitchen-shape').selectOption('L');await p.locator('[data-k-tab="modules"]').click();
  await p.locator('#cab-kitchen-active').selectOption('3');await p.locator('[data-kitchen-row="3"] [data-k-width]').fill('1200');await p.locator('[data-kitchen-row="3"] [data-k-width]').press('Tab');
  await p.locator('#cab-kitchen-active').selectOption('0');await p.locator('[data-kitchen-row="0"] [data-k-width]').fill('900');await p.locator('[data-kitchen-row="0"] [data-k-width]').press('Tab');
  await p.locator('[data-kitchen-row="0"] [data-k-role]').selectOption('sink');
  await p.locator('#cab-kitchen-active').selectOption('1');await p.locator('[data-kitchen-row="1"] [data-k-width]').fill('900');await p.locator('[data-kitchen-row="1"] [data-k-width]').press('Tab');
  await p.locator('[data-kitchen-row="1"] [data-k-role]').selectOption('hob');await p.locator('#cab-kitchen-active').selectOption('2');await p.locator('[data-kitchen-row="2"] [data-k-role]').selectOption('drawer');await save();
  await p.evaluate(()=>{mutate(()=>state.furniture.push({id:'sink-test',type:'ksink',name:'水槽',cx:1000,cy:1000,w:760,d:450,rot:0,color:'#ccc'},{id:'hob-test',type:'stove',name:'灶具',cx:1500,cy:1000,w:750,d:450,rot:0,color:'#111'}));selectIds(['sink-test']);});
  await p.locator('#kitchen-link').selectOption('legacy-kitchen:0');await p.evaluate(()=>selectIds(['hob-test']));await p.locator('#kitchen-link').selectOption('legacy-kitchen:1');
  await p.evaluate(()=>selectIds(['legacy-kitchen']));await p.locator('#cabinet-edit').click();await p.locator('#cab-kitchen-baseHeight').fill('900');await p.locator('#cab-kitchen-baseHeight').press('Tab');await save();
  check(await p.evaluate(()=>getF('sink-test').counterElevation===940&&getF('hob-test').counterElevation===940),'linked height follows');
  await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('sink-test').counterElevation===860),'undo');await p.evaluate(()=>redo());
  await p.evaluate(()=>{mutate(()=>{const f=getF('legacy-kitchen');f.rot=90;f.flip=true;});});
  check(await p.evaluate(()=>{const h=getF('legacy-kitchen'),m=FurnishKitchen.layout(h)[0],[x,y]=FurnishKitchen.world(h,m.x,m.y),s=getF('sink-test');return x===s.cx&&y===s.cy&&s.flip;}),'rotation/mirror follows');
  await p.evaluate(()=>{selectIds(['legacy-kitchen','sink-test','hob-test']);duplicateSel();});
  check(await p.evaluate(()=>{const s=selItems(),h=s.find(v=>v.kitchen);return s.filter(v=>v.counterLink).every(v=>v.counterLink.hostId===h.id);}), 'copy relinks');await p.evaluate(()=>undo());
  await p.evaluate(()=>{const it=LIB.flatMap(c=>c.items).find(i=>i[0]==='kitchenwall');addItem(it,3500,275);});
  await p.locator('#cabinet-edit').click();await p.locator('#cab-kitchen-mount-height').fill('1600');await p.locator('#cab-kitchen-mount-height').press('Tab');await save();const wallId=await p.evaluate(()=>selIds()[0]);
  check(await p.evaluate(id=>getF(id).mountHeight===1600,wallId),'independent wall height');
  const before=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'refresh persistence');
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const download=await downloading;await download.saveAs(out+mode+'-kitchen.furnish.json');await p.locator('#pr-file').setInputFiles(out+mode+'-kitchen.furnish.json');await p.locator('#pr-restore-confirm').click();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'actual export/upload roundtrip');
  await p.evaluate(()=>{closeDialog();mutate(()=>{const f=getF('legacy-kitchen');f.rot=0;f.flip=false;});selectIds(['legacy-kitchen']);zoomSel();});await p.screenshot({path:out+mode+'-plan.png'});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.locator('#view3d canvas').waitFor({state:'visible'});await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(1200);await p.screenshot({path:out+mode+'-3d.png'});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>selectIds(['legacy-kitchen']));await p.locator('#fab [data-act="prop"]').click();await p.waitForTimeout(450);await p.screenshot({path:out+mode+'-mobile.png'});check(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile document fits');await p.locator('#cabinet-edit').click();check(await p.locator('#cab-kitchen-shape').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth;}),'mobile kitchen controls fit');await p.locator('[data-k-tab="modules"]').click();await p.locator('#cab-kitchen-add').scrollIntoViewIfNeeded();await p.screenshot({path:out+mode+'-mobile-modules.png'});
  check(errors.length===0,'page errors '+errors.join('; '));results.push({mode,status:'PASS',errors});await context.close();
 }
 return results;
}
