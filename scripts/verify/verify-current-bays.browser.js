async(page,V)=>{
 const response=await page.request.get(V.baseURL+'tests/fixtures/browser/current-bay-workspace.json');if(!response.ok())throw Error('Missing isolated current-workspace snapshot');
 const saved=await response.json(),seed=saved.workspace,results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  await context.addInitScript(seed=>{if(!localStorage.getItem('__bay_review_seeded')){localStorage.setItem('huxing-design-v16',JSON.stringify(seed));localStorage.setItem('__bay_review_seeded','1');}},seed);
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
  check(await p.evaluate(id=>PLAN.id===id,seed.planId),'actual current plan restored');
  const bays=await p.evaluate(()=>FurnishBayWindows.list(FurnishProject.effectivePlan(PLAN,state)).map(b=>({id:b.id,room:b.platform.id,index:b.windows[0].index,depth:b.opening.bay.depth,height:b.opening.bay.height,head:b.opening.bay.head,name:state.rooms[b.platform.id].name,mat:state.rooms[b.platform.id].mat})));
  check(bays.length>0,'current project contains bays');
  for(let i=0;i<bays.length;i++){
   const b=bays[i];await p.evaluate(id=>{const b=FurnishBayWindows.list(PLAN).find(b=>b.id===id);select(null);zoomToBox(b.bounds,650);},b.id);
   const point=await p.evaluate(id=>{const b=FurnishBayWindows.list(PLAN).find(b=>b.id===id),q=b.platform.poly,box=bbox(q),matrix=document.querySelector('#gRooms').getScreenCTM();for(let iy=1;iy<20;iy++)for(let ix=1;ix<20;ix++){const x=box[0]+(box[2]-box[0])*ix/20,y=box[1]+(box[3]-box[1])*iy/20;if(!inPoly(x,y,q))continue;const at=new DOMPoint(x,y).matrixTransform(matrix),el=document.elementFromPoint(at.x,at.y);if(el?.closest('[data-room]')?.dataset.room===b.platform.id)return {x:at.x,y:at.y};}return null;},b.id);
   if(point)await p.mouse.click(point.x,point.y);else {await p.evaluate(()=>setLayer('furn',false));await p.locator('#gRooms [data-room="'+b.room+'"]').click({force:true});await p.evaluate(()=>setLayer('furn',true));}
   check(await p.evaluate(id=>ui.sel?.kind==='room'&&ui.sel.id===id,b.room),'actual platform click '+b.id);
   check(await p.locator('#bay-height').inputValue()===String(b.height)&&await p.locator('#bay-depth').inputValue()===String(b.depth),'current measurements '+b.id);
   check(await p.locator('[data-bay-selection="whole"]').count()===1,'whole selection '+b.id);
   await p.screenshot({path:V.output('playwright/current-bays/'+mode+'-'+i+'-2d.png')});
   await p.locator('[data-bay-part="window"]').click();check(await p.evaluate(index=>ui.sel.kind==='win'&&ui.sel.id===index,b.index),'window part '+b.id);
   await p.locator('#bay-panels').selectOption('3');await p.locator('#bay-stack-side').selectOption('right');await p.locator('#bay-window-apply').click();
   await p.locator('#bay-height').fill(String(b.height+20));check(await p.locator('#bay-head').inputValue()===String(b.head+20),'linked head '+b.id);
   check(await p.evaluate(id=>FurnishWorkspace.openingPreviewPlan().wins.filter(w=>w.bayId===id).every(w=>w.panels===3&&w.stackSide==='right'),b.id),'preview preserves face style '+b.id);
   await p.locator('#bay-apply').click();
   const correct=()=>p.evaluate(({b,height,depth})=>{const v=FurnishBayWindows.list(FurnishProject.effectivePlan(PLAN,state)).find(v=>v.id===b.id);return v.opening.bay.height===height&&v.opening.bay.depth===depth&&Math.abs(v.platform.height-height/1000)<1e-8&&v.windows.every(w=>Math.abs(w.window.sill-v.platform.height)<1e-8&&w.window.panels===3&&w.window.stackSide==='right');},{b,height:b.height+20,depth:b.depth});
   check(await correct(),'size change keeps style and sill alignment '+b.id);
   await p.locator('#undo').click();check(await p.locator('#bay-height').inputValue()===String(b.height),'undo '+b.id);await p.locator('#redo').click();check(await correct(),'redo '+b.id);
   const beforeCancel=await p.evaluate(()=>JSON.stringify(state));await p.locator('#bay-depth').fill(String(b.depth+10));await p.locator('#bay-cancel').click();check(await p.evaluate(()=>JSON.stringify(state))===beforeCancel,'cancel leaves state '+b.id);
   await p.locator('#bay-name').fill(b.name+'·复核');await p.locator('#bay-material').selectOption(b.mat==='wood'?'marble':'wood');await p.locator('#bay-surface-apply').click();
  }
  await V.waitForCache(p);await p.reload();
  const verifyAll=()=>p.evaluate(bays=>bays.every(b=>{const v=FurnishBayWindows.list(FurnishProject.effectivePlan(PLAN,state)).find(v=>v.id===b.id);return v.opening.bay.height===b.height+20&&v.windows.every(w=>w.window.panels===3&&w.window.stackSide==='right'&&w.window.sill===v.platform.height)&&state.rooms[b.room].name===b.name+'·复核';}),bays);
  check(await verifyAll(),'refresh restores both edited bays');
  // Download through the real export path, then restore that project through the production importer.
  const download=p.waitForEvent('download');await p.evaluate(()=>FurnishWorkspace.exportPlan(PLAN.id));const file=await download,stream=await file.createReadStream();let raw='';for await(const chunk of stream)raw+=chunk.toString();const packed=JSON.parse(raw);
  check(packed.version===await p.evaluate(()=>FurnishProject.formatVersion([state,...store.designs.filter(d=>d.planId===PLAN.id).map(d=>d.work)])),'export uses required version of the actual saved project');await p.evaluate(packed=>FurnishWorkspace.restore(FurnishProject.unpack(packed)),packed);check(await verifyAll(),'downloaded project roundtrip');
  await p.evaluate(async()=>{const T=await import('three'),add=T.Object3D.prototype.add,beforeRender=T.Scene.prototype.onBeforeRender;window.__reviewThree=T;window.__reviewWindows=[];window.__reviewFloors=[];T.Scene.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement===document.querySelector('#view3d canvas')){window.__reviewCamera=camera;window.__reviewScene=scene;}return beforeRender?.call(this,renderer,scene,camera,...args);};T.Object3D.prototype.add=function(...items){for(const o of items){o.traverse?.(m=>{if(m.isMesh&&m.userData.bayWindowIndex!==undefined)__reviewWindows.push(m);if(m.isMesh&&m.userData.layerObject?.startsWith('floor:'))__reviewFloors.push(m);});}return add.apply(this,items);};});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  for(let i=0;i<bays.length;i++){
   const b=bays[i];await p.evaluate(id=>{select({kind:'room',id});View3D.focusSelection();},b.room);await p.waitForTimeout(1200);
   const geometry=await p.evaluate(b=>{const T=__reviewThree,attached=m=>{let o=m;while(o.parent)o=o.parent;return o.isScene;},floors=__reviewFloors.filter(m=>attached(m)&&m.userData.layerObject==='floor:'+b.room),windows=__reviewWindows.filter(m=>attached(m)&&WINS[m.userData.bayWindowIndex]?.bayId===b.id),floor=new T.Box3(),win=new T.Box3();for(const m of floors)floor.union(new T.Box3().setFromObject(m));for(const m of windows)win.union(new T.Box3().setFromObject(m));return {top:floor.max.y,bottom:win.min.y,finite:!floor.isEmpty()&&!win.isEmpty()&&Number.isFinite(win.max.y),meshes:windows.length};},b);
   check(geometry.finite&&Math.abs(geometry.top-(b.height+20)/1000)<.002&&Math.abs(geometry.bottom-geometry.top)<.002,'production platform/window meshes align '+b.id);
   await p.screenshot({path:V.output('playwright/current-bays/'+mode+'-'+i+'-3d.png')});
   await p.evaluate(()=>document.querySelector('[data-t="furn"]').click());await p.waitForTimeout(200);await p.screenshot({path:V.output('playwright/current-bays/'+mode+'-'+i+'-3d-inspect.png')});
   const points=await p.evaluate(id=>{const T=__reviewThree,canvas=document.querySelector('#view3d canvas'),r=canvas.getBoundingClientRect(),attached=m=>{let o=m;while(o.parent)o=o.parent;return o.isScene;};return __reviewWindows.filter(m=>attached(m)&&WINS[m.userData.bayWindowIndex]?.bayId===id).flatMap(m=>{const at=new T.Box3().setFromObject(m).getCenter(new T.Vector3()).project(__reviewCamera),x=r.x+(at.x+1)*r.width/2,y=r.y+(1-at.y)*r.height/2;return at.z>=-1&&at.z<=1&&document.elementFromPoint(x,y)===canvas?[{x,y}]:[];});},b.id);
   let picked=false;for(const at of points){await p.mouse.click(at.x,at.y);picked=await p.evaluate(id=>ui.sel?.kind==='win'&&WINS[ui.sel.id]?.bayId===id,b.id);if(picked)break;}if(!picked){const debug=await p.evaluate(points=>{const T=__reviewThree,canvas=document.querySelector('#view3d canvas'),r=canvas.getBoundingClientRect(),ray=new T.Raycaster();return points.map(at=>{ray.setFromCamera(new T.Vector2((at.x-r.x)/r.width*2-1,-(at.y-r.y)/r.height*2+1),__reviewCamera);return {at,hits:ray.intersectObjects(__reviewScene.children,true).filter(h=>{if(!h.object.isMesh)return false;for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;}).slice(0,4).map(h=>({distance:h.distance,win:h.object.userData.bayWindowIndex,room:h.object.userData.room,type:h.object.type}))};});},points);throw Error(mode+': real window ray click '+b.id+' '+JSON.stringify(debug));}
   await p.locator('#bay-height').fill(String(b.height+25));await p.locator('#bay-apply').click();await p.waitForTimeout(300);
   check(await p.evaluate(b=>{const attached=m=>{let o=m;while(o.parent)o=o.parent;return o.isScene;},T=__reviewThree,floors=__reviewFloors.filter(m=>attached(m)&&m.userData.layerObject==='floor:'+b.room),windows=__reviewWindows.filter(m=>attached(m)&&WINS[m.userData.bayWindowIndex]?.bayId===b.id),floor=new T.Box3(),win=new T.Box3();for(const m of floors)floor.union(new T.Box3().setFromObject(m));for(const m of windows)win.union(new T.Box3().setFromObject(m));return Math.abs(floor.max.y-(b.height+25)/1000)<.002&&Math.abs(win.min.y-floor.max.y)<.002&&WINS[b.index].panels===3&&WINS[b.index].stackSide==='right';},b),'3D live edit rebuilds aligned production meshes '+b.id);
   await p.evaluate(()=>document.querySelector('[data-t="furn"]').click());

  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(id=>{select({kind:'room',id});drawer('panel',true);},bays[0].room);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px width');await p.screenshot({path:V.output('playwright/current-bays/'+mode+'-mobile.png')});
  await V.waitForCache(p);await p.reload();check(await p.evaluate(bays=>bays.every(b=>state.architecture.draft.openings.find(o=>o.id===b.id).bay.height===b.height+25),bays),'3D edits persist after refresh');
  check(!errors.length,errors.join(';'));results.push({mode,planId:seed.planId,bays,passed:true,pageErrors:errors});await context.close();
 }
 return results;
}
