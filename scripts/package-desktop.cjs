/* Copy-only Windows distribution. No bundling or changes to browser sources. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtimeFiles=['serve.cjs','server-runtime.cjs','server-recovery.cjs','repository-server.cjs','blender-server.cjs','blender-render.py','blender-sync-server.cjs','blender-sync-addon.py','blender-project.cjs','blender-refined.py'];
function build({out=path.join(root,'output/desktop/Furnish-win32-x64'),portable=false}={}){
 out=path.resolve(out);
 if(fs.existsSync(out))throw Error('输出目录已存在，可能包含用户设计；请用 --out 指定新的空目录：'+out);
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('当前打包入口仅支持 Windows x64。');
 const electron=path.dirname(require('electron'));
 fs.mkdirSync(out,{recursive:true});fs.cpSync(electron,out,{recursive:true});
 fs.renameSync(path.join(out,'electron.exe'),path.join(out,'Furnish.exe'));
 fs.renameSync(path.join(out,'LICENSE'),path.join(out,'LICENSE.electron'));
 for(const name of ['index.html','manifest.webmanifest','LICENSE','start-furnish.cmd','src','styles','vendor','assets','templates','examples'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
 fs.mkdirSync(path.join(out,'scripts'));
 for(const name of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(out,'scripts',name));
 const appDir=path.join(out,'resources/app');fs.mkdirSync(appDir,{recursive:true});
 for(const name of ['main.cjs','policy.cjs','backend.cjs'])fs.copyFileSync(path.join(root,'desktop',name),path.join(appDir,name));
 fs.writeFileSync(path.join(appDir,'package.json'),JSON.stringify({name:'furnish-desktop',version:'1.0.0',main:'main.cjs'},null,2)+'\n');
 if(!portable)fs.writeFileSync(path.join(out,'furnish-desktop.json'),JSON.stringify({root},null,2)+'\n');
 fs.writeFileSync(path.join(out,'桌面版使用说明.txt'),'双击 Furnish.exe 启动。整个文件夹需要一起保留，不能单独移动 EXE。\r\n'+(portable?'本目录为独立工作目录；设计保存在 projects/workspace.furnish.json。\r\n':'本机版本连接源码工作目录：'+root+'\r\n')+'浏览器版仍可用 start-furnish.cmd（需 Node.js），或直接打开 index.html。\r\n迁移其他电脑：使用 --portable 打包后，另行复制 projects 目录；恢复副本在 .local。\r\n缓存不读取其他浏览器；只存在浏览器缓存的编辑请先用原启动脚本保存，或导出项目再导入。\r\n');
 console.log('Desktop ready: '+path.join(out,'Furnish.exe'));
 return out;
}
if(require.main===module){try{const args=process.argv.slice(2),i=args.indexOf('--out');if(i>=0&&!args[i+1])throw Error('--out 需要目录');build({...(i>=0?{out:args[i+1]}:{}),portable:args.includes('--portable')});}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={build,runtimeFiles};
