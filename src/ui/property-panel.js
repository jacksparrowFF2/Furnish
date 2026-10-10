/* Property panels and note editing. Classic script declarations only;
 * read the current application state when called, including after undo/load. */
function renderPanel(){
  window.FurnishWorkspace?.clearOpeningPreview();
  renderFab();
  const p = $('#panel'), ids = selIds();
  if (ids.length > 1){ p.innerHTML = multiPanel(selItems()); return; }
  if (ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ p.innerHTML = furnPanel(f); bindFurnPanel(f); return; } }
  if (ui.sel?.kind === 'wall' && window.FurnishWorkspace){ window.FurnishWorkspace.wallPanel(ui.sel.id,p); return; }
  if (ui.sel?.kind === 'room'){ p.innerHTML = roomPanel(ROOMS.find(r => r.id === ui.sel.id)); bindRoomPanel(); return; }
  if (ui.sel?.kind === 'door' || ui.sel?.kind === 'slide'){ p.innerHTML = openingPanel(ui.sel); bindOpeningPanel(ui.sel); window.FurnishWorkspace?.openingGeometry(ui.sel,p); return; }
  if (ui.sel?.kind === 'win'){ if(window.FurnishWorkspace?.bayPanel(ui.sel.id,p))return; if(!window.FurnishWorkspace?.windowPanel(ui.sel.id,p)){p.innerHTML = winPanel(ui.sel.id); bindWinPanel(ui.sel.id);} window.FurnishWorkspace?.openingGeometry(ui.sel,p); return; }
  if (ui.sel?.kind === 'note'){ const n = getNote(ui.sel.id); if (n){ p.innerHTML = notePanel(n); return; } }
  const lost = state.furniture.filter(isOutside).length, clashN = collisions().length;
  const tab = (k, icon, zh, en, n, warn) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-tab="${k}">${ico(icon)}${tr(zh, en)}${n != null ? `<span class="n ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`;
  p.innerHTML = `<div class="tabs" role="tablist">${tab('overview', 'chart', '概览', 'Overview')}${tab('list', 'list', '清单', 'Items', state.furniture.length, lost || clashN)}${tab('quote', 'coin', '报价', 'Quote')}</div>`
    + (ui.tab === 'list' ? listPanel() : ui.tab === 'quote' ? quotePanel() : overviewPanel());
  if (ui.tab === 'overview') bindOverview();
}

