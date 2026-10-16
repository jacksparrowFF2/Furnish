async(page,verification)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(verification.root+'/tests/fixtures/floor-finishes.furnish.json');await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
   const before=await p.evaluate(()=>({furniture:JSON.stringify(state.furniture),architecture:JSON.stringify(state.architecture),rooms:ROOMS.filter(r=>r.counted!==false).map(r=>r.id)}));
   const open=async id=>{await p.evaluate(id=>{select({kind:'room',id});drawer('panel',true);},id);await p.locator('#floor-finish-panel').waitFor();};
   const fill=async(k,v)=>p.locator(`[data-floor="${k}"]`).fill(String(v));
   await open(before.rooms[0]);await p.locator('#floor-enabled').check();await fill('tileThickness',10);await fill('baseThickness',40);await fill('width',600);await fill('height',300);await fill('gap',2);await fill('originX',-701);await fill('originY',-302);await fill('angle',37);await p.locator('#floor-apply').click();
   check(await p.evaluate(id=>FurnishProject.effectivePlan(PLAN,state).floorFinish.areas[id].finishedZ===50,before.rooms[0]),'layer-derived elevation');
   await p.locator('#undo').click();check(await p.evaluate(()=>!state.floorFinishes),'undo');await p.locator('#redo').click();
   await open(before.rooms[1]);check(await p.locator('[data-floor="drop"]').inputValue()==='5','bathroom default drop');check(await p.locator('[data-floor="mode"]').inputValue()==='reference','bathroom reference mode');await p.locator('#floor-enabled').check();await fill('tileThickness',10);await p.locator('[data-floor="reference"]').selectOption(before.rooms[0]);await p.locator('#floor-apply').click();
   check(await p.evaluate(id=>FurnishProject.effectivePlan(PLAN,state).floorFinish.areas[id].finishedZ===45,before.rooms[1]),'bathroom lower 5 mm');
   await fill('drop',12);await p.locator('#floor-apply').click();check(await p.evaluate(id=>FurnishProject.effectivePlan(PLAN,state).floorFinish.areas[id].finishedZ===38,before.rooms[1]),'editable drop');await p.locator('#undo').click();
   await open(before.rooms[1]);await p.locator('#floor-copy').selectOption(before.rooms[0]);check(await p.locator('[data-floor="originX"]').inputValue()==='-701','shared layout basis');await p.locator('#floor-apply').click();
   const stable=await p.evaluate(()=>({furniture:JSON.stringify(state.furniture),architecture:JSON.stringify(state.architecture),floors:JSON.stringify(state.floorFinishes)}));check(stable.furniture===before.furniture&&stable.architecture===before.architecture,'raw architecture and furniture unchanged');
   check(await p.locator('#defs [data-floor-pattern]').count()===2,'independent SVG patterns');
   const invalid=await p.evaluate(()=>JSON.stringify(state));await fill('gap',-1);await p.locator('#floor-apply').click();check(await p.evaluate(()=>JSON.stringify(state))===invalid,'invalid input atomic');check(!!await p.locator('[data-floor-error]').innerText(),'invalid feedback');
   await open(before.rooms[1]);await p.evaluate(()=>{store.designs.push({id:'floor-saved',name:'地面保留方案',planId:PLAN.id,work:JSON.parse(JSON.stringify(state)),ts:Date.now()});save();});
   await p.waitForFunction(()=>JSON.parse(localStorage.getItem('huxing-design-v3'))?.v===3);await verification.waitForCache(p);await p.reload();
   check(await p.evaluate(()=>JSON.stringify(state.floorFinishes))===stable.floors,'refresh floor settings');check(await p.evaluate(()=>JSON.stringify(state.furniture))===before.furniture,'refresh unchanged furniture');
   const roundtrip=await p.evaluate(()=>{const d=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:state,designs:store.designs.filter(d=>d.planId===PLAN.id),catalog:[]}));return JSON.stringify(d.current.floorFinishes)===JSON.stringify(state.floorFinishes)&&d.designs.some(d=>d.work.floorFinishes);});check(roundtrip,'named design and project roundtrip');
   await p.evaluate(()=>{closeDrawers();select(null);});await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);check(await p.locator('#view3d canvas').count()===1,'production 3D');await p.screenshot({path:verification.output('playwright/floor-finishes/'+mode+'-3d.png')});await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!is3D()&&!switching);
   await p.setViewportSize({width:390,height:844});await open(before.rooms[1]);await p.locator('#floor-apply').scrollIntoViewIfNeeded();await p.waitForFunction(()=>!document.querySelector('#toast.show'));await p.screenshot({path:verification.output('playwright/floor-finishes/'+mode+'-mobile.png')});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile no horizontal overflow');check(!errors.length,errors.join('\n'));
   results.push({mode,passed:true,editableDrop:true,undoRedo:true,refresh:true,namedAndProjectRoundtrip:true,unchangedSurveyAndFurniture:true,gridAndBasis:true,invalidAtomic:true,production3D:true,mobile390:true,errors});
  }catch(e){await p.screenshot({path:verification.output('playwright/floor-finishes/'+mode+'-failure.png')});throw e;}finally{await context.close();}
 }
 return results;
}
