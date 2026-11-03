/* Exercise the real render/download API with the embedded production sample GLB. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),run=path.join(root,'output/art-glass-verification');
async function main(){
 const api=require('../blender-server.cjs').create(path.join(run,'workspace'));
 const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/furnish/blender`;
 try{
  const response=await fetch(base+'/jobs?quality=preview&width=960&height=960&device=gpu&source=basic&camera=source',{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:fs.readFileSync(path.join(run,'samples.glb'))});
  let job=await response.json();assert.equal(response.status,202,JSON.stringify(job));const deadline=Date.now()+180000;
  while(!['done','failed','cancelled'].includes(job.state)){
   if(Date.now()>deadline)throw Error('render timeout');await new Promise(r=>setTimeout(r,700));job=await (await fetch(base+'/jobs/'+job.id)).json();
  }
  assert.equal(job.state,'done',JSON.stringify(job));assert.equal(job.renderDevice.type,'GPU');
  for(const [route,file] of [['image','api-render.png'],['blend','api-download.blend'],['scene','api-download.glb']]){const r=await fetch(`${base}/jobs/${job.id}/${route}`);assert.equal(r.status,200);fs.writeFileSync(path.join(run,file),Buffer.from(await r.arrayBuffer()));}
  fs.writeFileSync(path.join(run,'api-results.json'),JSON.stringify(job,null,2));console.log('PASS real render API: '+job.renderDevice.backend+', PNG/BLEND/GLB download');
 }finally{api.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
