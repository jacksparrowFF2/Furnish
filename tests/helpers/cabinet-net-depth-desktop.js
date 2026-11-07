module.exports=async(p,V)=>{
 const checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));const ok=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
 await p.evaluate(()=>mutate(()=>{const f={...FurnishCabinet.preset('storage'),id:'depth-cab',type:'cabinet',cx:5000,cy:4500,rot:0,d:350};f.cabinet.columns.forEach(c=>{c.drawers=[];c.shelves=[500,1000];});state.furniture=[f];}));
 const open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('depth-cab'));await p.locator('#cab-preview canvas:visible').first().waitFor();};
 const save=async()=>{await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();await p.locator('#cab-preview').waitFor({state:'detached'});};
 const fill=async value=>{await p.locator('#cab-back-thickness').fill(String(value));await p.locator('#cab-back-thickness').press('Tab');};
 const original=await p.evaluate(()=>JSON.stringify(getF('depth-cab')));
 await open();ok((await p.locator('#cab-depth-info').textContent()).includes('净深 314 mm'),'legacy missing back shows 18mm and 314mm clearance');
 await fill(6);ok((await p.locator('#cab-depth-info').textContent()).includes('净深 326 mm'),'6mm back changes displayed clearance');await p.locator('#cab-depth-info').scrollIntoViewIfNeeded();ok(await p.locator('.cab-depth-chain').first().isVisible(),'depth chain visible without help');await V.screenshot?.('wide');await save();
 ok(await p.evaluate(()=>getF('depth-cab').cabinet.backThickness===6&&getF('depth-cab').cabinet.thickness===18),'independent back saves without changing side thickness');
 await p.evaluate(()=>undo());ok(await p.evaluate(()=>JSON.stringify(getF('depth-cab')))===original,'one undo restores exact legacy data');await p.evaluate(()=>redo());
 await open();await fill(0);await save();await p.evaluate(()=>repositoryClient.flush());await p.reload();await p.waitForFunction(()=>typeof FurnishMcp!=='undefined'&&!repositoryBooting);
 await open();ok(await p.locator('#cab-back-thickness').inputValue()==='0','zero saved through reload');ok((await p.locator('#cab-depth-info').textContent()).includes('净深 332 mm'),'zero back gives 332mm closed clearance');
 const stable=await p.evaluate(()=>JSON.stringify(getF('depth-cab')));await fill(-1);await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();ok((await p.locator('#cab-error').textContent()).includes('背板'),'negative back thickness blocks save');ok(await p.evaluate(()=>JSON.stringify(getF('depth-cab')))===stable,'invalid input leaves saved record unchanged');
 await fill(6);await p.locator('[data-cab-number="thickness"]').evaluate(el=>{for(let n=el.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;});await p.locator('[data-cab-number="thickness"]').fill('25');await p.locator('[data-cab-number="thickness"]').press('Tab');await save();
 ok(await p.evaluate(()=>getF('depth-cab').cabinet.backThickness===6&&getF('depth-cab').cabinet.thickness===25),'side thickness edit preserves 6mm back');await p.evaluate(()=>repositoryClient.flush());await p.reload();await p.waitForFunction(()=>typeof FurnishMcp!=='undefined'&&!repositoryBooting);
 await p.setViewportSize({width:390,height:844});await open();ok((await p.locator('#cab-depth-info').textContent()).includes('净深 319 mm'),'narrow reload displays independent 6mm back and 25mm front');await p.locator('#cab-depth-info').scrollIntoViewIfNeeded();ok(await p.locator('#cab-back-thickness').isVisible(),'narrow numeric control is reachable');await V.screenshot?.('narrow');
 await fill(9);await p.getByRole('button',{name:'取消',exact:true}).click();ok(await p.evaluate(()=>getF('depth-cab').cabinet.backThickness===6),'cancel discards back-thickness draft');ok(errors.length===0,'no production preview page errors');return {passed:true,checks};
};
