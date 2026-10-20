async (page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[],checks=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
  const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);},read=()=>p.evaluate(()=>structuredClone(getF('plinth-kitchen'))),save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click(),cancel=()=>p.getByRole('button',{name:'取消',exact:true}).click();
  const open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('plinth-kitchen'));await p.locator('#cab-preview canvas').waitFor();await V.selectCabinetObject(p,{kind:'body'});};
  const set=async value=>{await p.locator('#cab-kitchen-plinth').fill(String(value));await p.locator('#cab-kitchen-plinth').press('Tab');};
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   await p.evaluate(()=>{const at=ROOMS.find(r=>r.name==='客厅').at,f=FurnishKitchen.configure({id:'plinth-kitchen',type:'counter',name:'底座验收厨房',cx:at[0],cy:at[1],rot:180,color:'#eeeeee'},{version:1,shape:'U',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:800,role:'drawer'},{run:0,width:600,role:'door'},{run:1,width:800,role:'sink'},{run:2,width:700,role:'door'}]});mutate(()=>state.furniture=[FurnishKitchen.setDrawerCount(f,0,4)]);selectIds([f.id]);});
   const original=await read();await open();check(await p.locator('#cab-kitchen-plinth').inputValue()==='100','legacy default is 100 mm');await save();check(JSON.stringify(await read())===JSON.stringify(original),'unchanged save preserves missing default');
   await open();await set(50);check(JSON.stringify(await read())===JSON.stringify(original),'preview edits stay in draft');await cancel();check(JSON.stringify(await read())===JSON.stringify(original),'cancel discards plinth edit');
   await open();await set(251);check((await p.locator('#cab-kitchen-error').textContent()).includes('底座'),'over-limit value rejected');await set(50);check(!(await p.locator('#cab-kitchen-error').textContent()).trim(),'valid edit clears error');
   await p.locator('#cab-kitchen-open-all').click();await p.screenshot({path:V.output('playwright/kitchen-plinth/'+mode+'-50.png'),animations:'disabled'});await p.locator('#cab-kitchen-close-all').click();await save();
   const changed=await read();check(changed.kitchen.plinth===50,'saved 50 mm');check(changed.kitchen.baseHeight===830&&changed.kitchen.thickness===20,'cabinet and worktop elevations stay fixed');check(changed.kitchen.modules[0].drawerHeights.every(h=>Math.abs(h-195)<1e-6),'drawer tiers follow available height');
   await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'one undo restores original');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await read())===JSON.stringify(changed),'redo and refresh restore parameter');
   await p.setViewportSize({width:390,height:844});await open();check(await p.locator('#cab-kitchen-plinth').isVisible(),'mobile parameter visible');await set(0);await p.screenshot({path:V.output('playwright/kitchen-plinth/'+mode+'-mobile-0.png'),animations:'disabled'});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile has no page overflow');await save();check((await read()).kitchen.plinth===0,'zero retained');
   const roundtrip=await p.evaluate(()=>{const f=getF('plinth-kitchen'),payload=FurnishProject.pack({planId:PLAN.id,current:{furniture:[f]},designs:[{name:'底座',work:{furniture:[f]}}],catalog:[]}),v=FurnishProject.unpack(payload);return [v.current.furniture[0].kitchen.plinth,v.designs[0].work.furniture[0].kitchen.plinth];});check(roundtrip.every(v=>v===0),'current and named project roundtrip retains zero');
   await V.waitForCache(p);await p.reload();check((await read()).kitchen.plinth===0,'zero survives refresh');check(errors.length===0,'no page errors');results.push({mode,passed:true,checks});
  }catch(e){await p.screenshot({path:V.output('playwright/kitchen-plinth/'+mode+'-failure.png')});throw e;}finally{await ctx.close();}
 }
 return {passed:true,results};
}
