async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1540,height:1040}}),p=await context.newPage(),errors=[];
 p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));const check=(ok,message)=>{if(!ok)throw Error(message);};
 try{
  await p.goto(verification.baseURL.slice(0,-1));await p.locator('#lib').waitFor();
  await p.evaluate(()=>{
   const f=FurnishKitchen.configure({id:'u-browser',name:'U 形厨房验收',type:'counter',cx:3000,cy:3000,rot:0,color:'#f3f1ec'},{version:1,shape:'L',depth:600,counterDepth:630,baseHeight:820,thickness:20,modules:[{run:0,width:900,role:'hob'},{run:0,width:600,role:'door'},{run:1,width:900,role:'sink'},{run:1,width:300,role:'door'}],endExtensions:[{run:0,length:500,depth:250,cabinetDepth:220,backPanel:false}]}),sink=FurnishKitchen.attach({id:'sink-u',type:'ksink',name:'水槽',cx:0,cy:0,w:760,d:450,rot:0,color:'#ddd'},f,2);
   mutate(()=>{state.furniture=[f,sink];});FurnishCabinetEditor.open(f.id);
  });
  await p.locator('#cab-preview canvas').waitFor();await p.locator('#cab-kitchen-shape').selectOption('U');
  check(await p.locator('#cab-kitchen-shape').inputValue()==='U','U selected from real form');
  check(await p.locator('[data-k-extension-length="0"]').inputValue()==='500','existing flue extension retained');
  check(await p.locator('[data-k-extension-depth="0"]').inputValue()==='250','narrow worktop retained');
  check(await p.locator('[data-k-extension-cabinet-depth="0"]').inputValue()==='220','thin body depth retained');
  check(await p.locator('[data-k-extension-length="2"]').count()===1,'return arm has separate end extension');
  await p.getByRole('button',{name:'三边正视展开',exact:true}).click();check(await p.locator('.cab-elevation').count()===3,'three production elevation panels');
  check(await p.locator('.cab-module-number').count()===5,'retained and new modules numbered once');
  check((await p.locator('.cab-elevation').nth(1).textContent()).includes('连接边总长 2400'),'connector length includes two corners');
  check(await p.locator('.cab-elevation').nth(1).getByText('盲角',{exact:true}).count()===2,'two blind corners in connector');
  await p.locator('.cab-module-number').filter({hasText:/^5$/}).click();await p.locator('[data-kitchen-row="4"] [data-k-width]').fill('820.25');
  await p.locator('[data-k-tab="size"]').click();check((await p.locator('.cab-elevation').nth(2).textContent()).includes('1420.25'),'third width reads unblurred input');
  await p.locator('[data-k-extension-length="2"]').fill('300');await p.locator('[data-k-extension-length="2"]').blur();await p.locator('[data-k-extension-depth="2"]').fill('200');await p.locator('[data-k-extension-depth="2"]').blur();
  await p.locator('[data-k-extension-cabinet-depth="2"]').fill('180');await p.locator('[data-k-extension-cabinet-depth="2"]').blur();
  await p.screenshot({path:'output/playwright/kitchen-u/elevations.png',animations:'disabled'});
  await p.getByRole('button',{name:'透视预览',exact:true}).click();check(await p.locator('.cab-elevation').count()===0,'unfolded renderers released');
  await p.screenshot({path:'output/playwright/kitchen-u/perspective.png',animations:'disabled'});
  await p.locator('#cab-kitchen-dimensions').uncheck();await p.locator('#cab-preview').screenshot({path:'output/playwright/kitchen-u/preview.png',animations:'disabled'});await p.getByRole('button',{name:'全部打开',exact:true}).click();check(!(await p.locator('#cab-kitchen-error').textContent()),'all three runs and both ends open');await p.locator('#cab-preview').screenshot({path:'output/playwright/kitchen-u/open.png',animations:'disabled'});await p.getByRole('button',{name:'全部关闭',exact:true}).click();
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  const read=()=>p.evaluate(()=>({f:structuredClone(getF('u-browser')),sink:structuredClone(getF('sink-u'))}));let saved=await read();check(saved.f.kitchen.shape==='U','saved U');check(saved.f.kitchen.modules[4].width===820.25,'saved precise third width');check(saved.sink.counterLink.module===2,'retained sink link');check(saved.f.kitchen.endExtensions.find(e=>e.run===2).depth===200,'third arm narrow stone saved');check(saved.f.kitchen.endExtensions.find(e=>e.run===2).cabinetDepth===180,'third arm thin body saved');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check((await read()).f.kitchen.shape==='L','one undo restores original L');await p.getByRole('button',{name:'重做',exact:true}).first().click();check((await read()).f.kitchen.shape==='U','redo restores all three arms');
  await p.evaluate(()=>{selectIds(['u-browser']);zoomSel();});await p.screenshot({path:'output/playwright/kitchen-u/plan.png',animations:'disabled'});
  await p.reload();await p.locator('#lib').waitFor();check(JSON.stringify(await read())===JSON.stringify(saved),'refresh preserves dimensions, ends and attachment');
  await p.evaluate(()=>FurnishCabinetEditor.open('u-browser'));await p.locator('#cab-preview canvas').waitFor();
  await p.locator('#cab-kitchen-shape').selectOption('U-right');await p.getByRole('button',{name:'三边正视展开',exact:true}).click();check(await p.locator('.cab-elevation').count()===3,'opposite connector unfolds');
  await p.locator('#cab-kitchen-shape').selectOption('L-right');check(await p.locator('.cab-elevation').count()===2,'shape change disposes third panel');await p.locator('#cab-kitchen-shape').selectOption('U');check(await p.locator('.cab-elevation').count()===3,'third panel recreated');
  await p.getByRole('button',{name:'取消',exact:true}).click();check(JSON.stringify(await read())===JSON.stringify(saved),'cancel isolates all shape edits');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>FurnishCabinetEditor.open('u-browser'));await p.locator('#cab-preview canvas').waitFor();await p.locator('#cab-kitchen-front').click();
  check(await p.locator('.cab-elevation').count()===3,'mobile three views');const scrolls=await p.locator('.cab-elevation-scroll').evaluateAll(els=>els.map(el=>{const overflow=getComputedStyle(el).overflowX,others=els.filter(e=>e!==el).map(e=>e.scrollLeft);el.scrollLeft=el.scrollWidth;const moved=el.scrollLeft,independent=els.filter(e=>e!==el).every((e,i)=>e.scrollLeft===others[i]);el.scrollLeft=0;return {overflow,width:el.scrollWidth,client:el.clientWidth,moved,independent};}));check(scrolls.length===3&&scrolls.every(v=>v.overflow==='auto'&&v.independent&&(v.width<=v.client||v.moved>0))&&scrolls.some(v=>v.moved>0),'mobile elevations scroll independently when needed');check(await p.locator('.cab-editor').evaluate(e=>e.scrollWidth<=e.clientWidth),'no horizontal dialog overflow');
  await p.screenshot({path:'output/playwright/kitchen-u/mobile.png',animations:'disabled'});await p.getByRole('button',{name:'取消',exact:true}).click();
  // Current/named project validation plus the actual download/upload path.
  await p.setViewportSize({width:1540,height:1040});
  const packed=await p.evaluate(()=>FurnishProject.pack({planId:PLAN.id,current:state,designs:[{name:'U 测试',work:state}],catalog:[]}));
  const restored=await p.evaluate(data=>FurnishProject.unpack(data),packed);check(restored.current.furniture.find(f=>f.id==='u-browser').kitchen.shape==='U','project pack/unpack U');check(restored.designs[0].work.furniture.find(f=>f.id==='u-browser').kitchen.modules[4].width===820.25,'named design roundtrip');
  const original=JSON.stringify(await read());await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloadEvent=p.waitForEvent('download');await p.locator('#pr-export').click();const download=await downloadEvent;await download.saveAs('output/playwright/kitchen-u/u.furnish.json');await p.locator('#pr-file').setInputFiles('output/playwright/kitchen-u/u.furnish.json');await p.locator('#pr-restore-confirm').click();check(JSON.stringify(await read())===original,'actual download/upload preserves U and attachment');
  await p.evaluate(()=>{closeDialog();selectIds(['u-browser']);});await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.locator('#view3d canvas').waitFor({state:'visible'});await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#showMenu summary').click();await p.locator('[data-cut="1.2"]').click();if(await p.locator('#showMenu').getAttribute('open')!==null)await p.locator('#showMenu summary').click();await p.waitForTimeout(1000);await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1000);await p.screenshot({path:'output/playwright/kitchen-u/room-3d.png',animations:'disabled'});await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  check(errors.length===0,errors.join('\n'));return {passed:'real L to U form, retained narrow ends and links, three production views, precise third-arm edit, save/undo/redo/refresh/cancel, left/right shape changes, 390px scrolling and real download/upload/project/named design roundtrip',errors};
 }catch(e){await p.screenshot({path:'output/playwright/kitchen-u/failure.png'});throw e;}finally{await context.close();}
}
