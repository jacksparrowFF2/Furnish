/* Focused, isolated HTTP/offline acceptance for hanging and moving-only floor rails. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),V=require('../lib/browser-verification.cjs');
(async()=>{
 const root=V.configuration().root,out=path.join(root,'docs/validation/telescopic-floor-tracks-20261025');fs.mkdirSync(out,{recursive:true});require('../preview-telescopic.cjs');
 const run=fs.mkdtempSync(path.join(root,'output/playwright/telescopic-floor-')),workspace=path.join(run,'workspace 迁移 #');fs.mkdirSync(workspace);
 for(const name of ['src','styles','assets','vendor'])if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(workspace,'index.html'));fs.mkdirSync(path.join(workspace,'output/telescopic'),{recursive:true});fs.copyFileSync(path.join(root,'output/telescopic/preview.html'),path.join(workspace,'output/telescopic/preview.html'));
 const server=await V.staticServer(workspace),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions).catch(async e=>{await server.close();throw e;}),results=[];
 try{for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=mode==='http'?server.baseURL:pathToFileURL(workspace+path.sep).href,check=(v,label)=>{if(!v)throw Error(mode+': '+label);};
  const opened=()=>page.waitForFunction(()=>window.previewModels.every(m=>m.userData.slidingDoor.cur===1));
  try{
   await page.goto(base+'output/telescopic/preview.html');await page.waitForFunction(()=>window.previewReady);check(await page.locator('#track').inputValue()==='false','preview defaults to hanging');
   for(const pair of ['2-2','3-3','3-2']){
    await page.locator('#pair').selectOption(pair);await page.locator('#track').selectOption('false');
    check(await page.evaluate(()=>window.previewModels.every(m=>!m.getObjectByName('floor-track'))),'hanging mode has no floor rails '+pair);
    await page.locator('#door').click();await page.locator('#window').click();await opened();await page.locator('#floor').click();
    if(pair==='3-3')await page.screenshot({path:path.join(out,mode+'-hanging-open.png')});
    await page.locator('#track').selectOption('true');
    check(await page.evaluate(()=>window.previewModels.every(m=>{const d=m.userData.slidingDoor,rails=m.getObjectByName('floor-track').children,moving=d.leaves.flatMap((l,i)=>l.closed!==l.opened?[i]:[]);return rails.length===moving.length&&rails.every(r=>moving.includes(r.userData.slidingLeafIndex));})),'ground rail count matches moving leaves '+pair);
    await page.locator('#door').click();await page.locator('#window').click();await opened();await page.screenshot({path:path.join(out,mode+'-'+pair+'-ground-open.png')});
    await page.locator('#order-b').selectOption('leading-back');
    check(await page.evaluate(()=>{const m=window.previewModels[1],d=m.userData.slidingDoor;return m.getObjectByName('floor-track').children.every(r=>{r.geometry.computeBoundingBox();return Math.abs((r.geometry.boundingBox.min.z+r.geometry.boundingBox.max.z)/2+r.position.z-d.leaves[r.userData.slidingLeafIndex].node.position.z)<1e-6;});}),'rails follow reversed inner/outer lanes '+pair);
   }
   await page.goto(base+'index.html');await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#lib .item').first().waitFor();
   const ids=await page.evaluate(()=>{mutate(()=>{state.furniture=[];state.furnitureDatum='survey';});const add=(type,x,y)=>{addItem(LIB.flatMap(c=>c.items).find(i=>i[0]===type),x,y);return state.furniture.at(-1).id;};const a=add('tripleslidingdoor',3000,3000),b=add('doubleslidingdoor',4200,3900);mutate(()=>{Object.assign(getF(a),{cx:3000,cy:3000});Object.assign(getF(b),{cx:4200,cy:3900,rot:90});});selectIds([a]);return [a,b];});
   check(await page.locator('#fFloorTrack').inputValue()==='false','new catalog door defaults to hanging');check((await page.locator('#fFloorTrack option[value="true"]').innerText()).includes('2'),'three-panel option states two ground rails');
   await page.locator('#fFloorTrack').selectOption('true');check(await page.locator('#gFurn [data-sliding-floor-track]').count()===2,'plan shows two rails');
   await page.evaluate(id=>selectIds([id]),ids[1]);check((await page.locator('#fFloorTrack option[value="true"]').innerText()).includes('1'),'two-panel option states one ground rail');await page.locator('#fFloorTrack').selectOption('true');check(await page.locator('#gFurn [data-sliding-floor-track]').count()===3,'mixed pair plan shows three total moving rails');
   await page.evaluate(()=>undo());check(await page.evaluate(id=>getF(id).floorTrack===undefined,ids[1]),'undo keeps legacy omission');await page.evaluate(()=>redo());check(await page.locator('#fFloorTrack').inputValue()==='true','redo restores ground mode');
   await V.configuration().waitForCache(page);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});check(await page.evaluate(ids=>ids.every(id=>getF(id).floorTrack===true),ids),'ground mode survives refresh');
   await page.evaluate(()=>{const create=FurnishSlidingOpeningModel.create;window.floorBuilds={};FurnishSlidingOpeningModel.create=(...args)=>{const m=create(...args),build=m.build;m.build=(f,c)=>{const g=build(f,c);window.floorBuilds[f.id]={rails:g.getObjectByName('floor-track'),door:g.userData.slidingDoor};return g;};return m;};});
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForFunction(ids=>window.floorBuilds[ids[0]]?.rails?.children.length===2&&window.floorBuilds[ids[1]]?.rails?.children.length===1,ids);
   await page.evaluate(id=>selectIds([id]),ids[1]);await page.locator('#fFloorTrack').selectOption('false');await page.waitForFunction(id=>!window.floorBuilds[id].rails,ids[1]);await page.evaluate(()=>undo());await page.waitForFunction(id=>window.floorBuilds[id]?.rails?.children.length===1,ids[1]);check(await page.evaluate(()=>furnitureRenderErrors.size===0),'scene mode switches render without fallback');
   await page.getByRole('button',{name:'2D 平面',exact:true}).click();await page.waitForFunction(()=>!is3D()&&!switching);await page.setViewportSize({width:390,height:844});await page.evaluate(id=>selectIds([id]),ids[0]);await page.locator('#fab [data-act="prop"]').click();await page.locator('#fFloorTrack').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});await page.screenshot({path:path.join(out,mode+'-mobile.png')});
   check(errors.length===0,JSON.stringify(errors));results.push({mode,passed:true,hangingDefault:true,groundCounts:{twoPanel:1,threePanel:2},reversedLanes:true,openStateRails:true,propertyControl:true,planMarks:true,undoRedo:true,refresh:true,productionScene:true,narrow:true,errors});
  }catch(e){await page.screenshot({path:path.join(out,mode+'-failure.png')});throw e;}finally{await context.close();}
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
