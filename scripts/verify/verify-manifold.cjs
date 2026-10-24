/* Focused isolated HTTP/file verification; does not generate unrelated previews. */
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),V=require('../lib/browser-verification.cjs');
(async()=>{
 const root=V.configuration().root,out=path.join(root,'docs/validation/manifold-independent-20261023');fs.mkdirSync(out,{recursive:true});
 require('../preview-manifold.cjs');
 const run=fs.mkdtempSync(path.join(root,'output/playwright/manifold-')),workspace=path.join(run,'workspace 迁移 #');fs.mkdirSync(workspace);
 for(const name of ['src','styles','assets','vendor'])if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(workspace,'index.html'));fs.mkdirSync(path.join(workspace,'output/manifold'),{recursive:true});fs.copyFileSync(path.join(root,'output/manifold/preview.html'),path.join(workspace,'output/manifold/preview.html'));
 const server=await V.staticServer(workspace),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions).catch(async e=>{await server.close();throw e;}),results=[];
 try{for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=mode==='http'?server.baseURL:pathToFileURL(workspace+path.sep).href,check=(v,label)=>{if(!v)throw Error(mode+': '+label);};
  try{
   await page.goto(base+'output/manifold/preview.html');await page.waitForFunction(()=>window.previewReady);await page.locator('#front').click();await page.screenshot({path:path.join(out,mode+'-front.png')});await page.locator('#angle').click();await page.screenshot({path:path.join(out,mode+'-angle.png')});
   await page.locator('#loops').fill('8');await page.locator('#loops').press('Tab');check((await page.locator('#size').innerText()).startsWith('1100'),'preview circuits');
   await page.goto(base+'index.html');await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();
   const added=await page.evaluate(()=>{const it=LIB.flatMap(c=>c.items).find(i=>i[0]==='heating_manifold');addItem(it,3000,3000);return state.furniture.at(-1).id;});
   await page.evaluate(id=>selectIds([id]),added);check(await page.locator('#fManifoldLoops').inputValue()==='5','catalog add');
   async function edit(id,value){await page.locator(id).fill(value);await page.locator(id).press('Tab');}
   await edit('#fManifoldLoops','8');check(await page.evaluate(id=>getF(id).w,added)===1100,'count updates width');await page.evaluate(()=>undo());check(await page.locator('#fManifoldLoops').inputValue()==='5','undo');await page.evaluate(()=>redo());check(await page.locator('#fManifoldLoops').inputValue()==='8','redo');
   await edit('#fManifoldLower','900');check(await page.locator('#fManifoldLeft').inputValue()==='600','lower edit preserves upper');await page.evaluate(()=>undo());check(await page.locator('#fManifoldLower').inputValue()==='330','independent lower undo');await page.evaluate(()=>redo());check(await page.locator('#fManifoldLower').inputValue()==='900','independent lower redo');await edit('#fManifoldLeft','800');await edit('#fMountHeight','200');check(await page.evaluate(id=>getF(id).w,added)===1400,'longer lower determines width');
   await edit('#fManifoldLoops','2.5');check(await page.evaluate(id=>getF(id).manifoldLoops,added)===8,'reject fractional circuits');
   await V.configuration({FURNISH_VERIFY_ROOT:workspace,FURNISH_VERIFY_URL:server.baseURL}).waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});check(await page.evaluate(id=>getF(id)?.manifoldLoops===8&&getF(id)?.w===1400&&getF(id)?.manifoldLengths.upper===800&&getF(id)?.manifoldLengths.lower===900&&getF(id)?.mountHeight===200,added),'refresh');
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForFunction(()=>typeof furnitureRenderErrors!=='undefined'&&furnitureRenderErrors.size===0);await page.screenshot({path:path.join(out,mode+'-application.png')});
   await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);await page.setViewportSize({width:390,height:844});await page.evaluate(id=>selectIds([id]),added);await page.locator('#fab [data-act="prop"]').click();await page.locator('#fManifoldLoops').waitFor({state:'visible'});await page.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow width');await page.screenshot({path:path.join(out,mode+'-mobile.png')});
   check(!errors.length,JSON.stringify(errors));results.push({mode,passed:true,productionPreview:true,catalogAdd:true,editUndoRedo:true,invalidInput:true,independentLengths:true,refresh:true,production3D:true,narrow:true,errors});
  }finally{await context.close();}
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
