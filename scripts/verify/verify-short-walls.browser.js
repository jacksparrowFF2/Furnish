async (page,verification)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);};
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>{
    const d={version:1,id:'custom_short_wall_check',name:'短墙角点验收',source:'dxf',image:'',width:1200,height:1000,scale:1,openings:[],walls:[
     {id:'north',a:[100,100],b:[1100,100],kind:'b',thickness:100,caps:[0,0]},
     {id:'east',a:[1100,100],b:[1100,900],kind:'e',thickness:100,caps:[0,0]},
     {id:'south',a:[1100,900],b:[100,900],kind:'n',thickness:100,caps:[0,0]},
     {id:'west',a:[100,900],b:[100,100],kind:'e',thickness:100,caps:[0,0]},
     {id:'target',a:[400,60],b:[650,60],kind:'n',thickness:80,caps:[0,0]},
     {id:'short',a:[750,40],b:[900,40],kind:'n',thickness:60,caps:[0,0]}
    ]};const plan=FurnishDraft.build(d);store.customPlans.push(d);PLANS.push(plan);store.work[d.id]=freshWork(plan);store.work[d.id].architecture={draft:d,phase:'survey'};setPlan(d.id);
   });
   await p.locator('#tracePlan').click();await p.locator('[data-trace-mode="properties"]').click();
   const point=async(x,y)=>p.locator('#trace-canvas').evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const at=pt.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y};},[x,y]);
   const click=async(x,y)=>{const at=await point(x,y);await p.mouse.click(at.x,at.y);};
   await click(775,40);await p.locator('#wp-length').fill('49');await p.locator('#wp-apply').click();check((await p.locator('#wp-error').innerText()).includes('50 mm'),'reject below 50');
   await p.locator('#wp-length').fill('50');await p.locator('#wp-apply').click();check(Number(await p.locator('#wp-length').inputValue())===50,'numeric 50 mm');
   await p.locator('#trace-undo').click();await click(775,40);check(Number(await p.locator('#wp-length').inputValue())===150,'undo length');await p.locator('#trace-redo').click();await click(775,40);check(Number(await p.locator('#wp-length').inputValue())===50,'redo length');
   const drag=async(shift=false,cancel=false)=>{const start=await point(775,40),end=await point(675,50);await p.mouse.move(start.x,start.y);await p.mouse.down();if(shift)await p.keyboard.down('Shift');await p.mouse.move(end.x+4,end.y+2,{steps:6});await p.waitForTimeout(80);if(cancel)await p.keyboard.press('Escape');else if(!shift)check(await p.locator('[data-wall-snap="corner"]').count()===1,'corner feedback');await p.mouse.up();if(shift)await p.keyboard.up('Shift');};
   await drag(false,true);check(Number(await p.locator('#wp-x').inputValue())===750,'Escape restores drag');
   await drag();check(Number(await p.locator('#wp-x').inputValue())===650&&Number(await p.locator('#wp-y').inputValue())===50,'actual corners aligned');check(Number(await p.locator('#wp-length').inputValue())===50,'move retains length');
   await p.screenshot({path:verification.output('playwright/short-walls/'+mode+'-corners.png')});
   await p.locator('#trace-undo').click();await click(775,40);check(Number(await p.locator('#wp-x').inputValue())===750,'undo corner move');await p.locator('#trace-redo').click();await click(675,50);check(Number(await p.locator('#wp-x').inputValue())===650,'redo corner move');
   await p.locator('#trace-undo').click();await drag(true);check(Number(await p.locator('#wp-x').inputValue())!==650,'Shift bypasses corner snap');await p.locator('#trace-undo').click();await drag();
   // Resizing keeps the opposite endpoint and only snaps along the existing axis.
   const a=await point(650,50),to=await point(405,50);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:5});await p.mouse.up();check(Number(await p.locator('#wp-x').inputValue())===400&&Number(await p.locator('#wp-length').inputValue())===300,'endpoint corner snap');await p.locator('#trace-undo').click();
   await p.locator('#trace-undo').click();const zoom=await point(775,40);await p.mouse.move(zoom.x,zoom.y);await p.mouse.wheel(0,-500);await p.waitForTimeout(100);await drag();await click(675,50);check(Number(await p.locator('#wp-x').inputValue())===650,'screen-space snap after zoom');await p.locator('#trace-fit').click();
   // Create a second short wall through the real tracing pointer path.
   await p.locator('[data-trace-mode="wall"]').click();await p.locator('#trace-thickness').fill('60');await p.keyboard.down('Shift');await click(900,30);await click(950,30);await p.keyboard.up('Shift');await p.keyboard.press('Escape');
   await p.locator('#trace-finish').click();await p.locator('.trace-overlay').waitFor({state:'hidden'});
   const saved=await p.evaluate(()=>{const d=state.architecture.draft;return d.walls.filter(w=>Math.abs(Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])*d.scale-50)<1e-6);});check(saved.length===2,'both 50 mm walls saved');
   await verification.waitForCache(p);await p.reload();check(await p.evaluate(()=>state.architecture.draft.walls.length===7),'reload short walls');
   await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const downloaded=await downloading,file=verification.output('playwright/short-walls/'+mode+'.furnish.json');await downloaded.saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
   check(await p.evaluate(expected=>JSON.stringify(state.architecture.draft.walls.filter(w=>w.id==='short'))===JSON.stringify(expected.filter(w=>w.id==='short')),saved),'project roundtrip');
   await p.setViewportSize({width:390,height:844});await p.locator('#tracePlan').click();await p.locator('[data-trace-mode="properties"]').click();await p.screenshot({path:verification.output('playwright/short-walls/'+mode+'-mobile.png')});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow-screen overflow');
   check(errors.length===0,errors.join('\n'));results.push({mode,passed:true,numericAndDraw50:true,cornerDrag:true,shiftAndEscape:true,undoRedo:true,saveRefreshAndProject:true,narrowScreen:true});
  }finally{await context.close();}
 }
 return results;
}
