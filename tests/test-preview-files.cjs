const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {previewFiles}=require('../scripts/lib/preview-files.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-preview-files-'));
try{
 const put=name=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'');return file;};
 const model=put('model/preview.html'),history=put('historical/model/preview.html');
 for(const name of ['index.html','src/app.js','scripts/check.cjs','output/model/preview.html'])put('verification/workspace/'+name);
 assert.deepEqual(previewFiles(root).sort(),[model,history].sort());
 assert.deepEqual(previewFiles(path.join(root,'missing')),[]);
 console.log('PASS generated and historical previews remain checked; complete archived checkouts are excluded');
}finally{fs.rmSync(root,{recursive:true,force:true});}
