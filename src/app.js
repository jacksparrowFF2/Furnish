/* ======================= 多语言（中文 / English，默认中文） ======================= */
const LANG_KEY = 'huxing-lang';
const LANGS = ['zh', 'zht', 'en'];             // 简体 / 繁體（台湾用字）/ English
let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'zh'; } catch(e) { return 'zh'; } })();
const NAMES_EN = FurnishI18n.namesEn;
const tr = (zh,en) => FurnishI18n.translate(LANG,zh,en);
const nm = text => FurnishI18n.name(LANG,text);
// 静态文案：元素上写 data-en / data-en-title，中文原文首次切换时存进 dataset
function applyStaticLang(){
  document.documentElement.lang = {zh:'zh-CN', zht:'zh-TW', en:'en'}[LANG];
  document.title = tr('户型装修设计', 'Floor Plan Designer');
  document.querySelectorAll('[data-en]').forEach(el => { el.dataset.zh ??= el.textContent; el.textContent = tr(el.dataset.zh, el.dataset.en); });
  document.querySelectorAll('[data-en-title]').forEach(el => { el.dataset.zhTitle ??= el.title; el.title = tr(el.dataset.zhTitle, el.dataset.enTitle); });
  document.querySelectorAll('[data-en-placeholder]').forEach(el => { el.dataset.zhPh ??= el.placeholder; el.placeholder = tr(el.dataset.zhPh, el.dataset.enPlaceholder); });
  document.querySelectorAll('#langSel [data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}

const PLANS = FurnishPlans;
let WALLS, WINS, DOORS, SLIDES, ROOMS, BOUNDS, PLAN;
function applyPlanData(){
  ({walls:WALLS, wins:WINS, doors:DOORS, slides:SLIDES, rooms:ROOMS, bounds:BOUNDS} = PLAN);
  DOORS.forEach(d => d._base ??= {h:[...d.h], c:[...d.c], o:[...d.o]});   // 切换户型时保留原始方向，不能把当前覆盖值当成原值
  WINS.forEach(w => { w._sill0 ??= w.sill; w._head0 ??= w.head??2.4; });ROOMS.filter(r=>r.counted===false).forEach(r=>r._height0??=r.height??.45);
}
// 门窗调整存于 state.open（可撤销/随方案保存），套用到 PLAN 数据的运行时副本上
function applyOpeningOverrides(){
  if (!state) return;                                                  // renderAll 前必然已初始化
  DOORS.forEach(d => { if (d._base) Object.assign(d, {h:[...d._base.h], c:[...d._base.c], o:[...d._base.o]}); });
  WINS.forEach(w => { if (w._sill0 !== undefined) {w.sill = w._sill0;w.head=w._head0;} });
  ROOMS.filter(r=>r.counted===false&&r._height0!==undefined).forEach(r=>r.height=r._height0);
  const o = state.open;
  if (!o) return;
  Object.entries(o.d || {}).forEach(([i, v]) => { const d = DOORS[+i]; if (d) Object.assign(d, JSON.parse(JSON.stringify(v))); });
  Object.entries(o.w || {}).forEach(([i, v]) => { const w = WINS[+i]; if (w) {if(typeof v==='number')w.sill=v;else if(v&&Number.isFinite(v.sill)&&Number.isFinite(v.head)){w.sill=v.sill;w.head=v.head;}if(w.bayGroup){const room=ROOMS.find(r=>r.id===w.bayGroup);if(room)room.height=w.sill;}} });
}
const {materials:MATS,library:LIB,typePrices:TYPE_PRICE} = FurnishCatalogData;
// 自定义家具保存在本机（store.custom），在家具库中显示为「我的家具」分类；条目多带 [6]=高度 mm、[7]=自定义 id
const CUSTOM_CAT = '我的家具';
const libAll = () => store.custom?.length
  ? [...LIB, {cat:CUSTOM_CAT, items:store.custom.map(c => [c.shape === 'round' ? 'customround' : 'custom', c.name, c.w, c.d, c.color, c.price, c.h, c.id])}]
  : LIB;
const typeColor = t => { for (const c of LIB) for (const i of c.items) if (i[0]===t) return i[4]; return '#d9d2c5'; };
const libItem = f => { if(['custom','customround'].includes(f.type)){const c=FurnishDesign.catalogSource(f,store.custom||[]);return c?[c.shape==='round'?'customround':'custom',c.name,c.w,c.d,c.color,c.price,c.h,c.id]:null;} for (const c of libAll()) for (const i of c.items) if (i[0] === f.type && i[1] === f.name) return i; return null; };
// 单价：家具上手动填写的优先，其次是同名库存条目，最后按类型估算
const priceOf = f => f.price ?? f.referencePrice ?? libItem(f)?.[5] ?? TYPE_PRICE[f.type] ?? 0;

let _n = 1;
const uid = () => 'f' + Date.now().toString(36) + (_n++);
// 文字标注配色：[底色, 字色]
const NOTE_COLORS = {accent:['#ef5a24','#fff'], teal:['#0e8f83','#fff'], ink:['#2a2622','#fff'], paper:['#fffaf0','#2a2622']};
const F = (type,name,cx,cy,w,d,rot=0,color) => ({id:uid(),type,name,cx,cy,w,d,rot,color:color||typeColor(type)});

/* ======================= 存储 v2：每个户型独立工作槽 + 多命名方案 ======================= */
const workRules = FurnishWork.create({
  makeId:uid, colorFor:typeColor, materials:MATS,
});
const {fresh:freshWork,restore:fixWork,restoreFurniture:sanitizeFurn}=workRules;
const STORE = 'huxing-design-v2';
let store = FurnishWorkspaceCache.load({read:key=>localStorage.getItem(key), firstPlan:PLANS[0], restore:fixWork, key:STORE});
// Validate and rebuild user plans; never trust serialized rendering geometry.
store.customPlans = (Array.isArray(store.customPlans) ? store.customPlans : []).filter(d => {
  try { const draft = store.work[d.id]?.architecture?.draft || d; const p = FurnishDraft.build(draft); if (p.id !== d.id || PLANS.some(q => q.id === p.id)) return false; PLANS.push(p); return true; }
  catch(e) { console.warn('Skipped invalid custom plan', e.message); return false; }
});
let customArchDraft = null, customArchPlanId = '';
function syncCustomArchitecture(){
  if (!state.architecture) return;
  if (state.architecture.draft === customArchDraft && PLAN.id === customArchPlanId) return;
  const p = FurnishDraft.build(state.architecture.draft);
  if (p.id !== PLAN.id) throw new Error('Custom plan identity mismatch');
  Object.assign(PLAN, p); applyPlanData();
  state.rooms = Object.fromEntries(p.rooms.map(r => [r.id, state.rooms[r.id] || {name:r.name, mat:r.mat}]));
  customArchDraft = state.architecture.draft; customArchPlanId = PLAN.id;
  renderOpenings(); renderDims(); window.View3D?.replan();
}
function registerCustomWork(work){
  if (!work.architecture) return;
  const p = FurnishDraft.build(work.architecture.draft);
  if (work.plan && work.plan !== p.id) throw new Error('Custom plan identity mismatch');
  work.architecture = FurnishProject.architecture({...work.architecture,draft:p.customDraft}); work.plan = p.id;
  if (!PLANS.some(q => q.id === p.id)) {
    PLANS.push(p); store.customPlans.push(p.customDraft);
  }
}

/* ======================= 主题（2D 画布调色板；外壳颜色见 CSS 变量） ======================= */
const PAL_LIGHT = {
  paper:'#f5f2ea', grid1:'#e6dfd2', grid2:'#d6ccba',
  wallB:'#26241f', wallE:'#8f897d', wallN:'#a7a195', wallLow:'#e9e3d8', wallLowLine:'#8f897d',
  sill:'#e2dacb', sillLine:'#b9b0a0', winFill:'#f7fbfd', winLine:'#4f7394',
  ink:'#3d3a34', text:'#4a443c', dim:'#7d7160', label:'#2b2824', labelSub:'#7d7366', halo:'#fbf9f4',
  demFill:'rgba(198,91,58,.12)', leaf:'#fff',
};
const PAL_DARK = {
  paper:'#121110', grid1:'#1f1c18', grid2:'#2b2722',
  wallB:'#e8e0d0', wallE:'#59534a', wallN:'#6d665b', wallLow:'#3d382f', wallLowLine:'#8f897d',
  sill:'#3d382f', sillLine:'#7a7264', winFill:'#2a3138', winLine:'#5b7d96',
  ink:'#cfc6b6', text:'#d8d0c0', dim:'#9b9183', label:'#efe8dc', labelSub:'#9b9183', halo:'#121110',
  demFill:'rgba(198,91,58,.2)', leaf:'#3a352d',
};
let PAL = PAL_LIGHT;

const PX_MM = 25.4 / 96;                       // 1 CSS px = 0.2646 mm
const COARSE = matchMedia('(pointer:coarse)').matches;   // iPad / 手机等触屏为主的设备
const TAP = COARSE ? 9 : 4;                    // 手指按下后移动超过该像素才算拖动
const narrow = () => matchMedia('(max-width:1100px)').matches;
const $ = s => document.querySelector(s);
const ico = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const svg = $('#plan');


/* ======================= 状态 / 历史 / 存储 ======================= */
PLAN = PLANS.find(p => p.id === store.planId) || PLANS[0];
applyPlanData();
let state = store.work[PLAN.id] || (store.work[PLAN.id] = freshWork(PLAN));
state.open = state.open || {};   // 旧版本存档补默认字段
const ui = {tool:'select', sel:null, mA:null, mCur:null, guides:null, marq:null, ptr:null, tab:'overview',
  layers:{dims:true, labels:true, furn:true, notes:true, grid:false, bearing:false, wallSnap:true, guides:true, clear:true, collide:true}, grid:10};
// 图层与编辑辅助设置跨会话记住
const UI_KEY = 'huxing-ui';
try { const u = JSON.parse(localStorage.getItem(UI_KEY)) || {};
  Object.keys(ui.layers).forEach(k => { if (typeof u.layers?.[k] === 'boolean') ui.layers[k] = u.layers[k]; });
  if ([1, 10, 50, 100].includes(u.grid)) ui.grid = u.grid;
  if (['overview', 'list', 'quote'].includes(u.tab)) ui.tab = u.tab;
} catch(e) {}
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({layers:ui.layers, grid:ui.grid, tab:ui.tab})); } catch(e) {} };
let view = {x0:0, y0:0, s:.06};
const undoStack = [], redoStack = [];

