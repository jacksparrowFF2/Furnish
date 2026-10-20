/* Classic script: declarations only; initialize once after app state and DOM exist. */
/* ======================= 视图 ======================= */
// 滚轮 / 平移 / 双指缩放每帧可能触发多次事件，合并到下一帧只刷新一次
let viewRaf = 0;
let stageEl;
const drawingRotation=()=>globalThis.FurnishDrawing?FurnishDrawing.settings(state.drawing).rotation:0;
function drawingPoint(p,inverse=false){return globalThis.FurnishDrawing?FurnishDrawing.rotate(p,(inverse?-1:1)*drawingRotation()):p;}
function drawingCenter(){const p=drawingPoint([view.x0+svg.clientWidth/2/view.s,view.y0+svg.clientHeight/2/view.s],true);return {x:p[0],y:p[1]};}
function displayBounds(){return globalThis.FurnishDrawing?FurnishDrawing.bounds(FurnishDrawing.drawingBounds(FurnishProject.effectivePlan(PLAN,state),state.drawing),drawingRotation()):BOUNDS;}
function syncDrawingTransform(){const rotation=drawingRotation();for(const g of svg.children)if(g.tagName.toLowerCase()==='g'&&g.id!=='gCompass')g.setAttribute('transform',`rotate(${rotation})`);window.FurnishDrawingUI?.syncCompass();}
function queueView(){ if (!viewRaf) viewRaf = requestAnimationFrame(() => { viewRaf = 0; applyView(); }); }
function applyView(){
  if (viewRaf){ cancelAnimationFrame(viewRaf); viewRaf = 0; }
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  syncDrawingTransform();
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
  window.FurnishRoomMeasure?.afterRender();
  window.FurnishTilePresetUI?.afterView();
  if(globalThis.FurnishDrawing)renderDims();
  if(globalThis.FurnishDrawing)refreshFurnitureLabels();
  refreshHobOpenings();
  if(ui.sel?.kind==='wall')window.FurnishWorkflowTools?.redrawDistances();
}
function fitView(){
  const inset=globalThis.FurnishWorkflowTools?80:0;
  const W = Math.max(100,svg.clientWidth-inset), H = svg.clientHeight,b=displayBounds();
  view.s = Math.min(W/b.w, H/b.h);
  view.x0 = b.x - (W/view.s - b.w)/2-inset/view.s; view.y0 = b.y - (H/view.s - b.h)/2;
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
  const point=pt.matrixTransform(svg.getScreenCTM().inverse()),p=drawingPoint([point.x,point.y],true);point.x=p[0];point.y=p[1];return point;
}

