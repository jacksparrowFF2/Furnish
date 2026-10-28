async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await ctx.newPage();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{const room=PLAN.rooms.find(r=>r.counted!==false),b=bbox(room.poly),x=(b[0]+b[2])/2,y=(b[1]+b[3])/2,rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];mutate(()=>{delete state.ceilings;for(const [id,poly,height]of [['merge_a',rect(x-600,y-600,600,600),2400],['merge_b',rect(x-600,y,1000,200),2480],['merge_c',rect(x+200,y+200,200,600),2440]])state.ceilings=FurnishCeiling.setRegion(state,{id,name:{merge_a:'过道平顶',merge_b:'连接平顶',merge_c:'客厅平顶'}[id],polygon:poly,style:'flat',height,thickness:12,center:true,sections:[]}).ceilings;});});
   const before=await p.evaluate(()=>JSON.stringify(state.ceilings)),merge=p.locator('[data-design-action="merge"]'),area=id=>p.locator('[data-design-region="'+id+'"]');
   const open=async()=>{await p.locator('#ceiling-open').click();await p.locator('[data-design-stage="area"]').click();};
   const add=async id=>{await area(id).click({modifiers:['Control'],force:true});},subtract=async id=>{await area(id).click({modifiers:['Shift'],force:true});};
   const count=async n=>{if(await p.locator('[data-design-merge-selected="true"]').count()!==n)throw Error('Selected count differs from '+n);};
   await p.evaluate(()=>mutate(()=>{let next=FurnishLayers.create(state,'merge_lock','多选验收锁定层');next=FurnishLayers.assign(next,['ceiling:'+state.ceilings.items.find(c=>c.regionId==='merge_a').id],'merge_lock');Object.assign(state,FurnishLayers.update(next,'merge_lock',{locked:true}));}));
   await open();await subtract('merge_a');await count(0);await add('merge_a');await count(0);if(!(await p.locator('[data-design-error]').innerText()).includes('锁定'))throw Error('Locked region added');await p.locator('[data-design-action="cancel"]').click();
   await p.evaluate(()=>mutate(()=>Object.assign(state,FurnishLayers.update(state,'merge_lock',{locked:false}))));
   await open();await area('merge_a').click();await add('merge_b');await add('merge_c');await count(3);await add('merge_b');await count(3);
   await subtract('merge_b');await count(2);await merge.click();
   if(!(await p.locator('[data-design-error]').innerText()).includes('共边'))throw Error('Disconnected selection must be rejected');
   if(await p.locator('[data-design="region"] option').count()!==3)throw Error('Rejected merge changed draft');
   await add('merge_b');await count(3);await p.locator('[data-design-action="cancel"]').click();
   if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Cancel changed state');
   await open();await area('merge_a').click();await add('merge_b');await add('merge_c');await count(3);
   if(!(await p.locator('[data-design-merge-message]').innerText()).includes('2480 mm'))throw Error('Highest elevation not announced');
   await p.evaluate(()=>{document.querySelector('#dlgBody').scrollTop=0;});await p.screenshot({path:V.output('playwright/ceiling-merge/'+mode+'-desktop.png')});
   await p.setViewportSize({width:390,height:844});await merge.scrollIntoViewIfNeeded();await p.screenshot({path:V.output('playwright/ceiling-merge/'+mode+'-mobile.png')});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile page overflows');
   await merge.click();if(await p.locator('[data-design="region"] option').count()!==1)throw Error('Button did not directly merge');
   if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Draft merge wrote application state');
   await p.locator('[data-design-action="save"]').click();await p.waitForFunction(()=>state.ceilings.regions.length===1);
   const saved=await p.evaluate(()=>JSON.stringify(state.ceilings));
   if(!await p.evaluate(()=>state.ceilings.regions[0].id==='merge_a'&&state.ceilings.regions[0].height===2480&&state.ceilings.items[0].height===2480))throw Error('First identity/highest elevation lost');
   await p.evaluate(()=>undo());if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Single undo failed');
   await p.evaluate(()=>redo());if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==saved)throw Error('Redo failed');
   await V.waitForCache(p);await p.reload();if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==saved)throw Error('Refresh drift');
   results.push({mode,passed:true,ctrlAdd:true,shiftSubtract:true,lockedGuard:true,directMerge:true,highestElevation:2480,cancel:true,draftIsolation:true,singleUndoRedo:true,refresh:true,mobile:true});
  }finally{await ctx.close();}
 }return results;
}
