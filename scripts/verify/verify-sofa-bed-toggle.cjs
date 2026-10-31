/* Real controls, persisted state and public production export in isolated HTTP/file sessions. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
async function preview(page,base,run,mode){
 await page.goto(base+'output/sofa-bed/preview.html');await page.waitForFunction(()=>window.previewReady);
 for(const width of [390,1440]){await page.setViewportSize({width,height:width===390?844:1000});for(const pose of ['closed','open']){await page.locator('#'+pose).click();assert(await page.evaluate(async()=>{const T=await import('three'),p=sofaBedPreview,b=new T.Box3().setFromObject(p.model);return [-1,1].every(x=>[-1,1].every(y=>[-1,1].every(z=>{const v=new T.Vector3(x<0?b.min.x:b.max.x,y<0?b.min.y:b.max.y,z<0?b.min.z:b.max.z).project(p.camera);return Math.abs(v.x)<.98&&Math.abs(v.y)<.98;})));}),'Preview must frame the whole model');await page.screenshot({path:path.join(run,mode+'-preview-'+pose+'-'+width+'.png')});if(width===1440){await page.locator('#frame').click();await page.screenshot({path:path.join(run,mode+'-frame-'+pose+'.png')});await page.locator('#frame').click();}}}
 assert.equal(await page.evaluate(()=>sofaBedPreview.model.userData.furnishAsset),'sofa-bed-yeswood-y107h03@3');
}
async function main(root,run){
 root=path.resolve(root);run=path.resolve(run);if(root===V.projectRoot)throw Error('Toggle acceptance requires a private workspace');fs.mkdirSync(run,{recursive:true});
 const profile=require(path.join(root,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id==='sofa-bed'),server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;const results=[];
 try{
  browser=await V.launch();
  for(const mode of ['http','file']){
   const context=await browser.newContext({offline:mode==='file',viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base=mode==='file'?V.configuration().fileBase:server.baseURL;
   if(process.argv.includes('--preview-only')){await preview(page,base,run,mode);assert.deepEqual(errors,[]);results.push({mode,passed:true,preview:true,framing:true});await context.close();continue;}
   await page.goto(base+'index.html');await page.evaluate(f=>{mutate(()=>{state.furniture=[f];});selectIds([f.id]);},profile.fixture);await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);
   assert.equal(await page.locator('#sofa-bed-open').inputValue(),'closed');
   let originOffset;
   async function capture(state){
    const geometry=await F.capture(page,path.join(run,mode+'-'+state+'.glb'));assert.equal(geometry.parts.length,103);
    const expected=await page.evaluate(()=>FurnishGeometry.bodyParts(state.furniture[0]).map(p=>[Math.min,Math.max].map(fn=>[0,1,2].map(i=>fn(...p.vertices.map(v=>v[i]))/1000))));
    if(!originOffset)originOffset=geometry.bounds[0].map((v,i)=>v-Math.min(...expected.map(b=>b[0][i])));
    const unmatched=geometry.parts.map(p=>p.bounds);for(const bounds of expected.map(b=>b.map(row=>row.map((v,i)=>v+originOffset[i])))){const index=unmatched.findIndex(b=>b.every((r,k)=>r.every((v,i)=>Math.abs(v-bounds[k][i])<2e-5)));assert(index>=0,state+' displayed a stale endpoint');unmatched.splice(index,1);}assert.equal(unmatched.length,0);return geometry;
   }
   const closed=await capture('closed');await page.locator('#sofa-bed-open').selectOption('open');assert.equal(await page.evaluate(()=>state.furniture[0].sofaBedOpen),true);assert.equal(await page.evaluate(()=>FurnishProducts.dimensions(state.furniture[0]).d),2018);const open=await capture('open');assert(open.bounds[1][2]>closed.bounds[1][2]+1);
   await page.evaluate(()=>undo());assert.equal(await page.locator('#sofa-bed-open').inputValue(),'closed');await capture('undo');await page.evaluate(()=>redo());await capture('redo');
   await V.configuration().waitForCache(page);await page.reload();await page.evaluate(id=>selectIds([id]),profile.fixture.id);assert.equal(await page.locator('#sofa-bed-open').inputValue(),'open');
   await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await capture('refresh');
   await page.evaluate(()=>mutate(()=>{state.furniture[0].locked=true;}));assert(await page.locator('#sofa-bed-open').isDisabled());await page.evaluate(()=>mutate(()=>{state.furniture[0].locked=false;}));
   await page.locator('#sofa-bed-open').selectOption('closed');await capture('reclosed');await page.locator('#sofa-bed-open').selectOption('open');await capture('reopened');
   await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(run,mode+'-narrow.png')});
   await preview(page,base,run,mode);
   assert.deepEqual(errors,[]);results.push({mode,passed:true,controls:true,undoRedo:true,refresh:true,lock:true,productionEndpointParts:103,narrow:true,preview:true});await context.close();
  }
  fs.writeFileSync(path.join(run,process.argv.includes('--preview-only')?'preview.json':'toggle.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS sofa bed toggle controls and actual production endpoints: '+run);
 }finally{if(browser)await browser.close();await server.close();}
}
if(require.main===module)main(...process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