/* ======================= 吸附适配 ======================= */
function snapMove(f,cx,cy,skip,disabled=false,axis,anchor){
  const finishPlan=state.wallFinishes?FurnishProject.effectivePlan(PLAN,state):null,vertical=finishPlan?FurnishDesign.furnitureVerticalBounds(f,finishPlan,state.furniture):null;
  const result=FurnishSnapping.move(f,cx,cy,{finishFaces:finishPlan?FurnishWallFinish.snapFaces(finishPlan,vertical):[],grid:ui.grid,scale:view.s,
    wallSnap:ui.layers.wallSnap,guides:ui.layers.guides,
    rects:ui.layers.wallSnap?snapRects():[],furniture:ui.layers.furn?state.furniture:[],skip,
    moving:skip?state.furniture.filter(o=>skip.has(o.id)):[f],disabled,axis,anchor});
  ui.guides=result.guides;return result.position;
}
function snapPoint(p,shift){
  const result=FurnishSnapping.measurePoint(p,{scale:view.s,...measurementScene(),anchor:shift?ui.mA:null});
  ui.mSnap=result.edge?{point:result.point,edge:result.edge,kind:result.kind}:null;return result.point;
}
function measurementScene(){const rects=snapRects();return {plan:FurnishProject.effectivePlan(PLAN,state),rects,solidWallCount:rects.length-WINS.length,furniture:ui.layers.furn?state.furniture:[]};}
function directionalMeasurements(f=selItems()){return FurnishSnapping.directional(f,{...measurementScene(),rotation:drawingRotation()});}
function editKitchenDivider(key,side='left'){
 const items=selItems();if(items.length!==1)return;const f=items[0],K=FurnishKitchen;if(furnitureLocked(f)||!f.kitchen)return;
 const h=K.dividerHandles(f).find(h=>h.key===key);if(!h)return;
 const before=snap(),planId=PLAN.id,hostId=f.id,total=h.leftWidth+h.rightWidth,modules=K.cabinetLayout(f),sides=side==='right'?['right','left']:['left','right'];let active=sides[0];
 const label=side=>{const m=modules.find(m=>m.index===h[side]);return m.index<f.kitchen.modules.length?tr(`模块 ${m.index+1} · ${K.moduleRoles(f)[m.role]}`,`Module ${m.index+1} · ${m.role}`):tr(`${K.runName(f,m.run)}末端薄柜`,'Thin end cabinet');};
 const proposal=()=>{const input=$('#kitchen-divider-'+active);if(!input.value.trim())throw Error(tr('请输入柜宽','Enter a cabinet width'));const width=Number(input.value);if(!Number.isFinite(width))throw Error(tr('柜宽须为有效数值','Enter a valid cabinet width'));return K.resizeDivider(f,key,(width-h[active+'Width'])*(active==='left'?1:-1),{furniture:state.furniture});};
 const apply=()=>{try{if(PLAN.id!==planId||snap()!==before)throw Error(tr('方案已变化，请重新打开柜宽输入','The design changed; reopen the width editor'));const next=proposal();if(JSON.stringify(next)!==JSON.stringify(getF(hostId)))mutate(()=>Object.assign(getF(hostId),next));return true;}catch(e){$('#kitchen-divider-error').textContent=e.message;return false;}};
 openDialog({title:tr('调整相邻柜宽','Adjust adjacent cabinet widths'),body:`<p><b>${esc(K.runName(f,h.run))}</b> · ${tr('两柜总宽','Combined width')} ${Math.round(total*1e6)/1e6} mm</p><div class="form">${sides.map(side=>`<label class="full">${esc(label(side))} · mm<input id="kitchen-divider-${side}" type="number" step="any" value="${h[side+'Width']}" inputmode="decimal" aria-describedby="kitchen-divider-help kitchen-divider-error"></label>`).join('')}</div><p id="kitchen-divider-help" class="muted">${tr('修改任意一柜，另一柜自动补差。整排总长、柜深及其他柜体尺寸和位置保持不变。','Edit either width; the other adjusts automatically. Run length, depths and all other cabinets stay fixed.')}</p><p id="kitchen-divider-error" class="project-error" role="alert"></p>`,actions:[{label:tr('取消','Cancel')},{label:tr('应用柜宽','Apply widths'),cls:'primary',fn:apply}],onOpen:()=>{for(const side of sides){const input=$('#kitchen-divider-'+side);input.oninput=()=>{active=side;const other=$('#kitchen-divider-'+(side==='left'?'right':'left'));other.value=input.value.trim()?String(Math.round((total-Number(input.value))*1e6)/1e6):'';try{proposal();$('#kitchen-divider-error').textContent='';}catch(e){$('#kitchen-divider-error').textContent=e.message;}};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(apply())closeDialog();}};}$('#kitchen-divider-'+sides[0]).select();}});
}
function editKitchenGap(key){
 const items=selItems();if(items.length!==1)return;const f=items[0];if(furnitureLocked(f))return;
 const row=FurnishSnapping.kitchenGaps(f,{furniture:state.furniture,scale:view.s}).find(r=>r.key===key);if(!row)return;
 const before=snap(),planId=PLAN.id,scale=view.s,hostId=f.id,K=FurnishKitchen,target=row.kind==='run'?'末端常规柜宽':K.outerEdge(f,f.flip?(key.endsWith('left')?'right':key.endsWith('right')?'left':key.split(':')[1]):key.split(':')[1]).kind==='depth'?'这一排柜深':'末端常规柜宽';
 const apply=()=>{try{if(PLAN.id!==planId||snap()!==before)throw Error('方案已变化，请重新打开间距输入');const input=$('#kitchen-gap-input');if(!input.value.trim())throw Error('请输入预留间距');const next=FurnishSnapping.setKitchenGap(getF(hostId),key,row.reference.id,Number(input.value),{furniture:state.furniture,scale});if(JSON.stringify(next)!==JSON.stringify(getF(hostId)))mutate(()=>Object.assign(getF(hostId),next));return true;}catch(e){$('#kitchen-gap-error').textContent=e.message;return false;}};
 openDialog({title:'厨房边界预留间距',body:`<p><b>${esc(K.runName(f,row.run))}${row.kind==='outer'?'外边':'末端边'}</b> → ${esc(row.reference.name||'参考家具')}</p><label>预留间距 mm<input id="kitchen-gap-input" type="number" min="0" max="20000" step="any" value="${Math.max(0,row.gap)}"></label><p class="muted">只调整${target}，固定对侧和内侧；中间模块宽度、其他排柜深和薄柜尺寸保持，参考家具固定。输入 0 可贴边。</p><p id="kitchen-gap-error" class="project-error" role="alert"></p>`,actions:[{label:'取消'},{label:'应用间距',cls:'primary',fn:apply}],onOpen:()=>{const input=$('#kitchen-gap-input');input.select();input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(apply())closeDialog();}};}});
}
function editDirectionalDistance(direction){
  const items=selItems(),ids=items.map(f=>f.id),current=items.length&&directionalMeasurements(items)[direction];if(!current)return;
  const plan=FurnishProject.effectivePlan(PLAN,state),options={rotation:drawingRotation(),visibleFurniture:ui.layers.furn};
  try{FurnishDesign.placeSelectionAtDirectionalGap(plan,state,ids,direction,current.distance,options);}catch(e){toast(e.message);return;}
  const before=snap(),planId=PLAN.id,labels={l:tr('左侧','Left'),r:tr('右侧','Right'),t:tr('上方','Up'),b:tr('下方','Down')},target=measurementReferenceName(current);
  const apply=()=>{try{
    if(PLAN.id!==planId||snap()!==before||drawingRotation()!==options.rotation||ui.layers.furn!==options.visibleFurniture)throw Error(tr('方案已变化，请关闭后重新选择距离','The design changed; close and select the distance again'));
    const input=$('#directional-gap-input');if(!input.value.trim())throw Error(tr('请输入目标净距','Enter a target clearance'));
    const moved=FurnishDesign.placeSelectionAtDirectionalGap(plan,state,ids,direction,Number(input.value),options);
    if(moved.some(next=>Math.hypot(next.cx-getF(next.id).cx,next.cy-getF(next.id).cy)>1e-7))mutate(()=>moved.forEach(next=>Object.assign(getF(next.id),{cx:next.cx,cy:next.cy})));
    return true;
  }catch(e){$('#directional-gap-error').textContent=e.message;return false;}};
  const name=items.length===1?nm(items[0].name):tr(`整组 ${items.length} 件`,`${items.length} selected items`);
  openDialog({title:tr('编辑四向净距','Edit directional clearance'),body:`<p><b>${esc(name)}</b> · ${labels[direction]} → ${esc(target)}</p><label>${tr('目标净距 (mm)','Target clearance (mm)')}<input id="directional-gap-input" type="number" min="0" max="20000" step="any" value="${Math.round(current.distance*1000)/1000}"></label><p class="muted">${tr('固定参考实体，所有选中成员沿此方向移动相同距离，保持相对位置。输入 0 可贴边；保存的测量线保持原位置。','Keeps the reference fixed and translates all selected items equally, preserving relative positions. Use 0 for contact. Saved measurements stay fixed.')}</p><p id="directional-gap-error" class="project-error" role="alert"></p>`,actions:[{label:tr('取消','Cancel')},{label:tr('应用距离','Apply distance'),cls:'primary',fn:apply}],onOpen:()=>{const input=$('#directional-gap-input');input.select();input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(apply())closeDialog();}};}});
}
function saveDirectionalMeasurements(direction){
  const items=selItems();if(!items.length)return;
  const distances=directionalMeasurements(items),rows=(direction?[distances[direction]]:Object.values(distances)).filter(m=>m&&m.distance>=1).map(m=>({a:{...m.a},b:{...m.b}}));if(!rows.length)return;
  if(state.measures.length+rows.length>2000)return toast(tr('测量线最多 2000 条','Maximum 2000 measurements'));
  mutate(()=>state.measures.push(...rows));
  toast(tr('已保存固定端点测量线，移动物体后请重新测量','Fixed endpoints saved; remeasure after moving objects'));
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
let canvasPointerFrame=0,canvasPointerEvent=null;
function flushCanvasPointer(cancel=false){
  if(canvasPointerFrame)cancelAnimationFrame(canvasPointerFrame);
  canvasPointerFrame=0;
  const event=canvasPointerEvent;canvasPointerEvent=null;
  if(event&&!cancel)processCanvasPointerMove(event);
}
function endDrag(cancel){
  flushCanvasPointer(cancel);
  clearTimeout(lpT);
  const d = drag; drag = null; svg.classList.remove('panning');
  if(typeof queueFabPosition==='function')queueFabPosition();
  syncTuckedSeatPreview();
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
    if(!cancel&&!d.moved&&d.addRoom){toggleRoom(d.addRoom);return;}
    if (!cancel && !d.moved && !d.quiet && ui.tool !== 'measure') select(d.room ? {kind:'room', id:d.room} : (d.keep ? ui.sel : null));
    return;
  }
  if(d.shiftTap&&!d.moved&&!cancel){toggleSel(d.shiftTap);return;}
  if (d.kind === 'locked') return;
  if (cancel && d.before){ state=JSON.parse(d.before); store.work[PLAN.id]=state; ui.guides=null; renderAll(); return; }
  if (d.kind === 'note'){ if (d.moved){ try{commit(d.before,true);}catch(error){toast(error.message);} renderAll(); } return; }
  if(d.kind==='kitchen-divider'&&!d.moved){ui.guides=null;editKitchenDivider(d.divider);return;}
  if((['kitchen-run','kitchen-extension','kitchen-divider'].includes(d.kind)||d.kind==='size'&&(d.edge||d.resizeError))&&snap()===d.before){ui.guides=null;renderAll();if(d.resizeError)toast(d.resizeError);return;}
  if (d.moved){
    if (!['kitchen-run','kitchen-extension','kitchen-divider'].includes(d.kind)&&!d.edge&&(d.kind !== 'move' || d.ids.length === 1)){   // 独立厨房边保留锚点；普通单件拖完继续推离墙体
      const f = getF(d.id);
      if (f){ const ox = f.cx, oy = f.cy; pushOut(f,d.kind==='move'?d.axis:undefined); if (Math.hypot(f.cx-ox, f.cy-oy) > 60) toast(tr('已自动避开墙体', 'Moved off the wall automatically')); }
    }
    try{commit(d.before,true);}catch(error){toast(error.message);} renderAll();
    if(['size','kitchen-run','kitchen-extension','kitchen-divider'].includes(d.kind)&&d.resizeError)toast(d.resizeError);
  }
}
// 触屏长按：弹出与右键相同的操作菜单
function startLongPress(e){
  clearTimeout(lpT);
  const x = e.clientX, y = e.clientY, target = e.target;
  lpT = setTimeout(() => { if (drag && !drag.moved && !pinch){ drag = null; navigator.vibrate?.(12); openCtx(x, y, target); } }, 550);
}

