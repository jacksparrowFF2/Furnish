/* Local primary archive, immutable history, and explicit directory migration. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../src/core/repository-core.js');
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
const conflict=message=>Object.assign(Error(message),{status:409});
const backupPattern=/^\d{13}-[a-f0-9-]{36}\.furnish\.json$/;
function noLink(file){if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('存档路径不能是链接：'+file);}
function atomic(file,data){
 noLink(file);const temp=path.join(path.dirname(file),'.workspace-'+crypto.randomUUID()+'.tmp');
 try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}noLink(file);fs.renameSync(temp,file);}
 finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function create(root,{now=Date.now}={}){
 root=fs.realpathSync(root);
 const config=path.join(root,'.local','storage.json'),legacy=path.join(root,'projects'),legacyRecovery=path.join(root,'.local','furnish-recovery');
 function configured(){noLink(config);if(!fs.existsSync(config))return legacy;const value=JSON.parse(fs.readFileSync(config,'utf8'));if(value.version!==1||typeof value.directory!=='string'||!path.isAbsolute(value.directory))throw Error('本机保存位置配置无效');return path.resolve(value.directory);}
 let dir=configured(),validatedFile=null;
 function check(){if(configured()!==dir)throw conflict('保存位置已被其他服务更改，请重启服务后刷新');}
 function folder(base,child=''){
  fs.mkdirSync(base,{recursive:true});noLink(base);const target=path.join(base,child);fs.mkdirSync(target,{recursive:true});noLink(target);
  const real=fs.realpathSync(target),realBase=fs.realpathSync(base);if(real!==realBase&&!real.startsWith(realBase+path.sep))throw Error('存档路径越界');return target;
 }
 const primary=base=>path.join(base,'workspace.furnish.json');
 function readAt(base){
  folder(base);const file=primary(base);noLink(file);if(!fs.existsSync(file))return {revision:null,workspace:null};
  const raw=fs.readFileSync(file,'utf8');
  // Cache only exact, already validated bytes. External changes (even with the
  // same mtime/size) must still pass the full production recovery validation.
  if(validatedFile?.file!==file||validatedFile.raw!==raw){const value=JSON.parse(raw),workspace=C.parse(value);validatedFile={file,raw,revision:digest(C.text(value.workspace)),workspace};}
  return {revision:validatedFile.revision,workspace:JSON.parse(JSON.stringify(validatedFile.workspace)),raw};
 }
 function locked(base,fn){
  folder(base);const lock=path.join(base,'.workspace.lock');let fd;
  try{fd=fs.openSync(lock,'wx');return fn();}
  catch(e){if(e.code==='EEXIST')throw conflict('另一个服务正在保存，请稍后重试');throw e;}
  finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
 }
 function backup(base,raw){
  // Preserve the exact acknowledged bytes, not a reconstructed/migrated copy.
  // Callers supply the immutable raw bytes returned by readAt(), already fully
  // validated. Do not repeat all model validation just to copy those bytes.
  const target=folder(base,'backups'),id=String(now()).padStart(13,'0')+'-'+crypto.randomUUID()+'.furnish.json';
  atomic(path.join(target,id),raw);return id;
 }
 function prune(base){
  const target=folder(base,'backups'),names=fs.readdirSync(target).filter(n=>backupPattern.test(n)).sort().reverse(),daily=new Set(),keep=new Set(names.slice(0,50));
  for(const name of names){const time=Number(name.slice(0,13)),day=new Date(time).toISOString().slice(0,10);if(time>=now()-30*86400000&&!daily.has(day)){daily.add(day);keep.add(name);}}
  for(const name of names)if(!keep.has(name)){const file=path.join(target,name);noLink(file);fs.unlinkSync(file);}
 }
 function read(){check();const {raw,...value}=readAt(dir);return value;}
 function info({inspect=true}={}){check();noLink(primary(dir));let damagedRevision=null;if(inspect)try{readAt(dir);}catch(e){damagedRevision='damaged:'+digest(fs.readFileSync(primary(dir)));}return {directory:dir,file:primary(dir),savedAt:fs.existsSync(primary(dir))?fs.statSync(primary(dir)).mtimeMs:null,damagedRevision,backupDirectory:path.join(dir,'backups'),configured:dir!==legacy,retention:'最近 50 个版本，以及最近 30 天每天最后一个版本；迁移和冲突副本另行保留'};}
 function write(workspace,baseRevision){return locked(dir,()=>{
  check();const checked=C.validate(workspace),before=readAt(dir);if(baseRevision!==before.revision)throw conflict('正式文件已变化，请刷新后选择恢复本机编辑');
  const data=C.text(checked),revision=digest(data);if(revision===before.revision)return {revision};
  if(before.raw&&checked.v>=16&&JSON.parse(before.raw).workspace.v<checked.v)recover(JSON.parse(before.raw).workspace);
  if(before.raw)backup(dir,before.raw); // Backup failure prevents replacing the primary.
  atomic(primary(dir),data);
  validatedFile={file:primary(dir),raw:data,revision,workspace:C.portable(checked)};
  let warning='';try{prune(dir);}catch(e){warning='历史备份清理未完成：'+e.message;}
  return {revision,...(warning?{warning}:{})};
 });}
 function recoveryDir(){return dir===legacy?legacyRecovery:folder(dir,'recoveries');}
 function recover(workspace){
  check();if(!workspace||!C.workspaceVersions.includes(workspace.v)||typeof workspace.work!=='object')throw Error('恢复副本无效');
  const target=folder(recoveryDir()),data=JSON.stringify(workspace,null,2)+'\n',id=digest(data),file=path.join(target,id+'.json');noLink(file);if(!fs.existsSync(file))atomic(file,data);return {id};
 }
 function recoveryFiles(){
  check();const directories=[recoveryDir(),legacyRecovery],seen=new Set(),result=[];
  for(const target of new Set(directories)){if(!fs.existsSync(target))continue;folder(target);for(const name of fs.readdirSync(target).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){if(seen.has(name))continue;const file=path.join(target,name);noLink(file);result.push({id:name.slice(0,-5),file});seen.add(name);}}
  return result;
 }
 function recoveries(){return recoveryFiles().map(entry=>({id:entry.id,workspace:JSON.parse(fs.readFileSync(entry.file,'utf8'))}));}
 function backups(){check();const target=folder(dir,'backups');return fs.readdirSync(target).filter(n=>backupPattern.test(n)).sort().reverse().map(id=>{const file=path.join(target,id);noLink(file);return {id,savedAt:Number(id.slice(0,13)),bytes:fs.statSync(file).size};});}
 function getBackup(id){check();if(typeof id!=='string'||!backupPattern.test(id))throw Error('历史版本编号无效');const file=path.join(folder(dir,'backups'),id);noLink(file);const raw=fs.readFileSync(file,'utf8');return {workspace:C.parse(JSON.parse(raw)),raw};}
 function restore(id,baseRevision){
  const {workspace}=getBackup(id);
  if(typeof baseRevision==='string'&&baseRevision.startsWith('damaged:'))return locked(dir,()=>{
   check();const file=primary(dir);noLink(file);const raw=fs.readFileSync(file);if('damaged:'+digest(raw)!==baseRevision)throw conflict('损坏文件已经变化，请重新打开历史备份');
   try{readAt(dir);throw conflict('正式文件已恢复有效，请刷新后重试');}catch(e){if(e.status===409)throw e;}
   // Corrupt bytes are retained outside the automatically pruned valid history.
   atomic(path.join(folder(dir,'damaged'),digest(raw)+'.json'),raw);
   const data=C.text(C.validate(workspace));atomic(file,data);return {revision:digest(data)};
  });
  return write(workspace,baseRevision);
 }
 function setLocation(directory,baseRevision){
  if(typeof directory!=='string'||!directory.trim()||!path.isAbsolute(directory.trim()))throw Error('请输入完整的绝对文件夹路径');
  const next=path.resolve(directory.trim());if(next===dir){check();return info();}
  // Never silently replace an existing project in the selected directory.
  return locked(dir,()=>{check();const current=readAt(dir);if(current.revision!==baseRevision)throw conflict('正式文件已变化，请先保存并刷新');
   return locked(next,()=>{
    const destination=readAt(next);if(destination.revision&&destination.revision!==current.revision)throw conflict('目标目录已有不同的项目，请选择空目录或先另行备份处理；未覆盖任何数据');
    if(current.raw){backup(next,current.raw);if(!destination.raw)atomic(primary(next),current.raw);}
    // Keep raw migration/conflict copies available after moving again.
    const target=folder(next,'recoveries');for(const entry of recoveryFiles()){const file=path.join(target,entry.id+'.json');noLink(file);if(!fs.existsSync(file))atomic(file,fs.readFileSync(entry.file));}
    // Copy managed history without deleting either source or destination.
    if(fs.existsSync(path.join(dir,'backups')))for(const entry of backups()){const file=path.join(folder(next,'backups'),entry.id);noLink(file);if(!fs.existsSync(file))atomic(file,fs.readFileSync(path.join(dir,'backups',entry.id)));}
    folder(path.dirname(config));atomic(config,JSON.stringify({version:1,directory:next},null,2)+'\n');dir=next;return info({inspect:false});
   });
  });
 }
 return {read,write,recover,recoveries,info,backups,getBackup,restore,setLocation};
}
module.exports={create,digest};
