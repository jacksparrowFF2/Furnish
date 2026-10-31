/* Read a previously captured, read-only desktop MCP snapshot into a private app. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
async function main(root,snapshot,output){
 root=path.resolve(root);output=path.resolve(output);assert.notEqual(root,V.projectRoot);const live=JSON.parse(fs.readFileSync(snapshot)),washer=live.furniture.find(f=>f.type==='washer_littleswan_tg10k60w'),host=live.furniture.find(f=>f.id===washer.laundryHostId)||live.furniture.find(f=>f.kitchen?.laundry);assert(washer&&host);
 fs.mkdirSync(output,{recursive:true});const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;
 try{
  browser=await V.launch();const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.baseURL+'index.html');
  await page.evaluate(({live,host,washer})=>{const work=structuredClone(live.work),plan=FurnishDraft.build(work.architecture.draft),index=PLANS.findIndex(p=>p.id===plan.id);if(index<0)PLANS.push(plan);else Object.assign(PLANS[index],plan);setPlan(plan.id);mutate(()=>Object.assign(state,work,{furniture:structuredClone([host,washer]),scene3d:{...work.scene3d,labels:false,clearances:false}}));},{live,host,washer});
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);
  const origin=await page.evaluate(()=>{const xs=WALLS.flatMap(w=>[w[0],w[2]]),ys=WALLS.flatMap(w=>[w[1],w[3]]);return [Math.round((Math.min(...xs)+Math.max(...xs))/100)*50,Math.round((Math.min(...ys)+Math.max(...ys))/100)*50];});
  const target=[(host.cx-origin[0])/1000,1.28,(host.cy-origin[1])/1000],angle=washer.rot*Math.PI/180,front=[-Math.sin(angle),Math.cos(angle)],view={position:[target[0]+front[0]*2.45,1.38,target[2]+front[1]*2.45],target,fov:60},before=await page.evaluate(()=>JSON.stringify(state.furniture)),geometry=await F.capture(page,path.join(output,'laundry.glb'),view);assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),before);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'context.json'),JSON.stringify({passed:true,sourcePlanId:live.plan.id,sourceRevision:live.revision,activeDesign:live.activeDesign,save:live.save,fixture:[host,washer],scope:'actual saved laundry group and architecture in a private snapshot; other furniture omitted',originMm:origin,view,geometry},null,2));fs.writeFileSync(path.join(output,'spec.json'),JSON.stringify(require(path.join(root,'src/core/washer-motion-core.js')).spec(washer)));return geometry;
 }finally{if(browser)await browser.close();await server.close();}
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS private actual laundry production snapshot')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
