/* Property panels and note editing. Classic script declarations only;
 * read the current application state when called, including after undo/load. */
function renderPanel(){
  const object=!!ui.sel&&ui.panelScope!=='design';
  renderPanelContent(object);
  const p=$('#panel'),f=selIds().length===1&&getF(ui.sel?.id),name=panelSelectionName();
  p.insertAdjacentHTML('afterbegin',`<nav class="property-nav" aria-label="${tr('属性与方案范围','Properties scope')}"><div><button class="btn ${object?'on':''}" data-panel-scope="object" aria-pressed="${object}" ${ui.sel?'':'disabled'}>${tr('当前对象','Current object')}</button><button class="btn ${object?'':'on'}" data-panel-scope="design" aria-pressed="${!object}">${tr('整案','Whole design')}</button></div><small>${object?esc(name):esc(nm(PLAN.name))}${!object&&ui.sel?` · ${tr('保留选中','Selection retained')} ${esc(name)}`:''}</small></nav>`);
  let peek=$('#property-peek');if(!peek){peek=document.createElement('div');peek.id='property-peek';$('#stage').append(peek);peek.onclick=e=>{const b=e.target.closest('[data-peek-scope]');if(!b)return;ui.panelScope=b.dataset.peekScope;renderPanel();drawer('panel',true);};}
  peek.hidden=!ui.sel;peek.dataset.kind=ui.sel?.kind||'';
  peek.innerHTML=`<div><b>${esc(name)}</b>${f?furnitureDimensionSummary(f):''}</div><button class="btn" data-peek-scope="object" aria-expanded="${$('aside.right').classList.contains('open')}" aria-controls="panel">${tr('展开属性','Expand properties')}</button>`;
  window.FurnishObservationLayers?.afterRender();
}
function panelSelectionName(){
 const sel=ui.sel;if(!sel)return tr('未选择对象','No selection');
 if(sel.kind==='furn')return selIds().length>1?tr(`已选 ${selIds().length} 件`,`${selIds().length} selected`):nm(getF(sel.id)?.name||tr('家具','Furniture'));
 if(sel.kind==='room')return selectedRooms().length>1?tr(`已选 ${selectedRooms().length} 个区域`,`${selectedRooms().length} selected areas`):nm(state.rooms[sel.id]?.name||ROOMS.find(r=>r.id===sel.id)?.name||tr('房间','Room'));
 const bay=FurnishBayWindows.selected(PLAN,sel);if(bay)return nm(state.rooms[bay.platform.id]?.name||bay.platform.name)+' · '+tr(sel.kind==='room'?'台面':'窗体',sel.kind==='room'?'Platform':'Window');
 if(sel.kind==='note')return getNote(sel.id)?.text||tr('文字标注','Note');
 if(sel.kind==='ceiling')return state.ceilings?.regions?.find(r=>r.id===sel.regionId)?.name||state.ceilings?.items.find(c=>c.id===sel.id)?.name||tr('吊顶','Ceiling');
 const names={wall:['墙体','Wall'],door:['房门','Door'],slide:['推拉门','Sliding door'],win:['窗户','Window'],measure:['测量线','Measurement']};
 return tr(...(names[sel.kind]||['已选对象','Selected object']));
}
function renderPanelContent(object=true){
  const wallDistanceOpen=$('#panel .wall-distance-panel[open]')?.dataset.wallDistanceOwner;
  globalThis.FurnishRoomMeasure?.afterRender();
  if(ui.sel?.kind!=='wall')window.FurnishWorkflowTools?.clearDistances();
  window.FurnishWorkspace?.clearOpeningPreview();
  renderFab();
  if(object&&ui.sel?.kind==='ceiling'){
    const c=state.ceilings?.items.find(c=>c.id===ui.sel.id),r=state.ceilings?.regions?.find(r=>r.id===c?.regionId);
    if(c){const p=$('#panel');p.innerHTML=`<section><h3>${esc(r?.name||c.name)}</h3><p>${r?tr('独立吊顶区域','Independent ceiling area')+' · '+Math.abs(FurnishCeiling.area(r.polygon)/1e6).toFixed(2)+' m²':tr('旧吊顶构件','Existing ceiling element')}</p><p class="muted">${tr('点击浮动栏「编辑吊顶」，进入吊顶设计页面。','Use Edit ceiling in the floating toolbar to open the ceiling workspace.')}</p></section>`;return;}
  }
  const p = $('#panel'), ids = object?selIds():[];delete p.dataset.bayId;
  if (ids.length > 1){ p.innerHTML = multiPanel(selItems()); bindDirectionalMeasurementPanel(); const laundry=laundryGroupHost(selItems());if(laundry)bindKitchenPanel(laundry);return; }
  if (object && ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ if(furnitureError(f)){renderBrokenFurniturePanel(f,p);return;}try{p.innerHTML = furnPanel(f)+(window.FurnishFloorFinishUI?.furniturePanel(f)||'');const wallDetails=p.querySelector('.wall-distance-panel');if(wallDetails&&wallDetails.dataset.wallDistanceOwner===wallDistanceOpen)wallDetails.open=true;bindFurnPanel(f);}catch(e){furnitureRenderErrors.set(f.id,e.message||String(e));renderBrokenFurniturePanel(f,p);}return; } }
  if (object && ui.sel?.kind === 'wall' && window.FurnishWorkspace){ window.FurnishWorkspace.wallPanel(ui.sel.id,p); window.FurnishWorkflowTools?.afterPanel(); return; }
  if (object && ui.sel?.kind === 'room'){const rooms=selectedRooms();if(rooms.length===1&&window.FurnishWorkspace?.bayPanel(ui.sel,p))return;p.innerHTML=rooms.length>1?roomAreaPanel(rooms):rooms.length?roomPanel(rooms[0]):'';if(rooms.length===1)bindRoomPanel();p.querySelectorAll('[data-area-room]').forEach(b=>b.onclick=()=>toggleRoom(b.dataset.areaRoom));return; }
  if (object && (ui.sel?.kind === 'door' || ui.sel?.kind === 'slide')){ p.innerHTML = openingPanel(ui.sel); bindOpeningPanel(ui.sel); window.FurnishWorkspace?.openingGeometry(ui.sel,p); window.FurnishWallFinishUI?.opening(ui.sel,p); return; }
  if (object && ui.sel?.kind === 'win'){ if(window.FurnishWorkspace?.bayPanel(ui.sel,p)){window.FurnishWallFinishUI?.opening(ui.sel,p);return;} if(!window.FurnishWorkspace?.windowPanel(ui.sel.id,p)){p.innerHTML = winPanel(ui.sel.id); bindWinPanel(ui.sel.id);} window.FurnishWorkspace?.openingGeometry(ui.sel,p); window.FurnishWallFinishUI?.opening(ui.sel,p); return; }
  if (object && ui.sel?.kind === 'note'){ const n = getNote(ui.sel.id); if (n){ p.innerHTML = notePanel(n); return; } }
  if(object && ui.sel?.kind==='measure'&&state.measures[ui.sel.id]){
    const m=state.measures[ui.sel.id];p.innerHTML=`<section><h3>${tr('测量线','Measurement')}</h3><p class="big">${Math.round(Math.hypot(m.b.x-m.a.x,m.b.y-m.a.y))} mm</p><p class="muted">${tr('固定端点；家具或墙体改变后请重新测量。','Fixed endpoints; remeasure after moving furniture or walls.')}</p><p class="muted">${tr('也可按 Delete / Backspace 删除，Ctrl+Z 撤销。','Delete / Backspace removes it; Ctrl+Z undoes.')}</p><div class="actions"><button class="btn" data-act="home">${tr('查看整案','View whole design')}</button></div></section>`;return;
  }
  if(window.FurnishWorkflowTools&&['space','style'].includes(ui.tab)){p.innerHTML=ui.tab==='space'?FurnishWorkflowTools.spacePanel():FurnishWorkflowTools.stylePanel();return;}
  const lost = state.furniture.filter(isOutside).length, clashN = collisions().length;
  const tab = (k, icon, zh, en, n, warn) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-tab="${k}">${ico(icon)}${tr(zh, en)}${n != null ? `<span class="n ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`;
  p.innerHTML = `<div class="tabs" role="tablist">${tab('overview', 'chart', '概览', 'Overview')}${tab('list', 'list', '清单', 'Items', state.furniture.length, lost || clashN)}${tab('quote', 'coin', '报价', 'Quote')}</div>`
    + (ui.tab === 'list' ? listPanel() : ui.tab === 'quote' ? quotePanel() : overviewPanel());
  if (ui.tab === 'overview') bindOverview();
  window.FurnishWorkflowTools?.afterPanel();
}
function renderBrokenFurniturePanel(f,p){
 p.innerHTML=`<section><h3>${esc(nm(f.name))}</h3><p class="project-error" role="alert">${esc(furnitureError(f))}</p><p>${tr('原方案记录已保留。画布虚线框仅表示保存的外包尺寸，空间核对待修复。','Original record retained. The dashed box shows the saved envelope; spatial checks require repair.')}</p><p>${f.w} × ${f.d} mm</p>${f.kitchen?`<p>${tr('按现有宽深修复会按每边原比例调整模块；按模块修复会重新计算总宽深。位置、旋转、镜像和其他资料保留，可撤销。','Keep envelope to scale modules proportionally, or keep modules to recalculate the envelope. Position and other details are retained; repairs can be undone.')}</p><div class="actions"><button class="btn primary" id="repair-kitchen-envelope" ${furnitureLocked(f)?'disabled':''}>${tr('按现有宽深修复模块','Keep envelope; repair modules')}</button><button class="btn" id="repair-kitchen-modules" ${furnitureLocked(f)?'disabled':''}>${tr('按模块修复总宽深','Keep modules; repair envelope')}</button></div>`:''}${furnitureLocked(f)?`<button class="btn" data-act="lock">${tr('解锁','Unlock')}</button>`:''}<button class="btn" id="broken-furniture-backup">${tr('备份当前原始方案 JSON','Back up raw plan JSON')}</button><p id="model-repair-error" role="alert"></p></section>`;
 for(const [id,keep] of [['repair-kitchen-envelope',true],['repair-kitchen-modules',false]]){const b=$('#'+id);if(b)b.onclick=()=>{try{const next=FurnishKitchen.repairDimensions(getF(f.id),keep);mutate(()=>Object.assign(getF(f.id),next));}catch(e){$('#model-repair-error').textContent=e.message;}};}
 $('#broken-furniture-backup').onclick=()=>download(PLAN.id+'-recovery.json',new Blob([JSON.stringify({plan:PLAN.id,name:PLAN.name,...state},null,2)],{type:'application/json'}));
}

