'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const B=require('../scripts/blender-server.cjs'),S=require('../scripts/blender-sync-server.cjs');
function glb({duplicate=false,origin=[1200,3400],extra={},part={}}={}){const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},meshes:[{}],cameras:[{}],scenes:[{extras:{furnish:{syncSchema:1,unit:'m',plan:'Test',planId:'test',originMm:origin,...extra}}}],nodes:[{mesh:0,extras:{furnishObjectId:'f:a:/0',...part}},...(duplicate?[{mesh:0,extras:{furnishObjectId:'f:a:/0'}}]:[])]})),size=Math.ceil(json.length/4)*4,b=Buffer.alloc(20+size,32);b.writeUInt32LE(0x46546c67);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(size,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);return b;}
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-sync-'));fs.mkdirSync(path.join(root,'scripts'));fs.copyFileSync(path.join(__dirname,'../scripts/blender-sync-addon.py'),path.join(root,'scripts/blender-sync-addon.py'));
 const api=B.create(root,{discover:()=>null}),server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/api/furnish/blender/sync';
 async function req(route,options){const r=await fetch(base+route,options);return {code:r.status,data:await r.json()};}
 const headers={'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},data=glb();
 try{
  const status=(await req('/status')).data;assert.equal(status.token.length,48);assert.equal(status.latest,null);
  assert.equal((await req('/manifest')).code,403);
  assert.equal((await req('/publish',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:data})).code,403);
  for(const bad of [glb({duplicate:true}),glb({origin:[1]}),glb({extra:{planId:'../evil'}}),glb({extra:{syncSchema:0}})])assert.equal((await req('/publish',{method:'POST',headers,body:bad})).code,400);
  const first=(await req('/publish',{method:'POST',headers,body:data})).data;assert.equal(first.objects,1);assert.equal(first.revision,crypto.createHash('sha256').update(data).digest('hex'));
  const again=(await req('/publish',{method:'POST',headers,body:data})).data;assert.deepEqual(again,first);
  const auth={'X-Furnish-Sync':status.token};assert.equal((await req('/manifest',{headers:auth})).data.latest.revision,first.revision);
  const download=Buffer.from(await(await fetch(base+'/scene/'+first.revision,{headers:auth})).arrayBuffer());assert.deepEqual(download,data);
  const ackHeaders={...auth,'Content-Type':'application/json'};
  assert.equal((await req('/ack',{method:'POST',headers:ackHeaders,body:JSON.stringify({revision:'stale',state:'applied'})})).code,400);
  assert.equal((await req('/ack',{method:'POST',headers:ackHeaders,body:JSON.stringify({revision:first.revision,state:'applied',message:'updated'})})).code,200);
  assert.equal((await req('/status')).data.ack.state,'applied');
  const addon=await fetch(base+'/addon.zip');assert.equal(addon.headers.get('content-type'),'application/zip');const zip=Buffer.from(await addon.arrayBuffer());assert.equal(zip.readUInt32LE(0),0x04034b50);assert(zip.includes(Buffer.from('furnish_sync/__init__.py')));
  const restarted=S.create(root,{validateGLB:B.validateGLB});assert.equal(restarted.status().latest.revision,first.revision);assert.notEqual(restarted.status().token,status.token);
  assert.equal((await req('/publish',{method:'POST',headers,body:glb({extra:{partIdentity:2}})})).code,400);
  const modern=(await req('/publish',{method:'POST',headers,body:glb({extra:{partIdentity:2},part:{furnishPartVersion:2,furnishPartKey:'source:frame#0',furnishPartCount:1}})})).data;assert.equal((await req('/publish',{method:'POST',headers,body:glb({part:{furnishPartVersion:2,furnishPartKey:'x',furnishPartCount:1}})})).code,400);assert.equal(first.protocol,1);assert.equal(modern.protocol,2,'old receiver must reject v2 before importing');
  for(const part of [{furnishPartVersion:2,furnishPartKey:'x',furnishPartCount:0},{furnishPartVersion:2,furnishPartKey:'x',furnishPartCount:1,furnishPartAmbiguous:true}])assert.equal((await req('/publish',{method:'POST',headers,body:glb({extra:{partIdentity:2},part})})).code,400);
 }finally{api.close();await new Promise(r=>server.close(r));assert(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}
 console.log('PASS live sync: validated identities/origin, immutable revisions, deduplication, token/CSRF, ack, addon ZIP, persistence and token rotation');
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
