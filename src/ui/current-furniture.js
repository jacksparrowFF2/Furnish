/* Current-plan furniture management shares the catalog island and mutate history. */
(function(){
 'use strict';
 const C=FurnishFurnitureManagement,L=FurnishLayers,P=FurnishProject;
 let owner=null,room='all',checked=new Set(),bulkOpen=false,error='',targetLayer='0',targetStatus='planned';
 const active=()=>libUI.collection==='current';
 function selectionChanged(){if(active()){const ids=new Set(selIds());document.querySelectorAll('#lib [data-current-row]').forEach(row=>row.classList.toggle('located',ids.has(row.dataset.currentRow)));}}
 const statusName=id=>tr(P.purchaseStates[id],{planned:'To select',confirmed:'Confirmed',ordered:'Ordered',received:'Received'}[id]);
 function reset(){room='all';checked.clear();bulkOpen=false;error='';}
 function filterChanged(){checked.clear();bulkOpen=false;error='';render();}
 function controls(){
  const count=checked.size,summary=$('#current-bulk-label');
  if(summary)summary.textContent=tr(`批量操作 · 已勾选 ${count} 件`,`Bulk actions · ${count} checked`);
  document.querySelectorAll('#current-bulk [data-current-action]').forEach(b=>b.disabled=!count);
  const checks=[...document.querySelectorAll('#lib [data-current-check]')],all=$('#current-check-all');
  if(all){all.checked=!!checks.length&&checks.every(b=>b.checked);all.indeterminate=checks.some(b=>b.checked)&&!all.checked;all.disabled=!checks.length;}
 }
 function run(operation){
  try{
   const count=checked.size,next=C.apply(state,[...checked],operation);
   mutate(()=>{if(operation.kind==='layer')state.objectLayers=next.objectLayers;else state.furniture=next.furniture;});
   error='';render();toast(tr(`已更新 ${count} 件家具，可撤销。`,`Updated ${count} items; undo is available.`));
  }catch(e){error=e.message;render();}
 }
 function locate(id){
  const f=getF(id);if(!f)return render();
  if(!L.visible(state,L.furnitureKey(f))){toast(tr('所在图层已隐藏，请先在图层管理中显示。','This layer is hidden. Show it in Layer manager first.'),{label:tr('图层管理','Layers'),fn:()=>FurnishObservationLayers.open()});return;}
  if(is3D()){selectIds([id]);window.View3D?.focusSelection();}else focusItem(id);
  closeDrawers();render();
 }
 function render(){
  if(!active())return;
  if(owner!==PLAN.id){owner=PLAN.id;reset();libUI.q='';$('#libSearch').value='';targetLayer='0';targetStatus='planned';}
  const plan=P.effectivePlan(PLAN,state),all=C.rows(plan,state),rooms=[...(plan.rooms||[]).map(r=>({id:'room:'+r.id,name:state.rooms?.[r.id]?.name||r.name})),{id:'unassigned',name:tr('未归属房间','Unassigned')},{id:'outside',name:tr('户型外','Outside plan')}];
  if(!rooms.some(r=>r.id===room))room='all';
  const rows=C.filter(all,{room,query:libUI.q},nm),ids=new Set(rows.map(r=>r.id));checked=new Set([...checked].filter(id=>ids.has(id)));
  const layers=L.list(state);if(!layers.some(l=>l.id===targetLayer))targetLayer='0';
  const host=$('#lib'),scroll=host.closest('aside').scrollTop,focus=host.contains(document.activeElement)?document.activeElement.id:null;
  const selection=new Set(selIds()),disabled=checked.size?'':'disabled';
  const row=r=>{const f=r.furniture;let height=null;try{const h=FurnishDesign.furnitureVerticalBounds(f);if(h&&Number.isFinite(h.top-h.bottom))height=Number((h.top-h.bottom).toFixed(1));}catch{/* Keep damaged models manageable through the existing recovery flow. */}
   return `<article class="current-item ${selection.has(f.id)?'located':''}" data-current-row="${esc(f.id)}">
    <label class="current-check"><input type="checkbox" data-current-check="${esc(f.id)}" aria-label="${esc(tr('勾选 ','Check ')+nm(f.name))}" ${checked.has(f.id)?'checked':''}></label>
    <button class="current-locate" data-current-locate="${esc(f.id)}" title="${esc(tr('点击定位','Click to locate'))}"><b>${esc(nm(f.name))}</b><small>${f.w}×${f.d} mm · ${tr('包络高','Bounds height')} ${height===null?tr('未知','unknown'):height+' mm'}</small>${f.brand||f.model?`<small>${esc([f.brand,f.model].filter(Boolean).join(' · '))}</small>`:''}</button>
    <div class="current-meta"><span>${esc(statusName(r.status))}</span><span>${tr('图层','Layer')} ${esc(r.layer.name)}</span>${r.locked?`<span>${tr(r.layer.locked?'图层锁定':'单件锁定',r.layer.locked?'Layer locked':'Item locked')}</span>`:''}${!r.layer.visible?`<span>${tr('图层隐藏','Hidden layer')}</span>`:''}</div>
   </article>`;};
  host.innerHTML=`<section class="current-management">
   <label class="current-room-label">${tr('按房间查看','View by room')}<select id="current-room"><option value="all">${tr('全部房间','All rooms')} · ${all.length}</option>${rooms.map(r=>`<option value="${esc(r.id)}" ${room===r.id?'selected':''}>${esc(nm(r.name))} · ${all.filter(row=>row.room===r.id).length}</option>`).join('')}</select></label>
   <div class="current-selection"><label><input id="current-check-all" type="checkbox">${tr('勾选当前结果','Check results')}</label><button class="btn" id="current-clear-checks">${tr('取消勾选','Clear checks')}</button></div>
   <details id="current-bulk" ${bulkOpen?'open':''}><summary id="current-bulk-label"></summary>
    <div class="current-bulk-body"><div class="current-lock-actions"><button class="btn" id="current-lock" data-current-action="lock" ${disabled}>${tr('锁定','Lock')}</button><button class="btn" id="current-unlock" data-current-action="unlock" ${disabled}>${tr('解锁','Unlock')}</button></div>
     <label>${tr('分配图层','Assign layer')}<span class="current-batch-field"><select id="current-target-layer">${layers.map(l=>`<option value="${esc(l.id)}" ${l.id===targetLayer?'selected':''} ${l.locked?'disabled':''}>${esc(l.name)}${l.locked?' · '+tr('已锁定','Locked'):''}${!l.visible?' · '+tr('隐藏','Hidden'):''}</option>`).join('')}</select><button class="btn" id="current-assign" data-current-action="layer" ${disabled}>${tr('分配','Assign')}</button></span></label>
     <label>${tr('采购状态','Purchase status')}<span class="current-batch-field"><select id="current-target-status">${Object.keys(P.purchaseStates).map(id=>`<option value="${id}" ${id===targetStatus?'selected':''}>${esc(statusName(id))}</option>`).join('')}</select><button class="btn" id="current-purchase" data-current-action="purchase" ${disabled}>${tr('应用','Apply')}</button></span></label>
     <p class="muted">${tr('仅修改勾选条目；切换房间或搜索会清空勾选。图层锁定须先在图层管理中解除。','Only checked items change. Changing room or search clears checks. Unlock layers in Layer manager first.')}</p>
     <button class="btn" id="current-open-layers">${tr('管理／新建图层','Manage / create layers')}</button>
    </div></details>
   <p id="current-error" class="project-error" role="alert">${esc(error)}</p>
   ${rows.length?rooms.map(g=>{const items=rows.filter(r=>r.room===g.id);return items.length?`<section class="current-room-group"><h4>${esc(nm(g.name))} · ${items.length}</h4>${items.map(row).join('')}</section>`:'';}).join(''):`<p class="hint">${tr(all.length?'当前筛选下没有家具，试试全部房间或清除搜索。':'当前方案还没有家具，可从“全部产品”添加。',all.length?'No matching items. Try all rooms or clear search.':'This plan has no furniture. Add some from All items.')}</p>`}
  </section>`;
  $('#catalog-result').textContent=tr(`${rows.length} / ${all.length} 件家具`,`${rows.length} / ${all.length} items`);
  $('#current-room').onchange=e=>{room=e.target.value;filterChanged();};
  $('#current-bulk').ontoggle=e=>bulkOpen=e.target.open;
  document.querySelectorAll('#lib [data-current-check]').forEach(b=>b.onchange=()=>{b.checked?checked.add(b.dataset.currentCheck):checked.delete(b.dataset.currentCheck);error='';$('#current-error').textContent='';if(checked.size){bulkOpen=true;$('#current-bulk').open=true;}controls();});
  $('#current-check-all').onchange=e=>{for(const r of rows)e.target.checked?checked.add(r.id):checked.delete(r.id);if(checked.size)bulkOpen=true;render();};
  $('#current-clear-checks').onclick=()=>{checked.clear();render();};
  document.querySelectorAll('#lib [data-current-locate]').forEach(b=>b.onclick=()=>locate(b.dataset.currentLocate));
  $('#current-target-layer').onchange=e=>targetLayer=e.target.value;
  $('#current-target-status').onchange=e=>targetStatus=e.target.value;
  document.querySelectorAll('#lib [data-current-action]').forEach(b=>b.onclick=()=>run(b.dataset.currentAction==='lock'||b.dataset.currentAction==='unlock'?{kind:'lock',locked:b.dataset.currentAction==='lock'}:b.dataset.currentAction==='layer'?{kind:'layer',layerId:targetLayer}:{kind:'purchase',status:targetStatus}));
  $('#current-open-layers').onclick=()=>FurnishObservationLayers.open();
  controls();host.closest('aside').scrollTop=scroll;if(focus)document.getElementById(focus)?.focus({preventScroll:true});
 }
 window.FurnishCurrentFurniture={render,afterRender:render,selectionChanged,reset,filterChanged};
})();
