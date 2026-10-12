async (page) => {
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 // Deliberately isolated storage: acceptance must not edit the user's workspace.
 for(const [mode,url,offline] of [['file-offline','file:///'+root+'index.html',true],['http','http://127.0.0.1:8765/index.html',false]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline});
  const p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8765'))external.push(r.url());});
  const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);};
  await p.goto(url);await p.locator('#lib').waitFor();
  await p.locator('#lib').getByText('洗衣机',{exact:true}).click();
  check(await p.evaluate(()=>{const f=getF(selIds()[0]);return f.mountHeight===0&&f.h===850;}),'new washer defaults');
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  await p.locator('#pr-file').setInputFiles(root+'tests/fixtures/legacy-product-project.json');
  await p.locator('#pr-restore-confirm').click();
  const legacy=await p.evaluate(()=>{
   const wash=getF('legacy-wash'),dry=getF('legacy-dry'),shower=getF('legacy-shower'),flat=getF('legacy-flat');
   return {showerBottom:FurnishDesign.showerInstallation(shower).bottom,showerLegacy:shower.mountHeight,flat:FurnishDesign.furnitureVerticalBounds(flat),stack:FurnishGeometry.collisions([wash,dry]),designs:store.designs.length};
  });
  check(Math.abs(legacy.showerBottom-350)<1e-6&&legacy.showerLegacy===undefined,'old shower anchor migration');
  check(legacy.flat.bottom===1650&&legacy.flat.top===2215,'old omitted heater defaults');check(legacy.stack.length===0,'old stack overlap');check(legacy.designs>=1,'named version import');
  // Select imported furniture by its persisted id, then use actual UI controls.
  await p.evaluate(()=>selectIds(['legacy-wash']));
  check(await p.locator('#fH').inputValue()==='850','old washer displayed height');
  await p.locator('#fStackHeight').fill('0');await p.locator('#fStackHeight').press('Tab');
  await p.locator('#fH').fill('900');await p.locator('#fH').press('Tab');
  check(await p.evaluate(()=>getF('legacy-wash').h)===900,'body height editor');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();
  check(await p.evaluate(()=>getF('legacy-wash').h)===undefined,'undo retains omitted height');
  await p.getByRole('button',{name:'重做',exact:true}).first().click();
  check(await p.evaluate(()=>getF('legacy-wash').h)===900,'redo height');
  await p.locator('#fStackHeight').fill('-1');await p.locator('#fStackHeight').press('Tab');
  check(await p.evaluate(()=>getF('legacy-wash').stackHeight)===0,'invalid connector rejected');
  await p.evaluate(()=>selectIds(['legacy-shower']));
  await p.locator('#fShowerMixerHeight').fill('1100');await p.locator('#fShowerMixerHeight').press('Tab');
  await p.locator('#fShowerRise').fill('500');await p.locator('#fShowerRise').press('Tab');
  await p.locator('#fShowerHandAngle').fill('0');await p.locator('#fShowerHandAngle').press('Tab');
  await p.getByRole('button',{name:'查找并替换',exact:true}).click();
  await p.locator('#replace-query').fill('洗衣机');
  await p.locator('[data-replacement]').first().click();await p.getByRole('button',{name:'应用替换',exact:true}).click();
  check(await p.evaluate(()=>{const f=getF('legacy-shower');return f.type==='washer'&&['showerMixerHeight','showerRise','showerHandAngle','heaterSocket','floorTrack'].every(k=>f[k]===undefined);}), 'UI replacement clears foreign fields');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();
  check(await p.evaluate(()=>getF('legacy-shower').showerMixerHeight)===1100,'replacement undo');
  // Real download/upload exercises the full serialized current and named versions.
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloadPromise=p.waitForEvent('download');await p.locator('#pr-export').click();
  const download=await downloadPromise,path=root+'output/playwright/product-rules/'+mode+'.furnish.json';await download.saveAs(path);
  await p.locator('#pr-file').setInputFiles(path);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(()=>getF('legacy-shower').showerMixerHeight)===1100,'download and reimport');
  await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.querySelector('#view3d canvas')?.width>0&&document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));
  await p.screenshot({path:root+'output/playwright/product-rules/'+mode+'-3d.png'});
  await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));await p.waitForTimeout(800);await p.reload();
  check(await p.evaluate(()=>getF('legacy-wash').h===900&&getF('legacy-wash').stackHeight===0&&getF('legacy-shower').showerMixerHeight===1100&&getF('legacy-shower').showerRise===500&&getF('legacy-shower').showerHandAngle===0),'refresh persistence');
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.evaluate(()=>selectIds(['legacy-shower']));
  await p.locator('#tgPanel').click();
  await p.waitForTimeout(400);
  await p.screenshot({path:root+'output/playwright/product-rules/'+mode+'-mobile.png'});
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow screen horizontal overflow');
  check(await p.evaluate(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'property drawer visible inside viewport');
  check(errors.length===0,errors.join('\n'));check(external.length===0,'external network dependency');
  results.push({mode,passed:true,legacy,errors,externalRequests:external.length});await context.close();
 }
 const previews=[],previewContext=await page.context().browser().newContext({offline:true,viewport:{width:1200,height:900}});
 for(const name of ['fridges','laundry-stack','telescopic','shower-arrow']){
  const p=await previewContext.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file:///'+root+'output/'+name+'/preview.html');
  await p.waitForFunction(()=>[...document.querySelectorAll('canvas')].some(c=>c.width>300&&c.height>150));
  if(name==='fridges')await p.locator('#front').click();
  if(name==='telescopic'){await p.locator('#door').click();await p.locator('#track').selectOption('true');}
  await p.screenshot({path:root+'output/playwright/product-rules/preview-'+name+'.png'});
  if(errors.length)throw Error(name+': '+errors.join('\n'));previews.push({name,passed:true,errors});await p.close();
 }
 await previewContext.close();
 return {passed:true,results,previews,checks:['new defaults','legacy project and named version import','omitted defaults','no-drift mixer migration','stack overlap','edit/zero/invalid fields','undo/redo','UI replacement field cleanup','real project download/reimport','3D','refresh','390px property drawer','offline file reload','no external requests','four offline production previews']};
}
