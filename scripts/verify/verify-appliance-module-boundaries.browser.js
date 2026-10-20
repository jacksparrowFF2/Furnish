async (page,verification)=>{
 const root=verification.root,results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1050},offline:mode==='file'}),p=await context.newPage(),errors=[];
  const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#drawing-compass').waitFor();
   await p.evaluate(()=>{
    Object.assign(PLAN,{walls:[[2480,2400,2597,5600,'n'],[2480,5503,5520,5623,'n']],wins:[],doors:[],slides:[]});applyPlanData();state=freshWork(PLAN);
    const K=FurnishKitchen,host=K.configure({...F('counter','模块厨房',4000,4000,2800,3000,180,'#d5c9b6'),id:'top',flip:true},{version:1,shape:'U',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:600,role:'door'},{run:0,width:1000,role:'hob'},{run:0,width:600,role:'door'},{run:1,width:400,role:'door'},{run:1,width:1000,role:'sink'},{run:1,width:400,role:'door'},{run:2,width:1000,role:'door'}]});
    const hob=K.attach({...F('stove_fotile_th36b','燃气灶',0,0,750,440,0,'#151515'),id:'hob'},host,1),sink=K.attach({...F('sink_arrow_750','箭牌水槽',0,0,750,450,0,'#85898a'),id:'sink'},host,4);
    state.furniture=[host,hob,sink];K.normalize(state.furniture);ui.layers.dims=true;ui.layers.clear=true;ui.layers.grid=false;ui.layers.collide=false;ui.layers.labels=false;renderAll();selectIds(['sink']);zoomToBox([2350,2250,5650,5850],60);
   });
   const gaps=id=>p.evaluate(id=>Object.fromEntries(Object.entries(FurnishSnapping.surfaceOpening(getF(id),measurementScene()).gaps).map(([k,m])=>[k,{distance:m?.distance,wall:!!m?.wallPriority,module:m?.entity.moduleKey}])) ,id);
   let sink=await gaps('sink'),hob=await gaps('hob');
   check(Math.abs(sink.l.distance-135)<.001&&Math.abs(sink.r.distance-135)<.001,'sink stops at own module ends: '+JSON.stringify(sink));
   check(sink.t.wall&&Math.abs(sink.t.distance-88)<.001,'sink rear adjoining wall: '+JSON.stringify(sink));
   check(hob.t.wall&&Math.abs(hob.t.distance-128)<.001,'hob rear adjoining wall: '+JSON.stringify(hob));
   check(Math.abs(hob.l.distance-170)<.001&&Math.abs(hob.r.distance-170)<.001,'hob stops at own module ends');
   check(await p.locator('[data-surface-opening="sink"] [data-hob-gap]').count()===4,'selected sink four orange labels');await p.evaluate(()=>selectIds(['hob']));check(await p.locator('[data-surface-opening="hob"] [data-hob-gap]').count()===4,'selected hob four orange labels');await p.evaluate(()=>selectIds(['sink']));
   await verification.openDistanceControls(p);check((await p.locator('#fab-editor').innerText()).includes('墙'),'panel names adjoining wall');check((await p.locator('#fab-editor').innerText()).includes('模块边界'),'panel names module reference');
   await p.screenshot({path:root+'output/playwright/sink-surface/'+mode+'-module-wall.png'});
   await p.evaluate(()=>mutate(()=>{state.demolished=['w0'];}));sink=await gaps('sink');check(!sink.t.wall&&Math.abs(sink.t.distance-85)<.001,'demolished wall falls back to module');await p.evaluate(()=>undo());check((await gaps('sink')).t.wall,'undo restores solid wall priority');await p.evaluate(()=>redo());check(!(await gaps('sink')).t.wall,'redo demolition');await p.evaluate(()=>undo());
   await p.evaluate(()=>{PLAN.walls=[];PLAN.wins=[{rect:[2480,2400,2597,5600],sill:.9,head:2.4}];applyPlanData();renderAll();});sink=await gaps('sink');check(!sink.t.wall&&Math.abs(sink.t.distance-85)<.001,'window cannot replace module reference');check(!(await gaps('hob')).t.wall,'open direction uses module');
   await p.evaluate(()=>{PLAN.wins=[];PLAN.walls=[[2000,2400,2100,5600,'n']];applyPlanData();renderAll();});check(!(await gaps('sink')).t.wall,'distant wall cannot replace module reference');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,sinkAndHob:true,localModules:true,adjoiningWalls:true,demolitionUndoRedo:true,windowAndDistantWall:true,errors});
  }finally{await context.close();}
 }
 return results;
}
