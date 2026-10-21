async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(verification.baseURL).origin)external.push(r.url());});
  const check=(value,message)=>{if(!value)throw Error(mode+': '+message);};
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   await p.evaluate(()=>mutate(()=>{state.furniture=[{id:'blender-bed',type:'bed',name:'导出验收床',cx:3500,cy:3300,w:1800,d:2000,h:900,rot:33,flip:true,color:'#bf9f75'},{id:'blender-table',type:'coffeetable_yeswood_cherry',name:'导出验收茶几',cx:6200,cy:4000,w:1200,d:650,h:450,rot:0,color:'#ba814e'},{id:'blender-instances',type:'tea_table_800',name:'实例化孔洞验收',cx:5800,cy:5200,w:800,d:400,h:720,rot:90,flip:true,color:'#68432e'}];}));
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(1100);
   const stateBefore=await p.evaluate(()=>JSON.stringify(state));
   await p.locator('#vBlender').click();await p.locator('#blender-export').waitFor();
   const download=p.waitForEvent('download');await p.locator('#blender-export').click();const file=await download;await file.saveAs(verification.output('playwright/blender/'+mode+'-scene.glb'));
   await p.waitForFunction(()=>document.querySelector('#blender-progress')?.textContent.includes('已导出'));
   check(await p.locator('#blender-start').isDisabled(),'render disabled without local API');
   check(await p.evaluate(()=>JSON.stringify(state))===stateBefore,'export changed project');
   await p.screenshot({path:verification.output('playwright/blender/'+mode+'-desktop.png'),animations:'disabled'});
   await p.locator('#blender-ceilings').check();const full=p.waitForEvent('download');await p.locator('#blender-export').click();await(await full).saveAs(verification.output('playwright/blender/'+mode+'-ceilings.glb'));
   await p.waitForFunction(()=>!document.querySelector('#blender-export').disabled);
   await p.locator('#dlgClose').click();await p.setViewportSize({width:390,height:844});await p.locator('#vBlender').click();
   check(await p.locator('#blender-export').isVisible(),'mobile export visible');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile page overflow');
   check(await p.locator('.blender-render').evaluate(e=>e.scrollWidth<=e.clientWidth),'mobile panel overflow');await p.screenshot({path:verification.output('playwright/blender/'+mode+'-mobile.png'),animations:'disabled'});
   await p.locator('#dlgClose').click();await p.reload();await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(1000);await p.locator('#vBlender').click();check(await p.locator('#blender-export').isEnabled(),'reload export');
   check(!errors.length,errors.join(';'));check(!external.length,external.join(';'));results.push({mode,passed:true,projectUnchanged:true,mirroredRotatedProductionFurniture:true,downloads:true,ceilingsOption:true,mobile:true,reload:true,errors,external});
  }finally{await context.close();}
 }
 return results;
}
