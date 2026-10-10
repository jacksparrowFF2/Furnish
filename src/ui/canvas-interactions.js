/* Classic script: declarations only; initialize once after app state and DOM exist. */
/* ======================= 视图 ======================= */
// 滚轮 / 平移 / 双指缩放每帧可能触发多次事件，合并到下一帧只刷新一次
let viewRaf = 0;
let stageEl;
function queueView(){ if (!viewRaf) viewRaf = requestAnimationFrame(() => { viewRaf = 0; applyView(); }); }
function applyView(){
  if (viewRaf){ cancelAnimationFrame(viewRaf); viewRaf = 0; }
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const ratio = 1/(view.s*PX_MM);
  $('#ratio').textContent = $('#hudRatio').textContent = '1:' + Math.round(ratio);
  const nice = [100,200,500,1000,2000,5000].find(v => v*view.s >= 60) || 5000;
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = nice >= 1000 ? `${nice/1000} m` : `${nice} mm`;
  // 画布点阵与平面坐标对齐（1 m 一点，过密 / 过疏时按 2 倍调整），平移缩放时一起移动
  let gs = 1000*view.s; while (gs < 16) gs *= 2; while (gs > 64) gs /= 2;
  const off = v => (((-v*view.s) % gs) + gs) % gs + 'px';
  stageEl.style.setProperty('--gs', gs + 'px'); stageEl.style.setProperty('--gx', off(view.x0)); stageEl.style.setProperty('--gy', off(view.y0));
  renderSel(); renderMeasure();
}
function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  view.s = Math.min(W/BOUNDS.w, H/BOUNDS.h);
  view.x0 = BOUNDS.x - (W/view.s - BOUNDS.w)/2; view.y0 = BOUNDS.y - (H/view.s - BOUNDS.h)/2;
  applyView();
}
function zoomAt(ns, mx, my){
  ns = Math.max(.012, Math.min(2, ns));
  const px = view.x0 + mx/view.s, py = view.y0 + my/view.s;
  view.s = ns; view.x0 = px - mx/ns; view.y0 = py - my/ns; queueView();
}
const zoomCenter = k => zoomAt(view.s*k, svg.clientWidth/2, svg.clientHeight/2);
const setRatio = r => zoomAt(1/(r*PX_MM), svg.clientWidth/2, svg.clientHeight/2);

