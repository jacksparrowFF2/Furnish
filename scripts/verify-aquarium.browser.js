async(page)=>{
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8765'))external.push(r.url());});
  const base=mode==='file'?'file:///'+root:'http://127.0.0.1:8765/',check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto(base+'output/aquarium/preview.html');await p.waitForFunction(()=>window.previewReady);
  for(const label of ['正面','斜视']){await p.getByRole('button',{name:label,exact:true}).click();await p.screenshot({path:root+'output/aquarium/'+mode+'-'+(label==='正面'?'front':'angle')+'.png'});}
  await p.getByRole('button',{name:'查看空缸',exact:true}).click();check(await p.evaluate(()=>{let hidden=0;window.aquariumPreview.model.traverse(o=>{if(['aquascape','water'].includes(o.userData.aquariumPart)&&!o.visible)hidden++;});return hidden===2;}),'empty view');
  await p.screenshot({path:root+'output/aquarium/'+mode+'-empty.png'});await p.getByRole('button',{name:'背面',exact:true}).click();
  await p.goto(base+'index.html');await p.locator('#lib').waitFor();await p.locator('#lib').getByText('米家智能鱼缸 2 Pro',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
  check(await p.evaluate(id=>{const f=getF(id);return f.w===505&&f.d===292&&f.h===334&&f.mountHeight===0&&f.model==='智能鱼缸 2 Pro';},id),'creation');
  for(const [selector,value,key] of [['#fMountHeight','750','mountHeight'],['#fH','400','h'],['#fW','600','w'],['#fD','320','d']]){
   await p.locator(selector).fill(value);await p.locator(selector).press('Tab');check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');
  }
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await p.evaluate(id=>getF(id).d===292,id),'undo');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await p.evaluate(id=>getF(id).d===320,id),'redo');
  await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===0,id),'zero');await p.evaluate(()=>undo());
  await p.locator('#fMountHeight').fill('-1');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===750,id),'invalid elevation');
  await p.locator('[data-act="lock"]').first().click();check(await p.locator('#fMountHeight').isDisabled(),'lock');await p.locator('[data-act="lock"]').first().click();
  await p.getByRole('button',{name:'复制',exact:true}).click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='aquarium_mijia_2pro').length===2),'copy');await p.evaluate(()=>undo());
  const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');await p.evaluate(id=>selectIds([id]),id);
  // Real project download/upload includes one named design as well as current work.
  await p.evaluate(()=>{store.designs.push({id:'aquarium-check',name:'鱼缸验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))});});
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/aquarium/'+mode+'.furnish.json';await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'download/reimport');check(await p.evaluate(()=>store.designs.some(d=>d.id==='aquarium-check'&&d.work.furniture.some(f=>f.type==='aquarium_mijia_2pro'&&f.mountHeight===750))),'named design');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(600);await p.screenshot({path:root+'output/playwright/aquarium/'+mode+'-app-3d.png'});
  check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D render');
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();await p.waitForTimeout(300);
  check(await p.locator('#fMountHeight').isVisible(),'narrow height field');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:root+'output/playwright/aquarium/'+mode+'-mobile.png'});
  check(!errors.length,errors.join(';'));check(!external.length,'external dependencies');results.push({mode,passed:true,errors,externalRequests:external.length});await context.close();
 }
 return results;
}
