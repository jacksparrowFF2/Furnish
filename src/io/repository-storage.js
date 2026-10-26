/* Browser file persistence; cache snapshots carry their acknowledged file revision. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRepositoryStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create({request,fingerprint,onChange,onAcknowledge=()=>{},delay=650}){
  let revision=null,pending=null,timer=null,running=null,blocked=false,status={mode:'loading',message:'正在读取仓库设计…'};
  const publish=(mode,message)=>{status={mode,message};onChange(status);};
  async function archive(workspace){return request('/recoveries','POST',{workspace});}
  async function initialize(caches){
   const disk=await request('/workspace','GET');revision=disk.revision;
   const candidates=caches.filter(w=>[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].includes(w?.v)&&Object.keys(w.work||{}).length).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
   const seen=new Set();for(const c of candidates){const hash=await fingerprint(c);if(hash!==revision&&!seen.has(hash)){await archive(c);seen.add(hash);}}
   const cache=candidates[0];
   if(!disk.workspace){if(!cache){publish('ready','仓库自动保存已启用');return null;}publish('pending','正在迁移浏览器设计到仓库…');const result=await request('/workspace','PUT',{workspace:cache,baseRevision:null});revision=result.revision;publish('saved','设计已保存到仓库文件；Git 同步需手动提交和推送');return {...cache,_repository:{revision}};}
   const hash=cache?await fingerprint(cache):null,action=rootDecision(disk.revision,cache?._repository?.revision,hash,cache?._repository?.clean);
   if(action==='resume'){publish('pending','正在恢复尚未写入文件的编辑…');const result=await request('/workspace','PUT',{workspace:cache,baseRevision:revision});revision=result.revision;publish('saved','已恢复本机编辑并保存到仓库文件');return {...cache,_repository:{revision}};}
   publish('saved',action==='conflict'?'已加载仓库设计；不同的本机缓存已保留，可从“本机恢复副本”载入':'已加载仓库设计；Git 同步需手动提交和推送');return {...disk.workspace,_repository:{revision}};
  }
  // Kept in the shared core as well; supplied lazily for browser and Node tests.
  function rootDecision(...args){return (typeof module==='object'&&module.exports?require('../core/repository-core.js'):FurnishRepositoryCore).decision(...args);}
  function schedule(value){
   const copy=JSON.parse(JSON.stringify(value));copy._repository={revision};pending=copy;
   clearTimeout(timer);if(blocked){publish('conflict','仓库文件有更新，本机编辑仅存于恢复缓存；请刷新后处理');return;}
   publish('pending','已缓存到浏览器，正在保存到仓库文件…');timer=setTimeout(()=>{flush().catch(()=>{});},delay);
  }
  async function flush(){
   clearTimeout(timer);if(running){await running;if(pending&&!blocked)return flush();return;}
   if(!pending||blocked)return;
   const value=pending;pending=null;
   running=(async()=>{try{
    const result=await request('/workspace','PUT',{workspace:value,baseRevision:revision});revision=result.revision;
    // Newer cached edits retain this acknowledged version as their base.
    onAcknowledge({value,revision});publish(pending?'pending':'saved',pending?'已缓存到浏览器，正在保存后续编辑…':'设计已保存到仓库文件；Git 同步需手动提交和推送');return {value,revision};
   }catch(e){pending=pending||value;blocked=true;try{await archive(pending);}catch{/* Browser caches still retain the pending edit. */}publish(e.status===409?'conflict':'error',e.status===409?'仓库文件已变化，已停止覆盖；请刷新后从“本机恢复副本”载入编辑':'仓库文件保存失败，编辑仍在浏览器缓存；请重试或备份：'+e.message);throw e;}
   finally{running=null;}})();
   const result=await running;if(pending&&!blocked)await flush();return result;
  }
  function stop(){clearTimeout(timer);pending=null;blocked=true;publish('conflict','本机缓存已清除；仓库设计文件保留，刷新可重新载入');}
  return {initialize,schedule,flush,archive,stop,get revision(){return revision;},get status(){return status;},get pending(){return !!pending||!!running;},get blocked(){return blocked;}};
 }
 return {create};
});
