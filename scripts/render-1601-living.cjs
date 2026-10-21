/* Read-only capture of the saved 1601 production scene for the Blender interior study. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const V=require('./lib/browser-verification.cjs');
async function main(){
 const root=path.resolve(__dirname,'..'),source=path.join(root,'projects/workspace.furnish.json'),bytes=fs.readFileSync(source),hash=crypto.createHash('sha256').update(bytes).digest('hex'),saved=JSON.parse(bytes),workspace=saved.workspace;
 const output=path.resolve(process.argv[2]||'output/blender/1601-living-20261021');fs.mkdirSync(output,{recursive:true});
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=output;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;
 try{
  browser=await V.launch();const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/furnish/**',route=>route.fulfill({status:route.request().method()==='GET'?200:403,contentType:'application/json',body:JSON.stringify(route.request().method()==='GET'?{revision:hash,workspace}:{error:'Read-only render capture'})}));
  await page.goto(server.baseURL+'index.html');await page.waitForFunction(()=>!repositoryBooting);
  if(await page.evaluate(()=>PLAN.name)!=='1601')throw Error('Expected saved 1601 plan');
  const metadata=await page.evaluate(()=>({plan:PLAN.name,planId:PLAN.id,rooms:FurnishProject.effectivePlan(PLAN,state).rooms,physicalRooms:FurnishProject.effectivePlan(PLAN,state).physicalRooms,furniture:state.furniture,roomSettings:state.rooms,floorFinishes:state.floorFinishes,ceilingHeight:FurnishProject.ceilingHeight(state),windows:WINS,doors:DOORS,beams:PLAN.beams}));
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(1000);
  await page.evaluate(()=>{state.scene3d={...state.scene3d,cut:2.8,lamps:false,night:false,furn:true};View3D.sync();});
  const download=page.waitForEvent('download');await page.evaluate(async()=>{const data=await View3D.blenderScene({includeCeilings:true});download('1601-scene.glb',new Blob([data.buffer],{type:'model/gltf-binary'}));});await(await download).saveAs(path.join(output,'1601-scene.glb'));
  await page.screenshot({path:path.join(output,'production-overview.png'),animations:'disabled'});
  const glb=fs.readFileSync(path.join(output,'1601-scene.glb')),json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));metadata.export=json.scenes?.[0]?.extras||json.nodes?.find(n=>n.extras?.furnish)?.extras;metadata.gltf={meshes:json.meshes.length,nodes:json.nodes.length,materials:json.materials.length};metadata.source={path:source,sha256:hash};
  if(!metadata.export?.furnish)throw Error('Missing origin metadata');if(errors.length)throw Error(errors.join(';'));
  fs.writeFileSync(path.join(output,'1601-metadata.json'),JSON.stringify(metadata,null,2));
  if(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')!==hash)throw Error('Source workspace changed during capture');
  console.log('Captured saved 1601 production scene: '+output+'\n'+JSON.stringify(metadata.gltf));
 }finally{if(browser)await browser.close();await server.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
