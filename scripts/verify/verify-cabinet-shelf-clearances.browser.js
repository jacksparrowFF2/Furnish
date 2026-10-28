async (page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
  const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);},input=side=>p.locator('#cab-tools input[data-shelf-clearance="'+side+'"]'),label=side=>p.locator('#cab-preview .cab-shelf-dimension[data-shelf-clearance="'+side+'"]');
  const read=()=>p.evaluate(()=>structuredClone(getF('clearance-cab'))),open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('clearance-cab'));await p.locator('#cab-preview canvas:visible').first().waitFor();await V.selectCabinetObject(p,{kind:'shelf',column:0,shelf:0});};
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   await p.evaluate(()=>{const at=ROOMS.find(r=>r.name==='客厅').at;mutate(()=>state.furniture=[{id:'clearance-cab',type:'cabinet',cx:at[0],cy:at[1],rot:0,...FurnishCabinet.preset('sideboard-open')}]);});const original=await read();
   await open();await p.locator('#cab-front').click();
   check(await input('upper').isVisible()&&await input('lower').isVisible(),'selected shelf exposes both clearances');
   check(!await p.locator('[data-cab-scope=body]').first().isVisible()&&!await p.locator('[data-inspect-group=shelf]').first().isVisible(),'unrelated whole cabinet and shelf group forms hidden');
   const upper=Number(await input('upper').inputValue()),lower=Number(await input('lower').inputValue());
   await input('upper').fill(String(upper+10.25));await input('upper').press('Enter');
   check(Math.abs(Number(await input('lower').inputValue())-lower+10.25)<1e-5,'upper edit moves shelf and updates lower clearance');
   await label('lower').click();await p.locator('.cab-shelf-input input').fill(String(lower+20.5));await p.locator('.cab-shelf-input input').press('Enter');
   check(Number(await input('lower').inputValue())===lower+20.5,'diagram editing updates inspector');
   await label('upper').focus();await label('upper').press('Enter');await p.screenshot({path:V.output('playwright/cabinet-shelf-clearances/'+mode+'-inline-edit.png'),animations:'disabled'});await p.locator('.cab-shelf-input input').fill('999999');await p.locator('.cab-shelf-input input').press('Enter');
   check(await p.locator('.cab-shelf-input [role=alert]').textContent()!=='','invalid diagram input explains limits');
   await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();check(await p.locator('.cab-shelf-input').isVisible(),'invalid diagram input blocks save');
   await p.locator('.cab-shelf-input input').press('Escape');check(await p.locator('.cab-shelf-input').count()===0,'Escape cancels dimension edit');
   await input('upper').fill('');await V.selectCabinetObject(p,{kind:'body'});check((await p.locator('#cab-error').textContent()).includes('净高'),'empty input blocks object switch');
   await input('upper').fill(String(upper-20.5));await input('upper').press('Enter');
   await p.screenshot({path:V.output('playwright/cabinet-shelf-clearances/'+mode+'-desktop.png'),animations:'disabled'});
   // Save must also consume a valid diagram input that has not been submitted.
   await label('lower').click();await p.locator('.cab-shelf-input input').fill(String(lower+21.5));await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
   await p.locator('#cab-preview').waitFor({state:'detached'});const changed=await read();
   check(changed.cabinet.columns[0].shelves[0]===original.cabinet.columns[0].shelves[0]+21.5,'unsubmitted diagram edit saved');
   check(changed.h===original.h&&changed.w===original.w&&changed.cabinet.columns[0].shelves.slice(1).join()===original.cabinet.columns[0].shelves.slice(1).join(),'outer size and neighboring shelves unchanged');
   await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'one undo restores original');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await read())===JSON.stringify(changed),'redo and reload preserve edit');
   await open();await input('lower').fill(String(lower+30));await p.getByRole('button',{name:'取消',exact:true}).click();check(JSON.stringify(await read())===JSON.stringify(changed),'cancel discards draft');
   await p.setViewportSize({width:390,height:844});await open();await input('upper').scrollIntoViewIfNeeded();check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'narrow inspector has no overflow');
   await p.screenshot({path:V.output('playwright/cabinet-shelf-clearances/'+mode+'-mobile.png'),animations:'disabled'});await p.locator('#cab-front').click();await label('upper').scrollIntoViewIfNeeded();await label('upper').click();await p.locator('.cab-shelf-input input').fill(String(upper-25));await p.locator('.cab-shelf-input input').press('Enter');check(Number(await input('upper').inputValue())===upper-25,'narrow diagram editing works');
   await p.getByRole('button',{name:'取消',exact:true}).click();check(errors.length===0,'no page errors');results.push({mode,checks,passed:true});
  }finally{await ctx.close();}
 }
 return {passed:true,results};
}
