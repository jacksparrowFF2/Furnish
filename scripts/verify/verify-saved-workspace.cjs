/* Actual saved workspace, isolated HTTP/offline restore and production export. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const V=require('../lib/browser-verification.cjs'),C=require('../../src/core/repository-core.js'),B=require('../blender-server.cjs'),S=require('../blender-sync-server.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const project=path.resolve(__dirname,'../..'),file=path.join(project,'projects/workspace.furnish.json'),raw=fs.readFileSync(file),saved=C.parse(JSON.parse(raw)),work=saved.work[saved.planId];
 if(C.text(saved)!==C.text(C.parse(JSON.parse(C.text(saved)))))throw Error('Workspace restore drift');
 const run=fs.mkdtempSync(path.join(project,'output/playwright/saved-workspace-')),root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','assets','vendor','scripts','projects','index.html'])fs.cpSync(path.join(project,name),path.join(root,name),{recursive:true});
 const storeKey=fs.readFileSync(path.join(root,'src/app.js'),'utf8').match(/let STORE\s*=\s*'([^']+)'/)[1],server=await V.staticServer(root);
 process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;
 const browser=await V.launch(),results=[];let publish;
 try{for(const mode of ['http','file']){
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:mode==='file'});await context.addInitScript(({key,saved})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));},{key:storeKey,saved});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((mode==='file'?V.configuration().fileBase:server.baseURL)+'index.html');await page.waitForFunction(()=>!repositoryBooting);
  const restored=await page.evaluate(()=>({plan:PLAN.id,ids:state.furniture.map(f=>f.id).sort(),before:JSON.stringify(state)}));if(restored.plan!==saved.planId||JSON.stringify(restored.ids)!==JSON.stringify(work.furniture.map(f=>f.id).sort()))throw Error(mode+' restored the wrong saved workspace');
  await page.screenshot({path:path.join(run,mode+'-2d.png'),animations:'disabled'});await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);
  const exported=await page.evaluate(async binary=>{
   const encode=FurnishBlenderExport.encode;let coverage;
   FurnishBlenderExport.encode=(T,input)=>{const copy=FurnishBlenderExport.snapshot(T,input);try{const nodes=copy.scene.children.filter(n=>n.isMesh),invalid=[];for(const n of nodes){if(n.userData.furnishPartVersion!==3||!n.userData.furnishPartKey)invalid.push(n.name);for(const attr of Object.values(n.geometry.attributes))if(!attr.array.every(Number.isFinite))invalid.push(n.name+':nonfinite');if(!n.matrix.elements.every(Number.isFinite))invalid.push(n.name+':matrix');}coverage={meshes:nodes.length,invalid,modelErrors:[...furnitureRenderErrors]};}finally{copy.dispose();}return binary?encode(T,input):coverage;};
   try{const r=await View3D.blenderScene({includeHidden:true,includeCeilings:true,expandInstances:true});if(!binary)return coverage;let text='';for(const n of new Uint8Array(r.buffer))text+=String.fromCharCode(n);return {...coverage,base64:btoa(text)};}finally{FurnishBlenderExport.encode=encode;}
  },mode==='http');
  if(!exported.meshes||exported.invalid.length||exported.modelErrors.length)throw Error(JSON.stringify(exported));
  if(exported.base64){const buffer=Buffer.from(exported.base64,'base64');fs.writeFileSync(path.join(run,'current.glb'),buffer);publish=S.create(root,{validateGLB:B.validateGLB}).publish(buffer);if(publish.protocol!==3||publish.objects!==exported.meshes)throw Error('Saved export refused by live sync');delete exported.base64;}
  await page.screenshot({path:path.join(run,mode+'-3d.png'),animations:'disabled'});
  if(await page.evaluate(()=>JSON.stringify(state))!==restored.before)throw Error('Read-only scene changed the layout');await page.reload();await page.waitForFunction(()=>!repositoryBooting);if(await page.evaluate(()=>JSON.stringify(state))!==restored.before)throw Error('Reload drift');
  await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>390))throw Error('Saved plan narrow overflow');await page.screenshot({path:path.join(run,mode+'-mobile.png'),animations:'disabled'});
  if(errors.length)throw Error(errors.join(';'));results.push({mode,passed:true,...exported,reloadNoDrift:true,narrow:true,errors});await context.close();
 }}finally{await browser.close();await server.close();}
 if(hash(fs.readFileSync(file))!==hash(raw))throw Error('Original workspace changed');fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,planId:saved.planId,furniture:work.furniture.length,sourceSha256:hash(raw),workspaceUnchanged:true,publish,results},null,2));console.log('PASS actual saved workspace: '+run);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
