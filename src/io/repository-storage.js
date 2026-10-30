/* Browser file persistence; cache snapshots carry their acknowledged file revision. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRepositoryStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create({request,fingerprint,onChange,onAcknowledge=()=>{},delay=650}){
  let revision=null,pending=null,timer=null,running=null,blocked=false,retryable=false,storage=null,lastSavedAt=null,status={mode:'loading',message:'正在读取本地正式文件…'};
  const publish=(mode,message)=>{status={mode,message:message+(storage?'\n保存位置：'+storage.file:'')+(lastSavedAt?'\n最后成功保存：'+new Date(lastSavedAt).toLocaleString():''),storage,lastSavedAt};onChange(status);};
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
   clearTimeout(timer);if(blocked){publish(retryable?'error':'conflict',retryable?'文件保存失败，后续编辑仍在浏览器缓存；请在保存设置中重试':'正式文件或位置有更新，本机编辑仅存于恢复缓存；请刷新后处理');return;}
   publish('pending','已缓存到浏览器，正在保存到本地正式文件…');timer=setTimeout(()=>{flush().catch(()=>{});},delay);
  }
  async function flush(){
   clearTimeout(timer);if(running){await running;if(pending&&!blocked)return flush();return;}
   if(!pending||blocked)return;
   const value=pending;pending=null;
   running=(async()=>{try{
    const result=await request('/workspace','PUT',{workspace:value,baseRevision:revision});revision=result.revision;
    // Newer cached edits retain this acknowledged version as their base.
    lastSavedAt=Date.now();onAcknowledge({value,revision});publish(pending?'pending':'saved',pending?'已缓存到浏览器，正在保存后续编辑…':'设计已保存到本地正式文件'+(result.warning?'；'+result.warning:''));return {value,revision};
   }catch(e){pending=pending||value;blocked=true;retryable=e.status!==409;try{await archive(pending);}catch{/* Browser caches still retain the pending edit. */}publish(e.status===409?'conflict':'error',e.status===409?'正式文件或保存位置已变化，已停止覆盖；请刷新后从“本机恢复副本”载入编辑':'本地文件保存失败，编辑仍在浏览器缓存；请重试或备份：'+e.message);throw e;}
   finally{running=null;}})();
   const result=await running;if(pending&&!blocked)await flush();return result;
  }
  function stop(){clearTimeout(timer);pending=null;blocked=true;retryable=false;publish('conflict','本机缓存已清除；本地正式文件保留，刷新可重新载入');}
  async function retry(){if(blocked&&!retryable)throw Error('文件存在冲突，请刷新后处理恢复副本');blocked=false;await flush();}
  return {initialize,schedule,flush,retry,archive,stop,get revision(){return revision;},get status(){return status;},get pending(){return !!pending||!!running;},get blocked(){return blocked;}};
 }
 return {create};
});
