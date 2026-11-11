/* Real pinned engine + real Blender, isolated from the user's GUI and project data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),plugin=path.resolve(process.env.FURNISH_CODEX_PLUGIN_ROOT||path.join(root,'plugins/furnish-blender'));
const {Client,request}=require(path.join(plugin,'mcp/client.cjs'));
async function main(){
 const parent=path.join(root,'output/codex-blender');fs.mkdirSync(parent,{recursive:true});
 const data=fs.mkdtempSync(path.join(parent,'verify-'));
 process.env.FURNISH_BLENDER=require('../blender-server.cjs').findBlender();if(!process.env.FURNISH_BLENDER)throw Error('Blender not found');
 const {start}=require(path.join(plugin,'mcp/gateway.cjs'));
 const gateway=await start({data,port:0}),port=gateway.identity.port,client=new Client({data,port,session:'verification-'+Date.now()});
 const report={passed:false,started:new Date().toISOString(),plugin,blender:process.env.FURNISH_BLENDER,data,checks:[]};let gui;
 try{
  assert.equal((await client.ensure()).name,'furnish-codex-blender');
  assert.equal((await request(port,'wrong',{},'/codex/identity')).ok,false);report.checks.push('loopback bearer authentication');
  const catalog=await client.execute('blender_op',{op:'catalog'});assert.equal(catalog.ok,true);assert(catalog.result);report.checks.push('upstream operation catalog');
  await assert.rejects(()=>client.execute('blender_py',{code:'print(1)'}),/session|attach/i);report.checks.push('GUI execution refuses missing session');
  await assert.rejects(()=>client.execute('blender_inspect',{command:'execute_code',args:{code:'print(1)'}}),/read-only/);report.checks.push('read-only inspection rejects writes');
  const marker=path.join(data,'headless-proof.json');
  const script='import bpy, json\nfrom pathlib import Path\nbpy.ops.mesh.primitive_cube_add(size=0.4)\ncube=bpy.context.object\ncube.name="CodexProof"\nPath('+JSON.stringify(marker)+').write_text(json.dumps({"blender":bpy.app.version_string,"size":list(cube.dimensions)}))\nprint("CODEX_HEADLESS_OK")';
  const submit=await client.execute('blender_run',{action:'submit',args:{kind:'headless',script,outdir:path.join(data,'artifacts'),timeout_ms:60000}});
  assert.equal(submit.ok,true,JSON.stringify(submit));const id=submit.job.id;report.jobId=id;
  let waited;for(let i=0;i<5;i++){waited=await client.execute('blender_run',{action:'wait',id,args:{timeout_ms:20000}});if(['completed','failed','canceled'].includes(waited.job?.state))break;}
  assert.equal(waited.job?.state,'completed',JSON.stringify(waited));
  const collected=await client.execute('blender_run',{action:'collect',id});report.job=collected;
  const proof=JSON.parse(fs.readFileSync(marker));assert(proof.size.every(v=>Math.abs(v-0.4)<1e-6));report.proof=proof;report.checks.push('real Blender headless submit / wait / collect and geometry');
  const blend=path.join(data,'saved-source.blend'),savedMarker=path.join(data,'saved-marker.json');
  const author=await client.execute('blender_run',{action:'submit',args:{kind:'headless',script:'import bpy\nbpy.context.scene["codex_source_marker"]="preserved"\nbpy.ops.wm.save_as_mainfile(filepath='+JSON.stringify(blend)+')',timeout_ms:60000}});
  let authored=await client.execute('blender_run',{action:'wait',id:author.job.id,args:{timeout_ms:30000}});assert.equal(authored.job.state,'completed',JSON.stringify(authored));
  const reopen=await client.execute('blender_run',{action:'submit',args:{kind:'headless',file:blend,script:'import bpy, json\nfrom pathlib import Path\nassert bpy.context.scene.get("codex_source_marker")=="preserved"\nPath('+JSON.stringify(savedMarker)+').write_text(json.dumps({"source_preserved":True}))',timeout_ms:60000}});
  const reopened=await client.execute('blender_run',{action:'wait',id:reopen.job.id,args:{timeout_ms:30000}});assert.equal(reopened.job.state,'completed',JSON.stringify(reopened));assert(JSON.parse(fs.readFileSync(savedMarker)).source_preserved);report.checks.push('saved blend scene survives headless file loading');
  const rendering=await client.execute('blender_run',{action:'submit',args:{kind:'render',file:blend,output:path.join(data,'render/'),outdir:path.join(data,'render'),resolution:[128,128],engine:'BLENDER_WORKBENCH',frames:1,timeout_ms:60000}});
  const rendered=await client.execute('blender_run',{action:'wait',id:rendering.job.id,args:{timeout_ms:30000}});assert.equal(rendered.job.state,'completed',JSON.stringify(rendered));report.render=await client.execute('blender_run',{action:'collect',id:rendering.job.id});assert(report.render.job.artifacts.some(p=>p.endsWith('.png')));report.checks.push('saved blend declarative render returns actual PNG');
  const failed=await client.execute('blender_run',{action:'submit',args:{kind:'headless',script:'raise RuntimeError("CODEX_EXPECTED_FAILURE")',timeout_ms:60000}});let failure;
  for(let i=0;i<5;i++){failure=await client.execute('blender_run',{action:'wait',id:failed.job.id,args:{timeout_ms:20000}});if(['completed','failed','canceled'].includes(failure.job?.state))break;}
  assert.equal(failure.job?.state,'failed',JSON.stringify(failure));report.checks.push('real Python failure preserved as failed job');
  const doctor=await client.execute('blender_session',{action:'doctor'});report.guiDoctor=doctor.kind;report.checks.push('GUI doctor recorded separately (no addon in headless test)');
  if(process.argv.includes('--gui')){
   const startup=path.join(data,'gui-start.py'),extension=path.join(plugin,'vendor/dsh/extension');
   fs.writeFileSync(startup,'import sys, bpy\nsys.dont_write_bytecode=True\nsys.path.insert(0,'+JSON.stringify(extension)+')\nimport dsh_blender_bridge\ndsh_blender_bridge.register()\nbpy.ops.dshbb.start_server()\n');
   const log=fs.openSync(path.join(data,'gui.log'),'a');
   gui=spawn(process.env.FURNISH_BLENDER,['--factory-startup','--disable-autoexec','--python',startup],{env:{...process.env,BLENDER_USER_CONFIG:path.join(data,'gui-config'),BLENDER_USER_SCRIPTS:path.join(data,'gui-scripts'),DSHBB_GATEWAY_PORT:String(port)},windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
   let guiError;gui.on('error',e=>{guiError=e;});
   let instances;for(let i=0;i<80;i++){if(guiError)throw guiError;instances=await client.execute('blender_session',{action:'list'});if(instances.instances?.some(x=>x.ready))break;await new Promise(r=>setTimeout(r,500));}
   assert(instances.instances?.some(x=>x.ready),'Isolated addon never connected; inspect gui.log');
   const attached=await client.execute('blender_session',{action:'attach',args:{instance_id:instances.instances.find(x=>x.ready).instanceId}});assert.equal(attached.ok,true,JSON.stringify(attached));
   const inspection=await client.execute('blender_inspect',{command:'get_addon_info'});assert.equal(inspection.ok,true,JSON.stringify(inspection));
   const executed=await client.execute('blender_py',{code:'import bpy\nprint("CODEX_GUI_OK", bpy.app.version_string)'});assert.equal(executed.ok,true,JSON.stringify(executed));assert(executed.stdout.includes('CODEX_GUI_OK'));
   const frame=await client.execute('blender_see',{viewpoint:'custom',args:{from:[4,-4,3],look_at:[0,0,0],width:544,height:544,shading:'SOLID'}});assert(frame.png?.length>1000,JSON.stringify(frame));fs.writeFileSync(path.join(data,'gui.png'),frame.png);
   const measurement=await client.execute('blender_op',{op:'img_measure',args:{path:path.join(data,'gui.png'),px_per_mm:2,targets:[{key:'known_fixture_length',px:200,expect_mm:100}]}});assert.equal(measurement.ok,true,JSON.stringify(measurement));report.measurement=measurement;assert.equal(measurement.result.ok,true,JSON.stringify(measurement));assert(Math.abs(measurement.result.rows[0].value_mm-100)<1e-6);report.checks.push('upstream calibrated measurement: 200px at 2px/mm = 100mm (test fixture, not product dimensions)');
   const unscaled=await client.execute('blender_op',{op:'img_measure',args:{path:path.join(data,'gui.png'),targets:[{key:'unknown_length',px:200}]}});assert.equal(unscaled.result.ok,false,JSON.stringify(unscaled));assert.equal(unscaled.result.verdict,'needs_scale');assert(require(path.join(plugin,'mcp/server.cjs')).result(unscaled).isError);report.checks.push('unscaled measurement returns needs_scale and MCP isError instead of invented millimeters');
   const ready=await client.execute('blender_session',{action:'doctor'});assert.equal(ready.kind,'ok',JSON.stringify(ready));report.guiDoctor=ready.kind;report.guiFrame=path.join(data,'gui.png');report.checks.push('isolated GUI addon handshake, attach, inspection, Python, custom native image and doctor=ok');
   const pause=await client.execute('blender_session',{action:'resume'});assert.equal(pause.ok,false);report.checks.push('agent cannot override human pause');
  }
  report.passed=true;
 }finally{await client.release();if(gui){const closed=new Promise(r=>gui.once('close',r));gui.kill();await closed;}gateway.stop();report.finished=new Date().toISOString();fs.writeFileSync(path.join(data,'report.json'),JSON.stringify(report,null,2));console.log('Report: '+path.join(data,'report.json'));}
 return report;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