function toMM(e){
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* ======================= 吸附适配 ======================= */
function snapMove(f,cx,cy,skip){
  const result=FurnishSnapping.move(f,cx,cy,{grid:ui.grid,scale:view.s,
    wallSnap:ui.layers.wallSnap,guides:ui.layers.guides,
    rects:ui.layers.wallSnap?snapRects():[],furniture:state.furniture,skip});
  ui.guides=result.guides;return result.position;
}
function snapPoint(p,shift){
  return FurnishSnapping.point(p,{scale:view.s,rects:snapRects(),anchor:shift?ui.mA:null});
}

/* ======================= 指针交互 ======================= */
let drag = null, pinch = null;
let cxEl, cyEl, hoverEl;
let hoverRoom = '';
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const touches = new Map();                     // 当前按在平面图上的手指
const svgXY = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function pinchInfo(){
  const [a, b] = [...touches.values()];
  return {d:Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c:svgXY((a.x+b.x)/2, (a.y+b.y)/2)};
}
// 结束当前拖动：移动过的家具记入撤销栈
let lpT = 0, spaceDown = false;
function endDrag(cancel){
  clearTimeout(lpT);
  const d = drag; drag = null; svg.classList.remove('panning');
  if (!d) return;
  if (d.kind === 'measure'){
    if (cancel){ ui.mA = ui.mCur = null; renderMeasure(); return; }
    if (d.moved && ui.mA && ui.mCur && Math.hypot(ui.mCur.x-ui.mA.x, ui.mCur.y-ui.mA.y) > 20){
      const a = ui.mA, b = ui.mCur; ui.mA = ui.mCur = null; mutate(() => state.measures.push({a, b}));
    }
    renderMeasure(); return;                   // 没拖动：保留起点，等第二次点击
  }
  if (d.kind === 'marq'){
    const m = ui.marq; ui.marq = null;
    if (cancel || !d.moved || !m){ if (!cancel && !d.add) select(null); else renderSel(); return; }
    const x0 = Math.min(m[0].x, m[1].x), x1 = Math.max(m[0].x, m[1].x), y0 = Math.min(m[0].y, m[1].y), y1 = Math.max(m[0].y, m[1].y);
    const hit = ui.layers.furn ? state.furniture.filter(f => { const {hw, hh} = aabb(f); return f.cx+hw > x0 && f.cx-hw < x1 && f.cy+hh > y0 && f.cy-hh < y1; }).map(f => f.id) : [];
    selectIds(d.add ? [...d.base, ...hit] : hit);
    return;
  }
  if (d.kind === 'pan'){
    if (!cancel && !d.moved && !d.quiet && ui.tool !== 'measure') select(d.room ? {kind:'room', id:d.room} : (d.keep ? ui.sel : null));
    return;
  }
  if (d.kind === 'locked') return;
  if (cancel && d.before){ state=JSON.parse(d.before); store.work[PLAN.id]=state; ui.guides=null; renderAll(); return; }
  if (d.kind === 'note'){ if (d.moved){ commit(d.before); renderAll(); } return; }
  if (d.moved){
    if (d.kind !== 'move' || d.ids.length === 1){   // 单件拖完自动推离墙体（与新增家具同一规则）；整组移动保持队形
      const f = getF(d.id);
      if (f){ const ox = f.cx, oy = f.cy; pushOut(f); if (Math.hypot(f.cx-ox, f.cy-oy) > 60) toast(tr('已自动避开墙体', 'Moved off the wall automatically')); }
    }
    commit(d.before); renderAll();
  }
}
// 触屏长按：弹出与右键相同的操作菜单
function startLongPress(e){
  clearTimeout(lpT);
  const x = e.clientX, y = e.clientY, target = e.target;
  lpT = setTimeout(() => { if (drag && !drag.moved && !pinch){ drag = null; navigator.vibrate?.(12); openCtx(x, y, target); } }, 550);
}

function initializeCanvasInteractions(){
  stageEl=$('#stage');cxEl=$('#cx');cyEl=$('#cy');hoverEl=$('#hover');
svg.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  closeCtx(); closeDrawers(); document.querySelectorAll('details.menu').forEach(m => m.open = false);
  if (e.pointerType !== 'mouse'){
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    svg.setPointerCapture(e.pointerId);
    if (touches.size >= 2){                    // 第二根手指落下：取消单指操作，进入双指缩放 / 平移
      clearTimeout(lpT);
      endDrag(drag?.kind === 'measure' || drag?.kind === 'pan' || drag?.kind === 'marq');
      const {d, c} = pinchInfo();
      pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s};
      return;
    }
  }
  if (pinch) return;
  const p = toMM(e), t = e.target, base = {sx:e.clientX, sy:e.clientY, moved:false};
  // 中键或按住空格：任何工具下都直接平移画面
  if (e.button === 1 || spaceDown){ e.preventDefault(); drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, quiet:true}; svg.setPointerCapture(e.pointerId); return; }
  if (ui.tool === 'measure'){
    const q = snapPoint(p, e.shiftKey);
    if (!ui.mA){ ui.mA = q; ui.mCur = q; drag = {kind:'measure', ...base}; svg.setPointerCapture(e.pointerId); }
    else { const a = ui.mA; ui.mA = null; ui.mCur = null; if (Math.hypot(q.x-a.x, q.y-a.y) > 20) mutate(() => state.measures.push({a, b:q})); }
    renderMeasure(); return;
  }
  if (ui.tool === 'note'){                     // 标注工具：点已有标注编辑，点空白处新建
    const ne = t.closest('[data-note]');
    if (ne){ select({kind:'note', id:ne.dataset.note}); openNoteEditor(getNote(ne.dataset.note)); }
    else openNoteEditor(null, p);
    return;
  }
  const h = t.closest('[data-handle]'), fEl = ui.layers.furn && t.closest('[data-fid]'), picking = ui.tool === 'select' || ui.tool === 'marquee';
  const nEl = ui.layers.notes && t.closest('[data-note]');
  if (h && selIds().length === 1){
    const f=getF(selIds()[0]);
    drag = {kind:f.locked?'locked':h.dataset.handle, id:f.id, original:{...f}, ...base, before:snap()};
  } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
    toggleWall(t.closest('[data-wall]').dataset.wall); return;
  } else if (picking && nEl){
    const n = getNote(nEl.dataset.note); select({kind:'note', id:n.id});
    drag = {kind:'note', id:n.id, ...base, ox:p.x-n.x, oy:p.y-n.y, before:snap()};
  } else if (picking && fEl){
    const id = fEl.dataset.fid;
    if (e.shiftKey || e.metaKey || e.ctrlKey){ toggleSel(id); return; }       // 修饰键 + 点击：加入 / 移出选择
    if (!selIds().includes(id)) selectIds([id]); else if (ui.sel.id !== id) selectIds(selIds(), id);
    const items = selItems(), f = getF(id);
    drag = items.some(g => g.locked) ? {kind:'locked', ...base}
      : {kind:'move', id, ids:items.map(g => g.id), start:Object.fromEntries(items.map(g => [g.id, [g.cx, g.cy]])), ...base, ox:p.x-f.cx, oy:p.y-f.cy, before:snap()};
    if (e.pointerType !== 'mouse') startLongPress(e);
  } else if (ui.tool === 'select' && t.closest('[data-door],[data-slide],[data-win]')){
    const de = t.closest('[data-door]'), se = t.closest('[data-slide]'), we = t.closest('[data-win]');
    select(de ? {kind:'door', id:+de.dataset.door} : se ? {kind:'slide', id:+se.dataset.slide} : {kind:'win', id:+we.dataset.win});
    drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, keep:true};   // 选中后仍可直接拖动画布
  } else if (ui.tool === 'select' && t.closest('[data-wall]')){
    const id=t.closest('[data-wall]').dataset.wall,ref=PLAN.wallRefs?.[Number(id.slice(1))];const wallIds=ref?(e.shiftKey&&ui.sel?.kind==='wall'?[...new Set([...(ui.sel.wallIds||[]),ref])]:[ref]):[];select({kind:'wall',id,wallIds}); return;
  } else if (ui.tool === 'marquee' || (ui.tool === 'select' && e.shiftKey && e.pointerType === 'mouse')){
    drag = {kind:'marq', ...base, a:p, add:e.shiftKey, base:selIds()};
  } else {
    const room = t.closest('[data-room]');
    drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, room:room && room.dataset.room};
    if (e.pointerType !== 'mouse') startLongPress(e);
  }
  svg.setPointerCapture(e.pointerId);
});

