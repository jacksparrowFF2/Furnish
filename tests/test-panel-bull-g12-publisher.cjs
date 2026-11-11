'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),job=require('../scripts/lib/test-artifacts.cjs').createRun({parent:path.join(root,'output/model-pipeline'),prefix:'panel-publisher-negative-'});let passed=false;
try{
 const source=path.dirname(path.join(root,require('../scripts/lib/model-profiles.cjs').sourceFiles('panel-bull-g12').glb)),input=path.join(job.dir,'input');job.discard('input');fs.mkdirSync(input);
 const variants=require('../src/core/product-rules.js').panelVariants,keys=Object.keys(variants);for(const key of keys)fs.copyFileSync(path.join(source,key+'.glb'),path.join(input,key+'.glb'));
 const contract=path.join(input,'contract.json');fs.writeFileSync(contract,JSON.stringify(variants));const target=path.join(input,'runtime.js');fs.writeFileSync(target,'previous-valid-runtime');
 const first=path.join(input,keys[0]+'.glb'),original=fs.readFileSync(first),size=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+size)),binary=original.subarray(20+size);
 function invalid(name,mutate,fragment){
  const doc=structuredClone(json);mutate(doc);const raw=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-raw.length%4)%4,32),chunk=Buffer.concat([raw,padding]),head=Buffer.alloc(20);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(20+chunk.length+binary.length,8);head.writeUInt32LE(chunk.length,12);head.writeUInt32LE(0x4e4f534a,16);fs.writeFileSync(first,Buffer.concat([head,chunk,binary]));
  const result=cp.spawnSync(require('../scripts/blender-server.cjs').findBlender(),['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(root,'scripts/publish-panel-bull-g12.py'),'--',path.join(input,'panel-bull-g12-v1.glb'),target,contract],{cwd:root,windowsHide:true,encoding:'utf8',timeout:120000});
  if(result.error)throw result.error;assert.notEqual(result.status,0,name+' must reject');assert((result.stdout+result.stderr).includes(fragment),result.stdout+result.stderr);assert.equal(fs.readFileSync(target,'utf8'),'previous-valid-runtime');fs.writeFileSync(first,original);
 }
 invalid('wrong identity',d=>{d.nodes.find(n=>n.extras?.furnishStablePart).extras.furnishStablePart='wrong';},'Part identity');
 invalid('moved face',d=>{const n=d.nodes.find(n=>n.name===keys[0]+':face');n.translation=[1,0,0];},'Wrong faceplate dimensions');
 invalid('unexpected transparency',d=>{d.materials[0].pbrMetallicRoughness.baseColorFactor[3]=.5;d.materials[0].alphaMode='BLEND';},'Opaque PBR only');
 passed=true;console.log('PASS panel independent publisher rejects wrong identity, dimensions and transparency; previous runtime retained');
}finally{job.finish(passed);}
