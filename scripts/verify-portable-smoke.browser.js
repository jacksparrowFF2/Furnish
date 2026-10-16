async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(verification.baseURL).origin)external.push(r.url());});
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   if(await p.locator('#gWalls .wall').count()===0)throw Error(mode+': no production walls');
   const original=await p.evaluate(()=>JSON.stringify(state.furniture));
   await p.evaluate(()=>mutate(()=>state.furniture.push({id:'portable-smoke',type:'bed',name:'可迁移验收',cx:3000,cy:3000,w:1800,d:2000,rot:0,color:'#ddd'})));
   await p.evaluate(()=>undo());if(await p.evaluate(()=>JSON.stringify(state.furniture))!==original)throw Error(mode+': undo');await p.evaluate(()=>redo());
   await p.reload();await p.locator('#repository-loading').waitFor({state:'hidden'});if(!await p.evaluate(()=>state.furniture.some(f=>f.id==='portable-smoke')))throw Error(mode+': reload cache');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();
   await p.screenshot({path:verification.output('playwright/portable-smoke/'+mode+'.png')});
   if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));results.push({mode,passed:true,cacheReload:true,undoRedo:true,production3D:true});
  }finally{await context.close();}
 }
 return results;
}
