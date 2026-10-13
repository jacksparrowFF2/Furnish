async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1500,height:950}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const check=(ok,message)=>{if(!ok)throw Error(message);};
 try{
  await p.goto('http://127.0.0.1:8765');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{
   const f={id:'drawer-acceptance',type:'wardrobe',cx:2000,cy:2000,rot:0,...FurnishCabinet.preset('wardrobe')};
   f.cabinet.columns[0].drawers[0].lanes=[{open:false,extension:1},{open:true,extension:.4}];
   mutate(()=>state.furniture.push(f));selectIds([f.id]);FurnishCabinetEditor.open(f.id);
  });
  await p.locator('#cab-preview canvas').waitFor();await p.getByRole('tab',{name:'分区结构',exact:true}).click();
  await p.locator('[data-cab-column="0"] [data-merge-drawers]').click();
  check(await p.locator('[data-cab-column="0"] [data-drawer-columns]').inputValue()==='1','merge button selects one column');
  check(await p.locator('#cab-error').textContent()==='','merge accepted with independent opening state');
  check(await p.locator('[data-cab-column="0"] [data-toggle-drawer="0"]').count()===1,'one opening control per tier');
  await p.locator('#cab-front').click();await p.screenshot({path:'output/playwright/full-width-drawers.png'});
  await p.setViewportSize({width:390,height:844});
  check(await p.locator('[data-cab-column="0"] [data-drawer-columns]').isVisible(),'mobile drawer setting visible');
  await p.screenshot({path:'output/playwright/full-width-drawers-mobile.png'});
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  const count=()=>p.evaluate(()=>FurnishCabinet.drawerCount(getF('drawer-acceptance').cabinet.columns[0]));
  check(await count()===1,'saved drawer count');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await count()===2,'undo merge');
  await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await count()===1,'redo merge');
  await p.reload();await p.locator('#lib').waitFor();check(await count()===1,'refresh restores full width');
  await p.evaluate(()=>FurnishCabinetEditor.open('drawer-acceptance'));await p.getByRole('tab',{name:'分区结构',exact:true}).click();
  await p.locator('[data-cab-column="0"] [data-drawer-columns]').fill('2');await p.locator('[data-cab-column="0"] [data-drawer-columns]').press('Tab');
  check(await p.locator('#cab-error').textContent()==='','splitting normalizes lane states');
  await p.getByRole('button',{name:'取消',exact:true}).click();check(await count()===1,'cancel keeps saved merge');
  check(errors.length===0,errors.join('\n'));return {passed:'merge, independent motion, mobile, save, undo/redo, refresh, split and cancel',errors};
 }finally{await context.close();}
}
