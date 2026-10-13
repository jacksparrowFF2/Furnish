async (page) => {
 const out='C:/Users/SPH/Documents/GitHub/Furnish/output/playwright/hood-bay/',context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const check=(ok,label)=>{if(!ok)throw Error(label);};
 await p.goto('http://127.0.0.1:8765/index.html');await p.locator('#lib').waitFor();
 await p.evaluate(()=>{mutate(()=>{state.furniture=[{...FurnishCabinet.preset('wall'),id:'hood-wall',type:'kitchenwall',name:'嵌合吊柜',w:1600,cx:3000,cy:3000,rot:0,mountHeight:1660},{id:'hood-test',type:'rangehood_fotile_jcd10ta',name:'方太烟机',w:900,d:350,cx:2800,cy:3000,rot:0,mountHeight:1315,color:'#111'}];});selectIds(['hood-wall']);});
 await p.locator('#hood-bay-enable').click();check(await p.evaluate(()=>FurnishCabinet.hoodBay(getF('hood-wall')).width===500),'enable');
 await p.evaluate(()=>undo());check(await p.locator('#hood-bay-enable').count()===1,'undo cavity');await p.evaluate(()=>redo());
 await p.locator('#hood-bay-width').fill('520');await p.locator('#hood-bay-width').press('Tab');check(await p.evaluate(()=>FurnishCabinet.widths(getF('hood-wall'))[1]===520),'width input');
 await p.evaluate(()=>selectIds(['hood-test']));await p.locator('#hood-center-bay').click();check(await p.evaluate(()=>getF('hood-test').cx===3000),'center');
 await p.locator('#hood-flush-bay').click();check(await p.evaluate(()=>FurnishCabinet.hoodBayFit(getF('hood-wall'),getF('hood-test')).fits),'flush');
 await p.evaluate(()=>{mutate(()=>{const f=getF('hood-wall');f.rot=37;f.flip=true;});});await p.locator('#hood-flush-bay').click();check(await p.evaluate(()=>FurnishCabinet.hoodBayFit(getF('hood-wall'),getF('hood-test')).fits),'rotated mirrored installation');
 await p.evaluate(()=>{mutate(()=>{const f=getF('hood-wall');f.rot=0;f.flip=false;});});await p.locator('#hood-flush-bay').click();
 const before=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'refresh');
 check(await p.evaluate(()=>{const payload={planId:PLAN.id,current:structuredClone(state),designs:[{id:'named',name:'烟机嵌合',work:structuredClone(state)}],catalog:[]},saved=FurnishProject.unpack(FurnishProject.pack(payload));return JSON.stringify(saved.current.furniture)===JSON.stringify(state.furniture)&&JSON.stringify(saved.designs[0].work.furniture)===JSON.stringify(state.furniture);}),'project and named roundtrip');
 await p.evaluate(()=>{selectIds(['hood-wall']);FurnishCabinetEditor.open('hood-wall');});await p.locator('#cab-preview canvas').waitFor();
 await p.locator('#cab-front').click();await p.waitForTimeout(350);await p.screenshot({path:out+'closed-front.png'});
 await p.locator('#cab-preview').screenshot({path:out+'paired-closed.png'});
 await p.locator('#cab-open-all').click();await p.waitForTimeout(350);await p.screenshot({path:out+'open-front.png'});
 await p.locator('#cab-front').click();await p.waitForTimeout(350);await p.locator('#cab-preview').screenshot({path:out+'paired-open.png'});
 await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();check(await p.evaluate(()=>getF('hood-wall').cabinet.columns[0].doorOpen&&getF('hood-wall').cabinet.columns[2].doorOpen),'save paired doors open');await p.evaluate(()=>undo());check(await p.evaluate(()=>!getF('hood-wall').cabinet.columns[0].doorOpen),'undo open');await p.evaluate(()=>redo());
 await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(()=>getF('hood-wall').cabinet.columns[0].doorOpen&&getF('hood-wall').cabinet.columns[2].doorOpen),'refresh open doors');await p.evaluate(()=>FurnishCabinetEditor.open('hood-wall'));await p.locator('#cab-preview canvas').waitFor();await p.locator('#cab-front').click();
 await p.locator('#cab-door-view').selectOption('hidden');await p.waitForTimeout(350);await p.screenshot({path:out+'interior-front.png'});
 await p.locator('#cab-front').click();await p.waitForTimeout(350);await p.screenshot({path:out+'interior-angle.png'});
 await p.getByRole('button',{name:'取消',exact:true}).click();await p.evaluate(()=>selectIds(['hood-wall']));await p.setViewportSize({width:390,height:844});await p.evaluate(()=>drawer('panel',true));await p.locator('#hood-bay-width').scrollIntoViewIfNeeded();await p.screenshot({path:out+'mobile.png'});check(await p.locator('#hood-bay-width').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'narrow panel');
 await p.locator('#hood-bay-remove').click();check(await p.evaluate(()=>!FurnishCabinet.hoodBay(getF('hood-wall'))),'remove cavity');await p.evaluate(()=>undo());check(await p.evaluate(()=>!!FurnishCabinet.hoodBay(getF('hood-wall'))),'undo removal');
 check(errors.length===0,'page errors '+errors.join('; '));await context.close();return {status:'PASS',errors};
}
