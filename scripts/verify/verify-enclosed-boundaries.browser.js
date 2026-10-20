async(page,verification)=>{
 const browser=page.context().browser(),results=[];
 for(const file of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const check=(v,m)=>{if(!v)throw Error(m);};
  try{
   if(file)await context.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
   await p.goto(file?verification.fileBase+'index.html':verification.baseURL);await p.locator('#drawing-compass').waitFor();
   await p.evaluate(()=>{
    state=freshWork(PLAN);state.furniture=[{id:'boundary-host',type:'block',name:'橱柜台面',cx:6325,cy:8998,w:1164,d:600,rot:270,color:'#ddd'},{id:'boundary-device',type:'water_purifier_mijia_1200g',name:'米家净水器 2 · 1200G',cx:6320,cy:9429,w:163,d:445,h:379,mountHeight:0,rot:270,color:'#fff'}];
    ui.layers.clear=true;ui.layers.wallSnap=false;renderAll();selectIds(['boundary-device']);zoomToBox([5900,8300,6800,9800],100);
   });
   const open=()=>p.locator('[data-fab-edit="distance"]').click();
   const read=()=>p.evaluate(()=>Object.fromEntries(Object.entries(directionalMeasurements(getF('boundary-device'))).map(([dir,m])=>[dir,m?.distance])));
   const expected={l:72.5,r:82.5,t:931.5,b:69.5},initial=await read();
   for(const key of Object.keys(expected))check(Math.abs(initial[key]-expected[key])<1e-5,'boundary '+key);
   check(await p.locator('[data-edit-overlay="directional-distance"]').count()===4,'four measured boundaries');
   await open();
   check((await p.locator('[data-distance-row="l"]').innerText()).includes('包络内边距'),'enclosed reference is explicit');
   check((await p.locator('#fab-editor').innerText()).includes('不代表柜内净空'),'boundary caveat visible');
   await p.screenshot({path:verification.output('playwright/enclosed-boundaries/'+(file?'file':'http')+'.png')});
   await p.locator('#fab-distance-save').click();check(await p.evaluate(()=>state.measures.length===4),'save four boundaries');
   await p.evaluate(()=>closeFabEditor());await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===0),'undo');
   await p.keyboard.press('Control+y');check(await p.evaluate(()=>state.measures.length===4),'redo');
   await p.evaluate(()=>{const f=getF('boundary-device');mutate(()=>f.cx+=10);});
   check(Math.abs((await read()).l-82.5)<1e-5,'moving recomputes boundary');
   await p.keyboard.press('Control+z');check(Math.abs((await read()).l-72.5)<1e-5,'undo position');
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await open();
   check(await p.locator('[data-distance-row]').count()===4,'narrow panel');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no horizontal overflow');
   await verification.waitForCache(p);await p.reload();await p.locator('#drawing-compass').waitFor();
   await p.evaluate(()=>{ui.layers.wallSnap=false;selectIds(['boundary-device']);});
   check(Math.abs((await read()).l-72.5)<1e-5,'refresh boundary');check(await p.evaluate(()=>state.measures.length===4),'refresh saved lines');
   check(!errors.length,errors.join('\n'));results.push({mode:file?'offline-file':'http',status:'PASS',distances:initial,saveUndoRedoRefresh:true,narrow:true,errors});
  }finally{await context.close();}
 }
 return {status:'PASS',results};
}
