/* Material-only comparisons: one production geometry/camera/light setup per pair. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'../..');
async function main(root,output,id,previous,selection){
 root=path.resolve(root);output=path.resolve(output);previous=path.resolve(previous);assert.notEqual(root,project);assert(['washer-tg10k60w','fridge','hood'].includes(id));fs.mkdirSync(output,{recursive:true});
 const views=path.join(output,'views'),templates=path.join(output,'templates'),profile=require(path.join(root,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id===id);fs.mkdirSync(templates,{recursive:true});
 if(!fs.existsSync(path.join(views,'front.glb'))){
  if(id==='washer-tg10k60w')await require('./verify-appliance-look.cjs').main(root,views);
  else {await require('./verify-model-studio.cjs').main(root,views,id);for(const name of ['front','oblique','open'])require('./verify-appliance-look.cjs').hideStudioAnchors(path.join(views,name+'.glb'));const spec=id==='hood'?require(path.join(root,'src/core/hood-motion-core.js')).spec():{parts:require(path.join(root,'src/core/fridge-core.js')).reference()};fs.writeFileSync(path.join(views,'spec.json'),JSON.stringify(spec));}
 }
 const blender=require('../blender-server.cjs').findBlender();
 for(const look of ['before','after']){const file=path.join(templates,look+'.blend');if(fs.existsSync(file))continue;const args=['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(project,'scripts/blender-appliance-studio.py'),'--',path.join(views,'front.glb'),path.join(views,'spec.json'),file,'--profile',id,...(look==='before'?['--baseline','--materials-from',previous]:[])],r=cp.spawnSync(blender,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(templates,look+'.log'),r.stdout+r.stderr);assert.equal(r.status,0,r.stderr);assert(fs.existsSync(file));}
 const cases=[{look:'before',view:'oblique'},{look:'after',view:'oblique'},{look:'after',view:'open'},...(id==='washer-tg10k60w'?[{look:'before',view:'glass'},{look:'after',view:'glass'}]:[])].filter(c=>!selection||selection.split(',').includes(c.look+'-'+c.view)),results=[];
 for(const c of cases){const name=c.look+'-'+c.view;console.log(id+' refined / '+name);require('../blender-project.cjs').register(root,path.join(templates,c.look+'.blend'),'model-pipeline-studio');const result=await require('./verify-model-render.cjs').render(root,path.join(views,c.view+'.glb'),path.join(output,name),'gpu',{width:1024,height:1024,quality:'final',source:'refined'});assert.equal(result.renderInfo.existingMaterialBindingsPreserved,result.renderInfo.matchedManagedMeshes);assert.equal(result.renderInfo.lightsPreserved,3);results.push({id:name,...result});}
 fs.writeFileSync(path.join(output,'benchmark.json'),JSON.stringify({passed:true,profile:id,previousMaterialSource:previous,sourceWorkspace:root,cases:results},null,2));return results;
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS scoped material benchmark')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
