async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
  await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(V.root+'tests/fixtures/wall-tile-bands.furnish.json');await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
  const keys=await p.evaluate(()=>{
   let next=state;for(const f of FurnishWallTiling.faces(FurnishProject.effectivePlan(PLAN,state),state))next=FurnishWallFinish.edit(next,f,{tileThickness:10,bondThickness:15});
   const plan=FurnishProject.effectivePlan(PLAN,next),keys=plan.wallTiling.surfaces.map(e=>FurnishLayers.faceKey(e.face));
   next=FurnishLayers.assign(FurnishLayers.create(next,'wall-check','墙砖验收'),keys.slice(1),'wall-check');mutate(()=>{state.wallFinishes=next.wallFinishes;state.objectLayers=next.objectLayers;});return keys;
  });check(keys.length>2,'multiple tiled faces');
  await p.locator('#tgLayers').click();const toggle=p.locator('[data-layer-visible="wall-check"]');
  check(await p.locator('#gWalls [data-layer-wall]').count()>0,'2D finish tagged');
  await toggle.uncheck();
  check(await p.evaluate(keys=>{const nodes=[...document.querySelectorAll('#gWalls [data-layer-wall]')];return nodes.some(n=>n.dataset.layerWall!==keys[0])&&nodes.every(n=>(n.style.display==='none')===(n.dataset.layerWall!==keys[0]));},keys),'2D hides assigned finish only');
  check(await p.evaluate(()=>{const a=preparePlanSVG({visibleLayers:true}).svg,b=preparePlanSVG({visibleLayers:false}).svg;return [...a.querySelectorAll('[data-layer-wall]')].some(n=>n.style.display==='none')&&[...b.querySelectorAll('[data-layer-wall]')].every(n=>n.style.display!=='none');}),'current/full export contract');
  await p.screenshot({path:V.output('playwright/wall-layer-finishes/'+mode+'-2d-hidden.png')});
  await p.locator('#layer-undo').click();check(await toggle.isChecked(),'undo visibility');await p.locator('#layer-redo').click();check(!await toggle.isChecked(),'redo visibility');
  await p.evaluate(()=>{for(const [name,key]of [['FurnishWallFinishModel','__layerFinish'],['FurnishWallTilingModel','__layerPattern']]){const api=window[name],build=api.build;api.build=(...args)=>{const model=build(...args);window[key]=model;return model;};}});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  const inspect=()=>p.evaluate(()=>{const finishes=__layerFinish.children.filter(m=>m.userData.layerObject),patterns=__layerPattern.children.filter(m=>m.userData.wallTiling);return {finishes:finishes.length,bond:finishes.some(m=>m.userData.wallFinish.layer==='bond'),okay:finishes.every(m=>m.visible===FurnishLayers.visible(state,m.userData.layerObject))&&patterns.every(m=>m.visible===FurnishLayers.visible(state,FurnishLayers.faceKey(m.userData.wallTiling)))};});
  let value=await inspect();check(value.finishes>0&&value.bond&&value.okay,'3D tile solids and bond hide with pattern');
  await p.screenshot({path:V.output('playwright/wall-layer-finishes/'+mode+'-3d-hidden.png')});await toggle.check();check((await inspect()).okay,'3D restores all finish parts');
  await p.screenshot({path:V.output('playwright/wall-layer-finishes/'+mode+'-3d-visible.png')});
  await toggle.uncheck();await V.waitForCache(p);await p.reload();await p.waitForFunction(()=>!repositoryBooting);check(await p.locator('#gWalls [data-layer-wall]').evaluateAll(ns=>ns.some(n=>n.style.display==='none')),'refresh retains 2D hiding');
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await ctx.close();
 }
 return results;
}
