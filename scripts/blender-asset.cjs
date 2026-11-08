/* Offline asset publication, isolated background Blender; no web execution endpoint. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),supplies=require('./lib/storage-supply-specs.json');
async function main(args=process.argv.slice(2)){
 const garment=/^(author|publish)-(garment-short-down|garment-long-down|garment-autumn-jacket)$/.exec(args[0]||'');
 if(garment){
  const [,operation,profile]=garment,input=path.resolve(args[1]||''),blender=require('./blender-server.cjs').findBlender();
  if(!args[1]||!blender)throw Error('Garment input and installed Blender required');
  const script=operation==='author'?'blender-model-garment-photos.py':'publish-garment-photos.py';
  const argv=operation==='author'?[profile,input]:[profile,input,path.join(root,'src/data/'+profile+'-blender-asset.js')];
  const child=cp.spawnSync(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,script),'--',...argv],{cwd:root,windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:5*1024*1024});
  if(child.error||child.status!==0)throw child.error||Error('Garment '+operation+' failed: '+child.stdout+'\n'+child.stderr);
  const result=path.join(operation==='author'?input:path.dirname(input),operation+'.json');
  console.log(JSON.stringify(JSON.parse(fs.readFileSync(result,'utf8'))));return;
 }
 const [command,input]=args,match=/^(author|publish)-(se2|y52y09|fridge|dishwasher|hood|washer|washer-tg10k60w|side-table|armchair|armchair-berlin|stack-stool|corner-bookcase|sofa-bed|chair-s05118|chair-vihals|pet-bowl|litter-bag|fan-x231|cat-tower|corner-bookcase-580|storage-toolbox|medicine-box|toilet-paper-pack|tissue-pack|heartlink-roll-layer|heartlink-tissue-layer|wet-wipes-pack|cat-food-2kg|freeze-dry-bucket-6l|beverage-can-330|beverage-can-500|toolbox-shimoyama-9l|toolbox-jiabangshou-390|storage-bin-shallow-large|storage-bin-deep-medium|storage-bin-deep-large|storage-bin-deeper-medium|storage-bin-deeper-large|storage-bin-ultradeep-medium|storage-bin-ultradeep-large)$/.exec(command||'');
 if(!match||!input)throw Error('Usage: node scripts/blender-asset.cjs author-<se2|y52y09|fridge|dishwasher|hood|washer|washer-tg10k60w|side-table|armchair|armchair-berlin|stack-stool|corner-bookcase|sofa-bed|chair-s05118|chair-vihals|pet-bowl|litter-bag|fan-x231|cat-tower|corner-bookcase-580> <new-directory> | publish-<se2|y52y09|fridge|dishwasher|hood|washer|washer-tg10k60w|side-table|armchair|armchair-berlin|stack-stool|corner-bookcase|sofa-bed|chair-s05118|chair-vihals|pet-bowl|litter-bag|fan-x231|cat-tower|corner-bookcase-580> <model.glb>');
 const [,operation,profile]=match,source=path.resolve(input),output=path.join(root,'src/data/'+profile+'-blender-asset.js');
 if(operation==='author'&&[profile+'-v1.blend',profile+'-v1.glb'].some(name=>fs.existsSync(path.join(source,name))))throw Error('Use a new output directory to preserve existing Blender edits');
 if(operation==='publish'&&(!fs.statSync(source).isFile()||path.extname(source).toLowerCase()!=='.glb'))throw Error('Expected a static '+profile+' GLB');
 const blender=require('./blender-server.cjs').findBlender();if(!blender)throw Error('Blender not found; set FURNISH_BLENDER to the installed executable or Store launcher');
 const jobs=path.join(root,'.local/asset-jobs');fs.mkdirSync(jobs,{recursive:true});const job=fs.mkdtempSync(path.join(jobs,profile+'-')),result=path.join(job,'result.json'),log=fs.createWriteStream(path.join(job,'blender.log'));
 const spec=path.join(job,'spec.json');if(profile==='fridge'){const C=require('../src/core/fridge-core.js'),P=require('../src/core/product-rules.js'),f={type:'fridge_french_drawer',w:833,d:595,h:1910};fs.writeFileSync(spec,JSON.stringify({parts:C.reference(),motions:C.motions(f),size:P.definition(f).fridgeMotion.size}));}
 if(profile==='dishwasher')fs.writeFileSync(spec,JSON.stringify(require('../src/core/dishwasher-fold-core.js').spec()));
 if(profile==='hood')fs.writeFileSync(spec,JSON.stringify(require('../src/core/hood-motion-core.js').spec()));
 if(profile.startsWith('washer'))fs.writeFileSync(spec,JSON.stringify(require('../src/core/washer-motion-core.js').spec(profile==='washer'?undefined:{type:'washer_littleswan_tg10k60w'})));
 if(profile==='corner-bookcase'||profile==='corner-bookcase-580')fs.writeFileSync(spec,JSON.stringify(require('../src/core/corner-bookcase-core.js').spec(profile==='corner-bookcase-580'?'580':undefined)));
 if(profile==='side-table')fs.writeFileSync(spec,JSON.stringify(require('../src/core/side-table-core.js').spec()));
 if(profile==='sofa-bed')fs.writeFileSync(spec,JSON.stringify(require('../src/core/sofa-bed-core.js').spec()));
 if(profile==='chair-vihals')fs.writeFileSync(spec,JSON.stringify(require('../src/core/folding-chair-core.js').spec()));
 const contract=path.join(job,'preflight-contract.json');
 if(operation==='author'){
  const asset=supplies[profile]?{parts:supplies[profile].parts.map(name=>({name,identity:profile+'-v1:'+name})),motions:[]}:profile==='chair-vihals'?JSON.parse(fs.readFileSync(spec)):['pet-bowl','litter-bag','chair-s05118','fan-x231','cat-tower'].includes(profile)?{parts:require('./lib/'+profile+'-contract.json').parts,motions:[]}:profile==='sofa-bed'?JSON.parse(fs.readFileSync(spec)):profile==='corner-bookcase-580'?(()=>{const s=JSON.parse(fs.readFileSync(spec));return {parts:s.parts.map(p=>({...p,identity:s.prefix+p.name})),motions:[]};})():require(path.join(root,'src/data/'+profile+'-blender-asset.js'));
  fs.writeFileSync(contract,JSON.stringify({profile,materialSlots:1,parts:asset.parts.map(p=>({name:p.name,identity:p.identity,role:p.role||null})),motions:asset.motions||[]}));
 }
 const script=['beverage-can-330','beverage-can-500'].includes(profile)?(operation==='author'?'blender-model-beverage-can-printed.py':'publish-beverage-can-printed.py'):profile==='cat-food-2kg'?(operation==='author'?'blender-model-cat-food-2kg.py':'publish-cat-food-2kg.py'):operation==='author'&&supplies[profile]?'blender-model-storage-supply.py':operation==='author'&&['pet-bowl','litter-bag'].includes(profile)?'blender-model-pet-supplies.py':operation==='author'?'blender-model-'+(profile.startsWith('washer')?'washer':profile==='corner-bookcase-580'?'corner-bookcase':profile)+'.py':profile==='chair-vihals'?'publish-chair-vihals.py':'publish-blender-asset.py';
 const child=cp.spawn(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,script),'--',source,...(operation==='author'&&(supplies[profile]||['pet-bowl','litter-bag'].includes(profile))?['--profile',profile]:[]),...(operation==='publish'?[output,'--profile',profile]:[]),...(['chair-vihals','sofa-bed','fridge','dishwasher','hood','washer','washer-tg10k60w','side-table','corner-bookcase','corner-bookcase-580'].includes(profile)?['--spec',spec]:[]),...(operation==='author'?['--preflight-contract',contract]:[]),'--result',result],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let error;child.on('error',e=>error=e);child.on('exit',code=>{if(code)error=Error('Blender exited with '+code+'; inspect '+job);});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 // Store launchers exit before Blender; only a unique Python result confirms completion.
 try{
  const deadline=Date.now()+120000;
  while(!fs.existsSync(result)){if(error)throw error;if(Date.now()>deadline)throw Error('Blender timed out; inspect '+job);await new Promise(resolve=>setTimeout(resolve,250));}
  const outcome=JSON.parse(fs.readFileSync(result,'utf8'));if(!outcome.passed)throw Error(outcome.error+' (log: '+job+')');
  if(operation==='author'){
   outcome.preflight=JSON.parse(fs.readFileSync(path.join(job,'preflight-result.json'),'utf8'));if(!outcome.preflight.passed)throw Error('Author preflight did not complete');
  }
  if(operation==='publish'){
   delete require.cache[output];const asset=require(output),hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(source)).digest('hex');if(asset.sourceSha256!==hash)throw Error('Published asset does not match input GLB');
  }
  console.log(JSON.stringify({command,input:source,output:operation==='publish'?output:source,...outcome}));
 }finally{child.stdout.unpipe(log);child.stderr.unpipe(log);log.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
