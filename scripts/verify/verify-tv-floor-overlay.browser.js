async(page,V)=>{
 const response=await page.request.get(V.baseURL+'tests/fixtures/browser/tv-floor-workspace.json');if(!response.ok())throw Error('Missing isolated TV workspace snapshot');
 const seed=(await response.json()).workspace,results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950},offline:mode==='file'}),p=await context.newPage(),errors=[],checks=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
  await context.addInitScript(seed=>{if(!localStorage.getItem('__tv_overlay_seeded')){localStorage.setItem('huxing-design-v26',JSON.stringify(seed));localStorage.setItem('__tv_overlay_seeded','1');}},seed);
  const check=(v,label)=>{if(!v)throw Error(label);checks.push(label);},id='fmv3yflqw1';
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   const initial=await p.evaluate(id=>structuredClone(getF(id)),id);
   check(initial?.w===2505&&initial.h===350&&initial.d===350,'actual current 1601 TV cabinet restored');
   check(initial.cabinet.doorOverlay==='full'&&initial.cabinet.columns.every(c=>c.finish==='solid'&&c.doorColor==='#f3f1ec'),'five explicit white overlay fronts in current data');
   await p.evaluate(id=>FurnishCabinetEditor.open(id),id);await p.locator('#cab-preview canvas:visible').first().waitFor();await p.locator('#cab-3d').click();
   const stage=await p.locator('#cab-preview').boundingBox();await p.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);await p.mouse.wheel(0,-1100);
   await p.screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-open.png'),animations:'disabled'});
   await p.locator('#cab-preview').screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-open-detail.png'),animations:'disabled'});
   await p.locator('#cab-close-all').click();await p.screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-closed.png'),animations:'disabled'});
   await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
   check(await p.evaluate(id=>getF(id).cabinet.columns.every(c=>!c.topOpen&&c.drawers.every(d=>!d.open)),id),'all five drawers close and save');
   await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).cabinet.columns[2].topOpen,id)===initial.cabinet.columns[2].topOpen,'undo restores central pullout state');
   await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();
   check(await p.evaluate(id=>getF(id).cabinet.doorOverlay==='full'&&getF(id).cabinet.columns.every(c=>c.doorColor==='#f3f1ec'&&c.finish==='solid'),id),'white finish and overlay survive cache refresh');
   await p.evaluate(id=>FurnishCabinetEditor.open(id),id);await p.locator('#cab-preview canvas:visible').first().waitFor();
   const geometry=await p.evaluate(async id=>{
    const THREE=await import('three'),f=getF(id),box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
    const model=FurnishCabinetModel.build(THREE,f,box),fronts=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front'){const b=new THREE.Box3().setFromObject(o);fronts.push({column:o.userData.cabinetPart.column,color:o.material.color.getHexString(),bottom:b.min.y,top:b.max.y,width:b.max.x-b.min.x});}});return fronts;
   },id);
   check(geometry.length===5&&geometry.every(f=>f.color==='f3f1ec'&&Math.abs(f.bottom-.001)<1e-6&&Math.abs(f.top-.331)<1e-6),'browser production geometry: five white fronts cover body edges and align under wood top');
   await p.setViewportSize({width:390,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px viewport has no page overflow');
   await p.screenshot({path:V.output('playwright/tv-floor-overlay/'+mode+'-mobile.png'),animations:'disabled'});
   check(!errors.length,'no browser exceptions');results.push({mode,passed:true,checks,geometry});
  }finally{await context.close();}
 }
 return results;
}
