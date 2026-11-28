/* Explicitly owned test directories only. Never sweep output by age or name. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const verificationDirectory='verification.noindex';
const verificationRoot=path.resolve(__dirname,'../..',verificationDirectory),marker='.furnish-test-run.json',lock='.furnish-test-lock.json';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inside(root,file){const rel=path.relative(root,path.resolve(file));if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Test path escapes owned directory: '+file);return path.resolve(file);}
function noLinks(file){
 let stat;try{stat=fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(stat.isSymbolicLink())throw Error('Refuse test cleanup through a symlink/junction: '+file);
 if(stat.isDirectory())for(const name of fs.readdirSync(file))noLinks(path.join(file,name));
}
const profileCaches=['Cache','Code Cache','GPUCache','DawnGraphiteCache','GraphiteDawnCache','GPUPersistentCache','DawnWebGPUCache','ShaderCache','GrShaderCache'];
function write(file,data){const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2));fs.renameSync(temp,file);}
function openRun(directory,{root=verificationRoot,removeEntire=false,env=process.env,existing=false}={}){
 const dir=inside(path.resolve(root),directory);if(fs.lstatSync(path.resolve(root)).isSymbolicLink())throw Error('Linked output root');
 // Check ancestors, not just the leaf (a redirected parent must not authorize deletion).
 for(let p=dir;;p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('Linked test parent: '+p);if(p===path.parse(p).root)break;}
 const file=path.join(dir,marker),lockFile=path.join(dir,lock),token=crypto.randomUUID();
 const previous=existing&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 if(previous?.status==='running'&&Number.isInteger(previous.pid)&&previous.pid>0){
  let alive=true;try{process.kill(previous.pid,0);}catch(e){alive=e.code!=='ESRCH';}
  if(alive)throw Error('Test directory is locked by a live process: '+dir);
 }
 const managed=!existing||previous?.version===1&&previous.managed===true;
 let fd;try{fd=fs.openSync(lockFile,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,token}));}catch(e){throw Error('Test directory is locked; preserve active/interrupted job: '+dir,{cause:e});}finally{if(fd!==undefined)fs.closeSync(fd);}
 const state={version:1,pid:process.pid,token,status:'running',started:new Date().toISOString(),managed,removeEntire,disposable:previous?.disposable||[],generated:previous?.generated||{}};
 try{write(file,state);}catch(e){fs.unlinkSync(lockFile);throw e;}
 let ended=false;
 const relative=target=>path.relative(dir,inside(dir,path.resolve(dir,target)));
 function save(){write(file,state);}
 function discard(target){const rel=relative(target);if(!state.disposable.includes(rel))state.disposable.push(rel);save();return path.join(dir,rel);}
 function copy(source,target,{disposable=true}={}){
  const dest=inside(dir,path.resolve(dir,target));if(disposable)discard(target);
  fs.cpSync(source,dest,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});return dest;
 }
 function workspace(name,source,{directories=['src','styles','assets','vendor','templates','scripts'],files=['index.html']}={}){
  const target=inside(dir,path.join(dir,name));fs.mkdirSync(target,{recursive:true});
  for(const entry of [...directories,...files])if(fs.existsSync(path.join(source,entry))){copy(path.join(source,entry),path.join(name,entry),{disposable:entry!=='docs'});if(entry==='docs')generated(path.join(target,entry));}
  copy(path.join(source,'projects/workspace.furnish.json'),path.join(name,'projects/workspace.furnish.json'),{disposable:false});
  return target;
 }
 function generated(directory){
  const start=inside(dir,path.resolve(dir,directory));noLinks(start);
  function walk(folder){if(!fs.existsSync(folder))return;for(const e of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,e.name);if(e.isDirectory())walk(f);else state.generated[relative(f)]=sha(f);}}
  walk(start);save();
 }
 function finish(passed){
  if(ended)return state;ended=true;
  let owned=false;
  try{
   const owner=JSON.parse(fs.readFileSync(lockFile,'utf8')),current=JSON.parse(fs.readFileSync(file,'utf8'));
   if(owner.token!==token||current.token!==token||owner.pid!==process.pid)throw Error('Test ownership changed; preserve directory');
   owned=true;
   state.status=passed===true?'passed':'failed';state.finished=new Date().toISOString();
   state.kept=(state.removeEntire&&passed!==true)||!managed||env.FURNISH_KEEP_TEST_WORKSPACES==='1'||fs.existsSync(path.join(dir,'.keep'));
   if(!state.kept){
    noLinks(dir);
    // A registered browser profile may contain the only copy of unsaved edits.
    const targets=state.disposable.flatMap(rel=>{
     const target=inside(dir,path.join(dir,rel));
     return /^profile(?:-|$)/.test(path.basename(target))?profileCaches.map(name=>path.join(target,name)):[target];
    });
    const generatedFiles=(passed===true?Object.entries(state.generated):[]).filter(([rel,hash])=>{const f=inside(dir,path.join(dir,rel));return fs.existsSync(f)&&sha(f)===hash;}).map(([rel])=>inside(dir,path.join(dir,rel)));
    if(state.removeEntire){fs.rmSync(dir,{recursive:true,force:true});return state;}
    for(const target of [...targets,...generatedFiles])fs.rmSync(target,{recursive:true,force:true});
    state.cleaned=true;
   }
   save();
  }catch(e){state.cleanupError=e.message;if(owned)try{save();}catch{}console.error('Test cleanup preserved remaining files: '+dir+' ('+e.message+')');}
  finally{try{if(JSON.parse(fs.readFileSync(lockFile,'utf8')).token===token)fs.unlinkSync(lockFile);}catch{}}
  return state;
 }
 return {dir,discard,copy,workspace,generated,finish};
}
function createRun({parent=path.join(verificationRoot,'playwright'),prefix='verification-',root=verificationRoot,...options}={}){
 parent=path.resolve(parent);if(parent!==path.resolve(root))inside(path.resolve(root),parent);
 if(path.basename(prefix)!==prefix||!prefix)throw Error('Invalid test prefix');
 // Do not enumerate unrelated historical output trees.
 for(let p=parent;;p=path.dirname(p)){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('Linked test parent: '+p);if(p===path.parse(p).root)break;}
 fs.mkdirSync(parent,{recursive:true});
 const temporary=fs.mkdtempSync(path.join(parent,prefix));
 const directory=process.platform==='darwin'?temporary+'.noindex':temporary;
 if(directory!==temporary)fs.renameSync(temporary,directory);
 return openRun(directory,{root,...options});
}
const fixtures=[];let hooked=false,crashed=false;
function temporaryDirectory(prefix){
 const run=createRun({parent:path.dirname(prefix),prefix:path.basename(prefix),removeEntire:true});fixtures.push(run);
 if(!hooked){hooked=true;process.on('uncaughtExceptionMonitor',()=>{crashed=true;});process.once('exit',code=>{for(const f of fixtures)if(fs.existsSync(f.dir))f.finish(code===0&&!crashed);});}
 return run.dir;
}
// Legacy standalone checks still own their teardown, but can start from a fresh checkout.
function scratchDirectory(prefix){
 fs.mkdirSync(path.dirname(prefix),{recursive:true});
 return fs.mkdtempSync(prefix);
}
module.exports={createRun,openRun,temporaryDirectory,scratchDirectory,verificationDirectory};
