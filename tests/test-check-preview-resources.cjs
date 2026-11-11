'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-check-resources-'));
try{
 const put=(name,text)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;};
 for(const name of ['check.cjs','lib/preview-files.cjs'])put('scripts/'+name,fs.readFileSync(path.join(__dirname,'../scripts',name),'utf8'));
 put('scripts/validate-plans.mjs','');put('src/data/plans.js','module.exports=[];');
 put('index.html','<!doctype html>');put('tests/test-sentinel.cjs',"console.log('regression reached');");
 const asset=put('resources/中文 #/rules.js','const previewRule=1;');
 put('output/valid/preview.html','<script src="'+pathToFileURL(asset).href+'?v=2#rules"></script>');
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'scripts/check.cjs'),...args],{cwd:root,encoding:'utf8'});
 let result=run('--keep-going');assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/PASS 1 regression suites/);
 put('output/missing/preview.html','<script src="absent.js"></script>');
 put('output/duplicate/preview.html','<script>const duplicate=1;</script><script>const duplicate=2;</script>');
 result=run('--keep-going');assert.equal(result.status,1);assert.match(result.stdout,/PASS tests[\\/]test-sentinel\.cjs/);assert.match(result.stderr,/Missing preview asset/);assert.match(result.stderr,/already been declared/);assert.match(result.stderr,/FAIL 2 checks/);
 result=run();assert.equal(result.status,1);assert.doesNotMatch(result.stdout,/test-sentinel/);
 fs.rmSync(path.join(root,'output/missing'),{recursive:true});fs.rmSync(path.join(root,'output/duplicate'),{recursive:true});
 put('tests/test-hang.cjs','setTimeout(()=>{},5000);');
 result=spawnSync(process.execPath,[path.join(root,'scripts/check.cjs'),'--keep-going'],{cwd:root,encoding:'utf8',env:{...process.env,FURNISH_CHECK_TIMEOUT:'1000'}});
 assert.equal(result.status,1);assert.match(result.stderr,/ETIMEDOUT/);assert.match(result.stdout,/PASS tests[\\/]test-sentinel\.cjs/);
 console.log('PASS file URL preview resources and keep-going preserve later regression execution');
}finally{fs.rmSync(root,{recursive:true,force:true});}
