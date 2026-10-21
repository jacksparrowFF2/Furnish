async (page,verification)=>{
 const root=verification.root,results=[],check=(v,msg)=>{if(!v)throw Error(msg);};
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const base=mode==='file'?verification.fileBase:verification.baseURL;
  try{
   await p.goto(base+'output/folding-table/preview.html');await p.waitForFunction(()=>window.previewReady);
   const point=()=>p.evaluate(()=>{const v=foldingTablePreview,c=v.camera.position.clone().set(0,.76,0).project(v.camera),r=v.renderer.domElement.getBoundingClientRect();return {x:r.left+(c.x+1)*r.width/2,y:r.top+(1-c.y)*r.height/2};});
   for(const size of ['1100','1200','1300']){
    await p.locator('#variant').selectOption(size);await p.getByRole('button',{name:'圆桌',exact:true}).click();
    for(const pose of ['single','capsule','round']){const q=await point();await p.mouse.click(q.x,q.y);check(await p.evaluate(pose=>foldingTablePreview.f.foldingTablePose===pose,pose),'preview model click '+size+' '+pose);}
   }
   let q=await point();await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x+45,q.y+25,{steps:8});await p.mouse.move(q.x,q.y,{steps:8});await p.mouse.up();check(await p.evaluate(()=>foldingTablePreview.f.foldingTablePose==='round'),'drag returning to start');
   q=await point();await p.mouse.click(q.x,q.y,{button:'right'});await p.mouse.click(1400,930);check(await p.evaluate(()=>foldingTablePreview.f.foldingTablePose==='round'),'right / blank click');
   await p.mouse.move(q.x,q.y);await p.mouse.down();await p.locator('canvas').dispatchEvent('pointercancel',{pointerId:1});await p.mouse.up();check(await p.evaluate(()=>foldingTablePreview.f.foldingTablePose==='round'),'cancelled preview gesture');
   await p.screenshot({path:root+'output/folding-table/'+mode+'-click-preview.png'});
   await p.goto(base+'index.html');await p.locator('#lib').waitFor();await p.locator('#lib').getByText('源氏木语折叠餐桌 · 1300款',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
   // Isolated browser state puts the real model clear of walls and other items.
   await p.evaluate(id=>{mutate(()=>{const f=getF(id);state.furniture=[f];f.cx=30000;f.cy=30000;});selectIds([id]);},id);
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
   await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1200);
   // Wait for the actual camera transition rather than a wall-clock delay.
   // The production export boundary supplies the live camera and current model.
   const center=async()=>{await p.waitForFunction(()=>View3D.blenderSyncSignature()!==null);return p.evaluate(async id=>{const encode=FurnishBlenderExport.encode;try{FurnishBlenderExport.encode=(T,options)=>{const model=options.groups.flatMap(g=>g.children).find(o=>o.userData.fid===id),box=new T.Box3().setFromObject(model),at=box.getCenter(new T.Vector3());at.y=box.max.y-.01;at.project(options.camera);const r=document.querySelector('#view3d canvas').getBoundingClientRect();return {x:r.x+(at.x+1)*r.width/2,y:r.y+(1-at.y)*r.height/2};};return await View3D.blenderScene();}finally{FurnishBlenderExport.encode=encode;}},id);};
   for(const pose of ['single','capsule','round']){q=await center();await p.mouse.click(q.x,q.y);await p.waitForTimeout(120);const actual=await p.evaluate(({id,q})=>({pose:getF(id).foldingTablePose,hit:document.elementFromPoint(q.x,q.y)?.outerHTML.slice(0,200)}),{id,q});if(actual.pose!==pose){await p.screenshot({path:verification.output('playwright/folding-table-click-'+mode+'-failure.png')});throw Error('app model click '+pose+': '+JSON.stringify({q,actual}));}}
   await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).foldingTablePose==='capsule',id),'click undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).foldingTablePose==='round',id),'click redo');
   await p.evaluate(id=>mutate(()=>getF(id).locked=true),id);q=await center();await p.mouse.click(q.x,q.y);check(await p.evaluate(id=>getF(id).foldingTablePose==='round',id),'locked model click');await p.evaluate(id=>mutate(()=>delete getF(id).locked),id);
   await p.keyboard.down('Shift');await p.mouse.click(q.x,q.y);await p.keyboard.up('Shift');check(await p.evaluate(id=>getF(id).foldingTablePose==='round',id),'shift selection');
   await p.evaluate(id=>selectIds([id]),id);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x+40,q.y+20,{steps:8});await p.mouse.move(q.x,q.y,{steps:8});await p.mouse.up();check(await p.evaluate(id=>getF(id).foldingTablePose==='round',id),'furniture drag returning to start');
   await p.evaluate(id=>{selectIds([id]);View3D.focusSelection();},id);await p.waitForTimeout(1200);q=await center();await p.mouse.click(q.x,q.y);check(await p.evaluate(id=>getF(id).foldingTablePose==='single',id),'final model click');await p.waitForFunction(()=>!savePending);await p.screenshot({path:root+'output/folding-table/'+mode+'-click-app.png'});await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>getF(id).foldingTablePose==='single',id),'click refresh');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});
  }finally{await context.close();}
 }
 return results;
}
