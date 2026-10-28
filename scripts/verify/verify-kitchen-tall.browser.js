async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[],checks=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(18000);
  const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);},read=()=>p.evaluate(()=>structuredClone(getF('tall-kitchen')));
  const open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('tall-kitchen'));await p.locator('#cab-preview canvas:visible').first().waitFor();await V.selectCabinetObject(p,{kind:'bay',column:0});};
  const role=()=>p.locator('[data-kitchen-row="0"] [data-k-role]'),height=()=>p.locator('[data-kitchen-row="0"] [data-k-height]'),save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   await p.evaluate(()=>{const at=ROOMS.find(r=>r.name==='客厅').at,f=FurnishKitchen.configure({id:'tall-kitchen',type:'counter',name:'模块高柜验收',cx:at[0],cy:at[1],rot:0,color:'#bcb5a9'},{version:1,shape:'L',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:580,role:'door'},{run:0,width:786,role:'hob'},{run:0,width:600,role:'door'},{run:1,width:1104,role:'door'}]});mutate(()=>state.furniture=[f]);selectIds([f.id]);});
   const original=await read();await open();await role().selectOption('tall');check(await height().inputValue()==='2200','selecting tall shows editable 2200 mm default');
   check(JSON.stringify(await read())===JSON.stringify(original),'preview stays in draft');await p.getByRole('button',{name:'取消',exact:true}).click();check(JSON.stringify(await read())===JSON.stringify(original),'cancel retains original');
   await open();await role().selectOption('tall');await save();check((await read()).kitchen.modules[0].height===undefined,'unchanged save preserves missing default height');await p.evaluate(()=>undo());await open();await role().selectOption('tall');await height().fill('3201');await height().press('Tab');check((await p.locator('#cab-kitchen-error').textContent()).includes('高柜'),'invalid height rejected');await height().fill('2400');await height().press('Tab');check(!(await p.locator('#cab-kitchen-error').textContent()).trim(),'valid height clears error');
   await p.screenshot({path:V.output('playwright/kitchen-tall/'+mode+'-front.png'),animations:'disabled'});
   await p.locator('#cab-kitchen-3d').click();await p.locator('.cab-display-options>summary').click();await p.locator('#cab-kitchen-door-view').selectOption('normal');await p.locator('.cab-display-options>summary').click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:V.output('playwright/kitchen-tall/'+mode+'-3d.png'),animations:'disabled'});
   await p.locator('#cab-kitchen-open-all').click();await p.screenshot({path:V.output('playwright/kitchen-tall/'+mode+'-open.png'),animations:'disabled'});await p.locator('#cab-kitchen-close-all').click();await save();
   const changed=await read();check(changed.kitchen.modules[0].role==='tall'&&changed.kitchen.modules[0].height===2400,'tall height saved');check(changed.kitchen.baseHeight===830&&changed.kitchen.thickness===20,'low worktop height retained');
   await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'one undo restores old module');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await read())===JSON.stringify(changed),'redo and refresh retain tall module');
   await p.setViewportSize({width:390,height:844});await open();check(await height().isVisible(),'mobile tall control visible');await height().fill('2200');await height().press('Tab');await p.screenshot({path:V.output('playwright/kitchen-tall/'+mode+'-mobile.png'),animations:'disabled'});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile no page overflow');await save();
   const roundtrip=await p.evaluate(()=>{const f=getF('tall-kitchen'),packed=FurnishProject.pack({planId:PLAN.id,current:{furniture:[f]},designs:[{name:'高柜',work:{furniture:[f]}}],catalog:[]}),v=FurnishProject.unpack(packed);return {version:packed.version,heights:[v.current.furniture[0].kitchen.modules[0].height,v.designs[0].work.furniture[0].kitchen.modules[0].height]};});check(roundtrip.version===30&&roundtrip.heights.every(h=>h===2200),'v30 current and named project roundtrip');
   await open();await role().selectOption('door');await save();check((await read()).kitchen.modules[0].height===undefined,'switching back removes tall override');await V.waitForCache(p);await p.reload();check((await read()).kitchen.modules[0].role==='door','ordinary module survives refresh');check(errors.length===0,'no page errors');results.push({mode,passed:true,checks});
  }catch(e){await p.screenshot({path:V.output('playwright/kitchen-tall/'+mode+'-failure.png')});throw e;}finally{await ctx.close();}
 }
 return {passed:true,results};
}
