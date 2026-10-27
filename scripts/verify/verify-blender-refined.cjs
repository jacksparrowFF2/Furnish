/* Actual 1601 UI render using a registered refinement copy; user files stay read-only. */
'use strict';
const fs=require('fs'),path=require('path'),net=require('net'),cp=require('child_process'),crypto=require('crypto');
const V=require('../lib/browser-verification.cjs'),P=require('../blender-project.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
 const project=path.resolve(__dirname,'../..'),stored=P.read(project),at=process.argv.indexOf('--template'),registered=at<0?stored:{...stored,file:path.resolve(process.argv[at+1])};if(!registered)throw Error('Register a refined 1601 project first');
 const sourceCamera=process.argv.includes('--source-camera'),expectedCamera=sourceCamera?'source':'active';
 const templateHash=hash(registered.file),sourceAt=process.argv.indexOf('--workspace'),source=sourceAt<0?path.join(project,'projects/workspace.furnish.json'):path.resolve(process.argv[sourceAt+1]),sourceHash=hash(source),run=fs.mkdtempSync(path.join(project,'output/playwright/blender-refined-')),root=path.join(run,'workspace');fs.mkdirSync(root);
 for(const name of ['src','styles','vendor','scripts','assets'])fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));fs.mkdirSync(path.join(root,'projects'));fs.copyFileSync(source,path.join(root,'projects/workspace.furnish.json'));P.register(root,registered.file,registered.planId);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const base='http://127.0.0.1:'+port;
 const server=cp.spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,FURNISH_PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/furnish/blender/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=base+'/';browser=await V.launch();const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/index.html');await page.waitForFunction(()=>!repositoryBooting);
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1100);await page.locator('#vBlender').click();await page.waitForFunction(()=>document.querySelector('#blender-source').value==='refined');
  if(sourceCamera){await page.locator('#blender-camera').selectOption('source');await page.locator('#blender-ceilings').uncheck();await page.locator('#vTop').click();await page.waitForTimeout(1100);}
  if(await page.locator('#blender-camera').inputValue()!==expectedCamera)throw Error('Expected saved refined camera');await page.locator('#blender-start').click();await page.waitForFunction(()=>document.querySelector('#blender-cancel')&&!document.querySelector('#blender-cancel').hidden,{},{timeout:90000});
  await page.locator('#blender-dock-close').click();await page.locator('#vBlender').click();await page.waitForFunction(()=>document.querySelector('#blender-result img'),{},{timeout:Number(process.env.FURNISH_BLENDER_VERIFY_TIMEOUT||1800000)});await page.locator('#blender-result img').evaluate(img=>img.decode());
  const status=await(await fetch(base+'/api/furnish/blender/status')).json(),job=status.job;if(job.source!=='refined'||job.camera!==expectedCamera||job.renderInfo?.existingMaterialBindingsPreserved!==job.renderInfo?.matchedManagedMeshes)throw Error(JSON.stringify(job));
  const image=Buffer.from(await(await fetch(base+job.image)).arrayBuffer());fs.writeFileSync(path.join(run,'refined.png'),image);fs.copyFileSync(path.join(root,'.local/blender-renders',job.id,'progress.json'),path.join(run,'worker-result.json'));
  await page.screenshot({path:path.join(run,'sidebar.png'),animations:'disabled'});await page.setViewportSize({width:390,height:844});if(await page.locator('.blender-render').evaluate(e=>e.scrollWidth>e.clientWidth))throw Error('Narrow overflow');await page.screenshot({path:path.join(run,'mobile.png'),animations:'disabled'});
  if(errors.length||hash(registered.file)!==templateHash||hash(source)!==sourceHash)throw Error('Source changed or browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,job,workspaceSource:source,workspaceSha256:sourceHash,templateSource:registered.file,templateSha256:templateHash,templateUnchanged:true,workspaceUnchanged:true,reopen:true,narrowScreen:true,errors},null,2));console.log('PASS refined UI: '+run);
 }finally{if(browser)await browser.close();server.kill();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
