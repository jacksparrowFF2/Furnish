async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:960},offline:mode==='file'}),p=await context.newPage();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
   const check=async(label)=>{
    const boxes=await p.evaluate(()=>Object.fromEntries(['header','#designBar','#stage','#layer-sidebar','footer'].map(s=>{const e=document.querySelector(s),b=e?.getBoundingClientRect()||{top:0,bottom:0,height:0};return [s,{top:b.top,bottom:b.bottom,height:b.height,visible:!!e?.getClientRects().length}];})));
    if(boxes['#designBar'].top<boxes.header.bottom-1||boxes['#stage'].top<boxes['#designBar'].bottom-1||boxes.footer.top<boxes['#stage'].bottom-1||boxes.footer.bottom>960+1)throw Error(label+': rows overlap or escape viewport '+JSON.stringify(boxes));
    if(boxes['#layer-sidebar'].visible&&boxes['#layer-sidebar'].top<boxes['#stage'].top-1)throw Error(label+': layer pane overlaps design bar');
    if(boxes['#stage'].height<200)throw Error(label+': canvas collapsed');
    results.push(mode+' '+label);
   };
   await check('closed desktop');await p.locator('#tgLayers').click();await check('open desktop');
   await p.reload();await p.waitForFunction(()=>!repositoryBooting);await p.locator('#layer-sidebar').waitFor({state:'visible'});await check('restored desktop');
   await p.screenshot({path:V.output('playwright/design-layer-layout/'+mode+'-desktop.png')});
   for(const width of [1100,390]){await p.setViewportSize({width,height:960});await check('open '+width);await p.locator('#layer-sidebar-close').click();await check('closed '+width);await p.locator('#tgLayers').click();}
  }finally{await context.close();}
 }
 return {status:'PASS',checks:results};
}
