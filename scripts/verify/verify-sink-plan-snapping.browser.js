async function(page,verification){
 const shot=name=>verification.output('playwright/sink-plan-snapping/'+name+'.png');await page.setViewportSize({width:1400,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(verification.baseURL+'index.html');await page.locator('#drawing-compass').waitFor();
 await page.evaluate(()=>{
  Object.assign(PLAN,{walls:[],wins:[],doors:[],slides:[]});applyPlanData();state=freshWork(PLAN);
  const h=FurnishKitchen.configure({...F('counter','L 形厨房',3000,3000,1200,600,180,'#e9e5de'),id:'sink-plan-top'},{version:1,shape:'L',corner:'right',depth:600,counterDepth:620,baseHeight:830,thickness:20,modules:[{run:0,width:1200,role:'door'},{run:1,width:1104,role:'sink'}]}),m=FurnishKitchen.layout(h)[1],[cx,cy]=FurnishKitchen.world(h,m.x,m.y);
  state.furniture=FurnishKitchen.normalize([h,FurnishKitchen.attach({...F('sink_arrow_750','箭牌水槽',cx,cy,750,450,270,'#85898a'),id:'sink-plan-device'},h,1)]);
  ui.layers.furn=true;ui.layers.guides=true;ui.layers.wallSnap=false;ui.layers.grid=false;ui.layers.clear=true;ui.layers.dims=true;ui.layers.collide=false;undoStack.length=0;redoStack.length=0;renderAll();selectIds(['sink-plan-device']);zoomToBox([1900,1900,4100,4100],55);
 });
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===1,'2D host uses production opening');
 await page.screenshot({path:shot('sink-on-top')});
 const start=await page.evaluate(()=>{const f=getF('sink-plan-device'),p=new DOMPoint(f.cx,f.cy).matrixTransform(document.querySelector('#gFurn').getScreenCTM());return {x:p.x,y:p.y,cx:f.cx,cy:f.cy};});
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+4,start.y+4,{steps:5});await page.mouse.up();
 check(await page.evaluate(({cx,cy})=>{const f=getF('sink-plan-device');return Math.hypot(f.cx-cx,f.cy-cy)<.001&&FurnishKitchen.onSurface(f,getF('sink-plan-top'));},start),'actual drag snaps within supporting module');
 const end=await page.evaluate(()=>{const f=getF('sink-plan-device'),p=new DOMPoint(f.cx+1000,f.cy).matrixTransform(document.querySelector('#gFurn').getScreenCTM());return {x:p.x,y:p.y};});
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.waitForFunction(()=>document.querySelectorAll('[data-fid="sink-plan-top"] [data-kitchen-opening]').length===0);await page.mouse.up();
 check(await page.evaluate(()=>!getF('sink-plan-device').counterLink),'ordinary drag detaches only on commit');await page.evaluate(()=>undo());check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===1,'undo drag restores linked opening');
 await page.evaluate(()=>mutate(()=>{const f=getF('sink-plan-device');f.cx+=1000;}));
 check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===0,'moving sink away restores 2D countertop');
 await page.evaluate(()=>undo());check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===1,'undo restores opening');
 await page.evaluate(()=>redo());check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===0,'redo removes opening');await page.evaluate(()=>undo());
 await verification.waitForCache(page);await page.reload();check(await page.locator('[data-fid="sink-plan-top"] [data-kitchen-opening]').count()===1,'refresh restores derived hole');
 await page.evaluate(()=>{closeDrawers();selectIds([]);zoomToBox([1900,1900,4100,4100],55);document.querySelector('[data-fid="sink-plan-device"]').style.visibility='hidden';});
 await page.screenshot({path:shot('uncovered-hole')});
 await page.evaluate(()=>{document.querySelector('[data-fid="sink-plan-device"]').style.visibility='';selectIds(['sink-plan-device']);});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{closeDrawers();zoomToBox([1900,1900,4100,4100],25);});await page.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);await page.screenshot({path:shot('mobile')});
 check(!errors.length,errors.join(';'));return {passed:true,errors,productionHole:true,actualDrag:true,undoRedo:true,refresh:true,mobile:true};
}
