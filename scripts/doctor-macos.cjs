/* Read-only preparation checks. GPU, interaction and save acceptance are separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
function inspect(){
 const root=fs.realpathSync(path.resolve(__dirname,'..')),checks=[];
 const add=(name,status,detail)=>checks.push({name,status,detail});
 add('macOS',process.platform==='darwin'?'pass':'fail',`${process.platform} ${os.release()}`);
 add('native-arm64',process.arch==='arm64'?'pass':'fail',`Node ${process.arch}；Apple Silicon 请使用原生 arm64 Node，避免 Rosetta/npm 缓存混用`);
 const [major,minor]=process.versions.node.split('.').map(Number);
 add('node',major>24||major===24&&minor>=9?'pass':'fail',process.versions.node+'（工具链需要 24.9+）');
 add('memory','info',`${(os.totalmem()/1024**3).toFixed(1)} GiB；此检查不推断可用场景规模`);
 try{fs.accessSync(root,fs.constants.W_OK);add('workspace','pass',root);}catch(e){add('workspace','fail',e.message);}
 try{
  const executable=require('electron'),version=require('electron/package.json').version;
  const arch=process.platform==='darwin'?require('./package-desktop.cjs').macArchitecture(executable):null;
  add('electron',arch==='arm64'&&process.platform==='darwin'?'pass':'fail',`${version} ${arch||'非原生 macOS arm64'} ${executable}`);
 }catch(e){add('electron','fail','在本机仓库执行 npm ci：'+e.message);}
 for(const name of ['PlistBuddy','codesign']){
  const file=name==='PlistBuddy'?'/usr/libexec/PlistBuddy':'/usr/bin/codesign';
  try{fs.accessSync(file,fs.constants.X_OK);add(name,'pass',file);}catch{add(name,'fail','缺少 '+file);}
 }
 const blender=require('./blender-server.cjs').findBlender();
 if(blender){try{const version=execFileSync(blender,['--version'],{encoding:'utf8',timeout:15000,windowsHide:true}).split(/\r?\n/)[0];add('blender','pass',`${version} ${blender}；Metal/GUI 仍待实测`);}catch(e){add('blender','warn',e.message);}}
 else add('blender','warn','未找到 Blender；布局可运行，建模前安装原生 Apple Silicon 版或设置 FURNISH_BLENDER');
 try{add('codex-cli','pass',require('./register-codex-mcp.cjs').findCodex());}catch(e){add('codex-cli','warn',e.message);}
 return {preflightPassed:!checks.some(c=>c.status==='fail'),root,checks,acceptance:'not-executed'};
}
if(require.main===module){const result=inspect();console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):result.checks.map(c=>`${c.status.toUpperCase()} ${c.name}: ${c.detail}`).join('\n')+'\n实机 GUI / WebGL / 保存 / Metal 验收：未执行');if(!result.preflightPassed)process.exitCode=1;}
module.exports={inspect};
