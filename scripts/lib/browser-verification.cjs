'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const projectRoot=path.resolve(__dirname,'../..');
async function editFurnitureField(page,selector,value){
 if(selector!=='#fW'&&selector!=='#fD'){await page.locator(selector).fill(String(value));await page.locator(selector).press('Tab');return;}
 await page.locator('#fab [data-fab-edit="size"]').click();
 await page.locator(selector==='#fW'?'#fab-width':'#fab-depth').fill(String(value));
 await page.locator('#fab-size-form [type="submit"]').click();
 const cancel=page.locator('#fab-editor [data-fab-close]').first();if(await cancel.count())await cancel.click();
}
async function openDistanceControls(page){if(!await page.locator('#fab-editor [data-distance-row]').count())await page.locator('#fab [data-fab-edit="distance"]').click();}
async function clickCanvasTool(page,selector){
 const button=page.locator(selector);
 if(await button.isHidden()&&!await page.locator('.rail-tool-menu').evaluate(el=>el.open))await page.locator('.rail-tool-menu>summary').click();
 await button.click();
}
async function cabinetSpace(page){
 const display=page.locator('.builder-display');
 if(!await display.evaluate(el=>el.open))await display.locator('summary').first().click();
 await page.locator('[data-builder-space]').click();
 return page.locator('[data-builder-space-result]').textContent();
}
async function setCabinetOverall(page,key,value){
 const section=page.locator('.builder-overall-size');
 if(!await section.evaluate(el=>el.open))await section.locator('summary').click();
 const input=page.locator('[data-builder-overall="'+key+'"]');
 await input.fill(String(value));await input.press('Tab');
}
async function fillCeilingField(page,key,value){
 const input=page.locator('[data-design="'+key+'"]');
 if(await input.isHidden()){
  const stage=await input.evaluate(el=>el.closest('[data-design-panel]')?.dataset.designPanel);
  if(stage)await page.locator('[data-design-stage="'+stage+'"]').click();
 }
 await input.fill(String(value));
}
async function setCeilingStyle(page,value){
 await page.locator('[data-design-stage="style"]').click();
 await page.locator('[name="ceiling-design-style"][value="'+value+'"]').check();
}
function configuration(env=process.env){
 const root=path.resolve(env.FURNISH_VERIFY_ROOT||projectRoot);
 const url=new URL(env.FURNISH_VERIFY_URL||'http://127.0.0.1:8765/');
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('FURNISH_VERIFY_URL must be a loopback HTTP origin, for example http://127.0.0.1:9000/');
 const output=relative=>{const target=path.resolve(root,'output',relative);if(!target.startsWith(path.join(root,'output')+path.sep))throw Error('Output path escapes output/');fs.mkdirSync(path.dirname(target),{recursive:true});return target.replaceAll('\\','/');};
 return {root:root.replaceAll('\\','/')+'/',baseURL:url.href,fileBase:pathToFileURL(root+path.sep).href,output,editFurnitureField,openDistanceControls,clickCanvasTool,cabinetSpace,setCabinetOverall,fillCeilingField,setCeilingStyle,
  waitForDialogAction:page=>page.waitForFunction(()=>!document.querySelector('#dlg .dlg-box[aria-busy="true"]')),
  waitForCache:async page=>{try{await page.waitForFunction(()=>{try{const sorted=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(sorted):Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v,cached=JSON.parse(localStorage.getItem(STORE));return !savePending&&!saveErr&&savedAt>0&&JSON.stringify(sorted(cached.work[PLAN.id]))===JSON.stringify(sorted(state));}catch{return false;}});}catch(error){const detail=await page.evaluate(()=>{const cached=JSON.parse(localStorage.getItem(STORE)||'null')?.work?.[PLAN.id];return {savePending,saveErr,savedAt,planId:PLAN.id,differences:[...new Set([...Object.keys(cached||{}),...Object.keys(state)])].filter(k=>JSON.stringify(cached?.[k])!==JSON.stringify(state[k])).map(k=>({key:k,cachedBytes:JSON.stringify(cached?.[k])?.length,currentBytes:JSON.stringify(state[k])?.length}))};});throw Error(error.message+'\nCache detail: '+JSON.stringify(detail));}},
  fixture:name=>path.join(root,'tests/fixtures/browser',name),
  launchOptions:{headless:env.FURNISH_VERIFY_HEADED!=='1',...(env.FURNISH_BROWSER_PATH?{executablePath:env.FURNISH_BROWSER_PATH}:env.FURNISH_BROWSER_CHANNEL?{channel:env.FURNISH_BROWSER_CHANNEL}:{})}};
}
function loadPlaywright(){
 try{return require(process.env.FURNISH_PLAYWRIGHT||'playwright');}
 catch(e){throw Error('Browser verification requires Playwright. Run npm ci, then npx playwright install chromium. Optional FURNISH_PLAYWRIGHT must point to an installed module. '+e.message);}
}
// Fresh profiles only. HTTP checks use a static server, so no request can save
// into projects/workspace.furnish.json. Await startup arbitration before UI work.
function instrument(browser){
 const newContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await newContext(options),newPage=context.newPage.bind(context);
  context.newPage=async()=>{const page=await newPage();for(const method of ['goto','reload']){const original=page[method].bind(page);page[method]=async(...args)=>{const response=await original(...args);if(new URL(page.url()).pathname.endsWith('/index.html')||new URL(page.url()).pathname==='/')await page.locator('#repository-loading').waitFor({state:'hidden'});return response;};}return page;};
  return context;
 };
 browser.newPage=async options=>{const context=await browser.newContext(options);return context.newPage();};
 return browser;
}
function isolatedRoot(){if(!process.env.FURNISH_VERIFY_ROOT||path.resolve(process.env.FURNISH_VERIFY_ROOT)===projectRoot)throw Error('Use scripts/verify-browser.cjs to prepare an isolated browser workspace.');return path.resolve(process.env.FURNISH_VERIFY_ROOT);}
async function launch(){isolatedRoot();return instrument(await loadPlaywright().chromium.launch(configuration().launchOptions));}
async function staticServer(root,requestedURL){
 const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm','.pdf':'application/pdf'};
 const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||path.relative(root,file).split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}}catch{res.writeHead(400).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Static verification server: no repository API'}));return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:data);});
 });
 const url=requestedURL?new URL(configuration({FURNISH_VERIFY_URL:requestedURL}).baseURL):null;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(url?Number(url.port||80):0,url?url.hostname.replace(/^\[|\]$/g,''):'127.0.0.1',resolve);});
 return {baseURL:url?url.href:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeAllConnections();})};
}
module.exports={projectRoot,configuration,isolatedRoot,loadPlaywright,launch,staticServer};
