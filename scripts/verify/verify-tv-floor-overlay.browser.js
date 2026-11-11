async(page,V)=>{
 const response=await page.request.get(V.baseURL+'tests/fixtures/browser/tv-floor-workspace.json');
 if(!response.ok())throw Error('Missing isolated TV workspace snapshot');
 const seed=(await response.json()).workspace,results=[],id='fmv3yflqw1';
 // Keep the current layout and its active design; unrelated history can fill
 // localStorage twice while an old cache version migrates.
 seed.work={[seed.planId]:seed.work[seed.planId]};seed.designs=seed.designs.filter(d=>d.id===seed.activeDesigns?.[seed.planId]);seed.customPlans=seed.customPlans.filter(p=>p.id===seed.planId);
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline:mode==='file'}),p=await context.newPage(),errors=[],checks=[];
  p.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(seed=>{if(!localStorage.getItem('__tv_overlay_seeded')){localStorage.setItem('huxing-design-v'+seed.v,JSON.stringify(seed));localStorage.setItem('__tv_overlay_seeded','1');}},seed);
  const check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
   const initial=await p.evaluate(id=>structuredClone(getF(id)),id);
   check(initial?.w===2505&&initial.h===350&&initial.d===350,'actual current 1601 TV cabinet restored');
   check(initial.cabinet.doorOverlay==='full'&&initial.cabinet.columns.every(c=>c.finish==='solid'&&c.doorColor==='#f3f1ec'),'five explicit white overlay fronts in old data');
   await p.evaluate(id=>FurnishCabinetBuilderUI.open(id),id);await p.locator('#cab-builder canvas').waitFor();
   check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===JSON.stringify(initial),'opening preserves the saved legacy structure');
   await p.locator('[data-builder-view]').click();await p.locator('.builder-display>summary').click();await p.locator('[data-builder-doors]').selectOption('normal');
   await p.screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-open.png'),animations:'disabled'});
   await p.locator('[data-builder-close-all]').click();await p.getByRole('button',{name:'保存柜体搭建',exact:true}).click();
   check(await p.evaluate(id=>{const f=getF(id),B=FurnishCabinetBuilder;return f.cabinet.boxes.flatMap(b=>b.components).every(c=>['drawers','drawerModule'].includes(c.kind)?B.drawerStates(c).every(v=>!v.open):!c.open);},id),'all drawer and sliding-top states close and save');
   const saved=await p.evaluate(id=>JSON.stringify(getF(id)),id);
   await p.evaluate(()=>undo());check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===JSON.stringify(initial),'undo restores exact old structure and motion');
   await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();await p.waitForFunction(()=>!repositoryBooting);
   check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===saved,'component structure and finish survive refresh');
   const geometry=await p.evaluate(async id=>{
    const THREE=await import('three'),f=getF(id),{box}=FurnishModelPrimitives.create(THREE),model=FurnishCabinetModel.build(THREE,f,box),fronts=[];
    model.updateMatrixWorld(true);model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front'){const b=new THREE.Box3().setFromObject(o);fronts.push({color:o.material.color.getHexString(),bottom:b.min.y,top:b.max.y,width:b.max.x-b.min.x});}});return fronts;
   },id);
   check(geometry.length===5&&geometry.every(f=>f.color==='f3f1ec'&&Math.abs(f.bottom-.001)<1e-6&&Math.abs(f.top-.331)<1e-6),'five production white fronts retain their exact height and overlay');
   await p.setViewportSize({width:390,height:844});await p.evaluate(id=>FurnishCabinetBuilderUI.open(id),id);await p.locator('#cab-builder canvas').waitFor();
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px viewport has no page overflow');
   await p.screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-mobile.png'),animations:'disabled'});
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,checks,geometry});
  }finally{await context.close();}
 }
 return results;
}
