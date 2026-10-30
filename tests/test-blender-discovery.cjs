'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),B=require('../scripts/blender-server.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-blender-discovery-')),env={USERPROFILE:path.join(root,'user'),LOCALAPPDATA:path.join(root,'app'),PATH:''},scoop=path.join(env.USERPROFILE,'scoop/apps/blender/current/blender.exe'),store=path.join(env.LOCALAPPDATA,'Microsoft/WindowsApps/blender-launcher.exe'),custom=path.join(root,'portable/apps/blender/current/blender.exe');
try{
 assert.deepEqual(B.candidates({...env,FURNISH_BLENDER:'explicit'},'win32').slice(0,3),['explicit',scoop,store]);
 assert.equal(B.candidates({...env,SCOOP:path.join(root,'portable')},'win32')[0],custom);
 assert(!B.candidates(env,'linux').includes(scoop));
 if(process.platform==='win32'){
  fs.mkdirSync(path.dirname(store),{recursive:true});fs.writeFileSync(store,'store fixture');assert.equal(B.findBlender(env),store,'missing Scoop falls back to Store');
  fs.mkdirSync(path.dirname(scoop),{recursive:true});fs.writeFileSync(scoop,'scoop fixture');assert.equal(B.findBlender(env),scoop,'Scoop actual executable wins over Store');
  assert.equal(B.findBlender({...env,FURNISH_BLENDER:store}),store,'explicit override remains authoritative');
  fs.mkdirSync(path.dirname(custom),{recursive:true});fs.writeFileSync(custom,'portable fixture');assert.equal(B.findBlender({...env,SCOOP:path.join(root,'portable')}),custom,'custom Scoop root is respected');
  assert.equal(B.findBlender({...env,FURNISH_BLENDER:path.join(root,'missing.exe')}),scoop,'missing override retains automatic fallback');
 }
 console.log('PASS Blender discovery: Scoop/current priority, Store fallback, explicit override, custom Scoop root and non-Windows isolation');
}finally{
 const resolved=fs.realpathSync(root),temporary=fs.realpathSync(os.tmpdir());assert.equal(path.dirname(resolved),temporary);assert(path.basename(resolved).startsWith('furnish-blender-discovery-'));fs.rmSync(resolved,{recursive:true,force:true});
}