svg.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pinch){
    if (touches.size < 2) return;
    const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
    view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; queueView();
    return;
  }
  const p = toMM(e);
  ui.ptr = p;
  setText(cxEl, Math.round(p.x) + ' mm'); setText(cyEl, Math.round(p.y) + ' mm');
  if (!drag){
    const room = e.target.closest?.('[data-room]')?.dataset.room || '';
    if (room !== hoverRoom){
      hoverRoom = room;
      hoverEl.innerHTML = room ? `<b>${esc(nm(state.rooms[room].name))}</b> ${fmt(area(ROOMS.find(r => r.id === room).poly))} m²` : '';
    }
    if (ui.tool === 'measure' && ui.mA){ ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); }
    return;
  }
  const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
  if (far) clearTimeout(lpT);
  if (drag.kind === 'measure'){
    if (far) drag.moved = true;
    ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); return;
  }
  if (drag.kind === 'pan'){
    if (!drag.moved && !far) return;
    drag.moved = true; svg.classList.add('panning');
    view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; queueView(); return;
  }
  if (drag.kind === 'marq'){
    if (!drag.moved && !far) return;
    drag.moved = true; ui.marq = [drag.a, p]; renderSel(); return;
  }
  if (drag.kind === 'note'){
    if (!drag.moved && !far) return;
    const n = getNote(drag.id); if (!n) return;
    drag.moved = true; n.x = Math.round((p.x - drag.ox)/ui.grid)*ui.grid; n.y = Math.round((p.y - drag.oy)/ui.grid)*ui.grid;
    renderNotes(); renderSel(); return;
  }
  if (drag.kind === 'locked'){
    if (far && !drag.warned){ drag.warned = true; toast(tr('已锁定的家具不能移动（L 或面板中解锁）', 'Locked items cannot be moved (press L or unlock in the panel)')); }
    return;
  }
  const f = getF(drag.id); if (!f) return;
  if (!drag.moved && !far) return;             // 轻点家具不应让它抖动一下
  drag.moved = true;
  if (drag.kind === 'move'){
    // 以按住的那件为基准吸附，整组按同一位移移动；限制在画布范围内，防止拖丢
    const b = BOUNDS, [sx, sy] = snapMove(f, p.x-drag.ox, p.y-drag.oy, new Set(drag.ids));
    const dx = Math.max(b.x, Math.min(b.x + b.w, sx)) - drag.start[f.id][0], dy = Math.max(b.y, Math.min(b.y + b.h, sy)) - drag.start[f.id][1];
    // 拖动中只更新被拖家具的位姿，不重建全部家具
    drag.ids.forEach(id => { const g = getF(id); if (!g) return;
      g.cx = drag.start[id][0] + dx; g.cy = drag.start[id][1] + dy;
      document.querySelector(`#gFurn [data-fid="${id}"]`)?.setAttribute('transform', furnT(g)); });
    renderSel(); return;
  }
  if (drag.kind === 'rot'){
    let a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
    f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
  } else if (drag.kind === 'size'){
    const result=FurnishSnapping.resize(drag.original,p,{scale:view.s,wallSnap:ui.layers.wallSnap,rects:ui.layers.wallSnap?snapRects():[]});
    Object.assign(f,result.furniture);ui.guides=result.guides;
    renderFurn();                              // 尺寸变了，图例需要重画
  }
  document.querySelector(`#gFurn [data-fid="${f.id}"]`)?.setAttribute('transform', furnT(f));
  renderSel();
});

function onPointerEnd(e){
  touches.delete(e.pointerId);
  if (pinch){ if (touches.size < 2) pinch = null; return; }   // 双指结束后，剩下的手指不再触发操作
  endDrag(e.type === 'pointercancel');
}
svg.addEventListener('pointerup', onPointerEnd);
svg.addEventListener('pointercancel', onPointerEnd);
svg.addEventListener('pointerleave', () => { if (!drag) ui.ptr = null; });
// 阻止 iPad Safari 把双指手势当成整页缩放
['gesturestart','gesturechange','gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

svg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(view.s*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .0015)), e.clientX-r.left, e.clientY-r.top);
}, {passive:false});
svg.addEventListener('dblclick', e => {
  const ne = e.target.closest('[data-note]');
  if (ui.tool === 'select' && ne) openNoteEditor(getNote(ne.dataset.note));
  else if (ui.tool === 'select' && e.target.closest('[data-fid]')) rotateSel(90);
});
svg.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (ui.tool === 'measure'){ ui.mA = null; renderMeasure(); return; }
  if (drag?.moved) return;
  openCtx(e.clientX, e.clientY, e.target);
});
}
