async(page,V)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m);},click=async(x,y,shift=false)=>{const q=await p.evaluate(([x,y])=>{const point=svg.createSVGPoint(),at=drawingPoint([x,y]);point.x=at[0];point.y=at[1];const q=point.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);if(shift)await p.keyboard.down('Shift');await p.mouse.click(q.x,q.y);if(shift)await p.keyboard.up('Shift');};
 try{
  for(const file of [false,true]){
   await p.goto(file?V.fileBase+'index.html':V.baseURL);await p.locator('#drawing-compass').waitFor();
   await p.evaluate(()=>{const r=ROOMS.find(r=>r.counted!==false),f=F('washer','刷新面积验收',r.at[0],r.at[1],600,600,0,'#dddddd');f.mountHeight=0;f.h=850;mutate(()=>state.furniture.push(f));select({kind:'room',id:r.id});});
   const saved=await p.evaluate(()=>({id:ui.sel.id,result:FurnishGeometry.regionAreas(selectedRooms(),state.furniture)}));
   await V.waitForCache(p);await p.reload();await p.locator('#drawing-compass').waitFor();
   const restored=await p.evaluate(id=>{select({kind:'room',id});return FurnishGeometry.regionAreas(selectedRooms(),state.furniture);},saved.id);
   check(JSON.stringify(saved.result)===JSON.stringify(restored),'saved furniture restores identical area on refresh');
   await p.evaluate(()=>{
    const rect=(x)=>[[x,0],[x+2000,0],[x+2000,2000],[x,2000]];
    PLAN={...PLAN,walls:[],wins:[],doors:[],slides:[],rooms:[{id:'area-a',name:'面积 A',mat:'wood',at:[1000,1000],poly:rect(0)},{id:'area-b',name:'面积 B',mat:'wood',at:[3000,1000],poly:rect(2000)}]};applyPlanData();state=freshWork(PLAN);
    const f=F('washer','落地洗衣机',2000,700,1000,1000,0,'#dddddd');f.mountHeight=0;f.h=850;state.furniture=[f];ui.tool='select';select(null);renderAll();zoomToBox([0,0,4000,2000],150);
   });
   const before=await p.evaluate(()=>snap());await click(500,1500);await click(3500,1500,true);
   check(await p.evaluate(()=>selectedRooms().length===2),'Shift adds second region');
   check(await p.locator('[data-area-empty]').innerText()==='8.00','combined empty area');check(await p.locator('[data-area-free]').innerText()==='7.00','combined free area');
   await p.screenshot({path:V.output('playwright/region-areas/'+(file?'file':'http')+'-desktop.png')});
   await click(3500,1500,true);check(await p.evaluate(()=>selectedRooms().length===1),'Shift removes region');
   await click(3500,1500);check(await p.evaluate(()=>selectedRooms().length===1&&ui.sel.id==='area-b'),'plain click resets');
   await click(500,1500,true);check(await p.evaluate(()=>snap())===before,'area selection is ephemeral');
   // The same underlying state continues to use mutation/history, then recalculates.
   await p.evaluate(()=>mutate(()=>state.furniture[0].mountHeight=1000));check(await p.locator('[data-area-free]').innerText()==='8.00','raised appliance excluded');
   await p.keyboard.press('Control+z');check(await p.locator('[data-area-free]').innerText()==='7.00','undo recalculates');
   await p.keyboard.press('Control+y');check(await p.locator('[data-area-free]').innerText()==='8.00','redo recalculates');
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{renderAll();drawer('panel',true);});await p.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});await p.screenshot({path:V.output('playwright/region-areas/'+(file?'file':'http')+'-mobile.png')});
   check(await p.locator('[data-area-free]').isVisible(),'narrow panel area visible');
   await p.locator('[data-area-room="area-b"]').click();check(await p.evaluate(()=>selectedRooms().length===1),'touch-friendly removal');
   await p.setViewportSize({width:1500,height:1000});
  }
  check(!errors.length,errors.join('\n'));return {status:'PASS',protocols:['http','file'],checks:['Shift add/remove','plain click reset','two areas','ephemeral state','save/refresh','undo/redo','390px removal'],errors};
 }finally{await context.close();}
}
