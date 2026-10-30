/* Actual local API, bounded wait, downloads, PNG header verification. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const B=require('../blender-server.cjs');
async function render(root,input,output,device='auto'){
 fs.mkdirSync(output,{recursive:true});B.validateGLB(fs.readFileSync(input));
 const bridge=B.create(root),server=http.createServer((req,res)=>bridge.handle(req,res));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(base+`/api/furnish/blender/jobs?quality=preview&width=512&height=512&device=${device}`,{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:fs.readFileSync(input)});
  let job=await response.json();assert.equal(response.status,202,JSON.stringify(job));const deadline=Date.now()+8*60*1000;
  while(['starting','importing','rendering','cancelling'].includes(job.state)){
   if(Date.now()>deadline)throw Error('Render API timed out: '+job.id);
   await new Promise(r=>setTimeout(r,1000));job=await(await fetch(base+'/api/furnish/blender/jobs/'+job.id)).json();
  }
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(job,null,2));assert.equal(job.state,'done',job.message);
  for(const [key,name]of [['image','render.png'],['blend','scene.blend'],['scene','scene.glb']]){
   const response=await fetch(base+job[key]);assert(response.ok,'Download failed: '+key);fs.writeFileSync(path.join(output,name),Buffer.from(await response.arrayBuffer()));
  }
  const png=fs.readFileSync(path.join(output,'render.png'));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);
  if(device==='gpu')assert.equal(job.renderDevice?.type,'GPU');return {passed:true,renderDevice:job.renderDevice,size:[512,512]};
 }finally{bridge.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}
}
module.exports={render};
