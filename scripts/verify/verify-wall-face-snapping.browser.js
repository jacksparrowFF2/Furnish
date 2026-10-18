async (page,verification)=>{
 const results=[],check=(ok,message)=>{if(!ok)throw Error(message);},near=(a,b,t=.00001)=>Math.abs(a-b)<t;
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>{
    const d={version:1,id:'custom_wall_face_check',name:'墙端贴面验收',source:'dxf',image:'',width:2000,height:2000,scale:1,openings:[],walls:[
     {id:'north',a:[100,100],b:[1900,100],kind:'n',thickness:100,caps:[0,0]},
     {id:'east',a:[1900,100],b:[1900,1900],kind:'n',thickness:100,caps:[0,0]},
     {id:'south',a:[1900,1900],b:[100,1900],kind:'n',thickness:100,caps:[0,0]},
     {id:'west',a:[100,1900],b:[100,100],kind:'n',thickness:100,caps:[0,0]},
     {id:'short',a:[800,1710],b:[800,1760],kind:'n',thickness:130}
    ]};const plan=FurnishDraft.build(d);store.customPlans.push(d);PLANS.push(plan);store.work[d.id]=freshWork(plan);store.work[d.id].architecture={draft:d,phase:'survey'};setPlan(d.id);
   });
   const install=()=>p.evaluate(()=>{
    const surface=FurnishFloorFinishModel.surface,entries=[];window.__faceScene={entries};
    FurnishFloorFinishModel.surface=(T,room,area,options)=>{const mesh=surface(T,room,area,options);entries.push({T,mesh,options});return mesh;};
    __faceScene.read=()=>{
     const attached=entries.filter(e=>e.mesh.parent?.parent?.isScene&&!e.mesh.userData.doorway),last=attached.at(-1);if(!last)throw Error('production floor missing');
     const {T,options}=last,group=last.mesh.parent,scene=group.parent;scene.updateMatrixWorld(true);const floors=attached.filter(e=>e.mesh.parent===group).map(e=>e.mesh),areas={};
     for(const mesh of floors){const g=mesh.geometry,a=g.attributes.position,index=g.index;let sum=0;for(let i=0;i<(index?.count??a.count);i+=3)sum+=new T.Triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,index?index.getX(i+k):i+k))).getArea();areas[mesh.userData.room]=(areas[mesh.userData.room]||0)+sum;}
     const plan=FurnishProject.effectivePlan(PLAN,state),boxes=[];scene.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&Array.isArray(o.material)&&o.material.length===6)boxes.push(new T.Box3().setFromObject(o));});
     const d=state.architecture.draft,walls=d.walls.slice(4).map(w=>{const r=FurnishDraft.wallRect(w,d.scale,d.walls),box=boxes.find(b=>Math.max(Math.abs(b.min.x-options.wx(r[0])),Math.abs(b.min.z-options.wz(r[1])),Math.abs(b.max.x-options.wx(r[2])),Math.abs(b.max.z-options.wz(r[3])))<.00001),ray=(x,y)=>new T.Raycaster(new T.Vector3(options.wx(x),10,options.wz(y)),new T.Vector3(0,-1,0)).intersectObjects(floors,false).length;return {id:w.id,a:w.a,b:w.b,length:Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1]),rect:r.slice(0,4),meshMatches:!!box,floorUnderEnd:ray((r[0]+r[2])/2,r[3]-1),floorBeside:ray(r[2]+20,r[3]-1)};});
     return {net:FurnishProject.quantities(plan).net,meshNet:Object.values(areas).reduce((a,b)=>a+b,0),walls,rooms:FurnishWallFinish.spatial(plan).rooms.map(r=>({area:FurnishProject.area(r.poly),meshArea:areas[r.id],label:document.querySelector('[data-room-label="'+r.id+'"]')?.textContent.trim(),formatted:fmt(FurnishProject.area(r.poly))}))};
    };
   });
   const enter=async()=>{if(!await p.evaluate(()=>is3D()))await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#showMenu > summary').click();await p.locator('[data-cut="1.2"]').click();await p.locator('#showMenu > summary').click();};
   const read=async phase=>{const v=await p.evaluate(()=>__faceScene.read());check(near(v.net,v.meshNet),phase+' net / production floor');for(const r of v.rooms)check(near(r.area,r.meshArea)&&r.label?.includes(r.formatted),phase+' room mesh and area label');for(const w of v.walls)check(w.meshMatches&&!w.floorUnderEnd&&w.floorBeside>0,phase+' actual wall and floor contact');return {phase,...v};};
   await install();await enter();const before=await read('before');check(near(before.net,2.8666),'independent baseline area');
   const point=(x,y)=>p.locator('#trace-canvas').evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const at=pt.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y};},[x,y]),click=async(x,y)=>{const at=await point(x,y);await p.mouse.click(at.x,at.y);};
   await p.locator('#tracePlan').click();await p.locator('[data-trace-mode="properties"]').click();await click(800,1735);
   const drag=async({shift=false,cancel=false}={})=>{const a=await point(800,1760),b=await point(800,1850);await p.mouse.move(a.x,a.y);await p.mouse.down();if(shift)await p.keyboard.down('Shift');await p.mouse.move(b.x,b.y,{steps:6});await p.waitForTimeout(80);if(shift)check(await p.locator('[data-wall-snap]').count()===0,'Shift disables face feedback');else check(await p.locator('[data-wall-snap="face"]').count()===1,'wall face feedback');if(cancel)await p.keyboard.press('Escape');await p.mouse.up();if(shift)await p.keyboard.up('Shift');};
   await drag({cancel:true});check(Number(await p.locator('#wp-length').inputValue())===50,'Escape cancels face resize');
   await drag({shift:true});check(!near(Number(await p.locator('#wp-length').inputValue()),75,.01),'Shift bypasses face contact');await p.locator('#trace-undo').click();await click(800,1735);
   await drag();check(Number(await p.locator('#wp-length').inputValue())===75,'physical cap contact keeps first endpoint fixed');await p.locator('#trace-undo').click();await click(800,1735);check(Number(await p.locator('#wp-length').inputValue())===50,'undo face resize');await p.locator('#trace-redo').click();await click(800,1735);check(Number(await p.locator('#wp-length').inputValue())===75,'redo face resize');
   // A 45 mm provisional centreline grows to an exactly 50 mm wall when its physical cap touches.
   await p.locator('[data-trace-mode="wall"]').click();await p.locator('#trace-thickness').fill('130');await p.keyboard.down('Shift');await click(1200,1735);await p.keyboard.up('Shift');const zoom=await point(1200,1780);await p.mouse.move(zoom.x,zoom.y);await p.mouse.wheel(0,-650);await p.waitForTimeout(100);const tip=await point(1200,1780);await p.mouse.move(tip.x,tip.y);await p.waitForTimeout(80);check(await p.locator('[data-wall-snap="face"]').count()===1,'draw-to-surface feedback');const surface=await point(1200,1850);await p.mouse.move(surface.x,surface.y);await p.waitForTimeout(80);check(await p.locator('[data-wall-snap="face"]').count()===1,'pointer directly on face after zoom');await p.screenshot({path:verification.output('playwright/wall-face-snapping/'+mode+'-snap.png')});await click(1200,1850);await p.keyboard.press('Escape');
   await p.locator('#trace-finish').click();await p.locator('.trace-overlay').waitFor({state:'hidden'});const after=await read('saved-active-3d');check(after.walls.length===2,'both walls committed');check(after.walls.every(w=>near(w.rect[3],1850)),'both physical ends flush against south wall');check(near(after.walls[0].length,75)&&near(after.walls[1].length,50),'resized and drawn lengths');check(near(after.net,2.83995),'independent footprint area after contact');
   await p.evaluate(()=>View3D.flyToRoom(ROOMS[0].id));await p.waitForTimeout(1100);await p.screenshot({path:verification.output('playwright/wall-face-snapping/'+mode+'-3d.png')});
   await p.locator('#undo').click();const undone=await read('undo');check(near(undone.net,before.net),'main undo area');await p.locator('#redo').click();const redone=await read('redo');check(near(redone.net,after.net),'main redo area');
   await verification.waitForCache(p);await p.reload();await install();await enter();const refreshed=await read('refresh');check(near(refreshed.net,after.net)&&refreshed.walls.every(w=>near(w.rect[3],1850)),'refresh contact');
   await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloading=p.waitForEvent('download');await p.locator('#pr-export').click();const file=verification.output('playwright/wall-face-snapping/'+mode+'.furnish.json');await(await downloading).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});await enter();const roundtrip=await read('project-roundtrip');check(near(roundtrip.net,after.net)&&roundtrip.walls.every(w=>near(w.rect[3],1850)),'roundtrip physical contact');
   check(!errors.length,errors.join('\n'));results.push({mode,passed:true,drawAndResize:true,shiftEscapeUndoRedo:true,before,after,undone,redone,refreshed,roundtrip,pageErrors:errors});
  }finally{await context.close();}
 }
 return results;
}
