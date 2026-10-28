async(page,V)=>{
 const response=await page.request.get(V.baseURL+'projects/workspace.furnish.json'),seed=(await response.json()).workspace,ctx=await page.context().browser().newContext({viewport:{width:1600,height:1050}}),p=await ctx.newPage(),errors=[],checks=[],check=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};p.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(seed=>{if(!localStorage.getItem('__sink_link_seeded')){localStorage.setItem('huxing-design-v29',JSON.stringify(seed));localStorage.setItem('__sink_link_seeded','1');}},seed);
 try{
  await p.goto(V.baseURL+'index.html');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{selectIds(['fmvgv70l41']);zoomToBox([5900,8250,8300,10300],50);});
  await p.screenshot({path:V.output('playwright/sink-link-current/before.png'),animations:'disabled'});
  const initial=await p.evaluate(()=>({f:structuredClone(getF('fmvgv70l41')),gaps:directionalMeasurements(),order:drawOrder().map(f=>f.id)}));
  check(initial.order.indexOf('fmvgn7dtt1')<initial.order.indexOf('fmv9dos7j1'),'purifier draws below the actual worktop');
  await p.locator('#kitchen-link').selectOption('');
  await p.evaluate(()=>mutate(()=>{getF('fmvgv70l41').cx+=400;}));
  await p.locator('#kitchen-link').selectOption('fmv9dos7j1:1');
  const after=await p.evaluate(()=>({f:structuredClone(getF('fmvgv70l41')),support:FurnishKitchen.support(getF('fmvgv70l41'),state.furniture)?.id,gaps:directionalMeasurements(),openings:document.querySelectorAll('[data-fid="fmv9dos7j1"] [data-kitchen-opening]').length}));
  check(after.f.counterLink?.hostId==='fmv9dos7j1'&&after.f.counterLink.module===1&&after.support==='fmv9dos7j1','actual association dropdown positions and attaches sink to module 2');
  const aligned=()=>p.evaluate(()=>{const f=getF('fmvgv70l41'),h=getF('fmv9dos7j1'),m=FurnishKitchen.layout(h)[1],[x,y]=FurnishKitchen.world(h,m.x,m.y),order=[...document.querySelector('#gFurn').children].map(n=>n.dataset.fid);return Math.hypot(f.cx-x,f.cy-y)<.001&&f.rot===((h.rot||0)+(h.flip?-m.rot:m.rot)+360)%360&&!!f.flip===!!h.flip&&order.indexOf('fmvgn7dtt1')<order.indexOf(h.id)&&order.indexOf(h.id)<order.indexOf(f.id);});
  check(await aligned(),'linked position, rotation, mirror and real SVG order agree');check(after.openings===1&&Object.values(after.gaps).every(g=>g?.distance>0),'associated sink has one hole and positive module/wall margins');
  await p.screenshot({path:V.output('playwright/sink-link-current/associated.png'),animations:'disabled'});
  await p.evaluate(()=>undo());check(await p.locator('#kitchen-link').inputValue()==='','undo restores independent placement');await p.evaluate(()=>redo());check(await aligned(),'redo restores association and order');
  await p.evaluate(()=>mutate(()=>{const h=getF('fmv9dos7j1');h.cx+=100;h.rot=90;h.flip=true;}));check(await aligned(),'linked sink follows host movement, rotation and mirror');await p.evaluate(()=>undo());
  await V.waitForCache(p);await p.reload();await p.evaluate(()=>{selectIds(['fmvgv70l41']);zoomToBox([5900,8250,8300,10300],50);});check(await aligned()&&await p.locator('#kitchen-link').inputValue()==='fmv9dos7j1:1','refresh retains association and occlusion');
  await p.evaluate(()=>selectIds([]));await p.screenshot({path:V.output('playwright/sink-link-current/plan.png'),animations:'disabled'});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{selectIds(['fmvgv70l41']);drawer('panel',true);});await p.locator('#kitchen-link').scrollIntoViewIfNeeded();check(await p.locator('#kitchen-link').inputValue()==='fmv9dos7j1:1','390px association control retains module 2');await p.screenshot({path:V.output('playwright/sink-link-current/mobile-link.png'),animations:'disabled'});
  check(!errors.length,'no browser exceptions');return {passed:true,checks,after,errors};
 }finally{await ctx.close();}
}
