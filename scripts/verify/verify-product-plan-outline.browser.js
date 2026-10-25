async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,s)=>{if(!v)throw Error(mode+': '+s);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
  await p.locator('#lib').getByText('美的酷省电 Ultra 立式空调 · 2匹室内机',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]);
  const metrics=await p.evaluate(id=>{
   mutate(()=>{const f=getF(id);Object.assign(f,{rot:45,flip:true,cx:3000,cy:3000});state.furniture=[f];});selectIds([id]);zoomSel();
   const f=getF(id),box=FurnishGeometry.bbox(FurnishGeometry.footprints(f)[0]),rect=FurnishGeometry.bbox(FurnishGeometry.corners(f));
   return {difference:rect[2]-box[2],points:document.querySelector('[data-selection-outline="product"]')?.points.numberOfItems};
  },id);
  check(metrics.difference>40&&metrics.points>=64,'contour selection and tight bounds');
  await p.screenshot({path:verification.output('product-plan-outline/'+mode+'-selected.png')});
  await p.evaluate(id=>{mutate(()=>{const f=getF(id),box=FurnishGeometry.bbox(FurnishGeometry.footprints(f)[0]);state.furniture.push({...f,id:'outline-reference',name:'净距参考柜',type:'custom',cx:box[2]+90,cy:f.cy,w:100,d:1000,rot:0});});editDirectionalDistance('r');},id);
  await p.locator('#directional-gap-input').fill('75');await p.getByRole('button',{name:'应用距离',exact:true}).click();await verification.waitForDialogAction(p);
  check(await p.evaluate(id=>Math.abs(directionalMeasurements(getF(id)).r.distance-75)<.01,id),'edit actual contour clearance');
  await p.evaluate(()=>undo());check(await p.evaluate(id=>Math.abs(directionalMeasurements(getF(id)).r.distance-40)<.01,id),'clearance undo');
  await p.evaluate(()=>redo());check(await p.evaluate(id=>Math.abs(directionalMeasurements(getF(id)).r.distance-75)<.01,id),'clearance redo');
  await p.evaluate(()=>mutate(()=>{state.furniture=state.furniture.filter(f=>f.id!=='outline-reference');}));
  const expected=await p.evaluate(id=>{mutate(()=>{getF(id).rot=90;});return JSON.stringify(getF(id));},id);
  await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).rot===45,id),'undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===expected,'redo');
  await verification.waitForCache(p);await p.reload();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===expected,'refresh');
  check(await p.evaluate(id=>{const f=getF(id),w={furniture:[f]},r=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:w,designs:[],catalog:[]}));return JSON.stringify(FurnishGeometry.footprints(r.current.furniture[0]))===JSON.stringify(FurnishGeometry.footprints(f));},id),'project roundtrip');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{drawer(null,false);zoomSel();});await p.waitForTimeout(250);
  check(await p.locator('[data-selection-outline="product"]').count()===1,'narrow selection');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');
  await p.screenshot({path:verification.output('product-plan-outline/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,metrics,passed:true,errors});await context.close();
 }
 return results;
}
