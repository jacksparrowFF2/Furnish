/* Generic production integration; structural correctness stays in each model's suites. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
async function main(root,run,id){
 root=path.resolve(root);run=path.resolve(run);const profile=require(path.join(root,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id===id);assert(profile,'Unknown model profile');
 fs.mkdirSync(run,{recursive:true});const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;const modes=[],exports=[];
 try{
  browser=await V.launch();
  for(const mode of ['http','file']){
   const context=await browser.newContext({viewport:{width:1200,height:1000},offline:mode==='file'}),page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});
   await page.goto((mode==='file'?V.configuration().fileBase:server.baseURL)+'index.html');
   await page.evaluate(f=>mutate(()=>{state.furniture=f;}),[profile.fixture,...(profile.companions||[])]);
   const before=await page.evaluate(()=>JSON.stringify(state.furniture));
   const resized=await page.evaluate(policy=>{
    mutate(()=>{const f=state.furniture[0];state.furniture[0]=FurnishDesign.resizeFurniture(f,{w:f.w*1.12,d:f.d*1.08,h:FurnishProducts.height(f)?FurnishProducts.height(f)*(policy==='coupled-screen'?1.12:1.08):undefined});});return JSON.stringify(state.furniture);
   },profile.resizePolicy);
   assert.notEqual(resized,before,id+' core resize had no effect');await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),before);await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),resized);
   await V.configuration().waitForCache(page);await page.reload();assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),resized,id+' resize changed during refresh');
   const resizedScene=await page.evaluate(()=>state.furniture);
   await F.install(page,profile);
   const companions=profile.companions||[],states=[['nominal',[profile.fixture,...companions]],...(profile.alternateKind!=='back'?[['alternate',[profile.alternate,...companions]]]:[]),...(mode==='http'?[['resized',resizedScene]]:[])];
   for(const [state,scene]of states){
    const fixture=scene[0];await page.evaluate(f=>mutate(()=>{state.furniture=f;}),scene);assert.equal(await page.evaluate(()=>furnitureRenderErrors.size),0);
    const file=path.join(run,mode+'-'+state+'.glb'),geometry=await F.capture(page,file);assert(geometry.parts.length>0);
    const poseRequests=await page.evaluate(()=>state.furniture.filter(f=>FurnishProducts.supports(f,'slidingOpen')).map(f=>({id:f.id,target:FurnishProducts.value(f,'slidingOpen')?1:0})));
    for(const request of poseRequests){const pose=geometry.settledPoses.find(p=>p.id===request.id);assert(pose&&pose.target===request.target&&pose.partBoundsMatched&&pose.parts>0,id+' did not export the saved sliding endpoint');assert(pose.maxError<2e-5,id+' production parts have not reached saved endpoint bounds');}
    if(profile.asset){const expected=profile.asset.parts*(profile.id==='stack-stool'?(fixture.stoolCount||1):1);assert.equal(geometry.parts.length,expected,id+' production part count');
     if(profile.asset.productionIdentity==='cabinet-boards')assert(geometry.parts.every(p=>p.key.startsWith('named:')&&p.kind==='BufferGeometry'&&p.count>24),id+' lost imported shaped boards or cabinet production identities');
     else assert(geometry.parts.every(p=>profile.asset.prefixes.some(prefix=>p.key.startsWith('explicit:'+prefix))),id+' used a fallback asset');
    }
    const spatial=await page.evaluate(()=>{const plan=FurnishProject.effectivePlan(PLAN,state),parts=state.furniture.flatMap(f=>FurnishGeometry.bodyParts(f,plan,state.furniture)),known=parts.filter(p=>p.vertical);return {bottom:Math.min(...known.map(p=>p.vertical.bottom))/1000,top:Math.max(...known.map(p=>p.vertical.top))/1000};});
    assert(geometry.bounds[0][1]>=spatial.bottom-.002&&geometry.bounds[1][1]<=spatial.top+.002,`${id}/${state}: production height ${JSON.stringify(geometry.bounds)} escapes numeric body ${JSON.stringify(spatial)}`);
    assert(scene.every(f=>geometry.parts.some(p=>p.id===f.id)),id+' lost a combination member');
    exports.push({mode,state,file:path.basename(file),fixture,scene,geometry,spatial});
   }
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,id+' narrow layout overflow');
   assert.deepEqual(errors,[],id+' browser errors');assert.deepEqual(external,[],id+' external requests');modes.push({mode,passed:true,undoRedo:true,coreResize:true,refresh:true,narrow:true,offline:mode==='file'});await context.close();
  }
  const report={passed:true,profile:id,route:profile.route,modes,exports};fs.writeFileSync(path.join(run,'production.json'),JSON.stringify(report,null,2));return report;
 }finally{if(browser)await browser.close();await server.close();}
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS profile production')).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
