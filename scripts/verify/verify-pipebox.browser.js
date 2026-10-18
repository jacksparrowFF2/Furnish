async (page,verification)=>{
 const results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib').waitFor();
  const item=p.locator('#lib').getByText('管道包覆柜',{exact:true}).first();check(await item.count()===1,'catalog entry');await item.click();
  const id=await p.evaluate(()=>selIds()[0]);check(await p.evaluate(id=>{const f=getF(id);return f.type==='pipebox'&&f.pipeBoxThickness===18&&f.mountHeight===0&&!f.cabinet;},id),'create');
  for(const [selector,value,key] of [['#fW','600','w'],['#fD','400','d'],['#fH','1200','h'],['#fPipeBoxThickness','25.5','pipeBoxThickness'],['#fMountHeight','750','mountHeight']]){
   await p.locator(selector).fill(value);await p.locator(selector).press('Tab');check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');
  }
  await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).mountHeight===0,id),'undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).mountHeight===750,id),'redo');
  for(const shape of ['four','three','two']){
   await p.locator('#fPipeBoxShape').selectOption(shape);check(await p.evaluate(({id,shape})=>getF(id).pipeBoxShape===shape&&FurnishProducts.pipeBoxPanels(getF(id)).length===({four:4,three:3,two:2}[shape]),{id,shape}),'shape '+shape);
   await p.evaluate(()=>undo());check(await p.locator('#fPipeBoxShape').inputValue()!==shape,'shape undo');await p.evaluate(()=>redo());check(await p.locator('#fPipeBoxShape').inputValue()===shape,'shape redo');
   if(shape==='four')check(await p.locator('#fPipeBoxOpenSide, #fPipeBoxCorner').count()===0,'four sides no direction');
   else{
    const key=shape==='three'?'pipeBoxOpenSide':'pipeBoxCorner',selector=shape==='three'?'#fPipeBoxOpenSide':'#fPipeBoxCorner',values=shape==='three'?['front','left','right','back']:['front-left','front-right','back-left','back-right'];
    const placement=await p.evaluate(id=>{const f=getF(id);return JSON.stringify([f.w,f.d,f.cx,f.cy,f.rot,f.flip]);},id);
    for(const value of values){
     const previous=await p.locator(selector).inputValue();await p.locator(selector).selectOption(value);check(await p.evaluate(({id,key,value})=>getF(id)[key]===value,{id,key,value}),'direction edit');
     if(previous!==value){await p.evaluate(()=>undo());check(await p.locator(selector).inputValue()===previous,'direction undo');await p.evaluate(()=>redo());check(await p.locator(selector).inputValue()===value,'direction redo');}
     check(await p.evaluate(id=>{const f=getF(id);return JSON.stringify([f.w,f.d,f.cx,f.cy,f.rot,f.flip]);},id)===placement,'direction preserves placement');
     await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-'+shape+'-'+value+'-2d.png')});
    }
   }
   await p.evaluate(()=>ui.sel&&zoomSel());await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-'+shape+'-2d.png')});
  }
  for(const [selector,value,key,expected] of [['#fPipeBoxThickness','0','pipeBoxThickness',25.5],['#fW','25','w',600],['#fMountHeight','-1','mountHeight',750]]){
   await p.locator(selector).fill(value);await p.locator(selector).press('Tab');check(await p.evaluate(({id,key,expected})=>getF(id)[key]===expected,{id,key,expected}),'invalid '+key);
  }
  await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===0,id),'zero elevation');await p.evaluate(()=>undo());
  await p.locator('[data-act="lock"]').first().click();check(await p.locator('#fPipeBoxThickness').isDisabled(),'lock');check(await p.locator('#fPipeBoxShape').isDisabled(),'shape lock');check(await p.locator('#fPipeBoxCorner').isDisabled(),'direction lock');await p.locator('[data-act="lock"]').first().click();
  await p.getByRole('button',{name:'复制',exact:true}).click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='pipebox'&&f.pipeBoxThickness===25.5&&f.mountHeight===750&&f.pipeBoxShape==='two'&&f.pipeBoxCorner==='back-right').length===2),'copy');await p.evaluate(()=>undo());
  await verification.waitForCache(p);const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.reload();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'reload');await p.evaluate(id=>selectIds([id]),id);
  await p.evaluate(()=>store.designs.push({id:'pipebox-check',name:'包管柜验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))}));
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=verification.output('playwright/pipebox/'+mode+'.furnish.json');await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'project import');check(await p.evaluate(()=>store.designs.some(d=>d.id==='pipebox-check'&&d.work.furniture.some(f=>f.type==='pipebox'&&f.pipeBoxThickness===25.5&&f.pipeBoxShape==='two'&&f.pipeBoxCorner==='back-right'))),'named design');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(700);
  for(const shape of ['four','three','two']){
   await p.locator('#fPipeBoxShape').selectOption(shape);
   if(shape!=='four')for(const value of shape==='three'?['front','left','right','back']:['front-left','front-right','back-left','back-right']){
    await p.locator(shape==='three'?'#fPipeBoxOpenSide':'#fPipeBoxCorner').selectOption(value);await p.waitForTimeout(150);check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D direction');await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-'+shape+'-'+value+'-3d.png')});
   }
   await p.waitForTimeout(150);check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D shape '+shape);await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-'+shape+'-3d.png')});
  }
  check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D');await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-3d.png')});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-2d.png')});
  await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();check(await p.locator('#fPipeBoxThickness').isVisible(),'mobile');check(await p.locator('#fPipeBoxShape').isVisible(),'mobile shape');await p.locator('#fPipeBoxShape').selectOption('four');check(await p.evaluate(id=>getF(id).pipeBoxShape==='four',id),'mobile shape edit');await p.evaluate(()=>undo());check(await p.locator('#fPipeBoxShape').inputValue()==='two','mobile undo');await p.locator('#fPipeBoxCorner').selectOption('front-right');check(await p.evaluate(id=>getF(id).pipeBoxCorner==='front-right',id),'mobile direction edit');await p.evaluate(()=>undo());check(await p.locator('#fPipeBoxCorner').inputValue()==='back-right','mobile direction undo');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');await p.locator('#fPipeBoxCorner').scrollIntoViewIfNeeded();await p.screenshot({path:verification.output('playwright/pipebox/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,passed:true});await context.close();
 }
 return results;
}
