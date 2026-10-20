async (page,verification)=>{
 const choose=(page,kind,column)=>verification.selectCabinetObject(page,{kind,column});
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const check=(v,message)=>{if(!v)throw Error(message);};
 try{
  await p.goto(verification.baseURL.slice(0,-1));await p.locator('#lib').waitFor();
  await p.evaluate(()=>{const f=FurnishKitchen.configure({id:'elevation-test',type:'counter',cx:3000,cy:3000,rot:90,color:'#f3f1ec'},{version:1,shape:'L',corner:'right',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:800,role:'door'},{run:1,width:800,role:'drawer'},{run:0,width:450,role:'sink'},{run:1,width:300,role:'empty'}]});mutate(()=>state.furniture.push(f));FurnishCabinetEditor.open(f.id);});
  await p.locator('#cab-preview canvas').waitFor();
  check((await p.locator('.cab-size-summary').textContent()).includes('转角边总长 1700'),'L second extent is length, not depth');
  check(!await p.locator('.cab-dimension').filter({hasText:'总深 1700'}).count(),'old depth wording removed');
  await p.getByRole('button',{name:'两边正视展开',exact:true}).click();
  check(await p.locator('.cab-elevation').count()===2,'two elevation panels');
  check(await p.locator('.cab-elevation .cab-module-number').count()===4,'each original module numbered once');
  await choose(p,'bay');for(const [index,width] of [800,800,450,300].entries()){await choose(p,undefined,index);const label=p.locator('.cab-elevation .cab-dimension').filter({hasText:/^宽 /});check(await label.count()===1&&await label.textContent()==='宽 '+width,'selected module width '+index);check(await label.isVisible(),'selected module dimension visible '+index);}
  check((await p.locator('.cab-elevation').nth(0).textContent()).includes('主边总长 1850'),'main total includes blind corner');
  check((await p.locator('.cab-elevation').nth(1).textContent()).includes('转角边总长 1700'),'return total includes blind corner');
  const number=i=>p.locator('.cab-elevation .cab-module-number').filter({hasText:new RegExp('^'+i+'$')});
  await p.screenshot({animations:'disabled',path:'output/playwright/kitchen-elevations-desktop.png'});
  await number(4).click();check(JSON.parse(await p.locator('#cab-kitchen-object').inputValue()).column===3,'empty module selected through unfolded number');
  await number(2).click();await p.locator('[data-kitchen-row="1"] [data-k-width]').fill('810.25');await number(3).click();
  check((await p.locator('.cab-elevation').nth(1).textContent()).includes('1710.25'),'unblurred input reflected in return total');
  await p.locator('#cab-kitchen-dimensions').uncheck();check(await p.locator('.cab-elevation .cab-module-number').count()===4,'numbers retained without dimensions');await p.locator('#cab-kitchen-dimensions').check();
  await p.setViewportSize({width:390,height:844});
  await p.waitForFunction(count=>{const els=[...document.querySelectorAll('.cab-elevation-scroll')];return els.length===count&&els.every(e=>e.scrollWidth>e.clientWidth);},2);check(await p.locator('.cab-elevation-scroll').evaluateAll(els=>els.every(e=>e.scrollWidth>e.clientWidth)),'each mobile elevation scrolls horizontally');
  await p.locator('.cab-elevation-scroll').nth(1).evaluate(el=>el.scrollLeft=el.scrollWidth);await number(4).click();
  check(JSON.parse(await p.locator('#cab-kitchen-object').inputValue()).column===3,'offscreen module accessible by horizontal scroll');
  check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'dialog has no horizontal overflow');
  await p.screenshot({animations:'disabled',path:'output/playwright/kitchen-elevations-mobile.png'});
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  const width=()=>p.evaluate(()=>getF('elevation-test').kitchen.modules[1].width);
  check(await width()===810.25,'saved return width');await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await width()===800,'undo');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await width()===810.25,'redo');await p.reload();await p.locator('#lib').waitFor();check(await width()===810.25,'refresh');
  await p.setViewportSize({width:1500,height:1000});
  for(const corner of ['left','right'])for(const flip of [false,true]){
   await p.evaluate(({corner,flip})=>{const f=getF('elevation-test');mutate(()=>{f.kitchen.corner=corner;f.flip=flip;});FurnishCabinetEditor.open(f.id);},{corner,flip});await p.locator('#cab-preview canvas').waitFor();await p.locator('#cab-kitchen-front').click();
   const shown=await p.locator('.cab-elevation').evaluateAll(els=>els.map(el=>[...el.querySelectorAll('.cab-module-number')].map(e=>+e.textContent)));
   check(JSON.stringify(shown[0])===JSON.stringify(flip?[3,1]:[1,3]),'main facing order');
   check(JSON.stringify(shown[1])===JSON.stringify((corner==='left')!==flip?[4,2]:[2,4]),'return facing order');
   await p.screenshot({animations:'disabled',path:`output/playwright/kitchen-elevations-${corner}-${flip?'mirror':'normal'}.png`});
   await p.locator('#cab-kitchen-front').click();check(await p.locator('.cab-elevation').count()===0,'perspective clears both extra renderers');await p.getByRole('button',{name:'取消',exact:true}).click();
  }
  check(errors.length===0,errors.join('\n'));return {passed:'two elevations, all labels, real module indices, left/right/mirror order, blind/length/depth wording, mobile scrolling, precise draft/save/undo/redo/refresh and cleanup',errors};
 }finally{await context.close();}
}
