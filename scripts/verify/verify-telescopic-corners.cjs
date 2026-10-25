/* Isolated HTTP/offline file acceptance, using only the affected preview. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),V=require('../lib/browser-verification.cjs');
(async()=>{
 const root=V.configuration().root,out=path.join(root,'docs/validation/telescopic-corners-20261025');fs.mkdirSync(out,{recursive:true});
 require('../preview-telescopic.cjs');
 const run=fs.mkdtempSync(path.join(root,'output/playwright/telescopic-')),workspace=path.join(run,'workspace 迁移 #');fs.mkdirSync(workspace);
 for(const name of ['src','styles','assets','vendor'])if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(workspace,'index.html'));fs.mkdirSync(path.join(workspace,'output/telescopic'),{recursive:true});fs.copyFileSync(path.join(root,'output/telescopic/preview.html'),path.join(workspace,'output/telescopic/preview.html'));
 const server=await V.staticServer(workspace),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions).catch(async e=>{await server.close();throw e;}),results=[];
 try{for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=mode==='http'?server.baseURL:pathToFileURL(workspace+path.sep).href,check=(v,label)=>{if(!v)throw Error(mode+': '+label);};
  try{
   await page.goto(base+'output/telescopic/preview.html');await page.waitForFunction(()=>window.previewReady);
   for(const pair of ['3-2','2-2','3-3']){
    await page.locator('#pair').selectOption(pair);
    check(await page.evaluate(()=>window.previewModels.every(m=>{let n=0;m.traverse(o=>{if(o.name==='side-jamb')n++;});return n===1;})),'joined production jambs '+pair);
    await page.locator('#door').click();await page.waitForFunction(()=>window.previewModels[0].userData.slidingDoor.cur===1);
    check(await page.evaluate(()=>window.previewModels[1].userData.slidingDoor.cur===0),'independent second group '+pair);
    await page.locator('#window').click();await page.waitForFunction(()=>window.previewModels[1].userData.slidingDoor.cur===1);
    await page.screenshot({path:path.join(out,mode+'-'+pair+'-open.png')});
    await page.locator('#door').click();await page.locator('#window').click();await page.waitForFunction(()=>window.previewModels.every(m=>m.userData.slidingDoor.cur===0));
    if(pair==='3-2')await page.screenshot({path:path.join(out,mode+'-closed.png')});
   }
   await page.locator('#track').selectOption('true');await page.locator('#side').click();check(await page.evaluate(()=>window.previewModels.every(m=>!!m.getObjectByName('floor-track'))),'floor tracks and mirroring');
   await page.goto(base+'index.html');await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();
   const ids=await page.evaluate(()=>{
    mutate(()=>{state.furniture=[];state.furnitureDatum='survey';});
    const add=(type,x,y)=>{addItem(LIB.flatMap(c=>c.items).find(i=>i[0]===type),x,y);return state.furniture.at(-1).id;};
    const a=add('tripleslidingdoor',3000,3000),b=add('doubleslidingdoor',4200,3900);mutate(()=>{Object.assign(getF(a),{cx:3000,cy:3000});Object.assign(getF(b),{cx:4200,cy:3900,rot:90});});selectIds([b]);return [a,b];
   });
   check(await page.evaluate(ids=>FurnishProducts.slidingCorner(getF(ids[0]),state.furniture)?.partnerId===ids[1],ids),'catalog creates connected door pair');
   await page.locator('#fH').fill('2450');await page.locator('#fH').press('Tab');check(await page.evaluate(ids=>!FurnishProducts.slidingCorner(getF(ids[0]),state.furniture),ids),'height edit disconnects');
   await page.evaluate(()=>undo());check(await page.locator('#fH').inputValue()==='2400','height undo');await page.evaluate(()=>redo());check(await page.locator('#fH').inputValue()==='2450','height redo');await page.evaluate(()=>undo());
   const before=await page.evaluate(()=>JSON.stringify(state.furniture));await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});check(await page.evaluate(()=>JSON.stringify(state.furniture))===before,'refresh retains original records');
   // Observe actual production builder outputs before the scene reparents them.
   await page.evaluate(()=>{const create=FurnishSlidingOpeningModel.create;window.cornerBuilds={};FurnishSlidingOpeningModel.create=(...args)=>{const m=create(...args),build=m.build;m.build=(f,context)=>{const g=build(f,context),jambs=[];g.traverse(o=>{if(o.name==='side-jamb')jambs.push(o);});window.cornerBuilds[f.id]={jambs,track:g.getObjectByName('top-track'),door:g.userData.slidingDoor};return g;};return m;};});
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.locator('#view3d canvas').waitFor();
   await page.waitForFunction(ids=>ids.every(id=>window.cornerBuilds[id]?.jambs.length===1),ids);check(await page.evaluate(()=>furnitureRenderErrors.size===0),'actual scene has no model errors');
   await page.evaluate(id=>mutate(()=>{getF(id).cx+=300;}),ids[1]);await page.waitForFunction(ids=>ids.every(id=>window.cornerBuilds[id]?.jambs.length===2),ids);
   await page.evaluate(()=>undo());await page.waitForFunction(ids=>ids.every(id=>window.cornerBuilds[id]?.jambs.length===1),ids);
   await page.evaluate(id=>{window.cornerBuilds[id].door.open=true;},ids[0]);await page.waitForFunction(id=>window.cornerBuilds[id].door.cur===1,ids[0]);check(await page.evaluate(id=>!window.cornerBuilds[id].door.open,ids[1]),'scene groups open independently');
   await page.screenshot({path:path.join(out,mode+'-application.png')});
   await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);await page.setViewportSize({width:390,height:844});await page.evaluate(id=>selectIds([id]),ids[1]);await page.locator('#fab [data-act="prop"]').click();await page.locator('#fH').waitFor({state:'visible'});
   await page.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow viewport');await page.screenshot({path:path.join(out,mode+'-mobile.png')});
   check(errors.length===0,JSON.stringify(errors));results.push({mode,passed:true,combinations:['3-2','2-2','3-3'],independentAnimation:true,productionMiters:true,catalog:true,heightUndoRedo:true,refresh:true,neighborInvalidation:true,production3D:true,narrow:true,errors});
  }catch(e){await page.screenshot({path:path.join(out,mode+'-failure.png')});throw e;}finally{await context.close();}
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