// 底部浮动工具条：触屏没有键盘，常用操作都放在这里
function renderFab(){
  const fab = $('#fab'), ids = selIds(), f = ids.length === 1 && getF(ids[0]), r = ui.sel?.kind === 'room' && ROOMS.find(r => r.id === ui.sel.id);
  if (!ids.length && !r){ fab.classList.remove('show'); return; }
  const b = (act, icon, label, cls = '') => `<button class="btn ${cls}" data-act="${act}" title="${label}">${ico(icon)}</button>`;
  fab.innerHTML = ids.length
    ? `<span class="name">${f ? esc(nm(f.name)) : tr(`已选 ${ids.length} 件`, `${ids.length} selected`)}</span>`
      + b('rotL', 'rotL', tr('逆时针 90°', 'Rotate left')) + b('rotR', 'rotR', tr('顺时针 90°', 'Rotate right')) + b('flip', 'flip', tr('镜像', 'Mirror'))
      + b('lock', selItems().every(x => x.locked) ? 'lock' : 'unlock', tr('锁定 / 解锁', 'Lock / unlock')) + b('dup', 'copy', tr('复制一份', 'Duplicate')) + b('del', 'trash', tr('删除', 'Delete'), 'danger')
      + `<span class="sep"></span><button class="btn narrow-only" data-act="prop">${tr('属性','Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(state.rooms[r.id].name))}</span><button class="btn" data-act="roomFurn">${tr('选中房间内家具','Select its furniture')}</button><button class="btn narrow-only" data-act="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;
  fab.classList.add('show');
}


function roomPanel(r){
  const st = state.rooms[r.id], a = area(r.poly), [x0,y0,x1,y1] = bbox(r.poly), inside = state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly));
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>¥${m.price}/m²</small></span></button>`).join('');
  return `<section><h3>${tr('房间','Room')}</h3>
    <div class="form"><label class="full">${tr('名称','Name')}<input id="rName" maxlength="80" value="${esc(nm(st.name))}"></label><label class="full">${tr('房间用途','Room use')}<select id="rUse" ${r.counted===false?'disabled':''}>${Object.entries(FurnishDesign.uses).filter(([id])=>r.counted===false?id==='bay':id!=='bay').map(([id,n])=>`<option value="${id}" ${FurnishDesign.inferUse(r,st)===id?'selected':''}>${tr(...n)}</option>`).join('')}</select></label></div>
    <p class="muted">${tr('风格方案按用途匹配地面，修改名称不会改变已设置的用途。','Styles use room purpose; renaming preserves the selected purpose.')}</p>
    <div class="stats mt">
      <div><small>${tr('使用面积','Floor area')}</small><span class="big">${fmt(a)}</span> m²</div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${fmt(perim(r.poly),1)}</span> m</div>
      <div><small>${tr('开间','Width')}</small><span class="big">${x1-x0}</span> mm</div>
      <div><small>${tr('进深','Depth')}</small><span class="big">${y1-y0}</span> mm</div></div>
    <div class="muted">${tr(`墙面面积（层高 2.8m，未扣门窗）约 ${fmt(perim(r.poly)*2.8,1)} m²`, `Wall area (2.8m ceiling, openings not deducted) ≈ ${fmt(perim(r.poly)*2.8,1)} m²`)}</div></section>
  <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div>
    <div class="total"><span>${tr('材料估价','Estimated cost')}</span><b>${yen(a*(state.pricing?.materials?.[st.mat]??MATS[st.mat].price)*(1+FurnishProject.pricing(state.pricing).floorWaste/100))}</b></div></section>
  <section><h3>${tr('房间内家具','Furniture in room')} <small>${tr(`${inside.length} 件 · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`, `${inside.length} items · ${yen(inside.reduce((s,f) => s + priceOf(f), 0))}`)}</small></h3>
    ${inside.map(f => `<div class="irow ${clashIds.has(f.id) ? 'clash' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small></div>`).join('') || `<div class="muted">${tr('暂无','None')}</div>`}
    <div class="actions">${inside.length ? `<button class="btn" data-act="roomFurn">${tr('全部选中','Select all')}</button>` : ''}
      <button class="btn" data-act="roomReset">${ico('reset')}${tr('恢复默认名称与地面','Reset name & floor')}</button>
      <button class="btn" data-act="home">${tr('← 返回总览','← Back to overview')}</button></div></section>`;
}
function bindRoomPanel(){
  const id = ui.sel.id;
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  $('#rUse').onchange = e => mutate(() => state.rooms[id].use = e.target.value);
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
}

const SWATCHES = ['#ffffff','#efe6d8','#e2cfb4','#d6b99a','#a57c56','#c9d6df','#c3cbd6','#d8c7dc','#b7c4b0','#9dbb8c','#cfc6b8','#8a7a5e','#4a4f55','#1f1d1b'];
function furnPanel(f){
  const r = isOutside(f) ? null : roomAt(f.cx, f.cy), custom = f.type === 'custom' || f.type === 'customround', lk = f.locked ? 'disabled' : '';
  const clashWith = collisions().filter(p => p.includes(f.id)).map(p => getF(p[0] === f.id ? p[1] : p[0])).filter(Boolean);
  const btn = (act, icon, label, on) => `<button class="btn ${on ? 'on' : ''}" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const pad = Math.max(f.w, f.d)*.1;
  return `<section><div class="fhead"><div class="fthumb"><svg viewBox="${-f.w/2-pad} ${-f.d/2-pad} ${f.w+2*pad} ${f.d+2*pad}">${f.flip ? `<g transform="scale(-1 1)">${furnSVG(f.type,f.w,f.d,f.color)}</g>` : furnSVG(f.type,f.w,f.d,f.color)}</svg></div>
      <div><b>${esc(nm(f.name))}</b><small>${f.w} × ${f.d} mm · ${yen(priceOf(f))}</small>${f.locked ? `<span class="tag">${ico('lock')}${tr('已锁定','Locked')}</span>` : ''}</div></div>
    <h3>${tr('家具属性','Furniture')}</h3>
    ${isOutside(f) ? `<div class="alert">${ico('warn')}<span>${tr('这件家具在户型外','This item is outside the plan')}</span><button class="btn" data-act="rescueOne">${tr('移回','Bring back')}</button></div>` : ''}
    ${clashWith.length ? `<div class="alert">${ico('warn')}<span>${tr('与以下家具重叠：','Overlaps: ')}${clashWith.map(g => esc(nm(g.name))).join('、')}</span></div>` : ''}
    <div class="form">
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <label>${tr('宽','Width')} (mm)<input type="number" id="fW" value="${f.w}" min="50" step="10" ${lk}></label>
      <label>${tr('深','Depth')} (mm)<input type="number" id="fD" value="${f.d}" min="50" step="10" ${lk}></label>
      <label>${tr('中心','Center')} X (mm)<input type="number" id="fX" value="${Math.round(f.cx)}" step="10" ${lk}></label>
      <label>${tr('中心','Center')} Y (mm)<input type="number" id="fY" value="${Math.round(f.cy)}" step="10" ${lk}></label>
      <label>${tr('旋转','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15" ${lk}></label>
      <label>${tr('单价','Unit price')} (¥)<input type="number" id="fP" value="${Math.round(priceOf(f))}" min="0" step="50"></label>
      ${custom ? `<label>${tr('高度','Height')} (mm)<input type="number" id="fH" value="${f.h || 800}" min="10" step="10"></label>` : ''}
      <label class="${custom ? '' : 'full'}">${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="swatches">${SWATCHES.map(c => `<button data-sw="${c}" class="${c === f.color ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div>
    <div class="muted desc">${tr('占地','Footprint')} ${fmt(f.w*f.d/1e6)} m² · ${tr('位于','In')} ${r ? esc(nm(state.rooms[r.id].name)) : isOutside(f) ? tr('户型外','outside') : tr('墙边 / 门口','wall / doorway')}</div>
    ${window.FurnishDesignUI?.placementPanel(f)||''}
    <div class="iconrow">
      ${btn('rotL', 'rotL', tr('逆时针 90°（Shift+R）','Rotate left (Shift+R)'))}${btn('rotR', 'rotR', tr('顺时针 90°（R）','Rotate right (R)'))}
      ${btn('flip', 'flip', tr('左右镜像（H）','Mirror (H)'), f.flip)}${btn('lock', f.locked ? 'lock' : 'unlock', tr('锁定 / 解锁（L）','Lock / unlock (L)'), f.locked)}
      ${btn('front', 'front', tr('置于顶层','Bring to front'))}${btn('toBack', 'back', tr('置于底层','Send to back'))}
    </div>
    <div class="actions">
      <button class="btn" data-act="dup">${ico('copy')}${tr('复制','Duplicate')}</button>
      <button class="btn" id="full-product-details">完整家具资料</button><button class="btn" id="replace-furniture">查找并替换</button><button class="btn" data-act="resetItem">${ico('reset')}${tr('恢复默认','Reset item')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn danger" data-act="del">${ico('trash')}${tr('删除','Delete')}</button>
      <button class="btn" data-act="home">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted small">${tr('拖动家具移动（会对齐其他家具并显示参考线）；拖上方圆点旋转、右下角方块改尺寸；Shift+点击可多选，右键查看更多操作。', 'Drag to move (snaps to other items with guides); drag the top dot to rotate, the corner square to resize; Shift+click to multi-select, right-click for more.')}</section>`;
}
function bindFurnPanel(f){
  window.FurnishDesignUI?.bindPlacement(f);$('#full-product-details').onclick=()=>FurnishWorkspace.open('products');
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  const num = (id, fn) => { const el = $(id); if (el) el.onchange = e => {const v=Number(e.target.value);try{if(!e.target.value.trim()||!Number.isFinite(v))throw Error('请输入有效数字');if(['#fW','#fD','#fH','#fX','#fY','#fR'].includes(id)&&getF(f.id).locked)throw Error('家具已锁定，请先解锁');upd(g=>fn(g,v));}catch(error){toast(error.message);renderPanel();}}; };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fW', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{w:Math.round(v)})));
  num('#fD', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{d:Math.round(v)})));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = norm(v));
  num('#fP', (g,v) => g.price = Math.max(0, Math.round(v)));
  num('#fH', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{h:Math.round(v)})));
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  document.querySelectorAll('#panel [data-sw]').forEach(b => b.onclick = () => upd(g => g.color = b.dataset.sw));
}
function multiPanel(items){
  const [x0,y0,x1,y1] = groupBox(items), btn = (act, icon, label) => `<button class="btn" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const lockedAll = items.every(f => f.locked), cost = items.reduce((a, f) => a + priceOf(f), 0);
  return `<section><h3>${tr(`已选 ${items.length} 件家具`, `${items.length} items selected`)}</h3>
    <div class="stats"><div><small>${tr('整体尺寸','Group size')}</small><span class="big mid">${Math.round(x1-x0)} × ${Math.round(y1-y0)}</span></div>
      <div><small>${tr('参考价合计','Reference total')}</small><span class="big mid">${yen(cost)}</span></div></div>
    ${window.FurnishDesignUI?.groupPlacementPanel(items)||''}
    <div class="lbl">${tr('对齐','Align')}</div>
    <div class="iconrow">${btn('al','al',tr('左对齐','Align left'))}${btn('ac','ac',tr('水平居中','Align centers horizontally'))}${btn('ar','ar',tr('右对齐','Align right'))}${btn('at','at',tr('顶对齐','Align top'))}${btn('am','am',tr('垂直居中','Align middles'))}${btn('ab','ab',tr('底对齐','Align bottom'))}</div>
    <div class="lbl">${tr('分布 · 尺寸 · 变换','Distribute · size · transform')}</div>
    <div class="iconrow">${btn('dh','dh',tr('水平等距分布','Distribute horizontally'))}${btn('dv','dv',tr('垂直等距分布','Distribute vertically'))}${btn('match','size',tr('统一为主选中项的尺寸','Match size of the primary item'))}${btn('rotL','rotL',tr('整组逆时针 90°','Rotate group left'))}${btn('rotR','rotR',tr('整组顺时针 90°','Rotate group right'))}${btn('flip','flip',tr('镜像','Mirror'))}</div>
    <div class="actions">
      <button class="btn" data-act="lock">${ico(lockedAll ? 'unlock' : 'lock')}${lockedAll ? tr('解锁','Unlock') : tr('锁定','Lock')}</button>
      <button class="btn" data-act="dup">${ico('copy')}${tr('复制','Duplicate')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn danger" data-act="del">${ico('trash')}${tr('删除','Delete')}</button>
      <button class="btn" data-act="home">${tr('取消选择','Deselect')}</button></div></section>
  <section><h3>${tr('选中项','Selection')}</h3>
    ${items.map(f => `<div class="irow ${f.id === ui.sel.id ? 'on' : ''}" data-focus="${f.id}"><span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${f.locked ? ico('lock') + ' ' : ''}${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small></div>`).join('')}
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
  return `<section><h3>${isDoor ? tr('平开门','Swing Door') : tr('推拉门','Sliding Door')}</h3>
    <div class="stats">
      <div><small>${tr('名称','Name')}</small><span class="val">${esc(nm(d.name || (isDoor ? '门' : '推拉门')))}</span></div>
      <div><small>${tr('洞口宽','Opening width')}</small><span class="big">${w}</span> mm</div></div>
    ${isDoor ? `<div class="actions">
      <button class="btn" id="oFlip">${tr('换开启方向','Flip swing')}</button>
      <button class="btn" id="oHinge">${tr('换铰链侧','Swap hinge')}</button>
      <button class="btn" id="oReset">${tr('重置','Reset')}</button></div>
    <div class="muted desc">${tr('调整会同步到 3D 场景与漫游碰撞，随方案自动保存，可撤销。','Changes sync to 3D and walk collision; autosaved and undoable.')}</div>` : ''}
    <div class="actions"><button class="btn" id="oback">${tr('← 返回总览','← Back')}</button></div></section>`;
}
function bindOpeningPanel(sel){
  const upd = fn => mutate(() => { state.open.d = state.open.d || {}; fn(state.open.d); });
  if (sel.kind === 'door'){
    $('#oFlip').onclick = () => upd(o => { const d = DOORS[sel.id];
      const [x0,y0,x1,y1] = d.rect, h = [...d.h];
      // Switching inward/outward also moves the hinge to the opposite wall face.
      const normal = Math.abs(d.c[0]) > .5 ? 1 : 0;
      h[normal] = normal === 1 ? y0+y1-h[1] : x0+x1-h[0];
      o[sel.id] = {h, c:[...d.c], o:[-d.o[0], -d.o[1]]}; });
    $('#oHinge').onclick = () => upd(o => { const d = DOORS[sel.id], [x0,y0,x1,y1] = d.rect;
      const long = (x1-x0) >= (y1-y0);
      const nh = long ? [d.h[0] === x0 ? x1 : x0, d.h[1]] : [d.h[0], d.h[1] === y0 ? y1 : y0];
      o[sel.id] = {h:nh, c:[-d.c[0], -d.c[1]], o:[...d.o]}; });
    $('#oReset').onclick = () => upd(o => { delete o[sel.id]; });
  }
  $('#oback').onclick = () => select(null);
}
function winPanel(i){
 const w=WINS[i],width=Math.round(Math.max(w.rect[2]-w.rect[0],w.rect[3]-w.rect[1])),height=Math.round(((w.head??2.4)-w.sill)*1000);
 return `<section><h3>窗尺寸</h3><p>窗宽 ${width} mm · 窗高 ${height} mm</p><div class="form"><label class="full">窗台高 mm<input type="number" id="wSill" min="0" max="2400" step="1" value="${Math.round(w.sill*1000)}"></label><label class="full">窗高 mm<input type="number" id="wHeight" min="100" max="2800" step="1" value="${height}"></label></div><p>${w.bayGroup?'同一飘窗的三面窗与窗台高度同步调整。':''}内置布局窗宽按预设图纸定义；导入自定义户型可编辑窗宽。</p><p id="wError" role="alert"></p><div class="actions"><button class="btn primary" id="wApply">应用尺寸</button><button class="btn" id="wReset">重置</button><button class="btn" id="wback">返回总览</button></div></section>`;
}
function bindWinPanel(i){
 $('#wApply').onclick=()=>{const sill=Number($('#wSill').value)/1000,height=Number($('#wHeight').value)/1000;if(!Number.isFinite(sill)||!Number.isFinite(height)||sill<0||sill>2.4||height<.1||sill+height>2.8){$('#wError').textContent='窗高至少100 mm，窗顶不得超过2800 mm';return;}mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)state.open.w[j]={sill,head:sill+height};});});};
 $('#wReset').onclick=()=>mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)delete state.open.w[j];});});$('#wback').onclick=()=>select(null);
}
