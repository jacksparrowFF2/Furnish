/* Browser file persistence; cache snapshots carry their acknowledged file revision. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRepositoryStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create({request,fingerprint,onChange,onAcknowledge=()=>{},delay=650,retryDelays=[1500,5000,15000]}){
  let revision=null,pending=null,timer=null,running=null,blocked=false,retryable=false,storage=null,lastSavedAt=null,retryTimer=null,retryCount=0,uncertain=null,lastFailure='',stopped=false,status={mode:'loading',message:'正在读取本地正式文件…'};
  const publish=(mode,message)=>{status={mode,message:message+(storage?'\n保存位置：'+storage.file:'')+(lastSavedAt?'\n最后成功保存：'+new Date(lastSavedAt).toLocaleString():''),storage,lastSavedAt};onChange(status);};
  const transient=e=>!e.status||e.status>=500||[408,423,429].includes(e.status);
  function cancelRetry(){clearTimeout(retryTimer);retryTimer=null;}
  function queueRetry(error){
   if(stopped||!transient(error)||retryCount>=retryDelays.length)return;
   cancelRetry();const wait=retryDelays[retryCount++];retryTimer=setTimeout(()=>{retryTimer=null;retry(false).catch(()=>{});},wait);
  }
  // A lost response does not prove the write failed. Only accept the exact
  // attempted content, or the unchanged base; never adopt an unrelated file.
  async function reconcile(){
   if(!uncertain)return false;
   const disk=await request('/workspace','GET');
   if(disk.revision===uncertain.hash){revision=disk.revision;uncertain=null;return true;}
   if(disk.revision===uncertain.base){uncertain=null;return false;}
   throw Object.assign(Error('正式文件包含其他修改，已停止覆盖；请刷新后处理恢复副本'),{status:409});
  }
  async function archive(workspace){return request('/recoveries','POST',{workspace});}
  async function initialize(caches){
   const disk=await request('/workspace','GET');revision=disk.revision;storage=disk.storage||null;lastSavedAt=storage?.savedAt||null;
   const candidates=caches.filter(w=>[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38].includes(w?.v)&&Object.keys(w.work||{}).length).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
   const seen=new Set();for(const c of candidates){const hash=await fingerprint(c);if(hash!==revision&&!seen.has(hash)){await archive(c);seen.add(hash);}}
   const cache=candidates[0];
   if(!disk.workspace){if(!cache){publish('ready','本地正式文件自动保存已启用');return null;}publish('pending','正在迁移浏览器设计到本地正式文件…');const result=await request('/workspace','PUT',{workspace:cache,baseRevision:null});revision=result.revision;lastSavedAt=Date.now();publish('saved','设计已保存到本地正式文件');return {...cache,_repository:{revision}};}
   const hash=cache?await fingerprint(cache):null,action=rootDecision(disk.revision,cache?._repository?.revision,hash,cache?._repository?.clean);
   if(action==='resume'){publish('pending','正在恢复尚未写入文件的编辑…');const result=await request('/workspace','PUT',{workspace:cache,baseRevision:revision});revision=result.revision;lastSavedAt=Date.now();publish('saved','已恢复本机编辑并保存到本地正式文件');return {...cache,_repository:{revision}};}
   publish('saved',action==='conflict'?'已加载本地正式文件；不同的浏览器缓存已保留，可从“本机恢复副本”载入':'已加载本地正式文件；浏览器缓存用于意外恢复');return {...disk.workspace,_repository:{revision}};
  }
  // Kept in the shared core as well; supplied lazily for browser and Node tests.
  function rootDecision(...args){return (typeof module==='object'&&module.exports?require('../core/repository-core.js'):FurnishRepositoryCore).decision(...args);}
  function schedule(value){
   const copy=JSON.parse(JSON.stringify(value));copy._repository={revision};pending=copy;
   clearTimeout(timer);if(blocked){publish(retryable?'error':'conflict',lastFailure||'文件保存已暂停；编辑保留在浏览器缓存');return;}
   publish('pending','已缓存到浏览器，正在保存到本地正式文件…');timer=setTimeout(()=>{flush().catch(()=>{});},delay);
  }
  async function flush(){
   clearTimeout(timer);if(running){await running;if(pending&&!blocked)return flush();return;}
   if(!pending||blocked)return;
   const value=pending;pending=null;
   running=(async()=>{try{
    await reconcile();const base=revision;let result;
    try{result=await request('/workspace','PUT',{workspace:value,baseRevision:base});}
    catch(error){
     if(!transient(error)&&error.status!==409)throw error;
     uncertain={base,hash:await fingerprint(value)};let committed=false;
     try{committed=await reconcile();}catch(probeError){if(probeError.status===409)throw probeError;}
     if(!committed)throw error;result={revision};
    }
    revision=result.revision;lastFailure='';retryCount=0;cancelRetry();
    if(stopped)return {value,revision};
    // Newer cached edits retain this acknowledged version as their base.
    lastSavedAt=Date.now();onAcknowledge({value,revision});publish(pending?'pending':'saved',pending?'已缓存到浏览器，正在保存后续编辑…':'设计已保存到本地正式文件'+(result.warning?'；'+result.warning:''));return {value,revision};
   }catch(e){if(stopped)throw e;pending=pending||value;blocked=true;retryable=e.status!==409;lastFailure=(e.status===409?'文件保存存在冲突，已停止覆盖：':'本地文件保存失败，编辑仍在浏览器缓存：')+e.message;try{await archive(pending);}catch{/* Browser caches still retain the pending edit. */}publish(e.status===409?'conflict':'error',lastFailure);queueRetry(e);throw e;}
   finally{running=null;}})();
   const result=await running;if(pending&&!blocked)await flush();return result;
  }
  function stop(){clearTimeout(timer);cancelRetry();stopped=true;pending=null;blocked=true;retryable=false;publish('conflict','本机缓存已清除；本地正式文件保留，刷新可重新载入');}
  async function retry(reset=true){if(stopped||blocked&&!retryable)throw Error('文件存在冲突或已停止保存，请刷新后处理恢复副本');cancelRetry();if(!pending&&!running)return;if(reset)retryCount=0;blocked=false;publish('pending','正在重试本地文件保存…');await flush();}
  return {initialize,schedule,flush,retry,archive,stop,get revision(){return revision;},get status(){return status;},get pending(){return !!pending||!!running;},get blocked(){return blocked;}};
 }
 return {create};
});
