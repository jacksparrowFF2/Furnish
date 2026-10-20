async (page,verification)=>{
 const results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib').waitFor();
  await p.locator('#catalog-filters summary').click();
  await p.locator('#libCats [data-cat="占位体"]').click();
  await p.locator('#lib').getByText('方块占位体',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]);
  check(await p.evaluate(id=>{const f=getF(id);return f.type==='block'&&f.w===1000&&f.d===1000&&f.h===1000;},id),'create');
  await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-width').fill('1234');await p.locator('#fab-depth').fill('567');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();
  check(await p.evaluate(id=>getF(id).w===1234&&getF(id).d===567,id),'edit footprint via floating toolbar');
  for(const [selector,value,key] of [['#fH','890','h']]){
   await p.locator(selector).fill(value);await p.locator(selector).press('Tab');
   check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),'edit '+key);
  }
  check((await p.locator('#panel [data-furniture-dimensions]').innerText()).includes('长 × 宽 × 高'),'block dimension labels');
  await p.evaluate(()=>undo());check(await p.locator('#fH').inputValue()==='1000','undo');
  await p.evaluate(()=>redo());check(await p.locator('#fH').inputValue()==='890','redo');
  await p.locator('#fH').fill('0');await p.locator('#fH').press('Tab');check(await p.locator('#fH').inputValue()==='890','reject zero height');
  check(await p.locator('#fMountHeight').inputValue()==='0','default elevation');
  await p.locator('#fMountHeight').fill('750');await p.locator('#fMountHeight').press('Tab');
  check(await p.evaluate(id=>{const v=FurnishDesign.furnitureVerticalBounds(getF(id));return v.bottom===750&&v.top===1640;},id),'elevated bounds');
  await p.evaluate(()=>undo());check(await p.locator('#fMountHeight').inputValue()==='0','elevation undo');
  await p.evaluate(()=>redo());check(await p.locator('#fMountHeight').inputValue()==='750','elevation redo');
  for(const invalid of ['-1','20001','']){await p.locator('#fMountHeight').fill(invalid);await p.locator('#fMountHeight').press('Tab');check(await p.locator('#fMountHeight').inputValue()==='750','reject elevation '+invalid);}
  await p.locator('[data-act="lock"]').first().click();
  for(const selector of ['#fab [data-fab-edit="size"]','#fH','#fMountHeight'])check(await p.locator(selector).isDisabled(),'lock '+selector);
  await p.locator('[data-act="lock"]').first().click();
  await p.locator('#fab [data-act="dup"]').click();
  check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='block'&&f.w===1234&&f.d===567&&f.h===890&&f.mountHeight===750).length===2),'copy');
  await p.evaluate(()=>undo());await p.evaluate(id=>selectIds([id]),id);
  await verification.waitForCache(p);const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);
  await p.reload();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'reload');
  await p.evaluate(id=>selectIds([id]),id);
  await p.evaluate(()=>store.designs.push({id:'block-check',name:'占位体验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))}));
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=verification.output('playwright/block-placeholder/'+mode+'.furnish.json');
  await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'project import');
  check(await p.evaluate(()=>store.designs.some(d=>d.id==='block-check'&&d.work.furniture.some(f=>f.type==='block'&&f.h===890&&f.mountHeight===750))),'named design');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.screenshot({path:verification.output('playwright/block-placeholder/'+mode+'-2d.png')});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  await p.getByRole('button',{name:'定位选中',exact:true}).click();
  await p.waitForTimeout(700);check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D model');
  await p.screenshot({path:verification.output('playwright/block-placeholder/'+mode+'-3d.png')});
  await p.locator('#fH').fill('1200');await p.locator('#fH').press('Tab');
  check(await p.evaluate(id=>getF(id).h===1200&&!furnitureError(getF(id)),id),'3D edit');
  await p.evaluate(()=>undo());check(await p.locator('#fH').inputValue()==='890','3D undo');await p.evaluate(()=>redo());
  await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===0,id),'3D grounded');
  await p.evaluate(()=>undo());check(await p.locator('#fMountHeight').inputValue()==='750','3D elevation undo');
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();
  for(const selector of ['#fH','#fMountHeight'])check(await p.locator(selector).isVisible(),'mobile '+selector);
  await p.evaluate(()=>closeDrawers());await p.locator('#fab [data-fab-edit="size"]').click();for(const selector of ['#fab-width','#fab-depth'])check(await p.locator(selector).isVisible(),'mobile '+selector);await p.keyboard.press('Escape');await p.locator('#tgPanel').click();
  await p.locator('#fH').fill('900');await p.locator('#fH').press('Tab');check(await p.evaluate(id=>getF(id).h===900,id),'mobile edit');
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
  await p.locator('#fMountHeight').fill('900');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===900,id),'mobile elevation');
  await p.locator('#fMountHeight').scrollIntoViewIfNeeded();await p.screenshot({path:verification.output('playwright/block-placeholder/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,passed:true});await context.close();
 }
 return results;
}
