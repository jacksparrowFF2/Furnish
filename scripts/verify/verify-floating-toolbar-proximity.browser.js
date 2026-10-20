async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();await p.evaluate(()=>{const at=ROOMS.find(r=>r.name==='客厅').at;const f={id:'near',type:'cabinet',cx:at[0],cy:at[1],rot:90,...FurnishCabinet.preset('storage')};Object.assign(f,FurnishCabinet.resize(f,{...f,w:1930,d:350}));mutate(()=>state.furniture=[f]);selectIds(['near']);zoomSel();});
   for(const [name,dx,dy,scale] of [['vertical',0,0,1],['pan',-180,110,1],['zoom',30,0,.7]]){
    await p.evaluate(({dx,dy,scale})=>{view.x0+=dx/view.s;view.y0+=dy/view.s;view.s*=scale;applyView();}, {dx,dy,scale});await p.waitForTimeout(350);
    const m=await p.evaluate(()=>{positionFab();const f=getF('near'),canvas=svg.getBoundingClientRect(),points=FurnishGeometry.corners(f).map(v=>drawingPoint(v)).map(v=>({x:canvas.left+(v[0]-view.x0)*view.s,y:canvas.top+(v[1]-view.y0)*view.s})),b=document.querySelector('#fab').getBoundingClientRect(),left=Math.max(canvas.left,Math.min(...points.map(v=>v.x))),right=Math.min(canvas.right,Math.max(...points.map(v=>v.x))),top=Math.max(canvas.top,Math.min(...points.map(v=>v.y))),bottom=Math.min(canvas.bottom,Math.max(...points.map(v=>v.y)));return {gap:Math.hypot(Math.max(0,left-b.right,b.left-right),Math.max(0,top-b.bottom,b.top-bottom)),docked:!!document.querySelector('#fab-dock'),inside:b.left>=canvas.left&&b.right<=canvas.right+1&&b.top>=canvas.top&&b.bottom<=canvas.bottom+1};});
    if(!m.inside||m.docked||m.gap>120)throw Error(name+': '+JSON.stringify(m));checks.push({name,...m});await p.screenshot({path:V.output('playwright/floating-toolbar-proximity/'+mode+'-'+name+'.png')});
   }
   if(errors.length)throw Error(errors.join(';'));results.push({mode,checks,passed:true});
  }finally{await ctx.close();}
 }
 return {passed:true,results};
}
