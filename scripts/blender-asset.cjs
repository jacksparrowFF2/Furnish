/* Offline asset publication, isolated background Blender; no web execution endpoint. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function main(args=process.argv.slice(2)){
 const [command,input]=args,match=/^(author|publish)-(se2|y52y09|fridge|dishwasher)$/.exec(command||'');
 if(!match||!input)throw Error('Usage: node scripts/blender-asset.cjs author-<se2|y52y09|fridge|dishwasher> <new-directory> | publish-<se2|y52y09|fridge|dishwasher> <model.glb>');
 const [,operation,profile]=match,source=path.resolve(input),output=path.join(root,'src/data/'+profile+'-blender-asset.js');
 if(operation==='author'&&[profile+'-v1.blend',profile+'-v1.glb'].some(name=>fs.existsSync(path.join(source,name))))throw Error('Use a new output directory to preserve existing Blender edits');
 if(operation==='publish'&&(!fs.statSync(source).isFile()||path.extname(source).toLowerCase()!=='.glb'))throw Error('Expected a static '+profile+' GLB');
 const blender=require('./blender-server.cjs').findBlender();if(!blender)throw Error('Blender not found; set FURNISH_BLENDER to the installed executable or Store launcher');
 const jobs=path.join(root,'.local/asset-jobs');fs.mkdirSync(jobs,{recursive:true});const job=fs.mkdtempSync(path.join(jobs,profile+'-')),result=path.join(job,'result.json'),log=fs.createWriteStream(path.join(job,'blender.log'));
 const spec=path.join(job,'spec.json');if(profile==='fridge'){const C=require('../src/core/fridge-core.js'),P=require('../src/core/product-rules.js'),f={type:'fridge_french_drawer',w:833,d:595,h:1910};fs.writeFileSync(spec,JSON.stringify({parts:C.reference(),motions:C.motions(f),size:P.definition(f).fridgeMotion.size}));}
 if(profile==='dishwasher')fs.writeFileSync(spec,JSON.stringify(require('../src/core/dishwasher-fold-core.js').spec()));
 const script=operation==='author'?'blender-model-'+profile+'.py':'publish-blender-asset.py';
 const child=cp.spawn(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,script),'--',source,...(operation==='publish'?[output,'--profile',profile]:[]),...(['fridge','dishwasher'].includes(profile)?['--spec',spec]:[]),'--result',result],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let error;child.on('error',e=>error=e);child.on('exit',code=>{if(code)error=Error('Blender exited with '+code+'; inspect '+job);});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 // Store launchers exit before Blender; only a unique Python result confirms completion.
 try{
  const deadline=Date.now()+120000;
  while(!fs.existsSync(result)){if(error)throw error;if(Date.now()>deadline)throw Error('Blender timed out; inspect '+job);await new Promise(resolve=>setTimeout(resolve,250));}
  const outcome=JSON.parse(fs.readFileSync(result,'utf8'));if(!outcome.passed)throw Error(outcome.error+' (log: '+job+')');
  if(operation==='publish'){
   delete require.cache[output];const asset=require(output),hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(source)).digest('hex');if(asset.sourceSha256!==hash)throw Error('Published asset does not match input GLB');
  }
  console.log(JSON.stringify({command,input:source,output:operation==='publish'?output:source,...outcome}));
 }finally{child.stdout.unpipe(log);child.stderr.unpipe(log);log.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