// 自动保存：存储空间不足时先清掉历史快照再试；仍失败则明确提示（以前静默失败，刷新后布置会「消失」）
let saveErr = false, savedAt = store.updatedAt||0, storageWiping = false, savePending=false;
const autosave = FurnishAutosave.create({
  writeCache: json => localStorage.setItem(STORE, json),
  dropHistoryCache: () => localStorage.removeItem('huxing-history'),
  writeStore: value => window.FurnishStorage.write(value),
  isCurrent: (value, version) => !storageWiping && store === value && store.updatedAt === version,
  onChange: status => { saveErr=status.error; savePending=status.pending; savedAt=status.savedAt; syncSaved(); },
  onFailure: () => toast(tr('自动保存失败，请立即导出项目文件备份。','Autosave failed; export a project file now.')),
});
function save(){
  if(storageWiping)return;
  store.updatedAt=Math.max(Date.now(),(store.updatedAt||0)+1);
  store.work[PLAN.id] = state;
  autosave.save(store);
}
function syncSaved(){
  const el = $('#saved'); if (!el || !savedAt) return;
  el.title=state.architecture?.phase==='survey'?tr('已保存录入数据，原始结构尚未确认锁定。','Survey saved; original structure is not confirmed.'):tr('已保存当前方案；原始基线由结构确认单独保护。','Design saved; original baseline is separately protected.');
  if(savePending)el.title=tr('正在写入本地项目存储。','Writing the local project save.');else if(saveErr)el.title=tr('自动保存未完成，请导出项目文件备份。','Autosave failed; export a project backup.');
  el.classList.toggle('err', saveErr&&!savePending);
  el.innerHTML = savePending ? tr('正在保存…','Saving…') : saveErr ? ico('warn') + tr('未保存', 'Not saved')
    : ico('check') + tr('已自动保存 ', 'Saved ') + new Date(savedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
const snap = () => JSON.stringify(state);
function commit(before){ undoStack.push(before); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; save(); snapshot(false,JSON.parse(before),'编辑前'); }
function mutate(fn){ const b = snap(); fn(); commit(b); renderAll(); }
function undo(){ if (!undoStack.length) return toast(tr('没有可撤销的操作', 'Nothing to undo')); redoStack.push(snap()); state = JSON.parse(undoStack.pop()); syncCutClipboard();validateSel(); save(); renderAll(); }
function redo(){ if (!redoStack.length) return; undoStack.push(snap()); state = JSON.parse(redoStack.pop()); syncCutClipboard();validateSel(); save(); renderAll(); }
function validateSel(){ if (ui.sel?.kind==='furn' && !getF(ui.sel.id)) ui.sel = null; }
const getF = id => state.furniture.find(f => f.id === id);

/* ======================= 几何工具 ======================= */
const {area,perim,bbox,aabb,inPoly,corners,obbOverlap,groupBox} = FurnishGeometry;
const fmt = (n, d=2) => n.toFixed(d);
const norm = a => ((Math.round(a) % 360) + 360) % 360;
const snapRects = () => WALLS.filter((w,i) => !state.demolished.includes('w'+i)).map(w => w.slice(0,4)).concat(WINS.map(w => w.rect));

/* ======================= 家具几何：房间归属 / 旋转矩形碰撞 ======================= */
const roomAt = (x, y) => ROOMS.find(r => inPoly(x, y, r.poly)) || null;
const wallBox = () => { const xs = WALLS.flatMap(w => [w[0], w[2]]), ys = WALLS.flatMap(w => [w[1], w[3]]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// 家具中心落在外墙外包盒之外 = 在户型外（通常看不到，清单里标出并可一键移回）
const isOutside = f => { const [x0,y0,x1,y1] = wallBox(); return f.cx < x0 || f.cx > x1 || f.cy < y0 || f.cy > y1; };
function collisions(){return FurnishGeometry.collisions(state.furniture);}

/* ======================= 颜色 / 材质图案 ======================= */
const shade = FurnishFurnitureSVG.shade;

function furnSVG(type,w,d,color){return FurnishFurnitureSVG.render(type,w,d,color,PAL);}

function updateHeader(){
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  $('#subtitle').textContent = tr(`套内使用面积约 ${fmt(tot)} m² · 尺寸单位 mm${PLAN.note ? ' · ' + PLAN.note : ''}`,
    `Net floor area ≈ ${fmt(tot)} m² · Units: mm${PLAN.noteEn ? ' · ' + PLAN.noteEn : ''}`);
  const stage=state.architecture?.phase==='survey'?'原始结构录入 · 未锁定':state.architecture?'装修设计 · 结构已锁定':'示例布局';
  const brand = document.querySelector('.brand b'), bz = `${nm(PLAN.name)} · ${stage}`, be = `${PLAN.en||PLAN.name} · ${state.architecture?.phase==='survey'?'Survey (unlocked)':'Design'}`;
  brand.dataset.zh = bz; brand.dataset.en = be; brand.textContent = brand.title = tr(bz, be);
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  const n = selIds().length;
  $('#selInfo').innerHTML = n ? `<b>${tr(`已选 ${n} 件`, `${n} selected`)}</b>` : '';
}

/* ======================= 界面文案转义 ======================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function clearLayout(){
  const n = state.furniture.length;
  if (!n) return toast(tr('当前没有布置任何家具', 'There is no furniture to clear'));
  openDialog({title:tr('清空布置','Clear layout'),body:`<p>${tr(`确定清空 ${n} 件家具／家电吗？会先保留恢复点，也可撤销。墙体、材料和测量线会保留。`,`Remove ${n} furniture/appliance items? A recovery point is saved first; you can also undo. Walls, materials and measurements are retained.`)}</p>`,actions:[{label:tr('取消','Cancel')},{label:tr('确认清空布置','Clear layout'),cls:'danger',fn:()=>{snapshot(true,state,'清空布置前');ui.sel=null;mutate(()=>state.furniture=[]);toast(tr('已清空布置','Layout cleared'),{label:tr('撤销','Undo'),fn:undo});return true;}}]});
}

/* 侧栏开合：which = 'lib' | 'panel' | null，open 不传则切换。
 * 宽屏：侧栏在布局中收起 / 展开（记住选择）；窄屏：侧栏是浮层抽屉，一次只开一个，which = null 表示全部关闭 */
const PANES = 'huxing-panes';
const panes = (() => { try { return JSON.parse(localStorage.getItem(PANES)) || {}; } catch(e) { return {}; } })();
function drawer(which, open){
  const app = $('.app'), els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  if (n){
    Object.entries(els).forEach(([k, el]) => el.classList.toggle('open', k === which && (open ?? !el.classList.contains('open'))));
  } else {
    Object.values(els).forEach(el => el.classList.remove('open'));
    if (which){
      const k = which === 'lib' ? 'hideLib' : 'hidePanel';
      panes[k] = open === undefined ? !panes[k] : !open;
      try { localStorage.setItem(PANES, JSON.stringify(panes)); } catch(e) {}
    }
  }
  app.classList.toggle('hide-lib', !!panes.hideLib); app.classList.toggle('hide-panel', !!panes.hidePanel);
  syncPaneBtns();
}
function syncPaneBtns(){
  const els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  const vis = k => n ? els[k].classList.contains('open') : !panes[k === 'lib' ? 'hideLib' : 'hidePanel'];
  $('#tgLib').classList.toggle('on', vis('lib')); $('#tgPanel').classList.toggle('on', vis('panel'));
  $('#tgLib').title = vis('lib') ? tr('收起家具库 ( [ )', 'Hide library ( [ )') : tr('展开家具库 ( [ )', 'Show library ( [ )');
  $('#tgPanel').title = vis('panel') ? tr('收起属性面板 ( ] )', 'Hide properties ( ] )') : tr('展开属性面板 ( ] )', 'Show properties ( ] )');
  $('#stage').classList.toggle('drawer-panel', n && vis('panel'));   // 属性抽屉盖住画面时让出底部工具条
}
function closeDrawers(){ if (narrow()) drawer(null); }

/* ======================= 风格方案：一键统一家具配色与地面 ======================= */
const STYLES = FurnishStylePresets;
function applyStyle(id){
  const style=FurnishStyles.find(id);if(!style)return;
  mutate(()=>FurnishStyles.apply(state,ROOMS,id,!!PLAN.customDraft));
  toast(tr(`已应用「${style.zh}」风格：家具配色与客厅 / 卧室地面已更新`,`Applied "${style.en}": furniture colors and living / bedroom floors updated`),{label:tr('撤销','Undo'),fn:undo});
}
const stylesHTML = () => `<div class="styles">${STYLES.map(s => `<button class="stcard ${state.style === s.id ? 'on' : ''}" data-style="${s.id}" title="${tr('应用风格', 'Apply style')}">
  <span class="stsw">${[s.soft, s.wood, s.textile, s.pop, MATS[s.floor[0]].sw].map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${tr(s.zh, s.en)}</b></button>`).join('')}</div>`;

/* ======================= 命令面板（Ctrl+K） ======================= */
let cmdItems = [], cmdSel = 0;
function cmdSource(){
  // 中英文名都参与搜索，与当前界面语言无关（中文界面下也能搜 "sofa"）
  const EN = s => NAMES_EN[s] ?? s;
  const A = (icon, zh, en, run, key = '') => ({g:tr('命令', 'Actions'), icon, zh, en, run, key});
  const items = [
    A('box', '切换 2D / 3D', 'Toggle 2D / 3D', () => setView(is3D() ? '2d' : '3d'), 'T'),
    A('grid', '打开户型库', 'Open floor plan gallery', openPlans),
    A('reset', '重置…', 'Reset…', openReset),
    A('kbd', '快捷键与操作', 'Shortcuts & controls', openHelp, '?'),
    A('plus', '新建自定义家具', 'New custom item', openCustom),
    A('fit', '适应窗口', 'Fit to window', fitView, 'F'),
    A('cursor', '全选家具', 'Select all furniture', selectAll, 'Ctrl A'),
    A('marquee', '框选工具', 'Box select tool', () => setTool('marquee'), 'B'),
    A('ruler', '测量工具', 'Measure tool', () => setTool('measure'), 'M'),
    A('wall', '拆改墙体', 'Demolish walls', () => setTool('demolish'), 'X'),
    A('note', '文字标注', 'Text note tool', () => setTool('note'), 'N'),
    A(curTheme() === 'dark' ? 'sun' : 'moon', curTheme() === 'dark' ? '切换为亮色主题' : '切换为暗色主题', curTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', () => setTheme(curTheme() === 'dark' ? 'light' : 'dark')),
    A('eye', ui.layers.furn ? '隐藏家具图层' : '显示家具图层', ui.layers.furn ? 'Hide furniture layer' : 'Show furniture layer', () => setLayer('furn', !ui.layers.furn)),
    A('warn', ui.layers.collide ? '关闭碰撞检查' : '开启碰撞检查', ui.layers.collide ? 'Turn off collision check' : 'Turn on collision check', () => setLayer('collide', !ui.layers.collide)),
    A('download', '导出图片', 'Export image', exportPNG), A('download', '导出报价清单 CSV', 'Export quote CSV', exportCSV),
    A('download', '导出方案 JSON', 'Export plan JSON', () => $('#exportJson').click()), A('file', '打印平面图', 'Print plan', () => window.print()),
    A('copy', '复制分享链接', 'Copy share link', () => $('#shareLink').click()), A('full', '全屏', 'Fullscreen', toggleFullscreen, 'Shift F'),
    A('trash', '清空布置', 'Clear layout', clearLayout),
  ];
  STYLES.forEach(s => items.push({g:tr('风格', 'Styles'), icon:'palette', zh:`应用风格：${s.zh}`, en:`Apply style: ${s.en}`, run:() => applyStyle(s.id)}));
  PLANS.forEach(p => items.push({g:tr('户型', 'Plans'), icon:'home', zh:`切换户型：${p.name}`, en:`Switch plan: ${p.en}`, run:() => setPlan(p.id), key:p.id === PLAN.id ? tr('当前', 'current') : ''}));
  ROOMS.forEach(r => items.push({g:tr('房间', 'Rooms'), icon:'target', zh:`定位房间：${state.rooms[r.id].name}`, en:`Go to room: ${EN(state.rooms[r.id].name)}`,
    run:() => { select({kind:'room', id:r.id}); if (is3D()) window.View3D.flyToRoom(r.id); else zoomToBox(bbox(r.poly), 400); }, key:`${fmt(area(r.poly), 1)} m²`}));
  libAll().forEach(c => c.items.forEach(it => items.push({g:tr('添加家具', 'Add furniture'), icon:'plus', zh:`添加：${it[1]}`, en:`Add: ${EN(it[1])}`, run:() => {
    const p = ui.sel?.kind === 'room' ? (b => ({x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}))(bbox(ROOMS.find(r => r.id === ui.sel.id).poly))
      : is3D() ? (r => window.View3D.groundAt(r.left + r.width/2, r.top + r.height/2))($('#stage').getBoundingClientRect()) : null;
    addItem(it, p?.x ?? view.x0 + svg.clientWidth/2/view.s, p?.y ?? view.y0 + svg.clientHeight/2/view.s); }, key:`${it[2]}×${it[3]}`})));
  state.furniture.forEach(f => items.push({g:tr('已摆放', 'Placed'), icon:'target', zh:`定位：${f.name}`, en:`Locate: ${EN(f.name)}`, run:() => focusItem(f.id), key:`${f.w}×${f.d}`}));
  return items;
}
function openCmd(){
  closeCtx(); closeDialog();
  cmdItems = cmdSource(); $('#cmd').hidden = false;
  const inp = $('#cmdIn'); inp.value = ''; renderCmd(); inp.focus();
}
function closeCmd(){ $('#cmd').hidden = true; }
function renderCmd(){
  const q = $('#cmdIn').value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
  const hay = it => (it.zh + ' ' + it.en + ' ' + s2t(it.zh)).toLowerCase();
  let list = cmdItems.map((it, i) => ({it, i, h:hay(it)})).filter(o => words.every(w => o.h.includes(w)));
  if (!q) list = list.filter(o => o.it.g === tr('命令', 'Actions') || o.it.g === tr('风格', 'Styles'));
  // 名称开头命中的排前面（如输入「沙发」时「添加：三人沙发」在「定位：…」之前不重要，开头匹配优先）
  list.sort((a, b) => (b.h.includes(':' + q) || b.h.includes('：' + q)) - (a.h.includes(':' + q) || a.h.includes('：' + q)) || a.i - b.i);
  list = list.slice(0, 80); cmdSel = Math.min(cmdSel, Math.max(0, list.length - 1));
  let g = '', s = '';
  list.forEach((o, n) => { if (o.it.g !== g){ g = o.it.g; s += `<div class="cmd-g">${esc(g)}</div>`; }
    s += `<button class="cmd-it ${n === cmdSel ? 'on' : ''}" data-ci="${o.i}" data-n="${n}" role="option">${ico(o.it.icon)}<span>${esc(tr(o.it.zh, o.it.en))}</span>${o.it.key ? `<kbd>${esc(o.it.key)}</kbd>` : ''}</button>`; });
  $('#cmdList').innerHTML = s || `<div class="cmd-empty">${tr('没有匹配的结果', 'No results')}</div>`;
  $('#cmdList .cmd-it.on')?.scrollIntoView({block:'nearest'});
}
function runCmd(i){ const it = cmdItems[i]; closeCmd(); if (it) it.run(); }
$('#cmdIn').addEventListener('input', () => { cmdSel = 0; renderCmd(); });
$('#cmdIn').addEventListener('keydown', e => {
  const n = $('#cmdList').querySelectorAll('.cmd-it').length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); cmdSel = (cmdSel + (e.key === 'ArrowDown' ? 1 : -1) + n) % Math.max(1, n); renderCmd(); }
  else if (e.key === 'Enter'){ e.preventDefault(); const b = $('#cmdList .cmd-it.on'); if (b) runCmd(+b.dataset.ci); }
  else if (e.key === 'Escape'){ e.preventDefault(); closeCmd(); }
});
$('#cmdList').addEventListener('click', e => { const b = e.target.closest('.cmd-it'); if (b) runCmd(+b.dataset.ci); });
$('#cmdList').addEventListener('pointermove', e => { const b = e.target.closest('.cmd-it'); if (b && +b.dataset.n !== cmdSel){ cmdSel = +b.dataset.n; $('#cmdList .cmd-it.on')?.classList.remove('on'); b.classList.add('on'); } });
$('#cmd').addEventListener('pointerdown', e => { if (e.target.id === 'cmd') closeCmd(); });
$('#cmdBtn').onclick = () => openCmd();

// 面板 / 浮动工具条 / 右键菜单共用的操作表
const ACT = {
  rotR:() => rotateSel(90), rotL:() => rotateSel(-90), flip:flipSel, lock:lockSel, dup:duplicateSel, del:deleteSel,
  copy:() => copySel(false), cut:() => copySel(true), paste:() => paste(ui.ctxAt), front:() => orderSel(true), toBack:() => orderSel(false),
  resetItem:resetItemSel, zoom:zoomSel, match:matchSizeSel, selAll:selectAll,
  spaceCheck:()=>{FurnishWorkspace.open('space');$('#space-run').click();},
  al:() => alignSel('l'), ac:() => alignSel('c'), ar:() => alignSel('r'), at:() => alignSel('t'), am:() => alignSel('m'), ab:() => alignSel('b'),
  dh:() => distributeSel('h'), dv:() => distributeSel('v'),
  home:() => select(null), done:() => { select(null); closeDrawers(); }, prop:() => drawer('panel', true),
  rescue:() => rescueOutside(), rescueOne:() => rescueOutside(selIds()), clash:() => { const ids = [...new Set(collisions().flat())]; selectIds(ids); if (ids.length) zoomSel(); },
  clearFurn:clearLayout, reset:() => openReset(), help:() => openHelp(), csv:exportCSV, custom:() => openCustom(), fit:() => fitView(),
  roomFurn:() => { const r = ROOMS.find(r => r.id === (ui.sel?.kind === 'room' ? ui.sel.id : ui.ctxRoom)); if (r) selectIds(state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly)).map(f => f.id)); },
  roomSel:() => select({kind:'room', id:ui.ctxRoom}),
  defaults:() => { mutate(() => state.furniture = freshWork(PLAN).furniture); toast(tr('已恢复推荐布置', 'Recommended layout restored'), {label:tr('撤销', 'Undo'), fn:undo}); },
  cmd:() => openCmd(), plans:() => openPlans(), addNote:() => openNoteEditor(null, ui.ctxAt),
  editNote:() => { const n = getNote(ui.sel?.id); if (n) openNoteEditor(n); }, delNote:() => { if (ui.sel?.kind === 'note') deleteNote(ui.sel.id); },
  style:el => applyStyle(el.dataset.style),
  roomReset:() => { const id = ui.sel?.kind === 'room' && ui.sel.id, r = ROOMS.find(r => r.id === id); if (r) mutate(() => state.rooms[id] = {name:r.name, mat:r.mat,use:FurnishDesign.inferUse(r)}); },
};
function runAct(el){ const a = el.dataset.act; if (ACT[a]){ ACT[a](el); return true; } return false; }
// 事件委托：面板内容每次重绘，不必逐个绑定
$('#panel').addEventListener('click', e => {
  const t = e.target;
  const tab = t.closest('[data-tab]'); if (tab){ ui.tab = tab.dataset.tab; saveUI(); if (ui.sel) select(null); else renderPanel(); $('#panel').scrollTop = 0; return; }
  const lk = t.closest('[data-lockid]'); if (lk){ e.stopPropagation(); const f = getF(lk.dataset.lockid); if (f) mutate(() => { if (f.locked) delete f.locked; else f.locked = true; }); return; }
  const act = t.closest('[data-act]'); if (act){ runAct(act); return; }
  const st = t.closest('[data-style]'); if (st){ applyStyle(st.dataset.style); return; }
  const fo = t.closest('[data-focus]'); if (fo) focusItem(fo.dataset.focus);
});
$('#fab').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) runAct(b); });
$('#emptyHint').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) runAct(b); });

