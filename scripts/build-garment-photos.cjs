/* Build in a new directory; publish each independently checked GLB only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),B=require('./blender-server.cjs'),specs=require('./lib/garment-photo-specs.json');
const blender=B.findBlender();if(!blender)throw Error('Blender not found');
const dest=path.resolve(process.argv[2]||'output/garment-photo-build'),ids=process.argv[3]?process.argv[3].split(','):Object.keys(specs);
fs.mkdirSync(dest,{recursive:true});
for(const id of ids){if(!specs[id])throw Error('Unknown garment '+id);const out=path.join(dest,id),target=path.join(root,'assets/models',id,process.argv[4]||'v1');
 if(fs.existsSync(out)||fs.existsSync(target))throw Error('Preserve existing build/source directory: '+out+' / '+target);fs.mkdirSync(out,{recursive:true});
 for(const [stage,script,args]of [['author','blender-model-garment-photos.py',[id,out]],['publish','publish-garment-photos.py',[id,path.join(out,id+'-v1.glb'),path.join(out,id+'-blender-asset.js')]]]){
  console.log(id+' / '+stage);const r=cp.spawnSync(blender,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(root,'scripts',script),'--',...args],{cwd:root,windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:10*1024*1024});fs.writeFileSync(path.join(out,stage+'.log'),(r.stdout||'')+(r.stderr||''));if(r.error||r.status!==0)throw r.error||Error('Failed '+id+'/'+stage+'; see '+path.join(out,stage+'.log'));
 }
 const published=JSON.parse(fs.readFileSync(path.join(out,'publish.json')));if(!published.passed)throw Error('Publication failed');
 fs.mkdirSync(target,{recursive:true});
 for(const ext of ['blend','glb'])fs.copyFileSync(path.join(out,id+'-v1.'+ext),path.join(target,id+'-v1.'+ext));
 fs.copyFileSync(path.join(out,id+'-blender-asset.js'),path.join(root,'src/data',id+'-blender-asset.js'));console.log(JSON.stringify(published));
}
