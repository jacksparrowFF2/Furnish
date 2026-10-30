/* Three reproducible views, exported by the real production entry. Private fixture only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const V=require('../lib/browser-verification.cjs');
const views=Object.freeze([
 {id:'front',position:[0,.43,2.25],target:[0,.43,0],angle:0},
 {id:'oblique',position:[1.45,1.1,2],target:[0,.43,.08],angle:0},
 {id:'open',position:[1.65,1.2,2.65],target:[-.22,.43,.08],angle:110}
]);
async function main(root,output){
 root=path.resolve(root);output=path.resolve(output);
 if(root===V.projectRoot)throw Error('Studio requires an isolated workspace');
 fs.mkdirSync(output,{recursive:true});const server=await V.staticServer(root);
 process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;
 let browser;const errors=[],external=[];
 try{
  browser=await V.launch();const page=await browser.newPage({viewport:{width:1000,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(server.baseURL).origin)external.push(r.url());});
  await page.goto(server.baseURL+'index.html');
  await page.evaluate(()=>{
   // Real plan coordinates require a valid two-dimensional wall baseline.
   const plan={...PLANS[0],id:'asset-studio-v1',name:'隔离产品验收',walls:[[-3000,-3000,3000,-3000,'e'],[-3000,-3000,-3000,3000,'e']],wins:[],doors:[],slides:[],rooms:[{id:'studio',name:'产品验收',poly:[[-3000,-3000],[3000,-3000],[3000,3000],[-3000,3000]],at:[0,0],mat:'tile800'}],dims:[],bounds:{x:-3000,y:-3000,w:6000,h:6000},defaults:[]};
   PLANS.push(plan);setPlan(plan.id);mutate(()=>{state.furniture=[{id:'blender-pilot',name:'TG10K60W',type:'washer_littleswan_tg10k60w',w:595,d:560,h:850,mountHeight:0,washerDoorAngle:0,cx:0,cy:0,rot:0,flip:false,color:'#f1f0ed'}];});
  });
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);
  const results=[];
  for(const view of views){
   const out=await page.evaluate(async view=>{
    mutate(()=>state.furniture[0].washerDoorAngle=view.angle);
    const T=await import('three'),base=FurnishProducts.floorBase(FurnishProject.effectivePlan(PLAN,state),state.furniture[0],state.furniture),y=base.z/1000;
    const camera=new T.PerspectiveCamera(36,1,.01,50);camera.position.set(view.position[0],view.position[1]+y,view.position[2]);camera.lookAt(view.target[0],view.target[1]+y,view.target[2]);camera.updateMatrixWorld(true);
    // Explicit, fixed white key light; worker supplies its standard AgX/world.
    const sun=new T.DirectionalLight(0xffffff,2000);sun.position.set(-2,4+y,4);sun.target.position.set(0,.43+y,0);sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);
    // Keep the product's visible production meshes; omit hidden room ceilings
    // so a layout-only ceiling does not cast a shadow over the test product.
    const before=JSON.stringify(state),snapshot=await View3D.blenderScene({camera,sun,includeHidden:false,expandInstances:true});
    if(JSON.stringify(state)!==before)throw Error('Studio export mutated fixture state');
    return {buffer:Array.from(new Uint8Array(snapshot.buffer)),floorBase:base};
   },view);
   const bytes=Buffer.from(out.buffer),doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),parts=doc.nodes.filter(n=>n.extras?.furnishId==='blender-pilot');
   assert.equal(parts.length,47);assert(parts.every(n=>n.extras.furnishPartKey?.startsWith('explicit:washer-tg10k60w-v1:')));
   assert(!doc.nodes.some(n=>n.mesh!==undefined&&n.extras?.furnishVisible===false),'Studio exported hidden architecture');
   fs.writeFileSync(path.join(output,view.id+'.glb'),bytes);results.push({...view,parts:parts.length,floorBase:out.floorBase});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const report={passed:true,preset:'tg10k60w-studio-v1',productionExporter:true,dimensionsMm:[595,560,850],camera:{fov:36,aspect:1},lighting:{keyIntensity:2000,keyPosition:[-2,4,4],world:'production-worker',exposure:0,viewTransform:'AgX'},views:results};
  fs.writeFileSync(path.join(output,'studio.json'),JSON.stringify(report,null,2));return report;
 }finally{if(browser)await browser.close();await server.close();}
}
if(require.main===module)main(process.argv[2],process.argv[3]).then(()=>console.log('PASS studio')).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main,views};
