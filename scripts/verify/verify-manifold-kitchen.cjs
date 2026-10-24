const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),V=require('../lib/browser-verification.cjs');
(async()=>{
 require('../preview-manifold-kitchen.cjs');
 const root=V.configuration().root,out=path.join(root,'docs/validation/manifold-kitchen-20261023');fs.mkdirSync(out,{recursive:true});
 const run=fs.mkdtempSync(path.join(root,'output/playwright/manifold-kitchen-')),workspace=path.join(run,'workspace');fs.mkdirSync(workspace);
 for(const name of ['src','styles','assets','vendor'])if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(workspace,'index.html'));fs.mkdirSync(path.join(workspace,'output/manifold-kitchen'),{recursive:true});fs.copyFileSync(path.join(root,'output/manifold-kitchen/preview.html'),path.join(workspace,'output/manifold-kitchen/preview.html'));
 const server=await V.staticServer(workspace),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions).catch(async e=>{await server.close();throw e;}),results=[];
 try{for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base=mode==='http'?server.baseURL:pathToFileURL(workspace+path.sep).href,check=(v,label)=>{if(!v)throw Error(mode+': '+label);};
  try{
   await page.goto(base+'output/manifold-kitchen/preview.html');await page.waitForFunction(()=>window.previewReady);await page.locator('#toggle').click();await page.screenshot({path:path.join(out,mode+'-front-open.png')});await page.locator('#rear').click();await page.screenshot({path:path.join(out,mode+'-rear-open.png')});
   await page.goto(base+'index.html');await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();
   await page.evaluate(()=>{
    const f=FurnishKitchen.configure({id:'test-k',name:'厨房',type:'counter',cx:3000,cy:3000,rot:0,color:'#d4c8b6'},{version:1,shape:'straight',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:600,role:'door'},{run:0,width:600,role:'drawer'}]});
    const it=LIB.flatMap(c=>c.items).find(i=>i[0]==='heating_manifold');addItem(it,3000,2770);const m=structuredClone(state.furniture.at(-1));m.id='test-m';mutate(()=>state.furniture=[f,m]);selectIds(['test-k']);zoomSel();
   });
   check(await page.evaluate(()=>getF('test-m').h===600&&getF('test-k').kitchen.obstacleFit.depths.every(v=>v.rearService&&v.depth===425)),'catalog default and real commit fitting');
   await page.evaluate(()=>mutate(()=>{let f=getF('test-k');f=FurnishKitchen.toggle(f,0,undefined,true);for(let i=0;i<3;i++)f=FurnishKitchen.toggle(f,1,i,true);Object.assign(getF('test-k'),f);}));
   check(await page.evaluate(()=>!FurnishGeometry.volumeOverlap(getF('test-k'),getF('test-m'))),'opened production solids');
   await page.evaluate(()=>mutate(()=>{getF('test-m').cy=2000;}));check(await page.evaluate(()=>!getF('test-k').kitchen.obstacleFit),'moving away restores nominal');await page.evaluate(()=>undo());check(await page.evaluate(()=>getF('test-k').kitchen.obstacleFit.depths[1].rearService),'undo restores fit');await page.evaluate(()=>redo());check(await page.evaluate(()=>!getF('test-k').kitchen.obstacleFit),'redo removes fit');await page.evaluate(()=>undo());
   await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});check(await page.evaluate(()=>getF('test-k').kitchen.obstacleFit.depths.every(v=>v.depth===425&&v.rearService)),'refresh retains derived fit');
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForFunction(()=>typeof furnitureRenderErrors!=='undefined'&&furnitureRenderErrors.size===0);await page.screenshot({path:path.join(out,mode+'-application.png')});
   await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>selectIds(['test-m']));await page.locator('#fab [data-act="prop"]').click();await page.locator('#fManifoldLoops').waitFor({state:'visible'});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow screen');await page.screenshot({path:path.join(out,mode+'-mobile.png')});
   check(!errors.length,JSON.stringify(errors));results.push({mode,passed:true,catalogHeight:600,realCommit:true,doorAndDrawers:true,moveUndoRedo:true,refresh:true,production3D:true,narrow:true,errors});
  }finally{await context.close();}
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
