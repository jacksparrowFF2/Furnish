async (page) => {
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 for(const [mode,url,offline] of [['file-offline','file:///'+root+'index.html',true],['http','http://127.0.0.1:8765/index.html',false]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(ok,label)=>{if(!ok)throw Error(mode+': '+label);};
  await p.goto(url);await p.locator('#lib').waitFor();
  await p.getByRole('button',{name:'柜体',exact:true}).click();
  check(await p.locator('#lib .item').count()===8,'eight cabinet entries');
  check(await p.locator('#lib').getByText(/更多柜体款式/).isVisible(),'template discovery');
  await p.screenshot({path:root+'output/playwright/cabinet-catalog/'+mode+'-catalog.png'});
  await p.locator('#lib').getByText('衣柜',{exact:true}).click();
  const id=await p.evaluate(()=>selIds()[0]),before=await p.evaluate(id=>JSON.stringify(getF(id)),id);
  await p.locator('#cabinet-edit').click();
  check(await p.locator('#cab-template optgroup').count()===6,'grouped templates');
  check(await p.locator('#cab-template option').count()===20,'all templates');
  await p.locator('#cab-template').selectOption('wall');
  await p.getByRole('button',{name:'取消',exact:true}).click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'cancel retains original');
  await p.locator('#cabinet-edit').click();await p.locator('#cab-template').selectOption('wall');
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  check(await p.evaluate(id=>{const f=getF(id);return f.type==='kitchenwall'&&f.mountHeight===1480&&f.cabinet.template==='wall';},id),'wall installation on save');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'undo original');
  await p.getByRole('button',{name:'重做',exact:true}).first().click();
  await p.locator('#cabinet-edit').click();await p.locator('#cab-template').selectOption('entry-pegboard');
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  check(await p.evaluate(id=>{const f=getF(id);return f.type==='cabinet'&&!Object.hasOwn(f,'mountHeight')&&f.cabinet.template==='entry-pegboard';},id),'floor template clears installation');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();
  check(await p.evaluate(id=>getF(id).mountHeight===1480,id),'undo restores installation');
  await p.getByRole('button',{name:'重做',exact:true}).first().click();
  await p.waitForTimeout(800);await p.reload();
  check(await p.evaluate(id=>getF(id)?.cabinet?.template==='entry-pegboard'&&!Object.hasOwn(getF(id),'mountHeight'),id),'refresh persistence');
  await p.evaluate(id=>selectIds([id]),id);await p.locator('#cabinet-edit').click();
  await p.waitForFunction(()=>document.querySelector('#cab-preview canvas')?.width>0);
  await p.screenshot({path:root+'output/playwright/cabinet-catalog/'+mode+'-designer.png'});
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page width');
  check(await p.locator('#cab-template').isVisible(),'mobile template selector');
  await p.screenshot({path:root+'output/playwright/cabinet-catalog/'+mode+'-mobile.png'});
  check(errors.length===0,'page errors: '+errors.join('; '));
  results.push({mode,entries:8,templates:19,errors});await context.close();
 }
 console.log(JSON.stringify(results));
}
