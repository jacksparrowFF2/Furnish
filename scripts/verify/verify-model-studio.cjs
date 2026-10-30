/* Fixed orientations, framing derived from actual nominal + operating production bounds. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
function viewsFor(profile,bounds){
 const target=bounds[0].map((v,i)=>(v+bounds[1][i])/2),radius=Math.max(.04,Math.hypot(...bounds[1].map((v,i)=>(v-bounds[0][i])/2))),distance=radius/Math.sin(Math.PI/10)*1.15;
 const view=(id,direction,state)=>{const length=Math.hypot(...direction);return {id,state,target,position:target.map((v,i)=>v+direction[i]*distance/length)};};
 return [view('front',[0,0,1],'nominal'),view('oblique',[1,.55,1.4],'nominal'),profile.alternateKind!=='back'?view('open',[1,.5,1.4],'alternate'):profile.detailView==='underside'?{...view('detail',[1,-1,1],'nominal'),lightDirection:[-4,-2,8]}:view('back',[-1,.4,-1.4],'nominal')];
}
async function main(root,output,id='washer-tg10k60w'){
 root=path.resolve(root);output=path.resolve(output);if(root===V.projectRoot)throw Error('Studio requires an isolated workspace');
 const profile=require(path.join(root,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id===id);assert(profile,'Unknown studio profile');
 fs.mkdirSync(output,{recursive:true});const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;const errors=[];
 try{
  browser=await V.launch();const page=await browser.newPage({viewport:{width:1000,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto(server.baseURL+'index.html');await F.install(page,profile);
  const productionFile=path.join(output,'../browser/production.json'),production=fs.existsSync(productionFile)?JSON.parse(fs.readFileSync(productionFile)):null,bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
  for(const state of ['nominal',...(profile.alternateKind!=='back'?['alternate']:[])]){
   let geometry=production?.exports.find(e=>e.mode==='http'&&e.state===state)?.geometry;
   if(!geometry){await page.evaluate(f=>mutate(()=>{state.furniture=f;}),[state==='nominal'?profile.fixture:profile.alternate,...(profile.companions||[])]);geometry=await F.capture(page,path.join(output,'seed-'+state+'.glb'));}
   for(let i=0;i<3;i++){bounds[0][i]=Math.min(bounds[0][i],geometry.bounds[0][i]);bounds[1][i]=Math.max(bounds[1][i],geometry.bounds[1][i]);}
  }
  const views=viewsFor(profile,bounds),results=[];
  for(const view of views){await page.evaluate(f=>mutate(()=>{state.furniture=f;}),[view.state==='nominal'?profile.fixture:profile.alternate,...(profile.companions||[])]);const before=await page.evaluate(()=>JSON.stringify(state)),geometry=await F.capture(page,path.join(output,view.id+'.glb'),view);assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);results.push({...view,geometry});}
  assert.deepEqual(errors,[]);const report={passed:true,profile:id,preset:'model-studio-v2',productionExporter:true,framing:'union of actual nominal and operating production vertices',bounds,camera:{fov:36,aspect:1},lighting:{keyIntensityLux:2000,world:'production-worker',exposure:0,viewTransform:'AgX'},views:results};
  fs.writeFileSync(path.join(output,'studio.json'),JSON.stringify(report,null,2));return report;
 }finally{if(browser)await browser.close();await server.close();}
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS model studio')).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main,viewsFor};
