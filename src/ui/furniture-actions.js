/* Classic script: editor actions share live state, history and render helpers
 * with app.js. Declarations only; load before app.js initialization. */
/* ======================= 选择（支持多选） ======================= */
// ui.sel = {kind:'furn', id:主选中, ids:[全部选中]}；单选时 ids 可省略
const selIds = () => ui.sel?.kind === 'furn' ? (ui.sel.ids || [ui.sel.id]) : [];
const selItems = () => selIds().map(getF).filter(Boolean);
function select(sel){ ui.sel = sel; closeCtx(); renderSel(); renderPanel(); updateHeader(); }
function selectIds(ids, primary){
  ids = [...new Set(ids)].filter(id => getF(id));
  select(ids.length ? {kind:'furn', id:ids.includes(primary) ? primary : ids[ids.length-1], ids} : null);
}
function toggleSel(id){ const ids = selIds(); selectIds(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); }
function selectAll(){ selectIds(state.furniture.map(f => f.id)); }
// 锁定的家具不参与移动 / 旋转 / 删除等操作
function movable(items){
  const n = items.filter(f => f.locked).length;
  if (n) toast(tr(`${n} 件家具已锁定，未作修改（L 解锁）`, `${n} locked item(s) left unchanged (L to unlock)`));
  return items.filter(f => !f.locked);
}