initializeCanvasInteractions();

/* ======================= 键盘 ======================= */
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); $('#cmd').hidden ? openCmd() : closeCmd(); return; }
  if (!$('#cmd').hidden) return;                                                  // 命令面板自己处理按键
  if (!$('#dlg').hidden){ if (e.key === 'Escape') closeDialog(); return; }        // 对话框打开时只响应 Esc
  if (!$('#ctx').hidden && e.key === 'Escape'){ closeCtx(); return; }
  if (e.target.matches('input,select,textarea')) return;
  if (window.View3D?.walking()) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
  if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
  if (mod && k === 'a'){ e.preventDefault(); selectAll(); return; }
  if (mod && (k === 'c' || k === 'x')){ if (selIds().length){ e.preventDefault(); copySel(k === 'x'); } return; }
  if (mod && k === 'v'){ e.preventDefault(); paste(!is3D() && ui.ptr ? ui.ptr : null); return; }
  if (mod) return;
  if (e.key === ' ' && !is3D()){ e.preventDefault(); if (!spaceDown){ spaceDown = true; svg.classList.add('space'); } return; }
  if (e.key === '?'){ openHelp(); return; }
  if (k === '[' || k === ']'){ drawer(k === '[' ? 'lib' : 'panel'); return; }
  if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
  if (k === 't') setView(is3D() ? '2d' : '3d');
  else if (is3D() && ['v','b','m','x','n','f','z','+','=','-'].includes(k)) return;
  else if (k === 'n') setTool('note');
  else if (k === 'v') setTool('select');
  else if (k === 'b') setTool('marquee');
  else if (k === 'm') setTool('measure');
  else if (k === 'x') setTool('demolish');
  else if (k === 'f') fitView();
  else if (k === 'z') zoomSel();
  else if (k === 'r') rotateSel(e.shiftKey ? -90 : 90);
  else if (k === 'h') flipSel();
  else if (k === 'l') lockSel();
  else if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
  else if (k === 'escape'){ if (ui.mA){ ui.mA = null; renderMeasure(); } else { if (ui.tool !== 'select') setTool('select'); select(null); } }
  else if (k.startsWith('arrow') && selIds().length){
    e.preventDefault(); const st = e.shiftKey ? 100 : 10, items = movable(selItems()); if (!items.length) return;
    const dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0;
    mutate(() => items.forEach(f => { f.cx += dx; f.cy += dy; }));
  }
  else if (k === '+' || k === '=') zoomCenter(1.25);
  else if (k === '-') zoomCenter(.8);
});
const endSpace = () => { spaceDown = false; svg.classList.remove('space'); };
document.addEventListener('keyup', e => { if (e.key === ' ') endSpace(); });
addEventListener('blur', endSpace);

