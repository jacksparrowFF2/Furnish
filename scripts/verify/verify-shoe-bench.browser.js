async (page,verification)=>{
 const results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const base=mode==='file'?verification.fileBase:verification.baseURL,check=(v,s)=>{if(!v)throw Error(mode+': '+s);};
  await p.goto(base+'output/shoe-bench/preview.html');await p.waitForFunction(()=>window.previewReady);
  for(const id of ['angle','front','rear','top','side']){await p.locator('#'+id).click();await p.screenshot({path:verification.output('shoe-bench/'+mode+'-'+id+'.png')});}
  await p.goto(base+'index.html');await p.locator('#lib').getByText('源氏木语 橡木软包换鞋凳 · 80cm',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]);check(await p.evaluate(id=>{const f=getF(id);return f.type==='bench_yeswood_oak'&&f.w===800&&f.d===300&&f.h===450;},id),'catalog dimensions');
  await p.locator('[data-fab-edit="size"]').click();await p.locator('#fab-width').fill('960');await p.locator('#fab-depth').fill('480');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();
  check(await p.evaluate(id=>getF(id).w===960&&getF(id).d===480,id),'size edit');await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).w===800,id),'undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).w===960,id),'redo');
  await p.locator('#fab [data-act="prop"]').click();await p.locator('#fH').fill('800');await p.locator('#fH').press('Tab');check(await p.evaluate(id=>getF(id).h===800,id),'height edit');
  await p.locator('#fab [data-act="dup"]').click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='bench_yeswood_oak').length===2),'copy');await p.evaluate(()=>undo());
  const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await verification.waitForCache(p);await p.reload();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');
  check(await p.evaluate(id=>{const w={furniture:[getF(id)]},r=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:w,designs:[{id:'shoe-bench',name:'换鞋凳',work:w}],catalog:[]}));return JSON.stringify(r.current.furniture)===JSON.stringify(w.furniture)&&r.designs[0].work.furniture[0].h===800;},id),'project roundtrip');
  await p.evaluate(id=>{mutate(()=>{const f=getF(id);f.w=800;f.d=300;f.h=450;state.furniture=[f];});selectIds([id]);zoomSel();},id);
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#vSelection').click();await p.waitForTimeout(500);
  check(await p.evaluate(id=>!furnitureError(getF(id))&&furnitureRenderErrors.size===0,id),'production 3D');await p.screenshot({path:verification.output('shoe-bench/'+mode+'-app.png')});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();
  check(await p.locator('#fH').isVisible(),'mobile height');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');await p.screenshot({path:verification.output('shoe-bench/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await context.close();
 }
 return results;
}
