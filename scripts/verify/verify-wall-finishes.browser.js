async (page,verification)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const importUI=async file=>{await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});};
  const openWall=async()=>{await p.evaluate(()=>{select({kind:'wall',id:'w0'});drawer('panel',true);});await p.locator('#wall-finish-panel').waitFor();};
  const form=()=>p.locator('#wall-finish-panel [data-finish-face]').first();
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await importUI(verification.fixture('wall-finish.furnish.json'));
   await p.evaluate(()=>{
    const f=F('counter','自动避障厨房',1800,600,1200,600,0,'#cdb391'),k=FurnishKitchen.configure(f,FurnishKitchen.defaults(f));k.id='auto-kitchen';k.kitchen.autoAvoid=true;
    mutate(()=>{state.architecture.phase='design';state.architecture.baseline=structuredClone(state.architecture.draft);state.furniture.push(k);});fitView();
   });
   const before=await p.evaluate(()=>({furniture:JSON.stringify(state.furniture),structure:JSON.stringify(state.architecture),measures:JSON.stringify(state.measures)}));
   await openWall();check(await p.locator('#wall-thickness').isDisabled(),'confirmed bearing structure remains locked');check(!await form().locator('[data-finish-enabled]').isDisabled(),'finish remains editable on locked structure');await form().locator('[data-finish-enabled]').check();await form().locator('[data-finish-tile]').fill('10');await form().locator('[data-finish-bond]').fill('15');await form().locator('[data-finish-apply]').click();
   check(await p.evaluate(()=>state.wallFinishes.surfaces[0].tileThickness===10&&state.wallFinishes.surfaces[0].bondThickness===15),'finish saved through real form');
   check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'thickness must not mutate existing furniture / auto-avoid cabinets');
   check(await p.evaluate(()=>JSON.stringify(state.architecture))===before.structure,'survey structure unchanged');check(await p.evaluate(()=>JSON.stringify(state.measures))===before.measures,'fixed measurements unchanged');
   check(await p.locator('#gWalls [data-wall-finish]').count()>0,'production plan finish strips');
   check(await p.evaluate(()=>{const exported=preparePlanSVG({light:true,visibleLayers:false}).svg;return exported.querySelector('[data-wall-finish]')&&!exported.querySelector('[data-finish-apply]');}),'production SVG export retains finish geometry');
   const data=await p.evaluate(()=>{const plan=FurnishProject.effectivePlan(PLAN,state),sp=FurnishWallFinish.spatial(plan);return {gap:directionalMeasurements(getF('item')).t.distance,span:FurnishDrawing.netSpans(sp.rooms[0],[1500,1500]).vertical.value,solids:plan.wallFinish.solids,issues:FurnishProject.spaceCheck(plan,state.furniture,{scanPassages:false})};});
   check(data.gap===25&&data.span===2775,'measurement scene and section use finished face');check(data.solids.some(s=>s.bottom===2100),'door head retains real vertical finish');
   await p.locator('#undo').click();check(await p.evaluate(()=>!state.wallFinishes),'undo removes finish');await p.locator('#redo').click();check(await p.evaluate(()=>state.wallFinishes.surfaces[0].bondThickness===15),'redo restores finish');
   await openWall();const history=await p.evaluate(()=>undoStack.length);await form().locator('[data-finish-tile]').fill('201');await form().locator('[data-finish-apply]').click();check((await p.locator('[data-finish-error]').innerText()).includes('0–200'),'invalid thickness rejected');check(await p.evaluate(()=>undoStack.length)===history,'invalid form is atomic');
   await form().locator('[data-finish-tile]').fill('10');await form().locator('[data-finish-bond]').fill('');await form().locator('[data-finish-apply]').click();check(await p.evaluate(()=>FurnishProject.effectivePlan(PLAN,state).wallFinish.pending.length===1),'unknown thickness is pending');
   check(await p.evaluate(()=>measurementReferenceName(directionalMeasurements(getF('item')).t).includes('厚度待定')),'numeric clearance labels disclose unknown finish thickness');
   await form().locator('[data-finish-bond]').fill('15');await form().locator('[data-finish-apply]').click();
   await p.screenshot({path:verification.output('playwright/wall-finishes/'+mode+'-desktop.png')});
   await p.evaluate(()=>selectIds(['item']));await p.locator('#panel [data-distance-edit="t"]').click();await p.locator('#directional-gap-input').fill('0');await p.getByRole('button',{name:'应用距离',exact:true}).click();check(await p.evaluate(()=>getF('item').cy===475),'real numeric edit contacts finished face');
   await p.locator('#undo').click();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'undo restores furniture exactly');
   await p.evaluate(()=>{store.designs.push({id:'finish-saved',name:'饰面保留方案',planId:PLAN.id,work:JSON.parse(JSON.stringify(state)),ts:Date.now()});save();});
   await verification.waitForCache(p);await p.reload();check(await p.evaluate(()=>state.wallFinishes.surfaces[0].bondThickness===15),'reload retains finish');check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'reload does not recompute cabinets');
   await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const output=verification.output('playwright/wall-finishes/'+mode+'.furnish.json');await (await downloading).saveAs(output);await p.getByRole('button',{name:'关闭',exact:true}).first().click();
   await importUI(output);check(await p.evaluate(()=>state.wallFinishes.surfaces[0].tileThickness===10&&store.designs.some(d=>d.name==='饰面保留方案'&&d.work.wallFinishes)),'actual project reimport and named design');
   check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'project reimport preserves cabinets');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();await p.screenshot({path:verification.output('playwright/wall-finishes/'+mode+'-3d.png')});
   await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!is3D()&&!switching);
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(450);await openWall();await p.waitForFunction(()=>document.querySelector('aside.right').classList.contains('open'));check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'390 px viewport has no overflow');await form().locator('[data-finish-bond]').fill('20');await form().locator('[data-finish-apply]').click();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'mobile thickness edit keeps cabinets');
   await p.screenshot({path:verification.output('playwright/wall-finishes/'+mode+'-mobile.png')});check(!errors.length,errors.join('\n'));
   await importUI(verification.fixture('wall-finish-opening-hosts.furnish.json'));
   const hostBefore=await p.evaluate(()=>({furniture:JSON.stringify(state.furniture),architecture:JSON.stringify(state.architecture)}));
   check(await p.evaluate(()=>!PLAN.wallRefs.includes('east')&&!PLAN.wallRefs.includes('north')),'opening hosts have no plain wall to select');
   for(const [kind,wallId] of [['win','east'],['door','north']]){
    await p.evaluate(kind=>{select({kind,id:0});drawer('panel',true);},kind);await p.locator('#wall-finish-panel').waitFor();
    check(!await form().locator('[data-finish-enabled]').isDisabled(),'finish editable from locked opening host');
    await form().locator('[data-finish-enabled]').check();await form().locator('[data-finish-tile]').fill('10');await form().locator('[data-finish-bond]').fill('15');await form().locator('[data-finish-apply]').click();
    check(await p.evaluate(wallId=>state.wallFinishes.surfaces.some(s=>s.wallId===wallId&&s.tileThickness===10&&s.bondThickness===15),wallId),'opening property applies the correct host finish');
    await p.locator('#undo').click();check(await p.evaluate(wallId=>!state.wallFinishes?.surfaces.some(s=>s.wallId===wallId),wallId),'opening finish undo');await p.locator('#redo').click();
   }
   const hostResult=await p.evaluate(()=>{const p=FurnishProject.effectivePlan(PLAN,state);return {pending:p.wallFinish.pending,solids:p.wallFinish.solids,furniture:JSON.stringify(state.furniture),architecture:JSON.stringify(state.architecture)};});
   check(!hostResult.pending.length&&hostResult.solids.some(s=>s.wallId==='east'&&s.top===900)&&hostResult.solids.some(s=>s.wallId==='north'&&s.bottom===2100),'opening host sill and head solids');check(hostResult.furniture===hostBefore.furniture&&hostResult.architecture===hostBefore.architecture,'opening finish changes only finishes');
   check(!await p.locator('[data-wall-finish][data-wall="w-1"]').count(),'opening finish never targets an invalid wall');await p.evaluate(()=>{closeDrawers();zoomToBox([3700,950,4250,2250],40);});await p.locator('[data-wall-finish][data-win="0"]').first().click();check(await p.evaluate(()=>ui.sel?.kind==='win'&&Number(ui.sel.id)===0),'clicking window-only finish opens its host properties');
   await verification.waitForCache(p);await p.reload();check(await p.evaluate(()=>state.wallFinishes.surfaces.length===2),'opening host finish refresh');await p.evaluate(()=>{select({kind:'win',id:0});drawer('panel',true);});await p.locator('#wall-finish-panel').waitFor();check(await form().locator('[data-finish-tile]').inputValue()==='10','opening finish form recovers saved thickness');
   await form().scrollIntoViewIfNeeded();await p.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});await p.waitForFunction(()=>!document.querySelector('#toast.show'));await p.screenshot({path:verification.output('playwright/wall-finishes/'+mode+'-opening-host.png')});check(!errors.length,errors.join('\n'));
   results.push({mode,passed:true,form:true,undoRedo:true,unknown:true,invalidAtomic:true,finishedMeasurements:true,precisePlacement:true,unchangedSurveyAndCabinets:true,refresh:true,projectRoundtrip:true,namedDesign:true,production3D:true,mobile390:true,openingHostEditUndoRefresh:true,errors});
  }catch(e){await p.screenshot({path:verification.output('playwright/wall-finishes/'+mode+'-failure.png')});throw e;}finally{await context.close();}
 }
 return results;
}