/* ======================= 右键 / 长按菜单 ======================= */
function openCtx(x, y, target){
  const fEl = ui.layers.furn && target?.closest?.('[data-fid]'), nEl = ui.layers.notes && target?.closest?.('[data-note]');
  ui.ctxAt = toMM({clientX:x, clientY:y});
  if (nEl){
    select({kind:'note', id:nEl.dataset.note});
    const b = (act, icon, zh, en, cls = '') => `<button role="menuitem" data-act="${act}" class="${cls}">${ico(icon)}<span>${tr(zh, en)}</span></button>`;
    return showCtx(x, y, `<div class="cap">${esc(getNote(nEl.dataset.note).text)}</div>` + b('editNote', 'note', '编辑标注', 'Edit note') + '<div class="sep"></div>' + b('delNote', 'trash', '删除标注', 'Delete note', 'danger'));
  }
  ui.ctxRoom = target?.closest?.('[data-room]')?.dataset.room || roomAt(ui.ctxAt.x, ui.ctxAt.y)?.id || null;
  if (fEl && !selIds().includes(fEl.dataset.fid)) selectIds([fEl.dataset.fid]);
  const items = fEl ? selItems() : [], n = items.length, locked = n && items.every(f => f.locked);
  const it = (act, icon, zh, en, key = '', o = {}) => `<button role="menuitem" data-act="${act}" ${o.dis ? 'disabled' : ''} class="${o.cls || ''}">${ico(icon)}<span>${tr(zh, en)}</span>${key ? `<kbd>${key}</kbd>` : ''}</button>`;
  const sep = '<div class="sep"></div>';
  let h;
  if (n){
    h = `<div class="cap">${n > 1 ? tr(`已选 ${n} 件`, `${n} selected`) : esc(nm(items[0].name))}</div>`
      + it('copy', 'copy', '复制', 'Copy', 'Ctrl+C') + it('cut', 'cut', '剪切', 'Cut', 'Ctrl+X') + it('dup', 'copy', '创建副本', 'Duplicate', 'Ctrl+D') + sep
      + it('rotR', 'rotR', '顺时针旋转 90°', 'Rotate right 90°', 'R') + it('rotL', 'rotL', '逆时针旋转 90°', 'Rotate left 90°', '⇧R')
      + it('flip', 'flip', '左右镜像', 'Mirror', 'H') + it('lock', locked ? 'unlock' : 'lock', locked ? '解锁' : '锁定', locked ? 'Unlock' : 'Lock', 'L') + sep
      + (n > 1 ? it('al', 'al', '左对齐', 'Align left') + it('at', 'at', '顶对齐', 'Align top') + it('dh', 'dh', '水平等距分布', 'Distribute horizontally') + it('match', 'size', '统一尺寸', 'Match size') + sep : '')
      + it('front', 'front', '置于顶层', 'Bring to front') + it('toBack', 'back', '置于底层', 'Send to back')
      + it('resetItem', 'reset', '恢复默认尺寸与颜色', 'Reset size & color') + it('zoom', 'target', '缩放到所选', 'Zoom to selection', 'Z')
      + sep + it('del', 'trash', '删除', 'Delete', 'Del', {cls:'danger'});
  } else {
    h = it('paste', 'paste', '粘贴到此处', 'Paste here', 'Ctrl+V', {dis:!clip}) + it('selAll', 'box', '全选家具', 'Select all furniture', 'Ctrl+A', {dis:!state.furniture.length});
    if (ui.ctxRoom) h += sep + `<div class="cap">${esc(nm(state.rooms[ui.ctxRoom].name))}</div>`
      + it('roomSel', 'home', '房间属性 / 更换地面', 'Room properties / flooring') + it('roomFurn', 'box', '选中房间内全部家具', 'Select furniture in this room');
    h += sep + it('addNote', 'note', '在此添加标注', 'Add a note here', 'N') + it('cmd', 'search', '命令面板', 'Command palette', 'Ctrl K')
      + it('fit', 'fit', '适应窗口', 'Fit to window', 'F') + it('reset', 'reset', '重置…', 'Reset…') + it('help', 'kbd', '快捷键', 'Shortcuts', '?');
  }
  showCtx(x, y, h);
}
function showCtx(x, y, h){
  const m = $('#ctx'); m.innerHTML = h; m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
}
function closeCtx(){ const m = $('#ctx'); if (m && !m.hidden) m.hidden = true; }
$('#ctx').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; closeCtx(); runAct(b); });
$('#ctx').addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerdown', e => { if (!e.target.closest?.('#ctx')) closeCtx(); }, true);
addEventListener('resize', closeCtx);

/* ======================= 对话框 ======================= */
let dialogReturnFocus=null;
function openDialog({title, body, actions = [], wide = false, onOpen}){
  if($('#dlg').hidden)dialogReturnFocus=document.activeElement;
  $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body;
  $('#dlg .dlg-box').classList.toggle('wide', wide);
  const A = $('#dlgActions');
  A.innerHTML = actions.map((a, i) => a.href ? `<a class="btn ${a.cls || ''}" data-i="${i}" href="${esc(a.href)}" download="${esc(a.download||'')}">${a.label}</a>` : `<button class="btn ${a.cls || ''}" data-i="${i}">${a.label}</button>`).join(''); A.hidden = !actions.length;
  A.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const a = actions[+b.dataset.i]; if(a.href)return; if (a.fn?.() !== false) closeDialog(); };
  $('#dlg').hidden = false; closeCtx();
  onOpen?.();
  ($('#dlgBody input:not([type=checkbox])') || A.querySelector('.primary') || $('#dlgClose')).focus();
}
function closeDialog(){ $('#dlg').hidden = true; $('#dlgBody').innerHTML = '';const target=dialogReturnFocus?.isConnected&&dialogReturnFocus.getClientRects().length?dialogReturnFocus:$('#projectWorkspace');dialogReturnFocus=null;target?.focus({preventScroll:true}); }
$('#dlgClose').onclick = closeDialog;
$('#dlg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDialog();return;}if(e.key!=='Tab')return;const nodes=[...$('#dlg').querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}e.stopPropagation();});
$('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg') closeDialog(); });
$('#dlgBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')){ e.preventDefault(); $('#dlgActions .primary')?.click(); } });

