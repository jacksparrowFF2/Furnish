async(page,verification)=>{
 const fixture=await (await page.request.get(verification.baseURL+'tests/fixtures/ceiling-end-caps.furnish.json')).json(),results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   const url=(mode==='file'?verification.fileBase:verification.baseURL)+'index.html';await p.goto(url);
   const seed=await p.evaluate(async fixture=>{
    const payload=FurnishProject.unpack(fixture),old=payload.current,plan=FurnishProject.previewPlan(payload,[]),room=plan.rooms[0],linked=JSON.parse(JSON.stringify(old));delete linked.ceilings;
    linked.rooms[room.id]={...linked.rooms[room.id],use:'kitchen',mat:'tile800'};linked.floorFinishes={version:1,areas:{[room.id]:{mode:'layers',rawZ:0,tileThickness:10,baseThickness:50,layout:{width:800,height:400,gap:2,angle:0,origin:[0,0]}}}};
    const tiled=FurnishWallTiling.setEnabled(linked,FurnishProject.effectivePlan(plan,linked),[room.id],true),current=FurnishWallTiling.alignFloor(tiled,FurnishProject.effectivePlan(plan,tiled),[room.id]);
    const wrap=(work,v,updatedAt)=>({v,planId:payload.planId,work:{[payload.planId]:work},designs:[],customPlans:[work.architecture.draft],custom:[],updatedAt}),older=wrap(old,8,100),newer=wrap(current,7,200),mixed=wrap({...current,ceilings:old.ceilings},9,300);
    for(let v=1;v<=9;v++)localStorage.removeItem('huxing-design-v'+v);await FurnishStorage.clear();await FurnishStorage.write(older);localStorage.setItem('huxing-design-v8',JSON.stringify(older));localStorage.setItem('huxing-design-v7',JSON.stringify(newer));return {older,newer,mixed};
   },fixture);
   const archived=[];let file=seed.mixed,revision='initial-file';
   if(mode==='http')await p.route('**/api/furnish/**',async route=>{
    const request=route.request(),body=request.method()==='POST'||request.method()==='PUT'?request.postDataJSON():null;let response;
    if(request.url().endsWith('/recoveries')){archived.push(body.workspace);response={id:'archive-'+archived.length};}
    else if(request.method()==='PUT'){check(body.baseRevision===revision,'save uses current file revision');file=body.workspace;revision='saved-'+Date.now();response={revision};}
    else response={revision,workspace:file};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
   });
   await p.reload();
   check(await p.evaluate(()=>!!state.wallTiling?.surfaces.some(s=>s.followFloor)),'restored floor-wall linkage');
   check(await p.evaluate(()=>!!state.ceilings)===(mode==='http'),'HTTP file retains both features; file mode selects newer legacy v7');
   if(mode==='http'){check(archived.some(w=>w.v===7)&&archived.some(w=>w.v===8),'both old browser caches archived before file arbitration');check(await p.evaluate(()=>STORE==='huxing-design-v9'),'repository initializes into independent v9 key');}
   await p.evaluate(()=>mutate(()=>{state.rooms[Object.keys(state.rooms)[0]].name='合并缓存验收';}));await verification.waitForCache(p);
   check(await p.evaluate(()=>store.v===9&&STORE==='huxing-design-v9'),'real edit upgrades into v9');
   for(const [v,w] of [[7,seed.newer],[8,seed.older]])check(await p.evaluate(({v,w})=>localStorage.getItem('huxing-design-v'+v)===JSON.stringify(w),{v,w}),'old cache '+v+' retained byte for byte');
   if(mode==='http')await p.evaluate(()=>FurnishRepository.flush());
   await p.reload();check(await p.evaluate(()=>state.rooms[Object.keys(state.rooms)[0]].name==='合并缓存验收'),'refresh restores unified edit');check(await p.evaluate(()=>!!state.wallTiling?.surfaces.some(s=>s.followFloor)),'link persists after refresh');
   check(!errors.length,errors.join('\n'));results.push({mode,passed:true,newestLegacySelection:true,legacyKeysPreserved:true,realV9SaveAndRefresh:true,bothCachesArchived:mode==='http',errors});
  }finally{await context.close();}
 }
 return results;
}
