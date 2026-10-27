async(page,V)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{
    const rooms=structuredClone(state.rooms);
    PLAN={...PLAN,walls:[[4000,1800.375,5200,2800]],wins:[],doors:[],slides:[],rooms:[{id:'room',name:'墙边延长线验收',mat:'tile800',at:[3000,3000],poly:[[0,0],[7000,0],[7000,6000],[0,6000]]}]};applyPlanData();state=freshWork(PLAN);
    state.rooms={...rooms,...state.rooms};const f={...FurnishCabinet.preset('tv-floor'),id:'extension-cabinet',type:'tvstand',name:'远处墙角对齐',cx:1200,cy:3200,w:1200,d:400,h:500,rot:270};
    mutate(()=>state.furniture=[f]);ui.grid=10;ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;closeDrawers();selectIds([f.id]);zoomToBox([400,1800,5800,4400],70);
   });
   // Cabinet's upper end is already close to the remote wall's lower edge.
   // Stretch from y=2600 to y=2800, keeping its lower end at y=3800.
   const box=await p.locator('#gSel [data-handle="size"][data-axis="w"] rect').last().boundingBox();check(box,'width grip');
   const delta=await p.evaluate(()=>{const screen=xy=>{const a=drawingPoint(xy),q=svg.createSVGPoint();q.x=a[0];q.y=a[1];return q.matrixTransform(svg.getScreenCTM());},a=screen([1200,2600]),b=screen([1200,2780]);return {x:b.x-a.x,y:b.y-a.y};}),start={x:box.x+box.width/2,y:box.y+box.height/2};
   await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(start.x+delta.x,start.y+delta.y,{steps:6});await p.waitForFunction(()=>!canvasPointerFrame);
   const hit=await p.evaluate(()=>({f:structuredClone(getF('extension-cabinet')),guides:ui.guides,kind:drag?.kind}));
   check(Math.abs(hit.f.cy-hit.f.w/2-2800)<1e-4&&Math.abs(hit.f.cy+hit.f.w/2-3800)<1e-4,'remote wall lower edge '+JSON.stringify(hit));check(hit.guides.some(g=>g.line),'visible extended guide');
   await p.screenshot({path:V.output('playwright/wall-extension-snapping/'+mode+'-resize.png')});await p.mouse.up();
   await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('extension-cabinet').w===1200),'undo');await p.evaluate(()=>redo());
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{selectIds(['extension-cabinet']);closeDrawers();zoomToBox([400,1800,5800,4400],30);});
   await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
   await p.evaluate(()=>zoomToBox([400,1800,5800,4400],30));await p.screenshot({path:V.output('playwright/wall-extension-snapping/'+mode+'-narrow.png')});
   const expected=await p.evaluate(()=>structuredClone(getF('extension-cabinet')));await V.waitForCache(p);await p.reload();check(await p.evaluate(f=>JSON.stringify(getF(f.id))===JSON.stringify(f),expected),'refresh saved cabinet');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,checks:['remote wall edge resize pointer','extended guide','fixed opposite end','undo/redo','refresh','narrow layout']});
  }finally{await ctx.close();}
 }
 return results;
}
