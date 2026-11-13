/* Offline runtime copy plus Furnish icon resources. No browser-source bundling. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const runtimeFiles=['serve.cjs','server-runtime.cjs','server-recovery.cjs','backend-update.cjs','repository-server.cjs','workspace-files.cjs','blender-server.cjs','blender-render.py','blender-sync-server.cjs','blender-sync-addon.py','blender-project.cjs','blender-refined.py','desktop-mcp.cjs','furnish-mcp.cjs','register-codex-mcp.cjs','launch-desktop.cjs','windows-integrity.cjs','windows-integrity.ps1'];
function macArchitecture(file){
 const fd=fs.openSync(file,'r'),header=Buffer.alloc(8);try{fs.readSync(fd,header,0,8,0);}finally{fs.closeSync(fd);}
 if(header.readUInt32LE(0)!==0xfeedfacf)return null;
 return ({[0x0100000c]:'arm64',[0x01000007]:'x64'})[header.readUInt32LE(4)]||null;
}
function macIdentity(out,{run=execFileSync}={}){
 const bundle=path.join(out,'Furnish.app'),contents=path.join(bundle,'Contents');
 const plists=[[path.join(contents,'Info.plist'),'Furnish','local.furnish.desktop']];
 for(const name of fs.readdirSync(path.join(contents,'Frameworks')).filter(n=>/^Electron Helper.*\.app$/.test(n))){
  const suffix=name.slice('Electron'.length,-4);
  plists.push([path.join(contents,'Frameworks',name,'Contents/Info.plist'),'Furnish'+suffix,'local.furnish.desktop.'+name.replace(/[^a-z0-9]/gi,'')]);
 }
 for(const [file,name,id]of plists)for(const [key,value]of Object.entries({CFBundleDisplayName:name,CFBundleName:name,CFBundleIdentifier:id})){
  // DisplayName is optional in upstream plists. Delete+Add works in either case.
  try{run('/usr/libexec/PlistBuddy',['-c','Delete :'+key,file],{stdio:'pipe'});}catch{}
  run('/usr/libexec/PlistBuddy',['-c',`Add :${key} string ${value}`,file],{stdio:'pipe'});
 }
 run('/usr/libexec/PlistBuddy',['-c','Set :CFBundleIconFile electron.icns',plists[0][0]],{stdio:'pipe'});
 const png=fs.readFileSync(path.join(root,'assets/icons/icon-512.png')),icns=Buffer.alloc(16);
 icns.write('icns');icns.writeUInt32BE(16+png.length,4);icns.write('ic09',8);icns.writeUInt32BE(8+png.length,12);
 fs.writeFileSync(path.join(contents,'Resources/electron.icns'),Buffer.concat([icns,png]));
 // Replacing resources/plists invalidates Electron's upstream signature. This
 // ad-hoc signature is for local use; it is not Developer ID or notarization.
 run('/usr/bin/codesign',['--force','--deep','--sign','-','--timestamp=none',bundle],{stdio:'pipe'});
 run('/usr/bin/codesign',['--verify','--deep','--strict',bundle],{stdio:'pipe'});
}
function build({out,portable=false,platform=process.platform,arch=process.arch,electronExecutable,run=execFileSync}={}){
 out=out||path.join(root,`output/desktop/Furnish-${platform}-${arch}`);
 out=path.resolve(out);
 if(fs.existsSync(out))throw Error('输出目录已存在，可能包含用户设计；请用 --out 指定新的空目录：'+out);
 if(!(platform==='win32'&&arch==='x64'||platform==='darwin'&&['arm64','x64'].includes(arch)))throw Error('当前打包入口支持 Windows x64 和 macOS arm64/x64；请在目标系统原生打包。');
 const mac=platform==='darwin',binary=electronExecutable||require('electron');
 if(mac&&macArchitecture(binary)!==arch)throw Error('Electron 不是目标架构的原生 macOS 运行时；请在 Mac 上用对应架构 Node.js 重新 npm ci，不要复制 Windows node_modules。');
 const electron=mac?path.resolve(path.dirname(binary),'../../..'):path.dirname(binary);
 fs.mkdirSync(out,{recursive:true});fs.cpSync(electron,out,{recursive:true,verbatimSymlinks:true});
 if(mac)fs.renameSync(path.join(out,'Electron.app'),path.join(out,'Furnish.app'));
 else{
  fs.renameSync(path.join(out,'electron.exe'),path.join(out,'Furnish.exe'));
  require('./windows-app-icon.cjs').apply(path.join(out,'Furnish.exe'),path.join(root,'assets/icons/furnish.ico'));
 }
 fs.renameSync(path.join(out,'LICENSE'),path.join(out,'LICENSE.electron'));
 for(const name of ['index.html','manifest.webmanifest','LICENSE','start-furnish.cmd','connect-codex.cmd','start-furnish.command','start-furnish-desktop.command','connect-codex.command','src','styles','vendor','assets','templates','examples'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
 fs.mkdirSync(path.join(out,'scripts'));
 for(const name of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(out,'scripts',name));
 const appDir=path.join(out,mac?'Furnish.app/Contents/Resources/app':'resources/app');fs.mkdirSync(appDir,{recursive:true});
 for(const name of ['main.cjs','policy.cjs','backend.cjs','diagnostics.cjs'])fs.copyFileSync(path.join(root,'desktop',name),path.join(appDir,name));
 fs.writeFileSync(path.join(appDir,'package.json'),JSON.stringify({name:'furnish-desktop',version:'1.0.0',main:'main.cjs'},null,2)+'\n');
 if(!portable)fs.writeFileSync(path.join(out,'furnish-desktop.json'),JSON.stringify({root},null,2)+'\n');
 fs.writeFileSync(path.join(out,'桌面版使用说明.txt'),`双击 ${mac?'Furnish.app':'Furnish.exe'} 启动。整个文件夹需要一起保留。\n`+(portable?'本目录为独立工作目录；设计保存在 projects/workspace.furnish.json。\n':'本机版本连接源码工作目录：'+root+'\n')+'直接打开 index.html 保留离线入口。跨机器请从原应用导出最新项目，再在新电脑导入；不要复制 Windows 的 .local 配置或 node_modules。\n缓存不读取其他浏览器；Blender 工程需在新电脑重新登记。\n'+(mac?'本包为本机 ad-hoc 签名，未经公证；请放在用户可写目录，并保留 app 旁的文件。\n':''));
 const executable=path.join(out,mac?'Furnish.app/Contents/MacOS/Electron':'Furnish.exe');
 if(mac){for(const name of ['start-furnish.command','start-furnish-desktop.command','connect-codex.command'])fs.chmodSync(path.join(out,name),0o755);macIdentity(out,{run});}
 try{if(!mac)require('./windows-integrity.cjs').assertDesktopIntegrity(executable);console.log('Desktop ready: '+executable);}catch(e){console.warn('桌面文件已生成，但启动完整性检查未通过：'+e.message+'\n位置：'+executable);}
 return out;
}
if(require.main===module){try{const args=process.argv.slice(2),i=args.indexOf('--out');if(i>=0&&!args[i+1])throw Error('--out 需要目录');build({...(i>=0?{out:args[i+1]}:{}),portable:args.includes('--portable')});}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={build,runtimeFiles,macArchitecture};
