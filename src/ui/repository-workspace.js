/* Startup arbitration and recovery UI. Loaded after all ordinary UI extensions. */
(function(){
 'use strict';
 const C=FurnishRepositoryCore,clone=v=>JSON.parse(JSON.stringify(v));
 async function request(route,method='GET',body){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{const response=await fetch('/api/furnish'+route,{method,cache:'no-store',signal:abort.signal,headers:body?{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'}:{},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'仓库服务不可用'),{status:response.status});return value;}
  finally{clearTimeout(timer);}
 }
 async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(C.text(value)));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
 function cache(value){if(value.v>=3)STORE='huxing-design-v'+value.v;try{localStorage.setItem(STORE,JSON.stringify(value));}catch{/* IndexedDB remains available. */}return window.FurnishStorage.write(value).catch(()=>{});}
 function applyWorkspace(input){
  const next=C.validate(input),drafts=(next.customPlans||[]).map(d=>FurnishDraft.build(next.work[d.id].architecture.draft));
  // Drop custom plans registered from a stale cache before applying the file list.
  for(let i=PLANS.length-1;i>=0;i--)if(PLANS[i].customDraft)PLANS.splice(i,1);
  for(const plan of drafts){const found=PLANS.find(p=>p.id===plan.id);if(found)Object.assign(found,plan);else PLANS.push(plan);}
  const target=PLANS.find(p=>p.id===next.planId);if(!target)throw Error('工作区户型不存在');
  autosave.invalidate();store=next;PLAN=target;state=fixWork(store.work[PLAN.id],PLAN);customArchDraft=null;customArchPlanId='';ui.sel=null;undoStack.length=redoStack.length=0;
  applyPlanData();buildDefs();buildCats();buildLib();renderOpenings();renderDims();renderAll();fitView();renderDesigns();buildPlanList();window.View3D?.replan();savedAt=store.updatedAt||Date.now();syncSaved();
 }
 async function openRecoveries(){
  try{const entries=await request('/recoveries');openDialog({title:'本机恢复副本',wide:true,body:`<p>这些副本保存在本机，不随 Git 同步。载入某个户型会沿用项目导入，可撤销当前布置，并合并命名方案及家具库。</p><div id="repository-recoveries"></div>`,actions:[{label:'关闭'}]});
   const host=$('#repository-recoveries');if(!entries.length){host.textContent='暂无恢复副本。';return;}
   entries.sort((a,b)=>(b.workspace.updatedAt||0)-(a.workspace.updatedAt||0)).forEach(entry=>{const workspace=entry.workspace,section=document.createElement('section'),title=document.createElement('p');title.textContent=`${workspace.updatedAt?new Date(workspace.updatedAt).toLocaleString():'迁移副本'} · ${Object.keys(workspace.work||{}).length} 个户型`;section.append(title);const downloadButton=document.createElement('button');downloadButton.className='btn';downloadButton.textContent='下载完整工作区副本';downloadButton.onclick=()=>download('恢复工作区-'+entry.id.slice(0,12)+'.json',new Blob([C.text(workspace)],{type:'application/json'}));section.append(downloadButton);
    for(const [id,work] of Object.entries(workspace.work||{})){const button=document.createElement('button');button.className='btn';const name=work.architecture?.draft?.name||PLANS.find(p=>p.id===id)?.name||id;button.textContent=`载入 ${name}（${work.furniture?.length||0} 件）`;button.onclick=()=>{openDialog({title:'载入恢复副本',body:`<p>将载入 ${esc(name)} 的恢复布置，现有布置先保留恢复点。命名方案和家具库按项目导入规则合并。</p>`,actions:[{label:'取消'},{label:'确认载入',cls:'primary',fn:()=>{try{FurnishWorkspace.restore({planId:id,name,current:clone(work),designs:clone((workspace.designs||[]).filter(d=>d.planId===id)),catalog:clone(workspace.custom||[])});return true;}catch(e){toast(e.message);return false;}}}]});};section.append(button);}host.append(section);});
  }catch(e){toast('无法读取本机恢复副本：'+e.message);}
 }
 async function initialize(){
  const loading=document.createElement('div');loading.id='repository-loading';loading.style.cssText='position:fixed;inset:0;z-index:120;display:grid;place-items:center;background:rgba(250,248,242,.95);color:#343029';loading.textContent='正在核对仓库文件与浏览器恢复缓存…';document.body.append(loading);
  let saved=null;
  try{
   try{saved=await window.FurnishStorage.ready;}catch{/* Use localStorage if IndexedDB is unavailable. */}
   if(location.protocol==='file:'){
    if([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].includes(saved?.v)&&(saved.updatedAt||0)>(store.updatedAt||0))applyWorkspace(saved);
    return;
   }
   repositoryClient=FurnishRepositoryStorage.create({request,fingerprint,onChange:()=>syncSaved(),onAcknowledge:({revision})=>{if(storageWiping)return;store._repository={revision,clean:revision};cache(store);}});
   const next=await repositoryClient.initialize([repositoryInitialCache,saved,...FurnishWorkspaceCache.candidates({read:key=>localStorage.getItem(key),key:'huxing-design-v28'})]);
   if(next){applyWorkspace(next);if(store.v>=7)store.v=Math.max(store.v,9);store._repository={revision:repositoryClient.revision,clean:await fingerprint(store)};await cache(store);}
   else{store._repository={revision:null};repositoryClient.schedule(store);}
   window.FurnishRepository={flush:()=>repositoryClient.flush(),openRecoveries};
  }catch(e){
   // Do not mark a disconnected file store as saved, or overwrite any cache.
   if([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].includes(saved?.v)&&(saved.updatedAt||0)>(store.updatedAt||0))try{applyWorkspace(saved);}catch{/* Leave invalid data untouched for manual recovery. */}
   const message='仓库设计未能加载，已暂停文件保存。请重启 start-furnish.cmd 后刷新：'+e.message;
   repositoryClient={status:{mode:'error',message},schedule(){},get pending(){return false;},stop(){}};toast(message);
  }finally{if(location.protocol!=='file:'){const button=document.createElement('button');button.className='btn';button.id='repository-recovery';button.textContent='本机恢复副本';button.onclick=openRecoveries;$('#file-save-status').after(button);}repositoryBooting=false;repositoryResume();loading.remove();syncSaved();}
 }
 addEventListener('beforeunload',e=>{if(repositoryClient?.pending){repositoryClient.flush?.().catch(()=>{});e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)repositoryClient?.flush?.().catch(()=>{});});
 initialize();
})();
