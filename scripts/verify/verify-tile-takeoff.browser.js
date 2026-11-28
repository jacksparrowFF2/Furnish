async(page,verification)=>{
 const check=(value,message)=>{if(!value)throw Error(message);},results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   const {id,key}=await p.evaluate(()=>{
    const specs=[['north',[10,10],[410,10],'b',200],['east',[410,10],[410,310],'e',200],['south',[410,310],[10,310],'n',200],['west',[10,310],[10,10],'e',200],['middle',[210,10],[210,310],'n',100]];
    const d={version:1,id:'custom_takeoff_verify',name:'排砖图与用量验收',source:'dxf',image:'',width:450,height:350,scale:10,
     walls:specs.map(([id,a,b,kind,thickness])=>({id,a,b,kind,thickness})),
     openings:[{id:'joint-test',wall:'middle',kind:'door',t:.5,length:900,side:1,entry:false}]};
    const plan=FurnishDraft.build(d),draft=freshWork(plan),ids=plan.rooms.map(r=>r.id);
    draft.rooms[ids[0]]={name:'地面 A',mat:'tile800',use:'kitchen'};draft.rooms[ids[1]]={name:'地面 B',mat:'tile800',use:'kitchen'};
    let work=FurnishFloorFinish.setLayers(draft,plan,ids,{rawZ:0,tileThickness:10,baseThickness:50});
    work=FurnishFloorFinish.setLayoutBasis(work,plan,ids,{origin:[-95,21]});
    work=FurnishFloorFinish.setLayoutBasis(work,plan,[ids[1]],{origin:[-172,40]});
    work=FurnishWallTiling.setEnabled(work,FurnishProject.effectivePlan(plan,work),ids,true);
    PLANS.push(plan);(store.customPlans??=[]).push(plan.customDraft);store.work[plan.id]=work;setPlan(plan.id);
    return {id:ids[0],key:'door:joint-test'};
   });
   await verification.waitForCache(p);
   const read=()=>p.evaluate(key=>({j:state.floorFinishes.doorJoints?.[key],history:undoStack.length,work:JSON.stringify(state)}),key);
   const initial=await read();
   await verification.clickCanvasTool(p,'#tiling-open');
   await p.locator('[data-tiling-room]').selectOption(id);
   await p.locator('[data-tiling-select="floor"]').click();
   await p.locator('[data-tiling-compare] summary').click();
   await p.locator('[data-tiling-narrow]').fill('750');
   await p.locator('[data-tiling-compare-run]').click();
   check(await p.locator('[data-tiling-candidates] svg').count()>=3,'multiple candidate diagrams');
   check(await p.locator('[data-takeoff-narrow]').count()>0,'candidate diagrams highlight narrow cuts');
   check((await read()).work===initial.work,'calculating candidates leaves state alone');
   await p.locator('[data-tiling-compare]').scrollIntoViewIfNeeded();
   await p.screenshot({path:verification.output('playwright/tile-takeoff/'+mode+'-candidates.png')});
   await p.locator('[data-tiling-origin]').first().click();
   check(!(await p.locator('#dlgActions .primary').isDisabled()),'candidate stages a change');
   await p.locator('[data-tiling-joints] summary').click();
   await p.locator('[data-tiling-joint-align]').click();
   check(await p.locator('[data-tiling-joint]').inputValue()==='continuous','align and join stages continuous joint');
   check((await read()).work===initial.work,'joint draft leaves saved work alone');
   await p.locator('[data-tiling-takeoff] summary').click();
   await p.locator('[data-tiling-sheet-scope]').selectOption('all');
   const [html]=await Promise.all([p.waitForEvent('download'),p.locator('[data-tiling-sheet="html"]').click()]);
   const htmlPath=verification.output('playwright/tile-takeoff/'+mode+'-book.html');
   await html.saveAs(htmlPath);
   const [csv]=await Promise.all([p.waitForEvent('download'),p.locator('[data-tiling-sheet="csv"]').click()]);
   const csvPath=verification.output('playwright/tile-takeoff/'+mode+'-quantities.csv');
   await csv.saveAs(csvPath);
   const book=await context.newPage();
   await book.goto(verification.fileBase+'verification.noindex/playwright/tile-takeoff/'+mode+'-book.html');
   check(await book.locator('svg').count()>1,'offline printed floor and elevation figures');
   check(await book.locator('[data-takeoff-piece^="F01"]').count()>10,'floor piece IDs');
   check(await book.locator('[data-takeoff-piece^="W"]').count()>10,'wall piece IDs');
   check((await book.locator('body').innerText()).includes('通铺'),'joint listed in the printable report');
   await book.locator('section').first().scrollIntoViewIfNeeded();
   await book.screenshot({path:verification.output('playwright/tile-takeoff/'+mode+'-book.png')});
   await book.close();
   await p.locator('#dlgActions .primary').click();
   check(await p.locator('[data-tiling-error]').textContent()==='','apply succeeds');
   const saved=await read();
   check(saved.j==='continuous'&&saved.history===initial.history+1,'single placement and junction commit');
   await p.locator('#dlgClose').click();
   await p.locator('#undo').click();
   check((await read()).work===initial.work,'single undo restores both drafts');
   await p.locator('#redo').click();
   check((await read()).work===saved.work,'redo restores both drafts');
   await verification.waitForCache(p);await p.reload();
   check((await read()).j==='continuous','save and reload retains door joint');
   await verification.clickCanvasTool(p,'#tiling-open');
   await p.locator('[data-tiling-select="floor"]').click();
   await p.locator('[data-tiling-joints] summary').click();
   await p.locator('[data-tiling-joint]').selectOption('threshold');
   await p.locator('[data-tiling-view="3d"]').click();
   await p.locator('[data-tiling-3d] canvas').waitFor();
   await p.screenshot({path:verification.output('playwright/tile-takeoff/'+mode+'-threshold-3d.png')});
   await p.locator('#dlgActions .primary').click();
   check((await read()).j==='threshold','threshold mode applied');
   await p.locator('#dlgClose').click();
   check(await p.locator('#gRooms path[fill="#aa9b87"]').count()===2,'main plan uses threshold material');
   check(!errors.length,errors.join('\n'));
   results.push({mode,passed:true,candidatePreview:true,continuous:true,threshold:true,printableBook:true,csv:true,undoRedo:true,reload:true});
  }finally{await context.close();}
 }
 return results;
}
