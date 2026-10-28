async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
  const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);},read=()=>p.evaluate(()=>structuredClone(getF('top-ui'))),expand=async()=>{const d=p.locator('[data-cab-details="body-settings-0"]');if(await d.count())await d.evaluate(e=>e.open=true);},open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('top-ui'));await p.locator('#cab-preview canvas:visible').first().waitFor();await expand();},save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   await p.evaluate(()=>{let f={id:'top-ui',type:'wardrobe',cx:4000,cy:4000,rot:37,flip:true,...FurnishCabinet.preset('wardrobe')};f=FurnishCabinet.resize(f,{...f,w:1800,d:600,h:2450});f=FurnishCabinet.setConstruction(f,'independent',{left:18,right:18});mutate(()=>state.furniture=[f]);});
   const original=await read();await open();check(!await p.locator('#cab-top-closure').isChecked(),'old missing closure remains disabled');await save();check(JSON.stringify(await read())===JSON.stringify(original),'open save without editing preserves old data');
   await open();await p.locator('#cab-top-closure').check();check(await p.locator('#cab-top-closure-height').inputValue()==='50'&&await p.locator('#cab-top-door-gap').inputValue()==='10','user confirmed 50/10 defaults');
   check(await p.locator('#cab-error').textContent()==='','valid enabled preview');await p.locator('[data-session-undo]').click();check(!await p.locator('#cab-top-closure').isChecked(),'session undo removes closure');await p.locator('[data-session-redo]').click();check(await p.locator('#cab-top-closure').isChecked(),'session redo restores closure');
   await p.getByRole('button',{name:'取消',exact:true}).click();check(JSON.stringify(await read())===JSON.stringify(original),'cancel preserves old cabinet');
   await open();await p.locator('#cab-top-closure').check();await save();const saved=await read();check(saved.h===original.h&&JSON.stringify(saved.cabinet.columns)===JSON.stringify(original.cabinet.columns),'save retains total height and shelf/door configuration');
   check(saved.cabinet.topClosure.height===50&&saved.cabinet.topClosure.doorGap===10,'50mm closure and 10mm door clearance persisted');await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'application undo restores entire original');await p.evaluate(()=>redo());
   await V.waitForCache(p);check(await p.evaluate(()=>store.v===27&&STORE==='huxing-design-v27'),'new semantics use protected v27 cache');await p.reload();check(JSON.stringify(await read())===JSON.stringify(saved),'v27 cache restores without drift');
   await open();await p.locator('#cab-3d').click();await p.locator('.cab-display-options').evaluate(e=>e.open=true);await p.locator('#cab-door-view').selectOption('normal');await p.locator('.cab-display-options').evaluate(e=>e.open=false);
   await p.screenshot({path:V.output('playwright/cabinet-top-closure/'+mode+'-closed.png'),animations:'disabled'});await p.locator('#cab-open-all').click();await p.screenshot({path:V.output('playwright/cabinet-top-closure/'+mode+'-open.png'),animations:'disabled'});
   const production=await p.evaluate(()=>{const f=getF('top-ui'),boards=FurnishCabinetMotion.boards(f,{includeStatic:true});return {strips:boards.filter(b=>b.metadata.cabinetTopClosure).map(b=>({bottom:b.bottom,top:b.top})),doorTops:boards.filter(b=>b.metadata.cabinetDoorSize).map(b=>b.top),columns:f.cabinet.columns.length,version:FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]}).version};});
   check(production.strips.length===production.columns&&Math.abs(production.strips[0].bottom-2400)<.001&&Math.abs(production.strips[0].top-2450)<.001&&production.doorTops.every(y=>Math.abs(y-2440)<.001)&&production.version===27,'browser production has per-box top strips and exact 10mm door gap: '+JSON.stringify(production));
   await p.setViewportSize({width:390,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px has no page overflow');await p.screenshot({path:V.output('playwright/cabinet-top-closure/'+mode+'-mobile.png'),animations:'disabled'});check(!errors.length,'no browser exceptions');results.push({mode,passed:true,checks,production});
  }finally{await ctx.close();}
 }
 return results;
}
