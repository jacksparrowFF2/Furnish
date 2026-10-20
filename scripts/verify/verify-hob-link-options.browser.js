async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{const base={id:'hob-host',type:'counter',name:'橱柜台面',cx:4000,cy:4000,w:1366,d:600,rot:180,color:'#eee'},host=FurnishKitchen.configure(base,{...FurnishKitchen.defaults(base),modules:[{run:0,width:766,role:'door'},{run:0,width:600,role:'door'}]});mutate(()=>state.furniture=[host,{id:'hob-check',type:'stove_fotile_th36b',name:'方太燃气灶 TH36B-T',cx:4000,cy:4000,w:750,d:440,rot:180,color:'#111',...FurnishProducts.initial({type:'stove_fotile_th36b'})}]);selectIds(['hob-check']);});
  check((await p.locator('#kitchen-link option[value="hob-host:0"]').innerText()).includes('改为灶台柜并关联'),'door cabinet option explains conversion');
  check(await p.locator('#kitchen-link option[value="hob-host:1"]').evaluate(el=>el.disabled),'too narrow cabinet disabled');
  await p.locator('#kitchen-link').selectOption('hob-host:0');
  const linked=()=>p.evaluate(()=>{const h=getF('hob-host'),f=getF('hob-check');return h.kitchen.modules[0].role==='hob'&&f.counterLink?.hostId===h.id&&f.counterElevation===860&&f.rot===180;});
  check(await linked(),'link and role conversion');check(await p.locator('#hob-elevation').isDisabled(),'linked elevation readonly');
  await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('hob-host').kitchen.modules[0].role==='door'&&!getF('hob-check').counterLink),'one undo restores host and device');
  await p.evaluate(()=>redo());check(await linked(),'one redo restores link');
  await p.locator('#kitchen-link').scrollIntoViewIfNeeded();await p.screenshot({path:verification.output('playwright/hob-link-options/'+mode+'-linked.png')});
  await verification.waitForCache(p);await p.reload();await p.evaluate(()=>selectIds(['hob-check']));check(await linked(),'refresh persistence');
  await p.evaluate(()=>mutate(()=>{const h=getF('hob-host');h.cx+=200;h.rot=90;h.flip=true;h.kitchen.baseHeight=900;}));
  check(await p.evaluate(()=>{const h=getF('hob-host'),f=getF('hob-check'),m=FurnishKitchen.layout(h)[0],[x,y]=FurnishKitchen.world(h,m.x,m.y);return f.counterLink&&f.cx===x&&f.cy===y&&f.rot===90&&f.flip&&f.counterElevation===940;}),'follow movement rotation mirror and height');
  await p.locator('#kitchen-link').selectOption('');check(await p.evaluate(()=>!getF('hob-check').counterLink&&getF('hob-check').counterElevation===940),'detach retains physical height');
  await p.evaluate(()=>undo());
  await p.evaluate(()=>store.designs.push({id:'hob-link-saved',name:'灶具关联验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))}));
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=verification.output('playwright/hob-link-options/'+mode+'.furnish.json');
  await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(()=>getF('hob-check').counterLink?.hostId==='hob-host'&&getF('hob-host').kitchen.modules[0].role==='hob'&&store.designs.some(d=>d.id==='hob-link-saved'&&d.work.furniture.some(f=>f.id==='hob-check'&&f.counterLink?.hostId==='hob-host'))),'download upload current and named association');
  await p.evaluate(()=>selectIds(['hob-check']));
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  await p.getByRole('button',{name:'定位选中',exact:true}).click();
  await p.screenshot({path:verification.output('playwright/hob-link-options/'+mode+'-3d.png')});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
  await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();await p.locator('#kitchen-link').scrollIntoViewIfNeeded();check(await p.locator('#kitchen-link').isVisible(),'mobile association visible');
  await p.screenshot({path:verification.output('playwright/hob-link-options/'+mode+'-mobile.png')});
  check(errors.length===0,errors.join('\n'));results.push({mode,status:'PASS'});await context.close();
 }return results;
}
