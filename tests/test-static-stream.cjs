'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),Artifacts=require('../scripts/lib/test-artifacts.cjs'),{connect}=require('../desktop/backend.cjs');
(async()=>{
 const job=Artifacts.createRun({parent:path.join(root,'verification.noindex/server-verification'),prefix:'static-stream-'}),workspace=path.join(job.dir,'workspace');let backend,passed=false;
 try{
  fs.mkdirSync(workspace);job.copy(path.join(root,'src'),'workspace/src');for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));
  const folder=path.join(workspace,'public');fs.mkdirSync(folder);const name='测试 # asset.bin',data=Buffer.alloc(8*1024*1024);for(let i=0;i<data.length;i++)data[i]=i%251;fs.writeFileSync(path.join(folder,name),data);fs.writeFileSync(path.join(folder,'empty.js'),'');fs.writeFileSync(path.join(folder,'mime.js'),'const streamed=true;');
  const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));backend=await connect({root:workspace,executable:process.execPath,port});
  const url=backend.url+'public/'+encodeURIComponent(name),r=await fetch(url);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),crypto.createHash('sha256').update(data).digest('hex'));
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
  const empty=await fetch(backend.url+'public/empty.js');assert.equal(empty.status,200);assert.equal(await empty.text(),'');
  const js=await fetch(backend.url+'public/mime.js');assert.match(js.headers.get('content-type'),/javascript/);assert.equal(await js.text(),'const streamed=true;');
  for(const suffix of ['public/','public/missing.bin'])assert.equal((await fetch(backend.url+suffix)).status,404);
  assert.equal((await fetch(backend.url+'.local/private')).status,403);
  await new Promise((resolve,reject)=>{const req=http.get(url,res=>{res.once('data',()=>{req.destroy();resolve();});});req.on('error',e=>e.code==='ECONNRESET'?resolve():reject(e));});
  assert.equal((await fetch(backend.url+'public/mime.js')).status,200,'aborted asset must not kill server');passed=true;console.log('PASS streamed exact binary/Unicode URL, no-store/MIME, HEAD/empty, directory/missing/hidden refusal and client abort survival');
 }finally{await backend?.close();job.finish(passed);}
})().catch(e=>{console.error(e);process.exitCode=1;});
