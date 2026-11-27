/* Local primary archive, immutable history, and explicit directory migration. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),zlib=require('node:zlib'),{constants:bufferLimits}=require('node:buffer');
const C=require('../src/core/repository-core.js');
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
const conflict=message=>Object.assign(Error(message),{status:409});
const busy=()=>Object.assign(Error('另一个服务正在保存，请稍后重试'),{status:423});
const backupPattern=/^\d{13}-[a-f0-9-]{36}\.furnish\.json$/;
const lockHost=digest(os.hostname()).slice(0,24);
const contenderPattern=/^\.workspace-owner-([a-f0-9]{24})-([1-9]\d{0,9})-([a-f0-9-]{36})$/;
function ownerExited(name){
 const owner=contenderPattern.exec(name);
 if(!owner||owner[1]!==lockHost||Number(owner[2])>0x7fffffff)return false;
 try{process.kill(Number(owner[2]),0);return false;}
 catch(e){return e.code==='ESRCH';}
}
function unlinkIfPresent(file){try{fs.unlinkSync(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
function lockWorkspace(base,fn){
 const lock=path.join(base,'.workspace.lock');
 const name='.workspace-owner-'+lockHost+'-'+process.pid+'-'+crypto.randomUUID(),claim=path.join(base,name);
 // Publish before inspecting other owners. Each contender can remove only its
 // own claim or those of exited processes, so only one writer can enter.
 const fd=fs.openSync(claim,'wx',0o600);
 try{
  fs.writeFileSync(fd,name);
  for(const entry of fs.readdirSync(base)){
   if(entry===name||!contenderPattern.test(entry))continue;
   if(ownerExited(entry))unlinkIfPresent(path.join(base,entry));
   else if(fs.existsSync(path.join(base,entry)))throw busy();
  }
  const old=fs.lstatSync(lock,{throwIfNoEntry:false});
  if(old){
   if(!old.isFile()||old.size>128||!ownerExited(fs.readFileSync(lock,'utf8'))){
    if(old.isFile()&&old.size===0)throw conflict('发现旧版保存锁。确认所有相关服务已停止写入后再移走该锁');
    throw busy();
   }
   // Legacy writers cannot acquire the lock until it is removed. If one wins
   // the next acquisition, linkSync fails and we leave its lock in place.
   fs.unlinkSync(lock);
  }
  let legacyFd;
  try{fs.linkSync(claim,lock);}
  catch(e){
   if(e.code==='EEXIST')throw busy();
   // Filesystems without hard links still support the original exclusive lock.
   if(!['ENOSYS','ENOTSUP','EOPNOTSUPP','EPERM'].includes(e.code))throw e;
   try{legacyFd=fs.openSync(lock,'wx');}
   catch(error){if(error.code==='EEXIST')throw busy();throw error;}
  }
  try{return fn();}finally{
   if(legacyFd!==undefined)fs.closeSync(legacyFd);
   fs.unlinkSync(lock);
  }
 }finally{fs.closeSync(fd);fs.unlinkSync(claim);}
}
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
  const raw=fs.readFileSync(file);
  // Cache only exact, already validated bytes. External changes (even with the
  // same mtime/size) must still pass the full production recovery validation.
  if(validatedFile?.file!==file||!validatedFile.raw.equals(raw)){
   const value=JSON.parse(raw.toString('utf8')),workspace=C.parse(value);
   validatedFile={file,raw,revision:digest(C.storedText(value)),workspace,storedVersion:value.workspace.v};
  }
  return validatedFile;
 }
 function locked(base,fn){
  return lockWorkspace(folder(base),fn);
 }
 function backup(base,raw){
  // Preserve the exact acknowledged bytes, not a reconstructed/migrated copy.
  // Callers supply the immutable raw bytes returned by readAt(), already fully
  // validated. Do not repeat all model validation just to copy those bytes.
  const target=folder(base,'backups'),id=String(now()).padStart(13,'0')+'-'+crypto.randomUUID()+'.furnish.json';
  atomic(path.join(target,id),raw);return id;
 }
 function backupFiles(base){
  const target=path.join(base,'backups'),entries=new Map();
  if(!fs.existsSync(target))return [];
  folder(base,'backups');
  for(const name of fs.readdirSync(target)){
   const compressed=name.endsWith('.gz'),id=compressed?name.slice(0,-3):name;
   if(!backupPattern.test(id))continue;
   if(!entries.has(id))entries.set(id,{id});
   entries.get(id)[compressed?'gzip':'plain']=path.join(target,name);
  }
  return [...entries.values()].sort((a,b)=>a.id<b.id?1:-1);
 }
 function backupBytes({plain,gzip}){
  const file=plain??gzip;noLink(file);
  const data=fs.readFileSync(file);
  return plain?data:zlib.gunzipSync(data,{maxOutputLength:bufferLimits.MAX_STRING_LENGTH});
 }
 function prune(base){
  const entries=backupFiles(base),daily=new Set();
  for(const [index,{id,plain,gzip}] of entries.entries()){
   const time=Number(id.slice(0,13)),day=new Date(time).toISOString().slice(0,10);
   const retainedDay=time>=now()-30*86400000&&!daily.has(day);
   if(retainedDay)daily.add(day);
   if(index<50||retainedDay)continue;
   for(const file of [plain,gzip])if(file){noLink(file);fs.unlinkSync(file);}
  }
 }
 function read(){check();const {revision,workspace}=readAt(dir);return {revision,workspace:workspace&&JSON.parse(JSON.stringify(workspace))};}
 function info({inspect=true}={}){check();noLink(primary(dir));let damagedRevision=null;if(inspect)try{readAt(dir);}catch(e){damagedRevision='damaged:'+digest(fs.readFileSync(primary(dir)));}return {directory:dir,file:primary(dir),savedAt:fs.existsSync(primary(dir))?fs.statSync(primary(dir)).mtimeMs:null,damagedRevision,backupDirectory:path.join(dir,'backups'),configured:dir!==legacy,retention:'最近 50 个版本，以及最近 30 天每天最后一个版本；迁移和冲突副本另行保留'};}
 function write(workspace,baseRevision){return locked(dir,()=>{
  check();const checked=C.validate(workspace),before=readAt(dir);if(baseRevision!==before.revision)throw conflict('正式文件已变化，请刷新后选择恢复本机编辑');
  const data=Buffer.from(C.text(checked,{validated:true})),revision=digest(data);if(revision===before.revision)return {revision};
  if(before.raw&&checked.v>=16&&before.storedVersion<checked.v)recover(JSON.parse(before.raw.toString('utf8')).workspace);
  if(before.raw)backup(dir,before.raw); // Backup failure prevents replacing the primary.
  atomic(primary(dir),data);
  const {_repository,updatedAt,...portable}=checked;
  validatedFile={file:primary(dir),raw:data,revision,workspace:portable,storedVersion:checked.v};
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
 function backups(){check();return backupFiles(dir).map(({id,plain,gzip})=>{const file=plain??gzip;noLink(file);return {id,savedAt:Number(id.slice(0,13)),bytes:fs.statSync(file).size,...(!plain?{compressed:true}:{})};});}
 function getBackup(id){
  check();if(typeof id!=='string'||!backupPattern.test(id))throw Error('历史版本编号无效');
  const plain=path.join(folder(dir,'backups'),id);noLink(plain);
  const raw=backupBytes(fs.existsSync(plain)?{plain}:{gzip:plain+'.gz'}).toString('utf8');
  return {workspace:C.parse(JSON.parse(raw)),raw};
 }
 function compactBackups({apply=false}={}){
  const compact=()=>{
   check();
   const result={apply,count:0,bytesBefore:0,bytesAfter:0,skipped:0};
   for(const {plain,gzip} of backupFiles(dir)){
    if(!plain)continue;
    noLink(plain);
    const before=fs.statSync(plain),original=backupBytes({plain}),file=plain+'.gz';
    noLink(file);
    const encoded=gzip?fs.readFileSync(file):zlib.gzipSync(original,{level:1});
    if(encoded.length>=original.length){result.skipped++;continue;}
    if(!zlib.gunzipSync(encoded,{maxOutputLength:original.length}).equals(original))throw Error('历史备份压缩回读不符：'+path.basename(plain));
    if(apply){
     if(!gzip)atomic(file,encoded);
     if(!backupBytes({gzip:file}).equals(original))throw Error('历史备份落盘回读不符：'+path.basename(plain));
     const current=fs.statSync(plain);
     if(before.ino!==current.ino||before.size!==current.size||before.mtimeMs!==current.mtimeMs||before.ctimeMs!==current.ctimeMs)throw conflict('备份在压缩期间变化，原文件已保留');
     if(process.platform!=='win32'){
      const fd=fs.openSync(path.dirname(file),'r');
      try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
     }
     fs.unlinkSync(plain);
    }
    result.count++;result.bytesBefore+=original.length;result.bytesAfter+=encoded.length;
   }
   return result;
  };
  return apply?locked(dir,compact):compact();
 }
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
    if(fs.existsSync(path.join(dir,'backups'))){
     const destinationIds=new Set(backupFiles(next).map(entry=>entry.id));
     for(const {id,plain,gzip} of backupFiles(dir)){
      if(destinationIds.has(id))continue;
      const source=plain??gzip,file=path.join(folder(next,'backups'),path.basename(source));noLink(source);
      atomic(file,fs.readFileSync(source));
     }
    }
    folder(path.dirname(config));atomic(config,JSON.stringify({version:1,directory:next},null,2)+'\n');dir=next;return info({inspect:false});
   });
  });
 }
 return {read,write,recover,recoveries,info,backups,getBackup,restore,setLocation,compactBackups};
}
module.exports={create,digest};
if(require.main===module){
 try{
  const {values,positionals}=require('node:util').parseArgs({options:{apply:{type:'boolean'}},allowPositionals:true});
  if(positionals.length!==2||positionals[0]!=='compact-backups')throw Error('用法：node scripts/workspace-files.cjs compact-backups <Furnish 工作目录> [--apply]');
  const workspace=create(positionals[1]);
  console.log(JSON.stringify({directory:workspace.info({inspect:false}).backupDirectory,...workspace.compactBackups({apply:values.apply})},null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
