async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
  await p.evaluate(()=>mutate(()=>state.furniture=state.furniture.filter(f=>f.type!=='baycushion')));
  const bay=await p.evaluate(()=>{const b=FurnishBayWindows.list(PLAN)[0];return {id:b.id,room:b.platform.id,index:b.windows[0].index};});
  // Actual 2D platform click opens the same assembly as a window click.
  await p.locator(`#gRooms [data-room="${bay.room}"]`).first().click({force:true});
  check(await p.locator('[data-bay-surface]').count()===1,'platform opens bay surface panel');
  check(await p.locator('#panel').innerText().then(t=>!t.includes('房间用途')&&!t.includes('房间内家具')),'no generic room controls');
  check(await p.locator('[data-bay-selection="whole"]').count()===1,'whole assembly selection');
  await p.locator('[data-bay-part="window"]').click();check(await p.evaluate(i=>ui.sel.kind==='win'&&ui.sel.id===i,bay.index),'window part switch');
  await p.locator('#bay-height').fill('600');check(await p.locator('#bay-head').inputValue()==='2550','height linkage preserves window height');await p.locator('#bay-apply').click();
  check(await p.evaluate(()=>FurnishBayWindows.list(FurnishProject.effectivePlan(PLAN,state))[0].platform.height===.6),'platform height applied');
  await p.locator('#undo').click();check(await p.locator('#bay-height').inputValue()==='450','undo height');await p.locator('#redo').click();check(await p.locator('#bay-height').inputValue()==='600','redo height');
  await p.locator('#bay-name').fill('整体飘窗验收');await p.locator('#bay-material').selectOption('wood');await p.locator('#bay-surface-apply').click();
  await V.waitForCache(p);await p.reload();await p.evaluate(id=>select({kind:'room',id}),bay.room);check(await p.locator('#bay-name').inputValue()==='整体飘窗验收'&&await p.locator('#bay-height').inputValue()==='600','refresh keeps height/name/material');
  // Import an actual legacy grouped plan, including a named design and locked baseline.
  await p.evaluate(()=>{const source=FurnishProject.effectivePlan(PLAN,state),{draft}=FurnishDraft.fromPlan(source,'custom_bay_browser');for(const o of draft.openings)if(o.bayId){o.bayGroup=o.bayId;delete o.bayId;draft.walls.find(w=>w.id===o.wall).kind='e';}for(const r of draft.roomLayout.rooms)delete r.bayId;const work={furniture:[],architecture:{draft,phase:'design',baseline:structuredClone(draft),originalRevisions:[structuredClone(draft)]},rooms:structuredClone(state.rooms)};FurnishWorkspace.restore({planId:draft.id,current:work,designs:[{name:'旧飘窗方案',planId:draft.id,work:structuredClone(work)}],catalog:[]});select({kind:'room',id:'bay1'});});
  check(await p.locator('[data-bay-assembly]').count()===1,'legacy platform linked');check(await p.locator('#bay-apply').isDisabled(),'locked original protected');
  check(await p.evaluate(()=>!JSON.stringify(state.architecture).includes('bayGroup')&&!JSON.stringify(store.designs.filter(d=>d.planId===PLAN.id)).includes('bayGroup')),'current/design/baseline/revision upgraded');
  check(await p.evaluate(()=>FurnishProject.pack({planId:PLAN.id,current:state,designs:[],catalog:[]}).version===16),'new format gate');
  await p.locator('#bay-name').fill('升级后的台面');await p.locator('#bay-surface-apply').click();check(await p.locator('#bay-name').inputValue()==='升级后的台面','structure lock permits surface editing');
  await p.evaluate(()=>{mutate(()=>{state.architecture.phase='survey';delete state.architecture.baseline;});select({kind:'room',id:'bay1'});});
  await p.locator('#bay-height').fill('650');await p.locator('#bay-apply').click();
  await V.waitForCache(p);await p.reload();await p.evaluate(()=>select({kind:'room',id:'bay1'}));check(await p.locator('#bay-height').inputValue()==='650','upgraded plan refresh');
  // A preset copy has the same height in its assembly panel and floorplan editor.
  const ref=await p.evaluate(()=>FurnishBayWindows.list(PLAN)[0].windows.map(v=>PLAN.winRefs[v.index])[0]);
  await p.locator('#tracePlan').click();await p.locator('[data-trace-mode="opening"]').click();await p.locator('#trace-canvas [data-o="'+ref+'"]').click({force:true});check(await p.locator('#op-sill').inputValue()==='650','copy editor reads the current shared height');
  await p.locator('#op-sill').fill('675');await p.locator('#op-apply').click();await p.locator('#trace-finish').click();await p.evaluate(()=>select({kind:'room',id:'bay1'}));check(await p.locator('#bay-height').inputValue()==='675','editor updates the complete assembly');check(await p.evaluate(()=>FurnishBayWindows.list(FurnishProject.effectivePlan(PLAN,state))[0].windows.every(v=>v.window.sill===.675)),'all copied faces share the edited sill');
  // Trace production meshes and a real 3D window ray click.
  await p.evaluate(async()=>{const T=await import('three'),add=T.Object3D.prototype.add,projection=T.PerspectiveCamera.prototype.updateProjectionMatrix;window.__bayThree=T;T.PerspectiveCamera.prototype.updateProjectionMatrix=function(...a){window.__bayCamera=this;return projection.apply(this,a);};T.Object3D.prototype.add=function(...items){for(const o of items){if(o.userData.bayWindowIndex!==undefined)(window.__bayMeshes??=[]).push(o);if(o.userData.layerSelection)window.__bayOutline=o;}return add.apply(this,items);};});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.evaluate(()=>View3D.focusSelection());await p.waitForTimeout(1200);
  check(await p.evaluate(()=>__bayOutline.box.max.y-__bayOutline.box.min.y>1.5),'3D outline covers platform and windows');
  await p.screenshot({path:V.output('playwright/bay-assemblies/'+mode+'-3d.png')});
  const points=await p.evaluate(()=>{const r=document.querySelector('#view3d canvas').getBoundingClientRect();return __bayMeshes.filter(m=>m.userData.bayWindowIndex!==undefined&&WINS[m.userData.bayWindowIndex]?.bayId==='bay1').map(m=>{const at=new __bayThree.Box3().setFromObject(m).getCenter(new __bayThree.Vector3()).project(__bayCamera);return {x:r.x+(at.x+1)*r.width/2,y:r.y+(1-at.y)*r.height/2};});});
  let picked=false;for(const at of points){await p.mouse.click(at.x,at.y);picked=await p.evaluate(()=>ui.sel?.kind==='win'&&WINS[ui.sel.id].bayId==='bay1');if(picked)break;}check(picked,'3D glass/frame click opens assembly');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{select({kind:'room',id:'bay1'});drawer('panel',true);});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow layout');await p.screenshot({path:V.output('playwright/bay-assemblies/'+mode+'-mobile.png')});
  // A recessed bay uses the same panel and edits its authoritative opening.
  await p.evaluate(()=>{const points=[[100,100],[200,100],[200,40],[400,40],[400,100],[500,100],[500,500],[100,500]],draft={version:1,id:'custom_bay_recess',name:'正面窗飘窗',source:'dxf',image:'',scale:10,width:600,height:600,walls:points.map((a,i)=>({id:'w'+i,a,b:points[(i+1)%points.length],kind:'e',thickness:200})),openings:[{id:'win',wall:'w2',t:.5,length:1200,kind:'window',side:1,entry:false,bay:{type:'recessed',depth:600,height:450,head:2400}}]};FurnishWorkspace.restore({planId:draft.id,current:{furniture:[],architecture:{draft,phase:'survey'}},designs:[],catalog:[]});select({kind:'room',id:'bay_win'});drawer('panel',true);});
  check(await p.locator('#bay-depth').inputValue()==='600','recessed platform opens geometry editor');await p.locator('#bay-height').fill('550');await p.locator('#bay-apply').click();check(await p.evaluate(()=>state.architecture.draft.openings[0].bay.height===550),'recessed authoritative edit');
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await ctx.close();
 }
 return results;
}
