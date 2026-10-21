async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(mode+': '+m);};
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);await p.locator('#lib').waitFor();
   await p.evaluate(()=>{mutate(()=>{state.furniture=[{id:'bench',name:'换鞋凳',type:'bench_yeswood_oak',w:800,d:300,h:450,cx:2000,cy:2000,rot:37,flip:true,color:'#bd925f'},{id:'coffee',name:'茶几',type:'coffeetable_yeswood_cherry',w:1200,d:650,h:450,cx:3600,cy:2000,rot:0,color:'#bd7846'}];for(const [hostId,y,z] of [['bench',120,25],['coffee',310,0]]){const h=getF(hostId),a=h.rot*Math.PI/180;state.furniture.push({id:hostId+'-probe',name:'空隙探针',type:'block',w:20,d:10,h:10,mountHeight:y,cx:h.cx-z*Math.sin(a),cy:h.cy+z*Math.cos(a),rot:h.rot,color:'#40b0d0'});}});ui.layers.collide=true;ui.layers.dims=true;selectIds(['bench-probe']);zoomToBox([1500,1500,4400,2400],80);});
   const overlaps=()=>p.evaluate(()=>FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{scanPassages:false}).filter(i=>i.kind==='overlap'));
   check((await overlaps()).length===0,'gaps do not trigger footprint false positives');
   await V.openDistanceControls(p);check((await p.locator('#fab-editor').textContent()).includes('家具实际结构净距'),'shared structure readout');await p.keyboard.press('Escape');await p.screenshot({path:V.output('playwright/furniture-solids/'+mode+'-gaps.png')});
   await p.evaluate(()=>{mutate(()=>{const h=getF('bench'),f=getF('bench-probe');f.cx=h.cx;f.cy=h.cy;f.mountHeight=75;});});check((await overlaps()).some(i=>i.id==='bench'||i.otherId==='bench'),'real rod intersection remains flagged');await p.evaluate(()=>undo());check((await overlaps()).length===0,'undo restores cavity clearance');await p.evaluate(()=>redo());check((await overlaps()).length>0,'redo restores actual collision');await p.evaluate(()=>undo());
   await V.waitForCache(p);const saved=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();await p.waitForFunction(()=>!repositoryBooting);check(await p.evaluate(()=>JSON.stringify(state.furniture))===saved,'refresh structure and positions');
   await p.evaluate(()=>{selectIds(['coffee-probe']);zoomSel();});await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await V.openDistanceControls(p);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px');await p.screenshot({path:V.output('playwright/furniture-solids/'+mode+'-narrow.png')});await p.keyboard.press('Escape');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();await p.setViewportSize({width:1480,height:1000});await p.evaluate(()=>{closeDrawers();selectIds(['bench','coffee']);});await p.locator('#vSelection').click();await p.waitForTimeout(1000);await p.screenshot({path:V.output('playwright/furniture-solids/'+mode+'-3d.png')});check(!errors.length,errors.join(';'));results.push({mode,status:'PASS'});
  }finally{await context.close();}
 }
 return results;
}
