/* Explicit real Blender acceptance against a previously exported GLB. No user project is opened/saved. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const B=require('../blender-server.cjs');
async function main(){
 const root=path.resolve(__dirname,'../..'),input=path.resolve(process.argv[2]||'output/playwright/blender/http-scene.glb'),output=path.join(root,'output/playwright/blender');fs.mkdirSync(output,{recursive:true});
 const scene=B.validateGLB(fs.readFileSync(input));console.log('Input meshes: '+scene.meshes.length+'; extensions: '+(scene.extensionsUsed||[]).join(', '));
 console.log('Blender: '+B.findBlender());const bridge=B.create(root),server=http.createServer((req,res)=>bridge.handle(req,res));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(base+'/api/furnish/blender/jobs?quality=preview&width=320&height=224&device='+(process.argv[3]||'auto'),{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'},body:fs.readFileSync(input)});let job=await response.json();if(!response.ok)throw Error(JSON.stringify(job));
  let previous='';while(['starting','importing','rendering','cancelling'].includes(job.state)){
   if(job.state!==previous){console.log(job.state+': '+job.message);previous=job.state;}
   await new Promise(r=>setTimeout(r,1000));const status=await fetch(base+'/api/furnish/blender/jobs/'+job.id);job=await status.json();
  }
  fs.writeFileSync(path.join(output,'local-result.json'),JSON.stringify(job,null,2));if(job.state!=='done')throw Error(JSON.stringify(job));
  for(const [key,name]of [['image','render.png'],['blend','scene.blend'],['scene','scene.glb']]){
   const r=await fetch(base+job[key]);if(!r.ok)throw Error('Result download failed: '+key);fs.writeFileSync(path.join(output,name),Buffer.from(await r.arrayBuffer()));
  }
  console.log('Actual device: '+JSON.stringify(job.renderDevice));if(process.argv[3]==='gpu'&&job.renderDevice?.type!=='GPU')throw Error('GPU-only job did not use GPU');
  console.log('PASS real Blender import, Cycles rendering and PNG/BLEND/GLB downloads: '+output);
 }finally{bridge.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
