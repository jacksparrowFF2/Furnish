/* Classic script: panel/CSV adapters read the live app state when called.
 * Calculations stay in FurnishProject; load before app.js initialization. */
// 全屋预算：地面（含 5% 损耗）+ 墙面乳胶漆（周长×层高，扣门窗洞口，含 10% 损耗，28 元/m²）+ 家具家电参考价
function budget(){ return FurnishProject.estimate(FurnishProject.effectivePlan(PLAN,state),state,MATS,priceOf); }
const yen = v => '¥' + Math.round(v).toLocaleString();

function alertsHTML(){
  const lost = state.furniture.filter(isOutside).length, clashN = collisions().length;
  let s = '';
  if (saveErr) s += `<div class="alert">${ico('warn')}<span>${tr('自动保存失败（浏览器存储空间不足）。请导出方案 JSON 备份。', 'Autosave failed (storage full). Export the plan JSON as a backup.')}</span></div>`;
  if (lost) s += `<div class="alert">${ico('warn')}<span>${tr(`${lost} 件家具在户型外，画面上可能看不到`, `${lost} item(s) are outside the plan and may be off-screen`)}</span><button class="btn" data-act="rescue">${tr('移回', 'Bring back')}</button></div>`;
  if (clashN) s += `<div class="alert">${ico('warn')}<span>${tr(`${clashN} 处家具互相重叠`, `${clashN} furniture overlap(s)`)}</span><button class="btn" data-act="clash">${tr('选中', 'Select')}</button></div>`;
  return s;
}

