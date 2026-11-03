/* GPU regression in the packaged desktop, with a private copy of the 1601 workspace. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {_electron}=require('playwright'),{runtimeFiles}=require('./package-desktop.cjs');
const root=path.resolve(__dirname,'..'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function main(){
 const source=path.resolve(process.argv[2]||'projects/workspace.furnish.json'),original=hash(source);
 const run=path.join(root,'output/playwright/wall-beam-caps',new Date().toISOString().replace(/[:.]/g,'-')),isolated=path.join(run,'workspace');
 fs.mkdirSync(isolated,{recursive:true});
 for(const n of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,n),path.join(isolated,n),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const n of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',n),path.join(isolated,'scripts',n));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const executable=path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 let app;const errors=[],results=[];
 try{
  app=await _electron.launch({executablePath:executable,env,timeout:60000});const p=await app.firstWindow();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
  await p.waitForURL(`http://127.0.0.1:${port}/`);await p.locator('#repository-loading').waitFor({state:'hidden'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1600,1050));
  await p.evaluate(()=>{
   const original=FurnishSceneObservation.create;FurnishSceneObservation.create=T=>{const observer=original(T),update=observer.update;window.__caps={T};observer.update=(camera,bounds,architecture)=>{Object.assign(__caps,{camera,architecture});return update(camera,bounds,architecture);};return observer;};
  });
  await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);
  await p.evaluate(()=>{selectIds([state.furniture[0].id]);View3D.focusSelection();});await p.evaluate(()=>View3D.automationReady());
  await p.evaluate(()=>select(null));
  await p.evaluate(()=>View3D.automationCamera({mode:'orbit',position:{x:6047.734,y:11865.711,z:7469.623},target:{x:4124.011,y:5335.443,z:1609.264},horizontalFov:60}));
  const canonical=await p.evaluate(()=>snap());
  // Sample the interior of the actual beam/wall overlap, away from its silhouette.
  async function sample(enabled,name,z=2700){
   await p.evaluate(enabled=>{__caps.architecture.traverse(o=>{if(o.userData.recessWall&&Array.isArray(o.material))o.material[2].polygonOffset=enabled;});},enabled);
   const result=await p.evaluate(async z=>{
    const {T,camera}=__caps,img=new Image();img.src=View3D.image();await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const xs=PLAN.walls.flatMap(w=>[w[0],w[2]]),ys=PLAN.walls.flatMap(w=>[w[1],w[3]]);
    const ox=Math.round((Math.min(...xs)+Math.max(...xs))/2/50)*50,oy=Math.round((Math.min(...ys)+Math.max(...ys))/2/50)*50;let bright=0,total=0;
    for(let x=3860;x<=3910;x+=5)for(let y=5530;y<=6360;y+=10){const q=new T.Vector3((x-ox)/1000,z/1000,(y-oy)/1000).project(camera),px=Math.round((q.x+1)*img.width/2),py=Math.round((1-q.y)*img.height/2),v=ctx.getImageData(px,py,1,1).data;bright+=v[0]>110;total++;}
    return {bright,total};
   },z);
   const clip=await p.evaluate(()=>{
    const {T,camera}=__caps,xs=PLAN.walls.flatMap(w=>[w[0],w[2]]),ys=PLAN.walls.flatMap(w=>[w[1],w[3]]),ox=Math.round((Math.min(...xs)+Math.max(...xs))/2/50)*50,oy=Math.round((Math.min(...ys)+Math.max(...ys))/2/50)*50,r=document.querySelector('#view3d canvas').getBoundingClientRect();
    const points=[[3690,5410],[4140,5410],[4140,6500],[3690,6500]].map(([x,y])=>{const q=new T.Vector3((x-ox)/1000,2.7,(y-oy)/1000).project(camera);return [r.left+(q.x+1)*r.width/2,r.top+(1-q.y)*r.height/2];});
    const x=Math.floor(Math.min(...points.map(p=>p[0]))-20),y=Math.floor(Math.min(...points.map(p=>p[1]))-20);return {x,y,width:Math.ceil(Math.max(...points.map(p=>p[0]))+20-x),height:Math.ceil(Math.max(...points.map(p=>p[1]))+20-y)};
   });
   await p.screenshot({path:path.join(run,name+'.png'),clip});return result;
  }
  const before=await sample(false,'desktop-before'),after=await sample(true,'desktop-after');
  assert(before.bright>10,'old material must reproduce visible light stripes');assert.equal(after.bright,0,'wall cap should be continuous and dark');results.push({view:'original',before,after});
  // Adjacent view also remains stable, without relying on one camera's depth rounding.
  await p.evaluate(()=>View3D.automationCamera({mode:'orbit',position:{x:6600,y:11500,z:7800},target:{x:4124,y:5335,z:1609},horizontalFov:60}));
  const other=await sample(true,'desktop-after-oblique');assert.equal(other.bright,0);results.push({view:'oblique',after:other});
  assert.equal(await p.evaluate(()=>snap()),canonical,'view/material checks must not edit the design');
  // A genuinely higher beam must still occlude the cap, even at only 1 mm.
  await p.evaluate(()=>{const beam=state.architecture.draft.beams.find(b=>b.sourceEntity==='63A02:0');if(!beam)throw Error('1601 beam missing');mutate(()=>{state.architecture.draft=FurnishDraft.editBeam(state.architecture.draft,beam.id,2401,2701);});View3D.sync();});
  await p.evaluate(()=>View3D.automationReady());
  const higher=await sample(true,'desktop-beam-above-1mm',2701);assert.equal(higher.bright,higher.total,'real 1 mm height separation must win over cap depth priority');results.push({view:'beam-above-1mm',after:higher});
  await p.evaluate(()=>undo());await p.evaluate(()=>View3D.automationReady());assert.equal(await p.evaluate(()=>snap()),canonical);
  assert.deepEqual(errors,[]);assert.equal(hash(source),original);
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({executable,source,originalHash:original,results,errors,sourceUnchanged:true},null,2));console.log(JSON.stringify({run,results,errors}));
 }finally{if(app){try{const p=await app.firstWindow();await p.evaluate(()=>FurnishRepository.flush());}finally{await app.close();}}assert.equal(hash(source),original);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
