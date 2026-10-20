async(page,V)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const screen=async(x,y)=>p.evaluate(([x,y])=>{const q=svg.createSVGPoint(),a=drawingPoint([x,y]);q.x=a[0];q.y=a[1];const b=q.matrixTransform(svg.getScreenCTM());return {x:b.x,y:b.y};},[x,y]);
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{window.snapTestRooms=structuredClone(state.rooms);PLAN={...PLAN,walls:[],wins:[],doors:[],slides:[],rooms:[{id:'snap-room',name:'柜体吸附验收',mat:'tile800',at:[2000,2000],poly:[[0,0],[7500,0],[7500,7500],[0,7500]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...window.snapTestRooms,...state.rooms};ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;closeDrawers();});
   for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const axis of ['w','d']){
    const data=await p.evaluate(({rot,flip,axis})=>{
     const f={...FurnishCabinet.preset('tv-floor'),id:'snap-tv',type:'tvstand',cx:4000,cy:4000,rot,flip};
     const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),u=axis==='w'?[c,s]:[-s,c],v=axis==='w'?[-s,c]:[c,s];
     const edge=(axis==='w'?f.w:f.d)/2,at=[f.cx+u[0]*(edge+250),f.cy+u[1]*(edge+250)];
     const target={id:'snap-target',type:'cabinet',name:'参考柜体',cx:at[0],cy:at[1],w:axis==='w'?200:f.w,d:axis==='d'?200:f.d,h:500,rot,flip,color:'#b9d3cc'};
     const wall=!flip&&rot!==37;PLAN={...PLAN,walls:wall?[FurnishGeometry.bbox(FurnishGeometry.corners(target))]:[]};applyPlanData();
     mutate(()=>state.furniture=wall?[f]:[f,target]);selectIds([f.id]);renderAll();zoomToBox([1500,1500,7000,7000],90);
     return {u,expected:f[axis]+150,original:f[axis],anchor:[f.cx-f.w/2*c+f.d/2*s,f.cy-f.w/2*s-f.d/2*c]};
    },{rot,flip,axis});
    const handle=p.locator(`#gSel [data-handle="size"][data-axis="${axis}"] rect`).last(),box=await handle.boundingBox();check(box,'resize handle');
    const scale=await p.evaluate(()=>view.s),start={x:box.x+box.width/2,y:box.y+box.height/2};
    await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(start.x+data.u[0]*130*scale,start.y+data.u[1]*130*scale,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);
    check(await p.evaluate(()=>ui.guides.some(g=>g.line)),'visible boundary guide');
    if(rot===90&&flip&&axis==='w')await p.screenshot({path:V.output('playwright/cabinet-boundary-snapping/'+mode+'-rotated-resize.png')});
    await p.mouse.up();check(await p.evaluate(({axis,expected})=>Math.abs(getF('snap-tv')[axis]-expected)<1e-4,{axis,expected:data.expected}),`resize ${rot}/${flip}/${axis}`);
    await p.evaluate(()=>undo());check(await p.evaluate(({axis,original})=>getF('snap-tv')[axis]===original,{axis,original:data.original}),'undo resize');await p.evaluate(()=>redo());
   }
   // A nearby TV midpoint must not pull the cabinet away from its wall while
   // the cabinet's long-axis end is being moved onto another cabinet boundary.
   await p.evaluate(()=>{PLAN={...PLAN,walls:[[975,0,1100,4000]]};applyPlanData();state=freshWork(PLAN);state.rooms={...window.snapTestRooms,...state.rooms};mutate(()=>state.furniture=[
    {...FurnishCabinet.preset('tv-floor'),id:'move-tv',type:'tvstand',cx:800,cy:1000,w:2560,d:350,h:350,rot:90},
    {id:'screen',type:'tv',name:'电视',cx:895,cy:985,w:1450,d:80,rot:270,color:'#222'},
    {id:'end',type:'cabinet',name:'端部参考柜',cx:725,cy:2400,w:250,d:200,h:500,rot:0,color:'#c9b39c'}]);ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;selectIds(['move-tv']);closeDrawers();zoomToBox([300,-500,1400,3000],80);});
   const start=await screen(700,1000),end=await screen(700,1040);await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);
   const moved=await p.evaluate(()=>({cx:getF('move-tv').cx,cy:getF('move-tv').cy,drag:drag?.kind,guides:ui.guides}));
   check(Math.abs(moved.cx-800)<1e-5&&Math.abs(moved.cy-1020)<1e-5,'slide along wall onto furniture end '+JSON.stringify(moved));
   await p.screenshot({path:V.output('playwright/cabinet-boundary-snapping/'+mode+'-wall-slide.png')});await p.mouse.up();await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('move-tv').cy===1000),'undo move');await p.evaluate(()=>redo());
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();selectIds(['move-tv']);zoomToBox([300,-500,1400,3000],30);});
   await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
   await p.evaluate(()=>zoomToBox([300,-500,1400,3000],30));await p.screenshot({path:V.output('playwright/cabinet-boundary-snapping/'+mode+'-narrow.png')});
   await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>getF('move-tv').cx===800&&getF('move-tv').cy===1020),'refresh persisted move');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,rotations:[0,37,90,180,270],mirrors:true,axes:['w','d'],checks:['actual resize pointers to walls and furniture','guides','wall slide to cabinet end','undo/redo','refresh','narrow layout']});
  }finally{await ctx.close();}
 }
 return results;
}
