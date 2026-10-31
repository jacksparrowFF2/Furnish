/* One-time Codex registration. Codex owns the stdio process; Furnish owns its local endpoint. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const NAME='furnish';
function defaultRoot({base=path.resolve(__dirname,'..'),env=process.env}={}){
 const file=path.join(base,'furnish-desktop.json'),config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 return fs.realpathSync(path.resolve(env.FURNISH_DESKTOP_ROOT||config?.root||base));
}
function findCodex({env=process.env,platform=process.platform}={}){
 const candidates=[];
 if(env.FURNISH_CODEX_CLI){if(!path.isAbsolute(env.FURNISH_CODEX_CLI)||!fs.statSync(env.FURNISH_CODEX_CLI,{throwIfNoEntry:false})?.isFile())throw Error('FURNISH_CODEX_CLI 指定的 Codex 程序不存在。');return fs.realpathSync(env.FURNISH_CODEX_CLI);}
 for(const directory of (env.PATH||env.Path||'').split(path.delimiter).filter(Boolean))candidates.push(path.join(directory,platform==='win32'?'codex.exe':'codex'));
 if(platform==='win32'&&env.LOCALAPPDATA){
  const bin=path.join(env.LOCALAPPDATA,'OpenAI','Codex','bin');candidates.push(path.join(bin,'codex.exe'));
  try{candidates.push(...fs.readdirSync(bin,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>path.join(bin,e.name,'codex.exe')).filter(p=>fs.existsSync(p)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs));}catch{}
 }
 const found=candidates.find(p=>{try{return path.isAbsolute(p)&&fs.statSync(p,{throwIfNoEntry:false})?.isFile();}catch{return false;}});
 if(!found)throw Error('未找到 Codex CLI。请安装 Codex，或用 FURNISH_CODEX_CLI 指定 codex.exe 的完整路径。');
 return fs.realpathSync(found);
}
function run(file,args,{env=process.env,timeout=15000}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']}),chunks=[];let size=0,done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish(Error('Codex 配置命令超时，未确认注册结果。'));},timeout);
  child.stdout.on('data',b=>{size+=b.length;if(size>4*1024*1024){child.kill();finish(Error('Codex 配置输出过大。'));}else chunks.push(b);});
  child.stderr.resume(); // Configuration diagnostics can contain unrelated private settings.
  child.on('error',()=>finish(Error('无法启动 Codex CLI，请检查程序路径及权限。')));
  child.on('close',code=>finish(code===0?null:Error('Codex 配置命令失败（'+code+'），请检查 Codex 配置及写入权限。'),Buffer.concat(chunks).toString('utf8')));
 });
}
function samePath(a,b){try{const normalize=p=>process.platform==='win32'?p.toLowerCase():p;return normalize(fs.realpathSync(a))===normalize(fs.realpathSync(b));}catch{return false;}}
function matchesRoot(entry,root){
 const t=entry?.transport;if(t?.type!=='stdio'||!Array.isArray(t.args))return false;
 const script=path.join(root,'scripts/furnish-mcp.cjs'),i=t.args.findIndex(a=>typeof a==='string'&&samePath(a,script));
 if(i<0)return false;
 const at=t.args.indexOf('--root');return at<0||samePath(t.args[at+1],root);
}
function preference(root){try{const value=JSON.parse(fs.readFileSync(path.join(root,'.local/codex-mcp-registration.json'),'utf8'));return value.root===fs.realpathSync(root)&&value.autoRegister===true;}catch{return false;}}
function setAutomatic(root,enabled){
 const directory=path.join(root,'.local');fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'codex-mcp-registration.json'),temp=file+'.'+crypto.randomUUID()+'.tmp';
 fs.writeFileSync(temp,JSON.stringify({version:1,root:fs.realpathSync(root),autoRegister:!!enabled},null,2)+'\n',{mode:0o600});fs.renameSync(temp,file);
}
function probe(entry,{env=process.env,timeout=15000}={}){
 const t=entry.transport;
 return new Promise((resolve,reject)=>{
  const child=spawn(t.command,t.args||[],{cwd:t.cwd||undefined,windowsHide:true,env:{...env,...t.env},stdio:['pipe','pipe','pipe']});
  let buffer='',size=0,done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);child.stdin.end();child.kill();error?reject(error):resolve(value);};
  const timer=setTimeout(()=>finish(Error('MCP 工具发现超时，请检查注册命令。')),timeout);
  child.on('error',()=>finish(Error('已注册的 MCP 程序无法启动，请检查运行时路径。')));child.on('exit',()=>{if(!done)finish(Error('MCP 在工具发现完成前退出。'));});child.stderr.resume();
  child.stdin.on('error',()=>{if(!done)finish(Error('MCP 输入通道已关闭。'));});
  const send=value=>child.stdin.write(JSON.stringify(value)+'\n');
  child.stdout.setEncoding('utf8');child.stdout.on('data',b=>{
   size+=Buffer.byteLength(b);if(size>4*1024*1024)return finish(Error('MCP 工具清单过大。'));buffer+=b;let end;
   while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;let m;try{m=JSON.parse(line);}catch{return finish(Error('MCP 标准输出不是有效的 JSON-RPC。'));}
    if(m.error)return finish(Error('MCP 初始化或工具发现失败。'));
    if(m.id===1){send({jsonrpc:'2.0',method:'notifications/initialized'});send({jsonrpc:'2.0',id:2,method:'tools/list'});}
    if(m.id===2){const names=m.result?.tools?.map(t=>t.name);if(!names||new Set(names).size!==names.length)return finish(Error('MCP 工具清单无效。'));return finish(null,names);}
   }
  });
  send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'furnish-setup',version:'1.0.0'}}});
 });
}
async function connect({root=defaultRoot(),executable=process.execPath,electron=!!process.versions.electron,codex,env=process.env,automatic=false,register=true}={}){
 root=fs.realpathSync(root);const cli=codex||findCodex({env});
 const script=path.join(root,'scripts/furnish-mcp.cjs');if(!fs.statSync(script,{throwIfNoEntry:false})?.isFile())throw Error('Furnish MCP 脚本缺失。');
 let list;try{list=JSON.parse(await run(cli,['mcp','list','--json'],{env}));}catch(e){throw Error('无法读取 Codex MCP 配置：'+e.message);}
 if(!Array.isArray(list))throw Error('Codex MCP 配置格式无法识别。');
 let entry=list.find(e=>e.name===NAME),created=false,backup=null;
 if(entry)entry=JSON.parse(await run(cli,['mcp','get',NAME,'--json'],{env}));
 if(!entry&&!register)return {registered:false,created:false,toolNames:[],message:'Codex 尚未注册 Furnish，请使用“注册并连接 Codex（MCP）”。'};
 if(entry&&!matchesRoot(entry,root))throw Error('Codex 的 furnish 已指向其它目录或传输方式，未覆盖。请先在 Codex 中核对该连接。');
 if(!entry){
  const config=path.join(env.CODEX_HOME||path.join(os.homedir(),'.codex'),'config.toml');
  if(fs.existsSync(config)){const directory=path.join(root,'.local/codex-mcp-backups');fs.mkdirSync(directory,{recursive:true});backup=path.join(directory,'config-'+Date.now()+'-'+crypto.randomUUID()+'.toml');fs.copyFileSync(config,backup,fs.constants.COPYFILE_EXCL);}
  const args=['mcp','add',NAME,...(electron?['--env','ELECTRON_RUN_AS_NODE=1']:[]),'--',fs.realpathSync(executable),script,'--root',root];
  await run(cli,args,{env});created=true;
  entry=JSON.parse(await run(cli,['mcp','get',NAME,'--json'],{env}));if(!matchesRoot(entry,root))throw Error('Codex 注册回读不一致，请检查配置。');
 }
 if(entry.enabled===false)return {registered:true,enabled:false,created,backup,toolNames:[],message:'furnish 已注册但在 Codex 中被禁用；已保留该设置，请在 Codex 设置中启用。'};
 const toolNames=await probe(entry,{env}),expected=require(path.join(root,'src/core/mcp-core.js')).tools.map(t=>t.name);
 if(expected.length!==toolNames.length||expected.some(n=>!toolNames.includes(n)))throw Error('新 MCP 连接的工具清单与本目录不一致，请检查运行时和服务版本。');
 if(automatic)setAutomatic(root,true);
 const exposedToolNames=toolNames.filter(n=>(!entry.enabled_tools||entry.enabled_tools.includes(n))&&!(entry.disabled_tools||[]).includes(n));
 return {registered:true,enabled:true,created,backup,toolNames,exposedToolNames,autoRegister:preference(root),message:(created?'已注册':'已注册，保留原配置')+'；新连接可发现 '+toolNames.length+' 个工具。'+(exposedToolNames.length!==toolNames.length?'现有 Codex 工具限制仅允许 '+exposedToolNames.length+' 个，已保留该限制。':'')+'Codex 会启动 stdio 服务，Furnish 桌面会启动本机连接端点。已打开的 Codex 聊天可能仍需重载 MCP。'};
}
async function startDesktop({root=defaultRoot(),executable,env=process.env,timeout=30000}={}){
 if(env.FURNISH_MCP_DISABLE==='1')throw Error('MCP 已被 FURNISH_MCP_DISABLE 禁用。');
 root=fs.realpathSync(root);const {callDesktop}=require('./furnish-mcp.cjs');
 const read=()=>callDesktop(root,'get_current_plan',{}, {timeout:1000});
 try{await read();return {started:false,running:true};}catch{}
 const chosen=executable||[path.join(root,'Furnish.exe'),path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe')].find(p=>fs.statSync(p,{throwIfNoEntry:false})?.isFile());
 if(!chosen||!fs.statSync(chosen,{throwIfNoEntry:false})?.isFile())throw Error('未找到 Furnish 桌面程序。请先打开桌面快捷方式，或用 --desktop 指定 Furnish.exe。');
 const desktopEnv={...env,FURNISH_DESKTOP_ROOT:root};delete desktopEnv.ELECTRON_RUN_AS_NODE;
 const child=spawn(chosen,[],{cwd:root,env:desktopEnv,detached:true,windowsHide:false,stdio:'ignore'});let failure=null;child.on('error',e=>{failure=e;});child.unref();
 const end=Date.now()+timeout;
 while(Date.now()<end){if(failure)throw Error('Furnish 桌面程序启动失败。');try{await read();return {started:true,running:true};}catch{}await new Promise(r=>setTimeout(r,150));}
 throw Error('Furnish MCP 尚未就绪，请查看桌面窗口；未强制关闭任何窗口或修改方案。');
}
async function main(){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);if(i<0)return undefined;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(flag+' 缺少路径');return path.resolve(args[i+1]);};
 if(args.some(v=>v.startsWith('--')&&!['--root','--codex','--automatic','--no-automatic','--status','--start-desktop','--desktop'].includes(v)))throw Error('未知参数');
 const root=value('--root')||defaultRoot();
 if(args.includes('--status')&&args.some(v=>['--automatic','--no-automatic','--start-desktop'].includes(v)))throw Error('--status 仅作只读检查，不能同时注册自动检查或启动桌面。');
 if(args.includes('--no-automatic')){setAutomatic(root,false);console.log('已关闭 Furnish 启动时自动检查注册。');return;}
 const result=await connect({root,codex:value('--codex'),automatic:args.includes('--automatic'),register:!args.includes('--status')});if(result.enabled===false){console.log(JSON.stringify(result,null,2));process.exitCode=1;return;}if(args.includes('--start-desktop'))result.desktop=await startDesktop({root,executable:value('--desktop')||(process.versions.electron?process.execPath:undefined)});console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={defaultRoot,findCodex,matchesRoot,preference,setAutomatic,probe,connect,startDesktop};
