'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
async function main(args=process.argv.slice(2)){
 const [operation,input]=args;if(!['author','publish'].includes(operation)||!input)throw Error('author <new-directory> | publish <panel-xiaomi-switch2-v1.glb>');
 const root=path.resolve(__dirname,'..'),source=path.resolve(input),blender=require('./blender-server.cjs').findBlender();if(!blender)throw Error('Blender is required');
 const target=path.join(root,'src/data/panel-xiaomi-switch2-blender-asset.js');
 if(operation==='publish'&&(path.basename(source)!=='panel-xiaomi-switch2-v1.glb'||!fs.readFileSync(source).equals(fs.readFileSync(path.join(path.dirname(source),'xiaomi-2pro-2-white.glb')))))throw Error('Primary GLB must match default variant');
 const dir=operation==='author'?source:path.dirname(source);fs.mkdirSync(dir,{recursive:true});const contract=path.join(dir,'panel-contract.json');fs.writeFileSync(contract,JSON.stringify(require('../src/core/product-rules.js').xiaomiPanelVariants));
 const script=operation==='author'?'blender-model-panel-xiaomi-switch2.py':'publish-panel-xiaomi-switch2.py';
 const child=cp.spawn(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,script),'--',source,...(operation==='publish'?[target]:[]),contract],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error('Blender exited '+code+' '+(signal||'')+'\n'+log)));});fs.writeFileSync(path.join(dir,operation+'.log'),log);
 const report=JSON.parse(fs.readFileSync(path.join(dir,operation==='author'?'preflight-result.json':'publish.json')));if(report.passed!==true)throw Error('Asset validation did not pass');
 console.log(JSON.stringify({command:operation+'-panel-xiaomi-switch2',input:source,output:operation==='author'?source:target,passed:true,blender}));
}
module.exports={main};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
