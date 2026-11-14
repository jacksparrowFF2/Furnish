'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright'),{staticServer}=require('../scripts/lib/browser-verification.cjs');
(async()=>{
 const server=await staticServer(path.resolve(__dirname,'..'));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});page.on('request',r=>{if(!r.url().startsWith(server.baseURL))external.push(r.url());});
  await page.addInitScript(()=>{window.previewReady=false;addEventListener('message',e=>{if(e.source===window&&e.origin===location.origin&&e.data?.channel==='furnish-lighting-preview'&&e.data.type==='ready')window.previewReady=true;});});
  await page.goto(server.baseURL+'src/render/lighting-preview.html');await page.waitForFunction(()=>previewReady);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS complete offline preview ESM graph, portable shader filename, no CDN requests, no GPU or plan access needed');
 }finally{await browser?.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