/* ======================= 编辑操作 ======================= */
function rotateSel(d){
  const items = movable(selItems()); if (!items.length) return;
  mutate(() => {
    if (items.length === 1){ items[0].rot = norm(items[0].rot + d); return; }
    // 多选：整组绕外包盒中心旋转
    const [x0,y0,x1,y1] = groupBox(items), cx = (x0+x1)/2, cy = (y0+y1)/2, a = d*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
    items.forEach(f => { const dx = f.cx-cx, dy = f.cy-cy; f.cx = Math.round(cx + dx*c - dy*s); f.cy = Math.round(cy + dx*s + dy*c); f.rot = norm(f.rot + d); });
  });
}
function deleteSel(){
  if (ui.sel?.kind === 'note') return deleteNote(ui.sel.id);
  const all = selItems(); if (!all.length) return;
  const items = movable(all); if (!items.length) return;
  const ids = new Set(items.map(f => f.id));
  ui.sel = null; mutate(() => state.furniture = state.furniture.filter(f => !ids.has(f.id)));
  toast(items.length === 1 ? tr(`已删除「${nm(items[0].name)}」`, `Deleted "${nm(items[0].name)}"`) : tr(`已删除 ${items.length} 件家具`, `Deleted ${items.length} items`),
    {label:tr('撤销', 'Undo'), fn:undo});
}
function flipSel(){ const items = movable(selItems()); if (items.length) mutate(() => items.forEach(f => { if (f.flip) delete f.flip; else f.flip = true; })); }
function lockSel(){
  const items = selItems(); if (!items.length) return;
  const lock = !items.every(f => f.locked);
  mutate(() => items.forEach(f => { if (lock) f.locked = true; else delete f.locked; }));
  toast(lock ? tr('已锁定：不会被误拖动或删除', 'Locked: protected from moves and deletes') : tr('已解锁', 'Unlocked'));
}
function orderSel(top){
  const ids = new Set(selIds()); if (!ids.size) return;
  mutate(() => { const a = state.furniture.filter(f => ids.has(f.id)), b = state.furniture.filter(f => !ids.has(f.id)); state.furniture = top ? [...b, ...a] : [...a, ...b]; });
}
// 恢复库中默认尺寸与颜色（自定义家具按「我的家具」中的定义）
function resetItemSel(){
  const items=movable(selItems());if(!items.length)return;
  let values;try{values=items.map(f=>{const it=libItem(f);return it?{f,value:{...FurnishDesign.resizeFurniture(f,{w:it[2],d:it[3],...(it[6]!==undefined?{h:it[6]}:{})}),color:it[4]}}:null;}).filter(Boolean);}catch(e){return toast(e.message);}
  if(!values.length)return toast(tr('找不到明确的原始规格，请在家具资料中手动编辑。','Original specifications unavailable; edit the product manually.'));
  mutate(()=>values.forEach(({f,value})=>{Object.assign(f,value);delete f.flip;delete f.price;}));
  toast(tr('已恢复默认尺寸、颜色与参考价格'+(values.length<items.length?'；来源不明确的家具已跳过。':''),'Default specifications restored; unresolved sources skipped.'));
}
// 对齐 / 分布 / 等尺寸（多选）：以外包盒为准，锁定的家具作为参照不动
function alignSel(mode){
  const all = selItems(); if (all.length < 2) return toast(tr('请先选择至少 2 件家具', 'Select at least 2 items first'));
  const items = movable(all), [x0,y0,x1,y1] = groupBox(all);
  mutate(() => items.forEach(f => { const {hw, hh} = aabb(f);
    if (mode === 'l') f.cx = x0 + hw; if (mode === 'r') f.cx = x1 - hw; if (mode === 'c') f.cx = (x0+x1)/2;
    if (mode === 't') f.cy = y0 + hh; if (mode === 'b') f.cy = y1 - hh; if (mode === 'm') f.cy = (y0+y1)/2;
    f.cx = Math.round(f.cx); f.cy = Math.round(f.cy); }));
}
function distributeSel(axis){
  const all = selItems(); if (all.length < 3) return toast(tr('等距分布需要至少 3 件家具', 'Distribute needs at least 3 items'));
  const h = axis === 'h', key = f => h ? f.cx - aabb(f).hw : f.cy - aabb(f).hh, size = f => h ? 2*aabb(f).hw : 2*aabb(f).hh;
  const items = [...all].sort((a, b) => key(a) - key(b)), first = items[0], last = items[items.length-1];
  const gap = (key(last) + size(last) - key(first) - items.reduce((a, f) => a + size(f), 0)) / (items.length - 1);
  if (items.some(f => f.locked)) return toast(tr('含锁定家具，无法分布', 'Cannot distribute locked items'));
  mutate(() => { let p = key(first);
    items.forEach(f => { const s = size(f); if (h) f.cx = Math.round(p + s/2); else f.cy = Math.round(p + s/2); p += s + gap; }); });
}
function matchSizeSel(){
  const main = getF(ui.sel?.id), items = movable(selItems()).filter(f => f !== main);
  if (!main || !items.length) return;
  let values;try{values=items.map(f=>FurnishDesign.resizeFurniture(f,{w:main.w,d:main.d}));}catch(e){return toast(e.message);}
  mutate(() => items.forEach((f,i) => Object.assign(f,values[i])));
  toast(tr(`已统一为 ${main.w} × ${main.d}`, `Matched to ${main.w} × ${main.d}`));
}
// 剪贴板：复制时记录相对整组中心的位置，粘贴到指针处（或在原位置偏移）
let clip = null;
function syncCutClipboard(){if(clip?.cut&&clip.movePlan===PLAN.id)clip.cutMoved=clip.items.some(f=>getF(f.id));}
function copySel(cut, quiet){
  const selected=selItems(),items=cut?selected.filter(f=>!f.locked):selected;if(!items.length){if(cut)movable(selected);return;}
  const [x0,y0,x1,y1] = groupBox(items);
  clip = {cx:(x0+x1)/2, cy:(y0+y1)/2, items:JSON.parse(JSON.stringify(items)),cut:!!cut};
  if (cut) deleteSel(); else if (!quiet) toast(tr(`已复制 ${items.length} 件 · Ctrl+V 粘贴`, `Copied ${items.length} · Ctrl+V to paste`));
}
function paste(at){
  if (!clip) return toast(tr('剪贴板为空：先选中家具按 Ctrl+C', 'Clipboard is empty — select items and press Ctrl+C'));
  const step=(clip.pastes||0)+1,p=at||{x:clip.cx+300*step,y:clip.cy+300*step};
  let result;try{result=FurnishDesign.pasteFurniture(clip,p,BOUNDS,uid,2000-state.furniture.length,state.furniture.map(f=>f.id));}catch(e){return toast(e.message);}
  const news=result.items;
  mutate(() => state.furniture.push(...news));
  if(clip.cut)clip.cutMoved=true;if(result.moved)clip.movePlan=PLAN.id;
  if(!at)clip.pastes=step;
  selectIds(news.map(f => f.id));
  const pasted=result.moved?tr('已移动家具，保留原编号和采购进度。','Furniture moved; identity and purchase progress retained.'):tr('已添加家具副本，采购状态为待选型。','Copies added with planned purchase status.');
  if(result.oversized)toast(pasted+' '+tr('整组尺寸超出户型范围，已保留相对位置；请缩小尺寸或拆分布置。','The group exceeds plan bounds; its layout was preserved. Resize or split the group.'));
  else if(result.adjusted)toast(pasted+' '+tr('已将整组移入户型范围，保留相对位置；请核对墙体和房间边界。','Group moved within plan bounds without changing its layout; check walls and room boundaries.'));
  else toast(pasted);
}
function duplicateSel(){ if (!selIds().length) return; const keep = clip; copySel(false, true); paste(); clip = keep; }
function zoomToBox([x0,y0,x1,y1], pad = 700){
  if (is3D()) return;
  const W = svg.clientWidth, H = svg.clientHeight, w = x1-x0+2*pad, h = y1-y0+2*pad;
  view.s = Math.max(.012, Math.min(.4, Math.min(W/w, H/h)));
  view.x0 = (x0+x1)/2 - W/2/view.s; view.y0 = (y0+y1)/2 - H/2/view.s; applyView();
}
function zoomSel(){
  const items = selItems();
  if (items.length) return zoomToBox(groupBox(items));
  if (ui.sel?.kind === 'room') return zoomToBox(bbox(ROOMS.find(r => r.id === ui.sel.id).poly), 400);
  fitView();
}
function focusItem(id){
  const f = getF(id); if (!f) return;
  selectIds([id]);
  if (is3D()){ const r = roomAt(f.cx, f.cy); if (r) window.View3D.flyToRoom(r.id); }
  else zoomToBox(groupBox([f]), 1800);
}
// 把在户型外的家具移回：放到最大房间中央再推离墙体
function rescueOutside(ids){
  const lost = state.furniture.filter(f => (ids ? ids.includes(f.id) : true) && isOutside(f));
  if (!lost.length) return toast(tr('没有在户型外的家具', 'No furniture outside the plan'));
  const home = ROOMS.filter(r => r.counted !== false).sort((a, b) => area(b.poly) - area(a.poly))[0], [x0,y0,x1,y1] = bbox(home.poly);
  mutate(() => lost.forEach((f, i) => { f.cx = Math.round((x0+x1)/2 + (i % 4)*150); f.cy = Math.round((y0+y1)/2 + Math.floor(i/4)*150); pushOut(f); }));
  selectIds(lost.map(f => f.id));
  toast(tr(`已将 ${lost.length} 件家具移回「${nm(state.rooms[home.id].name)}」`, `Moved ${lost.length} item(s) back into "${nm(state.rooms[home.id].name)}"`));
}

