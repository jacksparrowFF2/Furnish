/* Export fixed photographic views through the real production constructor. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
async function main(root,output){
 root=path.resolve(root);output=path.resolve(output);assert.notEqual(root,V.projectRoot);fs.mkdirSync(output,{recursive:true});
 const profile=require(path.join(root,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id==='washer-tg10k60w'),server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;
 try{
  browser=await V.launch();const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.baseURL+'index.html');await F.install(page,profile);
  const views=[{id:'front',position:[0,.65,1.75],target:[0,.43,.03]},{id:'oblique',position:[.95,.9,1.5],target:[0,.44,.03]},{id:'panel',position:[.07,.87,.9],target:[0,.77,.26]},{id:'glass',position:[.38,.6,.93],target:[0,.43,.26]},{id:'open',position:[1.1,1.05,2.05],target:[-.10,.44,.05],open:true}],results=[];
  for(const view of views){await page.evaluate(f=>mutate(()=>{state.furniture=[f];}),view.open?profile.alternate:profile.fixture);const before=await page.evaluate(()=>JSON.stringify(state)),geometry=await F.capture(page,path.join(output,view.id+'.glb'),view);assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);assert.equal(geometry.parts.length,47);hideStudioAnchors(path.join(output,view.id+'.glb'));results.push({...view,geometry});}
  assert.deepEqual(errors,[]);const result={passed:true,profile:profile.id,fixture:profile.fixture,views:results};fs.writeFileSync(path.join(output,'views.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(output,'spec.json'),JSON.stringify(require(path.join(root,'src/core/washer-motion-core.js')).spec(profile.fixture)));return result;
 }finally{if(browser)await browser.close();await server.close();}
}
function hideStudioAnchors(file){
 const b=fs.readFileSync(file),length=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+length));
 for(const n of doc.nodes)if(n.mesh!==undefined&&!n.extras?.furnishId&&!n.extras?.layerObject)n.extras.furnishVisible=false;
 const text=Buffer.from(JSON.stringify(doc)),body=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(body);const header=Buffer.from(b.subarray(0,20)),tail=b.subarray(20+length);header.writeUInt32LE(20+body.length+tail.length,8);header.writeUInt32LE(body.length,12);fs.writeFileSync(file,Buffer.concat([header,body,tail]));
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS appliance photographic production views')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main,hideStudioAnchors};
