/* Actual refined API comparisons. Templates and registration are private. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{register}=require('../blender-project.cjs'),{render}=require('./verify-model-render.cjs');
async function main(root,views,templates,output,selection){
 [root,views,templates,output]=[root,views,templates,output].map(p=>path.resolve(p));assert(root!==path.resolve(__dirname,'../..'));fs.mkdirSync(output,{recursive:true});
 const cases=[...['front','oblique'].map(view=>({look:'before',view})),...['front','oblique','panel','glass','open'].map(view=>({look:'after',view}))].filter(c=>!selection||selection.split(',').includes(c.look+'-'+c.view)),results=[];
 for(const c of cases){const id=c.look+'-'+c.view;console.log('Rendering '+id);register(root,path.join(templates,c.look+'.blend'),'model-pipeline-studio');const result=await render(root,path.join(views,c.view+'.glb'),path.join(output,id),'gpu',{width:1024,height:1024,quality:'final',source:'refined'});assert.equal(result.renderInfo.source,'refined');assert.equal(result.renderInfo.existingMaterialBindingsPreserved,result.renderInfo.matchedManagedMeshes);assert.equal(result.renderInfo.lightsPreserved,3);results.push({id,...result});fs.writeFileSync(path.join(output,'renders.json'),JSON.stringify({passed:true,scope:cases,results},null,2));}
 return results;
}
if(require.main===module)main(...process.argv.slice(2)).then(()=>console.log('PASS refined photographic API comparisons')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
