async (page,V)=>{
 const verify=async function verify(p,screenshot){
 const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 const checks=[],check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
 await p.waitForFunction(()=>typeof state!=='undefined'&&typeof mutate==='function'&&(typeof repositoryBooting==='undefined'||!repositoryBooting));
 await p.evaluate(()=>mutate(()=>{state.furniture=[{id:'keyboard-cab',type:'cabinet',cx:4000,cy:4000,rot:0,...FurnishCabinet.preset('sideboard-open')}];}));
 const read=()=>p.evaluate(()=>structuredClone(getF('keyboard-cab'))),original=await read();
 const open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('keyboard-cab',{selection:{kind:'shelf',column:0,shelf:0}}));await p.locator('#cab-preview canvas').first().waitFor();};
 const lower=p.locator('#cab-tools [data-shelf-clearance=lower]'),upper=p.locator('#cab-tools [data-shelf-clearance=upper]');
 const press=key=>p.keyboard.press(key),blur=()=>p.evaluate(()=>document.activeElement.blur());
 await open();await blur();const start=Number(await lower.inputValue());
 await press('ArrowUp');check(Number(await lower.inputValue())===start+1,'up moves selected shelf 1 mm');
 await press('Shift+ArrowDown');check(Number(await lower.inputValue())===start-9,'shift down moves 10 mm');
 await press('Control+z');check(Number(await lower.inputValue())===start+1,'keyboard undo restores draft');
 await press('Control+y');check(Number(await lower.inputValue())===start-9,'keyboard redo restores movement');
 await lower.focus();await press('Control+a');await press('Control+c');check(Number(await lower.inputValue())===start-9,'input copy does not duplicate shelf');
 await press('Delete');check(await lower.inputValue()==='','Delete edits input text');await lower.fill(String(start-9));await lower.press('Enter');await blur();
 const count=()=>p.locator('[data-cab-pick]').evaluateAll(nodes=>nodes.filter(n=>{const x=JSON.parse(n.dataset.cabPick);return x.column===0&&x.kind==='shelf';}).length),n=await count();
 await press('Control+c');check(await count()===n+1,'Ctrl+C directly duplicates selected shelf');
 await press('Delete');check(await count()===n,'Delete removes copied shelf');
 await press('Control+z');check(await count()===n+1,'undo restores deleted copy');
 await press('Control+z');check(await count()===n,'undo removes duplication');
 await blur();await press('ArrowUp');check(Number(await lower.inputValue())===start-8,'keyboard keeps selected original after undo');
 await screenshot?.();await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
 const saved=await read();check(saved.cabinet.columns[0].shelves[0]===original.cabinet.columns[0].shelves[0]-8,'save applies keyboard draft');
 await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(original),'application undo restores entire design');await p.evaluate(()=>redo());
 if(await p.evaluate(()=>!!window.FurnishRepository))await p.evaluate(()=>FurnishRepository.flush());
 await p.reload();await p.waitForFunction(()=>typeof state!=='undefined'&&state.furniture.some(f=>f.id==='keyboard-cab')&&(typeof repositoryBooting==='undefined'||!repositoryBooting));check(stable(await read())===stable(saved),'saved keyboard edits survive reload');
 await open();await blur();await press('Delete');await p.getByRole('button',{name:'取消',exact:true}).click();check(stable(await read())===stable(saved),'cancel preserves saved furniture');
 await p.evaluate(()=>FurnishCabinetEditor.open('keyboard-cab',{selection:{kind:'bay',column:0,divider:0}}));await blur();
 const width=()=>p.locator('[data-cab-column="0"] [data-bay-width]').inputValue(),w=Number(await width());await press('ArrowRight');check(Number(await width())===w+1,'right moves divider 1 mm');await press('Shift+ArrowLeft');check(Number(await width())===w-9,'shift left moves divider 10 mm');await press('Control+z');check(Number(await width())===w+1,'undo restores divider');
 await p.setViewportSize({width:390,height:844});check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'narrow workspace fits viewport');await screenshot?.();await p.getByRole('button',{name:'取消',exact:true}).click();
 return checks;
},results=[];
 if(V.desktop)return {passed:true,checks:await verify(page,V.screenshot)};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage();
  try{await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();results.push({mode,checks:await verify(p,()=>p.screenshot({path:V.output('playwright/cabinet-keyboard/'+mode+'.png')})),passed:true});}finally{await ctx.close();}
 }
 return {passed:true,results};
}
