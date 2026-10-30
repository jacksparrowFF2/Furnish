/* Startup arbitration and recovery UI. Loaded after all ordinary UI extensions. */
(function(){
 'use strict';
 const C=FurnishRepositoryCore,clone=v=>JSON.parse(JSON.stringify(v));
 async function request(route,method='GET',body){
  const timeout=method==='GET'&&route==='/workspace'?60000:['PUT','POST'].includes(method)&&['/workspace','/storage','/restore'].includes(route)?120000:15000;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);
  try{const response=await fetch('/api/furnish'+route,{method,cache:'no-store',signal:abort.signal,headers:body?{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'}:{},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'仓库服务不可用'),{status:response.status});return value;}
  catch(e){if(e.name==='AbortError')throw Object.assign(Error('本地文件请求超时（'+timeout/1000+' 秒），请保留浏览器缓存并重试'),{code:'ETIMEDOUT'});throw e;}
  finally{clearTimeout(timer);}
 }
 async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(C.text(value)));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
 async function cache(value){if(value.v>=3)STORE='huxing-design-v'+value.v;let cached=false;try{localStorage.setItem(STORE,JSON.stringify(value));cached=true;}catch{/* IndexedDB remains available. */}try{await window.FurnishStorage.write(value);return true;}catch{return cached;}}
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
 async function openStorage(){
  if(location.protocol==='file:'){toast('直接打开 HTML 时使用浏览器缓存。请导出备份；启动本地服务后可选择正式保存位置。');return;}
  try{
   const info=await request('/storage');
   openDialog({title:'保存位置与历史备份',wide:true,body:`<p>正式文件：<strong style="overflow-wrap:anywhere">${esc(info.file)}</strong></p><p>最后成功写入：${info.savedAt?esc(new Date(info.savedAt).toLocaleString()):'尚无正式文件'}</p><p>修改位置会复制正式文件、历史备份与恢复副本，原目录保留。目标有不同项目时停止迁移。</p><label>保存文件夹（完整路径）<input id="storage-directory" style="width:100%;box-sizing:border-box" value="${esc(info.directory)}"></label><p>自动保留${esc(info.retention)}。同盘历史用于找回旧版，请另行备份到其他磁盘。</p><p id="storage-feedback" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="storage-move">保存到此位置</button><button class="btn" id="storage-retry">重试文件保存</button></div><h3>自动历史备份</h3><p>恢复会替换整个工作区（含全部户型和命名方案），当前正式文件会先自动备份。</p><div id="storage-backups"></div>`,actions:[{label:'关闭'}]});
   const feedback=$('#storage-feedback');
   async function flush(){if(!repositoryClient?.flush)throw Error('文件保存尚未就绪，请重启服务后刷新');await repositoryClient.flush();if(repositoryClient.blocked)throw Error('文件有冲突，请刷新后处理恢复副本');}
   $('#storage-retry').onclick=async()=>{try{if(!repositoryClient?.retry)throw Error('请重启本地服务后刷新');await repositoryClient.retry();feedback.textContent='正式文件保存成功。';}catch(e){feedback.textContent=e.message;}};
   $('#storage-move').onclick=async()=>{
    const button=$('#storage-move');button.disabled=true;
    try{await flush();await request('/storage','POST',{directory:$('#storage-directory').value,baseRevision:repositoryClient.revision});location.reload();}
    catch(e){feedback.textContent='未能确认保存位置：'+e.message+'。请刷新核对，原目录保留。';button.disabled=false;}
   };
   const entries=await request('/backups'),host=$('#storage-backups');if(!host)return;
   if(!entries.length){host.textContent='首次修改正式文件后，上一版本会自动出现在这里。';return;}
   for(const entry of entries){
    const row=document.createElement('p');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';const label=document.createElement('span');label.textContent=new Date(entry.savedAt).toLocaleString()+' · '+Math.ceil(entry.bytes/1024)+' KB';row.append(label);
    const get=document.createElement('button');get.className='btn';get.textContent='下载';get.onclick=async()=>{try{const value=await request('/backups/'+entry.id);download(entry.id,new Blob([value.raw],{type:'application/json'}));}catch(e){toast(e.message);}};row.append(get);
    const restore=document.createElement('button');restore.className='btn';restore.textContent='恢复此版本';restore.onclick=()=>openDialog({title:'恢复整个工作区',body:`<p>将恢复 ${esc(new Date(entry.savedAt).toLocaleString())} 的全部户型、命名方案及家具库。当前正式文件先保留历史备份；损坏文件另存原始副本。浏览器编辑也先保存恢复副本。</p><p id="storage-restore-error" role="alert"></p>`,actions:[{label:'取消'},{label:'确认恢复',cls:'primary',fn:()=>{const buttons=Array.from($('#dlgActions').querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);(async()=>{try{if(!info.damagedRevision)await flush();await request('/recoveries','POST',{workspace:store});const restored=await request('/restore','POST',{id:entry.id,baseRevision:info.damagedRevision||repositoryClient.revision});store._repository={revision:restored.revision,clean:await fingerprint(store)};store.updatedAt=Math.max(Date.now(),(store.updatedAt||0)+1);if(!await cache(store))throw Error('正式文件已恢复，但浏览器无法保存恢复标记。请先清理浏览器缓存再重新打开，避免旧编辑覆盖恢复结果。');location.reload();}catch(e){$('#storage-restore-error').textContent='恢复未完成：'+e.message;buttons.forEach(b=>b.disabled=false);}})();return false;}}]});row.append(restore);host.append(row);
   }
  }catch(e){toast('无法读取保存设置：'+e.message);}
 }
 async function initialize(){
  const loading=document.createElement('div');loading.id='repository-loading';loading.style.cssText='position:fixed;inset:0;z-index:120;display:grid;place-items:center;background:rgba(250,248,242,.95);color:#343029';loading.textContent='正在核对本地正式文件与浏览器恢复缓存…';document.body.append(loading);
  let saved=null;
  try{
   try{saved=await window.FurnishStorage.ready;}catch{/* Use localStorage if IndexedDB is unavailable. */}
   if(location.protocol==='file:'){
    if(C.workspaceVersions.includes(saved?.v)&&(saved.updatedAt||0)>(store.updatedAt||0))applyWorkspace(saved);
    return;
   }
   repositoryClient=FurnishRepositoryStorage.create({request,fingerprint,onChange:()=>syncSaved(),onAcknowledge:({revision})=>{if(storageWiping)return;store._repository={revision,clean:revision};cache(store);}});
   const next=await repositoryClient.initialize([repositoryInitialCache,saved,...FurnishWorkspaceCache.candidates({read:key=>localStorage.getItem(key),key:STORE})]);
   if(next){applyWorkspace(next);if(store.v>=7)store.v=Math.max(store.v,9);store._repository={revision:repositoryClient.revision,clean:await fingerprint(store)};await cache(store);}
   else{store._repository={revision:null};repositoryClient.schedule(store);}
   window.FurnishRepository={flush:()=>repositoryClient.flush(),openRecoveries,openStorage};
  }catch(e){
   // Do not mark a disconnected file store as saved, or overwrite any cache.
   if(C.workspaceVersions.includes(saved?.v)&&(saved.updatedAt||0)>(store.updatedAt||0))try{applyWorkspace(saved);}catch{/* Leave invalid data untouched for manual recovery. */}
   const message='本地正式文件未能加载，已暂停文件保存。可在“保存位置与历史备份”恢复版本，或重启 start-furnish.cmd 后刷新：'+e.message;
   repositoryClient={status:{mode:'error',message},schedule(){},get pending(){return false;},stop(){}};toast(message);
  }finally{const settings=document.createElement('button');settings.className='btn';settings.id='storage-settings';settings.textContent='保存位置与历史备份';settings.onclick=()=>{$('#fileMenu').open=false;openStorage();};$('#file-storage-actions').append(settings);if(location.protocol!=='file:'){const button=document.createElement('button');button.className='btn';button.id='repository-recovery';button.textContent='本机恢复副本';button.onclick=()=>{$('#fileMenu').open=false;openRecoveries();};$('#file-recovery-actions').append(button);}repositoryBooting=false;repositoryResume();loading.remove();syncSaved();renderDesignBar();}
 }
 addEventListener('beforeunload',e=>{if(repositoryClient?.pending){repositoryClient.flush?.().catch(()=>{});e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)repositoryClient?.flush?.().catch(()=>{});});
 initialize();
})();
