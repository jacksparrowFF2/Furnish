/* Real browser publisher + installed Blender receiver, isolated from user workspaces. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),cp=require('node:child_process'),crypto=require('node:crypto');
const V=require('../lib/browser-verification.cjs'),B=require('../blender-server.cjs');
function changeOrigin(buffer,dx,dy){const length=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+length));json.scenes[0].extras.furnish.originMm[0]+=dx;json.scenes[0].extras.furnish.originMm[1]+=dy;for(const node of json.nodes)if(node.mesh!==undefined){node.matrix||=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];node.matrix[12]-=dx/1000;node.matrix[14]-=dy/1000;}const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);const header=Buffer.from(buffer.subarray(0,20)),tail=buffer.subarray(20+length);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);return Buffer.concat([header,padded,tail]);}
async function main(){
 const project=path.resolve(__dirname,'../..'),run=fs.mkdtempSync(path.join(project,'output/playwright/blender-sync-')),root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','vendor','scripts','assets'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const base='http://127.0.0.1:'+port;
 const server=cp.spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,FURNISH_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});let logs='';for(const stream of [server.stdout,server.stderr])stream.on('data',b=>logs+=b);let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/furnish/blender/sync/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=base+'/';browser=await V.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/index.html');
  await page.evaluate(()=>mutate(()=>{state.furniture=[{id:'live-sofa',type:'sofa_yeswood_cherry',name:'Live Sofa',cx:7000,cy:8500,w:2160,d:892,h:895,rot:0,color:'#eee9df'},{id:'live-tea',type:'tea_table_800',name:'Live Tea',cx:7000,cy:6500,w:800,d:400,h:720,rot:0,color:'#68432e'}];}));
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1000);await page.locator('#vBlender').click();await page.locator('.blender-sync>summary').click();
  await page.locator('[data-sync-token]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-sync-token]').value.length===48);
  const status=await(await fetch(base+'/api/furnish/blender/sync/status')).json(),token=status.token,fixtures=[];
  async function capture(name,automatic=false){const before=(await(await fetch(base+'/api/furnish/blender/sync/status')).json()).latest?.revision;
   if(!automatic)await page.locator('[data-sync-send]').click();
   await page.waitForFunction(({before})=>FurnishBlenderSync.state().message.startsWith('已推送')&&!FurnishBlenderSync.state().busy&&FurnishBlenderSync.state().last,{before},{timeout:90000});
   let latest;for(let i=0;i<100;i++){latest=(await(await fetch(base+'/api/furnish/blender/sync/status')).json()).latest;if(latest&&latest.revision!==before)break;await new Promise(r=>setTimeout(r,200));}
   if(!latest||latest.revision===before)throw Error('Snapshot did not change: '+name);
   const response=await fetch(base+'/api/furnish/blender/sync/scene/'+latest.revision,{headers:{'X-Furnish-Sync':token}}),buffer=Buffer.from(await response.arrayBuffer());fs.writeFileSync(path.join(run,name+'.glb'),buffer);fixtures.push({name,file:name+'.glb',manifest:latest});return buffer;
  }
  await capture('first');await page.locator('[data-sync-auto]').check();await page.waitForFunction(()=>!FurnishBlenderSync.state().busy);await page.locator('#dlgClose').click();
  await page.evaluate(()=>mutate(()=>{const sofa=state.furniture[0];sofa.cx+=450;sofa.rot=33;sofa.flip=true;sofa.w=2300;state.furniture.unshift({id:'live-new',type:'bed',name:'New',cx:3000,cy:3500,w:1500,d:2000,h:900,rot:90,color:'#aabbcc'});}));
  await capture('moved',true);
  const spatial=(await(await fetch(base+'/api/furnish/blender/sync/status')).json()).latest.revision;
  await page.evaluate(()=>mutate(()=>state.furniture.find(f=>f.id==='live-sofa').price=1234));await page.waitForTimeout(3300);if((await(await fetch(base+'/api/furnish/blender/sync/status')).json()).latest.revision!==spatial)throw Error('Price edit should not publish');
  await page.evaluate(()=>{state.scene3d={...state.scene3d,furn:false};View3D.sync();});await capture('hidden',true);
  await page.evaluate(()=>{state.scene3d={...state.scene3d,furn:true};mutate(()=>state.furniture=state.furniture.filter(f=>f.id!=='live-tea'));View3D.sync();});await capture('deleted',true);
  await page.evaluate(()=>undo());await capture('restored',true);await page.evaluate(()=>FurnishBlenderSync.stop());
  const restored=fs.readFileSync(path.join(run,'restored.glb')),shifted=changeOrigin(restored,1000,500);const shiftedMeta=JSON.parse(shifted.subarray(20,20+shifted.readUInt32LE(12))).scenes[0].extras.furnish;
  const shiftedManifest={...fixtures.at(-1).manifest,revision:crypto.createHash('sha256').update(shifted).digest('hex'),originMm:shiftedMeta.originMm,bytes:shifted.length};fs.writeFileSync(path.join(run,'origin.glb'),shifted);fixtures.push({name:'origin',file:'origin.glb',manifest:shiftedManifest});
  const addon=Buffer.from(await(await fetch(base+'/api/furnish/blender/sync/addon.zip')).arrayBuffer());fs.writeFileSync(path.join(run,'furnish-sync.zip'),addon);
  fs.writeFileSync(path.join(run,'receiver-input.json'),JSON.stringify({server:base,token,fixtures},null,2));
  await page.locator('#vBlender').click();await page.locator('.blender-sync>summary').click();await page.screenshot({path:path.join(run,'desktop.png'),animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(run,'mobile.png'),animations:'disabled'});if(await page.locator('.blender-render').evaluate(e=>e.scrollWidth>e.clientWidth))throw Error('Narrow panel overflow');
  if(errors.length)throw Error(errors.join(';'));console.log('Browser publisher PASS; starting real Blender receiver: '+run);
  fs.mkdirSync(path.join(run,'isolated-blender-scripts'),{recursive:true});const blender=cp.spawn(B.findBlender(),['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(root,'scripts/verify/verify-blender-sync.py'),'--','--directory',run],{cwd:root,env:{...process.env,BLENDER_USER_SCRIPTS:path.join(run,'isolated-blender-scripts')},windowsHide:true,stdio:'ignore'});blender.on('error',e=>fs.writeFileSync(path.join(run,'receiver-error.txt'),e.message));
  const resultFile=path.join(run,'receiver-result.json'),errorFile=path.join(run,'receiver-error.txt');for(let i=0;i<180;i++){if(fs.existsSync(errorFile))throw Error(fs.readFileSync(errorFile,'utf8'));if(fs.existsSync(resultFile))break;await new Promise(r=>setTimeout(r,1000));}
  if(!fs.existsSync(resultFile))throw Error('Receiver timed out');const result=JSON.parse(fs.readFileSync(resultFile));if(!result.passed)throw Error(JSON.stringify(result));
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,browserErrors:errors,publisherAutoWhilePanelClosed:true,priceIgnored:true,narrowScreen:true,receiver:result},null,2));console.log('PASS continuous sync: '+run);
 }finally{if(browser)await browser.close();server.kill();fs.writeFileSync(path.join(run,'server.log'),logs);}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
