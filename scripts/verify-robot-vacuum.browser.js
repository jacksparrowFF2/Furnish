async (page) => {
 // Fresh ephemeral storage; preserve all furniture, including example layouts.
 const context=await page.context().browser().newContext({viewport:{width:1500,height:900}});
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8765/index.html');
 const check=await page.evaluate(()=>{
  const entries=FurnishCatalogData.library.flatMap(c=>c.items).filter(i=>i[0].startsWith('robot_p20max'));
  const count=state.furniture.length;for(const [i,it] of entries.entries())addItem(it,3000+i*650,3500);
  const robot=state.furniture.find(f=>f.type==='robot_p20max');selectIds([robot.id]);duplicateSel();
  if(state.furniture.filter(f=>f.type==='robot_p20max').length!==2)throw Error('Copy failed');
  undo();if(state.furniture.length!==count+3)throw Error('Undo failed');redo();if(state.furniture.length!==count+4)throw Error('Redo failed');undo();selectIds([robot.id]);
  return state.furniture.filter(f=>f.type.startsWith('robot_p20max')).map(f=>({type:f.type,w:f.w,d:f.d,h:f.h}));
 });
 await page.locator('#fH').fill('85.5');await page.locator('#fH').press('Tab');
 if(await page.evaluate(()=>getF(selIds()[0]).h)!==85.5)throw Error('Height precision failed');
 await page.evaluate(()=>undo());if(await page.evaluate(()=>getF(selIds()[0]).h)!==79.8)throw Error('Height undo failed');
 await page.screenshot({path:'output/robot-p20max/app-2d.png'});
 await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.querySelector('#view3d canvas')?.width>0);
 await page.screenshot({path:'output/robot-p20max/app-3d.png'});
 await page.waitForTimeout(1200);await page.reload();
 const restored=await page.evaluate(()=>state.furniture.filter(f=>f.type.startsWith('robot_p20max')).map(f=>({type:f.type,w:f.w,d:f.d,h:f.h})));
 if(JSON.stringify(restored)!==JSON.stringify(check))throw Error('Refresh persistence failed');
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({passed:true,checks:['add','copy','undo/redo','height precision','height undo','3D startup','refresh persistence'],models:restored}));await context.close();
}
