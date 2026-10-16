'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto');
const V=require('../scripts/lib/browser-verification.cjs'),R=require('../scripts/verify-browser.cjs');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-browser-config-'));
 try{
  const root=path.join(temp,'中文 # clone'),config=V.configuration({FURNISH_VERIFY_ROOT:root,FURNISH_VERIFY_URL:'http://127.0.0.1:19223/'});
  assert(config.fileBase.includes('%23'));assert(config.fileBase.includes('%20'));assert.equal(require('node:url').fileURLToPath(config.fileBase),root+path.sep);
  assert.equal(config.baseURL,'http://127.0.0.1:19223/');assert.equal(config.launchOptions.headless,true);
  assert.throws(()=>config.output('../outside.png'));assert.throws(()=>V.configuration({FURNISH_VERIFY_URL:'https://example.com/'}));assert.throws(()=>V.configuration({FURNISH_VERIFY_URL:'http://127.0.0.1:9000/index.html'}));
  assert.deepEqual(V.configuration({FURNISH_BROWSER_CHANNEL:'msedge',FURNISH_VERIFY_HEADED:'1'}).launchOptions,{headless:false,channel:'msedge'});
  assert.deepEqual(R.plan(['purchase-relink','drawing']),['workflow-reimport','room-net','purchase-orders','purchase-relink','drawing']);assert.throws(()=>R.plan(['does-not-exist']));assert(R.failed([{status:'FAIL'}]));assert(!R.failed([{status:'PASS'}]));
  await assert.rejects(R.main(['--worker','portable-smoke']),/isolated copy/);
  for(const file of R.cases().values()){
   const source=fs.readFileSync(path.join(V.projectRoot,'scripts',file),'utf8');assert(!/[CD]:[\\/]|http:\/\/(?:127\.0\.0\.1|localhost):\d+|npm-cache|Program Files/.test(source),file+' contains machine-specific configuration');
   if(file.endsWith('.browser.js')){const run=new vm.Script('('+source+'\n)').runInNewContext();assert.equal(typeof run,'function');assert.equal(run.length,2,file+' must accept page and verification');}
  }
  const fixtures=path.join(V.projectRoot,'tests/fixtures/browser');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(fixtures,'1601-source.dxf'))).digest('hex'),JSON.parse(fs.readFileSync(path.join(fixtures,'shared-boundaries-validation.json'))).sha256);
  const P=require('../src/core/project-core.js');for(const name of fs.readdirSync(fixtures).filter(n=>n.endsWith('.furnish.json')))P.unpack(JSON.parse(fs.readFileSync(path.join(fixtures,name))));
  fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'index.html'),'<h1>isolated clone</h1>');const secret=path.join(temp,'secret.txt');fs.writeFileSync(secret,'outside');
  const server=await V.staticServer(root);try{
   const home=await fetch(server.baseURL);assert.equal(home.status,200);assert.match(await home.text(),/isolated clone/);
   assert.equal((await fetch(server.baseURL+'api/furnish/workspace',{method:'PUT',body:'{}'})).status,405);
   assert.equal((await fetch(server.baseURL+'%2e%2e%2fsecret.txt')).status,403);
   assert(!fs.existsSync(path.join(root,'projects/workspace.furnish.json')));
  }finally{await server.close();}
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 console.log('PASS portable browser configuration, cases, fixture integrity, dependency ordering and static service isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
