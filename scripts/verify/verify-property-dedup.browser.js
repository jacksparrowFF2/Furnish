async(page,V)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{mutate(()=>{state.furniture=[F('rangehood_fotile_jcd10ta','烟机去重验收',2500,2500,900,350,0,'#111214')];state.furniture[0].id='dedup-hood';});selectIds(['dedup-hood']);});
   check(await p.locator('#panel #fW,#panel #fD').count()===0,'hood has no duplicate width/depth');
   check(await p.locator('#panel #hood-height,#panel #hood-bodyHeight,#panel #fX,#panel #fY,#panel #fR').count()===5,'unique geometry and placement controls retained');
   check((await p.locator('#panel [data-furniture-dimensions]>small').first().innerText())==='包络高','sidebar shows vertical dimensions only');
   await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-width').fill('990');await p.locator('#fab-depth').fill('385');
   await p.getByRole('button',{name:'应用尺寸',exact:true}).click();
   check(await p.evaluate(()=>getF('dedup-hood').w===990&&getF('dedup-hood').d===385),'hood size applies from floating editor');
   await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('dedup-hood').w===900),'hood resize undo');await p.evaluate(()=>redo());
   await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>getF('dedup-hood').w===990&&getF('dedup-hood').d===385),'hood resize refresh');
   await p.evaluate(()=>select({kind:'room',id:ROOMS.find(r=>r.counted!==false).id}));
   check(await p.locator('#panel [data-tiling-open],#panel [data-act="roomFurn"]').count()===0,'room sidebar has no duplicate tiling or furniture selection');
   check(await p.locator('#fab [data-tiling-open],#fab [data-act="roomFurn"]').count()===2,'room floating actions retained');
   check(await p.locator('#panel #rName,#panel #rUse,#panel #rCeilingHeight').count()===3,'unique room properties retained');
   await p.screenshot({path:V.output('playwright/property-dedup/'+mode+'-room.png')});
   await p.locator('#catalog-use').selectOption('laundry');await p.locator('#libSearch').fill('基础洗衣机柜');await p.locator('#lib .item').click();
   check(await p.locator('#panel [data-laundry-edit],#panel #laundry-switch-sides,#panel #laundry-doors-open,#panel #laundry-doors-close').count()===0,'single laundry cabinet has no duplicate designer controls');
   await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#cab-preview canvas').waitFor();
   check(await p.locator('[data-laundry-side]').count()===1,'floating size opens laundry design including side setting');await p.getByRole('button',{name:'取消',exact:true}).click();
   await p.evaluate(()=>{mutate(()=>state.measures.push({a:{x:2000,y:2000},b:{x:3000,y:2000}}));select({kind:'measure',id:state.measures.length-1});});
   check(await p.locator('#panel [data-act="del"]').count()===0&&await p.locator('#fab [data-act="del"]').count()===1,'measurement delete appears once');
   const measures=await p.evaluate(()=>state.measures.length);await p.locator('#fab [data-act="del"]').click();check(await p.evaluate(n=>state.measures.length===n-1,measures),'measurement floating delete works');await p.evaluate(()=>undo());
   await p.evaluate(()=>selectIds(['dedup-hood']));await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());
   await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-width').fill('1000');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();
   check(await p.evaluate(()=>getF('dedup-hood').w===1000),'mobile floating edit');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page fits');
   await p.screenshot({path:V.output('playwright/property-dedup/'+mode+'-mobile.png')});
   check(errors.length===0,errors.join('\n'));results.push({mode,passed:true});
  }finally{await ctx.close();}
 }
 return results;
}
