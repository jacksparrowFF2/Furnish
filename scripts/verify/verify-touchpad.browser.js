async (page,verification)=>{
 const results=[];
 const check=(value,label)=>{if(!value)throw Error(label);};
 for(const protocol of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:protocol==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((protocol==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>openHelp());await p.locator('#navigation-input').selectOption('touchpad');
   await p.screenshot({animations:'disabled',path:verification.output('playwright/touchpad/'+protocol+'-help.png')});
   await p.evaluate(()=>closeDialog());
   const before=await p.evaluate(()=>({view:{...view},state:snap()}));
   const wheel=async(selector,x,y,ctrl=false)=>p.locator(selector).evaluate((el,{x,y,ctrl})=>{const r=el.getBoundingClientRect();const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:x,deltaY:y,ctrlKey:ctrl,clientX:r.left+r.width/2,clientY:r.top+r.height/2});el.dispatchEvent(event);return {x:event.clientX-r.left,y:event.clientY-r.top};},{x,y,ctrl});
   await wheel('#plan',25,40);
   const pan=await p.evaluate(()=>({...view}));check(pan.s===before.view.s&&pan.x0!==before.view.x0&&pan.y0!==before.view.y0,protocol+': two-axis pan');
   const anchor=await wheel('#plan',0,-8,true);const zoom=await p.evaluate(()=>({...view}));check(zoom.s>pan.s,protocol+': pinch zoom');
   check(Math.abs(zoom.x0+anchor.x/zoom.s-(pan.x0+anchor.x/pan.s))<.001&&Math.abs(zoom.y0+anchor.y/zoom.s-(pan.y0+anchor.y/pan.s))<.001,protocol+': zoom keeps pointer anchor');
   check(await p.evaluate(()=>snap())===before.state,protocol+': view does not mutate design');
   await p.reload();check(await p.evaluate(()=>FurnishNavigation.getMode())==='touchpad',protocol+': saved preference');
   await p.evaluate(()=>{const bind=FurnishNavigation.bindOrbit;window.__navigationControls=[];FurnishNavigation.bindOrbit=(el,get)=>{window.__navigationControls.push(get);return bind(el,get);};});
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
   const pose=()=>p.evaluate(()=>{const c=__navigationControls[0]();return {position:c.object.position.toArray(),target:c.target.toArray(),distance:c.object.position.distanceTo(c.target),state:snap()};});
   const a=await pose();await wheel('#view3d canvas',30,20);const b=await pose();check(JSON.stringify(a.target)!==JSON.stringify(b.target),protocol+': 3D pan');check(Math.abs(a.distance-b.distance)<.001,protocol+': pan preserves distance');
   await wheel('#view3d canvas',0,-8,true);const c=await pose();check(c.distance<b.distance,protocol+': 3D pinch');
   await p.evaluate(()=>selectIds(state.furniture.map(f=>f.id)));const spaceBefore=await pose();
   const canvas=p.locator('#view3d canvas'),r=await canvas.boundingBox();await p.keyboard.down('Space');await p.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await p.mouse.down();await p.mouse.move(r.x+r.width*.5+60,r.y+r.height*.5+20,{steps:5});await p.mouse.up();await p.keyboard.up('Space');
   check(JSON.stringify((await pose()).target)!==JSON.stringify(spaceBefore.target),protocol+': space drag moves camera');
   check((await pose()).state===a.state,protocol+': space pan does not move furniture');
   await p.screenshot({animations:'disabled',path:verification.output('playwright/touchpad/'+protocol+'-3d.png')});
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>openHelp());check(await p.locator('#navigation-input').isVisible(),protocol+': narrow preference visible');await p.screenshot({animations:'disabled',path:verification.output('playwright/touchpad/'+protocol+'-narrow.png')});
   check(errors.length===0,JSON.stringify(errors));results.push({protocol,pan:true,pinch:true,scene:true,spacePan:true,preferenceReload:true,narrow:true,designUnchanged:true});
  }finally{await context.close();}
 }
 return results;
}
