async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/hob-openings/';p.on('pageerror',e=>errors.push(e.message));
 const check=(ok,msg)=>{if(!ok)throw Error(msg);},edit=async(id,n)=>{await p.locator(id).fill(String(n));await p.locator(id).press('Tab');};
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   state=freshWork(PLAN);state.furniture=[F('counter','台面',3000,3000,1800,600,0,'#d5c9b6'),F('stove_fotile_th36b','方太燃气灶 TH36B-T',3100,3010,750,440,0,'#111214')];delete state.furniture[0].kitchen;state.furniture[0].id='top';state.furniture[1].id='hob';ui.layers.clear=false;ui.layers.collide=false;ui.layers.dims=true;renderAll();selectIds(['hob']);zoomToBox([1950,2450,4050,3550],60);
  });
  check(await p.locator('#hob-cutout-w').inputValue()==='660','default width');check(await p.locator('#hob-cutout-d').inputValue()==='350','default depth');check(await p.locator('#hob-cutout-reset').isDisabled(),'default omission');
  const originalPath=await p.locator('[data-hob-cutout]').getAttribute('d');await edit('#hob-cutout-w',620);await edit('#hob-cutout-d',320);
  const current=()=>p.evaluate(()=>JSON.stringify(getF('hob'))),record=await current();
  check(await p.locator('[data-hob-opening]').textContent().then(s=>s.includes('620 × 320 mm')),'size text updates');check(await p.locator('[data-hob-cutout]').getAttribute('d')!==originalPath,'outline resizes');
  for(const [dir,value] of Object.entries({l:690,r:490,t:150,b:130}))check((await p.locator(`[data-hob-gap="${dir}"]`).textContent()).includes(value+' mm'),'updated margin '+dir);
  await p.evaluate(()=>undo());check(await p.locator('#hob-cutout-d').inputValue()==='350','undo');await p.evaluate(()=>redo());check(await current()===record,'redo');
  for(const [id,n] of [['#hob-cutout-w',751],['#hob-cutout-d',441],['#hob-cutout-w',0],['#hob-cutout-d','']]){await edit(id,n);check(await current()===record,'invalid edit atomic '+id);}
  await edit('#hob-cutout-w',750);check(await p.evaluate(()=>getF('hob').hobCutout.w===750),'panel equality allowed');await p.evaluate(()=>undo());
  await edit('#fW',900);check(await p.locator('#hob-cutout-w').inputValue()==='620','manual width stays absolute');await p.evaluate(()=>undo());await edit('#fW',619);check(await current()===record,'outer resize cannot shrink beneath hole');
  await p.locator('#hob-cutout-reset').click();check(await p.evaluate(()=>getF('hob').hobCutout===undefined),'reset removes optional field');check(await p.locator('[data-hob-cutout]').getAttribute('d')===originalPath,'reset restores geometry');await p.evaluate(()=>undo());check(await current()===record,'reset undo');
  await p.evaluate(()=>mutate(()=>{getF('hob').locked=true;}));for(const id of ['#hob-cutout-w','#hob-cutout-d','#hob-cutout-reset'])check(await p.locator(id).isDisabled(),'locked '+id);await p.evaluate(()=>undo());
  await p.locator('#hob-cutout').scrollIntoViewIfNeeded();await p.screenshot({path:dir+'editable-desktop.png',animations:'disabled'});
  check(await p.evaluate(()=>{const payload={planId:PLAN.id,current:state,designs:[{name:'自定义孔',work:state}],catalog:[]},result=FurnishProject.unpack(FurnishProject.pack(payload));return result.current.furniture[1].hobCutout.w===620&&result.designs[0].work.furniture[1].hobCutout.d===320&&preparePlanSVG().svg.querySelector('[data-hob-opening]').textContent.includes('620 × 320 mm');}),'current/named projects and export');
  await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('[data-hob-cutout]').waitFor();check(await current()===record,'autosave refresh');await p.evaluate(()=>selectIds(['hob']));
  // Observe the actual scene builder: editing must replace the cached slab,
  // and its top-triangle area must equal the worktop minus the edited hole.
  await p.evaluate(()=>{
   mutate(()=>{const h=getF('top');Object.assign(h,FurnishKitchen.configure(h,{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'}]}));Object.assign(getF('hob'),FurnishKitchen.attach(getF('hob'),h,0));FurnishKitchen.normalize(state.furniture);});
   const build=FurnishKitchenModel.build;FurnishKitchenModel.build=function(...args){const model=build(...args);if(args[1].id==='top')window.hobTestSlab=model;return model;};
   window.hobTestArea=()=>{let area=0,uuid='';window.hobTestSlab.traverse(o=>{if(!o.userData.kitchenSlab)return;uuid=o.uuid;const g=o.geometry,v=g.attributes.position,n=g.attributes.normal,idx=g.index;for(let i=0;i<(idx?idx.count:v.count);i+=3){const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;if(n.getY(a)<.9||n.getY(b)<.9||n.getY(c)<.9)continue;area+=Math.abs((v.getX(b)-v.getX(a))*(v.getZ(c)-v.getZ(a))-(v.getZ(b)-v.getZ(a))*(v.getX(c)-v.getX(a)))/2;}});return {area,uuid};};selectIds(['hob']);
  });
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching&&window.hobTestSlab);
  const before=await p.evaluate(()=>hobTestArea());check(Math.abs(before.area-(.72-.620*.320))<1e-6,'production scene hole before edit');
  await edit('#hob-cutout-w',600);const after=await p.evaluate(()=>hobTestArea());check(after.uuid!==before.uuid,'cached slab rebuilt');check(Math.abs(after.area-(.72-.600*.320))<1e-6,'actual scene hole changes size');await p.evaluate(()=>undo());check(Math.abs((await p.evaluate(()=>hobTestArea())).area-before.area)<1e-6,'3D undo rebuild');
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{selectIds(['hob']);drawer('panel',true);});await p.locator('#hob-cutout').scrollIntoViewIfNeeded();
  for(const id of ['#hob-cutout-w','#hob-cutout-d']){const b=await p.locator(id).boundingBox();check(b.x>=0&&b.x+b.width<=390,'mobile input bounds');}await edit('#hob-cutout-d',310);check(await p.locator('[data-hob-opening]').textContent().then(s=>s.includes('620 × 310 mm')),'mobile edit updates annotation');await p.screenshot({path:dir+'editable-mobile.png',animations:'disabled'});
  check(!errors.length,errors.join('\n'));return {status:'PASS',manualSizeAndFourMargins:true,invalidAndLocked:true,absoluteSizing:true,reset:true,undoRedo:true,refresh:true,projectAndExport:true,actual3DSlabCache:true,mobile390:true,errors};
 }finally{await context.close();}
}