function processCanvasPointerMove(e){
  if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pinch){
    if (touches.size < 2) return;
    const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
    view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; queueView();
    return;
  }
  if(drag?.kind==='move')drag.pointer={clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId,shiftKey:e.shiftKey,altKey:e.altKey};
  const p = toMM(e);
  ui.ptr = p;
  setText(cxEl, Math.round(p.x) + ' mm'); setText(cyEl, Math.round(p.y) + ' mm');
  if (!drag){
    const room = e.target.closest?.('[data-room]')?.dataset.room || '';
    if (room !== hoverRoom){
      hoverRoom = room;
      hoverEl.innerHTML = room ? `<b>${esc(nm(state.rooms[room].name))}</b> ${fmt(area(ROOMS.find(r => r.id === room).poly))} m²` : '';
    }
    if (ui.tool === 'measure'){ const q=snapPoint(p,e.shiftKey);if(ui.mA)ui.mCur=q;renderMeasure(); }
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
    if(far)delete drag.shiftTap;
    if (far && !drag.warned){ drag.warned = true; toast(tr('已锁定的家具不能移动（L 或面板中解锁）', 'Locked items cannot be moved (press L or unlock in the panel)')); }
    return;
  }
  const f = getF(drag.id); if (!f) return;
  if (!drag.moved && !far) return;             // 轻点家具不应让它抖动一下
  drag.moved = true;
  if (drag.kind === 'move'){
    const start=drag.start[f.id],anchor={x:start[0],y:start[1]},x=p.x-drag.ox,y=p.y-drag.oy;
    if(!e.shiftKey)delete drag.axis;
    else if(!drag.axis)drag.axis=Math.abs(x-anchor.x)>=Math.abs(y-anchor.y)?'x':'y';
    // 以按住的那件为基准吸附，整组按同一位移移动；限制在画布范围内，防止拖丢
    const b = BOUNDS, [sx, sy] = snapMove(f,x,y,new Set(drag.ids),e.altKey,drag.axis,anchor);
    const dx = drag.axis==='y'?0:Math.max(b.x, Math.min(b.x + b.w, sx)) - start[0], dy = drag.axis==='x'?0:Math.max(b.y, Math.min(b.y + b.h, sy)) - start[1];
    // 拖动中只更新被拖家具的位姿，不重建全部家具
    drag.ids.forEach(id => { const g = getF(id); if (!g) return;
      g.cx = drag.start[id][0] + dx; g.cy = drag.start[id][1] + dy;
      document.querySelector(`#gFurn [data-fid="${id}"]`)?.setAttribute('transform', furnT(g)); });
    syncFurnOrder();
    renderSel(); return;
  }
  if (drag.kind === 'rot'){
    let a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
    f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
  } else if(drag.kind==='kitchen-divider'){
    try{const result=FurnishSnapping.resizeKitchenDivider(drag.original,drag.divider,p,{start:drag.startPoint,grid:ui.grid,scale:view.s,wallSnap:ui.layers.wallSnap,guides:!!ui.layers.guides,rects:ui.layers.wallSnap?snapRects():[],furniture:state.furniture});Object.assign(f,result.furniture);ui.guides=result.guides;delete drag.resizeError;}catch(e){drag.resizeError=e.message;ui.guides=null;return;}
    renderFurn();
  } else if(drag.kind==='kitchen-extension'){
    try{const result=FurnishSnapping.resizeKitchenExtension(drag.original,drag.run,drag.field,p,{start:drag.startPoint,grid:ui.grid,scale:view.s,wallSnap:ui.layers.wallSnap,guides:!!ui.layers.guides,rects:ui.layers.wallSnap?snapRects():[],furniture:state.furniture});Object.assign(f,result.furniture);ui.guides=result.guides;delete drag.resizeError;}catch(e){drag.resizeError=e.message;ui.guides=null;return;}
    renderFurn();
  } else if(drag.kind==='kitchen-run'){
    try{
      const result=FurnishSnapping.resizeKitchenRun(drag.original,drag.run,p,{start:drag.startPoint,grid:ui.grid,scale:view.s,wallSnap:ui.layers.wallSnap,guides:!!ui.layers.guides,rects:ui.layers.wallSnap?snapRects():[],furniture:state.furniture});
      Object.assign(f,result.furniture);ui.guides=result.guides;delete drag.resizeError;
    }catch(e){drag.resizeError=e.message;ui.guides=null;return;}
    renderFurn();
  } else if (drag.kind === 'size'){
    if(drag.edge){
      try{const result=FurnishSnapping.resizeKitchenOuter(drag.original,drag.edge,p,{start:drag.startPoint,grid:ui.grid,scale:view.s,wallSnap:ui.layers.wallSnap,guides:!!ui.layers.guides,rects:ui.layers.wallSnap?snapRects():[],furniture:state.furniture});Object.assign(f,result.furniture);ui.guides=result.guides;delete drag.resizeError;}catch(e){drag.resizeError=e.message;ui.guides=null;return;}
      renderFurn();syncFurnOrder();renderSel();return;
    }
    // Use pointer travel from the grab position, excluding the handle's padding.
    const o=drag.original,a=o.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const dx=p.x-drag.startPoint.x,dy=p.y-drag.startPoint.y;
    const dw=drag.axis==='d'?0:dx*c+dy*s,dd=drag.axis==='w'?0:-dx*s+dy*c;
    const corner={x:o.cx+o.w/2*c-o.d/2*s+dw*c-dd*s,y:o.cy+o.w/2*s+o.d/2*c+dw*s+dd*c};
    const result=FurnishSnapping.resize(o,corner,{axis:drag.axis,scale:view.s,wallSnap:ui.layers.wallSnap,rects:ui.layers.wallSnap?snapRects():[]});
    try{const next=FurnishDesign.resizeFurniture(drag.original,{w:result.furniture.w,d:result.furniture.d},'center');Object.assign(f,next,{cx:result.furniture.cx,cy:result.furniture.cy});ui.guides=result.guides;delete drag.resizeError;}catch(e){drag.resizeError=e.message;ui.guides=null;return;}
    renderFurn();                              // 尺寸变了，图例需要重画
  }
  document.querySelector(`#gFurn [data-fid="${f.id}"]`)?.setAttribute('transform', furnT(f));
  syncFurnOrder();
  renderSel();
}