// 重置中心：按需恢复家具 / 房间 / 墙体 / 门窗 / 测量 / 视图，一步撤销
function openReset(){
  const o = (k, zh, en, szh, sen, on) => `<label class="opt"><input type="checkbox" data-r="${k}" ${on ? 'checked' : ''}><span><b>${tr(zh, en)}</b><small>${tr(szh, sen)}</small></span></label>`;
  const nDem = state.demolished.length, nOpen = Object.keys(state.open.d || {}).length + Object.keys(state.open.w || {}).length;
  const nRoom = ROOMS.filter(r => state.rooms[r.id].name !== r.name || state.rooms[r.id].mat !== r.mat).length;
  openDialog({title:tr('重置', 'Reset'), body:`<p>${tr(`户型「${nm(PLAN.name)}」：勾选要恢复的内容。操作可用「撤销」找回。`, `Plan "${nm(PLAN.name)}": choose what to restore. You can Undo afterwards.`)}</p><div class="opts">
      ${o('furn', '家具布置', 'Furniture layout', `恢复为该户型的默认布置（当前 ${state.furniture.length} 件）`, `Restore the default layout (currently ${state.furniture.length} items)`, true)}
      ${o('rooms', '房间名称与地面材料', 'Room names & flooring', `${nRoom} 个房间有改动`, `${nRoom} room(s) changed`, nRoom > 0)}
      ${o('walls', '拆改的墙体', 'Demolished walls', `${nDem} 段墙体已标记拆除`, `${nDem} wall segment(s) marked for removal`, nDem > 0)}
      ${o('open', '门窗调整', 'Door & window changes', `${nOpen} 处开启方向 / 窗台高改动`, `${nOpen} swing / sill change(s)`, nOpen > 0)}
      ${o('meas', '测量线与文字标注', 'Measurements & notes', `${state.measures.length} 条测量 · ${(state.notes || []).length} 条标注`, `${state.measures.length} measure(s) · ${(state.notes || []).length} note(s)`, false)}
      ${o('view', '视图与显示设置', 'View & display settings', '适应窗口；恢复默认图层、编辑辅助与移动步长', 'Fit to window; default layers, aids and grid step', true)}
    </div>`,
    actions:[
      {label:tr('清除本机全部数据…', 'Erase all local data…'), cls:'danger left', fn:wipeAll},
      {label:tr('取消', 'Cancel')},
      {label:tr('恢复所选', 'Restore selected'), cls:'primary', fn:() => {
        const on = k => $(`#dlgBody [data-r="${k}"]`).checked, any = ['furn','rooms','walls','open','meas'].some(on);
        if (!any && !on('view')){ toast(tr('请至少勾选一项', 'Select at least one item')); return false; }
        if (any){
          snapshot(true,state,'重置前');const before = snap(), d = freshWork(PLAN);
          if (on('furn')){ state.furniture = d.furniture; delete state.style; }
          if (on('rooms')) state.rooms = d.rooms;
          if (on('walls')) state.demolished = [];
          if (on('open')) state.open = {};
          if (on('meas')){ state.measures = []; state.notes = []; }
          ui.sel = null; commit(before); renderAll();
        }
        if (on('view')){
          Object.assign(ui.layers, {dims:true, labels:true, furn:true, notes:true, grid:false, bearing:false, wallSnap:true, guides:true, clear:true, collide:true}); ui.grid = 10;
          saveUI(); syncLayerBtns(); setTool('select'); renderDims(); renderAll(); fitView();
        }
        toast(tr('已恢复所选内容', 'Restored'), any ? {label:tr('撤销', 'Undo'), fn:undo} : null);
      }},
    ]});
}
function wipeAll(){
  openDialog({title:tr('清除本机全部数据','Erase local data'),body:`<p>${tr('将清除本浏览器的户型、布置、命名方案、恢复记录和自定义家具，无法撤销。请先导出需要保留的项目。','All locally saved projects, designs, recovery points and custom furniture will be erased. Export any projects you want to keep first.')}</p><p id="wipe-error" class="project-error" role="alert"></p>`,actions:[{label:tr('取消','Cancel')},{label:tr('确认清除全部数据','Erase all data'),cls:'danger',fn:()=>{storageWiping=true;autosave.invalidate();historyPersistence.invalidate();$('#dlgActions').querySelectorAll('button').forEach(b=>b.disabled=true);window.FurnishStorage.clear().then(()=>{['huxing-design-v2','huxing-design-v1','huxing-history','huxing-recent','huxing-panes',UI_KEY].forEach(k=>localStorage.removeItem(k));location.reload();}).catch(e=>{storageWiping=false;save();persistHistory();$('#wipe-error').textContent=tr('清除未完成：','Erase failed: ')+e.message;$('#dlgActions').querySelectorAll('button').forEach(b=>b.disabled=false);});return false;}}]});return false;
}

function openHelp(){
  const g = (title, rows) => `<h4>${title}</h4>` + rows.map(([k, zh, en]) => `<div><span>${tr(zh, en)}</span><kbd>${k}</kbd></div>`).join('');
  openDialog({title:tr('快捷键与操作', 'Shortcuts & Controls'), wide:true, body:`<div class="keys">
    ${g(tr('工具与视图', 'Tools & view'), [['V','选择 / 移动','Select / move'],['B','框选','Box select'],['M','测量（Shift 水平/垂直）','Measure (Shift = straight)'],['X','拆改非承重墙','Demolish walls'],['N','文字标注','Text note'],['Ctrl+K','命令面板：搜索一切','Command palette'],
      ['T','切换 2D / 3D','Toggle 2D / 3D'],['F','适应窗口','Fit to window'],['Z','缩放到所选','Zoom to selection'],['+ / −','放大 / 缩小','Zoom in / out'],
      [tr('空格+拖动','Space+drag'),'平移画面（也可用中键）','Pan (or middle mouse)'],['[ / ]','收起 / 展开左右面板','Toggle side panels'],['Shift+F','全屏','Fullscreen'],['Esc','取消选择 / 退出工具','Deselect / exit tool']])}
    ${g(tr('编辑', 'Editing'), [['Ctrl+Z','撤销','Undo'],['Ctrl+Shift+Z','重做','Redo'],['Ctrl+C / X / V','复制 / 剪切 / 粘贴到指针处','Copy / cut / paste at pointer'],['Ctrl+D','创建副本','Duplicate'],
      ['Ctrl+A','全选家具','Select all'],['Delete','删除','Delete'],['R / Shift+R','旋转 90°','Rotate 90°'],['H','左右镜像','Mirror'],['L','锁定 / 解锁','Lock / unlock'],
      [tr('方向键','Arrows'),'微调 10mm（Shift 100mm）','Nudge 10mm (Shift 100mm)']])}
    ${g(tr('鼠标 / 触屏', 'Mouse / touch'), [[tr('Shift+点击','Shift+click'),'加入 / 移出选择','Add / remove from selection'],[tr('Shift+拖动','Shift+drag'),'在空白处框选','Box select on empty space'],
      [tr('右键 / 长按','Right-click / long-press'),'操作菜单','Action menu'],[tr('双击家具','Double-click'),'旋转 90°','Rotate 90°'],[tr('拖顶部圆点','Top dot'),'旋转（Shift 任意角度）','Rotate (Shift = free)'],
      [tr('拖右下方块','Corner square'),'调整宽深','Resize'],[tr('双指','2 fingers'),'缩放 / 平移','Zoom / pan']])}
    ${g(tr('3D 漫游', '3D walk'), [['W A S D','移动','Move'],['Shift','快走','Run'],['E','开关正前方的门','Toggle door ahead'],['Esc','暂停','Pause']])}
  </div>`});
}