// 放下 / 拖完的家具若压在墙 / 窗上，沿位移最小的方向推出，刚好贴墙。
// 只在家具中心原本所在的房间内推移，推不开（如家具比房间还大）就保持原位——宁可压墙，也不能被推到墙外「消失」
function pushOut(f){
  const ox = f.cx, oy = f.cy, home = roomAt(ox, oy);
  const okAt = (x, y) => home ? inPoly(x, y, home.poly) : !!roomAt(x, y);
  for (let n = 0; n < 6; n++){
    const {hw, hh} = aabb(f);
    let worst = null, wa = 1;
    for (const r of snapRects()){
      const ix = Math.min(f.cx+hw, r[2]) - Math.max(f.cx-hw, r[0]), iy = Math.min(f.cy+hh, r[3]) - Math.max(f.cy-hh, r[1]);
      if (ix > 1 && iy > 1 && ix*iy > wa){ wa = ix*iy; worst = r; }
    }
    if (!worst) return true;
    const r = worst, best = [[r[0]-hw, f.cy], [r[2]+hw, f.cy], [f.cx, r[1]-hh], [f.cx, r[3]+hh]]
      .filter(([x, y]) => okAt(x, y))
      .sort((p, q) => Math.hypot(p[0]-f.cx, p[1]-f.cy) - Math.hypot(q[0]-f.cx, q[1]-f.cy))[0];
    if (!best) break;
    f.cx = Math.round(best[0]); f.cy = Math.round(best[1]);
  }
  if (Math.hypot(f.cx-ox, f.cy-oy) > Math.max(f.w, f.d)){ f.cx = ox; f.cy = oy; }   // 推得太远 = 不合理，撤回
  return false;
}
function addItem(it, x, y){
  if(state.furniture.length>=2000)return toast(tr('每个方案最多 2000 件家具。','Up to 2000 furniture items per design.'));
  const [type,name,w,d,color,price,h] = it, f = F(type,name,Math.round(x/10)*10,Math.round(y/10)*10,w,d,0,color);
  if (type === 'custom' || type === 'customround'){ f.price = price; f.h = h; }   // 自定义家具删除定义后仍保留单价与高度
  if(it[7]){const c=store.custom?.find(c=>c.id===it[7]);if(c)Object.assign(f,{catalogId:c.id,catalogSnapshot:FurnishDesign.catalogSnapshot(c),brand:c.brand||'',model:c.model||'',sourceUrl:c.sourceUrl||'',priceDate:c.priceDate||'',frontClearance:c.frontClearance??600,purchaseStatus:'planned',purchaseNote:c.purchaseNote||'',...(c.obj?{obj:JSON.parse(JSON.stringify(c.obj))}:{})});}
  pushOut(f);
  mutate(() => state.furniture.push(f));
  selectIds([f.id]);
  pushRecent(it);
  toast(tr(`已添加「${name}」${w}×${d}`, `Added "${nm(name)}" ${w}×${d}`), {label:tr('撤销', 'Undo'), fn:undo});
}
function toggleWall(id){
  if(state.architecture)return window.FurnishWorkspace.demolish(id);
  const w = WALLS[+id.slice(1)];
  if (w[4]==='b') return toast(tr('承重墙（黑色）不可拆除', 'Load-bearing walls (black) cannot be removed'));
  if (w[4]==='e') return toast(tr('外墙属于建筑外围护结构，不建议拆除', 'Exterior walls are part of the building envelope and should not be removed'));
  const on = state.demolished.includes(id);
  mutate(() => state.demolished = on ? state.demolished.filter(x => x!==id) : [...state.demolished, id]);
  toast(on ? tr('已恢复墙体', 'Wall restored') : tr(`已标记拆除 ${Math.max(w[2]-w[0], w[3]-w[1])} mm 墙体`, `Marked ${Math.max(w[2]-w[0], w[3]-w[1])} mm of wall for removal`));
}