// 底部浮动工具条：触屏没有键盘，常用操作都放在这里
function renderFab(){
  const fab = $('#fab'), ids = selIds(), f = ids.length === 1 && getF(ids[0]), r = ui.sel?.kind === 'room' && selectedRooms().length===1 && ROOMS.find(r => r.id === ui.sel.id);
  closeFabEditor(false);
  if(!ids.length&&!r)clearFabDock();
  fab.removeAttribute('style');
  fab.setAttribute('role','toolbar');fab.setAttribute('aria-label',tr('选中对象快捷调整','Selection quick adjustments'));
  if(ui.sel?.kind==='measure'&&state.measures[ui.sel.id]){fab.innerHTML=`<span class="name">${tr('测量线','Measurement')}</span><button class="btn danger" data-act="del">${tr('删除测量线','Delete measurement')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;fab.classList.add('show');return;}
  const ceiling=ui.sel?.kind==='ceiling'&&state.ceilings?.items.find(c=>c.id===ui.sel.id);
  if(ceiling){fab.innerHTML=`<span class="name">${esc(panelSelectionName())}</span><button class="btn primary" data-ceiling-fab aria-haspopup="dialog" ${FurnishLayers.locked(state,'ceiling:'+ceiling.id)?'disabled':''}>${tr('编辑吊顶','Edit ceiling')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;fab.classList.add('show');fab.querySelector('[data-ceiling-fab]').onclick=()=>FurnishCeilingUI.selectObject(ceiling.id,true);queueFabPosition();return;}
  const bay=FurnishBayWindows.selected(PLAN,ui.sel);
  if(bay){fab.innerHTML=`<span class="name">${esc(nm(state.rooms[bay.platform.id].name))}</span><button class="btn" data-bay-fab="window">${tr('窗体','Window')}</button><button class="btn" data-bay-fab="platform">${tr('台面','Platform')}</button><button class="btn" data-act="prop">${tr('飘窗属性','Bay properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;fab.classList.add('show');fab.querySelector('[data-bay-fab="window"]').onclick=()=>select({kind:'win',id:bay.windows[0].index});fab.querySelector('[data-bay-fab="platform"]').onclick=()=>select({kind:'room',id:bay.platform.id});queueFabPosition();return;}
  if (!ids.length && !r){ fab.classList.remove('show'); return; }
  const b = (act, icon, label, cls = '') => `<button class="btn ${cls}" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  fab.innerHTML = ids.length
    ? `<div class="fab-primary"><span class="name">${f ? esc(nm(f.name)) : tr(`已选 ${ids.length} 件`, `${ids.length} selected`)}</span>`
      + (f?`<button class="btn fab-size" data-fab-edit="size" aria-haspopup="dialog" aria-expanded="false" ${furnitureLocked(f)||furnitureError(f)?'disabled':''} title="${furnitureUsesDetailedDesign(f)?tr('打开柜体详细设计','Open cabinet designer'):FurnishProducts.definition(f)?.wallRecess?tr('调整箱体宽、深、高','Edit box width, depth and height'):tr('调整占地宽度与深度','Edit footprint width and depth')}"><b>${Number(FurnishProducts.dimensions(f).w.toFixed(2))} × ${Number(FurnishProducts.dimensions(f).d.toFixed(2))}${FurnishProducts.definition(f)?.wallRecess?' × '+Number(FurnishProducts.height(f).toFixed(2)):''}</b><small>mm · ${furnitureUsesDetailedDesign(f)?tr('详细设计','Design'):tr('尺寸','Size')}</small></button>`:'')
      + `<button class="btn" data-fab-edit="distance" aria-haspopup="dialog" aria-expanded="false" ${selItems().some(v=>furnitureError(v))?'disabled':''}>${tr('四向净距','Clearances')}</button></div><div class="fab-actions">`
      + b('rotL', 'rotL', tr('逆时针 90°', 'Rotate left')) + b('rotR', 'rotR', tr('顺时针 90°', 'Rotate right')) + b('flip', 'flip', tr('镜像', 'Mirror'))
      + (ids.length>1?`<button class="btn" data-act="${selItems().every(f=>f.groupId&&f.groupId===selItems()[0].groupId)?'ungroup':'group'}">${selItems().every(f=>f.groupId&&f.groupId===selItems()[0].groupId)?tr('解组','Ungroup'):tr('打组','Group')}</button>`:'')
      + b('lock', selItems().every(x => furnitureLocked(x)) ? 'lock' : 'unlock', tr('锁定 / 解锁', 'Lock / unlock')) + b('dup', 'copy', tr('复制一份', 'Duplicate')) + b('del', 'trash', tr('删除', 'Delete'), 'danger')
      + `<span class="sep"></span><button class="btn" data-act="prop">${tr('属性','Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button></div>`
    : `<div class="fab-primary"><span class="name">${esc(nm(state.rooms[r.id].name))}</span>${r.counted!==false?'<button class="btn" data-tiling-open aria-haspopup="dialog">铺砖</button>':''}</div><div class="fab-actions"><button class="btn" data-act="roomFurn">${tr('选中房间内家具','Select its furniture')}</button><button class="btn narrow-only" data-act="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button></div>`;
  fab.classList.add('show');
  fab.querySelectorAll('[data-fab-edit]').forEach(b=>b.onclick=()=>openFabEditor(b.dataset.fabEdit));
  queueFabPosition();
}

function furnitureUsesDetailedDesign(f){return FurnishCabinet.supported(f)||!!f.kitchen;}
function openSelectionProperties(){
  const items=selItems(),f=items.length===1&&items[0];
  ui.panelScope='object';
  if(f&&furnitureUsesDetailedDesign(f)&&!furnitureLocked(f)&&!furnitureError(f)){
    openFabEditor('size');return;
  }
  renderPanel();drawer('panel',true);
}
let fabEditor=null,fabPositionFrame=0,fabDockKey='',fabRevealFrame=0,fabRevealPending=false;
function closeFabEditor(focus=true){
  if(!fabEditor)return;
  const {kind,dispose}=fabEditor;fabEditor=null;dispose();$('#fab-editor')?.remove();
  $('#stage').classList.remove('fab-editing');
  const button=$(`#fab [data-fab-edit="${kind}"]`);button?.setAttribute('aria-expanded','false');
  if(focus)button?.focus({preventScroll:true});
  queueFabPosition();
}
function mountFabEditor(kind,title,content,{allowCanvas,dispose}={}){
  const panel=document.createElement('div');
  panel.id='fab-editor';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','fab-editor-title');
  panel.innerHTML=`<div class="fab-editor-head"><b id="fab-editor-title">${esc(title)}</b><button class="btn" data-fab-close aria-label="${tr('关闭快捷调整','Close quick adjustments')}">${ico('x')}</button></div>`+content;
  ($('#fab-dock')||$('#stage')).append(panel);$('#stage').classList.add('fab-editing');
  const outside=e=>{if(allowCanvas?.(e)&&e.target.closest('#plan,#view3d'))return;if(!e.target.closest('#fab,#fab-editor'))closeFabEditor(false);};
  document.addEventListener('pointerdown',outside,true);
  const keydown=e=>{if(e.key==='Escape'&&!allowCanvas?.(e)){e.preventDefault();e.stopPropagation();closeFabEditor();}};
  document.addEventListener('keydown',keydown,true);
  fabEditor={kind,dispose:()=>{dispose?.();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keydown,true);}};
  panel.querySelectorAll('[data-fab-close]').forEach(b=>b.onclick=()=>closeFabEditor());
  panel.addEventListener('keydown',e=>e.stopPropagation());
  $(`#fab [data-fab-edit="${kind}"]`)?.setAttribute('aria-expanded','true');
  queueFabPosition();return panel;
}
function openFabEditor(kind){
  if(kind==='floor'){if(fabEditor?.kind===kind)closeFabEditor();else window.FurnishFloorFinishUI?.openFloating();return;}
  if(fabEditor?.kind===kind){closeFabEditor();return;}
  closeFabEditor(false);
  const items=selItems(),f=items.length===1&&items[0];if(!items.length)return;
  if(kind==='size'){
    if(!f||furnitureLocked(f)||furnitureError(f))return;
    if(furnitureUsesDetailedDesign(f)){FurnishCabinetEditor.open(f.id);return;}
  }
  const before=snap(),planId=PLAN.id,ids=selIds().join('\n');
  const boxSize=kind==='size'&&FurnishProducts.definition(f)?.wallRecess;
  const title=kind==='size'?(boxSize?tr('调整箱体尺寸','Edit box dimensions'):tr('调整占地尺寸','Edit footprint size')):tr('四向净距定位','Position by clearance');
  const panel=mountFabEditor(kind,title,(kind==='size'?`<form id="fab-size-form"><div class="form"><label>${tr('宽','Width')} (mm)<input id="fab-width" type="number" min="${FurnishProducts.footprintMinimum(f,'w')}" max="20000" step="any" value="${f.w}" required></label><label>${tr('深','Depth')} (mm)<input id="fab-depth" type="number" min="${FurnishProducts.footprintMinimum(f,'d')}" max="20000" step="any" value="${f.d}" required></label>${boxSize?`<label>${tr('高','Height')} (mm)<input id="fab-height" type="number" min="10" max="20000" step="any" value="${FurnishProducts.height(f)}" required></label>`:''}</div><p class="muted small">${boxSize?tr('箱体宽 × 深 × 高（含面板）；深为入墙方向，箱底离地单独设置。','Box width × depth × height, including panel; depth goes into the wall. Set bottom height separately.'):tr('占地宽 × 深；尺寸修改用于布局缩放。','Footprint width × depth; resizing is for layout.')} ${tr('固定基准','Fixed anchor')}：${!f.resizeAnchor&&FurnishProducts.slidingResizeFrame(f)?tr('收门端定位角','Stacking-end datum'):tr(...FurnishDesign.resizeAnchors[f.resizeAnchor||'center'])}</p><p id="fab-size-error" class="project-error" role="alert"></p><div class="actions"><button class="btn" type="button" data-fab-close>${tr('取消','Cancel')}</button><button class="btn primary" type="submit">${tr('应用尺寸','Apply size')}</button></div></form>`
    :directionalMeasurementPanel(items,'fab-distance-save',true)));
  panel.querySelectorAll('[data-fab-close]').forEach(b=>b.onclick=()=>closeFabEditor());
  // Keep the app's canvas shortcuts from firing while using this small editor.
  panel.addEventListener('keydown',e=>e.stopPropagation());
  if(kind==='size')panel.querySelector('form').onsubmit=e=>{
    e.preventDefault();try{
      if(PLAN.id!==planId||snap()!==before||selIds().join('\n')!==ids)throw Error(tr('方案已变化，请重新打开尺寸调整','Design changed; reopen size adjustment'));
      const w=panel.querySelector('#fab-width'),d=panel.querySelector('#fab-depth');
      if(!w.value.trim()||!d.value.trim())throw Error(tr('请输入有效宽度和深度','Enter a valid width and depth'));
      const h=panel.querySelector('#fab-height');
      if(h&&!h.value.trim())throw Error(tr('请输入有效高度','Enter a valid height'));
      const next=FurnishDesign.resizeFurniture(getF(f.id),{w:Number(w.value),d:Number(d.value),...(h?{h:Number(h.value)}:{})});
      closeFabEditor(false);if(next.w!==f.w||next.d!==f.d||h&&next.h!==f.h)mutate(()=>Object.assign(getF(f.id),next));
      $('#fab [data-fab-edit="size"]')?.focus({preventScroll:true});
    }catch(error){panel.querySelector('#fab-size-error').textContent=error.message;}
  };
  else{
    panel.querySelectorAll('[data-distance-edit]').forEach(b=>b.onclick=()=>{const dir=b.dataset.distanceEdit;closeFabEditor();editDirectionalDistance(dir);});
    panel.querySelectorAll('[data-distance-save]').forEach(b=>b.onclick=()=>saveDirectionalMeasurements(b.dataset.distanceSave));
    panel.querySelector('#fab-distance-save').onclick=()=>saveDirectionalMeasurements();
  }
  $(`#fab [data-fab-edit="${kind}"]`)?.setAttribute('aria-expanded','true');
  queueFabPosition();
  const first=panel.querySelector(kind==='size'?'input':'[data-distance-edit]:not(:disabled)')||panel.querySelector('button');first.focus({preventScroll:true});if(kind==='size')first.select();
}

// Score real screen rectangles after the SVG has rendered. No layout state is saved.
function queueFabPosition(){
  if(fabPositionFrame)return;
  fabPositionFrame=requestAnimationFrame(()=>{fabPositionFrame=0;positionFab();});
}
function clearFabDock(){
  const stage=$('#stage'),dock=$('#fab-dock');if(!dock)return;
  const focused=document.activeElement;
  for(const child of [...dock.children])stage.append(child);dock.remove();fabDockKey='';
  if(focused?.isConnected&&stage.contains(focused)&&document.activeElement!==focused)focused.focus({preventScroll:true});
  stage.classList.remove('fab-docked-top','fab-docked-right');
  for(const key of ['height','width','limit','bar-height'])stage.style.removeProperty('--fab-dock-'+key);
}
function dockFab(mode,key){
  const stage=$('#stage'),fab=$('#fab'),editor=$('#fab-editor');let dock=$('#fab-dock');
  const focused=document.activeElement;
  const before=[fabDockKey,stage.style.getPropertyValue('--fab-dock-height'),stage.style.getPropertyValue('--fab-dock-width')].join(';');
  if(!dock){dock=document.createElement('div');dock.id='fab-dock';stage.append(dock);}
  stage.classList.toggle('fab-docked-top',mode==='top');stage.classList.toggle('fab-docked-right',mode==='right');
  stage.style.setProperty('--fab-dock-width',mode==='right'?Math.min(360,stage.clientWidth*.44)+'px':'0px');
  stage.style.setProperty('--fab-dock-limit',(mode==='top'?(fabEditor?.kind==='floor'?Math.min(480,stage.clientHeight*.65):Math.min(360,stage.clientHeight*.5)):stage.clientHeight)+'px');
  // Live previews may resize the editor on each input. Do not reparent an
  // already docked form: moving it again can interrupt typing and lose focus.
  if(fab.parentNode!==dock)dock.append(fab);if(editor&&editor.parentNode!==dock)dock.append(editor);
  if(editor?.contains(focused)&&document.activeElement!==focused)focused.focus({preventScroll:true});
  stage.style.setProperty('--fab-dock-bar-height',fab.offsetHeight+'px');
  stage.style.setProperty('--fab-dock-height',mode==='top'?Math.ceil(dock.getBoundingClientRect().height)+'px':'0px');
  fabDockKey=key;
  const after=[key,stage.style.getPropertyValue('--fab-dock-height'),stage.style.getPropertyValue('--fab-dock-width')].join(';');
  if(before!==after||fabRevealPending){
    fabRevealPending=false;
    if(fabRevealFrame)cancelAnimationFrame(fabRevealFrame);
    fabRevealFrame=requestAnimationFrame(()=>{fabRevealFrame=requestAnimationFrame(()=>{fabRevealFrame=0;if(fabDockKey===key)revealFabSelection();});});
  }
}
function revealFabSelection(){
  if(typeof drag!=='undefined'&&drag){fabRevealPending=true;return;}
  if(is3D()||(!selIds().length&&ui.sel?.kind!=='room'))return;
  const room=ui.sel?.kind==='room'&&ROOMS.find(r=>r.id===ui.sel.id);
  const points=room?[drawingPoint(room.at||room.poly[0])]:selItems().flatMap(f=>FurnishGeometry.corners(f).map(p=>drawingPoint(p))),xs=points.map(p=>(p[0]-view.x0)*view.s),ys=points.map(p=>(p[1]-view.y0)*view.s);
  const shift=(values,size)=>{const a=Math.min(...values),b=Math.max(...values);return b-a>size-32?(a+b-size)/2:a<16?a-16:b>size-16?b-size+16:0;};
  const dx=shift(xs,svg.clientWidth),dy=shift(ys,svg.clientHeight);
  if(Math.abs(dx)>.5||Math.abs(dy)>.5){view.x0+=dx/view.s;view.y0+=dy/view.s;applyView();}
}
function positionFab(){
  const fab=$('#fab'),stage=$('#stage');if(!fab?.classList.contains('show')||(!selIds().length&&!['room','ceiling'].includes(ui.sel?.kind)))return;
  // A new selection may be the start of a drag. Keep its pointer mapping stable.
  if(typeof drag!=='undefined'&&drag)return;
  const bounds=stage.getBoundingClientRect(),W=stage.clientWidth,H=stage.clientHeight;
  const key=[...selIds(),['room','ceiling'].includes(ui.sel?.kind)?ui.sel.id:'',W,H].join('|');
  if(is3D()){
    clearFabDock();
    if(!fabEditor){
      // The 3D camera owns framing; keep this toolbar beside the scene rail.
      const rail=$('.canvas-rail')?.getBoundingClientRect(),status=ui.sel?.kind==='ceiling'&&W<=720?$('.space-status')?.getBoundingClientRect():null;
      fab.style.left='50%';fab.style.top='auto';fab.style.bottom=Math.max(18,rail?bounds.bottom-rail.top+12:0,status?bounds.bottom-status.top+12:0)+'px';fab.style.transform='translateX(-50%)';
      return;
    }
  }
  else if(W<=720||fabDockKey===key||fabDockKey&&document.activeElement?.closest('#fab-editor')){dockFab(W>=600&&H<450||W>720?'right':'top',key);return;}
  else if(fabDockKey)clearFabDock();
  const local=r=>({x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height});
  const visible=r=>r.w>0&&r.h>0&&r.x<W&&r.y<H&&r.x+r.w>0&&r.y+r.h>0;
  const obstacles=[];
  if(!is3D()){
    const selectedIds=new Set(selIds());
    for(const f of state.furniture){
      if(!ui.layers.furn)break;
      const p=FurnishGeometry.corners(f).map(p=>drawingPoint(p));
      const canvas=svg.getBoundingClientRect(),xs=p.map(p=>canvas.left-bounds.left+(p[0]-view.x0)*view.s),ys=p.map(p=>canvas.top-bounds.top+(p[1]-view.y0)*view.s);
      const r={x:Math.min(...xs)-12,y:Math.min(...ys)-22,w:Math.max(...xs)-Math.min(...xs)+24,h:Math.max(...ys)-Math.min(...ys)+44,weight:selectedIds.has(f.id)?10:5};
      if(visible(r))obstacles.push(r);
    }
    for(const el of stage.querySelectorAll('#gSel text,#gSel [data-edit-overlay="group-rotation"],#gMeasure text,[data-hob-gap] text,#gDims text')){
      const r=local(el.getBoundingClientRect());if(visible(r))obstacles.push({...r,weight:35});
    }
  }
  for(const el of stage.querySelectorAll('.canvas-rail,.space-status,.hud,.scalebar,.drawing-rotate,.drawing-compass,#property-peek,.scene-light')){
    if(getComputedStyle(el).visibility==='hidden'||getComputedStyle(el).display==='none')continue;
    const r=local(el.getBoundingClientRect());if(visible(r))obstacles.push({...r,weight:25});
  }
  const selected=obstacles.filter(r=>r.weight===10&&visible(r));
  const focus=selected.length?{x:Math.min(...selected.map(r=>r.x)),y:Math.min(...selected.map(r=>r.y)),right:Math.max(...selected.map(r=>r.x+r.w)),bottom:Math.max(...selected.map(r=>r.y+r.h))}:null;
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w+6)-Math.max(a.x,b.x-6))*Math.max(0,Math.min(a.y+a.h,b.y+b.h+6)-Math.max(a.y,b.y-6));
  const editor=$('#fab-editor');
  const choices=el=>{
    const w=el.offsetWidth,h=el.offsetHeight,clamp=(n,max)=>Math.max(10,Math.min(n,Math.max(10,max))),candidates=[];
    const add=(x,y)=>candidates.push({x:clamp(x,W-w-10),y:clamp(y,H-h-10),w,h});
    if(focus){const cx=(focus.x+focus.right-w)/2;add(cx,focus.bottom+12);add(cx,focus.y-h-12);add(focus.right+12,focus.y);add(focus.x-w-12,focus.y);}
    add((W-w)/2,H-h-100);add((W-w)/2,12);add(12,12);add(W-w-12,12);add(12,H-h-12);add(W-w-12,H-h-12);
    // More edge slots help when a measurement occupies a default corner.
    for(let y=12;y<H-h-10;y+=Math.max(44,h/2)){add(12,y);add(W-w-12,y);}
    for(const o of obstacles.filter(o=>o.weight!==5).slice(0,80)){add(12,o.y-h-12);add(W-w-12,o.y+o.h+12);}
    for(const other of [fab,editor].filter(v=>v&&v!==el)){add(12,24+other.offsetHeight);add(W-w-12,H-h-other.offsetHeight-24);}
    const score=r=>obstacles.reduce((sum,o)=>{const area=overlap(r,o);return sum+(area?(o.weight===10?1e11:o.weight===35?1e10:o.weight===25?1e9:0)+area*o.weight:0);},0)+(focus?Math.hypot(r.x+w/2-(focus.x+focus.right)/2,r.y+h/2-(focus.y+focus.bottom)/2):H-r.y)*.02;
    return candidates.map(r=>({...r,score:score(r)}));
  };
  let bars=choices(fab);
  // Keep the quick bar beside the visible selection. A distant empty corner
  // must not win solely because a nearby dimension label needs avoidance.
  if(focus&&!editor&&!is3D()){
    const anchor={x:Math.max(0,focus.x),y:Math.max(0,focus.y),right:Math.min(W,focus.right),bottom:Math.min(H,focus.bottom)};
    const gap=r=>Math.hypot(Math.max(0,anchor.x-r.x-r.w,r.x-anchor.right),Math.max(0,anchor.y-r.y-r.h,r.y-anchor.bottom));
    const nearby=bars.filter(r=>gap(r)<=96);
    if(nearby.length)bars=nearby;
  }
  let chosen=bars.reduce((a,b)=>a.score<=b.score?a:b),chosenEditor=null;
  if(editor){
    const panels=choices(editor);let score=Infinity;
    for(const bar of bars)for(const panel of panels){const area=overlap(bar,panel),value=bar.score+panel.score+(area?1e12+area*50:0);if(value<score){score=value;chosen=bar;chosenEditor=panel;}}
  }
  if(!is3D()&&[chosen,chosenEditor].filter(Boolean).some(r=>obstacles.some(o=>(o.weight===10||o.weight===25||editor&&o.weight===35)&&overlap(r,o)>0))){dockFab(W>720?'right':'top',key);return;}
  for(const [el,r] of [[fab,chosen],[editor,chosenEditor]])if(el&&r){el.style.left=r.x+'px';el.style.top=r.y+'px';el.style.bottom='auto';el.style.transform='none';}
}


