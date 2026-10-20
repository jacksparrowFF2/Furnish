async(page,V)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[],checks=[];
  p.on('pageerror',e=>errors.push(e.message));
  const ok=(v,m)=>{check(v,mode+': '+m);checks.push(m);},read=()=>p.evaluate(()=>JSON.stringify(state));
  const shot=async name=>{await p.waitForFunction(()=>!document.querySelector('#toast.show'));await p.screenshot({path:V.output('playwright/property-scopes/'+mode+'-'+name+'.png')});};
  const hiddenFab=async()=>{const bay=await p.evaluate(()=>!!FurnishBayWindows.selected(PLAN,ui.sel));if(bay){ok(await p.locator('#fab [data-bay-fab]').count()===2&&await p.locator('#fab [data-fab-edit]').count()===0,'bay keeps assembly navigation without furniture editors');}else ok(!await p.locator('#fab').evaluate(el=>el.classList.contains('show')),'no floating editor for '+await p.evaluate(()=>ui.sel.kind));};
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{mutate(()=>{state.furniture=[{...F('custom','多选 A',2500,2500,600,500,0,'#cfc6b8'),id:'scope-a',h:800},{...F('custom','多选 B',3500,3200,450,400,0,'#bed6d9'),id:'scope-b',h:700}];});selectIds(['scope-a','scope-b']);});
   const original=await read();
   ok(await p.locator('#panel [data-act="rotL"],#panel [data-act="rotR"],#panel [data-act="flip"],#panel [data-act="lock"],#panel [data-act="dup"],#panel [data-act="del"],#panel [data-act="group"],#panel [data-act="ungroup"],#panel .directional-measurements').count()===0,'multi has no duplicated floating actions');
   ok(await p.locator('#panel [data-act="al"],#panel [data-act="ac"],#panel [data-act="ar"],#panel [data-act="at"],#panel [data-act="am"],#panel [data-act="ab"],#panel [data-act="dh"],#panel [data-act="dv"],#panel [data-act="match"]').count()===9,'all unique alignment distribution and size controls retained');
   ok(await p.locator('#panel #selection-product-details,#panel #group-fit-feedback,#panel [data-focus]').count()===4,'group purchasing checks and member list retained');
   ok(await p.locator('#fab [data-fab-edit="size"]').count()===0,'multi has no single-item size editor');
   await p.locator('#panel [data-act="al"]').click();ok(await p.evaluate(()=>FurnishDesign.bounds(getF('scope-a'))[0]===FurnishDesign.bounds(getF('scope-b'))[0]),'sidebar alignment works');await p.evaluate(()=>undo());ok(await read()===original,'alignment undo');
   await p.locator('#panel [data-act="match"]').click();ok(await p.evaluate(()=>getF('scope-a').w===getF('scope-b').w&&getF('scope-a').d===getF('scope-b').d),'sidebar match size works');await p.evaluate(()=>undo());
   await p.locator('#fab [data-act="group"]').click();ok(await p.locator('#fab [data-act="ungroup"]').count()===1,'floating group and ungroup retained');await p.evaluate(()=>undo());
   await p.locator('#panel [data-act="home"]').click();ok(await p.evaluate(()=>ui.panelScope==='design'&&selIds().length===2),'view whole design preserves multiselection');
   await p.locator('[data-panel-scope="object"]').click();await shot('multi-desktop');
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>drawer('panel',true));await p.locator('#panel [data-act="match"]').scrollIntoViewIfNeeded();ok(await p.locator('#panel [data-act="match"]').isVisible(),'unique multi edit reachable on mobile');await shot('multi-mobile');
   await p.evaluate(()=>{closeDrawers();selectIds(['scope-a','scope-b']);});await p.locator('#fab [data-act="done"]').click();ok(await p.evaluate(()=>ui.sel===null),'floating done clears selection');await p.setViewportSize({width:1500,height:1000});
   await p.evaluate(()=>{const host={...F('counter','旧洗衣区',4000,4000,1340,630,0,'#f3f1ec'),id:'scope-laundry'};const members=FurnishKitchen.createLaundryArea(host,uid,'scope-laundry-group','left');mutate(()=>state.furniture=members);selectIds([host.id]);});
   ok(await p.evaluate(()=>selIds().length===5),'legacy laundry selects five grouped members');
   for(const id of ['laundry-switch-sides','laundry-doors-open','laundry-doors-close','laundry-integrate'])ok(await p.locator('#panel #'+id).count()===1,'legacy group keeps '+id);
   ok(await p.locator('#panel [data-laundry-edit]').count()===1&&await p.locator('#fab [data-fab-edit="size"]').count()===0,'legacy group retains its only designer entry');
   const legacyBefore=await read();await p.locator('#laundry-switch-sides').click();ok(await p.evaluate(()=>FurnishKitchen.laundrySide(getF('scope-laundry'))==='right'),'legacy group side switch works');await p.evaluate(()=>undo());ok(await read()===legacyBefore,'legacy group switch undo');
   // Architectural objects have no editing toolbar: every sidebar capability stays.
   for(const [kind,fields] of [['door',['oType','oSwing','oFlip','oHinge','oReset']],['slide',['slidePanels','slideFloorTrack','slideStackSide']],['win',['wPanels','wStackSide','wSill','wHeight','wHead','wApply','wReset']],['wall',['wall-editor','wall-finish-panel']]]){
    await p.evaluate(kind=>select({kind,id:kind==='wall'?'w0':kind==='win'?WINS.findIndex(w=>!w.bayId):0}),kind);await hiddenFab();
    for(const id of fields)ok(await p.locator('#'+id).count()===1,'builtin '+kind+' keeps '+id);
   }
   await p.evaluate(()=>select({kind:'door',id:0}));const beforeDoor=await read();await p.locator('#oHinge').click();ok(await read()!==beforeDoor,'door hinge edit works');await p.evaluate(()=>undo());ok(await read()===beforeDoor,'door hinge undo');await p.evaluate(()=>redo());await V.waitForCache(p);const saved=await read();await p.reload();ok(await read()===saved,'door edit survives redo and refresh');
   await p.evaluate(()=>select({kind:'win',id:WINS.findIndex(w=>!w.bayId)}));const beforeWindow=await read(),height=Number(await p.locator('#wHeight').inputValue());await p.locator('#wHeight').fill(String(height-10));await p.locator('#wApply').click();ok(await read()!==beforeWindow,'builtin window height edit works');await p.evaluate(()=>undo());ok(await read()===beforeWindow,'window undo');
   ok(await p.evaluate(()=>FurnishWorkspace.copyBuiltin()),'create editable architectural copy');
   await p.evaluate(()=>select({kind:'door',id:0}));await hiddenFab();for(const id of ['oType','oSwing','oHinge','opening-position','opening-width','opening-reference','opening-apply'])ok(await p.locator('#'+id).count()===1,'custom door keeps '+id);
   await p.evaluate(()=>select({kind:'win',id:WINS.findIndex(w=>!w.bayId)}));await hiddenFab();for(const id of ['window-position','window-width','window-height','window-sill','window-head','window-apply','window-to-bay'])ok(await p.locator('#'+id).count()===1,'custom window keeps '+id);
   await p.locator('#window-to-bay').click();for(const id of ['bay-type','bay-width','bay-depth','bay-height','bay-window-height','bay-head','bay-remove'])ok(await p.locator('#'+id).count()===1,'bay window keeps '+id);await hiddenFab();await p.evaluate(()=>undo());
   await p.evaluate(()=>select({kind:'wall',id:'w0',wallIds:PLAN.wallRefs.slice(0,2)}));await hiddenFab();
   for(const id of ['wall-x','wall-y','wall-length','wall-thickness','wall-kind','wall-apply','wall-editor','wall-group-select','wall-group-create','wall-group-clear','wall-batch-thickness','wall-batch-apply','wall-finish-panel'])ok(await p.locator('#'+id).count()===1,'wall keeps '+id);
   const beforeWall=await read();await p.locator('#wall-batch-thickness').fill('210');await p.locator('#wall-batch-apply').click();ok(await p.evaluate(()=>state.architecture.draft.walls.filter(w=>PLAN.wallRefs.slice(0,2).includes(w.id)).every(w=>w.thickness===210)),'batch wall thickness edit works');await p.evaluate(()=>undo());ok(await read()===beforeWall,'wall edit undo');
   await shot('wall-desktop');await p.setViewportSize({width:390,height:844});await p.evaluate(()=>drawer('panel',true));await p.locator('#wall-batch-apply').scrollIntoViewIfNeeded();ok(await p.locator('#wall-batch-apply').isVisible(),'mobile wall batch edit reachable');await shot('wall-mobile');
   await p.evaluate(()=>{mutate(()=>state.measures.push({a:{x:2000,y:2000},b:{x:3000,y:2000}}));select({kind:'measure',id:state.measures.length-1});});
   await p.locator('#panel [data-act="home"]').click();ok(await p.evaluate(()=>ui.sel?.kind==='measure'&&ui.panelScope==='design'),'restored measurement view design keeps selection');
   ok(errors.length===0,'no page errors: '+errors.join(';'));results.push({mode,passed:true,checks});
  }finally{await ctx.close();}
 }
 return results;
}
