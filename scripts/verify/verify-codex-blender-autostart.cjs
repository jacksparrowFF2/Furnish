'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),plugin=path.resolve(process.env.FURNISH_CODEX_PLUGIN_ROOT||path.join(root,'plugins/furnish-blender'));
const {Client,request}=require(path.join(plugin,'mcp/client.cjs'));
async function nativeMcp(data,port){
 const declaration=JSON.parse(fs.readFileSync(path.join(plugin,'.mcp.json'))).mcpServers.furnish_blender;
 const child=spawn(declaration.command,declaration.args,{cwd:path.resolve(plugin,declaration.cwd||'.'),env:{...process.env,...declaration.env,FURNISH_BLENDER_DATA:data,FURNISH_BLENDER_PORT:String(port),FURNISH_BLENDER_AUTO_GUI:'1',CODEX_THREAD_ID:'autostart-native-mcp'},windowsHide:true,stdio:['pipe','pipe','pipe']});
 const waiting=new Map();let buffer='',sequence=0,stderr='';child.stdout.setEncoding('utf8');child.stderr.on('data',b=>stderr=(stderr+b).slice(-4000));
 child.stdout.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;const message=JSON.parse(line),pending=waiting.get(message.id);if(pending){waiting.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(Error(JSON.stringify(message.error))):pending.resolve(message.result);}}});
 const rejectAll=e=>{for(const pending of waiting.values()){clearTimeout(pending.timer);pending.reject(e);}waiting.clear();};child.on('error',rejectAll);child.on('close',()=>rejectAll(Error('MCP exited: '+stderr)));
 function rpc(method,params){const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiting.delete(id);reject(Error('MCP timed out: '+stderr));},55000);waiting.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
 try{
  await rpc('initialize',{protocolVersion:'2025-06-18',clientInfo:{name:'autostart-verification',version:'1.0.0'},capabilities:{}});child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const result=await rpc('tools/call',{name:'blender_inspect',arguments:{command:'get_addon_info'}});assert(!result.isError,JSON.stringify(result));assert.equal(result.structuredContent.ok,true);return result;
 }finally{if(child.exitCode===null&&child.signalCode===null){const closed=new Promise(r=>child.once('close',r));const timer=setTimeout(()=>child.kill(),5000);child.stdin.end();await closed;clearTimeout(timer);}}
}
async function main(){
 const parent=path.join(root,'output/codex-blender-autostart');fs.mkdirSync(parent,{recursive:true});const data=fs.mkdtempSync(path.join(parent,'verify-'));
 process.env.FURNISH_BLENDER=require('../blender-server.cjs').findBlender();
 const gateway=await require(path.join(plugin,'mcp/gateway.cjs')).start({data,port:0});const port=gateway.identity.port;
 const a=new Client({data,port,session:'auto-one'}),b=new Client({data,port,session:'auto-two'}),report={passed:false,data,plugin,checks:[]};
 try{
  await a.execute('blender_session',{action:'doctor'});await a.execute('blender_op',{op:'catalog'});await a.execute('blender_inspect',{});assert.equal(gateway.gui.children.size,0);report.checks.push('doctor and catalogs do not launch GUI');
  const unowned=await request(port,a.key,{},'/codex/gui',{});assert.equal(unowned.ok,false);assert.equal(gateway.gui.children.size,0);report.checks.push('missing caller identity is rejected without crashing or opening a GUI');
  const inspection=await a.execute('blender_inspect',{command:'get_addon_info'});assert.equal(inspection.ok,true,JSON.stringify(inspection));assert.equal(gateway.gui.children.size,1);report.checks.push('real inspect call auto-opens and connects Blender');
  const first=await a.ready();const [same1,same2]=await Promise.all([a.ready(),a.ready()]);assert.equal(same1.instanceId,first.instanceId);assert.equal(same2.instanceId,first.instanceId);assert.equal(gateway.gui.children.size,1);
  const mark=await a.execute('blender_py',{code:'bpy.context.scene["autostart_probe"] = "first"\nprint("AUTO_FIRST")'});assert.equal(mark.ok,true,JSON.stringify(mark));
  const image=await a.execute('blender_see',{viewpoint:'custom',args:{from:[4,-4,3],look_at:[0,0,0],width:544,height:544,shading:'SOLID'}});assert(image.png?.length>1000);fs.writeFileSync(path.join(data,'auto-gui.png'),image.png);report.checks.push('repeated GUI calls reuse window, run Python and return PNG');
  const second=await b.ready();assert.notEqual(second.instanceId,first.instanceId);assert.equal(gateway.gui.children.size,2);
  for(const [client,instance] of [[a,first],[b,second]]){const d=await client.execute('blender_session',{action:'doctor'});assert.equal(d.kind,'ok',JSON.stringify(d));assert.equal(d.readiness.instanceId,instance.instanceId);}report.checks.push('doctor reports each caller attached instance with multiple GUI windows');
  const separate=await b.execute('blender_py',{code:'assert "autostart_probe" not in bpy.context.scene\nbpy.context.scene["autostart_probe"] = "second"\nprint("AUTO_SECOND")'});assert.equal(separate.ok,true,JSON.stringify(separate));
  const original=await a.execute('blender_py',{code:'assert bpy.context.scene["autostart_probe"] == "first"\nprint("AUTO_PRESERVED")'});assert.equal(original.ok,true,JSON.stringify(original));report.checks.push('two caller windows route independently and preserve unsaved state');
  const saved=await b.execute('blender_py',{code:'bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)\nprint("SAVED_SECOND")'});assert.equal(saved.ok,true,JSON.stringify(saved));
  const closedChild=gateway.gui.children.get(second.instanceId),closed=new Promise(r=>closedChild.once('close',r));closedChild.kill();await closed;
  for(let i=0;i<50&&gateway.app.addonGateway.list().some(x=>x.instanceId===second.instanceId&&x.ready);i++)await new Promise(r=>setTimeout(r,100));
  await b.ready();const restored=await b.execute('blender_py',{code:'assert bpy.context.scene["autostart_probe"] == "second"\nprint("REOPENED_SAVED_SECOND")'});assert.equal(restored.ok,true,JSON.stringify(restored));report.checks.push('closed managed window is reopened from its saved workspace');
  const paused=await a.execute('blender_py',{code:'bpy.context.scene.dshbb_ai_paused = True\nprint("PAUSED")'});assert.equal(paused.ok,true,JSON.stringify(paused));
  const denied=await a.execute('blender_py',{code:'print("SHOULD_NOT_EXECUTE")'});assert.equal(denied.ok,false,JSON.stringify(denied));assert.equal(gateway.gui.children.size,2);report.checks.push('human pause refusal does not relaunch or replace a window');
  await nativeMcp(data,port);assert.equal(gateway.gui.children.size,3);report.checks.push('actual MCP tools/call launched from the declared command/cwd auto-opens and connects its own GUI');
  report.instances=[first.instanceId,second.instanceId];report.passed=true;
 }finally{
  await a.release();await b.release();
  for(const child of gateway.gui.children.values()){if(child.exitCode===null){const closed=new Promise(r=>child.once('close',r));child.kill();await closed;}}
  gateway.stop();report.finished=new Date().toISOString();fs.writeFileSync(path.join(data,'report.json'),JSON.stringify(report,null,2));console.log('Report: '+path.join(data,'report.json'));
 }
 return report;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
