'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),A=require('../scripts/lib/test-artifacts.cjs'),{desktopExecutable:selectExecutable}=require('../scripts/launch-desktop.cjs');
// These are Windows fixtures even when this regression runs on a Mac.
const desktopExecutable=(root,options)=>selectExecutable(root,{platform:'win32',...options});
const job=A.createRun({parent:path.resolve(__dirname,'../output/desktop-verification'),prefix:'executable-'}),root=path.join(job.dir,'workspace');let passed=false;
try{job.discard('workspace');fs.mkdirSync(path.join(root,'.local'),{recursive:true});const bundled=path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe');fs.mkdirSync(path.dirname(bundled),{recursive:true});fs.writeFileSync(bundled,'fixture');const moved=path.join(root,'relocated.exe');fs.writeFileSync(moved,'fixture');const config=path.join(root,'.local/desktop-executable.json');
 assert.equal(desktopExecutable(root,{env:{}}),bundled);fs.writeFileSync(config,JSON.stringify({executable:moved}));assert.equal(desktopExecutable(root,{env:{}}),moved);assert.equal(desktopExecutable(root,{env:{FURNISH_DESKTOP_EXE:bundled}}),bundled);assert.equal(desktopExecutable(root,{executable:moved,env:{FURNISH_DESKTOP_EXE:bundled}}),moved);
 fs.writeFileSync(config,JSON.stringify({executable:'missing.exe'}));assert.throws(()=>desktopExecutable(root,{env:{}}),/配置/);fs.writeFileSync(config,JSON.stringify({executable:path.join(root,'missing.exe')}));assert.throws(()=>desktopExecutable(root,{env:{}}),/配置/);fs.writeFileSync(config,'invalid');assert.throws(()=>desktopExecutable(root,{env:{}}));passed=true;console.log('PASS desktop executable selection, precedence and invalid override refusal');
}finally{job.finish(passed);}
