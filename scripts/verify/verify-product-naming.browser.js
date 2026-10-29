async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],checks=[];
  const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);checks.push(message);};p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>localStorage.setItem('huxing-catalog-favorites',JSON.stringify([JSON.stringify(['washer_littleswan_tg10k60w','小天鹅 TG10K60W · 10kg'])])));await p.reload();
   await p.locator('[data-collection="favorites"]').click();check(await p.locator('#lib .item').count()===1,'old catalog favorite retained');await p.locator('[data-collection="all"]').click();
   await p.evaluate(()=>{const host=FurnishKitchen.configure({id:'name-host',type:'counter',name:'验收洗衣柜',cx:3000,cy:3000,rot:37,flip:true,w:1340,d:630,color:'#fff'},FurnishKitchen.laundryPreset());
    const device={id:'name-washer',type:'washer',name:'洗衣机',cx:2000,cy:2000,w:600,d:600,h:850,rot:0,color:'#fff',mountHeight:0};mutate(()=>state.furniture=[host,device]);selectIds([device.id]);});
   for(const type of ['washer','washer_littleswan_tg10k60w']){
    await p.evaluate(type=>{mutate(()=>{const f=getF('name-washer');Object.assign(f,{type,w:type==='washer'?600:595,d:type==='washer'?600:560,name:type==='washer'?'洗衣机':'小天鹅 TG10K60W · 10kg',...FurnishProducts.initial({type})});state.furniture=FurnishDesign.restoreFurniture(state.furniture,{makeId:uid,colorFor:()=> '#fff'});});selectIds(['name-washer']);},type);
    check(await p.locator('#laundry-align').count()===1,type+' has inherited alignment');
    check((await p.locator('#fName').locator('..').innerText()).includes('显示名称'),'name label');
    check(await p.locator('input[readonly][value="洗衣机"]').count()===1,'kind shown independently');
    if(type!=='washer')check(await p.locator('#fName').inputValue()==='小天鹅洗衣机 TG10K60W · 10kg','old default upgraded');
    const before=await p.evaluate(()=>structuredClone(getF('name-washer')));await p.locator('#laundry-align').click();
    const aligned=await p.evaluate(()=>structuredClone(getF('name-washer')));
    check(aligned.rot===37&&aligned.flip===true&&aligned.mountHeight===0,type+' alignment preserves height and follows host');
    await p.evaluate(()=>undo());check(await p.evaluate(before=>JSON.stringify(getF('name-washer'))===JSON.stringify(before),before),'alignment undo');
    await p.evaluate(()=>redo());check(await p.evaluate(aligned=>JSON.stringify(getF('name-washer'))===JSON.stringify(aligned),aligned),'alignment redo');
    await p.locator('#fName').fill('阳台主洗衣机');await p.locator('#fName').press('Tab');
    await V.waitForCache(p);await p.reload();await p.evaluate(()=>selectIds(['name-washer']));
    check(await p.locator('#fName').inputValue()==='阳台主洗衣机','personal name survives refresh');check(await p.locator('#laundry-align').count()===1,'alignment survives refresh');
   }
   await p.locator('#laundry-align').scrollIntoViewIfNeeded();await p.waitForTimeout(450);await p.screenshot({path:V.output('playwright/product-naming/'+mode+'-alignment.png')});
   await p.evaluate(()=>FurnishWorkspace.open('products'));await p.waitForTimeout(450);
   check((await p.locator('#prod-form').innerText()).includes('种类：洗衣机'),'product details kind');
   check((await p.locator('#prod-model').locator('..').innerText()).includes('型号／产品名'),'product details model label');
   await p.screenshot({path:V.output('playwright/product-naming/'+mode+'-details.png')});
   await p.setViewportSize({width:390,height:844});await p.screenshot({path:V.output('playwright/product-naming/'+mode+'-mobile-details.png')});
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow screen no overflow');
   await p.locator('#products-purchases').click();check((await p.locator('[data-purchase-row]').allTextContents()).some(t=>t.includes('洗衣机')),'procurement kind shown');
   const event=p.waitForEvent('download');await p.locator('#purchase-export').click();const dl=await event;await dl.saveAs(V.output('playwright/product-naming/'+mode+'-purchase.csv'));
   check(errors.length===0,'no page errors');results.push({mode,status:'PASS',checks,errors});
  }finally{await context.close();}
 }
 return results;
}
