/* Fixed-path loopback workspace API. All commits are serialized under a disk lock. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../src/core/repository-core.js');
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
function create(root){
 const dir=path.join(root,'projects'),file=path.join(dir,'workspace.furnish.json'),local=path.join(root,'.local','furnish-recovery');
 function safeDir(target){fs.mkdirSync(target,{recursive:true});const real=fs.realpathSync(target),base=fs.realpathSync(root);if(!real.startsWith(base+path.sep))throw Error('项目路径不能指向仓库以外');}
 function safeFile(target){if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('项目文件不能是链接');}
 function read(){safeDir(dir);safeFile(file);if(!fs.existsSync(file))return {revision:null,workspace:null};const workspace=C.parse(JSON.parse(fs.readFileSync(file,'utf8')));return {revision:digest(C.text(workspace)),workspace};}
 function locked(fn){safeDir(dir);const lock=path.join(dir,'.workspace.lock');let fd;try{fd=fs.openSync(lock,'wx');return fn();}catch(e){if(e.code==='EEXIST')throw Object.assign(Error('另一个服务正在保存，请稍后重试'),{status:409});throw e;}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
 function write(workspace,baseRevision){return locked(()=>{const checked=C.validate(workspace),before=read();if(baseRevision!==before.revision)throw Object.assign(Error('仓库文件已变化，请刷新后选择恢复本机编辑'),{status:409});const data=C.text(checked),revision=digest(data);if(revision===before.revision)return {revision};const temp=path.join(dir,'.workspace-'+crypto.randomUUID()+'.tmp');try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}safeFile(file);fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}return {revision};});}
 function recover(workspace){if(!workspace||![2,3,4,5,6,7,8,9].includes(workspace.v)||typeof workspace.work!=='object')throw Error('恢复副本无效');safeDir(local);const data=JSON.stringify(workspace,null,2)+'\n',id=digest(data);const target=path.join(local,id+'.json');safeFile(target);if(!fs.existsSync(target))fs.writeFileSync(target,data,{flag:'wx'});return {id};}
 function recoveries(){safeDir(local);return fs.readdirSync(local).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>{const target=path.join(local,n);safeFile(target);return {id:n.slice(0,-5),workspace:JSON.parse(fs.readFileSync(target,'utf8'))};});}
 async function handle(req,res){
  const route=req.url.split('?')[0];if(!route.startsWith('/api/furnish/'))return false;
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   // No CORS; reject cross-site writes and DNS-rebinding hosts, even on loopback.
   const host=req.headers.host||'',origin=req.headers.origin;
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('仅允许本机同源访问'),{status:403});
   if(req.method==='GET'&&route==='/api/furnish/workspace'){reply(200,read());return true;}
   if(req.method==='GET'&&route==='/api/furnish/recoveries'){reply(200,recoveries());return true;}
   if(!['PUT','POST'].includes(req.method))throw Object.assign(Error('不支持的请求'),{status:405});
   if(req.headers['content-type']!=='application/json'||req.headers['x-furnish-request']!=='workspace-v1')throw Object.assign(Error('无效的保存请求'),{status:403});
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>64e6)throw Object.assign(Error('工作区上限 64 MB'),{status:413});chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(route==='/api/furnish/workspace'&&req.method==='PUT')reply(200,write(body.workspace,body.baseRevision));
   else if(route==='/api/furnish/recoveries'&&req.method==='POST')reply(200,recover(body.workspace));
   else reply(404,{error:'接口不存在'});
  }catch(e){reply(e.status||400,{error:e.message});}return true;
 }
 return {handle,read,write,recover,recoveries};
}
module.exports={create,digest};
