'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {workspaceRoot,localPage,externalPage}=require('../desktop/policy.cjs');
const {connect}=require('../desktop/backend.cjs');
const root=fs.realpathSync(path.resolve(__dirname,'..'));
async function port(){const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const n=server.address().port;await new Promise(r=>server.close(r));return n;}
(async()=>{
 assert.equal(workspaceRoot({appRoot:root}),root);
 assert.equal(workspaceRoot({appRoot:'missing',config:{root}}),root);
 assert.throws(()=>workspaceRoot({appRoot:root,config:{root:path.join(root,'missing')}}),/不存在/);
 assert.equal(workspaceRoot({appRoot:'missing',override:root}),root);
 const base='http://127.0.0.1:8765/';
 for(const target of [base,base+'index.html?x=1#design'])assert.ok(localPage(target,base));
 for(const target of ['http://127.0.0.1:8766/','https://example.com/','file:///C:/Windows/a','javascript:alert(1)','invalid'])assert.ok(!localPage(target,base));
 for(const target of ['https://example.com/','http://example.com/'])assert.ok(externalPage(target));
 for(const target of ['file:///C:/a','javascript:alert(1)','data:text/html,x','shell:abc'])assert.ok(!externalPage(target));
 await assert.rejects(connect({root,executable:process.execPath,port:0}),/FURNISH_PORT/);
 const chosen=await port(),first=await connect({root,executable:process.execPath,port:chosen});
 try{
  assert.equal(first.owned,true);
  const second=await connect({root,executable:process.execPath,port:chosen});assert.equal(second.owned,false);
  await second.close();assert.equal((await fetch(first.url)).status,200,'Closing a borrowed service cannot stop it');
  assert.equal((await fetch(first.url+'api/furnish/blender/status')).status,200);
 }finally{await first.close();}
 await assert.rejects(fetch(first.url));
 // Upgrade through the same production restart protocol, with no source/data mutation.
 const output=path.join(root,'output');fs.mkdirSync(output,{recursive:true});
 const isolated=fs.mkdtempSync(path.join(output,'desktop-backend-'));
 let prior,updated;
 try{
  fs.mkdirSync(path.join(isolated,'scripts'));
  for(const file of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',file),path.join(isolated,'scripts',file));
  fs.cpSync(path.join(root,'src'),path.join(isolated,'src'),{recursive:true});
  prior=await connect({root:fs.realpathSync(isolated),executable:process.execPath,port:chosen});
  const old=(await (await fetch(prior.url+'api/furnish/server')).json()).pid;
  fs.appendFileSync(path.join(isolated,'scripts/serve.cjs'),'\n// Backend update for restart acceptance.\n');
  updated=await connect({root:fs.realpathSync(isolated),executable:process.execPath,port:chosen});
  const current=await (await fetch(updated.url+'api/furnish/server')).json();
  assert.notEqual(current.pid,old);assert.equal(updated.owned,true);
 }finally{
  if(updated)await updated.close();if(prior)await prior.close();
  assert.ok(path.resolve(isolated).startsWith(path.resolve(output)+path.sep));fs.rmSync(isolated,{recursive:true,force:true});
 }
 const occupied=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'other'}));});
 await new Promise(r=>occupied.listen(chosen,'127.0.0.1',r));
 try{await assert.rejects(connect({root,executable:process.execPath,port:chosen}),/其他目录|其他服务|占用/);}finally{await new Promise(r=>occupied.close(r));}
 assert.throws(()=>require('../scripts/package-desktop.cjs').build({out:root}),/输出目录已存在/);
 console.log('Desktop: workspace resolution, navigation, owned/shared backend, graceful shutdown, port conflict and non-overwrite packaging passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
