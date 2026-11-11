const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {previewFiles,localAssetPath}=require('../scripts/lib/preview-files.cjs');
const {pathToFileURL}=require('node:url');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-preview-files-'));
try{
 const put=name=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'');return file;};
 const model=put('model/preview.html'),history=put('historical/model/preview.html');
 for(const name of ['index.html','src/app.js','scripts/check.cjs','output/model/preview.html'])put('verification/workspace/'+name);
 put('output/playwright/pruned-batch/workspace/output/model/preview.html');put('output/desktop-verification/pruned-batch/workspace/output/model/preview.html');
 assert.deepEqual(previewFiles(root).sort(),[model,history].sort());
 assert.deepEqual(previewFiles(path.join(root,'missing')),[]);
 const script=put('中文 空格 #/rules.js');
 assert.equal(localAssetPath(pathToFileURL(script).href+'?v=1#loaded',model),script);
 assert.equal(localAssetPath('../'+path.relative(root,script).split(path.sep).map(encodeURIComponent).join('/')+'?v=1#loaded',model),script);
 assert.equal(localAssetPath('https://example.com/rules.js',model),null);
 assert.equal(localAssetPath('data:text/javascript,void%200',model),null);
 console.log('PASS generated and historical previews remain checked; complete archived checkouts are excluded');
}finally{fs.rmSync(root,{recursive:true,force:true});}
