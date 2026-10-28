async(page,V)=>{
 const response=await page.request.get(V.baseURL+'projects/workspace.furnish.json'),seed=(await response.json()).workspace,results=[],id='fmv5b78gp2';
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(seed=>{if(!localStorage.getItem('__shoe_seed')){localStorage.setItem('huxing-design-v28',JSON.stringify(seed));localStorage.setItem('__shoe_seed','1');}},seed);
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   const inspect=()=>p.evaluate(id=>{const f=getF(id),boards=FurnishCabinetMotion.boards(f,{includeStatic:true}),low=boards.filter(b=>b.bottom<10&&FurnishGeometry.inPoly(0,0,b.poly));if(f.w!==970||f.h!==2350||f.cabinet.plinth!==0||low.length)throw Error('current shoe cabinet or floor boards differ');return {w:f.w,d:f.d,h:f.h,boards:boards.length,config:JSON.stringify(f)};},id);
   const before=await inspect();await p.evaluate(id=>FurnishCabinetEditor.open(id),id);await p.locator('#cab-preview canvas:visible').first().waitFor();await p.locator('#cab-3d').click();await p.locator('.cab-display-options').evaluate(e=>e.open=true);await p.locator('#cab-door-view').selectOption('normal');await p.locator('.cab-display-options').evaluate(e=>e.open=false);
   await p.screenshot({path:V.output('playwright/entry-shoe-floor/'+mode+'-cabinet.png'),animations:'disabled'});
   await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();await p.evaluate(id=>{mutate(()=>{getF(id).name+=' 验收';});undo();redo();undo();},id);await V.waitForCache(p);await p.reload();const after=await inspect();if(after.config!==before.config)throw Error('unchanged design save/refresh drift');
   await p.evaluate(id=>FurnishCabinetEditor.open(id),id);await p.locator('#cab-preview canvas:visible').first().waitFor();await p.setViewportSize({width:390,height:844});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow');
   await p.screenshot({path:V.output('playwright/entry-shoe-floor/'+mode+'-mobile.png'),animations:'disabled'});if(errors.length)throw Error(errors.join('\n'));results.push({mode,passed:true,...after});
  }finally{await ctx.close();}
 }
 return results;
}
