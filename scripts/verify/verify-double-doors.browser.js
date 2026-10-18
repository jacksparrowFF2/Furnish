async (page,verification)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);};
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>{mutate(()=>{state.open={};state.furniture=[];});select({kind:'door',id:0});});
   const initial=await p.evaluate(()=>JSON.stringify({h:DOORS[0].h,c:DOORS[0].c,o:DOORS[0].o}));
   await p.locator('#oType').selectOption('double');check(await p.locator('#oHinge').isDisabled(),'paired hinge control');
   const read=()=>p.evaluate(()=>JSON.stringify(state.open));
   const inward=await read();await p.locator('#oSwing').selectOption('outward');const outward=await read();check(outward!==inward,'direction changes persisted vectors');
   check(await p.locator('#oType').inputValue()==='double','changing swing retains type');
   await p.evaluate(()=>undo());check(await read()===inward,'undo swing');await p.evaluate(()=>redo());check(await read()===outward,'redo swing');
   check(await p.evaluate(()=>{const d=DOORS[0],e=FurnishProject.effectivePlan(PLAN,state).doors[0];return d.doorType===e.doorType&&JSON.stringify(d.h)===JSON.stringify(e.h)&&FurnishGeometry.doorLeaves(d).length===2;}),'effective and visible geometry agree');
   await p.screenshot({path:verification.output('playwright/double-doors/'+mode+'-2d.png')});
   await verification.waitForCache(p);await p.reload();await p.evaluate(()=>select({kind:'door',id:0}));check(await read()===outward,'refresh saved config');
   check(await p.locator('#oType').inputValue()==='double'&&await p.locator('#oSwing').inputValue()==='outward','refresh selectors');
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>drawer('panel',true));await p.locator('#oType').scrollIntoViewIfNeeded();
   check(await p.locator('#oType').isVisible()&&await p.locator('#oSwing').isVisible(),'mobile controls visible');
   await p.screenshot({path:verification.output('playwright/double-doors/'+mode+'-mobile.png')});await p.setViewportSize({width:1440,height:1000});
   await p.locator('#oReset').click();check(await p.locator('#oType').inputValue()==='single','reset type');check(await p.evaluate(()=>JSON.stringify({h:DOORS[0].h,c:DOORS[0].c,o:DOORS[0].o}))===initial,'reset vectors');
   await p.evaluate(()=>undo());await p.evaluate(()=>select({kind:'door',id:0}));check(await p.locator('#oType').inputValue()==='double','undo reset');
   // Exercise the real project download and upload, retaining the optional type.
   await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
   const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const download=await downloading,file=verification.output('playwright/double-doors/'+mode+'.furnish.json');await download.saveAs(file);
   await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();check(await read()===outward,'project download/upload');await p.evaluate(()=>closeDialog());
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();
   await p.evaluate(()=>{const d=DOORS[0],inward=d._base.o,at=[(d.rect[0]+d.rect[2])/2+inward[0]*600,(d.rect[1]+d.rect[3])/2+inward[1]*600],room=ROOMS.find(r=>FurnishGeometry.inPoly(at[0],at[1],r.poly));if(room)View3D.flyToRoom(room.id);});
   await p.waitForTimeout(1200);await p.screenshot({path:verification.output('playwright/double-doors/'+mode+'-3d.png')});
   check(errors.length===0,errors.join('\n'));results.push({mode,passed:true,saveUndoRedoRefresh:true,projectRoundtrip:true,mobile:true,production3D:true});
  }finally{await context.close();}
 }
 return results;
}
