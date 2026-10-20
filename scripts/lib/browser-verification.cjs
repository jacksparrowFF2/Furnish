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
async function revealCabinetSettings(page){
 for(let i=0;i<12;i++){
  const summary=page.locator('.cab-fields details:not([open]):not(.cab-object-finder)>summary:visible').first();
  if(!await summary.count())break;await summary.click();
 }
}
async function openDistanceControls(page){if(!await page.locator('#fab-editor [data-distance-row]').count())await page.locator('#fab [data-fab-edit="distance"]').click();}
function configuration(env=process.env){
 const root=path.resolve(env.FURNISH_VERIFY_ROOT||projectRoot);
 const url=new URL(env.FURNISH_VERIFY_URL||'http://127.0.0.1:8765/');
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('FURNISH_VERIFY_URL must be a loopback HTTP origin, for example http://127.0.0.1:9000/');
 const output=relative=>{const target=path.resolve(root,'output',relative);if(!target.startsWith(path.join(root,'output')+path.sep))throw Error('Output path escapes output/');fs.mkdirSync(path.dirname(target),{recursive:true});return target.replaceAll('\\','/');};
 const selectCabinetObject=async(page,part={})=>{
  const kitchen=await page.locator('#cab-kitchen-object').count()>0,selector=kitchen?'#cab-kitchen-object':'#cab-object-target',control=page.locator(selector),current=JSON.parse(await control.inputValue()),wanted={...part,kind:part.kind??current.kind};
  if(wanted.kind==='body'){const button=page.locator(kitchen?'[data-k-object="body"]':'[data-cab-target="body"]');if(await button.count())await button.click();return {kind:'body'};}
  const finder=page.locator('.cab-object-finder');if(!await finder.evaluate(el=>el.open))await finder.locator('summary').click();
  const group=String(wanted.assembly??wanted.column??current.column??0),groups=page.locator('[data-cab-find-group]');
  if(await groups.inputValue()!==group){await groups.selectOption(group);if(wanted.assembly)return wanted;}
  if(wanted.column===undefined)wanted.column=current.column??0;
  const value=await page.locator(selector+' option').evaluateAll((options,wanted)=>options.find(o=>{const value=JSON.parse(o.value);return Object.entries(wanted).every(([k,v])=>v===undefined||value[k]===v);})?.value??options.find(o=>JSON.parse(o.value).kind==='bay')?.value,wanted);
  if(!value)throw Error('Cabinet object unavailable: '+JSON.stringify(wanted));if(!await page.locator('.cab-object-finder').evaluate(el=>el.open))await page.locator('.cab-object-finder>summary').click();await page.locator(selector).selectOption(value);return JSON.parse(value);
 };
 return {root:root.replaceAll('\\','/')+'/',baseURL:url.href,fileBase:pathToFileURL(root+path.sep).href,output,selectCabinetObject,editFurnitureField,revealCabinetSettings,openDistanceControls,
  waitForCache:page=>page.waitForFunction(()=>{try{const cached=JSON.parse(localStorage.getItem(STORE));return !savePending&&!saveErr&&savedAt>0&&JSON.stringify(cached.work[PLAN.id])===JSON.stringify(state);}catch{return false;}}),
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
async function launch(){if(!process.env.FURNISH_VERIFY_ROOT||path.resolve(process.env.FURNISH_VERIFY_ROOT)===projectRoot)throw Error('Use scripts/verify-browser.cjs to prepare an isolated browser workspace.');return instrument(await loadPlaywright().chromium.launch(configuration().launchOptions));}
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
module.exports={projectRoot,configuration,loadPlaywright,launch,staticServer};
