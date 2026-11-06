'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),A=require('../scripts/lib/test-artifacts.cjs'),I=require('../scripts/windows-integrity.cjs');
const calls=[],fake=rid=>({platform:'win32',run:(file,args,options)=>{calls.push({file,args,options});return JSON.stringify({rid,labelPresent:rid!==8192,inherited:true});}});
assert.equal(I.readIntegrity('x',{platform:'linux'}).supported,false);assert.throws(()=>I.assertDesktopIntegrity('x',fake(4096)),/低完整性.*S-1-16-4096/);assert.throws(()=>I.assertDesktopIntegrity('x',fake(0)),/S-1-16-0/);assert.equal(I.assertDesktopIntegrity('x',fake(8192)).rid,8192);assert.equal(I.assertDesktopIntegrity('x',fake(12288)).rid,12288);assert.throws(()=>I.readIntegrity('x',{platform:'win32',run:()=>'{"rid":"low"}'}),/无效/);
const unusual=path.resolve("path ' # $() 名称.exe");I.readIntegrity(unusual,fake(8192));const call=calls.at(-1);assert.equal(call.options.env.FURNISH_INTEGRITY_TARGET,unusual);assert(!call.args.join(' ').includes(unusual));assert(!call.args.some(x=>/bypass/i.test(x)));assert(Buffer.from(call.args.at(-1),'base64').toString('utf16le').includes('GetNamedSecurityInfo'));
assert.throws(()=>I.readIntegrity('x',{platform:'win32',run:()=>{throw Error('native read failed');}}),/无法读取 Windows 完整性标签/);
if(process.platform==='win32'){
 const job=A.createRun({parent:path.resolve(__dirname,'../output/desktop-verification'),prefix:'integrity-'});let passed=false;
 try{const fixture=job.discard('low-fixture.txt');fs.writeFileSync(fixture,'label probe only');execFileSync('icacls.exe',[fixture,'/setintegritylevel','L'],{windowsHide:true,stdio:'pipe'});assert.equal(I.readIntegrity(fixture).rid,4096);assert.throws(()=>I.assertDesktopIntegrity(fixture),/低完整性/);if(process.env.FURNISH_TEST_MEDIUM_FILE)assert.equal(I.assertDesktopIntegrity(process.env.FURNISH_TEST_MEDIUM_FILE).rid,8192);passed=true;}finally{job.finish(passed);}
}
console.log('PASS mandatory-label API, Low/Medium guard, path-as-data, read-only invocation and native Low fixture');
