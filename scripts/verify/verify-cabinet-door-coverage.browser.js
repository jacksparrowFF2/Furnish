async (page,verification)=>{
 const choose=(kind,column)=>verification.selectCabinetObject(p,{kind,column});
 const p=page,errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewportSize({width:1440,height:1000});
 const check=(v,m)=>{if(!v)throw Error(m);},rows=()=>p.locator('.cab-door-sizes:not([hidden]) > div').allTextContents();
 await p.goto(verification.baseURL);await p.locator('#lib').waitFor();
 async function open(kind){
  await p.evaluate(kind=>{
   const at=ROOMS.find(r=>r.name==='客厅').at;let f;
   if(kind==='laundry'){let n=0;f=FurnishKitchen.createLaundryCabinet({id:'coverage',cx:at[0],cy:at[1],rot:37,color:'#f3f1ec'},()=>`part${++n}`,'left')[0];}
   else if(kind==='wall')f=FurnishKitchen.configure({id:'coverage',type:'kitchenwall',cx:at[0],cy:at[1],rot:0,color:'#f3f1ec',mountHeight:1480},{version:1,shape:'straight',depth:350,baseHeight:700,thickness:0,modules:[{run:0,width:900,role:'door'},{run:0,width:900,role:'door'}]});
   else if(kind==='storage')f={...FurnishCabinet.preset('storage'),type:'cabinet',id:'coverage',cx:at[0],cy:at[1],rot:0};
   else f=FurnishKitchen.configure({id:'coverage',type:'counter',cx:at[0],cy:at[1],rot:0,color:'#f3f1ec'},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:900,role:'door'},{run:1,width:900,role:'door'}],endExtensions:[{run:0,length:200,depth:600}]});
   mutate(()=>state.furniture=[f]);FurnishCabinetEditor.open(f.id);
  },kind);await p.locator('#cab-preview canvas').waitFor();await p.waitForFunction(()=>document.querySelector('.cab-door-sizes > div'));
 }
 const snapshot=()=>p.evaluate(()=>JSON.stringify(getF('coverage')));
 await open('laundry');const original=await snapshot(),all=await rows();check(all.length===6,'two sink doors plus four upper doors');check(await p.locator('.cab-door-dimension').count()===6,'initial overall tab annotates all leaves');await choose('door');
 check(all.filter(s=>s.startsWith('洗衣柜吊柜')).length===4,'four individually identified upper leaves');
 await choose(undefined,1);check(JSON.stringify(await rows())===JSON.stringify(all),'empty washer module preserves the complete list');
 check(await p.locator('.cab-door-dimension').count()===4,'upper leaves remain annotated when selecting the washer bay');
 await p.locator('#cab-kitchen-front').click();await p.locator('.cab-door-sizes summary').click();
 await p.screenshot({path:verification.output('playwright/cabinet-door-coverage/laundry.png')});
 await p.locator('#cab-kitchen-dimensions').uncheck();check(await p.locator('.cab-door-sizes').isHidden(),'dimension switch hides the full list');await p.locator('#cab-kitchen-dimensions').check();
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:verification.output('playwright/cabinet-door-coverage/laundry-mobile.png')});
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow view has no page overflow');check(await snapshot()===original,'dimension navigation is draft-only');
 await p.getByRole('button',{name:'取消',exact:true}).click();check(await snapshot()===original,'cancel preserves original cabinet');
 await p.setViewportSize({width:1440,height:1000});await open('thin');const thinOriginal=await snapshot(),thinRows=await rows();check(thinRows.some(s=>s.startsWith('末端薄柜')),'end-cabinet door appears in full list');check(await p.locator('.cab-door-dimension').count()===thinRows.length,'all main, return and end doors annotated on entry');
 check(await p.locator('.cab-door-dimension').evaluateAll(labels=>labels.some(el=>el.title.startsWith('末端薄柜'))),'end-cabinet door has a projected label without a selectable module number');
 await p.locator('#cab-kitchen-front').click();await p.waitForFunction(()=>document.querySelectorAll('.cab-elevation').length===2);
 const unfolded=await rows();check([...unfolded].sort().join('\n')===[...thinRows].sort().join('\n'),'unfolded runs preserve every door and its original identity');
 await p.locator('.cab-elevation .cab-door-sizes summary').first().click();await p.screenshot({path:verification.output('playwright/cabinet-door-coverage/thin-unfolded.png')});
 await p.getByRole('button',{name:'取消',exact:true}).click();check(await snapshot()===thinOriginal,'unfolded dimensions do not change saved data');
 for(const kind of ['wall','storage']){
  await open(kind);const before=await snapshot(),list=await rows(),expected=kind==='wall'?4:2;check(list.length===expected,'all doors listed immediately on entry: '+kind);check(await p.locator('.cab-door-dimension').count()===expected,'all door labels on overall tab: '+kind);
  check(await p.locator('.cab-dimension').allTextContents().then(texts=>texts.some(s=>s.startsWith('总宽'))&&texts.some(s=>s.startsWith('总深'))),'overall width and depth still shown: '+kind);
  await p.locator('.cab-door-sizes summary').click();await p.screenshot({path:verification.output('playwright/cabinet-door-coverage/'+kind+'-entry.png')});
  if(kind==='wall'){await p.setViewportSize({width:390,height:844});await p.screenshot({path:verification.output('playwright/cabinet-door-coverage/wall-entry-mobile.png')});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'wall entry narrow layout');await p.setViewportSize({width:1440,height:1000});}
  await p.getByRole('button',{name:'取消',exact:true}).click();check(await snapshot()===before,'entry measurements preserve saved furniture: '+kind);
 }
 check(!errors.length,errors.join('; '));return {status:'PASS',laundryDoors:all.length,thinDoors:thinRows.length,errors};
}
