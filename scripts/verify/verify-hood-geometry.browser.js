async (page,verification)=>{
 const root=verification.root,results=[];
 for(const [mode,url,offline] of [['http',(verification.baseURL+'index.html'),false],['file',verification.fileBase+'index.html',true]]){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(ok,label)=>{if(!ok)throw Error(mode+': '+label);};
  try{
   await p.goto(url);await p.locator('#lib').waitFor();await p.locator('#lib').getByText('方太抽油烟机 JCD10TA',{exact:true}).first().click();
   const id=await p.evaluate(()=>selIds()[0]);check(await p.evaluate(id=>getF(id).hoodGeometry===undefined,id),'legacy geometry defaults');
   const dimensions=['#hood-height','#hood-bodyHeight','#hood-coverWidth','#hood-coverDepth'];
   for(const selector of dimensions){check(await p.locator(selector).count()===1,'single field '+selector);check(await p.locator('#hood-geometry '+selector).count()===1,'grouped geometry '+selector);}
   const edit=async(selector,value)=>{await p.locator(selector).fill(String(value));await p.locator(selector).press('Tab');};
   await edit('#hood-height',515);await edit('#hood-bodyHeight',330);await edit('#hood-coverWidth',600);await edit('#hood-coverDepth',280);
   const record=await p.evaluate(id=>structuredClone(getF(id)),id);check(JSON.stringify(record.hoodGeometry)===JSON.stringify({bodyHeight:330,coverWidth:600,coverDepth:280}),'independent mm fields');
   check(record.h===515&&record.w===900&&record.d===350&&record.mountHeight===1315,'outer and installation dimensions');
   await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).hoodGeometry.coverDepth===undefined,id),'undo');await p.evaluate(()=>redo());
   for(const [selector,value] of [['#hood-bodyHeight',515],['#hood-coverWidth',901],['#hood-coverDepth',351],['#hood-coverDepth','']]){await edit(selector,value);check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===JSON.stringify(record),'reject invalid '+selector);}
   await edit('#hood-coverWidth',900);check(await p.evaluate(id=>getF(id).hoodGeometry.coverWidth===900,id),'equal width allowed');await p.evaluate(()=>undo());
   await p.evaluate(id=>mutate(()=>{getF(id).locked=true;}),id);for(const selector of dimensions)check(await p.locator(selector).isDisabled(),'locked '+selector);await p.evaluate(()=>undo());
   const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.waitForTimeout(500);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh and autosave');
   await p.evaluate(id=>selectIds([id]),id);
   check(await p.evaluate(()=>{const payload={planId:PLAN.id,current:state,designs:[{name:'烟机几何',work:state}],catalog:[]},out=FurnishProject.unpack(FurnishProject.pack(payload));return JSON.stringify(out.current.furniture)===JSON.stringify(state.furniture)&&JSON.stringify(out.designs[0].work.furniture)===JSON.stringify(state.furniture);}), 'current and named project roundtrip');
   await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-width').fill('1080');await p.locator('#fab-depth').fill('420');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();check(await p.evaluate(id=>{const g=getF(id).hoodGeometry;return g.coverWidth===720&&g.coverDepth===336&&g.bodyHeight===330;},id),'outer resize scales sections');await p.evaluate(()=>undo());
   await p.locator('#hood-geometry').scrollIntoViewIfNeeded();await p.screenshot({path:root+'output/playwright/hood-geometry/'+mode+'-fields.png'});
   await p.evaluate(id=>{mutate(()=>{state.furniture=state.furniture.filter(f=>f.id===id);state.scene3d={cut:1.2,lamps:false,labels:false};const f=getF(id);f.cx=3000;f.cy=3000;});selectIds([id]);zoomSel();},id);
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor({state:'visible'});await p.waitForTimeout(600);
   await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1000);await p.locator('#hood-coverWidth').scrollIntoViewIfNeeded();await p.waitForFunction(()=>View3D.image()!==null);const image=await p.evaluate(()=>View3D.image());await edit('#hood-coverWidth',500);await p.waitForTimeout(800);await p.waitForFunction(()=>View3D.image()!==null);await p.screenshot({path:root+'output/playwright/hood-geometry/'+mode+'-3d.png'});check(await p.evaluate(()=>View3D.image())!==image,'3D cache rebuild on geometry edit');
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.setViewportSize({width:390,height:844});await p.evaluate(id=>{selectIds([id]);drawer('panel',true);},id);await p.locator('#hood-geometry').scrollIntoViewIfNeeded();
   for(const selector of dimensions){check(await p.locator(selector).isVisible(),'narrow visible '+selector);const b=await p.locator(selector).boundingBox();check(b.x>=0&&b.x+b.width<=390&&b.y>=0&&b.y+b.height<=844,'narrow field bounds');}
   await p.screenshot({path:root+'output/playwright/hood-geometry/'+mode+'-mobile.png'});check(errors.length===0,'page errors: '+errors.join(';'));results.push({mode,status:'PASS',errors});
  }finally{await context.close();}
 }
 return results;
}
