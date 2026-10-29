/* Offline asset publication, isolated background Blender; no web execution endpoint. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function main(args=process.argv.slice(2)){
 const [command,input]=args;
 if(!['author-se2','publish-se2'].includes(command)||!input)throw Error('Usage: node scripts/blender-asset.cjs author-se2 <new-directory> | publish-se2 <model.glb>');
 const source=path.resolve(input),output=path.join(root,'src/data/se2-blender-asset.js');
 if(command==='author-se2'&&['se2-v1.blend','se2-v1.glb'].some(name=>fs.existsSync(path.join(source,name))))throw Error('Use a new output directory to preserve existing Blender edits');
 if(command==='publish-se2'&&(!fs.statSync(source).isFile()||path.extname(source).toLowerCase()!=='.glb'))throw Error('Expected a static SE2 GLB');
 const blender=require('./blender-server.cjs').findBlender();if(!blender)throw Error('Blender not found; set FURNISH_BLENDER to the installed executable or Store launcher');
 const jobs=path.join(root,'.local/asset-jobs');fs.mkdirSync(jobs,{recursive:true});const job=fs.mkdtempSync(path.join(jobs,'se2-')),result=path.join(job,'result.json'),log=fs.createWriteStream(path.join(job,'blender.log'));
 const script=command==='author-se2'?'blender-model-se2.py':'publish-blender-asset.py';
 const child=cp.spawn(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,script),'--',source,...(command==='publish-se2'?[output]:[]),'--result',result],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let error;child.on('error',e=>error=e);child.on('exit',code=>{if(code)error=Error('Blender exited with '+code+'; inspect '+job);});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 // Store launchers exit before Blender; only a unique Python result confirms completion.
 try{
  const deadline=Date.now()+120000;
  while(!fs.existsSync(result)){if(error)throw error;if(Date.now()>deadline)throw Error('Blender timed out; inspect '+job);await new Promise(resolve=>setTimeout(resolve,250));}
  const outcome=JSON.parse(fs.readFileSync(result,'utf8'));if(!outcome.passed)throw Error(outcome.error+' (log: '+job+')');
  if(command==='publish-se2'){
   delete require.cache[output];const asset=require(output),hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(source)).digest('hex');if(asset.sourceSha256!==hash)throw Error('Published asset does not match input GLB');
  }
  console.log(JSON.stringify({command,input:source,output:command==='publish-se2'?output:source,...outcome}));
 }finally{child.stdout.unpipe(log);child.stderr.unpipe(log);log.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