function setTool(t){
  ui.tool = t; ui.mA = null; ui.mCur = null;
  svg.setAttribute('class', 'tool-' + t);
  document.querySelectorAll('#tools .btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  syncModeHint();
  renderMeasure();
}
function syncModeHint(){
  const hints = {select:'',
    marquee:COARSE ? tr('拖出矩形框选多件家具 · 点家具可直接拖动 · 点「选择」退出', 'Drag a box to select several items · drag an item to move it · tap "Select" to exit')
      : tr('拖出矩形框选家具 · Shift 追加 · 拖动已选家具可整组移动 · Esc 退出', 'Drag a box to select · Shift adds · drag a selected item to move the group · Esc exits'),
    measure:COARSE ? tr('按住拖出测量线，或依次点两点 · 靠近墙面自动吸附 · 点「选择」退出', 'Hold and drag a line, or tap two points · snaps to walls · tap "Select" to exit')
      : tr('点击两点（或按住拖动）测量距离 · 靠近墙面自动吸附 · Shift 锁定水平/垂直 · Esc 取消', 'Click two points (or drag) to measure · snaps to walls · Shift locks horizontal/vertical · Esc cancels'),
    note:tr('点击平面图任意位置添加文字标注 · 点已有标注可编辑 · 选择工具下可拖动', 'Click anywhere on the plan to add a note · click a note to edit it · drag notes with the Select tool'),
    demolish:tr('点击灰色非承重墙标记拆除，再次点击恢复 · 黑色承重墙不可拆', 'Click a grey non-bearing wall to remove it, click again to restore · black bearing walls cannot be removed')};
  const h = $('#modehint'); h.textContent = hints[ui.tool]; h.classList.toggle('show', !!hints[ui.tool]);
}
