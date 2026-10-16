async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
 const check=(value,message)=>{if(!value)throw Error(message);},read=()=>p.evaluate(()=>structuredClone(getF('resize-kitchen')));
 async function dragAxis(axis,delta){
  const run=axis==='d'?1:0,handle=p.locator(`[data-handle="kitchen-run"][data-kitchen-run="${run}"] rect`),b=await handle.boundingBox();check(b,'visible resize handle');
  const vector=await p.evaluate(({run,delta})=>{const f=getF('resize-kitchen'),h=FurnishKitchen.runHandles(f)[run],a=FurnishKitchen.world(f,h.x,h.y),b=FurnishKitchen.world(f,h.x+h.dx*delta,h.y+h.dy*delta);return {x:(b[0]-a[0])*view.s,y:(b[1]-a[1])*view.s};},{run,delta});
  await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+vector.x,b.y+b.height/2+vector.y);await p.mouse.up();
 }
 try{
  await p.goto(verification.baseURL);await p.locator('#lib').waitFor();
  await p.evaluate(()=>{
   const center=(ROOMS.find(r=>r.name==='客厅')||ROOMS.find(r=>/厨/.test(r.name)))?.at||[7000,7000];
   const f=FurnishKitchen.configure({id:'resize-kitchen',name:'厨房台面',type:'counter',cx:center[0],cy:center[1],rot:180,color:'#eee'},{version:1,shape:'U',corner:'right',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:482,role:'door'},{run:0,width:482,role:'door'},{run:0,width:482,role:'door'},{run:1,width:450,role:'door'},{run:2,width:600,role:'door'}],endExtensions:[{run:0,length:550,depth:250,cabinetDepth:220}]});mutate(()=>state.furniture=[f]);ui.layers.wallSnap=false;ui.layers.guides=false;selectIds([f.id]);zoomSel();
  });
  const original=await read();check(original.w===2596&&original.d===1650,'screenshot dimensions reproduced');await p.screenshot({path:'output/playwright/kitchen-resize/before.png',animations:'disabled'});
  await dragAxis('w',300);const wider=await read();check(wider.w===2896&&wider.d===1650,'only outer width changes, following the selected 1 mm grid');
  check(JSON.stringify(wider.kitchen.modules.map(m=>m.width))===JSON.stringify([782,482,482,450,600]),'only main end changed; middle, connector and short return remain fixed');
  check(wider.kitchen.depth===600&&wider.kitchen.counterDepth===630,'cabinet and stone depths fixed');check(wider.kitchen.endExtensions[0].length===550&&wider.kitchen.endExtensions[0].depth===250&&wider.kitchen.endExtensions[0].cabinetDepth===220,'flue end dimensions fixed');
  await p.screenshot({path:'output/playwright/kitchen-resize/after-width.png',animations:'disabled'});
  // One invalid move is rejected, without redistributing middle bays.
  await dragAxis('w',-(782-100));check(JSON.stringify(await read())===JSON.stringify(wider),'undersized terminal rejected atomically');check((await p.locator('#toast').textContent()).includes('150'),'limit reason shown on release');
  await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'one undo restores initial fixed widths');await p.evaluate(()=>redo());check(JSON.stringify(await read())===JSON.stringify(wider),'redo restores endpoint-only change');
  await dragAxis('d',200);const deeper=await read();check(deeper.d===1850&&deeper.w===2896,'connector length changes independently');check(JSON.stringify(deeper.kitchen.modules.map(m=>m.width))===JSON.stringify([782,482,482,650,600]),'only terminal connector changes when depth dragged');
  await p.evaluate(()=>FurnishCabinetEditor.open('resize-kitchen'));await p.locator('#cab-preview canvas').waitFor();await p.locator('#cab-kitchen-dimensions').uncheck();await p.locator('#cab-preview').screenshot({path:'output/playwright/kitchen-resize/production.png',animations:'disabled'});await p.getByRole('button',{name:'取消',exact:true}).click();
  await p.reload();await p.locator('#lib').waitFor();check(JSON.stringify(await read())===JSON.stringify(deeper),'refresh keeps endpoint and middle widths');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await p.waitForTimeout(400);await p.evaluate(()=>{selectIds(['resize-kitchen']);zoomSel();const r=document.querySelector('[data-kitchen-run="0"] rect').getBoundingClientRect();view.x0+=(r.x+r.width/2-220)/view.s;view.y0+=(r.y+r.height/2-380)/view.s;applyView();});await p.waitForTimeout(150);await dragAxis('w',100);const mobile=await read();check(mobile.kitchen.modules[1].width===482&&mobile.kitchen.modules[2].width===482&&mobile.kitchen.modules[3].width===650&&mobile.kitchen.modules[4].width===600,'mobile drag keeps other widths');check(mobile.w===2996,'mobile endpoint resized, actual '+mobile.w);
  await p.screenshot({path:'output/playwright/kitchen-resize/mobile.png',animations:'disabled'});
  check(!errors.length,errors.join('\n'));return {status:'PASS',widthsBefore:original.kitchen.modules.map(m=>m.width),widthsAfter:wider.kitchen.modules.map(m=>m.width),checks:'real width/depth drags, 180-degree U, fixed middle/short arm/depths/thin end, limit feedback, save, undo/redo, refresh, production preview and 390px drag',errors};
 }catch(e){await p.screenshot({path:'output/playwright/kitchen-resize/failure.png'});throw Error(e.message+'; page errors: '+errors.join('; '));}finally{await context.close();}
}