function overviewPanel(){
  const B = budget();
  const rows = ROOMS.map(r => {
    const st = state.rooms[r.id];
    return `<tr class="click" data-room="${r.id}"><td><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(nm(st.name))}${r.counted===false?' <span class="muted">*</span>':''}</td>
      <td class="r">${fmt(area(r.poly))} m²</td></tr>`;
  }).join('');
  const maxMat = Math.max(...B.mats.map(m => m.a));
  const matRows = B.mats.map(({m,a,c}) => `<tr><td><span class="sw" style="background:${MATS[m].sw}"></span>${nm(MATS[m].name)}</td><td class="r">${fmt(a,1)} m²</td><td class="r">${yen(c)}</td></tr>
      <tr class="barrow"><td colspan="3"><div class="cbar"><i style="width:${Math.max(4, a/maxMat*100).toFixed(1)}%;background:${MATS[m].sw}"></i></div></td></tr>`).join('');
  const demLen = state.architecture?FurnishProject.quantities(PLAN,state.architecture).removed:state.demolished.map(id => WALLS[+id.slice(1)]).reduce((a,w) => a + Math.max(w[2]-w[0], w[3]-w[1]), 0) / 1000;
  const locked = state.furniture.filter(f => f.locked).length;
  return `${alertsHTML() ? `<section>${alertsHTML()}</section>` : ''}
  <section class="hero"><h3>${tr('全屋预算粗估','Whole-home Budget')} <small>${tr('参考价，仅供估算','reference prices')}</small></h3>
    <table>
      <tr><td>${tr(`地面材料（含 ${B.settings.floorWaste}% 损耗）`,`Flooring (incl. ${B.settings.floorWaste}% waste)`)}</td><td class="r">${fmt(B.counted.reduce((a,r) => a + area(r.poly), 0),1)} m²</td><td class="r">${yen(B.floor)}</td></tr>
      <tr><td>${tr(`墙面乳胶漆（含 ${B.settings.paintWaste}% 损耗）`,`Wall paint (incl. ${B.settings.paintWaste}% waste)`)}</td><td class="r">${fmt(B.paintQuantity,1)} m²</td><td class="r">${yen(B.paint)}</td></tr>
      <tr><td>${tr('家具家电','Furniture & appliances')}</td><td class="r">${state.furniture.length} ${tr('件','pcs')}</td><td class="r">${yen(B.furn)}</td></tr>
      <tr><td>${tr('装修工程','Renovation')}</td><td class="r">${B.extra.length} ${tr('项','items')}</td><td class="r">${yen(B.renovation)}</td></tr>
    </table>
    <div class="total"><span>${tr('粗估合计','Estimated total')}</span><b>${yen(B.total)}</b></div>
    <div class="comp" title="${tr('预算构成','Budget breakdown')}"><i class="c1" style="flex:${B.floor}"></i><i class="c2" style="flex:${B.paint}"></i><i class="c3" style="flex:${B.furn || .0001}"></i><i style="background:#8b78b5;flex:${B.renovation || .0001}"></i></div>
    <div class="comp-l"><span><i class="c1"></i>${tr('地面','Floors')} ${Math.round(B.total?B.floor/B.total*100:0)}%</span><span><i class="c2"></i>${tr('墙面','Walls')} ${Math.round(B.total?B.paint/B.total*100:0)}%</span><span><i class="c3"></i>${tr('家具','Furniture')} ${Math.round(B.total?B.furn/B.total*100:0)}%</span><span><i style="background:#8b78b5"></i>${tr('工程','Renovation')} ${Math.round(B.total?B.renovation/B.total*100:0)}%</span></div>
    <div class="actions"><button class="btn" data-tab="quote">${ico('coin')}${tr('报价明细','Quote details')}</button><button class="btn" data-act="csv">${ico('download')}${tr('导出 CSV','Export CSV')}</button></div></section>
  <section><h3>${tr('风格方案','Style Presets')} <small>${tr('一键统一家具配色与地面','recolor furniture & floors in one click')}</small></h3>${stylesHTML()}</section>
  <section><h3>${tr('房间面积','Room Areas')} <small>${tr('点击查看 / 更换地面','Click to view / change flooring')}</small></h3>
    <table>${rows}</table>
    <div class="total"><span>${tr('套内使用面积','Net floor area')}</span><b>${fmt(B.tot)} m²</b></div>
    <div class="muted note">${tr('* 飘窗不计入使用面积；面积按墙体内净尺寸计算','* Bay windows are excluded; areas use net inner wall dimensions')}</div></section>
  <section><h3>${tr('地面材料估算','Flooring Estimate')} <small>${tr('含 5% 损耗','incl. 5% waste')}</small></h3>
    <table>${matRows}</table>
    <div class="total"><span>${tr('地面材料合计','Flooring total')}</span><b>${yen(B.floor)}</b></div>
    <div class="muted note">${tr(`墙面面积 ${fmt(B.wallArea,1)} m²（周长×2.8m）已扣门窗洞口；乳胶漆按 28 元/m² 估算`, `Wall ${fmt(B.wallArea,1)} m² (perimeter×2.8m) minus openings; paint at ¥28/m²`)}</div></section>
  <section><h3>${tr('方案统计','Plan Stats')}</h3>
    <div class="stats"><div><small>${tr('家具数量','Furniture')}</small><span class="big">${state.furniture.length}</span>${locked ? ` <small>${tr(`其中 ${locked} 件锁定`, `${locked} locked`)}</small>` : ''}</div>
      <div><small>${tr('拆除墙体','Walls removed')}</small><span class="big">${fmt(demLen,1)}</span> m</div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${tr('清除测量','Clear measures')} (${state.measures.length})</button>
      <button class="btn" data-act="reset">${ico('reset')}${tr('重置…','Reset…')}</button>
      <button class="btn danger" data-act="clearFurn">${tr('清空布置','Clear layout')}</button></div></section>
  <section><h3>${tr('常用操作','Quick Tips')}</h3><div class="kbd">
    ${COARSE ? tr(`<kbd>点 / 拖家具库</kbd><span>添加家具</span><kbd>长按家具</kbd><span>弹出操作菜单（复制 / 镜像 / 锁定…）</span><kbd>框选工具</kbd><span>拖出矩形一次选中多件</span><kbd>双指</kbd><span>缩放、平移画面</span>`,
      `<kbd>Tap / drag library</kbd><span>Add furniture</span><kbd>Long-press item</kbd><span>Action menu (copy / mirror / lock…)</span><kbd>Box tool</kbd><span>Drag to select several</span><kbd>2 fingers</kbd><span>Zoom and pan</span>`)
    : tr(`<kbd>右键</kbd><span>家具 / 画布操作菜单</span><kbd>Shift+点击</kbd><span>多选，或 Shift+拖动框选</span><kbd>Ctrl C / V</kbd><span>复制 / 粘贴到指针处</span><kbd>空格+拖动</kbd><span>平移画面</span><kbd>R · H · L</kbd><span>旋转 · 镜像 · 锁定</span>`,
      `<kbd>Right-click</kbd><span>Item / canvas menu</span><kbd>Shift+click</kbd><span>Multi-select, or Shift+drag to box</span><kbd>Ctrl C / V</kbd><span>Copy / paste at pointer</span><kbd>Space+drag</kbd><span>Pan</span><kbd>R · H · L</kbd><span>Rotate · mirror · lock</span>`)}
  </div><div class="actions"><button class="btn" data-act="help">${ico('kbd')}${tr('全部快捷键','All shortcuts')}</button></div></section>`;
}
function bindOverview(){
  document.querySelectorAll('#panel tr[data-room]').forEach(tr => tr.onclick = () => { select({kind:'room', id:tr.dataset.room}); if (is3D()) window.View3D.flyToRoom(tr.dataset.room); });
  $('#clearMeasure').onclick = () => state.measures.length && mutate(() => state.measures = []);
}