function roomAreaPanel(rooms){
 let result;try{result=FurnishGeometry.regionAreas(rooms,state.furniture);}catch(e){return `<section><h3>${tr('区域面积','Region area')}</h3><p role="alert">${esc(e.message)}</p></section>`;}
 return `<section data-region-areas><h3>${tr('区域面积','Region area')} · ${rooms.length}</h3><p class="muted">${tr('Shift 点击区域累加，再次点击移除；普通点击重新单选。也可点击下方区域移除。','Shift-click adds or removes areas; a plain click selects one. Click an area below to remove it.')}</p><div class="actions">${rooms.map(r=>`<button class="btn" data-area-room="${esc(r.id)}">${esc(nm(state.rooms[r.id]?.name||r.name))} ×</button>`).join('')}</div><div class="stats mt"><div><small>${tr('空房面积（无家具）','Empty-room area')}</small><span class="big" data-area-empty>${fmt(result.empty)}</span> m²</div><div><small>${tr('布置后剩余面积','Remaining floor area')}</small><span class="big" data-area-free>${fmt(result.free)}</span> m²</div></div><p>${tr('落地占地','Standing footprint')} ${fmt(result.occupied)} m²</p><p class="muted">${tr('按当前区域边界计算；扣除落地家具和家电的整体占地包络，重叠只扣一次。悬挂、台上及叠放设备、地毯和窗帘不扣除；隐藏图层仍计入。剩余面积不代表可通行面积。','Uses current area boundaries and standing furniture/appliance envelopes, counting overlaps once. Suspended or hosted items, rugs and curtains are excluded; hidden layers still count. Remaining area does not guarantee passage.')}</p>${result.pending.length?`<p role="status">${tr('落地状态待核对，尚未扣除：','Floor placement unknown, not subtracted: ')}${result.pending.map(id=>esc(nm(getF(id)?.name||id))).join('、')}</p>`:''}</section>`;
}
function roomPanel(r){
  const st = state.rooms[r.id], a = area(r.poly), [x0,y0,x1,y1] = bbox(r.poly), inside = state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly));
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>¥${m.price}/m²</small></span></button>`).join('');
  return roomAreaPanel([r])+`<section><h3>${r.zone?tr('功能区','Functional area'):tr('房间','Room')}</h3>
    <div class="form"><label class="full">${tr('名称','Name')}<input id="rName" maxlength="80" value="${esc(nm(st.name))}"></label><label class="full">${tr('房间用途','Room use')}<select id="rUse" ${r.counted===false?'disabled':''}>${Object.entries(FurnishDesign.uses).filter(([id])=>r.counted===false?id==='bay':id!=='bay').map(([id,n])=>`<option value="${id}" ${FurnishDesign.inferUse(r,st)===id?'selected':''}>${tr(...n)}</option>`).join('')}</select></label></div>
    ${r.counted!==false?`<div class="form"><label class="full">${state.floorFinishes?tr('天花／吊顶标高 mm（毛坯基准）','Ceiling elevation mm (survey datum)'):tr('房间净高 / 吊顶完成面 mm','Room clear height / finished ceiling mm')}<input id="rCeilingHeight" type="number" min="1000" max="10000" step="10" value="${st.ceilingHeight??''}" placeholder="${FurnishProject.ceilingHeight(state)}"></label></div><p class="muted">${tr(`${state.floorFinishes?'当前天花绝对标高':'当前有效净高'} ${FurnishProject.roomCeilingHeight(state,r)} mm；留空沿用项目层高。用于本房间天花板、热水器顶部预留与柜门上翻检查，随项目保存。`,`${state.floorFinishes?'Ceiling elevation':'Effective clear height'} ${FurnishProject.roomCeilingHeight(state,r)} mm; leave empty to inherit project height. Used for this room's ceiling, heater clearance and cabinet opening checks; saved with the project.`)}</p><button class="btn" id="room-zones">划分功能区（不加墙）</button>`:''}<p class="muted">${tr('风格方案按用途匹配地面，修改名称不会改变已设置的用途。','Styles use room purpose; renaming preserves the selected purpose.')}</p>
    <div class="stats mt">
      <div><small>${tr('使用面积','Floor area')}</small><span class="big">${fmt(a)}</span> m²</div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${fmt((r.rings||[r.poly]).reduce((n,p)=>n+perim(p),0),1)}</span> m</div>
      </div>
    <div class="muted">${r.zone?tr('功能区分界不产生实际墙体；墙面工程量按原空间轮廓计算。','Functional boundaries do not create walls; wall quantities use the physical space.'):tr(`墙面面积（层高 ${FurnishProject.ceilingHeight(state)/1000}m，未扣门窗）约 ${fmt(perim(r.poly)*FurnishProject.ceilingHeight(state)/1000,1)} m²`, `Wall area (${FurnishProject.ceilingHeight(state)/1000}m ceiling, openings not deducted) ≈ ${fmt(perim(r.poly)*FurnishProject.ceilingHeight(state)/1000,1)} m²`)}</div></section>
  ${window.FurnishWallFinishUI?.roomPanel(r)||''}
  ${window.FurnishRoomMeasure?.panel(r)||''}
  <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div>
    <div class="total"><span>${tr('材料估价','Estimated cost')}</span><b>${yen(a*(state.pricing?.materials?.[st.mat]??MATS[st.mat].price)*(1+FurnishProject.pricing(state.pricing).floorWaste/100))}</b></div></section>
  <section><h3>${tr('房间内家具','Furniture in room')} <small>${tr(`${inside.length} 件 · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`, `${inside.length} items · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`)}</small></h3>
    ${inside.map(f => `<div class="irow ${clashIds.has(f.id) ? 'clash' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${esc(nm(f.name))}</span><small>${Number(FurnishProducts.dimensions(f).w.toFixed(2))}×${Number(FurnishProducts.dimensions(f).d.toFixed(2))}</small></div>`).join('') || `<div class="muted">${tr('暂无','None')}</div>`}
    <div class="actions">
      <button class="btn" data-act="roomReset">${ico('reset')}${tr('恢复默认名称与地面','Reset name & floor')}</button>
      <button class="btn" data-act="home">${tr('← 返回总览','← Back to overview')}</button></div></section>`;
}
function bindRoomPanel(){
  globalThis.FurnishWallFinishUI?.bind();
  globalThis.FurnishFloorFinishUI?.bind();
  globalThis.FurnishRoomMeasure?.bind();
  const id = ui.sel.id;
  const zones=$('#room-zones');if(zones)zones.onclick=()=>{FurnishEditor.open();document.querySelector('[data-trace-mode="zone"]')?.click();};
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  $('#rUse').onchange = e => mutate(() => state.rooms[id].use = e.target.value);
  const ceiling=$('#rCeilingHeight');if(ceiling)ceiling.onchange=e=>{try{const value=e.target.value.trim(),height=value===''?undefined:FurnishProject.ceilingHeight({ceilingHeight:Number(value)});mutate(()=>{if(height===undefined)delete state.rooms[id].ceilingHeight;else state.rooms[id].ceilingHeight=Math.round(height);});}catch(err){toast(err.message);renderPanel();}};
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
}

const SWATCHES = ['#ffffff','#efe6d8','#e2cfb4','#d6b99a','#a57c56','#c9d6df','#c3cbd6','#d8c7dc','#b7c4b0','#9dbb8c','#cfc6b8','#8a7a5e','#4a4f55','#1f1d1b'];
function furniturePriceText(f){
 const value=priceOf(f),basis=FurnishProject.furniturePriceBasis(f,value);
 return basis==='missing'?tr('价格待填写','Price not entered'):`${yen(value)} · ${basis==='confirmed'?tr('已确认价','Confirmed price'):tr('参考价','Reference price')}`;
}
function furnitureDimensionSummary(f,{verticalOnly=false}={}){
 const vertical=FurnishDesign.furnitureVerticalBounds(f),known=vertical&&[vertical.bottom,vertical.top].every(Number.isFinite),mm=v=>String(Number(v.toFixed(2)));
 const actual=FurnishProducts.dimensions(f),height=known?mm(vertical.top-vertical.bottom):'—',size=verticalOnly?`${height} mm`:`${mm(actual.w)} × ${mm(actual.d)} × ${height} mm`;
 return `<div class="furniture-dimensions" data-furniture-dimensions><b>${size}</b><small>${verticalOnly?tr('包络高','Envelope height'):f.type==='block'?tr('长 × 宽 × 高','Length × width × height'):tr('占地宽 × 深 × 包络高','Footprint width × depth × envelope height')}</small><dl><div><dt>${tr('底部离地','Bottom above floor')}</dt><dd>${known?mm(vertical.bottom)+' mm':tr('待核对','Unknown')}</dd></div><div><dt>${tr('顶部离地','Top above floor')}</dt><dd>${known?mm(vertical.top)+' mm':tr('待核对','Unknown')}</dd></div></dl><small>${known?tr(state.furnitureDatum==='finished-floor'?'高度按完成地面计；绝对标高见下方地面信息':'高度按毛坯测量基准计','Height datum follows the current design'):tr('高度未知，保留待核对','Height is unknown; verification required')}</small></div>`;
}
function waterheaterInstallationPanel(f){
  if(f.type!=='waterheater_flat')return '';
  const checks=FurnishDesign.waterheaterClearances(FurnishProject.effectivePlan(PLAN,state),f,{furniture:state.furniture||[]}),mm=v=>String(Math.floor((v+1e-6)*10)/10),shortfall=v=>String(Math.ceil((v-1e-6)*10)/10);
  const row=(label,check,top=false)=>check.gap===null
    ? `<p class="muted">${label}：${tr(top?'未找到所在房间，请调整位置并核对至少':'未找到该方向墙体或已知高度家具，请核对至少',top?'No room found; adjust position and verify at least':'No wall or furniture with known height found in this direction; verify at least')} ${check.required} mm ${tr('预留空间','clearance')}。</p>`
    : `<p class="${check.ok===false?'project-error':'muted'}">${label}：${mm(check.gap)} mm · ${tr('要求至少','Requires at least')} ${check.required} mm${check.ok===null?' · '+tr('待核对家具高度','Verify furniture height'):check.ok?' · '+tr('满足','Met'):' · '+tr('不足','Short by')+' '+shortfall(check.required-check.gap)+' mm'}</p>`;
  const s=f.heaterSocket,lk=furnitureLocked(f)?'disabled':'';
  const socketRow=checks.socket.gap===null?`<p class="muted">${tr('机身到插座：插座位置未设置，待核对至少 300 mm；不以右侧墙体或家具距离代替。','Heater to socket: position unset; verify at least 300 mm. Side walls or furniture do not determine this distance.')}</p>`:row(tr('机身到插座净距','Heater to socket clearance'),checks.socket);
  return `<h3>${tr('热水器安装预留','Heater installation clearance')}</h3><div id="waterheater-clearance" role="status" aria-live="polite">${row(tr('顶部净距','Top clearance'),checks.top,true)}${socketRow}</div><p class="muted small">${tr(`顶部按${checks.room?esc(nm(checks.room.name))+'的房间净高':'项目层高'} ${checks.ceilingHeight??'未知'} mm 核对；插座净距为机身外包面到插座中心的最短三维直线距离，不限制插座必须在右侧，也不代表电源线走线路径长度。`,`Top checked against ${checks.room?esc(nm(checks.room.name))+' room clear height':'project ceiling height'} of ${checks.ceilingHeight??'unknown'} mm. Socket clearance is the shortest 3D distance from the body envelope to the socket centre, on any side; not the cable route length.`)}</p><div class="form"><label class="full">${tr('插座位置','Socket position')}<select id="heaterSocketMode" ${lk}><option value="unset" ${!s?'selected':''}>${tr('未定 · 待核对','Unset · unverified')}</option><option value="set" ${s?'selected':''}>${tr('已定位 · 输入坐标','Located · enter coordinates')}</option></select></label>${s?['x','y','z'].map((key,i)=>`<label class="${i===2?'full':''}">${i===2?tr('插座中心离地高度','Socket centre height'):tr('插座中心','Socket centre')+' '+key.toUpperCase()} (mm)<input type="number" id="heaterSocket${key.toUpperCase()}" value="${s[key]}" min="${i===2?0:-1000000}" max="${i===2?20000:1000000}" step="10" ${lk}></label>`).join(''):''}</div>${s?`<p class="muted small">${tr('插座坐标固定在项目中；移动或旋转热水器不会移动插座。默认坐标只是输入起点，请按实际位置修改。','Socket coordinates stay fixed when the heater moves or rotates. Initial coordinates are placeholders; enter the actual location.')}</p>`:''}<button class="btn" id="heater-ceiling-settings">${checks.room?tr('修改房间净高','Change room clear height'):tr('修改层高','Change ceiling height')}</button>`;
}
function dishwasherInstallationPanel(f,result){
 if(!FurnishDesign.products().supports(f,'dishwasherDoorOpen')||f.obj)return '';
 result=result??FurnishProject.dishwasherChecks(FurnishProject.effectivePlan(PLAN,state),f,{furniture:state.furniture});if(!result)return '';
 const row=v=>`<p data-dishwasher-check="${v.kind}" data-check-ok="${v.ok===null?'unknown':v.ok}" class="${v.ok===false?'project-error':v.ok===null?'project-note':'muted'}">${v.ok===false?tr('需处理','Action needed'):v.ok===null?tr('待核对','Pending'):tr('已建模范围','Modelled scope')} · ${esc(v.message)}</p>`,passed=result.checks.filter(v=>v.ok===true);
 return `<h3>${tr('洗碗机安装与开启核对','Dishwasher installation and opening checks')}</h3><div id="dishwasher-checks" role="status" aria-live="polite"><p class="check-counts">${tr('需处理','Action needed')} ${result.checks.filter(v=>v.ok===false).length} · ${tr('待核对','Pending')} ${result.checks.filter(v=>v.ok===null).length}</p>${result.checks.filter(v=>v.ok!==true).map(row).join('')}${passed.length?`<details><summary>${tr('已建模范围未发现问题','No issues within modelled scope')} · ${passed.length}</summary>${passed.map(row).join('')}</details>`:''}</div><details class="muted small"><summary>${tr('核对范围与依据','Scope and assumptions')}</summary><p>${tr('结果与全案空间核对共用规则。开启包络是保守预留，不代表真实连杆逐板碰撞；未知高度和台面信息保留待核对。侧面／上方安装距离不随模型缩放。水电、软管、承重及现场未建模障碍另行核对。','Uses the same rules as project space checks. The opening envelope is conservative rather than a linkage simulation. Unknown heights or worktops need review. Installation distances do not scale with the model. Connections, hoses, loads and unmodelled site obstacles need separate checks.')}</p></details>`;
}
function furnPanel(f){
  const telescopicSpec=FurnishProducts.definition(f)?.telescopic,movingTracks=telescopicSpec?FurnishProducts.slidingLayout(f).floorTracks.length:0;
  const cabinetDesign=furnitureUsesDetailedDesign(f);
  const installation=FurnishProject.dishwasherChecks(FurnishProject.effectivePlan(PLAN,state),f,{furniture:state.furniture});
  const fridge=['fridge','fridge_french_drawer'].includes(f.type);
  const fridgeCabinets=fridge?state.furniture.filter(g=>!furnitureError(g)&&FurnishCabinet.supported(g)&&g.cabinet?.sideboard&&g.cabinet.columns.some(col=>col.fridgeBay)).sort((a,b)=>Math.hypot(a.cx-f.cx,a.cy-f.cy)-Math.hypot(b.cx-f.cx,b.cy-f.cy)):[];
  const laundry=FurnishDesign.products().family(f,'laundry');
  const robotSpec=typeof FurnishRobotVacuumModel!=='undefined'?FurnishRobotVacuumModel.specs[f.type]:null;
  const r = isOutside(f) ? null : roomAt(f.cx, f.cy), custom = f.type === 'custom' || f.type === 'customround', lk = furnitureLocked(f) ? 'disabled' : '';
  const clashWith = collisions().filter(p => p.includes(f.id)).map(p => getF(p[0] === f.id ? p[1] : p[0])).filter(Boolean);
  const fridgeConflictDetails=clashWith.flatMap(g=>{const fit=FurnishCabinet.fridgeBayFit(f,g)||FurnishCabinet.fridgeBayFit(g,f)||FurnishCabinet.hoodBayFit(f,g)||FurnishCabinet.hoodBayFit(g,f);return fit&&!fit.fits?fit.reasons:[];});
  const btn = (act, icon, label, on) => `<button class="btn ${on ? 'on' : ''}" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const pad = Math.max(f.w, f.d)*.1;
  return `<section><div class="fhead"><div class="fthumb"><svg viewBox="${-f.w/2-pad} ${-f.d/2-pad} ${f.w+2*pad} ${f.d+2*pad}">${f.flip ? `<g transform="scale(-1 1)">${furnSVG(f.type,f.w,f.d,f.color,f)}</g>` : furnSVG(f.type,f.w,f.d,f.color,f)}</svg></div>
      <div><b>${esc(nm(f.name))}</b><small data-furniture-price>${furniturePriceText(f)}</small>${furnitureLocked(f) ? `<span class="tag">${ico('lock')}${tr('已锁定','Locked')}</span>` : ''}</div></div><button class="btn" onclick="FurnishObservationLayers.open()">${tr('图层：','Layer: ')}${esc(FurnishLayers.layer(state,'furniture:'+f.id).name)}${FurnishLayers.locked(state,'furniture:'+f.id)?' · '+tr('图层已锁定','Layer locked'):''}</button>
    ${furnitureDimensionSummary(f,{verticalOnly:true})}
    <h3>${tr('家具属性','Furniture')}</h3>
    ${fridge&&fridgeCabinets.length?`<div class="form"><label class="full">${tr('目标餐边柜','Target sideboard')}<select id="fridge-bay-target" ${lk}>${fridgeCabinets.map(g=>`<option value="${esc(g.id)}">${esc(nm(g.name))} · ${g.w}×${g.d} mm</option>`).join('')}</select></label></div><button class="btn" id="fridge-center-bay" ${lk}>${tr('在冰箱位左右居中','Center within fridge bay')}</button><p class="muted">${tr('只沿柜体宽度方向移动冰箱，前后位置及朝向保持不变。调整柜体后可再次点击对齐。','Moves only across the cabinet width; front/back position and orientation stay unchanged. Click again after moving or resizing the cabinet.')}</p>`:''}
    ${f.type==='curtain'?`<div class="form"><label class="full">${tr('窗帘样式','Curtain style')}<select id="curtainStyle" ${lk}><option value="single" ${f.curtainStyle==='single'?'selected':''}>${tr('单开 · 向一侧收拢','Single · stack to one side')}</option><option value="double" ${f.curtainStyle!=='single'?'selected':''}>${tr('双开 · 向两侧收拢','Double · stack to both sides')}</option></select></label></div><p class="muted">${tr('3D 点击布幔开启／关闭；单开窗帘可用镜像改变收拢侧。','Click cloth in 3D to open or close; mirror a single curtain to switch sides.')}</p>`:''}
    ${FurnishDesign.products().supports(f,'floorTrack')?`<div class="form"><label class="full">${telescopicSpec?tr('轨道形式','Track system'):tr('下轨道','Bottom track')}<select id="fFloorTrack" ${lk}><option value="false" ${(FurnishDesign.products().value(f,'floorTrack'))===false?'selected':''}>${telescopicSpec?tr('吊轨（默认）','Hanging track (default)'):tr('无地轨 · 吊轨','No floor track')}</option><option value="true" ${(FurnishDesign.products().value(f,'floorTrack'))===true?'selected':''}>${telescopicSpec?tr('地轨 · '+movingTracks+' 条','Floor tracks · '+movingTracks):tr('有下轨道','With bottom track')}</option></select></label></div><p class="muted">${telescopicSpec?.allMoving?tr('独立门组按家具摆放；3D 点击门扇或在下方设置开合，状态同步保存。','Place as an independent door group. Click a panel in 3D or set the position below; both views save the same position.'):tr('进入 3D 点击门窗扇开关；镜像可改变叠合侧。独立门窗按家具摆放；墙体洞口请在「编辑户型」中添加门窗，再选中洞口设置扇型。','Click panels in 3D to open or close; mirror to change the stacking side. For a wall opening, add a door or window in the floor-plan editor and then select its panel style.')}</p>`:''}
    ${telescopicSpec&&!telescopicSpec.allMoving?`<p class="muted">${tr('吊轨不设贯穿地面的轨道；地轨一条对应一扇移动门，停靠扇不计入。双联动 1 条，三联动 2 条。','Hanging doors have no full-width floor rails. Floor rails match the moving leaves: one for two-panel telescopic doors, two for three-panel doors.')}</p>`:''}
    ${FurnishProducts.supports(f,'slidingStackSide')?`<div class="form"><label>${tr('收门方向','Stacking side')}<select id="fSlidingStackSide" ${lk}><option value="left" ${FurnishProducts.value(f,'slidingStackSide')==='left'?'selected':''}>${tr('向左收门','Stack left')}</option><option value="right" ${FurnishProducts.value(f,'slidingStackSide')==='right'?'selected':''}>${tr('向右收门','Stack right')}</option></select></label><label>${tr('开合效果','Door position')}<select id="fSlidingOpen" ${lk}><option value="false" ${!FurnishProducts.value(f,'slidingOpen')?'selected':''}>${tr('关闭','Closed')}</option><option value="true" ${FurnishProducts.value(f,'slidingOpen')?'selected':''}>${tr('打开','Open')}</option></select></label></div><p class="muted">${tr('单扇厚度','Panel thickness')} ${telescopicSpec.leafDepth} mm · ${tr('整组深度独立设置','Overall depth is independent')}。${tr('超白玻璃，默认吊轨；可选两条地轨。宽度为闭合洞口跨度；顶轨延伸至收门侧，需另留约一扇门宽的收门空间。左右按面对门正面理解，镜像后反转。开合设置在 2D / 3D 中同步保存。','Ultra-clear glass; hanging by default, with two optional floor rails. Width is the closed opening span. Allow about one panel width beside the opening for stacking and the extended rail. Sides face the door front and reverse when mirrored. Position is saved in both views.')}</p>`:''}
    ${FurnishProducts.supports(f,'slidingTrackOrder')?`<div class="form"><label class="full">${tr('活动扇所在侧','Leading panel side')}<select id="fSlidingTrackOrder" ${lk}>${FurnishProducts.fields.slidingTrackOrder.values.map(v=>`<option value="${v}" ${FurnishProducts.value(f,'slidingTrackOrder')===v?'selected':''}>${v==='leading-front'?tr('靠正面 · 外侧','Front · outside'):tr('靠背面 · 内侧','Back · inside')}</option>`).join('')}</select></label></div><p class="muted">${telescopicSpec?.allMoving?tr('此处设置行程较大的活动扇位于前轨还是后轨；两扇始终同向叠合。','Choose the front or back track for the leading panel; both panels always stack in the same direction.'):tr('活动扇是远离叠合侧、移动行程最大的门扇。正面随门组旋转；切换内外只调整门扇前后顺序。转角门以矩形直边搭接。','The leading panel travels furthest from the stack. Front follows the door orientation. This setting reverses the tracks; corner leaves meet with straight rectangular edges.')}</p>`:''}
    ${isOutside(f) ? `<div class="alert">${ico('warn')}<span>${tr('这件家具在户型外','This item is outside the plan')}</span><button class="btn" data-act="rescueOne">${tr('移回','Bring back')}</button></div>` : ''}
    ${clashWith.length ? `<div class="alert">${ico('warn')}<span>${tr('与以下家具重叠：','Overlaps: ')}${clashWith.map(g => esc(nm(g.name))).join('、')}</span></div>` : ''}
    ${fridgeConflictDetails.length?`<div class="alert" id="fridge-bay-conflict-details"><span>${fridgeConflictDetails.map(message=>esc(message)).join('<br>')}</span></div>`:''}
    <div class="form">
      ${f.type==='shower_arrow_cream'?`<label>${tr('顶部调节段','Upper rise')} (mm)<input id="fShowerRise" type="number" min="${FurnishDesign.products().fields.showerRise.min}" max="${FurnishDesign.products().fields.showerRise.max}" value="${FurnishDesign.products().value(f,'showerRise')}" ${lk}></label><label>${tr('手持倾角','Hand shower tilt')} (°)<input id="fShowerHandAngle" type="number" min="${FurnishDesign.products().fields.showerHandAngle.min}" max="${FurnishDesign.products().fields.showerHandAngle.max}" step="1" value="${Math.round(FurnishDesign.products().value(f,'showerHandAngle')*100)/100}" ${lk}></label><p class="muted" style="grid-column:1/-1">${tr('升降仅移动上部弯管和顶喷；手持以夹座为轴旋转。倾角 0–35° 为展示范围，厂家限位未标注。高度字段为顶部调节段 400 mm 时的基准高度。','Rise moves the upper pipe and rain head; the hand shower pivots at its holder. Tilt range is for display. Height is the baseline at a 400 mm rise.')}</p>`:''}
      ${f.type==='shower_arrow_cream'?`<label class="full">${tr('混水器中心离地高度','Mixer centre above floor')} (mm)<input id="fShowerMixerHeight" type="number" min="${FurnishDesign.products().fields.showerMixerHeight.min}" max="${FurnishDesign.products().fields.showerMixerHeight.max}" step="1" value="${Math.round(FurnishDesign.showerInstallation(f).mixer*100)/100}" ${lk}></label><p class="muted" style="grid-column:1/-1">${tr('安装高度以混水器中心为基准，默认 1000 mm。顶喷升降或尺寸缩放保持混水器中心离地高度；软管最低点随模型派生。','Installation height is measured to the mixer centre, default 1000 mm. Rise and resizing retain this anchor; the lowest hose point is derived.')}</p>`:''}
      ${telescopicSpec&&!telescopicSpec.allMoving?`<p class="muted full" style="grid-column:1/-1">${tr('同高的双／三联动门端部垂直相接时，顶轨自动拼接，交会处不设立柱，门扇向远离转角的一侧收拢。移动或改变高度后自动重新判断。','Perpendicular telescopic door ends at the same rail elevation join automatically without a corner post; panels stack away from the corner.')}</p>`:''}
      ${f.type==='tripleslidingwindow'?`<label class="full">${tr('窗台高','Sill height')} (mm)<input id="fMountHeight" type="number" min="0" max="20000" value="${FurnishDesign.products().value(f,'mountHeight')}" ${lk}></label>`:''}
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      ${FurnishProducts.family(f,'folding-table')&&!f.obj?`<label class="full">${tr('桌面形态','Table shape')}<select id="folding-table-pose" ${lk}>${[['round','圆桌 · 全展开','Round · fully open'],['single','单边收起 · 扇形桌','One leaf down'],['capsule','双边收起 · 胶囊桌','Both leaves down']].map(([v,zh,en])=>`<option value="${v}" ${FurnishProducts.value(f,'foldingTablePose')===v?'selected':''}>${tr(zh,en)}</option>`).join('')}</select></label><label class="full">${tr('桌面离地高度','Tabletop height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="10" max="20000" step="1" ${lk}></label><p class="muted full" style="grid-column:1/-1;margin:0">${tr('宽／深为当前形态占地，切换时桌架位置保持。1100款收起深740；1300款图示实标1305，单边1075／双边848 mm。1200款双边793、单边996.5 mm为插值草模；1100款单边920 mm为对称推算。高度760 mm；尺寸编辑为布局缩放，价格待填写。','Width/depth describe the current shape; folding keeps the frame in place. 1100: closed depth 740. 1300: reference diameter 1305, single 1075 / closed 848 mm. 1200 uses interpolated depths 996.5 / 793; 1100 single depth 920 is inferred. Height 760 mm; resizing is for layout. Price unknown.')}</p>`:''}
      ${FurnishProducts.definition(f)?.manifold&&!f.obj?`<label>${tr('管路数量（路）','Heating circuits')}<input id="fManifoldLoops" type="number" min="${FurnishProducts.fields.manifoldLoops.min}" max="${FurnishProducts.fields.manifoldLoops.max}" step="1" value="${FurnishProducts.value(f,'manifoldLoops')}" ${lk}></label><label>${tr('上排左侧主管长度','Upper left main pipe length')} (mm)<input id="fManifoldLeft" type="number" min="${FurnishProducts.definition(f).manifold.minRun}" max="${FurnishProducts.definition(f).manifold.maxLeft}" value="${FurnishProducts.manifoldLayout(f).lengths.upper}" ${lk}></label><label>${tr('下排左侧主管长度','Lower left main pipe length')} (mm)<input id="fManifoldLower" type="number" min="${FurnishProducts.definition(f).manifold.minRun}" max="${FurnishProducts.definition(f).manifold.maxLeft}" value="${FurnishProducts.manifoldLayout(f).lengths.lower}" ${lk}></label><label>${tr('总高度','Overall height')} (mm)<input id="fH" type="number" min="${FurnishProducts.definition(f).manifold.minHeight}" max="20000" value="${FurnishProducts.height(f)}" ${lk}></label><label>${tr('最低点离地','Bottom above floor')} (mm)<input id="fMountHeight" type="number" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${lk}></label><p class="muted full" style="grid-column:1/-1">${tr('参考图近似模型；右侧分集水排宽度随路数变化（支路间距暂定 50 mm），上下排左侧主管长度可独立输入，改变路数保留两项长度。各长度从本排立管最左外沿量至黄铜排入口，允许下排长于上排。总宽按较长一排派生，直接修改总宽会按比例缩放两项长度。新建外包默认 800 × 180 × 600 mm（用户确认），5 路时上排左长 450、下排 330 mm 为内部布局假设；最低点含下垂管线。正面为阀柄侧，左右随旋转／镜像。品牌、价格、真实管径及安装预留待核对。','Photo-inspired layout model. Header width follows circuit count with an estimated 50 mm pitch; upper and lower left main lengths are independently editable and retained when changing circuit count. Each measures from its riser outer edge to the brass inlet; either row may be longer. Overall width uses the longer row; editing overall width proportionally scales both lengths. Defaults: 5 circuits, upper 600 mm, lower 330 mm, height 500 mm and depth 140 mm. All are layout estimates; bottom includes pipe tails. Front faces the valve handles; directions follow rotation/mirroring. Brand, price, pipe sizes and installation clearances are unconfirmed.')}</p>`:''}
      ${FurnishProducts.definition(f)?.wallRecess?`<label>${tr('箱体高度','Box height')} (mm)<input id="fH" type="number" min="10" max="20000" value="${FurnishProducts.height(f)}" ${lk}></label><label>${tr('箱底离地','Box bottom above floor')} (mm)<input id="fMountHeight" type="number" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${lk}></label><button type="button" class="btn full" id="fEmbedWall" ${lk}>${tr('嵌入最近墙面','Embed in nearest wall')}</button><p class="muted full" style="grid-column:1/-1">${tr('宽为正面横向尺寸，深为入墙方向尺寸，高为竖向尺寸，均含面板。初始尺寸与箱底离地 1200 mm 仅为示例，请按实物填写。嵌入后正面齐墙，可旋转、移动调整；三维按箱体范围裁切墙体及饰面。墙厚、结构及施工开槽须现场核对。','Width across front, depth into wall, height vertically; includes panel. Initial size and 1200 mm bottom height are examples. Embedding aligns front with nearest wall; verify structure on site.')}</p>`:''}
      ${f.type==='block'?`<label class="full">${tr('高','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="10" max="20000" step="1" ${lk}></label><label class="full">${tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishProducts.value(f,'mountHeight')}" min="${FurnishProducts.fields.mountHeight.min}" max="${FurnishProducts.fields.mountHeight.max}" step="1" ${lk}></label><p class="muted full" style="grid-column:1/-1;margin:0">${tr('长、宽、高为块体外部尺寸；底部离地高度相对于家具地面基准，0 为落地，可设为悬空物体。','Length, width and height are the outer dimensions. Bottom height is relative to the furniture floor datum; use 0 for floor standing or a positive value for a suspended object.')}</p>`:''}
      <label>${tr('中心','Center')} X (mm)<input type="number" id="fX" value="${Math.round(f.cx)}" step="10" ${lk}></label>
      <label>${tr('中心','Center')} Y (mm)<input type="number" id="fY" value="${Math.round(f.cy)}" step="10" ${lk}></label>
      <label>${tr('旋转','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15" ${lk}></label>
      <label>${tr('单价','Unit price')} (¥)<input type="number" id="fP" value="${FurnishProject.furniturePriceBasis(f,priceOf(f))==='missing'?'':Math.round(priceOf(f))}" placeholder="${tr('待填写','Not entered')}" min="0" step="50"></label>
      ${f.type==='waterheater_flat'||laundry?`<label class="full">${laundry?tr('底部离地高度 Z','Bottom height above floor Z'):tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishDesign.products().value(f,'mountHeight')}" min="0" max="20000" step="10" ${lk}></label><p class="muted" style="grid-column:1/-1;margin:0">${laundry?tr('Z 为地面到机身底部的距离；中心对齐叠放时，上层 Z = 下层 Z + 下层机身高度 + 上层设置的连接层高度。尺寸与离地高度随项目保存。','Z measures floor to appliance bottom. For aligned stacks, upper Z = lower Z + lower body height + the upper appliance’s connector height. Dimensions and elevation are saved with the project.'):tr('从地面到热水器最底部的距离，调整后同步到 3D 并随项目保存。','Distance from the floor to the lowest part of the heater; updates 3D and is saved with the project.')}</p>`:''}
      ${laundry?`<label class="full">${tr('连接层高度','Connector height')} (mm)<input type="number" id="fStackHeight" value="${FurnishDesign.products().value(f,'stackHeight')}" min="0" max="1000" step="1" ${lk}></label><p class="muted" style="grid-column:1/-1;margin:0">${tr('设置本设备叠放在另一台设备上方时的连接层；默认 20 mm，设为 0 可取消连接层。','Applies when this appliance is stacked above another. Defaults to 20 mm; use 0 to remove the connector.')}</p>`:''}
      ${FurnishProducts.family(f,'pipe-box')?`<label class="full">${tr('包覆结构','Enclosure structure')}<select id="fPipeBoxShape" ${lk}>${FurnishProducts.fields.pipeBoxShape.values.map(shape=>`<option value="${shape}" ${FurnishProducts.value(f,'pipeBoxShape')===shape?'selected':''}>${shape==='four'?tr('四面围合','Four sides'):shape==='three'?tr('三面 U 形','Three sides (U)'):tr('两面直角 L 形','Two perpendicular sides (L)')}</option>`).join('')}</select></label>${FurnishProducts.value(f,'pipeBoxShape')==='three'?`<label class="full">${tr('敞开面','Open side')}<select id="fPipeBoxOpenSide" ${lk}>${FurnishProducts.fields.pipeBoxOpenSide.values.map(side=>`<option value="${side}" ${FurnishProducts.value(f,'pipeBoxOpenSide')===side?'selected':''}>${({back:tr('背面敞开','Back open'),front:tr('正面敞开','Front open'),left:tr('左面敞开','Left open'),right:tr('右面敞开','Right open')})[side]}</option>`).join('')}</select></label>`:FurnishProducts.value(f,'pipeBoxShape')==='two'?`<label class="full">${tr('保留的相邻面','Retained adjacent sides')}<select id="fPipeBoxCorner" ${lk}>${FurnishProducts.fields.pipeBoxCorner.values.map(corner=>`<option value="${corner}" ${FurnishProducts.value(f,'pipeBoxCorner')===corner?'selected':''}>${({'front-left':tr('正面＋左面','Front + left'),'front-right':tr('正面＋右面','Front + right'),'back-left':tr('背面＋左面','Back + left'),'back-right':tr('背面＋右面','Back + right')})[corner]}</option>`).join('')}</select></label>`:''}<label>${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="10" max="20000" step="1" ${lk}></label><label>${tr('柜体厚度','Board thickness')} (mm)<input type="number" id="fPipeBoxThickness" value="${FurnishProducts.value(f,'pipeBoxThickness')}" min="${FurnishProducts.fields.pipeBoxThickness.min}" max="${FurnishProducts.fields.pipeBoxThickness.max}" step="0.1" ${lk}></label><label class="full">${tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishProducts.value(f,'mountHeight')}" min="0" max="20000" step="1" ${lk}></label><p class="muted full" style="grid-column:1/-1;margin:0">${tr('宽、深、高均为外部尺寸，板厚向内扣除。可选四面围合、三面 U 形或两面直角 L 形，顶部、底部始终敞开，无层板和柜门。三面可选敞开面，两面可选保留的相邻面。方向随柜体旋转／镜像，左右按面对柜体正面理解。默认 400 × 300 × 2400 mm、板厚 18 mm 仅为可调起始值。','Width, depth and height are outer dimensions; thickness reduces the cavity. Choose four sides, a three-sided U, or a two-sided L. Top and bottom stay open, without shelves or doors. Select the open side or retained adjacent sides below. Directions follow rotation and mirroring; left/right are viewed facing the front. Default 400 × 300 × 2400 mm and 18 mm boards are editable starting values.')}</p>`:''}
      ${FurnishProducts.family(f,'under-sink-purifier')?`<label>${tr('机身高度','Body height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="10" max="20000" step="1" ${lk}></label><label>${tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishProducts.value(f,'mountHeight')}" min="0" max="20000" step="1" ${lk}></label><p class="muted full" style="grid-column:1/-1;margin:0">${tr('主机原规格 163 × 445 × 379 mm，不含龙头与管线。底部离地默认 0，可填写柜内承托面高度；尺寸修改仅作布局缩放。接口及换芯、安装预留未知，价格待填写。','Main unit 163 × 445 × 379 mm; faucet and hoses excluded. Bottom elevation defaults to 0; enter the cabinet support height. Resizing is for layout only. Connections, filter access, installation clearances and price need confirmation.')}</p>`:''}
      ${FurnishProducts.definition(f)?.ceilingPanel&&!f.obj?`<label>${FurnishProducts.definition(f)?.panelLight?tr('灯体总厚度','Panel light thickness'):FurnishProducts.definition(f).ceilingPanel.profile==='se2'?tr('模型总高（箱体110＋面板近似2）','Model height (110 box + 2 face)'):tr('机身总高（模型假设）','Model body height')} (mm)<input id="fH" type="number" min="3" max="20000" value="${FurnishProducts.height(f)}" ${lk}></label><label>${tr('面板最低点离地','Panel bottom elevation')} (mm)<input id="fMountHeight" type="number" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${lk}></label><p class="muted full" style="grid-column:1/-1"><button type="button" class="btn" id="fitCeilingPanel" ${lk}>${tr('替换最近整块铝扣板','Replace nearest complete ceiling panel')}</button><br>${FurnishProducts.definition(f)?.panelLight?tr('厨房平板灯：300×600×35 mm，24 W，集成吊顶。整板安装自动对齐空闲完整扣板；移除后恢复扣板。窄边框3 mm、面板厚2 mm、灯色与照明强度为预览假设；图片标注PP、IP44，品牌、色温、光通量、价格及安装净空未知。缩放仅作布局。','Kitchen panel light: 300×600×35 mm, 24 W, integrated ceiling. Fits one complete empty panel. Frame, face thickness, light colour and output are visual assumptions; brand, photometry, price and service clearances are unknown.'):FurnishProducts.definition(f).ceilingPanel.profile==='se2'?tr('奥普 SE2：面罩600×300 mm，箱体高110 mm（含垫高块），集成吊顶安装空间≥130 mm（用户参数图）。模型面板厚2 mm及机身宽深为外观近似；总高112 mm为建模值。整板安装仅对齐格位和底标高，不验证130 mm安装空间、风管、承托或电气条件；价格未知。','AUPU SE2: 600×300 face, 110 mm box including spacer blocks; ceiling void ≥130 mm per supplied image. The 2 mm face and body footprint are approximations (112 mm model height). Panel fitting aligns pose only; void, duct, support and electrical conditions require review. Price unknown.'):tr('300×600 mm通用浴霸占位；整板安装自动对齐排板、方向和底标高。边缘裁切板、收边、已装筒灯或浴霸的格子不可替换。缩放、移开或改变方向／高度后重新核对，移除设备自动恢复扣板。机身总高180 mm和面板厚2 mm为模型假设，品牌、功率、价格、真实开口及安装净空待核对。','Generic 300×600 heater. Fit to one complete unoccupied panel; cropped panels and trim are excluded. Removal restores the panel. Body height 180 mm and face thickness 2 mm are model assumptions; product specifications and installation clearances are unknown.')}</p>`:''}
      ${FurnishProducts.definition(f)?.downlight&&!f.obj?`<label>${tr('筒灯功率','Downlight power')}<select id="fDownlightWatts" ${lk}>${FurnishProducts.fields.downlightWatts.values.map(v=>`<option value="${v}" ${FurnishProducts.value(f,'downlightWatts')===v?'selected':''}>${v} W</option>`).join('')}</select></label><label>${tr('色温','Colour temperature')}<select id="fDownlightKelvin" ${lk}>${FurnishProducts.fields.downlightKelvin.values.map(v=>`<option value="${v}" ${FurnishProducts.value(f,'downlightKelvin')===v?'selected':''}>${v} K</option>`).join('')}</select></label><p class="muted full" style="grid-column:1/-1">${tr('光通量','Luminous flux')}：${FurnishProducts.downlightSpec(f).lumens} lm</p><label class="full">${tr('筒灯最低点离地高度','Downlight bottom elevation')} (mm)<input type="number" id="fMountHeight" min="0" max="20000" value="${FurnishProducts.value(f,'mountHeight')}" ${lk}></label><p class="muted full" style="grid-column:1/-1"><button type="button" class="btn" id="fitDownlight" ${lk}>${tr('贴合所在平顶','Fit to flat ceiling')}</button><br>${tr('DL269：Ø85 × 45 mm，功率／色温可切换，光通量按规格自动匹配，向下发光100°。面环顶为最低点 + 2 mm；设为平顶底标高减 2 mm（采用当前家具地面基准）可派生 Ø76.5 mm 开孔。仅支持完整位于平顶内、互不重叠的标准规格。缩放仅作外观布局，不生成安装孔。价格、散热及驱动器净空待核对。','DL269: Ø85 × 45 mm, selectable power and colour temperature with matched flux, 100° downward beam. Rim top is bottom + 2 mm; align it with a modeled flat ceiling to derive a Ø76.5 mm cutout. Standard dimensions, fully contained and separate holes only. Resizing is visual; price and service clearances are unknown.')}</p>`:''}
      ${f.type==='aquarium_mijia_2pro'?`<label>${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishDesign.products().height(f)}" min="50" max="20000" step="1" ${lk}></label><label>${tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishDesign.products().value(f,'mountHeight')}" min="0" max="20000" step="1" ${lk}></label><p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格 505 × 292 × 334 mm；底部离地高度可设为承托柜台顶高，默认 0。尺寸修改仅作布局缩放。缸内水景与内部构造为外观近似；价格、承重和维护预留待核对。','Nominal size 505 × 292 × 334 mm. Set bottom elevation to the supporting surface height; default 0. Resizing is for layout only. Aquascape and internal details are approximate; price, support capacity and maintenance clearances need confirmation.')}</p>`:''}
      ${FurnishDesign.products().family(f,'countertop-dishwasher')?`<label>${tr('机身高度','Body height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="10" max="20000" step="1" ${lk}></label><label>${tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishProducts.value(f,'mountHeight')}" min="0" max="20000" step="1" ${lk}></label><label class="full">${tr('折叠门','Folding door')}<select id="dishwasher-door" ${lk}><option value="closed" ${!FurnishProducts.value(f,'dishwasherDoorOpen')?'selected':''}>${tr('闭合','Closed')}</option><option value="open" ${FurnishProducts.value(f,'dishwasherDoorOpen')?'selected':''}>${tr('展开','Open')}</option></select></label><p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格 550 × 350 × 598 mm，开门总深 600 mm。底部离地默认 860 mm 仅为布局初值，请填实际台面高度；尺寸修改仅作布局缩放。空间核对始终检查完全开启的保守包络、出气侧和上方吊柜条件；折叠连杆轨迹未模拟。','Nominal size 550 × 350 × 598 mm; open depth 600 mm. Default bottom elevation 860 mm is a layout starting point; enter the actual worktop height. Resizing is for layout only. Spatial checks always use the full opening reservation and check outlet-side and overhead clearances; folding linkages are not simulated.')}</p><details class="full muted"><summary>${tr('参考图安装指引','Reference installation guidance')}</summary><p>${tr('出气口距侧面橱柜／墙壁 ≥200 mm；台面前后深度不足 600 mm 时门可能凸出。台面至吊柜底 ≥650 mm 时图示可贴墙正常开门；若机顶至吊柜不足 50 mm，图示要求机门前端比吊柜前沿向外错开 >80 mm，以便操作顶部开门键。这些条件已接入下方自动核对；出气口位置未知，按整侧机身保守预留。水电接口、后部软管及承托荷载待核对。','Steam outlet to side cabinet/wall ≥200 mm. Open doors may overhang worktops shallower than 600 mm. The reference permits wall-adjacent placement with ≥650 mm from worktop to wall cabinet bottom. If top clearance is <50 mm, the door front should project >80 mm beyond the wall cabinet front for button access. These conditions are checked below. The entire outlet side is reserved conservatively because its exact location is unknown. Connections, rear hoses and load capacity need verification.')}</p></details>`:''}
      ${FurnishProducts.family(f,'pet-cat-tree')?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('参考图规格 500 × 500 × 1430 mm；内部尺寸、材质与细节为外观估算，尺寸编辑仅作布局缩放。梯子一侧为正面，静态模型；品牌、价格及安装要求未知。','Reference envelope 500 × 500 × 1430 mm. Internal sizes, materials and details are visual estimates; resizing is for layout. The ladder faces front. Static model; brand, price and installation requirements unknown.')}</p>`:''}
      ${FurnishProducts.family(f,'floor-aircon')&&!f.obj?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('美的酷省电 Ultra 2匹室内机，395 × 436 × 1856 mm，尺寸包含底座。静态外观；尺寸修改仅作布局缩放，安装间距与接管位置待确认。','Midea Ultra 2 HP indoor unit: 395 × 436 × 1856 mm including base. Static model; resizing is for layout. Installation clearances and connections are unknown.')}</p>`:''}
      ${FurnishProducts.family(f,'shoe-bench')&&!f.obj?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('换鞋凳 800 × 300 × 450 mm，浅色软包、橡木框架与双层鞋架。颜色调整木色；尺寸修改为布局缩放。','Shoe bench 800 × 300 × 450 mm, light cushion, oak frame and two shoe shelves. Color edits the wood; resizing is for layout.')}</p>`:''}
      ${FurnishProducts.family(f,'coffee-table')&&!f.obj?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('樱桃木茶几 1200 × 650 × 450 mm，白色岩板面、圆角板腿和静态抽屉。颜色调整木色；尺寸修改为布局缩放。','Cherry coffee table 1200 × 650 × 450 mm, white stone top, rounded side panels and static drawer. Color edits the wood; resizing is for layout.')}</p>`:''}
      ${FurnishProducts.family(f,'tea-table')&&!f.obj?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('柜体 800 × 400 × 720 mm；含茶具总高约 897 mm。茶壶、杯具和储物罐为静态陈设；高度输入控制柜体，整体同比例缩放。','Cabinet 800 × 400 × 720 mm; displayed height with tea ware about 897 mm. Static tea ware and storage jars. Height edits the cabinet; all parts scale together.')}</p>`:''}
      ${FurnishProducts.family(f,'tea-bar')&&!f.obj?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('米家智能茶吧机 Pro 立式，图示 315 × 310 × 1155 mm。上下柜门独立开启，内部杯架、水桶和约 100° 开门角为图片估算。尺寸修改仅作布局缩放；厂家操作预留待确认。','Mijia Smart Tea Bar Pro: 315 × 310 × 1155 mm. Independent doors; cup rack, bottle and 100° opening are visual estimates. Resizing is for layout only; manufacturer access clearances are unknown.')}</p>`:''}
      ${FurnishProducts.family(f,'tea-bar')&&!f.obj?FurnishProducts.definition(f).teaBar.doors.map(d=>`<label>${d.section==='upper'?tr('上层消毒柜门','Upper storage door'):tr('下层水桶柜门','Lower bottle door')}<select id="tea-bar-${d.section}-door" data-tea-bar-door="${d.key}" ${lk}><option value="closed" ${!FurnishProducts.value(f,d.key)?'selected':''}>${tr('闭合','Closed')}</option><option value="open" ${FurnishProducts.value(f,d.key)?'selected':''}>${tr('开启','Open')}</option></select></label>`).join(''):''}
      ${FurnishProducts.family(f,'pet-feeder')?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('米家智能宠物喂食器 2，图示 220 × 324 × 370 mm，总深包含食盆。尺寸修改仅作布局缩放；静态外观模型，价格与加粮、取盆操作预留待确认。','Mijia Smart Pet Feeder 2: reference size 220 × 324 × 370 mm, including bowl depth. Resizing is for layout only. Static visual model; price and refill/bowl access clearances need confirmation.')}</p>`:''}
      ${FurnishProducts.family(f,'pet-litter-box')?`<label class="full">${tr('高度','Height')} (mm)<input type="number" id="fH" value="${FurnishProducts.height(f)}" min="50" max="20000" step="1" ${lk}></label><p class="muted small" style="grid-column:1/-1">${tr('原规格 440 × 510 × 400 mm；尺寸修改仅作布局缩放。猫门与顶盖为静态外观近似，品牌、价格及清理预留待确认。','Nominal size 440 × 510 × 400 mm; resizing is for layout only. Cat flap and lid are static visual approximations. Brand, price and cleaning clearance need confirmation.')}</p>`:''}
      ${f.type==='waterheater_flat'?`<label class="full">${tr('机身高度','Body height')} (mm)<input type="number" id="fH" value="${FurnishDesign.products().height(f)}" min="10" max="20000" step="1" ${lk}></label>`:''}
      ${!cabinetDesign&&(custom || laundry || fridge || robotSpec || ['shower_arrow_cream','mirror','sofa_yeswood_cherry','curtain','slidingdoor','telescopicdoor20','doubleslidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f.type)) ? `<label>${laundry?tr('机身高度','Body height'):tr('高度','Height')} (mm)<input type="number" id="fH" value="${f.h ?? (robotSpec?robotSpec[2]:FurnishDesign.products().height(f))}" min="50" step="${robotSpec?'0.1':'10'}" ${lk}></label>` : ''}
      ${f.type==='sofa_yeswood_cherry'?`<p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格 2160 × 892 × 895 mm，坐深 580 mm；尺寸修改仅作布局缩放。木框与软包为外观近似，价格待填写。','Nominal size 2160 × 892 × 895 mm, seat depth 580 mm; resizing is for layout only. Frame and upholstery are approximate; price needs entry.')}</p>`:''}
      ${robotSpec?`<p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格','Nominal size')} ${robotSpec.join(' × ')} mm${tr('；尺寸修改仅作布局缩放，安装预留待核对，价格待填写。','; resizing is for layout only. Installation clearances and price need confirmation.')}</p>`:''}
      ${!cabinetDesign?`<label class="${custom ? '' : 'full'}">${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>`:''}
    </div>
    ${!cabinetDesign?`<div class="swatches">${SWATCHES.map(c => `<button data-sw="${c}" class="${c === f.color ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div>`:''}
    <div class="muted desc">${tr('占地','Footprint')} ${fmt(f.kitchen?FurnishKitchen.area(f):FurnishProducts.dimensions(f).w*FurnishProducts.dimensions(f).d/1e6)} m² · ${tr('位于','In')} ${r ? esc(nm(state.rooms[r.id].name)) : isOutside(f) ? tr('户型外','outside') : tr('墙边 / 门口','wall / doorway')}</div>
    ${kitchenPanel(f)}
    ${waterheaterInstallationPanel(f)}${dishwasherInstallationPanel(f,installation)}
    ${window.FurnishDesignUI?.placementPanel(f,{shownIssues:installation?.checks||[]})||''}
    <div class="iconrow">
      ${btn('front', 'front', tr('置于顶层','Bring to front'))}${btn('toBack', 'back', tr('置于底层','Send to back'))}
    </div>
    <div class="actions">
      <button class="btn" id="full-product-details">完整家具资料</button><button class="btn" id="replace-furniture">查找并替换</button><button class="btn" data-act="resetItem">${ico('reset')}${tr('恢复默认','Reset item')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn" data-act="home">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted small">${tr('拖动家具移动（会对齐其他家具并显示参考线）；拖上方圆点旋转、右侧白色手柄只改宽、下方白色手柄只改深，角落橙色方块同时改宽深；调整尺寸固定对侧边。Shift+点击可多选，右键查看更多操作。', 'Drag to move (snaps with guides); drag the top dot to rotate, the right white handle for width, the bottom white handle for depth, or the orange corner for both. Resizing fixes the opposite edge. Shift+click to multi-select; right-click for more.')}</section>`;
}
function cabinetInteriorMeasurementNote(f){
 const item=Array.isArray(f)?f.length===1?f[0]:null:f;if(!item)return '';
 const result=FurnishSnapping.cabinetInterior(item,measurementScene());if(!result)return '';
 const value=dir=>result[dir]?Math.round(result[dir].distance*100)/100+' mm':result.pending?tr('高度待核对','Height unknown'):tr('该方向无板件','No board in this direction');
 return `<div class="measurement-basis" data-cabinet-interior><b>${tr('家具实际结构净距','Clearance to furniture structure')}</b><p>${tr('设备上方','Above device')}：<span data-interior-gap="top">${value('top')}</span> · ${tr('设备下方','Below device')}：<span data-interior-gap="bottom">${value('bottom')}</span></p><p>${result.collisions.length?esc(tr('与实际板件重叠：','Intersects boards: ')+[...new Set(result.collisions.map(v=>v.hostName+' · '+v.boardName))].join('、')):''}</p><small>${tr('按当前板件和开合计算；安装预留另核对，孔洞保守按板面。','Current board/door geometry; verify installation allowances separately. Perforations remain conservative.')}</small></div>`;
}
function directionalMeasurementPanel(f,saveAllId='directional-measure-save',compact=false){
 const members=Array.isArray(f)?f:[f],locked=members.some(v=>furnitureLocked(v)),distances=directionalMeasurements(f),labels={t:tr('上方','Up'),b:tr('下方','Down'),l:tr('左侧','Left'),r:tr('右侧','Right')};
 const interiorNote=cabinetInteriorMeasurementNote(f),containedBoundary=Object.values(distances).some(m=>m?.containedBoundary),surfaceBoundary=!!interiorNote||containedBoundary||Object.values(distances).some(m=>m?.surfaceBoundary||m?.wallPriority);
 if(compact)return `${interiorNote}${containedBoundary?`<p class="measurement-basis">${tr('包络内边距不代表柜内净空；实体重叠仍需核对，确认实际板件后再定位。','Enclosing distances do not confirm internal clearance; check solids before positioning.')}</p>`:''}<div class="fab-distance-grid">${Object.entries(labels).map(([dir,label])=>{const m=distances[dir],name=measurementReferenceName(m);return `<button class="btn fab-gap-choice" data-distance-row="${dir}" data-distance-edit="${dir}" ${!m||locked?'disabled':''} aria-label="${esc(`${label} ${m?Math.round(m.distance)+' mm':''} · ${name}`)}"><span>${label}<b>${m?Math.round(m.distance)+' mm':'—'}</b></span><small>${esc(name)}</small></button>`;}).join('')}</div><p class="muted small">${locked?tr('选中项含锁定家具，请先解锁。','Selection contains locked furniture; unlock first.'):tr('按图纸上下左右，外沿 → 最近参照；点击数值定位，0 可贴边。','Drawing directions, footprint edge → nearest reference. Click to position; 0 means contact.')}</p><div class="actions">${Object.entries(labels).map(([dir,label])=>`<button class="btn" data-distance-save="${dir}" ${!distances[dir]||distances[dir].distance<1?'disabled':''}>${label}${tr('留图',' · Keep')}</button>`).join('')}<button class="btn" id="${saveAllId}" ${Object.values(distances).some(m=>m&&m.distance>=1)?'':'disabled'}>${tr('全部留在图纸','Keep all on drawing')}</button></div><p class="muted small">${tr('留图后端点固定，不随家具移动。','Kept endpoints stay fixed when furniture moves.')}</p>`;
 return `<div class="mt directional-measurements"><h4>${members.length>1?tr('整组四向净距（2D）','Group clearance in four directions (2D)'):surfaceBoundary?tr('四向实体边界距离（2D）','Distance to entity boundaries (2D)'):tr('四向最近净距（2D）','Nearest clearance in four directions (2D)')}</h4>
 ${interiorNote}
 <p class="measurement-basis">${tr('占地外沿 → 最近参照 · 按图纸上下左右','Footprint edge → nearest reference · drawing up/down/left/right')}</p>
 ${containedBoundary?`<p class="measurement-basis">${tr('包络内边距量到包含本物体的外框，不代表柜内净空或安装合格；实体重叠仍需核对。','Enclosing distances measure to the outer boundary, without confirming internal space or installation fit. Check solid overlaps separately.')}</p>`:''}
 ${Object.entries(labels).map(([dir,label])=>{const m=distances[dir],name=measurementReferenceName(m),action=m?`${label} ${Math.round(m.distance)} mm · ${tr('外沿到','Edge to')} ${name}`:'';return `<div class="irow" data-distance-row="${dir}"><span class="nm"><b>${label}</b><br><small>${m?esc(tr('外沿 → ','Edge → ')+name):name}</small></span>${m?`<button class="btn" data-distance-edit="${dir}" aria-label="${esc(action)}" title="${tr('输入目标净距并移动物体','Set target clearance and move item')}" ${locked?'disabled':''}>${Math.round(m.distance)} mm</button>`:'<b>—</b>'}<button class="btn" data-distance-save="${dir}" title="${tr('固定当前测量端点，不随家具移动','Keep fixed endpoints; does not follow furniture')}" ${!m||m.distance<1?'disabled':''}>${tr('留图','Keep')}</button></div>`;}).join('')}
 <button class="btn mt" id="${saveAllId}" ${Object.values(distances).some(m=>m&&m.distance>=1)?'':'disabled'}>${tr('全部留在图纸','Keep all on drawing')}</button><p class="muted small">${tr('留图后端点固定，不随家具移动。点击距离数字可移动选中项；0 表示接触或投影重叠。','Kept endpoints stay fixed when furniture moves. Click a value to move the selection; 0 means contact or projected overlap.')}</p>
 ${Object.values(distances).some(m=>m?.surfaceBoundary||m?.wallPriority)?`<p class="measurement-basis">${tr('橙色「孔边」从开孔边量起，方向按产品左／右／前／后。','Orange cutout distances start at the opening edge, using product left/right/front/rear.')}</p>`:''}
 <details class="muted small"><summary>${tr('测量参照与规则','Measurement references and rules')}</summary><p>${tr('按当前图纸方向量到投影相交的最近家具、柜体或墙窗。高度明确分离的家具不参与；高度未知保守参与，普通圆形按矩形，厨房按台面轮廓。多选按整组外侧轮廓测量。数字定位保持点击时的参照，0 为贴边。','Measures along drawing axes to the nearest projected furniture, cabinet, wall or window. Known separated heights are excluded; unknown heights remain included. Curves use rectangles, kitchens use worktop outlines, and groups use their outer contours. Numeric placement fixes the selected reference; 0 means contact.')}${surfaceBoundary?tr(' 完整承托的水槽／灶具优先量到紧邻实体墙；开放方向量到所在模块边界，旧组合量到台面边界。',' Fully supported sinks/hobs use adjoining solid walls first, otherwise their module edge; legacy assemblies use worktop edges.'):''}</p></details></div>`;
}
function bindDirectionalMeasurementPanel(){
  document.querySelectorAll('#panel [data-distance-edit]').forEach(b=>b.onclick=()=>editDirectionalDistance(b.dataset.distanceEdit));
  const distanceSave=$('#directional-measure-save');if(distanceSave)distanceSave.onclick=()=>saveDirectionalMeasurements();
  document.querySelectorAll('#panel [data-distance-save]').forEach(b=>b.onclick=()=>saveDirectionalMeasurements(b.dataset.distanceSave));
}
function bindFurnPanel(f){
  bindDirectionalMeasurementPanel();
  if(typeof bindKitchenPanel==='function')bindKitchenPanel(f);
  if(f.type==='waterheater_flat')$('#heater-ceiling-settings').onclick=()=>{const room=FurnishProject.ceilingAt(FurnishProject.effectivePlan(PLAN,state),f.cx,f.cy).room;if(room){ui.sel={kind:'room',id:room.id};renderPanel();}else FurnishWorkspace.open('settings');};
  window.FurnishDesignUI?.bindPlacement(f);$('#full-product-details').onclick=()=>FurnishWorkspace.open('products');
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  for(const [selector,key] of [['#fPipeBoxShape','pipeBoxShape'],['#fPipeBoxOpenSide','pipeBoxOpenSide'],['#fPipeBoxCorner','pipeBoxCorner']]){const el=$(selector);if(el)el.onchange=e=>{try{const g=getF(f.id);if(furnitureLocked(g))throw Error('家具已锁定，请先解锁');const v=FurnishProducts.validateField(g,key,e.target.value);upd(g=>g[key]=v);}catch(error){toast(error.message);renderPanel();}};}
  const foldingPose=$('#folding-table-pose');if(foldingPose)foldingPose.onchange=e=>{try{const next=FurnishProducts.editFoldingTablePose(getF(f.id),e.target.value);upd(g=>Object.assign(g,next));}catch(error){toast(error.message);renderPanel();}};
  document.querySelectorAll('[data-tea-bar-door]').forEach(el=>el.onchange=e=>{if(furnitureLocked(getF(f.id)))return;upd(g=>g[el.dataset.teaBarDoor]=FurnishProducts.validateField(g,el.dataset.teaBarDoor,e.target.value==='open'));});
  const dishwasherDoor=$('#dishwasher-door');if(dishwasherDoor)dishwasherDoor.onchange=e=>{if(furnitureLocked(getF(f.id)))return;upd(g=>g.dishwasherDoorOpen=FurnishProducts.validateField(g,'dishwasherDoorOpen',e.target.value==='open'));};
  const socketMode=$('#heaterSocketMode');if(f.type==='waterheater_flat'&&socketMode){socketMode.onchange=e=>{if(furnitureLocked(getF(f.id)))return;upd(g=>{if(e.target.value==='set')g.heaterSocket={x:g.cx,y:g.cy,z:FurnishDesign.products().value(g,'mountHeight')};else delete g.heaterSocket;});};for(const key of ['x','y','z']){const el=$('#heaterSocket'+key.toUpperCase());if(el)el.onchange=e=>{try{if(furnitureLocked(getF(f.id)))throw Error('家具已锁定，请先解锁');const v=Number(e.target.value);if(!e.target.value.trim()||!Number.isFinite(v)||Math.abs(v)>1000000||key==='z'&&(v<0||v>20000))throw Error('请输入有效插座坐标；离地高度须为 0–20000 mm');upd(g=>g.heaterSocket={...g.heaterSocket,[key]:Math.round(v)});}catch(error){toast(error.message);renderPanel();}};}}
  if(FurnishDesign.products().supports(f,'floorTrack'))$('#fFloorTrack').onchange=e=>{if(furnitureLocked(getF(f.id)))return;upd(g=>g.floorTrack=e.target.value==='true');};
  for(const [selector,key,parse] of [['#fSlidingStackSide','slidingStackSide',v=>v],['#fSlidingOpen','slidingOpen',v=>v==='true']]){const el=$(selector);if(el)el.onchange=e=>{if(furnitureLocked(getF(f.id)))return;const value=FurnishProducts.validateField(getF(f.id),key,parse(e.target.value));upd(g=>g[key]=value);};}
  if(FurnishProducts.supports(f,'slidingTrackOrder'))$('#fSlidingTrackOrder').onchange=e=>{if(furnitureLocked(getF(f.id)))return;const value=e.target.value;FurnishProducts.validateField(getF(f.id),'slidingTrackOrder',value);upd(g=>g.slidingTrackOrder=value);};
  if(f.type==='curtain')$('#curtainStyle').onchange=e=>{if(furnitureLocked(getF(f.id)))return;upd(g=>g.curtainStyle=e.target.value);};
  const centerFridge=$('#fridge-center-bay');if(centerFridge)centerFridge.onclick=()=>{try{const cabinet=getF($('#fridge-bay-target').value),next=FurnishCabinet.centerFridgeInBay(cabinet,getF(f.id));upd(g=>Object.assign(g,next));toast(tr('已在冰箱预留位左右居中，前后位置保持不变','Centered in fridge bay; front/back position unchanged'));}catch(error){toast(error.message);}};
  const num = (id, fn) => { const el = $(id); if (el) el.onchange = e => {const v=Number(e.target.value);try{if(!e.target.value.trim()||!Number.isFinite(v))throw Error('请输入有效数字');if(['#fW','#fD','#fH','#fX','#fY','#fR','#fMountHeight','#fStackHeight','#fPipeBoxThickness','#fShowerRise','#fShowerHandAngle','#fShowerMixerHeight'].includes(id)&&furnitureLocked(getF(f.id)))throw Error('家具已锁定，请先解锁');upd(g=>fn(g,v));}catch(error){toast(error.message);renderPanel();}}; };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fManifoldLoops',(g,v)=>{if(furnitureLocked(g))throw Error('家具已锁定，请先解锁');Object.assign(g,FurnishProducts.editManifold(g,{loops:v}));});
  num('#fManifoldLeft',(g,v)=>{if(furnitureLocked(g))throw Error('家具已锁定，请先解锁');Object.assign(g,FurnishProducts.editManifold(g,{leftLength:v}));});
  num('#fManifoldLower',(g,v)=>{if(furnitureLocked(g))throw Error('家具已锁定，请先解锁');Object.assign(g,FurnishProducts.editManifold(g,{lower:v}));});
  num('#fW', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{w:Math.round(v)})));
  num('#fD', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{d:Math.round(v)})));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = norm(v));
  const priceField=$('#fP');if(priceField)priceField.onchange=e=>{const text=e.target.value.trim(),value=Number(text);if(text!==''&&(!Number.isFinite(value)||value<0)){toast(tr('请输入非负单价，留空恢复参考价或待填写状态','Enter a nonnegative price; clear to restore reference or unknown price'));renderPanel();return;}upd(g=>{if(text==='')delete g.price;else g.price=Math.round(value);});};
  const embedWall=$('#fEmbedWall');if(embedWall)embedWall.onclick=()=>{try{if(furnitureLocked(getF(f.id)))throw Error('家具已锁定，请先解锁');upd(g=>Object.assign(g,FurnishElectricalBox.embed(g,FurnishProject.effectivePlan(PLAN,state))));}catch(e){toast(e.message);}};
  num('#fH', (g,v) => {if(g.type==='mirror'&&v<50)throw Error('穿衣镜高度须为 50–20000 mm');Object.assign(g,FurnishDesign.resizeFurniture(g,{h:g.type.startsWith('robot_p20max')?Math.round(v*10)/10:Math.round(v)}));});
  num('#fShowerMixerHeight',(g,v)=>{FurnishDesign.products().validateField(g,'showerMixerHeight',v);g.showerMixerHeight=v;delete g.mountHeight;});
  num('#fShowerRise',(g,v)=>{FurnishDesign.products().validateField(g,'showerRise',v);g.showerRise=v;});
  num('#fShowerHandAngle',(g,v)=>{FurnishDesign.products().validateField(g,'showerHandAngle',v);g.showerHandAngle=v;});
  for(const [id,key] of [['#fDownlightWatts','downlightWatts'],['#fDownlightKelvin','downlightKelvin']]){const el=$(id);if(el)el.onchange=()=>{try{if(furnitureLocked(getF(f.id)))return;const next=FurnishProducts.editDownlight(getF(f.id),key,Number(el.value));upd(g=>Object.assign(g,next));}catch(error){toast(error.message);renderPanel();}};}
  const fitPanel=$('#fitCeilingPanel');if(fitPanel)fitPanel.onclick=()=>{try{if(furnitureLocked(getF(f.id)))return;const next=FurnishCeiling.fitCeilingPanel(FurnishProject.effectivePlan(PLAN,state),getF(f.id),state.furniture);upd(g=>Object.assign(g,next));}catch(error){toast(error.message);}};
  const fitDownlight=$('#fitDownlight');if(fitDownlight)fitDownlight.onclick=()=>{try{if(furnitureLocked(getF(f.id)))return;const height=FurnishCeiling.fitDownlight(FurnishProject.effectivePlan(PLAN,state),getF(f.id),state.furniture);upd(g=>g.mountHeight=height);}catch(error){toast(error.message);}};
  num('#fMountHeight',(g,v)=>{FurnishDesign.products().validateField(g,'mountHeight',v);g.mountHeight=Math.round(v);});
  num('#fPipeBoxThickness',(g,v)=>{FurnishProducts.validateField(g,'pipeBoxThickness',v);g.pipeBoxThickness=v;});
  num('#fStackHeight',(g,v)=>{FurnishDesign.products().validateField(g,'stackHeight',v);g.stackHeight=Math.round(v);});
  const color=$('#fC');if(color)color.onchange = e => upd(g => g.color = e.target.value);
  document.querySelectorAll('#panel [data-sw]').forEach(b => b.onclick = () => upd(g => g.color = b.dataset.sw));
}
function multiPanel(items){
  const [x0,y0,x1,y1] = groupBox(items), btn = (act, icon, label) => `<button class="btn" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const cost = items.reduce((a, f) => a + priceOf(f), 0);
  return `${laundryGroupHost(items)?laundryControls(laundryGroupHost(items)):''}<section><h3>${tr(`已选 ${items.length} 件家具`, `${items.length} items selected`)}</h3>
    <div class="stats"><div><small>${tr('整体尺寸','Group size')}</small><span class="big mid">${Math.round(x1-x0)} × ${Math.round(y1-y0)}</span></div>
      <div><small>${tr('参考价合计','Reference total')}</small><span class="big mid">${yen(cost)}</span></div></div>
    ${window.FurnishDesignUI?.groupPlacementPanel(items)||''}
    <div class="lbl">${tr('对齐','Align')}</div>
    <div class="iconrow">${btn('al','al',tr('左对齐','Align left'))}${btn('ac','ac',tr('水平居中','Align centers horizontally'))}${btn('ar','ar',tr('右对齐','Align right'))}${btn('at','at',tr('顶对齐','Align top'))}${btn('am','am',tr('垂直居中','Align middles'))}${btn('ab','ab',tr('底对齐','Align bottom'))}</div>
    <div class="lbl">${tr('分布 · 尺寸','Distribute · size')}</div>
    <div class="iconrow">${btn('dh','dh',tr('水平等距分布','Distribute horizontally'))}${btn('dv','dv',tr('垂直等距分布','Distribute vertically'))}${btn('match','size',tr('统一为主选中项的尺寸','Match size of the primary item'))}</div>
    <div class="actions">
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn" data-act="home">${tr('查看整案','View whole design')}</button></div></section>
  <section><h3>${tr('选中项','Selection')}</h3>
    ${items.map(f => `<div class="irow ${f.id === ui.sel.id ? 'on' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${furnitureLocked(f) ? ico('lock') + ' ' : ''}${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small></div>`).join('')}
    <div class="muted note">${tr('高亮项为主选中项（统一尺寸的基准）。Shift+点击可增减选择。','The highlighted item is primary (used by Match size). Shift+click to add/remove.')}</div></section>`;
}


/* ======================= 文字标注 ======================= */
const getNote = id => (state.notes || []).find(n => n.id === id);
function openNoteEditor(note, at){
  const cur = note || {text:'', color:'accent', size:1};
  openDialog({title:note ? tr('编辑标注', 'Edit note') : tr('添加标注', 'Add note'), body:`
    <div class="form"><label class="full">${tr('文字（最多 40 字）', 'Text (max 40 chars)')}<input id="nT" maxlength="40" value="${esc(cur.text)}" placeholder="${tr('如：此处预留插座 / 吊顶高度 2.6m', 'e.g. outlet here / ceiling 2.6m')}"></label></div>
    <div class="lbl">${tr('颜色', 'Color')}</div><div class="chiprow" id="nC">${Object.entries(NOTE_COLORS).map(([k, [bg]]) => `<button class="btn chip ${cur.color === k ? 'on' : ''}" data-c="${k}"><i class="ndot" style="background:${bg}"></i>${tr({accent:'朱红', teal:'青绿', ink:'墨色', paper:'纸白'}[k], {accent:'Vermilion', teal:'Teal', ink:'Ink', paper:'Paper'}[k])}</button>`).join('')}</div>
    <div class="lbl">${tr('字号', 'Size')}</div><div class="chiprow" id="nS">${[[0.8, '小', 'S'], [1, '中', 'M'], [1.4, '大', 'L']].map(([v, zh, en]) => `<button class="btn chip ${cur.size === v ? 'on' : ''}" data-s="${v}">${tr(zh, en)}</button>`).join('')}</div>`,
    onOpen:() => ['#nC', '#nS'].forEach(g => $(g).onclick = e => { const b = e.target.closest('.btn'); if (!b) return; $(g).querySelectorAll('.btn').forEach(x => x.classList.toggle('on', x === b)); }),
    actions:[...(note ? [{label:tr('删除', 'Delete'), cls:'danger left', fn:() => deleteNote(note.id)}] : []), {label:tr('取消', 'Cancel')},
      {label:tr('保存', 'Save'), cls:'primary', fn:() => {
        const text = $('#nT').value.trim(); if (!text){ toast(tr('请输入标注文字', 'Enter some text')); return false; }
        const color = $('#nC .on')?.dataset.c || 'accent', size = +($('#nS .on')?.dataset.s || 1);
        if (note) mutate(() => Object.assign(getNote(note.id), {text, color, size}));
        else { if((state.notes||[]).length>=2000){toast(tr('每个方案最多 2000 条文字标注。','Up to 2000 text notes per design.'));return false;}const n = {id:uid(), x:Math.round(at.x), y:Math.round(at.y), text, color, size}; mutate(() => (state.notes ||= []).push(n)); select({kind:'note', id:n.id}); }
      }}]});
}
function deleteNote(id){ ui.sel = null; mutate(() => state.notes = state.notes.filter(n => n.id !== id)); toast(tr('已删除标注', 'Note deleted'), {label:tr('撤销', 'Undo'), fn:undo}); }
function notePanel(n){
  return `<section><h3>${tr('文字标注', 'Note')}</h3>
    <div class="notecard" style="--nb:${NOTE_COLORS[n.color][0]};--nf:${NOTE_COLORS[n.color][1]}">${esc(n.text)}</div>
    <div class="muted desc">${tr('位置', 'Position')} X ${n.x} · Y ${n.y} mm · ${tr('拖动可移动，双击可编辑', 'drag to move, double-click to edit')}</div>
    <div class="actions"><button class="btn" data-act="editNote">${ico('note')}${tr('编辑', 'Edit')}</button>
      <button class="btn danger" data-act="delNote">${ico('trash')}${tr('删除', 'Delete')}</button>
      <button class="btn" data-act="home">${tr('← 返回总览', '← Back')}</button></div></section>`;
}


/* 门窗属性：门可换开启方向 / 铰链侧（写入 state.open，随方案保存并同步 3D）；窗可调窗台高 */
function openingPanel(sel){
  const isDoor = sel.kind === 'door';
  const d = isDoor ? DOORS[sel.id] : SLIDES[sel.id];
  const [x0,y0,x1,y1] = d.rect, w = Math.max(x1-x0, y1-y0);
  const inward=isDoor?(d.entryDirection||d._base?.o||d.o):null,isInward=isDoor&&d.o[0]*inward[0]+d.o[1]*inward[1]>0;
  return `<section><h3>${isDoor ? (d.doorType==='double'?tr('对开门','Double door'):tr('平开门','Swing Door')) : tr('推拉门','Sliding Door')}</h3>
    <div class="stats">
      <div><small>${tr('名称','Name')}</small><span class="val">${esc(nm(d.name || (isDoor ? '门' : '推拉门')))}</span></div>
      <div><small>${tr('洞口宽','Opening width')}</small><span class="big">${w}</span> mm</div></div>
    ${isDoor ? `<div class="form"><label class="full">${tr('门的类型','Door type')}<select id="oType"><option value="single" ${d.doorType!=='double'?'selected':''}>${tr('单扇平开门','Single swing door')}</option><option value="double" ${d.doorType==='double'?'selected':''}>${tr('对开门','Double door')}</option></select></label><label class="full">${tr('开启方向','Swing direction')}<select id="oSwing"><option value="inward" ${isInward?'selected':''}>${tr('向内开','Inward')}</option><option value="outward" ${!isInward?'selected':''}>${tr('向外开','Outward')}</option></select></label></div><div class="actions">
      <button class="btn" id="oFlip">${tr('换开启方向','Flip swing')}</button>
      <button class="btn" id="oHinge" ${d.doorType==='double'?'disabled':''}>${tr('换铰链侧','Swap hinge')}</button>
      <button class="btn" id="oReset">${tr('重置','Reset')}</button></div>
    <div class="muted desc">${tr('调整会同步到 3D 场景与漫游碰撞，随方案自动保存，可撤销。','Changes sync to 3D and walk collision; autosaved and undoable.')}</div>` : ''}
    ${!isDoor ? `<div class="form"><label class="full">${tr('门扇形式','Door panels')}<select id="slidePanels"><option value="2" ${d.panels!==3?'selected':''}>${tr('双扇推拉门','Two-panel sliding door')}</option><option value="3" ${d.panels===3?'selected':''}>${tr('三联动推拉门','Three-panel telescopic door')}</option></select></label><label>${tr('地轨道','Floor track')}<select id="slideFloorTrack"><option value="false" ${(d.floorTrack??d.panels!==3)===false?'selected':''}>${tr('无地轨 · 吊轨','No floor track')}</option><option value="true" ${(d.floorTrack??d.panels!==3)===true?'selected':''}>${tr('有地轨','With floor track')}</option></select></label><label>${tr('叠合侧','Stacking side')}<select id="slideStackSide"><option value="left" ${d.stackSide!=='right'?'selected':''}>${tr('左侧','Left')}</option><option value="right" ${d.stackSide==='right'?'selected':''}>${tr('右侧','Right')}</option></select></label></div><p class="muted">${tr('进入 3D，点击门扇开关；三联动门向同一侧依次叠合。','Click the door in 3D to open or close; telescopic panels stack to one side.')}</p>` : ''}
    <div class="actions"><button class="btn" id="oback">${tr('← 返回总览','← Back')}</button></div></section>`;
}
function bindOpeningPanel(sel){
  const upd = fn => mutate(() => { state.open.d = state.open.d || {}; fn(state.open.d); });
  if(sel.kind==='slide'){for(const [id,key,parse] of [['slidePanels','panels',Number],['slideFloorTrack','floorTrack',v=>v==='true'],['slideStackSide','stackSide',v=>v]])$('#'+id).onchange=e=>mutate(()=>{const d=SLIDES[sel.id];(state.open.s ||= {})[sel.id]={panels:d.panels===3?3:2,floorTrack:d.floorTrack??d.panels!==3,stackSide:d.stackSide||'left',...(state.open.s[sel.id]||{}),[key]:parse(e.target.value)};});}
  if (sel.kind === 'door'){
    const snapshot=d=>({h:[...d.h],c:[...d.c],o:[...d.o],...(d.doorType?{doorType:d.doorType}:{})});
    const type=$('#oType');if(type)type.onchange=e=>upd(o=>{o[sel.id]={...snapshot(DOORS[sel.id]),doorType:e.target.value};});
    const swing=$('#oSwing');if(swing)swing.onchange=e=>{const d=DOORS[sel.id],inward=d.entryDirection||d._base?.o||d.o,isInward=d.o[0]*inward[0]+d.o[1]*inward[1]>0;if(isInward!==(e.target.value==='inward'))$('#oFlip').onclick();};
    $('#oFlip').onclick = () => upd(o => { const d = DOORS[sel.id];
      const [x0,y0,x1,y1] = d.rect, h = [...d.h];
      // Switching inward/outward also moves the hinge to the opposite wall face.
      const normal = Math.abs(d.c[0]) > .5 ? 1 : 0;
      h[normal] = normal === 1 ? y0+y1-h[1] : x0+x1-h[0];
      o[sel.id] = {...snapshot(d),h, o:[-d.o[0], -d.o[1]]}; });
    $('#oHinge').onclick = () => upd(o => { const d = DOORS[sel.id], [x0,y0,x1,y1] = d.rect;
      const long = (x1-x0) >= (y1-y0);
      const nh = long ? [d.h[0] === x0 ? x1 : x0, d.h[1]] : [d.h[0], d.h[1] === y0 ? y1 : y0];
      o[sel.id] = {...snapshot(d),h:nh, c:[-d.c[0], -d.c[1]]}; });
    $('#oReset').onclick = () => upd(o => { delete o[sel.id]; });
  }
  $('#oback').onclick = () => select(null);
}
function winPanel(i){
 const w=WINS[i],width=Math.round(Math.max(w.rect[2]-w.rect[0],w.rect[3]-w.rect[1])),height=Math.round(((w.head??2.4)-w.sill)*1000);
 return `<section><h3>窗尺寸</h3><p>窗宽 ${width} mm · 窗高 ${height} mm</p><div class="form"><label class="full">窗扇形式<select id="wPanels"><option value="0" ${w.panels!==3?'selected':''}>普通固定窗</option><option value="3" ${w.panels===3?'selected':''}>三联动推拉窗</option></select></label><label class="full">叠合侧<select id="wStackSide"><option value="left" ${w.stackSide!=='right'?'selected':''}>左侧</option><option value="right" ${w.stackSide==='right'?'selected':''}>右侧</option></select></label><label class="full">窗台高 mm<input type="number" id="wSill" min="0" max="2400" step="1" value="${Math.round(w.sill*1000)}"></label><label class="full">窗户高度 mm<input type="number" id="wHeight" min="100" max="2800" step="1" value="${height}"></label><label class="full">窗顶高（距地面）mm<input type="number" id="wHead" max="2800" step="1" value="${Math.round((w.head??2.4)*1000)}"></label></div><p>窗户高度 = 窗顶高 − 窗台高，两项自动联动；修改窗台高时保持窗户高度。</p><p>内置布局窗宽按预设图纸定义；导入自定义户型可编辑窗宽。</p><p id="wError" role="alert"></p><div class="actions"><button class="btn primary" id="wApply">应用尺寸</button><button class="btn" id="wReset">重置</button><button class="btn" id="wback">返回总览</button></div></section>`;
}
function linkWindowHeightInputs(sill,height,head){
    const number=input=>input.value.trim()!==''&&Number.isFinite(Number(input.value))?Number(input.value):null;
    for(const input of [sill,height,head]){const previous=input.oninput;input.oninput=()=>{
      const a=number(sill),b=number(input===head?head:height),target=input===head?height:head;
      target.value=a===null||b===null?'':String(Math.round((input===head?b-a:a+b)*1000)/1000);
      previous?.();
    };}
  }

function bindWinPanel(i){
  linkWindowHeightInputs($('#wSill'),$('#wHeight'),$('#wHead'));
 $('#wApply').onclick=()=>{const sill=Number($('#wSill').value)/1000,height=Number($('#wHeight').value)/1000;if(['wSill','wHeight','wHead'].some(id=>!$('#'+id).value.trim())||!Number.isFinite(sill)||!Number.isFinite(height)||sill<0||sill>2.4||height<.1||sill+height>2.8){$('#wError').textContent='窗高至少100 mm，窗顶不得超过2800 mm';return;}mutate(()=>{state.open.w??={};state.open.w[i]={sill,head:sill+height,panels:Number($('#wPanels').value),stackSide:$('#wStackSide').value};});};
 $('#wReset').onclick=()=>mutate(()=>{if(state.open.w)delete state.open.w[i];});$('#wback').onclick=()=>select(null);
}
