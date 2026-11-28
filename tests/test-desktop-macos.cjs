'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {applicationRoot,workspaceRoot}=require('../desktop/policy.cjs'),{desktopExecutable}=require('../scripts/launch-desktop.cjs');
const {build,macArchitecture}=require('../scripts/package-desktop.cjs');
const job=require('../scripts/lib/test-artifacts.cjs').createRun({parent:path.resolve(__dirname,'../verification.noindex/desktop-verification'),prefix:'macos-layout-'});
let passed=false;
try{
 const out=path.join(job.dir,'bundle space #'),runtime=path.join(job.dir,'runtime');job.discard('runtime');job.discard('bundle space #');
 const executable=path.join(runtime,'Electron.app/Contents/MacOS/Electron'),header=Buffer.alloc(8);header.writeUInt32LE(0xfeedfacf);header.writeUInt32LE(0x0100000c,4);
 fs.mkdirSync(path.dirname(executable),{recursive:true});fs.writeFileSync(executable,header);
 fs.writeFileSync(path.join(runtime,'LICENSE'),'Electron fixture license');
 fs.mkdirSync(path.join(runtime,'Electron.app/Contents/Resources'),{recursive:true});
 fs.writeFileSync(path.join(runtime,'Electron.app/Contents/Info.plist'),'fixture');
 fs.mkdirSync(path.join(runtime,'Electron.app/Contents/Frameworks/Electron Helper (GPU).app/Contents'),{recursive:true});
 fs.writeFileSync(path.join(runtime,'Electron.app/Contents/Frameworks/Electron Helper (GPU).app/Contents/Info.plist'),'fixture');
 assert.equal(macArchitecture(executable),'arm64');
 assert.throws(()=>build({out,platform:'darwin',arch:'x64',electronExecutable:executable}),/架构/);assert(!fs.existsSync(out));
 const commands=[];
 build({out,portable:true,platform:'darwin',arch:'arm64',electronExecutable:executable,run:(file,args)=>commands.push({file,args})});
 const app=path.join(out,'Furnish.app'),binary=path.join(app,'Contents/MacOS/Electron');
 assert.equal(desktopExecutable(out,{env:{},platform:'darwin',arch:'arm64'}),binary);
 assert.equal(applicationRoot({packaged:true,executable:binary,platform:'darwin'}),out);
 // Stock-named Electron reports isPackaged=false even after embedding our app.
 const resources=path.join(app,'Contents/Resources');
 assert.equal(applicationRoot({packaged:false,executable:binary,sourceRoot:resources,platform:'darwin'}),out);
 const cwd=process.cwd();try{process.chdir(job.dir);assert.equal(workspaceRoot({appRoot:applicationRoot({packaged:false,executable:binary,sourceRoot:resources,platform:'darwin'})}),fs.realpathSync(out));}finally{process.chdir(cwd);}
 assert.equal(applicationRoot({packaged:false,executable:binary,sourceRoot:job.dir,platform:'darwin'}),job.dir,'Source mode must keep its source root even with a macOS runtime');
 const applications=path.join(job.dir,'Applications');fs.mkdirSync(applications);job.discard('Applications');
 const shortcut=path.join(applications,'Furnish.app');fs.symlinkSync(app,shortcut,'dir');
 try{assert.equal(applicationRoot({packaged:false,executable:path.join(shortcut,'Contents/MacOS/Electron'),sourceRoot:resources,platform:'darwin'}),out,'A Finder symlink and the loaded code must resolve to the same bundle');}finally{fs.unlinkSync(shortcut);}
 assert.equal(workspaceRoot({appRoot:out}),fs.realpathSync(out));
 assert.equal(applicationRoot({packaged:false,sourceRoot:out,platform:'darwin'}),out);
 assert.equal(applicationRoot({packaged:true,executable:path.join(out,'Furnish.exe'),platform:'win32'}),out);
 for(const file of ['projects','.local','furnish-desktop.json','node_modules'])assert(!fs.existsSync(path.join(out,file)),`No private or machine-specific ${file}`);
 for(const file of ['main.cjs','policy.cjs','backend.cjs','diagnostics.cjs','package.json'])assert(fs.statSync(path.join(app,'Contents/Resources/app',file)).isFile());
 assert.equal(fs.readFileSync(path.join(app,'Contents/Resources/electron.icns')).subarray(0,4).toString(),'icns');
 assert(commands.some(c=>c.file.endsWith('codesign')&&c.args.includes('--sign')));
 assert(commands.some(c=>c.file.endsWith('codesign')&&c.args.includes('--verify')));
 assert(commands.some(c=>c.args.includes('Add :CFBundleName string Furnish Helper (GPU)')));
 for(const name of ['start-furnish.command','start-furnish-desktop.command','connect-codex.command']){
  const text=fs.readFileSync(path.join(out,name),'utf8');assert(text.startsWith('#!/bin/bash\n'));assert(!text.includes('\r'));assert(text.includes('$HOME/.local/bin:'),'Finder launcher includes user-installed tools');assert(text.includes('cd -- "$(dirname -- "$0")"'));
 }
 assert.throws(()=>build({out,platform:'darwin',arch:'arm64',electronExecutable:executable}),/已存在/);
 const source=path.join(job.dir,'source');job.discard('source');const installed=path.join(source,'output/desktop/Furnish-darwin-arm64/Furnish.app/Contents/MacOS/Electron');fs.mkdirSync(path.dirname(installed),{recursive:true});fs.writeFileSync(installed,header);
 assert.equal(desktopExecutable(source,{env:{},platform:'darwin',arch:'arm64'}),installed);
 const excluded=path.join(source,'output/desktop/Furnish-darwin-arm64.noindex/Furnish.app/Contents/MacOS/Electron');fs.mkdirSync(path.dirname(excluded),{recursive:true});fs.writeFileSync(excluded,header);
 assert.equal(desktopExecutable(source,{env:{},platform:'darwin',arch:'arm64'}),excluded,'Prefer the new non-indexed build; retain legacy installed-path support');
 assert.throws(()=>desktopExecutable(source,{env:{},platform:'win32'}),/未找到/,'Must not launch another OS runtime');
 fs.writeFileSync(path.join(out,'furnish-desktop.json'),JSON.stringify({root:source}));
 assert.throws(()=>workspaceRoot({appRoot:out,config:{root:source}}),/不完整/,'An invalid configured root must not silently fall back');
 fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify({passed:true,platform:process.platform,scope:'macOS layout/architecture/commands simulated; signing and native launch not executed',commands},null,2));
 passed=true;console.log('PASS macOS package layout, ARM64 guard, workspace resolution, launch selection, command/signing assembly and personal-data exclusion (fixture; no native Mac execution)');
}finally{job.finish(passed);}
