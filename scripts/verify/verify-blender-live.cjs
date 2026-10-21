/* Real UI -> production local server -> installed Blender. Runs only when explicitly selected. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),cp=require('node:child_process');
const V=require('../lib/browser-verification.cjs');
async function main(){
 const project=path.resolve(__dirname,'../..'),run=fs.mkdtempSync(path.join(project,'output/playwright/blender-live-')),root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','vendor','scripts','assets'])if(fs.existsSync(path.join(project,name)))fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});fs.copyFileSync(path.join(project,'index.html'),path.join(root,'index.html'));
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const base='http://127.0.0.1:'+port,server=cp.spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,FURNISH_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});let logs='';for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{logs+=b;});
 let browser;
 try{
  for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/furnish/blender/status');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=base+'/';browser=await V.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1000);
  const original=await page.evaluate(()=>JSON.stringify(state));await page.locator('#vBlender').click();await page.waitForFunction(()=>!document.querySelector('#blender-start').disabled);
  if(await page.locator('#blender-cancel').isVisible())throw Error('Idle cancel button must be hidden');
  if(await page.locator('#blender-device').inputValue()!=='auto')throw Error('Default device should prefer GPU');
  console.log('Starting real render through UI');await page.locator('#blender-start').click();await page.waitForFunction(()=>!document.querySelector('#blender-cancel').hidden||document.querySelector('#blender-result img'));
  await page.locator('#dlgClose').click();await page.locator('#vBlender').click();await page.waitForFunction(()=>!!document.querySelector('#blender-result img'),{},{timeout:180000});await page.locator('#blender-result img').evaluate(img=>img.decode());
  if(!(await page.locator('#blender-device-result').innerText()).trim())throw Error('Actual device was not displayed');
  if(await page.evaluate(()=>JSON.stringify(state))!==original)throw Error('Rendering changed project state');
  await page.screenshot({path:path.join(run,'desktop.png'),animations:'disabled'});
  for(const name of ['下载图片','下载 Blender 工程','下载本次场景']){const download=page.waitForEvent('download');await page.getByRole('link',{name,exact:true}).click();const file=await download;await file.saveAs(path.join(run,file.suggestedFilename()));}
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:path.join(run,'mobile.png'),animations:'disabled'});
  if(!await page.locator('#blender-start').isVisible()||await page.locator('.blender-render').evaluate(e=>e.scrollWidth>e.clientWidth))throw Error('Narrow panel overflow');
  if(errors.length)throw Error(errors.join(';'));fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,realStoreBlender:true,productionAPI:true,panelReopen:true,projectUnchanged:true,pngBlendGlbDownloads:true,narrowScreen:true,errors},null,2));console.log('PASS real Blender UI flow: '+run);
 }finally{if(browser)await browser.close();server.kill();fs.writeFileSync(path.join(run,'server.log'),logs);}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
