// The current work slot remains the active canvas; every save mirrors only its selected design.
function switchDesign(id){
  if(repositoryBooting)return;
  const d=store.designs.find(d=>d.id===id&&d.planId===PLAN.id);
  if(!d||!d.editable||FurnishDesign.activeDesign(store,PLAN.id)?.id===id)return;
  if(ui.mA||typeof drag!=='undefined'&&drag)return toast(tr('请先结束当前绘制或拖动','Finish the current drawing or drag first'));
  try{
    const next=fixWork(JSON.parse(JSON.stringify(d.work)),PLAN);
    if(state.architecture)next.architecture=FurnishProject.protectOriginal(state.architecture,next.architecture);
    FurnishProject.validatePlanWork(PLAN,next);
    FurnishDesign.preserveCurrentDesign(store,PLAN.id,fixWork(JSON.parse(snap()),PLAN));
    save();snapshot(true,state,'切换方案前');
    (store.activeDesigns||={})[PLAN.id]=id;state=next;
    undoStack.length=redoStack.length=0;ui.sel=null;ui.mA=null;ui.mCur=null;hoverRoom='';
    save();renderAll();renderDesigns();window.View3D?.replan();$('#fileMenu').open=false;
    toast(tr(`已切换到「${d.name}」`,`Switched to "${d.name}"`));
  }catch(e){toast(e.message);}
}
function renderDesignBar(){
  const host=$('#designBar');if(!host)return;
  const active=FurnishDesign.activeDesign(store,PLAN.id),rows=store.designs.filter(d=>d.planId===PLAN.id&&d.editable===true);
  const key=JSON.stringify([PLAN.id,active?.id,rows.map(d=>[d.id,d.name]),LANG,repositoryBooting]);
  if(host.dataset.renderKey===key)return;host.dataset.renderKey=key;
  host.innerHTML=`<span class="design-bar-label">${tr('方案','Design')}</span><div class="design-tabs" role="group" aria-label="${tr('切换方案','Switch design')}">${!active?`<button class="btn on" aria-pressed="true" disabled>${tr('当前布置','Current layout')}</button>`:''}${rows.map(d=>`<button class="btn ${d.id===active?.id?'on':''}" data-switch-design="${esc(d.id)}" aria-pressed="${d.id===active?.id}" title="${esc(d.name)}" ${repositoryBooting?'disabled':''}>${esc(d.name)}</button>`).join('')}</div><button class="btn" id="bar-create-design" ${repositoryBooting?'disabled':''}>${tr('＋ 新方案','＋ New')}</button><button class="btn" id="bar-manage-designs" ${repositoryBooting?'disabled':''}>${tr('管理','Manage')}</button>`;
  host.querySelectorAll('[data-switch-design]').forEach(b=>b.onclick=()=>switchDesign(b.dataset.switchDesign));
  $('#bar-create-design').onclick=()=>window.FurnishDesignUI.editDesign('create',undefined,true);
  $('#bar-manage-designs').onclick=()=>window.FurnishDesignUI.designs();
  host.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
/* Classic declarations; initialize storage and browser handlers after app state exists. */
function renderDesigns(){
  renderDesignBar();
  const box = $('#designList'); if (!box) return;
  const list = store.designs.filter(d => d.planId === PLAN.id && d.editable!==true);
  box.innerHTML = list.length ? list.map(d =>
    `<div class="dsn"><button class="btn" data-dload="${d.id}" title="${tr('恢复此历史记录', 'Restore this history')}">${esc(d.name)}</button>
     <button class="btn danger" data-ddel="${d.id}" title="${tr('删除方案', 'Delete design')}" aria-label="${tr('删除方案', 'Delete design')}">×</button></div>`).join('')
    : `<div class="muted empty">${tr('暂无历史记录', 'No history records yet')}</div>`;
  box.querySelectorAll('[data-dload]').forEach(b => b.onclick = () => {
    const d = store.designs.find(x => x.id === b.dataset.dload); if (!d) return;
    try{const next=fixWork(JSON.parse(JSON.stringify(d.work)),PLAN);if(state.architecture)next.architecture=FurnishProject.protectOriginal(state.architecture,next.architecture);
      snapshot(true,state,'恢复历史记录前');const before=snap();state=next;ui.sel=null;commit(before);renderAll();$('#fileMenu').open=false;
      toast(tr('已恢复历史记录，可撤销','History restored; undo available'));
    }catch(e){toast(e.message);}
  });
  box.querySelectorAll('[data-ddel]').forEach(b => b.onclick = () => {
    window.FurnishDesignUI?.editDesign('delete',b.dataset.ddel);
  });
  box.insertAdjacentHTML('beforeend',`<button class="btn" id="manageDesigns">${tr('管理方案与历史','Manage designs and history')}</button>`);
  $('#manageDesigns').onclick=()=>{window.FurnishDesignUI?.designs();$('#fileMenu').open=false;};
}
function snapshot(force,data=state,reason='自动快照',planId=PLAN.id){
  if(storageWiping)return;
  const now = Date.now();
  if (!force && now - lastSnap < 30000) return;     // 节流：30 秒内只存一次（force 用于导入/重置等大动作）
  lastSnap = now;
  hist=FurnishProject.recoveryEntry(hist,planId,data,reason,now);persistHistory();
  renderHist();
}
function renderHist(){
  const box = $('#histList'); if (!box) return;
  const list = hist.filter(h => h.planId === PLAN.id);
  box.innerHTML = list.length ? list.map(h =>
    `<div class="dsn"><button class="btn" data-hload="${h.ts}" title="${tr('恢复此快照', 'Restore this snapshot')}">${new Date(h.ts).toLocaleString()} · ${h.n}${tr(' 件', ' items')}</button></div>`).join('')
    : `<div class="muted empty">${tr('暂无历史快照', 'No snapshots yet')}</div>`;
  box.querySelectorAll('[data-hload]').forEach(b => b.onclick = () => {
    const h = hist.find(x => x.ts === +b.dataset.hload); if (!h) return;
    window.FurnishDesignUI?.previewRecovery(h.ts);$('#fileMenu').open=false;
  });
}

const HIST_KEY='huxing-history';
let hist=[],lastSnap=0,historySaveErr=false,historyPersistence,shareCodec,shareLoader;
function persistHistory(){return historyPersistence.persist(hist);}
function prepareSharedWork(work,id){
  if(work.plan&&work.plan!==id)throw Error('Shared plan identity mismatch');
  const plan=PLANS.find(p=>p.id===id)||(work.architecture?FurnishDraft.build(work.architecture.draft):null);
  if(!plan||plan.id!==id)throw Error('Unknown shared plan');
  return {plan,work:workRules.prepareShared(work,plan,store.work[id]?.architecture)};
}
function applySharedWork({plan,work}){
  const before=PLAN.id===plan.id?snap():null;
  snapshot(true,state,'加载分享前');
  if(PLAN.id!==plan.id&&store.work[plan.id])snapshot(true,store.work[plan.id],'加载分享前',plan.id);
  registerCustomWork(work);
  PLAN=PLANS.find(p=>p.id===plan.id);applyPlanData();store.planId=plan.id;
  if(store.activeDesigns)delete store.activeDesigns[plan.id];
  state=work;store.work[plan.id]=state;save();
  if(before)commit(before);else undoStack.length=redoStack.length=0;
  ui.sel=null;
  buildDefs();buildLib();renderOpenings();renderDims();fitView();renderAll();buildPlanList();renderDesigns();
  window.View3D?.replan();
  history.replaceState(null,'',location.pathname+location.search);
  toast(tr('已载入分享的方案','Shared design loaded'));
}
function initializeHistorySharing(){
  hist=FurnishRecoveryStorage.readCache(()=>localStorage.getItem(HIST_KEY));
  historyPersistence=FurnishRecoveryStorage.create({
    writeCache:json=>localStorage.setItem(HIST_KEY,json),writeStore:entries=>window.FurnishStorage.writeHistory(entries),
    isCurrent:entries=>!storageWiping&&hist===entries,onChange:error=>historySaveErr=error,
  });
  window.FurnishStorage?.historyReady.then(saved=>{
    if(storageWiping)return;hist=FurnishRecoveryStorage.merge(hist,saved);renderHist();
  }).catch(()=>{});
  shareCodec=FurnishShare.create();
  shareLoader=FurnishShare.createLoader({decode:shareCodec.decode,prepare:prepareSharedWork,apply:applySharedWork,
    onError:()=>toast(tr('分享链接无效','Invalid share link'))});
$('#saveDesign').onclick = () => {
  const def = tr('方案 ', 'Design ') + new Date().toLocaleDateString();
  const name = prompt(tr('方案名称：', 'Design name:'), def); if (!name) return;
  if(name.length>80||store.designs.filter(d=>d.planId===PLAN.id).length>=100)return toast(tr('方案名称最多 80 字，每个户型最多 100 份命名方案。','Names up to 80 characters; up to 100 designs per plan.'));
  store.designs.push({id:'d'+Date.now().toString(36), name, planId:PLAN.id, ts:Date.now(), work:JSON.parse(JSON.stringify(state))});
  save(); renderDesigns(); toast(tr('已保存当前布置', 'Design saved'));
};


  $('#shareLink').onclick=async()=>{
    if(state.architecture||FurnishWallFinish.has(state)||FurnishFloorFinish.has(state)||FurnishWallTiling.has(state)||state.ceilings)return toast(tr('自定义户型或含墙面饰面、吊顶的方案请导出项目 JSON 分享','Export a project JSON to share custom plans or wall finishes'));
    const id=PLAN.id,json=JSON.stringify(state);
    const v=await shareCodec.encode(json),url=location.href.split('#')[0]+'#p='+id+'&v='+v;
    try{await navigator.clipboard.writeText(url);toast(tr('分享链接已复制，发给客户打开即可还原','Share link copied'));}
    catch(e){prompt(tr('复制分享链接：','Copy share link:'),url);}
    $('#fileMenu').open=false;snapshot(true,JSON.parse(json),'分享方案',id);
  };
  addEventListener('hashchange',()=>repositoryReady.then(()=>shareLoader.load(location.hash)));
  repositoryReady.then(()=>shareLoader.load(location.hash));
}
