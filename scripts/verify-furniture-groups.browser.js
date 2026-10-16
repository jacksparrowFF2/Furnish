async (page,verification)=>{
 const root=verification.root,results=[];
 for(const [mode,url,offline] of [['http',(verification.baseURL+'index.html'),false],['file-offline',verification.fileBase+'index.html',true]]){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);};
  await p.goto(url);await p.locator('#lib').waitFor();
  const ids=await p.evaluate(()=>{
   const table=state.furniture.find(f=>f.type==='table'),chairs=state.furniture.filter(f=>f.type==='chair').slice(0,4);
   mutate(()=>{table.w=700;table.d=1200;table.rot=0;chairs.forEach((f,i)=>{f.cx=table.cx+(i<2?-350:350);f.cy=table.cy+(i%2?-260:260);f.rot=i<2?270:90;});state.furniture=[table,...chairs];});
   selectIds(state.furniture.map(f=>f.id));zoomSel();return selIds();
  });
  check(!(await p.locator('#panel').innerText()).includes('家具占地范围重叠'),'tucked seats panel');
  await p.locator('#panel [data-act="group"]').click();const group=await p.evaluate(()=>selItems()[0].groupId);check(!!group,'group created');
  await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.furniture.every(f=>!f.groupId)),'undo grouping');await p.keyboard.press('Control+Shift+z');
  await p.evaluate(()=>select(null));const f=p.locator(`#gFurn [data-fid="${ids[1]}"]`);await f.click();check(await p.evaluate(()=>selIds().length)===5,'click member selects all');
  const before=await p.evaluate(()=>state.furniture.map(f=>[f.cx,f.cy])),box=await f.boundingBox();
  await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+70,box.y+box.height/2+40,{steps:8});await p.mouse.up();
  const after=await p.evaluate(()=>state.furniture.map(f=>[f.cx,f.cy])),dx=after[0][0]-before[0][0],dy=after[0][1]-before[0][1];check(dx!==0&&after.every((v,i)=>Math.abs(v[0]-before[i][0]-dx)<1e-8&&Math.abs(v[1]-before[i][1]-dy)<1e-8),'drag common translation');
  await p.keyboard.press('Control+z');check(JSON.stringify(await p.evaluate(()=>state.furniture.map(f=>[f.cx,f.cy])))===JSON.stringify(before),'undo drag');await p.keyboard.press('Control+Shift+z');
  await p.keyboard.press('ArrowRight');check(await p.evaluate(()=>selItems().length)===5,'keyboard group move');
  await p.keyboard.press('Control+d');check(await p.evaluate(()=>selItems().every(f=>f.groupId===selItems()[0].groupId)&&selItems()[0].groupId!==state.furniture[0].groupId),'independent copied group');await p.keyboard.press('Control+z');
  await p.evaluate(ids=>selectIds([ids[0]]),ids);
  const roundtrip=await p.evaluate(()=>{const project=FurnishProject.unpack(JSON.parse(JSON.stringify(FurnishProject.pack({planId:PLAN.id,current:state,designs:[{name:'打组方案',work:state}],catalog:[]}))));return project.current.furniture.every(f=>f.groupId===state.furniture[0].groupId)&&project.designs[0].work.furniture.every(f=>f.groupId===state.furniture[0].groupId);});check(roundtrip,'project pack/unpack');
  await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(group=>state.furniture.length===5&&state.furniture.every(f=>f.groupId===group),group),'refresh persistence');await p.evaluate(ids=>{selectIds([ids[0]]);zoomSel();},ids);
  await p.screenshot({path:root+'output/playwright/furniture-groups/'+mode+'-group.png'});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{drawer('panel',true);});check(await p.locator('#panel [data-act="ungroup"]').isVisible(),'narrow ungroup');await p.screenshot({path:root+'output/playwright/furniture-groups/'+mode+'-mobile.png'});
  await p.locator('#panel [data-act="ungroup"]').click();check(await p.evaluate(()=>state.furniture.every(f=>!f.groupId)),'ungroup');await p.evaluate(()=>select(null));await p.evaluate(ids=>selectIds([ids[1]]),ids);check(await p.evaluate(()=>selIds().length)===1,'individual selection restored');
  check(errors.length===0,'page errors: '+errors.join(';'));results.push({mode,passed:true});await context.close();
 }
 return results;
}
