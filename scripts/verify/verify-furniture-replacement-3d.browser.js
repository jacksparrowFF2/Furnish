async (page,V)=>{
 const check=(ok,message)=>{if(!ok)throw Error(message);},results=[];
 if(V.desktop)return run(page,'desktop');
 for(const [mode,url,offline] of [['http',V.baseURL+'index.html',false],['file',V.fileBase+'index.html',true]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!!window.FurnishCatalog);
  results.push(await run(p,mode));check(!errors.length,errors.join('\n'));await context.close();
 }
 return results;
 async function run(p,mode){
  const before=await p.evaluate(()=>{
   const b=bbox(ROOMS.find(r=>r.counted!==false).poly),x=(b[0]+b[2])/2,y=(b[1]+b[3])/2;
   mutate(()=>{state.furniture=[{id:'replace-source',type:'washer',name:'原洗衣机',cx:x,cy:y,w:600,d:600,h:800,rot:37,flip:true,color:'#aaaaaa',mountHeight:0},{id:'replace-upper',type:'dryer',name:'关联烘干机',cx:x,cy:y,w:600,d:600,h:850,rot:37,flip:true,color:'#aaaaaa',mountHeight:820,stackHeight:20}];delete state.objectLayers;});
   selectIds(['replace-source']);fitView();
   const apply=FurnishObservationLayers.applyScene;FurnishObservationLayers.applyScene=function(args){window.__replacementScene=args.furnG;return apply(args);};return {snap:snap(),undo:undoStack.length};
  });
  await p.evaluate(()=>setView('3d'));await p.waitForFunction(()=>is3D()&&!switching);
  await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1200);
  const unchanged=async()=>check(await p.evaluate(b=>snap()===b.snap&&undoStack.length===b.undo,before),'preview mutated design/history');
  const choose=async()=>{await p.locator('#replacement-pick').click();await p.locator('#replacement-query').fill('洗衣机');await p.locator('[data-picker-item]').filter({has:p.getByText('洗衣机',{exact:true})}).first().click();};
  await p.locator('#fab [data-replace-furniture]').click();check(await p.evaluate(()=>is3D()),'replacement left 3D');await choose();await unchanged();
  check(await p.evaluate(()=>{const work=FurnishCatalog.previewWork(),g=__replacementScene.children.find(o=>o.userData.fid==='replace-upper');const f=work.furniture.find(f=>f.id==='replace-upper'),base=FurnishProducts.floorBase(FurnishProject.effectivePlan(PLAN,work),f,work.furniture).z;return f.mountHeight===870&&Math.abs(g.position.y-.87-base/1000)<1e-6;}),'linked dryer production preview missing');
  check(await p.evaluate(()=>View3D.image())===null,'draft leaked into report image');
  check(await p.evaluate(async()=>{try{await View3D.blenderScene();return false;}catch(e){return e.message.includes('替换');}}),'draft exported as saved scene');
  await p.locator('#replacement-anchor input[value="back"]').check();await unchanged();
  check(await p.evaluate(()=>{const f=FurnishCatalog.previewWork().furniture[0],g=__replacementScene.children.find(o=>o.userData.fid===f.id);return Math.abs(g.rotation.y+f.rot*Math.PI/180)<1e-6&&g.scale.x<0&&g.userData.sig.includes('washer');}),'production preview pose mismatch');
  await p.screenshot({path:V.output('playwright/furniture-replacement-3d/'+mode+'-preview.png')});
  await p.evaluate(()=>setView('2d'));check(await p.locator('#gReplacement').count()===1&&await p.evaluate(()=>FurnishCatalog.active()),'2D switch lost replacement');
  await p.evaluate(()=>setView('3d'));check(await p.evaluate(()=>FurnishCatalog.active()&&!!FurnishCatalog.previewWork()),'3D switch lost replacement');await unchanged();
  await p.locator('#replacement-panel [data-replacement-cancel]').click();await unchanged();
  check(await p.evaluate(()=>{const f=getF('replace-upper'),base=FurnishProducts.floorBase(FurnishProject.effectivePlan(PLAN,state),f,state.furniture).z;return Math.abs(__replacementScene.children.find(o=>o.userData.fid===f.id).position.y-.82-base/1000)<1e-6;}),'cancel failed to restore scene');
  await p.evaluate(()=>FurnishCatalog.replacement());await choose();await p.locator('#replacement-apply').click();
  check(await p.evaluate(b=>is3D()&&!FurnishCatalog.active()&&getF('replace-upper').mountHeight===870&&undoStack.length===b.undo+1,before),'3D commit mismatch');
  await p.evaluate(()=>undo());await unchanged();await p.evaluate(()=>redo());
  check(await p.evaluate(()=>getF('replace-upper').mountHeight===870),'redo failed');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>FurnishCatalog.replacement());await choose();await unchangedAfter();
  await p.waitForTimeout(500);await p.screenshot({path:V.output('playwright/furniture-replacement-3d/'+mode+'-mobile.png')});
  check(await p.evaluate(()=>{const r=document.querySelector('#replacement-panel').getBoundingClientRect();return is3D()&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),'narrow 3D panel overflow');
  await p.keyboard.press('Escape');check(await p.evaluate(()=>!FurnishCatalog.active()&&is3D()),'escape failed');
  return {mode,passed:true};
  async function unchangedAfter(){check(await p.evaluate(()=>getF('replace-upper').mountHeight===870),'narrow preview mutated design');}
 }
}
