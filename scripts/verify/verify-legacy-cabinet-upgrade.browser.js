async(page,verification)=>{
 const results=[];
 for(const file of [false,true]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],check=(v,m)=>{if(!v)throw Error(m);};p.on('pageerror',e=>errors.push(e.stack||e.message));
  try{
   if(file)await context.route('**/*',r=>/^https?:/.test(r.request().url())?r.abort():r.continue());
   await p.goto(file?verification.fileBase+'index.html':verification.baseURL);await p.locator('#drawing-compass').waitFor();
   await p.evaluate(()=>{
    const oldRooms=structuredClone(state.rooms);PLAN={...PLAN,bounds:{x:-100,y:-100,w:5200,h:5200},walls:[[-100,-100,0,5100],[5000,-100,5100,5100],[0,-100,5000,0],[0,5000,5000,5100]],wins:[],doors:[],slides:[],beams:[],rooms:[{id:'legacy-test',name:'旧柜体验收',mat:'tile800',at:[2000,2000],poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...oldRooms,...state.rooms};
    state.furniture=[{id:'old-counter',type:'counter',name:'旧组合橱柜',w:1200,d:600,cx:2000,cy:2000,rot:0,color:'#aaa'},{id:'old-vanity',type:'vanity',name:'旧浴室柜',w:800,d:500,cx:3500,cy:2000,rot:0,color:'#fff'},{id:'device',type:'water_purifier_mijia_1200g',name:'净水器',w:163,d:445,h:379,mountHeight:118,cx:1704.5,cy:2000,rot:0,color:'#fff'}];ui.layers.clear=true;ui.layers.wallSnap=false;renderAll();selectIds(['device']);zoomToBox([1250,1400,4000,2700],100);
   });
   const read=()=>p.evaluate(()=>{const f=getF('device'),scene={furniture:state.furniture};return {gaps:Object.fromEntries(Object.entries(FurnishSnapping.directional(f,scene)).map(([k,v])=>[k,v?.distance])),inside:FurnishSnapping.cabinetInterior(f,scene),legacy:state.furniture.filter(f=>f.id.startsWith('old-')).every(f=>!f.cabinet&&!f.kitchen)};});
   let first=await read();check(first.legacy,'render preserves saved format');check(Math.abs(first.gaps.l-205)<.01&&first.inside.collisions.length===0,'legacy inner cavity');
   await p.locator('[data-fab-edit="distance"]').click();check((await p.locator('[data-distance-row="r"]').innerText()).includes('隔板'),'legacy divider reference');check((await p.locator('[data-interior-gap="top"]').innerText())==='305 mm','legacy ceiling');await p.screenshot({path:verification.output('playwright/legacy-cabinet/'+(file?'file':'http')+'-desktop.png')});
   await p.locator('[data-distance-row="l"]').click();await p.locator('#directional-gap-input').fill('40');await p.getByRole('button',{name:'应用距离',exact:true}).click();check(Math.abs((await read()).gaps.l-40)<.01,'numeric positioning');await p.evaluate(()=>undo());check(Math.abs((await read()).gaps.l-205)<.01,'undo');await p.evaluate(()=>redo());check(Math.abs((await read()).gaps.l-40)<.01,'redo');await p.evaluate(()=>undo());
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.evaluate(()=>selectIds(['old-counter','old-vanity']));await p.locator('#vSelection').click();await p.waitForTimeout(450);check(await p.evaluate(()=>furnitureRenderErrors.size===0),'production old models');await p.screenshot({path:verification.output('playwright/legacy-cabinet/'+(file?'file':'http')+'-3d.png')});
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await verification.waitForCache(p);await p.reload();await p.locator('#drawing-compass').waitFor();first=await read();check(first.legacy&&Math.abs(first.gaps.l-205)<.01,'refresh no materialized fields');
   check(await p.evaluate(()=>{const p=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:state,designs:[{name:'旧柜体',work:state}],catalog:[]}));return p.current.furniture.filter(f=>f.id.startsWith('old-')).every(f=>!f.cabinet&&!f.kitchen)&&FurnishCabinetMotion.solidParts(p.designs[0].work.furniture.find(f=>f.id==='old-vanity')).filter(p=>p.actualBoard).length>5;}),'current/named roundtrip');
   check(!errors.length,errors.join('\n'));results.push({mode:file?'offline-file':'http',status:'PASS',production3D:true,boardReferences:true,numericPlacement:true,undoRedoRefresh:true,roundtrip:true,errors});
  }finally{await context.close();}
 }
 return {status:'PASS',results};
}
