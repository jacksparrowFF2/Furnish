async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,s)=>{if(!v)throw Error(mode+': '+s);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
  const before=await p.evaluate(()=>{
   const ac={id:'order-ac',name:'美的酷省电 Ultra 空调',type:'aircon_midea_ultra_2hp',cx:3000,cy:2900,w:395,d:436,h:1856,rot:45,color:'#e5e7e8'},box=FurnishGeometry.bbox(FurnishGeometry.footprints(ac)[0]),target={id:'order-tv',name:'落地电视柜 · 上盖抽屉藏线',type:'custom',cx:3000,cy:box[3]+150+200,w:1500,d:400,h:500,rot:0,color:'#aaa'};
   const k=FurnishKitchen.configure({id:'order-k',name:'厨房',type:'counter',cx:20000,cy:20000,rot:0},{version:1,shape:'straight',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:600,role:'door'},{run:0,width:600,role:'door'}]}),flue={id:'order-flue',name:'烟道',type:'cabinet',cx:19700,cy:19875,w:300,d:350,h:2800,rot:0};
   mutate(()=>{state.furniture=[ac,target,k,flue];});
   // Reproduce the repository's saved object key order without changing values.
   const sorted=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(sorted):Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
   state.furniture=sorted(state.furniture);selectIds([ac.id]);zoomSel();editDirectionalDistance('b');return {cx:ac.cx,cy:ac.cy};
  });
  await p.locator('#directional-gap-input').fill('130');await p.getByRole('button',{name:'应用距离',exact:true}).click();await verification.waitForDialogAction(p);
  check(await p.locator('#directional-gap-input').count()===0,'dialog closes after Apply');
  const after=await p.evaluate(()=>{const f=getF('order-ac');return {cx:f.cx,cy:f.cy,gap:directionalMeasurements(f).b.distance};});
  check(Math.abs(after.cx-before.cx)<.01&&Math.abs(after.cy-before.cy-20)<.01&&Math.abs(after.gap-130)<.01,'moves 20 mm and measures 130 mm: '+JSON.stringify({before,after}));
  await p.evaluate(()=>undo());check(await p.evaluate(()=>Math.abs(getF('order-ac').cy-2900)<.01),'undo');await p.evaluate(()=>redo());
  await verification.waitForCache(p);await p.reload();
  check(await p.evaluate(()=>Math.abs(directionalMeasurements(getF('order-ac')).b.distance-130)<.01),'saved refresh');
  await p.evaluate(()=>{selectIds(['order-ac']);zoomSel();});await p.screenshot({path:verification.output('directional-config-order/'+mode+'-130mm.png')});
  check(!errors.length,errors.join(';'));results.push({mode,before,after,passed:true,errors});await context.close();
 }
 return results;
}