function initializeCanvasInteractions(){
  stageEl=$('#stage');cxEl=$('#cx');cyEl=$('#cy');hoverEl=$('#hover');
svg.addEventListener('keydown',e=>{const target=e.target.closest('[data-kitchen-gap],[data-distance-edit],[data-kitchen-divider],[data-kitchen-divider-width]');if(ui.tool==='select'&&target&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(target.dataset.kitchenDividerWidth)editKitchenDivider(target.dataset.kitchenDividerKey,target.dataset.kitchenDividerWidth);else if(target.dataset.kitchenDivider)editKitchenDivider(target.dataset.kitchenDivider);else if(target.dataset.kitchenGap)editKitchenGap(target.dataset.kitchenGap);else editDirectionalDistance(target.dataset.distanceEdit);}});
svg.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  closeCtx(); closeDrawers(); document.querySelectorAll('details.menu').forEach(m => m.open = false);
  if (e.pointerType !== 'mouse'){
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    svg.setPointerCapture(e.pointerId);
    if (touches.size >= 2){                    // 第二根手指落下：取消单指操作，进入双指缩放 / 平移
      clearTimeout(lpT);
      flushCanvasPointer(); // Decide commit/cancel using the latest single-touch move.
      endDrag(drag?.kind === 'measure' || drag?.kind === 'pan' || drag?.kind === 'marq' || drag?.kind==='kitchen-divider'&&!drag.moved);
      const {d, c} = pinchInfo();
      pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s};
      return;
    }
  }
  if (pinch) return;
  const p = toMM(e), t = e.target, base = {sx:e.clientX, sy:e.clientY, moved:false};
  // 中键或按住空格：任何工具下都直接平移画面
  if (e.button === 1 || spaceDown){ e.preventDefault(); drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, quiet:true}; svg.setPointerCapture(e.pointerId); return; }
  const dividerWidth=t.closest('[data-kitchen-divider-width]');if(dividerWidth&&ui.tool==='select'&&e.button===0){e.preventDefault();editKitchenDivider(dividerWidth.dataset.kitchenDividerKey,dividerWidth.dataset.kitchenDividerWidth);return;}
  const kitchenGap=t.closest('[data-kitchen-gap]');if(kitchenGap&&ui.tool==='select'&&e.button===0){e.preventDefault();editKitchenGap(kitchenGap.dataset.kitchenGap);return;}
  const distanceEdit=t.closest('[data-distance-edit]');
  if(distanceEdit&&ui.tool==='select'&&e.button===0){e.preventDefault();editDirectionalDistance(distanceEdit.dataset.distanceEdit);return;}
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
  const nEl = ui.layers.notes && t.closest('[data-note]'),mEl=t.closest('[data-measure]');
  if (picking && mEl){select({kind:'measure',id:Number(mEl.dataset.measure)});return;}
  if (h && selIds().length === 1){
    if(h.dataset.handle==='kitchen-divider')h.focus?.({preventScroll:true});
    const f=getF(selIds()[0]);
    drag = {kind:furnitureLocked(f)?'locked':h.dataset.handle, axis:h.dataset.axis||'both', edge:h.dataset.kitchenEdge, run:Number(h.dataset.kitchenRun), field:h.dataset.kitchenExtension, divider:h.dataset.kitchenDivider, startPoint:{x:p.x,y:p.y}, id:f.id, original:{...f}, ...base, before:snap()};
  } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
    toggleWall(t.closest('[data-wall]').dataset.wall); return;
  } else if (picking && nEl){
    const n = getNote(nEl.dataset.note); select({kind:'note', id:n.id});
    drag = {kind:'note', id:n.id, ...base, ox:p.x-n.x, oy:p.y-n.y, before:snap()};
  } else if (picking && fEl){
    const id = fEl.dataset.fid;
    if (e.metaKey || e.ctrlKey || e.shiftKey&&!selIds().includes(id)){ toggleSel(id); return; }
    if (!selIds().includes(id)) selectIds([id]); else if (ui.sel.id !== id) selectIds(selIds(), id);
    const items = selItems(), f = getF(id);
    drag = items.some(g => furnitureLocked(g)) ? {kind:'locked', ...base}
      : {kind:'move', id, ids:items.map(g => g.id), start:Object.fromEntries(items.map(g => [g.id, [g.cx, g.cy]])), ...base, ox:p.x-f.cx, oy:p.y-f.cy, before:snap()};
    if(e.shiftKey)drag.shiftTap=id; // Shift-click still toggles; a drag locks an axis.
    if (e.pointerType !== 'mouse') startLongPress(e);
  } else if (ui.tool === 'select' && t.closest('[data-door],[data-slide],[data-win]')){
    const de = t.closest('[data-door]'), se = t.closest('[data-slide]'), we = t.closest('[data-win]');
    select(de ? {kind:'door', id:+de.dataset.door} : se ? {kind:'slide', id:+se.dataset.slide} : {kind:'win', id:+we.dataset.win});
    drag = {kind:'pan', ...base, x0:view.x0, y0:view.y0, keep:true};   // 选中后仍可直接拖动画布
  } else if (ui.tool === 'select' && t.closest('[data-wall]')){
    const id=t.closest('[data-wall]').dataset.wall,ref=PLAN.wallRefs?.[Number(id.slice(1))];const wallIds=ref?(e.shiftKey&&ui.sel?.kind==='wall'?[...new Set([...(ui.sel.wallIds||[]),ref])]:[ref]):[];select({kind:'wall',id,wallIds}); return;
  } else if(ui.tool==='select'&&e.shiftKey&&t.closest('[data-room]')){
    drag={kind:'pan',...base,x0:view.x0,y0:view.y0,addRoom:t.closest('[data-room]').dataset.room};
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
  if(drag&&['move','rot','size','kitchen-run','kitchen-extension','kitchen-divider','note'].includes(drag.kind)&&!pinch){
    canvasPointerEvent=e;
    if(!canvasPointerFrame)canvasPointerFrame=requestAnimationFrame(()=>flushCanvasPointer());
    return;
  }
  processCanvasPointerMove(e);
});
function onPointerEnd(e){
  touches.delete(e.pointerId);
  if (pinch){ if (touches.size < 2) pinch = null; return; }   // 双指结束后，剩下的手指不再触发操作
  // A release can carry a newer position than the last pointermove.
  if(e.type==='pointerup'&&drag?.kind==='measure')processCanvasPointerMove(e);
  if(e.type==='pointerup'&&drag?.kind==='move'&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)){
    flushCanvasPointer(true);processCanvasPointerMove(e);
  }
  endDrag(e.type === 'pointercancel');
}
svg.addEventListener('pointerup', onPointerEnd);
svg.addEventListener('pointercancel', onPointerEnd);
svg.addEventListener('pointerleave', () => { if (!drag) ui.ptr = null; });
// Recompute at the last raw pointer position when a movement modifier changes.
for(const type of ['keydown','keyup'])document.addEventListener(type,e=>{
  if(!['Alt','Shift'].includes(e.key)||drag?.kind!=='move'||pinch)return;
  const pointer=canvasPointerEvent||drag.pointer;if(!pointer)return;
  e.preventDefault();
  const at={clientX:pointer.clientX,clientY:pointer.clientY,pointerId:pointer.pointerId,shiftKey:e.key==='Shift'?type==='keydown':e.shiftKey,altKey:e.key==='Alt'?type==='keydown':e.altKey,target:svg};
  flushCanvasPointer(true);processCanvasPointerMove(at);
});
// 阻止 iPad Safari 把双指手势当成整页缩放
['gesturestart','gesturechange','gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

svg.addEventListener('wheel', e => {
  e.preventDefault();
  if(drag||pinch)return;
  const action=FurnishNavigation.wheel(e);
  if(action.kind==='pan'){view.x0+=action.x/view.s;view.y0+=action.y/view.s;queueView();return;}
  const r = svg.getBoundingClientRect();
  zoomAt(view.s*action.factor, e.clientX-r.left, e.clientY-r.top);
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