// 自定义家具：任意名称 / 尺寸 / 形状 / 高度 / 颜色 / 单价，保存到「我的家具」
function openCustom(){
  const f = (id, zh, en, attrs, full) => `<label class="${full ? 'full' : ''}">${tr(zh, en)}<input id="${id}" ${attrs}></label>`;
  openDialog({title:tr('新建自定义家具', 'New custom item'), body:`<p>${tr('保存到家具库的「我的家具」分类，可反复添加；3D 中显示为对应尺寸的方块或圆柱。', 'Saved to "My Items" in the library for reuse; shown in 3D as a box or cylinder of that size.')}</p>
    <div class="form">
      ${f('cN', '名称', 'Name', `value="${tr('定制柜', 'Custom cabinet')}" maxlength="24"`, true)}
      ${f('cW', '宽 (mm)', 'Width (mm)', 'type="number" value="1200" min="50" step="10"')}
      ${f('cD', '深 (mm)', 'Depth (mm)', 'type="number" value="450" min="50" step="10"')}
      ${f('cH', '高 (mm)', 'Height (mm)', 'type="number" value="900" min="10" step="10"')}
      <label>${tr('形状', 'Shape')}<select id="cS"><option value="rect">${tr('矩形', 'Rectangle')}</option><option value="round">${tr('圆形 / 椭圆', 'Round / oval')}</option></select></label>
      ${f('cC', '颜色', 'Color', 'type="color" value="#d9c9a8"')}
      ${f('cP', '参考单价 (¥)', 'Unit price (¥)', 'type="number" value="1500" min="0" step="50"')}
    </div>`,
    actions:[{label:tr('取消', 'Cancel')}, {label:tr('保存并添加', 'Save & add'), cls:'primary', fn:() => {
      const v = id => $('#' + id).value, n = id => Math.round(+v(id));
      const c = {id:'c' + uid(), name:v('cN').trim().slice(0,80) || tr('自定义家具', 'Custom item'), w:n('cW'), d:n('cD'), h:n('cH'), shape:v('cS'), color:v('cC'), price:Math.max(0, n('cP') || 0)};
      if (!(c.w >= 50 && c.d >= 50 && c.w <= 20000 && c.d <= 20000 && c.h > 0 && c.h <= 20000 && c.price <= 1e7)){ toast(tr('尺寸需在 50–20000 mm 之间', 'Size must be 50–20000 mm')); return false; }
      if((store.custom||[]).length>=500)return toast(tr('家具库最多 500 个自定义条目。','Up to 500 custom catalog entries.'));
      (store.custom ||= []).push(c); save();
      libUI.cat = CUSTOM_CAT; libUI.q = ''; $('#libSearch').value = ''; buildCats(); buildLib();
      const it = libAll().at(-1).items.at(-1);
      const p = ui.sel?.kind === 'room' ? (b => ({x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}))(bbox(ROOMS.find(r => r.id === ui.sel.id).poly))
        : {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
      addItem(it, p.x, p.y);
    }}]});
}

/* ======================= 家具库 ======================= */
const itemCard = (it, ci, ii) => { const [t,n,w,d,col,price,,cid] = it, pad = Math.max(w,d)*.08, source=cid?store.custom.find(c=>c.id===cid):null;
  return `<div class="item ${cid ? 'custom' : ''}" data-key="${ci}:${ii}" title="${tr('点击添加，或拖到平面图中的指定位置', 'Click to add, or drag onto the plan')}${price ? ` · ¥${price}` : ''}">
    ${cid ? `<button class="del" style="z-index:1" data-cdel="${cid}" title="${tr('从「我的家具」删除', 'Remove from My Items')}">${ico('x')}</button>` : ''}
    <svg viewBox="${-w/2-pad} ${-d/2-pad} ${w+2*pad} ${d+2*pad}">${furnSVG(t,w,d,col)}</svg><b>${esc(nm(n))}</b><small>${w}×${d}${source?`×${source.h}`:''}</small>${source&&(source.brand||source.model)?`<small>${esc([source.brand,source.model].filter(Boolean).join(' · '))}</small>`:''}</div>`; };
function buildLib(){
  const q = libUI.q.trim().toLowerCase();
  let html = (libUI.cat === 'all' && !q && !$('#catalog-max-w')?.value && !$('#catalog-max-d')?.value) ? recentsHTML() : '';
  libAll().forEach((c, ci) => {
    if (!q && libUI.cat !== 'all' && libUI.cat !== c.cat) return;
    const cards = c.items.map((it, ii) => ({it, ii}))
      .filter(({it}) => window.FurnishCatalog ? FurnishCatalog.matches(it,q,Number($('#catalog-max-w')?.value),Number($('#catalog-max-d')?.value)) : !q || nm(it[1]).toLowerCase().includes(q) || it[1].toLowerCase().includes(q))
      .map(({it, ii}) => itemCard(it, ci, ii)).join('');
    if (!cards) return;
    html += `<h4>${nm(c.cat)}</h4><div class="lib-grid">${cards}</div>`;
  });
  $('#lib').innerHTML = (html || `<div class="hint">${tr('没有匹配的家具', 'No matching furniture')}</div>`) +
    `<div class="hint">${tr(
    `家具按真实尺寸（mm）绘制。${COARSE ? '点一下放到画面中央，或按住向右拖到平面图 / 3D 地面上的指定位置（上下滑动为滚动列表）。' : '点击添加到画面中央，或直接拖到平面图 / 3D 地面上。'}添加后可在右侧修改宽深与颜色。`,
    `Furniture is drawn at real size (mm). ${COARSE ? 'Tap to place at the center, or hold and drag right onto the plan / 3D floor (swipe up/down to scroll).' : 'Click to add at the center, or drag onto the plan / 3D floor.'} Edit size and color in the right panel afterwards.`)}</div>`;
  document.querySelectorAll('#lib .item').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('.del')) return;
    libDrag = {el, id:e.pointerId, sx:e.clientX, sy:e.clientY, it:itemOf(el), ghost:null};
  }));
  document.querySelectorAll('#lib [data-cdel]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    openDialog({title:tr('删除家具库条目','Delete catalog item'),body:'<p>'+tr('已摆放家具会保留。可识别来源的家具也会保留原始规格与参考价格。','Placed furniture and identified original specifications are retained.')+'</p>',actions:[{label:tr('取消','Cancel')},{label:tr('删除库条目','Delete catalog item'),cls:'danger',fn:()=>{
      const c=store.custom.find(c=>c.id===b.dataset.cdel);
      const retain=work=>{for(const f of work?.furniture||[])if(FurnishDesign.catalogSource(f,store.custom)===c){f.catalogId=c.id;f.catalogSnapshot=FurnishDesign.catalogSnapshot(c);}};
      if(c){[state,...Object.values(store.work||{}),...(store.designs||[]).map(d=>d.work),...hist.map(h=>h.data)].forEach(retain);for(const stack of [undoStack,redoStack])for(let i=0;i<stack.length;i++){const work=JSON.parse(stack[i]);retain(work);stack[i]=JSON.stringify(work);}persistHistory();}store.custom=store.custom.filter(c=>c.id!==b.dataset.cdel);save();if(!store.custom.length&&libUI.cat===CUSTOM_CAT)libUI.cat='all';buildCats();buildLib();return true;
    }}]});
  });
}
const itemOf = el => { const [ci, ii] = el.dataset.key.split(':').map(Number); return libAll()[ci].items[ii]; };

// 家具库拖放：用 pointer 事件实现（iPad 上 HTML5 拖放不可靠）。
// 列表设置了 touch-action:pan-y，竖向滑动交给浏览器滚动（会触发 pointercancel），横向拖动才开始拖放。
let libDrag = null;
// 屏幕坐标 → 户型坐标（mm）。2D 取平面图坐标，3D 取射线与地面的交点；s = 该处每 mm 的屏幕像素数
function dropPoint(x, y){
  const r = $('#stage').getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (document.elementFromPoint(x, y)?.closest('aside.open,#fab,#walkOverlay,#joy,#walkExit')) return null;
  if (is3D()) return window.View3D?.groundAt(x, y) || null;
  const p = toMM({clientX:x, clientY:y}); return {x:p.x, y:p.y, s:view.s};
}
addEventListener('pointermove', e => {
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const {it} = libDrag;
  if (!libDrag.ghost){
    if (Math.hypot(e.clientX-libDrag.sx, e.clientY-libDrag.sy) < TAP) return;
    const g = libDrag.ghost = document.createElement('div'); g.id = 'ghost';
    g.innerHTML = `<svg viewBox="${-it[2]/2} ${-it[3]/2} ${it[2]} ${it[3]}">${furnSVG(it[0],it[2],it[3],it[4])}</svg>`;
    document.body.appendChild(g); libDrag.el.classList.add('dragging');
  }
  // 幽灵图按落点处的比例显示真实大小（3D 中近大远小）
  const g = libDrag.ghost, s = Math.max(dropPoint(e.clientX, e.clientY)?.s || (is3D() ? .05 : view.s), .02);
  Object.assign(g.style, {width:Math.max(28, it[2]*s)+'px', height:Math.max(20, it[3]*s)+'px', left:e.clientX+'px', top:e.clientY+'px'});
  const lib = $('aside.lib');
  if (narrow() && lib.classList.contains('open') && e.clientX > lib.getBoundingClientRect().right) drawer(null);   // 拖出抽屉后自动收起
});
function endLibDrag(e, ok){
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const d = libDrag; libDrag = null;
  d.el.classList.remove('dragging');
  if (d.ghost){
    d.ghost.remove();
    if (!ok) return;
    const p = dropPoint(e.clientX, e.clientY);
    if (p) addItem(d.it, p.x, p.y);
    else if (is3D() && e.clientX > $('#stage').getBoundingClientRect().left) toast(tr('请拖到地面上', 'Drop it on the floor'));
    return;
  }
  if (!ok) return;
  // 轻点：放到选中房间中心，否则放到画面中心（3D 取屏幕中心对应的地面位置）
  let p = null;
  if (ui.sel?.kind === 'room'){ const b = bbox(ROOMS.find(r => r.id===ui.sel.id).poly); p = {x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}; }
  else if (is3D()){ const r = $('#stage').getBoundingClientRect(); p = window.View3D.groundAt(r.left + r.width/2, r.top + r.height/2); }
  if (!p) p = {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
  addItem(d.it, p.x, p.y);
  closeDrawers();
}
addEventListener('pointerup', e => endLibDrag(e, true));
addEventListener('pointercancel', e => endLibDrag(e, false));

/* ======================= 杂项 ======================= */
// 提示条；act = {label, fn} 时带一个操作按钮（如「撤销」），显示更久
let toastT;
function toast(msg, act){
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('act', !!act);
  if (act){ const b = document.createElement('button'); b.textContent = act.label; b.onclick = () => { t.classList.remove('show', 'act'); act.fn(); }; t.appendChild(b); }
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show', 'act'), act ? 5000 : 1800);
}

/* ======================= 户型切换 ======================= */
function setPlan(id){
  const p = PLANS.find(q => q.id === id);
  if (!p || p.id === PLAN.id) return;
  PLAN = p; applyPlanData();
  store.planId = p.id;
  state = store.work[p.id] || (store.work[p.id] = freshWork(p));
  state.open = state.open || {}; state.furniture = sanitizeFurn(state.furniture, p);
  undoStack.length = 0; redoStack.length = 0; ui.sel = null; ui.mA = null; ui.mCur = null; hoverRoom = '';
  save();
  buildDefs(); buildLib(); renderOpenings(); renderDims(); fitView(); renderAll(); buildPlanList(); renderDesigns();
  window.View3D?.replan();
  toast(tr(`已切换到「${nm(p.name)}」`, `Switched to "${nm(p.name)}"`));
}
function planThumb(p){
  let xs = [], ys = [];
  p.walls.forEach(w => { xs.push(w[0], w[2]); ys.push(w[1], w[3]); });
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 140;
  const rooms = p.rooms.filter(r => r.counted !== false)
    .map(r => `<polygon points="${r.poly.map(q => q.join(',')).join(' ')}" fill="#cbbFa8" opacity=".5"/>`).join('');
  const walls = p.walls.map(w =>
    `<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="${w[4]==='b' ? '#2b2824' : w[4]==='e' ? '#57514a' : '#9b9285'}" stroke="#eee" stroke-width="15" stroke-dasharray="${w[4]==='b'?'30 20':w[4]==='e'?'100 30':''}"/>`).join('');
  return `<svg viewBox="${x0-pad} ${y0-pad} ${x1-x0+2*pad} ${y1-y0+2*pad}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${rooms}${walls}</svg>`;
}
function buildPlanList(){
  const c = $('#planCnt'); if (c) c.textContent = PLANS.length;
  renderGallery();
}
// 户型库：按居室筛选的卡片画廊（户型多了以后下拉菜单不好找）
const CN_NUM = {一:1, 两:2, 二:2, 三:3, 四:4, 五:5};
const bedsOf = p => p.customDraft?p.rooms.filter(r=>FurnishDesign.inferUse(r,(p.id===PLAN.id?state:store.work[p.id])?.rooms?.[r.id])==='bedroom').length:/开间/.test(p.name)?0:CN_NUM[(p.name.match(/([一两二三四五])室/)||[])[1]]??(/三居/.test(p.name)?3:1);
const bathsOf = p => p.customDraft?p.rooms.filter(r=>FurnishDesign.inferUse(r,(p.id===PLAN.id?state:store.work[p.id])?.rooms?.[r.id])==='bathroom').length:CN_NUM[(p.name.match(/([一两二三])卫/)||[])[1]]??1;
const netOf = p => p.rooms.filter(r => r.counted !== false).reduce((a, r) => a + area(r.poly), 0);
let galleryF = 'all';
function openPlans(){ openDialog({title:tr('户型库', 'Floor Plans'), wide:true, body:'<div class="actions" style="margin:0 0 14px"><button class="btn primary" id="gallery-new">导入 DXF／图片 · 新建户型</button><button class="btn" id="gallery-import">加载户型／项目文件</button></div><p>导出文件可发送给其他用户；在此加载后继续编辑。自定义户型可删除，内置示例保留。</p><div id="gallery"></div>', onOpen:()=>{renderGallery();$('#gallery-new').onclick=()=>{closeDialog();window.FurnishEditor.open(true);};$('#gallery-import').onclick=()=>window.FurnishWorkspace.importProject();}}); }
function renderGallery(){
  const el = $('#gallery'); if (!el) return;
  const F = [['all', '全部', 'All'], ['1', '开间 · 一居', 'Studio · 1BR'], ['2', '两居', '2BR'], ['3', '三居', '3BR'], ['4', '四居及以上', '4BR+']];
  const ok = p => galleryF === 'all' || (galleryF === '1' ? bedsOf(p) <= 1 : galleryF === '4' ? bedsOf(p) >= 4 : bedsOf(p) === +galleryF);
  const list = PLANS.filter(ok).sort((a, b) => netOf(a) - netOf(b));
  el.innerHTML = `<div class="chiprow gfil">${F.map(([k, zh, en]) => `<button class="btn chip ${galleryF === k ? 'on' : ''}" data-gf="${k}">${tr(zh, en)} <small>${PLANS.filter(p => k === 'all' || (k === '1' ? bedsOf(p) <= 1 : k === '4' ? bedsOf(p) >= 4 : bedsOf(p) === +k)).length}</small></button>`).join('')}</div>
    <div class="ggrid">${list.map(p => { const n = store.work[p.id]?.furniture?.length, on = p.id === PLAN.id;
      return `<article class="gentry"><button class="gcard ${on ? 'on' : ''}" data-plan="${p.id}">
        <div class="gthumb">${planThumb(p)}${on ? `<i class="gcur">${tr('当前', 'Current')}</i>` : ''}</div>
        <b>${esc(nm(p.name))}</b>
        <div class="gtags"><span>${bedsOf(p) ? tr(`${bedsOf(p)} 室`, `${bedsOf(p)} BR`) : tr('开间', 'Studio')}</span><span>${tr(`${bathsOf(p)} 卫`, `${bathsOf(p)} BA`)}</span><span>${netOf(p).toFixed(1)} m²</span></div>
        <small>${n != null ? tr(`已布置 ${n} 件 · 自动保存`, `${n} items · autosaved`) : tr('默认布置', 'Default layout')}</small></button><div class="actions"><button class="btn" data-plan-export="${p.id}">导出</button>${p.id.startsWith('custom_')?`<button class="btn" data-plan-delete="${p.id}">删除</button>`:''}</div></article>`; }).join('')}</div>`;
  el.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { galleryF = b.dataset.gf; renderGallery(); });
  el.querySelectorAll('[data-plan-export]').forEach(b=>b.onclick=()=>window.FurnishWorkspace.exportPlan(b.dataset.planExport));
  el.querySelectorAll('[data-plan-delete]').forEach(b=>b.onclick=()=>confirmLibraryDelete(b.dataset.planDelete,b));
  el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { closeDialog(); setPlan(b.dataset.plan); });
}
function confirmLibraryDelete(id,button){
 const p=PLANS.find(p=>p.id===id);if(!p||!id.startsWith('custom_'))return;
 document.querySelectorAll('.gallery-delete-confirm').forEach(el=>{const actions=el.parentElement.querySelector('.actions');actions.hidden=false;actions.style.display='';el.parentElement.querySelector('.gcard').disabled=false;el.remove();});
 const card=button.closest('.gentry'),actions=button.parentElement,open=card.querySelector('.gcard');actions.hidden=true;actions.style.display='none';open.disabled=true;
 const panel=document.createElement('div');panel.className='gallery-delete-confirm';panel.setAttribute('role','group');panel.setAttribute('aria-label','确认删除户型');
 const designs=store.designs.filter(d=>d.planId===id).length;
 panel.innerHTML=`<h4>删除「${esc(p.name)}」？</h4><p>将移除此户型及其布置${designs?`、${designs} 份命名方案`:''}和历史快照。其他户型不受影响。导出文件可用于重新加载。</p><div class="actions"><button class="btn" data-delete-cancel>取消</button><button class="btn" data-delete-backup>导出备份</button><button class="btn danger" data-delete-confirm>确认删除</button></div>`;card.append(panel);
 const cancel=()=>{panel.remove();actions.hidden=false;actions.style.display='';open.disabled=false;button.focus({preventScroll:true});};
 panel.querySelector('[data-delete-cancel]').onclick=cancel;panel.querySelector('[data-delete-backup]').onclick=()=>window.FurnishWorkspace.exportPlan(id);panel.querySelector('[data-delete-confirm]').onclick=()=>deleteLibraryPlan(id);
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}});panel.querySelector('[data-delete-cancel]').focus({preventScroll:true});panel.scrollIntoView({block:'nearest'});
}
function deleteLibraryPlan(id){
 const p=PLANS.find(p=>p.id===id);if(!p||!id.startsWith('custom_'))return;
 if(PLAN.id===id)setPlan(PLANS.find(p=>p.id!==id).id);
 PLANS.splice(PLANS.findIndex(p=>p.id===id),1);store.customPlans=store.customPlans.filter(p=>p.id!==id);delete store.work[id];store.designs=store.designs.filter(d=>d.planId!==id);hist=hist.filter(h=>h.planId!==id);persistHistory();save();buildPlanList();renderDesigns();renderHist();
}
$('#planBtn').onclick = () => openPlans();

