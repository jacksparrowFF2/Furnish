async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1500,height:950}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const check=(ok,message)=>{if(!ok)throw Error(message);};
 try{
  await p.goto('http://127.0.0.1:8765');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{
   const regular={id:'dimension-cab',type:'wardrobe',cx:2000,cy:2000,rot:0,...FurnishCabinet.preset('wardrobe')};
   const kitchen=FurnishKitchen.configure({id:'dimension-kitchen',type:'counter',cx:3000,cy:3000,rot:0,color:'#f3f1ec'},{version:1,shape:'L',corner:'right',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:800,role:'door'},{run:1,width:600,role:'drawer'},{run:0,width:450,role:'sink'},{run:1,width:300,role:'empty'}]});
   mutate(()=>state.furniture.push(regular,kitchen));FurnishCabinetEditor.open(kitchen.id);
  });
  await p.locator('#cab-preview canvas').waitFor();
  const badge=i=>p.locator('.cab-module-number').filter({hasText:new RegExp('^'+i+'$')});
  check(await p.locator('.cab-module-number').count()===4,'all modules including empty numbered');
  check((await p.locator('.cab-size-summary').textContent()).includes('主边总长 1850 · 转角边总长 1500'),'overall dimensions');
  await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-kitchen.png'});
  await badge(4).click();check(await p.locator('#cab-kitchen-active').inputValue()==='3','badge selects empty module without opening');
  await p.locator('#cab-kitchen-dimensions').uncheck();check(await p.locator('.cab-dimension').count()===0,'dimension checkbox hides rulers');check(await p.locator('.cab-module-number').count()===4,'numbers retained');
  await p.locator('#cab-kitchen-dimensions').check();
  await badge(3).click();await p.locator('[data-kitchen-row="2"] [data-k-width]').fill('460.25');
  await badge(1).click();check((await p.locator('.cab-size-summary').textContent()).includes('1860.25'),'badge commits unblurred dimension to draft');
  await p.locator('#cab-kitchen-front').click();
  await p.setViewportSize({width:390,height:844});
  const overlaps=await p.locator('.cab-elevation-preview').evaluateAll(hosts=>{let outside=false,overlap=false;for(const host of hosts){const bound=host.getBoundingClientRect(),els=[...host.querySelectorAll('.cab-dimension,.cab-module-number')].filter(e=>!e.hidden),rects=els.map(e=>e.getBoundingClientRect());outside ||=rects.some(r=>r.left<bound.left||r.right>bound.right||r.top<bound.top||r.bottom>bound.bottom);overlap ||=rects.some((r,i)=>rects.some((q,j)=>i<j&&r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top));}return {outside,overlap};});
  check(!overlaps.outside&&!overlaps.overlap,'front mobile labels fit without overlap');
  await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-mobile.png'});
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  const width=()=>p.evaluate(()=>getF('dimension-kitchen').kitchen.modules[2].width);
  check(await width()===460.25,'save precise width');await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await width()===450,'undo width');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await width()===460.25,'redo width');
  await p.reload();await p.locator('#lib').waitFor();check(await width()===460.25,'refresh restores saved width');
  await p.setViewportSize({width:1500,height:950});await p.evaluate(()=>FurnishCabinetEditor.open('dimension-cab'));await p.locator('#cab-preview canvas').waitFor();
  await p.locator('#cab-front').click();await p.locator('#cab-door-view').selectOption('hidden');
  await badge(2).click();check(await p.locator('#cab-active-bay').inputValue()==='1','regular cabinet badge selects matching bay');
  await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-wardrobe.png'});
  await p.locator('#cab-dimensions').uncheck();check(await p.locator('.cab-module-number').count()>0&&await p.locator('.cab-dimension').count()===0,'regular numbers independent');
  await p.getByRole('button',{name:'取消',exact:true}).click();
  for(const template of ['sideboard-wall','entry-pegboard','chest','wall']){
   const available=await p.evaluate(template=>FurnishCabinet.templates.some(t=>t[0]===template),template);check(available,'visual fixture template exists: '+template);
   await p.evaluate(template=>{const f={id:'dimension-'+template,type:template==='wall'?'kitchenwall':'cabinet',cx:2000,cy:2000,rot:0,...FurnishCabinet.preset(template)};mutate(()=>state.furniture.push(f));FurnishCabinetEditor.open(f.id);},template);
   await p.locator('#cab-preview canvas').waitFor();check(await p.locator('.cab-module-number').count()>0,'template numbered: '+template);
   await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-'+template+'.png'});
   if(template==='entry-pegboard'){await p.setViewportSize({width:390,height:844});await p.locator('#cab-front').click();await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-entry-mobile.png'});check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'no horizontal overflow');await p.setViewportSize({width:1500,height:950});}
   await p.getByRole('button',{name:'取消',exact:true}).click();
  }
  await p.evaluate(()=>{const f=getF('dimension-kitchen'),next=FurnishKitchen.configure(f,{...f.kitchen,corner:'left'});next.flip=true;mutate(()=>Object.assign(f,next));FurnishCabinetEditor.open(f.id);});await p.locator('#cab-preview canvas').waitFor();
  await p.screenshot({animations:'disabled',path:'output/playwright/cabinet-dimensions-left-mirrored.png'});await p.getByRole('button',{name:'取消',exact:true}).click();
  check(errors.length===0,errors.join('\n'));return {passed:'overall/module dimensions, L/interleaved indices, empty module, number selection, dimension toggle, precision, save/undo/redo/refresh, front, hidden doors, mobile',errors};
 }finally{await context.close();}
}
