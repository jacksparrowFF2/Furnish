/* CLI run-code; separate storage context and synthetic project. */
async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:950}}),p=await context.newPage(),errors=[],dir=(verification.root+'output/playwright/workflow-tools/'),check=(v,m)=>{if(!v)throw Error(m);};p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto((verification.baseURL+'index.html'));await p.locator('#drawing-compass').waitFor();
  await p.screenshot({animations:'disabled',path:dir+'readability-default.png'});
  await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(dir+'reimport-downloaded.furnish.json');await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
  check(await p.evaluate(()=>{const f=getF('outside_chair'),r=ROOMS.find(r=>FurnishGeometry.inPoly(f.cx,f.cy,r.poly)),label=roomLabelLayout().get(r.id);return label?.hits===0&&Math.hypot(label.at[0]-f.cx,label.at[1]-f.cy)>500;}),'room label avoids centre chair');
  const before=await p.evaluate(()=>JSON.stringify(state));await p.locator('#zoomIn').click();await p.locator('#drawing-right').click();await p.locator('#undo').click();
  check(await p.evaluate(()=>JSON.stringify(state))===before,'drawing rendering preserves persisted geometry');
  await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await p.emulateMedia({media:'print'});
  check(await p.locator('#drawing-print-sheet').isVisible(),'complete print sheet visible');check(await p.locator('.app').isHidden(),'editor excluded from print');check(await p.locator('#drawing-print-sheet #gDims text').count()>4,'fixed printed dimensions');
  await p.screenshot({animations:'disabled',path:dir+'readability-print.png'});await p.emulateMedia({media:'screen'});await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));check(await p.locator('#drawing-print-sheet').count()===0,'print cleanup');
  await p.locator('#fit').click();await p.screenshot({animations:'disabled',path:dir+'readability-labels.png'});await p.setViewportSize({width:390,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'mobile overflow');
  check(!errors.length,errors.join(';'));return {roomLabelAvoidance:true,printComplete:true,printCleanup:true,geometryPreserved:true,mobile390:true,errors};
 }finally{await context.close();}
}
