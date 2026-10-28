async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await ctx.newPage();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{const room=PLAN.rooms.find(r=>r.counted!==false),b=bbox(room.poly),x=(b[0]+b[2])/2,y=(b[1]+b[3])/2,rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];mutate(()=>{delete state.ceilings;for(const [id,poly]of [['merge_a',rect(x-600,y-600,600,600)],['merge_b',rect(x-600,y,1000,200)],['merge_c',rect(x+200,y+200,200,600)]])state.ceilings=FurnishCeiling.setRegion(state,{id,name:{merge_a:'过道平顶',merge_b:'连接平顶',merge_c:'客厅平顶'}[id],polygon:poly,style:'flat',height:2400,thickness:12,center:true,sections:[]}).ceilings;});});
   const before=await p.evaluate(()=>JSON.stringify(state.ceilings));
   const open=async()=>{await p.locator('#ceiling-open').click();await p.locator('[data-design-action="merge"]').click();};
   const choose=async()=>{for(const id of ['merge_b','merge_c'])await p.locator('[data-design-merge-list] input[value="'+id+'"]').check();};
   await open();await choose();await p.locator('[data-design-action="cancel-merge"]').click();await p.locator('[data-design-action="cancel"]').click();
   if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Cancel changed state');
   await open();await p.locator('[data-design-merge-list] input[value="merge_c"]').check();if(!await p.locator('[data-design-action="apply-merge"]').isDisabled())throw Error('Disconnected merge allowed');await p.locator('[data-design-merge-list] input[value="merge_b"]').check();if(await p.locator('[data-design-action="apply-merge"]').isDisabled())throw Error('Connected merge unavailable');
   await p.locator('[data-design="merge-source"]').selectOption('merge_b');
   await p.screenshot({path:V.output('playwright/ceiling-merge/'+mode+'-desktop.png')});
   await p.setViewportSize({width:390,height:844});await p.locator('[data-design-action="apply-merge"]').scrollIntoViewIfNeeded();await p.screenshot({path:V.output('playwright/ceiling-merge/'+mode+'-mobile.png')});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile page overflows');
   await p.locator('[data-design-action="apply-merge"]').click();
   if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Draft merge wrote application state');
   if(await p.locator('[data-design="region"] option').count()!==1)throw Error('Draft region list not merged');
   await p.locator('[data-design-action="save"]').click();await p.waitForFunction(()=>state.ceilings.regions.length===1);
   const saved=await p.evaluate(()=>JSON.stringify(state.ceilings));
   if(await p.evaluate(()=>state.ceilings.regions[0].id)!=='merge_b')throw Error('Source identity lost');
   await p.evaluate(()=>undo());if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==before)throw Error('Single undo failed');
   await p.evaluate(()=>redo());if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==saved)throw Error('Redo failed');
   await V.waitForCache(p);await p.reload();if(await p.evaluate(()=>JSON.stringify(state.ceilings))!==saved)throw Error('Refresh drift');
   results.push({mode,passed:true,cancel:true,draftIsolation:true,singleUndoRedo:true,refresh:true,mobile:true});
  }finally{await ctx.close();}
 }return results;
}
