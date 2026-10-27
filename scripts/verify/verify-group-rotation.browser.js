async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];
 const check=(v,m)=>{if(!v)throw Error(m);},read=()=>p.evaluate(()=>structuredClone(state.furniture));
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{state.furniture=[F('block','旋转验收 A',4000,4000,800,500,20,'#bb9977'),F('block','旋转验收 B',4900,4300,500,700,70,'#ccbb99')];state.furniture[1].flip=true;ui.layers.clear=false;renderAll();selectIds(state.furniture.map(f=>f.id));groupSel();closeDrawers();zoomToBox([2800,2800,6000,5600],140);});
  const original=await read();
  const rotate=async(degrees,free=false,cancel=false)=>{
   const points=await p.evaluate(degrees=>{const el=document.querySelector('[data-edit-overlay="group-rotation"] circle'),items=selItems(),b=groupBox(items),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,hx=+el.getAttribute('cx'),hy=+el.getAttribute('cy'),a=degrees*Math.PI/180,dx=hx-cx,dy=hy-cy,m=el.getScreenCTM(),pt=(x,y)=>{const p=new DOMPoint(x,y).matrixTransform(m);return {x:p.x,y:p.y};};return {from:pt(hx,hy),to:pt(cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a))};},degrees);
   await p.mouse.move(points.from.x,points.from.y);if(free)await p.keyboard.down('Shift');await p.mouse.down();await p.mouse.move(points.to.x,points.to.y,{steps:12});
   if(cancel)await p.locator('#plan').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});
   await p.mouse.up();if(free)await p.keyboard.up('Shift');
  };
  check(await p.locator('[data-edit-overlay="group-rotation"]').count()===1,'group handle visible');
  await rotate(43);let rotated=await read();
  check(rotated.every((f,i)=>Math.abs(f.rot-original[i].rot-45)<1e-7),'15 degree snap applies to every member');
  const distance=a=>Math.hypot(a[0].cx-a[1].cx,a[0].cy-a[1].cy);
  check(Math.abs(distance(rotated)-distance(original))<1e-7&&rotated[1].flip,'rigid spacing and mirror retained');
  await p.screenshot({path:verification.output('playwright/group-rotation/desktop.png')});
  await p.keyboard.press('Control+z');check(JSON.stringify(await read())===JSON.stringify(original),'single undo restores entire group');
  await p.keyboard.press('Control+y');check(JSON.stringify(await read())===JSON.stringify(rotated),'redo restores rotation');
  await rotate(-21,true);const free=await read();check(free.every((f,i)=>Math.abs(f.rot-rotated[i].rot+21)<.01),'Shift free angle');
  await rotate(30,false,true);check(JSON.stringify(await read())===JSON.stringify(free),'pointer cancellation restores all poses');
  await p.evaluate(()=>{mutate(()=>state.furniture[0].locked=true);});check(await p.locator('[data-edit-overlay="group-rotation"]').count()===0,'locked member hides handle');
  await p.keyboard.press('Control+z');
  await p.evaluate(()=>mutate(()=>{state.drawing={...state.drawing,rotation:90};}));
  const beforeDrawing=await read();await rotate(30);check((await read()).every((f,i)=>Math.abs(f.rot-beforeDrawing[i].rot-30)<.01),'rotated drawing uses model coordinates');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([2800,2800,6000,5600],80);});
  await rotate(30);check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no narrow screen overflow');
  await p.screenshot({path:verification.output('playwright/group-rotation/mobile.png')});
  const final=await read();await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#drawing-compass').waitFor();
  check(JSON.stringify(await read())===JSON.stringify(final),'refresh persists rotated group');await p.evaluate(()=>selectIds([state.furniture[0].id]));check(await p.evaluate(()=>selIds().length===2),'group identity retained after refresh');
  check(!errors.length,errors.join('\n'));return {status:'PASS',snap:true,free:true,rigid:true,undoRedo:true,cancel:true,locked:true,drawingRotation:true,narrow:true,refresh:true,errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