/* ======================= 主题 ======================= */
const THEME_KEY = 'huxing-theme';
function curTheme(){ return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
function setTheme(t){
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch(e) {}
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#0c0b09' : '#1b1916';
  PAL = t === 'dark' ? PAL_DARK : PAL_LIGHT;
  const b = $('#themeBtn'), q = $('#themeQuick'), next = t === 'dark' ? tr('亮色', 'Light') : tr('暗色', 'Dark');
  b.innerHTML = ico(t === 'dark' ? 'sun' : 'moon') + next; b.classList.toggle('on', t === 'dark');
  q.innerHTML = ico(t === 'dark' ? 'sun' : 'moon'); q.title = tr(`切换为${next}主题`, `Switch to ${next.toLowerCase()} theme`);
  buildDefs(); renderAll();
  window.View3D?.retheme();
}
$('#themeBtn').onclick = $('#themeQuick').onclick = () => setTheme(curTheme() === 'dark' ? 'light' : 'dark');

initializeHistorySharing();

/* ======================= 打印 ======================= */
let printTheme = null;
addEventListener('beforeprint', () => {
  printTheme = curTheme();
  if (printTheme === 'dark') setTheme('light');           // 打印输出固定用浅色
  const b = PLAN.bounds;
  svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  // 打印抬头：方案名 + 面积表
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  $('#printHead').innerHTML = `<h2>${esc(nm(PLAN.name))} · ${tr('装修方案','Design')}</h2>
    <div class="sub">${new Date().toLocaleString()} · ${tr('套内使用面积','Net area')} ≈ ${fmt(tot)} m² · ${tr('家具','Items')} ${state.furniture.length}${tr(' 件','')}</div>
    <table>${ROOMS.map(r => `<tr><td style="padding-right:16px">${esc(nm(state.rooms[r.id].name))}${r.counted === false ? ' *' : ''}</td><td style="text-align:right">${fmt(area(r.poly))} m²</td></tr>`).join('')}</table>`;
});
addEventListener('afterprint', () => { if (printTheme === 'dark') setTheme('dark'); printTheme = null; applyView(); });
$('#printPlan').onclick = () => window.print();

/* ======================= 家具库：搜索 / 分类 / 最近使用 ======================= */
const libUI = {q:'', cat:'all'};
const RECENT_KEY = 'huxing-recent';
const recentKey = n => typeof n==='string'?'legacy:'+n:n.catalogId?'catalog:'+n.catalogId:n.type+':'+n.name;
const findItem = n => { const matches=[];libAll().forEach((c,ci)=>c.items.forEach((it,ii)=>{if(typeof n==='string'?it[1]===n:n.catalogId?it[7]===n.catalogId:it[0]===n.type&&it[1]===n.name)matches.push([ci,ii]);}));return matches.length===1?matches[0]:null; };
let recents = (() => { try { const r=JSON.parse(localStorage.getItem(RECENT_KEY));return Array.isArray(r)?r.filter(n=>n&&(typeof n==='string'||typeof n==='object')&&findItem(n)).slice(0,8):[]; }catch(e){return [];} })();
function recentsHTML(){
  const L=libAll(),cards=recents.map(findItem).filter(Boolean).map(([ci,ii])=>itemCard(L[ci].items[ii],ci,ii)).join('');
  return cards?'<div id="recentSec"><h4>'+tr('最近使用','Recent')+'</h4><div class="lib-grid">'+cards+'</div></div>':'';
}
function pushRecent(it){
  const entry={type:it[0],name:it[1],...(it[7]?{catalogId:it[7]}:{})};
  recents=[entry,...recents.filter(n=>recentKey(n)!==recentKey(entry))].slice(0,8);
  try{localStorage.setItem(RECENT_KEY,JSON.stringify(recents));}catch(e){}
  const sec=$('#recentSec');if(sec)sec.outerHTML=recentsHTML();else if(libUI.cat==='all'&&!libUI.q.trim())buildLib();
}
function buildCats(){
  const cats = ['all', ...libAll().map(c => c.cat)];
  if (!cats.includes(libUI.cat)) libUI.cat = 'all';
  $('#libCats').innerHTML = cats.map(c => `<button class="btn ${libUI.cat === c ? 'on' : ''}" data-cat="${c}">${c === 'all' ? tr('全部', 'All') : nm(c)}</button>`).join('');
  document.querySelectorAll('#libCats [data-cat]').forEach(b => b.onclick = () => { libUI.cat = b.dataset.cat; buildCats(); buildLib(); });
}


/* ======================= 2D / 3D 切换 ======================= */
let viewMode = '2d', switching = false;
const is3D = () => viewMode === '3d';
const TIPS = () => COARSE
  ? {'2d':tr('点或拖动家具库添加 · 单指拖动平移 · 双指缩放 · 选中家具后底部工具条可旋转 / 复制 / 删除', 'Tap or drag from the library · 1 finger pans · pinch zooms · bottom bar rotates / duplicates / deletes'),
     '3d':tr('单指旋转 · 双指缩放 / 平移 · 点家具或地面编辑 · 点门开关', '1 finger orbits · 2 fingers zoom / pan · tap furniture or floor to edit · tap doors to open')}
  : {'2d':tr('拖动左侧家具到平面图 · 滚轮缩放 · 拖动空白处平移 · T 切换 3D', 'Drag furniture onto the plan · scroll to zoom · drag empty space to pan · T for 3D'),
     '3d':tr('3D 场景与平面方案实时同步 · 右侧面板修改会立即生效 · T 返回 2D', '3D stays in sync with the plan · panel edits apply instantly · T for 2D')};
async function setView(m){
  if (m === viewMode || switching) return;
  if (!window.View3D) return toast(tr('当前浏览器不支持 3D 场景', '3D is not supported in this browser'));
  switching = true; document.body.classList.add('busy');
  try {
    if (m === '3d'){
      // three.js 按需加载：首次进入 3D 时才解析引擎（约 0.7 MB），2D 启动不受影响
      const slow = setTimeout(() => toast(tr('正在加载 3D 引擎…', 'Loading 3D engine…')), 200);
      try { await window.View3D.load(); } finally { clearTimeout(slow); }
      viewMode = m;
      if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await window.View3D.enter();
    } else { viewMode = m; document.body.classList.remove('m3d'); await window.View3D.exit(); applyView(); }
    $('#tip').textContent = TIPS()[m];
  } catch(e) {
    console.error(e);
    viewMode = '2d'; document.body.classList.remove('m3d');
    toast(tr('3D 引擎加载失败', 'Failed to load the 3D engine'));
  } finally { switching = false; document.body.classList.remove('busy'); }
}
document.querySelectorAll('.menu-pop .btn').forEach(b => b.addEventListener('click', () => b.closest('details').open = false));
document.querySelectorAll('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view));
['pointerenter', 'pointerdown', 'focusin'].forEach(t => $('#viewSeg').addEventListener(t, () => window.View3D?.load().catch(() => {}), {once:true}));

document.querySelectorAll('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
function setLayer(k, v){
  ui.layers[k] = v; saveUI(); syncLayerBtns();
  if (k === 'dims') $('#gDims').setAttribute('display', ui.layers.dims ? 'inline' : 'none');
  else if (k === 'clear') renderSel();
  else if (k !== 'wallSnap' && k !== 'guides') renderAll();
}
function syncLayerBtns(){
  document.querySelectorAll('[data-layer]').forEach(b => b.classList.toggle('on', !!ui.layers[b.dataset.layer]));
  document.querySelectorAll('[data-grid]').forEach(b => b.classList.toggle('on', +b.dataset.grid === ui.grid));
}
document.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => setLayer(b.dataset.layer, !ui.layers[b.dataset.layer]));
document.querySelectorAll('[data-grid]').forEach(b => b.onclick = () => { ui.grid = +b.dataset.grid; saveUI(); syncLayerBtns(); });
$('#furnHidden').onclick = () => setLayer('furn', true);
$('#resetBtn').onclick = $('#resetMenu').onclick = () => openReset();
$('#helpBtn').onclick = () => openHelp();
$('#addCustom').onclick = () => openCustom();
$('#exportCsv').onclick = exportCSV;
$('#zoomIn').onclick = () => zoomCenter(1.25);
$('#zoomOut').onclick = () => zoomCenter(.8);
// 点比例在常用出图比例间循环（取比当前更小的下一档，到头回到最大）
$('#hudRatio').onclick = () => { const cur = 1/(view.s*PX_MM), steps = [50, 60, 100, 200]; setRatio(steps.find(r => r > cur + 1) || steps[0]); };
$('#fit').onclick = fitView;
$('#s60').onclick = () => { setRatio(60); toast(tr('已按 1:60 显示（与原始户型图同比例）', 'Showing at 1:60 (same scale as the original plan)')); };
$('#s100').onclick = () => setRatio(100);
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#clearAll').onclick = clearLayout;

/* 全屏：标准 API + Safari（iPad）的 webkit 前缀版本 */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen(){
  const de = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else {
    const req = de.requestFullscreen || de.webkitRequestFullscreen;
    if (!req) return toast(tr('当前浏览器不支持网页全屏，可在 Safari 中「添加到主屏幕」后以全屏方式打开', 'Fullscreen is not supported here — in Safari, use "Add to Home Screen" to open it fullscreen'));
    Promise.resolve(req.call(de)).catch(() => toast(tr('无法进入全屏', 'Could not enter fullscreen')));
  }
}
function syncFullscreen(){
  const on = !!fsEl(), b = $('#fullscreen');
  b.title = (on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')) + ' (Shift+F)';
  b.setAttribute('aria-pressed', on);
}
$('#fullscreen').onclick = toggleFullscreen;
['fullscreenchange', 'webkitfullscreenchange'].forEach(t => document.addEventListener(t, syncFullscreen));
// 已从主屏幕以独立 App 方式打开时本就是全屏，隐藏按钮
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) $('#fullscreen').hidden = true;
$('#tgLib').onclick = () => drawer('lib');
$('#tgPanel').onclick = () => drawer('panel');
// 菜单在顶栏偏左（如户型菜单、折行后的文件菜单）时改为左对齐，避免弹出层超出屏幕
document.querySelectorAll('details.menu').forEach(m => m.addEventListener('toggle', () => {
  if (!m.open) return;
  const pop = m.querySelector('.menu-pop'); pop.classList.remove('pop-left');
  if (pop.getBoundingClientRect().left < 8) pop.classList.add('pop-left');
}));
// 触屏上点菜单以外的地方收起下拉菜单
document.addEventListener('pointerdown', e => { document.querySelectorAll('details.menu').forEach(m => { if (m.open && !m.contains(e.target)) m.open = false; }); });
matchMedia('(max-width:1100px)').addEventListener('change', () => drawer(null));
drawer(null);                                  // 恢复上次的面板收起状态
$('#exportPng').onclick = exportPNG;
$('#exportJson').onclick = () => download(tr('户型装修方案', 'floor-plan-design') + '-' + PLAN.id + '.json',
  new Blob([JSON.stringify({plan:PLAN.id, name:PLAN.name, ...state}, null, 2)], {type:'application/json'}));
$('#importJson').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  file.text().then(txt => {
    try {
      if (file.size > 30e6) throw 'size';
      const s = JSON.parse(txt);
      if(s.architecture&&s.plan&&s.plan!==s.architecture.draft?.id)throw Error('方案户型编号与原始结构不一致');
      const lockedOriginal=store.work[s.architecture?.draft?.id||s.plan]?.architecture;if(lockedOriginal?.phase==='design')s.architecture=FurnishProject.protectOriginal(lockedOriginal,s.architecture);
      if (!Array.isArray(s.furniture) || s.furniture.length > 2000) throw 0;
      const meshItems=s.furniture.filter(f=>f?.obj);if(meshItems.length)FurnishProject.validateWork({furniture:meshItems.map(f=>({...f,id:f.id||uid(),rot:typeof f.rot==='number'?f.rot:0}))});
      FurnishProject.validateWork({...s,furniture:[]});
      const target=s.architecture?FurnishDraft.build(s.architecture.draft):s.plan?PLANS.find(p=>p.id===s.plan):PLAN;if(!target)throw Error('文件引用了不存在的户型');
      const total=s.furniture.length,prepared=fixWork(s,target);if(total&&!prepared.furniture.length)throw Error('文件没有可加载的有效家具');
      const checked=FurnishProject.validateWork(prepared);FurnishProject.validatePlanWork(target,checked);
      snapshot(true,state,'加载旧方案前');registerCustomWork(checked);if(target.id!==PLAN.id)setPlan(target.id);
      const b=snap();state=checked;ui.sel=null;commit(b);renderAll();
      const skipped = total - state.furniture.length;
      toast(tr(`方案已导入：${state.furniture.length} 件家具`, `Imported ${state.furniture.length} items`)
        + (skipped ? tr(`，跳过 ${skipped} 条无效数据`, `, skipped ${skipped} invalid`) : ''), {label:tr('撤销', 'Undo'), fn:undo});
    }
    catch(err){ toast(err === 'size' ? tr('文件过大（上限 30MB）', 'File too large (max 30MB)') : tr('无法加载：', 'Cannot load: ')+(err?.message||tr('文件格式不正确','Invalid file format'))); }
  });
  e.target.value = '';
};
$('#libSearch').addEventListener('input', e => { libUI.q = e.target.value; buildLib(); });
// 横竖屏切换、表头换行等都会改变画布尺寸；尺寸从 0 恢复（如首次布局）时重新适应窗口
// 其余尺寸变化（收起 / 展开面板等）保持画面中心不动
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
}).observe(svg);

function setLang(l){
  LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch(e) {}
  applyStaticLang(); syncFullscreen(); syncModeHint(); syncPaneBtns();
  buildCats(); buildLib(); buildPlanList(); renderDesigns(); renderHist(); renderOpenings(); renderAll(); syncSaved();
  setTheme(curTheme());
  $('#tip').textContent = TIPS()[viewMode];
  window.View3D?.relang();
}

$('#langSel').onclick = e => { const l = e.target.closest('[data-lang]')?.dataset.lang; if (l && l !== LANG) setLang(l); };

applyStaticLang(); syncFullscreen();
setTheme((() => { try { return localStorage.getItem(THEME_KEY); } catch(e) { return null; } })() ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyPlanData(); state.furniture = sanitizeFurn(state.furniture, PLAN);
syncLayerBtns(); buildCats(); buildLib(); buildPlanList(); renderOpenings(); renderDims();
$('#tip').textContent = TIPS()['2d'];
fitView(); renderAll(); renderDesigns(); syncSaved();
