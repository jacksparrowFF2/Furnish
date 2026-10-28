async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();await p.evaluate(()=>{const at=ROOMS.find(r=>r.name==='客厅').at;const f={id:'near',type:'cabinet',cx:at[0],cy:at[1],rot:90,...FurnishCabinet.preset('storage')};Object.assign(f,FurnishCabinet.resize(f,{...f,w:1930,d:350}));mutate(()=>state.furniture=[f]);selectIds(['near']);zoomSel();});
   for(const [name,dx,dy,scale] of [['vertical',0,0,1],['pan',-180,110,1],['zoom',30,0,.7]]){
    await p.evaluate(({dx,dy,scale})=>{view.x0+=dx/view.s;view.y0+=dy/view.s;view.s*=scale;applyView();}, {dx,dy,scale});await p.waitForTimeout(350);
    const m=await p.evaluate(()=>{positionFab();const b=document.querySelector('#fab').getBoundingClientRect(),rail=document.querySelector('.canvas-rail').getBoundingClientRect(),stage=document.querySelector('#stage').getBoundingClientRect();return {gap:rail.top-b.bottom,center:Math.abs((b.left+b.right-stage.left-stage.right)/2),docked:!!document.querySelector('#fab-dock'),inside:b.left>=stage.left&&b.right<=stage.right+1&&b.top>=stage.top&&b.bottom<=stage.bottom};});
    if(!m.inside||m.docked||Math.abs(m.gap-12)>1||m.center>1)throw Error(name+': '+JSON.stringify(m));checks.push({name,...m});await p.screenshot({path:V.output('playwright/floating-toolbar-proximity/'+mode+'-'+name+'.png')});
   }
   if(errors.length)throw Error(errors.join(';'));results.push({mode,checks,passed:true});
  }finally{await ctx.close();}
 }
 return {passed:true,results};
}
