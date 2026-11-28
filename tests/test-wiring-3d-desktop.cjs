'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const net=require('node:net');
const {_electron,chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const Artifacts=require('../scripts/lib/test-artifacts.cjs');
const {runtimeFiles}=require('../scripts/package-desktop.cjs');
const {desktopExecutable}=require('../scripts/launch-desktop.cjs');

const root=path.resolve(__dirname,'..');
const source=process.env.FURNISH_TEST_PROJECT||path.join(root,'projects/workspace.furnish.json');
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');

async function main(){
 const before=hash(),job=Artifacts.createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'wiring-3d-'});
 let app,browser,passed=false;
 try{
  const work=job.workspace('workspace',root,{directories:['src','styles','vendor'],files:['index.html','manifest.webmanifest']});
  job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
  for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));
  job.discard('profile');
  const server=net.createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  const env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:path.join(job.dir,'profile'),FURNISH_PORT:String(port)};
  delete env.ELECTRON_RUN_AS_NODE;
  app=await _electron.launch({executablePath:desktopExecutable(root),env,timeout:60000});
  const page=await app.firstWindow();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForURL(`http://127.0.0.1:${port}/`);
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1500,1000));
  await page.evaluate(async()=>{
   FurnishElectricalUI.setMode('furniture');
   drawer('panel',true);
   const panel={id:'test-net-panel',name:'网络面板',type:'panel_bull_g12',color:'#fff',panelVariant:'phone-net6',w:86,d:10,h:86,cx:5500,cy:5284,rot:0,mountHeight:500};
   const box={id:'test-net-box',name:'弱电箱',type:'electrical_box_weak',color:'#fff',w:300,d:120,h:400,cx:863,cy:3600,rot:-90,mountHeight:300};
   mutate(()=>{
    state.furniture.push(panel,box);
    state.wireRoutes=[
     {id:'test-network',kind:'network',name:'入户网线',points:[
      {x:box.cx,y:box.cy,z:500,furnitureId:box.id},{x:box.cx+400,y:box.cy,z:2200},
      {x:panel.cx,y:box.cy,z:2200},{x:panel.cx,y:panel.cy,z:2200},{x:panel.cx,y:panel.cy,z:543,furnitureId:panel.id}
     ]},
     {id:'test-power',kind:'power',name:'客厅电线',points:[{x:3500,y:3900,z:300},{x:5000,y:3900,z:300}]}
    ];
   });
   // Observe the actual scene submitted to Three.js without a production test API.
   const THREE=await import('three'),update=THREE.Scene.prototype.updateMatrixWorld;
   THREE.Scene.prototype.updateMatrixWorld=function(...args){
    const group=this.getObjectByName('Electrical planning');
    if(group)window.testElectricalGroup=group;
    return update.apply(this,args);
   };
   window.testThree=THREE;
  });
  const toView=async view=>{
   await page.locator(`#viewSeg [data-view="${view}"]`).click();
   await page.waitForFunction(view=>viewMode===view&&!switching,view);
  };
  await toView('3d');
  const original=await page.evaluate(()=>({work:snap(),undo:undoStack.length}));
  await page.locator('[data-plan-mode="electrical"]').click();
  await page.locator('#electrical-wiring').click();
  await page.waitForFunction(()=>testElectricalGroup?.children.filter(o=>o.isInstancedMesh).length===2);
  const assertRendered=()=>page.evaluate(()=>{
   const {Vector3,Matrix4}=testThree;
   const ox=Math.round((Math.min(...WALLS.map(w=>w[0]))+Math.max(...WALLS.map(w=>w[2])))/100)*50;
   const oy=Math.round((Math.min(...WALLS.map(w=>w[1]))+Math.max(...WALLS.map(w=>w[3])))/100)*50;
   const path=FurnishElectrical.routeGeometry(state.wireRoutes[0],canvasEffectivePlan(),state.furniture).path;
   const line=testElectricalGroup.children.find(o=>o.isInstancedMesh);
   if(path.length<=state.wireRoutes[0].points.length||line.count!==path.length-1)return false;
   return path.slice(1).every((b,i)=>{
    const a=path[i],matrix=new Matrix4();
    line.getMatrixAt(i,matrix);
    const center=new Vector3().setFromMatrixPosition(matrix);
    const axis=new Vector3(0,1,0).transformDirection(matrix);
    const target=new Vector3(b.x-a.x,b.z-a.z,b.y-a.y).normalize();
    return center.distanceTo(new Vector3(((a.x+b.x)/2-ox)/1000,(a.z+b.z)/2000,((a.y+b.y)/2-oy)/1000))<1e-6&&axis.dot(target)>.99999;
   });
  });
  assert(await assertRendered(),'rendered network segments follow the shared chamfered 3D path');
  assert(await page.locator('.electrical-scene-marker').filter({hasText:'弱'}).count());
  assert.equal(await page.evaluate(()=>View3D.progressiveState()?.editing),true);
  const network=page.locator('[data-wire-inspect="test-network"]');
  await network.click();
  await page.waitForFunction(()=>testElectricalGroup.children.filter(o=>o.isInstancedMesh).length===1);
  assert.equal(await network.getAttribute('aria-pressed'),'true');
  await network.click();
  await page.waitForFunction(()=>testElectricalGroup.children.filter(o=>o.isInstancedMesh).length===2);
  await page.screenshot({path:path.join(job.dir,'wiring-3d.png')});
  assert.deepEqual(await page.evaluate(()=>({work:snap(),undo:undoStack.length})),original);
  await page.locator('#wiring-edit-2d').click();
  await page.waitForFunction(()=>!is3D()&&!switching);
  await page.locator('[data-wire-edit="test-network"]').click();
  await page.locator('[data-wire-index="1"][data-wire-axis="z"]').fill('2000');
  await toView('3d');
  assert(await page.evaluate(()=>FurnishWiringUI.sceneOverlay().paths.some(p=>p.editing)));
  assert.equal(await page.evaluate(()=>snap()),original.work);
  await page.locator('#wiring-edit-2d').click();
  await page.waitForFunction(()=>!is3D()&&!switching);
  assert.equal(await page.locator('[data-wire-index="1"][data-wire-axis="z"]').inputValue(),'2000');
  await page.locator('#wiring-form button[type="submit"]').click();
  await toView('3d');
  assert(await assertRendered(),'saved draft updates the real scene');
  await page.evaluate(()=>undo());
  assert(await assertRendered());
  assert.equal(await page.evaluate(()=>state.wireRoutes[0].points[1].z),2200);
  await page.evaluate(()=>redo());
  assert(await assertRendered());
  assert.equal(await page.evaluate(()=>state.wireRoutes[0].points[1].z),2000);
  await page.locator('#wiring-edit-2d').click();
  await page.waitForFunction(()=>!is3D()&&!switching);
  await page.locator('[data-wire-edit="test-network"]').click();
  await page.locator('[data-wire-index="1"][data-wire-axis="z"]').fill('60');
  await page.locator('[data-wire-riser="0"]').click();
  assert.equal(await page.locator('[data-wire-index="2"][data-wire-axis="z"]').inputValue(),'60');
  assert.equal(await page.locator('#wiring-diameter').inputValue(),'');
  await page.locator('#wiring-diameter').selectOption('25');
  await page.locator('#wiring-form button[type="submit"]').click();
  await toView('3d');
  assert(await assertRendered(),'the wall riser is included in the actual rendered segments');
  assert(await page.evaluate(()=>{
   const route=state.wireRoutes[0];
   const {path:[box,foot,run],length}=FurnishElectrical.routeGeometry(route,canvasEffectivePlan(),state.furniture);
   return length>0&&box.x===foot.x&&box.y===foot.y&&box.z>foot.z&&foot.z===60&&run.z===foot.z&&run.x!==foot.x;
  }),'the resolved wall riser meets the horizontal run exactly at the saved foot');
  await page.evaluate(()=>mutate(()=>state.scene3d=FurnishDesign.patchSceneSettings(state.scene3d,{furn:false})));
  await page.evaluate(()=>View3D.automationCamera({position:{x:2700,y:4700,z:2200},target:{x:1050,y:3600,z:350}}));
  await page.screenshot({path:path.join(job.dir,'wiring-wall-riser.png')});
  await page.locator('#wiring-scene-mode').selectOption('conduit');
  await page.waitForFunction(()=>testElectricalGroup.getObjectByName('PVC-U conduit')?.userData.diameter===25);
  assert(await page.evaluate(()=>testElectricalGroup.getObjectByName('PVC-U conduit').userData.bendCount>0));
  assert.equal(await page.evaluate(()=>state.wireRoutes[1].conduitDiameter),undefined);
  await page.screenshot({path:path.join(job.dir,'pvc-u-conduit.png')});
  await page.evaluate(()=>undo()); // Furniture visibility.
  await page.evaluate(()=>undo()); // Wall riser and diameter.
  await page.waitForFunction(()=>testElectricalGroup.getObjectByName('PVC-U conduit')?.userData.diameter===20);
  await page.evaluate(()=>redo());
  await page.waitForFunction(()=>testElectricalGroup.getObjectByName('PVC-U conduit')?.userData.diameter===25);
  await page.locator('[data-plan-mode="furniture"]').click();
  await page.waitForFunction(()=>testElectricalGroup.children.length===0);
  await page.evaluate(()=>FurnishRepository.flush());
  await page.reload();
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>state.wireRoutes[0].points[1]),{x:863,y:3600,z:60});
  assert.equal(await page.evaluate(()=>state.wireRoutes[0].conduitDiameter),25);
  const route=await page.evaluate(()=>state.wireRoutes[0]);
  await app.close();app=null;
  browser=await chromium.launch({channel:process.env.FURNISH_BROWSER_CHANNEL||'chrome',args:['--enable-unsafe-swiftshader']});
  const offline=await browser.newPage({offline:true,viewport:{width:1400,height:900}});
  offline.on('pageerror',e=>errors.push(e.message));
  await offline.goto(pathToFileURL(path.join(work,'index.html')).href);
  await offline.locator('#repository-loading').waitFor({state:'hidden'});
  await offline.evaluate(baseline=>{
   FurnishElectricalUI.setMode('electrical');
   drawer('panel',true);
   baseline.points=baseline.points.map(({x,y,z})=>({x,y,z}));
   mutate(()=>state.wireRoutes=[baseline]);
   const build=FurnishConduitModel.build;
   FurnishConduitModel.build=(...args)=>{
    const group=build(...args);
    window.testOfflineConduit=group.userData;
    return group;
   };
  },route);
  await offline.locator('#viewSeg [data-view="3d"]').click();
  await offline.waitForFunction(()=>is3D()&&!switching);
  await offline.locator('#electrical-wiring').click();
  await offline.locator('#wiring-scene-mode').selectOption('conduit');
  await offline.waitForFunction(()=>testOfflineConduit?.diameter===25&&testOfflineConduit.bendCount>0);
  assert.deepEqual(errors,[]);
  assert.equal(hash(),before);
  passed=true;
  console.log('PASS 3D wiring, real conduit geometry, route isolation, 2D draft, undo/redo, saved reload and offline file://. '+job.dir);
 }finally{
  if(browser)await browser.close();
  if(app){if(!passed)app.process().kill('SIGKILL');await app.close().catch(()=>{});}
  assert.equal(hash(),before);
  job.finish(passed);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
