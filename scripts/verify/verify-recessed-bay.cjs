if(!process.env.FURNISH_VERIFY_ROOT){require('../verify-browser.cjs').main(['recessed-bay']).catch(e=>{console.error(e);process.exitCode=1;});}else{
'use strict';
// Optional real-browser acceptance check; uses the same local Playwright runtime as other verification scripts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const verification=require('../lib/browser-verification.cjs').configuration();
const P=require('../../src/core/project-core.js'),root=verification.root,output=path.join(root,'output/playwright');
fs.mkdirSync(output,{recursive:true});
const points=[[100,100],[200,100],[200,40],[400,40],[400,100],[500,100],[500,500],[100,500]];
const draft={version:1,id:'custom_recess_browser',name:'凹口飘窗验证',source:'dxf',image:'',scale:10,width:600,height:600,
 walls:points.map((a,i)=>({id:'w'+i,a,b:points[(i+1)%points.length],kind:'e',thickness:200})),
 openings:[{id:'win',wall:'w2',t:.5,length:1200,kind:'window',side:1,entry:false,sill:450,head:2400}]};
const fixture=path.join(output,'recessed-bay-fixture.furnish.json');
fs.writeFileSync(fixture,JSON.stringify(P.pack({planId:draft.id,current:{furniture:[],architecture:{draft,phase:'survey'}},designs:[],catalog:[]})));
(async()=>{const browser=await require('../lib/browser-verification.cjs').launch(),errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto((verification.fileBase+'index.html'));
  await page.locator('#planBtn').click();const chooser=page.waitForEvent('filechooser');await page.locator('#gallery-import').click();await(await chooser).setFiles(fixture);await page.getByRole('button',{name:'加载并编辑',exact:true}).click();
  const snapshot=()=>page.evaluate(()=>({draft:state.architecture.draft,rooms:PLAN.rooms,settings:state.rooms,walls:PLAN.walls,wins:PLAN.wins,net:FurnishProject.quantities(PLAN).net}));
  const before=await snapshot();await page.evaluate(()=>select({kind:'win',id:0}));
  await page.locator('#window-height').fill('1753');assert.equal(await page.locator('#window-head').inputValue(),'2203');
  await page.locator('#window-head').fill('2400');assert.equal(await page.locator('#window-height').inputValue(),'1950');
  await page.locator('#window-cancel').click();assert.deepEqual(await snapshot(),before);await page.locator('#window-to-bay').click();
  const converted=await snapshot();assert.equal(converted.wins.length,1);assert.deepEqual(converted.walls,before.walls);assert.equal(converted.draft.openings[0].bay.type,'recessed');assert.ok(Math.abs(before.net-converted.net-1.08)<1e-8);
  await page.locator('#undo').click();assert.deepEqual(await snapshot(),before);await page.locator('#redo').click();assert.deepEqual(await snapshot(),converted);await page.evaluate(()=>select({kind:'win',id:0}));
  await page.locator('#bay-window-height').fill('1753');assert.equal(await page.locator('#bay-head').inputValue(),'2203');
  await page.locator('#bay-height').fill('647');assert.equal(await page.locator('#bay-head').inputValue(),'2400');await page.screenshot({path:path.join(output,'window-height-linkage.png'),fullPage:true});
  await page.locator('#bay-head').fill('2500');assert.equal(await page.locator('#bay-window-height').inputValue(),'1853');
  await page.locator('#bay-window-height').fill('');assert.equal(await page.locator('#bay-head').inputValue(),'');await page.locator('#bay-apply').click();assert.deepEqual(await snapshot(),converted);
  await page.locator('#bay-cancel').click();assert.equal(await page.locator('#bay-window-height').inputValue(),'1950');
  await page.locator('#bay-depth').fill('500');await page.locator('#bay-cancel').click();assert.deepEqual(await snapshot(),converted);
  await page.locator('#bay-depth').fill('500');await page.locator('#bay-height').fill('600');await page.locator('#bay-apply').click();
  const changed=await snapshot();assert.equal(changed.rooms.find(r=>r.bayId).height,.6);assert.ok(Math.abs(before.net-changed.net-.9)<1e-8);
  await page.locator('#bay-remove').click();assert.deepEqual((await snapshot()).walls,before.walls);assert.equal((await snapshot()).rooms.some(r=>r.bayId),false);
  await page.locator('#tracePlan').click();await page.locator('[data-trace-mode="opening"]').click();await page.locator('#trace-canvas [data-o="win"]').first().click({force:true});
  await page.locator('#op-height').fill('1753');assert.equal(await page.locator('#op-head').inputValue(),'2353');
  await page.locator('#op-head').fill('2400');assert.equal(await page.locator('#op-height').inputValue(),'1800');
  await page.locator('#op-type').selectOption('recessed');await page.locator('#op-depth').fill('600');await page.locator('#op-apply').click();await page.locator('#trace-finish').click();
  const saved=await snapshot();assert.equal(saved.draft.openings[0].bay.type,'recessed');assert.equal(saved.wins.length,1);
  assert.deepEqual(saved.settings.bay_win,{name:'飘窗台',mat:'marble',use:'bay'});
  await page.screenshot({path:path.join(output,'recessed-bay-2d.png'),fullPage:true});
  await page.reload();await page.waitForFunction(()=>state.architecture?.draft.id==='custom_recess_browser');assert.deepEqual(await snapshot(),saved);
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d'));await page.waitForFunction(()=>!!View3D.image());
  await page.screenshot({path:path.join(output,'recessed-bay-3d.png'),fullPage:true});
  const builtin=await(await browser.newContext()).newPage();builtin.on('pageerror',e=>errors.push(e.message));await builtin.goto((verification.fileBase+'index.html'));await builtin.evaluate(()=>select({kind:'win',id:0}));
  await builtin.locator('#wSill').fill('647');await builtin.locator('#wHeight').fill('1753');assert.equal(await builtin.locator('#wHead').inputValue(),'2400');
  await builtin.locator('#wHead').fill('2500');assert.equal(await builtin.locator('#wHeight').inputValue(),'1853');await builtin.locator('#wApply').click();
  assert.equal(await builtin.evaluate(()=>WINS[0].head),2.5);
  assert.deepEqual(errors,[]);console.log('PASS browser bidirectional window heights, sill changes, empty input, conversion, cancel/apply, undo, restore, editor, save/reload and 3D without page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

}