// 清单：按所在房间分组；户型外 / 不在任何房间内的家具单独列出
function listPanel(){
  const groups = new Map(ROOMS.map(r => [r.id, []])); groups.set('__none', []); groups.set('__out', []);
  state.furniture.forEach(f => { const r = isOutside(f) ? null : roomAt(f.cx, f.cy); groups.get(isOutside(f) ? '__out' : r ? r.id : '__none').push(f); });
  const ids = new Set(selIds());
  const row = f => `<div class="irow ${ids.has(f.id) ? 'on' : ''} ${clashIds.has(f.id) ? 'clash' : ''}" data-focus="${f.id}" title="${tr('点击定位', 'Click to locate')}">
      <span class="sw" style="background:${esc(f.color)}"></span><span class="nm">${clashIds.has(f.id) ? '⚠ ' : ''}${esc(nm(f.name))}</span><small>${f.w}×${f.d}</small>
      <button class="ib ${f.locked ? 'on' : ''}" data-lockid="${f.id}" title="${f.locked ? tr('解锁', 'Unlock') : tr('锁定', 'Lock')}">${ico(f.locked ? 'lock' : 'unlock')}</button></div>`;
  let s = '';
  groups.forEach((list, k) => {
    if (!list.length) return;
    const title = k === '__out' ? `<span style="color:var(--danger)">${tr('户型外（画面上可能看不到）', 'Outside the plan (may be off-screen)')}</span>`
      : k === '__none' ? tr('墙上 / 门口等（不在房间内）', 'On walls / in doorways') : esc(nm(state.rooms[k].name));
    s += `<div class="ghd"><span>${title} · ${list.length}</span>${k === '__out' ? `<button class="ib" data-act="rescue" title="${tr('全部移回', 'Bring all back')}">${ico('target')}</button>` : ''}</div>${list.map(row).join('')}`;
  });
  return `<section>${alertsHTML()}
    <div class="actions" style="margin:0 0 8px"><button class="btn" data-act="selAll">${tr('全选','Select all')} (Ctrl+A)</button><button class="btn" data-act="custom">${ico('plus')}${tr('自定义家具','Custom item')}</button></div>
    ${s || `<div class="muted">${tr('还没有家具：从左侧家具库点击或拖入。', 'No furniture yet — click or drag from the library.')}</div>`}</section>`;
}

// 报价和采购清单按真实规格、品牌型号及状态区分。
function quoteRows(){
  const B = budget(), purchases=FurnishProject.procurement(FurnishProject.effectivePlan(PLAN,state),state,priceOf);
  const rows = purchases.items.sort((a,b)=>b.total-a.total).map(f=>[tr('家具家电','Furniture'),nm(f.name)+([f.brand,f.model].filter(Boolean).length?' · '+[f.brand,f.model].filter(Boolean).join(' '):''),`${f.w}×${f.d}${f.h?'×'+f.h:''} · ${FurnishProject.purchaseStates[f.status]}`,f.quantity,tr('件','pcs'),f.price,f.total]);
  B.mats.forEach(({m, quantity, price, c}) => rows.push([tr('地面', 'Flooring'), nm(MATS[m].name), `${B.settings.floorWaste}%`, +quantity.toFixed(2), 'm²', price, c]));
  rows.push([tr('墙面', 'Walls'), tr('乳胶漆', 'Latex paint'), `${B.settings.paintWaste}%`, +B.paintQuantity.toFixed(2), 'm²', B.settings.paintPrice, B.paint]);
  B.extra.forEach(r=>rows.push([tr('装修工程','Renovation'),r.name,r.source==='manual'?tr('手填工程量','Manual quantity'):tr('随户型自动计算','Auto quantity'),+r.quantity.toFixed(2),r.unit,r.price,r.total]));
  return {rows, B};
}
function quotePanel(){
  const {rows, B} = quoteRows();
  let cat = '', s = '';
  rows.forEach(r => { if (r[0] !== cat){ cat = r[0]; s += `<tr class="sub"><td colspan="3">${esc(cat)}</td></tr>`; }
    s += `<tr><td>${esc(r[1])}<br><small class="muted">${esc(r[2])}</small></td><td class="num">${r[3]} ${r[4]}<br><small class="muted">@ ${yen(r[5])}</small></td><td class="num">${yen(r[6])}</td></tr>`; });
  return `<section><h3>${tr('报价明细','Quote')} <small>${tr('参考价，可在家具属性中改单价','reference prices — edit unit price in item properties')}</small></h3>
    <table class="qt">${s}</table>
    <div class="total"><span>${tr('家具家电','Furniture')}</span><b>${yen(B.furn)}</b></div>
    <div class="total"><span>${tr('地面 + 墙面','Floors + walls')}</span><b>${yen(B.floor + B.paint)}</b></div>
    <div class="total"><span>${tr('装修工程','Renovation')}</span><b>${yen(B.renovation)}</b></div>
    <div class="total" style="font-size:16px"><span>${tr('合计','Total')}</span><b>${yen(B.total)}</b></div>
    <div class="actions"><button class="btn" data-act="csv">${ico('download')}${tr('导出 CSV（Excel 可打开）','Export CSV (opens in Excel)')}</button></div></section>`;
}
function exportCSV(){
  const {rows, B} = quoteRows();
  const head = [tr('类别','Category'), tr('名称','Item'), tr('规格','Spec'), tr('数量','Qty'), tr('单位','Unit'), tr('单价','Unit price'), tr('小计','Subtotal')];
  const lines = [head, ...rows.map(r => [...r.slice(0, 5), Math.round(r[5]), Math.round(r[6])]), [], ['', tr('合计','Total'), '', '', '', '', Math.round(B.total)]];
  download(`${tr('报价清单','quote')}-${nm(PLAN.name)}.csv`, new Blob([FurnishProject.csv(lines)], {type:'text/csv;charset=utf-8'}));
}
