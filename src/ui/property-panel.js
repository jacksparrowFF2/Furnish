/* Property panels and note editing. Classic script declarations only;
 * read the current application state when called, including after undo/load. */
function renderPanel(){
  window.FurnishWorkspace?.clearOpeningPreview();
  renderFab();
  const p = $('#panel'), ids = selIds();
  if (ids.length > 1){ p.innerHTML = multiPanel(selItems()); return; }
  if (ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ if(furnitureError(f)){renderBrokenFurniturePanel(f,p);return;}try{p.innerHTML = furnPanel(f); bindFurnPanel(f);}catch(e){furnitureRenderErrors.set(f.id,e.message||String(e));renderBrokenFurniturePanel(f,p);}return; } }
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
function renderBrokenFurniturePanel(f,p){
 p.innerHTML=`<section><h3>${esc(nm(f.name))}</h3><p class="project-error" role="alert">${esc(furnitureError(f))}</p><p>${tr('原方案记录已保留。画布虚线框仅表示保存的外包尺寸，空间核对待修复。','Original record retained. The dashed box shows the saved envelope; spatial checks require repair.')}</p><p>${f.w} × ${f.d} mm</p>${f.kitchen?`<p>${tr('按现有宽深修复会按每边原比例调整模块；按模块修复会重新计算总宽深。位置、旋转、镜像和其他资料保留，可撤销。','Keep envelope to scale modules proportionally, or keep modules to recalculate the envelope. Position and other details are retained; repairs can be undone.')}</p><div class="actions"><button class="btn primary" id="repair-kitchen-envelope" ${f.locked?'disabled':''}>${tr('按现有宽深修复模块','Keep envelope; repair modules')}</button><button class="btn" id="repair-kitchen-modules" ${f.locked?'disabled':''}>${tr('按模块修复总宽深','Keep modules; repair envelope')}</button></div>`:''}${f.locked?`<button class="btn" data-act="lock">${tr('解锁','Unlock')}</button>`:''}<button class="btn" id="broken-furniture-backup">${tr('备份当前原始方案 JSON','Back up raw plan JSON')}</button><p id="model-repair-error" role="alert"></p></section>`;
 for(const [id,keep] of [['repair-kitchen-envelope',true],['repair-kitchen-modules',false]]){const b=$('#'+id);if(b)b.onclick=()=>{try{const next=FurnishKitchen.repairDimensions(getF(f.id),keep);mutate(()=>Object.assign(getF(f.id),next));}catch(e){$('#model-repair-error').textContent=e.message;}};}
 $('#broken-furniture-backup').onclick=()=>download(PLAN.id+'-recovery.json',new Blob([JSON.stringify({plan:PLAN.id,name:PLAN.name,...state},null,2)],{type:'application/json'}));
}

// 底部浮动工具条：触屏没有键盘，常用操作都放在这里
function renderFab(){
  const fab = $('#fab'), ids = selIds(), f = ids.length === 1 && getF(ids[0]), r = ui.sel?.kind === 'room' && ROOMS.find(r => r.id === ui.sel.id);
  if (!ids.length && !r){ fab.classList.remove('show'); return; }
  const b = (act, icon, label, cls = '') => `<button class="btn ${cls}" data-act="${act}" title="${label}">${ico(icon)}</button>`;
  fab.innerHTML = ids.length
    ? `<span class="name">${f ? esc(nm(f.name)) : tr(`已选 ${ids.length} 件`, `${ids.length} selected`)}</span>`
      + b('rotL', 'rotL', tr('逆时针 90°', 'Rotate left')) + b('rotR', 'rotR', tr('顺时针 90°', 'Rotate right')) + b('flip', 'flip', tr('镜像', 'Mirror'))
      + (ids.length>1?`<button class="btn" data-act="${selItems().every(f=>f.groupId&&f.groupId===selItems()[0].groupId)?'ungroup':'group'}">${selItems().every(f=>f.groupId&&f.groupId===selItems()[0].groupId)?tr('解组','Ungroup'):tr('打组','Group')}</button>`:'')
      + b('lock', selItems().every(x => x.locked) ? 'lock' : 'unlock', tr('锁定 / 解锁', 'Lock / unlock')) + b('dup', 'copy', tr('复制一份', 'Duplicate')) + b('del', 'trash', tr('删除', 'Delete'), 'danger')
      + `<span class="sep"></span><button class="btn narrow-only" data-act="prop">${tr('属性','Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(state.rooms[r.id].name))}</span><button class="btn" data-act="roomFurn">${tr('选中房间内家具','Select its furniture')}</button><button class="btn narrow-only" data-act="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-act="done">${tr('完成','Done')}</button>`;
  fab.classList.add('show');
}


function roomPanel(r){
  const st = state.rooms[r.id], a = area(r.poly), [x0,y0,x1,y1] = bbox(r.poly), inside = state.furniture.filter(f => inPoly(f.cx, f.cy, r.poly));
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>¥${m.price}/m²</small></span></button>`).join('');
  return `<section><h3>${r.zone?tr('功能区','Functional area'):tr('房间','Room')}</h3>
    <div class="form"><label class="full">${tr('名称','Name')}<input id="rName" maxlength="80" value="${esc(nm(st.name))}"></label><label class="full">${tr('房间用途','Room use')}<select id="rUse" ${r.counted===false?'disabled':''}>${Object.entries(FurnishDesign.uses).filter(([id])=>r.counted===false?id==='bay':id!=='bay').map(([id,n])=>`<option value="${id}" ${FurnishDesign.inferUse(r,st)===id?'selected':''}>${tr(...n)}</option>`).join('')}</select></label></div>
    ${r.counted!==false?`<div class="form"><label class="full">${tr('房间净高 / 吊顶完成面 mm','Room clear height / finished ceiling mm')}<input id="rCeilingHeight" type="number" min="1000" max="10000" step="10" value="${st.ceilingHeight??''}" placeholder="${FurnishProject.ceilingHeight(state)}"></label></div><p class="muted">${tr(`当前有效净高 ${FurnishProject.roomCeilingHeight(state,r)} mm；留空沿用项目层高。用于本房间天花板、热水器顶部预留与柜门上翻检查，随项目保存。`,`Effective clear height ${FurnishProject.roomCeilingHeight(state,r)} mm; leave empty to inherit project height. Used for this room's ceiling, heater clearance and cabinet opening checks; saved with the project.`)}</p><button class="btn" id="room-zones">划分功能区（不加墙）</button>`:''}<p class="muted">${tr('风格方案按用途匹配地面，修改名称不会改变已设置的用途。','Styles use room purpose; renaming preserves the selected purpose.')}</p>
    <div class="stats mt">
      <div><small>${tr('使用面积','Floor area')}</small><span class="big">${fmt(a)}</span> m²</div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${fmt((r.rings||[r.poly]).reduce((n,p)=>n+perim(p),0),1)}</span> m</div>
      <div><small>${tr('开间','Width')}</small><span class="big">${x1-x0}</span> mm</div>
      <div><small>${tr('进深','Depth')}</small><span class="big">${y1-y0}</span> mm</div></div>
    <div class="muted">${r.zone?tr('功能区分界不产生实际墙体；墙面工程量按原空间轮廓计算。','Functional boundaries do not create walls; wall quantities use the physical space.'):tr(`墙面面积（层高 ${FurnishProject.ceilingHeight(state)/1000}m，未扣门窗）约 ${fmt(perim(r.poly)*FurnishProject.ceilingHeight(state)/1000,1)} m²`, `Wall area (${FurnishProject.ceilingHeight(state)/1000}m ceiling, openings not deducted) ≈ ${fmt(perim(r.poly)*FurnishProject.ceilingHeight(state)/1000,1)} m²`)}</div></section>
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
  const zones=$('#room-zones');if(zones)zones.onclick=()=>{FurnishEditor.open();document.querySelector('[data-trace-mode="zone"]')?.click();};
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  $('#rUse').onchange = e => mutate(() => state.rooms[id].use = e.target.value);
  const ceiling=$('#rCeilingHeight');if(ceiling)ceiling.onchange=e=>{try{const value=e.target.value.trim(),height=value===''?undefined:FurnishProject.ceilingHeight({ceilingHeight:Number(value)});mutate(()=>{if(height===undefined)delete state.rooms[id].ceilingHeight;else state.rooms[id].ceilingHeight=Math.round(height);});}catch(err){toast(err.message);renderPanel();}};
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
}

const SWATCHES = ['#ffffff','#efe6d8','#e2cfb4','#d6b99a','#a57c56','#c9d6df','#c3cbd6','#d8c7dc','#b7c4b0','#9dbb8c','#cfc6b8','#8a7a5e','#4a4f55','#1f1d1b'];
function waterheaterInstallationPanel(f){
  if(f.type!=='waterheater_flat')return '';
  const checks=FurnishDesign.waterheaterClearances(FurnishProject.effectivePlan(PLAN,state),f,{furniture:state.furniture||[]}),mm=v=>String(Math.floor((v+1e-6)*10)/10),shortfall=v=>String(Math.ceil((v-1e-6)*10)/10);
  const row=(label,check,top=false)=>check.gap===null
    ? `<p class="muted">${label}：${tr(top?'未找到所在房间，请调整位置并核对至少':'未找到该方向墙体或已知高度家具，请核对至少',top?'No room found; adjust position and verify at least':'No wall or furniture with known height found in this direction; verify at least')} ${check.required} mm ${tr('预留空间','clearance')}。</p>`
    : `<p class="${check.ok===false?'project-error':'muted'}">${label}：${mm(check.gap)} mm · ${tr('要求至少','Requires at least')} ${check.required} mm${check.ok===null?' · '+tr('待核对家具高度','Verify furniture height'):check.ok?' · '+tr('满足','Met'):' · '+tr('不足','Short by')+' '+shortfall(check.required-check.gap)+' mm'}</p>`;
  const s=f.heaterSocket,lk=f.locked?'disabled':'';
  const socketRow=checks.socket.gap===null?`<p class="muted">${tr('机身到插座：插座位置未设置，待核对至少 300 mm；不以右侧墙体或家具距离代替。','Heater to socket: position unset; verify at least 300 mm. Side walls or furniture do not determine this distance.')}</p>`:row(tr('机身到插座净距','Heater to socket clearance'),checks.socket);
  return `<h3>${tr('热水器安装预留','Heater installation clearance')}</h3><div id="waterheater-clearance" role="status" aria-live="polite">${row(tr('顶部净距','Top clearance'),checks.top,true)}${socketRow}</div><p class="muted small">${tr(`顶部按${checks.room?esc(nm(checks.room.name))+'的房间净高':'项目层高'} ${checks.ceilingHeight??'未知'} mm 核对；插座净距为机身外包面到插座中心的最短三维直线距离，不限制插座必须在右侧，也不代表电源线走线路径长度。`,`Top checked against ${checks.room?esc(nm(checks.room.name))+' room clear height':'project ceiling height'} of ${checks.ceilingHeight??'unknown'} mm. Socket clearance is the shortest 3D distance from the body envelope to the socket centre, on any side; not the cable route length.`)}</p><div class="form"><label class="full">${tr('插座位置','Socket position')}<select id="heaterSocketMode" ${lk}><option value="unset" ${!s?'selected':''}>${tr('未定 · 待核对','Unset · unverified')}</option><option value="set" ${s?'selected':''}>${tr('已定位 · 输入坐标','Located · enter coordinates')}</option></select></label>${s?['x','y','z'].map((key,i)=>`<label class="${i===2?'full':''}">${i===2?tr('插座中心离地高度','Socket centre height'):tr('插座中心','Socket centre')+' '+key.toUpperCase()} (mm)<input type="number" id="heaterSocket${key.toUpperCase()}" value="${s[key]}" min="${i===2?0:-1000000}" max="${i===2?20000:1000000}" step="10" ${lk}></label>`).join(''):''}</div>${s?`<p class="muted small">${tr('插座坐标固定在项目中；移动或旋转热水器不会移动插座。默认坐标只是输入起点，请按实际位置修改。','Socket coordinates stay fixed when the heater moves or rotates. Initial coordinates are placeholders; enter the actual location.')}</p>`:''}<button class="btn" id="heater-ceiling-settings">${checks.room?tr('修改房间净高','Change room clear height'):tr('修改层高','Change ceiling height')}</button>`;
}
function furnPanel(f){
  const fridge=['fridge','fridge_french_drawer'].includes(f.type);
  const fridgeCabinets=fridge?state.furniture.filter(g=>!furnitureError(g)&&FurnishCabinet.supported(g)&&g.cabinet?.sideboard&&g.cabinet.columns.some(col=>col.fridgeBay)).sort((a,b)=>Math.hypot(a.cx-f.cx,a.cy-f.cy)-Math.hypot(b.cx-f.cx,b.cy-f.cy)):[];
  const laundry=FurnishDesign.products().family(f,'laundry');
  const robotSpec=typeof FurnishRobotVacuumModel!=='undefined'?FurnishRobotVacuumModel.specs[f.type]:null;
  const r = isOutside(f) ? null : roomAt(f.cx, f.cy), custom = f.type === 'custom' || f.type === 'customround', lk = f.locked ? 'disabled' : '';
  const clashWith = collisions().filter(p => p.includes(f.id)).map(p => getF(p[0] === f.id ? p[1] : p[0])).filter(Boolean);
  const fridgeConflictDetails=clashWith.flatMap(g=>{const fit=FurnishCabinet.fridgeBayFit(f,g)||FurnishCabinet.fridgeBayFit(g,f)||FurnishCabinet.hoodBayFit(f,g)||FurnishCabinet.hoodBayFit(g,f);return fit&&!fit.fits?fit.reasons:[];});
  const btn = (act, icon, label, on) => `<button class="btn ${on ? 'on' : ''}" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const pad = Math.max(f.w, f.d)*.1;
  return `<section><div class="fhead"><div class="fthumb"><svg viewBox="${-f.w/2-pad} ${-f.d/2-pad} ${f.w+2*pad} ${f.d+2*pad}">${f.flip ? `<g transform="scale(-1 1)">${furnSVG(f.type,f.w,f.d,f.color,f)}</g>` : furnSVG(f.type,f.w,f.d,f.color,f)}</svg></div>
      <div><b>${esc(nm(f.name))}</b><small>${f.w} × ${f.d} mm · ${yen(priceOf(f))}</small>${f.locked ? `<span class="tag">${ico('lock')}${tr('已锁定','Locked')}</span>` : ''}</div></div>
    <h3>${tr('家具属性','Furniture')}</h3>
    ${FurnishCabinet.supported(f)||f.kitchen?`<button class="btn primary" id="cabinet-edit" ${lk}>${tr('柜体详细设计','Design cabinet')}</button><p class="muted">${f.kitchen?tr('设计厨房形状、左右转角、模块与台面尺寸；三维预览，保存后应用，取消保留原方案。','Edit kitchen corners, modules and countertop with a 3D draft preview.'):tr('设计尺寸、分区、层板、抽屉和柜门；3D 中双击柜体也可进入。','Edit dimensions, bays, shelves, drawers and doors; double-click the cabinet in 3D to open.')}</p>`:''}
    ${fridge&&fridgeCabinets.length?`<div class="form"><label class="full">${tr('目标餐边柜','Target sideboard')}<select id="fridge-bay-target" ${lk}>${fridgeCabinets.map(g=>`<option value="${esc(g.id)}">${esc(nm(g.name))} · ${g.w}×${g.d} mm</option>`).join('')}</select></label></div><button class="btn" id="fridge-center-bay" ${lk}>${tr('在冰箱位左右居中','Center within fridge bay')}</button><p class="muted">${tr('只沿柜体宽度方向移动冰箱，前后位置及朝向保持不变。调整柜体后可再次点击对齐。','Moves only across the cabinet width; front/back position and orientation stay unchanged. Click again after moving or resizing the cabinet.')}</p>`:''}
    ${f.type==='curtain'?`<div class="form"><label class="full">${tr('窗帘样式','Curtain style')}<select id="curtainStyle" ${lk}><option value="single" ${f.curtainStyle==='single'?'selected':''}>${tr('单开 · 向一侧收拢','Single · stack to one side')}</option><option value="double" ${f.curtainStyle!=='single'?'selected':''}>${tr('双开 · 向两侧收拢','Double · stack to both sides')}</option></select></label></div><p class="muted">${tr('3D 点击布幔开启／关闭；单开窗帘可用镜像改变收拢侧。','Click cloth in 3D to open or close; mirror a single curtain to switch sides.')}</p>`:''}
    ${FurnishDesign.products().supports(f,'floorTrack')?`<div class="form"><label class="full">${tr('下轨道','Bottom track')}<select id="fFloorTrack" ${lk}><option value="false" ${(FurnishDesign.products().value(f,'floorTrack'))===false?'selected':''}>${tr('无地轨 · 吊轨','No floor track')}</option><option value="true" ${(FurnishDesign.products().value(f,'floorTrack'))===true?'selected':''}>${tr('有下轨道','With bottom track')}</option></select></label></div><p class="muted">${tr('进入 3D 点击门窗扇开关；镜像可改变叠合侧。独立门窗按家具摆放；墙体洞口请在「编辑户型」中添加门窗，再选中洞口设置扇型。','Click panels in 3D to open or close; mirror to change the stacking side. For a wall opening, add a door or window in the floor-plan editor and then select its panel style.')}</p>`:''}
    ${isOutside(f) ? `<div class="alert">${ico('warn')}<span>${tr('这件家具在户型外','This item is outside the plan')}</span><button class="btn" data-act="rescueOne">${tr('移回','Bring back')}</button></div>` : ''}
    ${clashWith.length ? `<div class="alert">${ico('warn')}<span>${tr('与以下家具重叠：','Overlaps: ')}${clashWith.map(g => esc(nm(g.name))).join('、')}</span></div>` : ''}
    ${fridgeConflictDetails.length?`<div class="alert" id="fridge-bay-conflict-details"><span>${fridgeConflictDetails.map(message=>esc(message)).join('<br>')}</span></div>`:''}
    <div class="form">
      ${f.type==='shower_arrow_cream'?`<label>${tr('顶部调节段','Upper rise')} (mm)<input id="fShowerRise" type="number" min="${FurnishDesign.products().fields.showerRise.min}" max="${FurnishDesign.products().fields.showerRise.max}" value="${FurnishDesign.products().value(f,'showerRise')}" ${lk}></label><label>${tr('手持倾角','Hand shower tilt')} (°)<input id="fShowerHandAngle" type="number" min="${FurnishDesign.products().fields.showerHandAngle.min}" max="${FurnishDesign.products().fields.showerHandAngle.max}" step="1" value="${Math.round(FurnishDesign.products().value(f,'showerHandAngle')*100)/100}" ${lk}></label><p class="muted" style="grid-column:1/-1">${tr('升降仅移动上部弯管和顶喷；手持以夹座为轴旋转。倾角 0–35° 为展示范围，厂家限位未标注。高度字段为顶部调节段 400 mm 时的基准高度。','Rise moves the upper pipe and rain head; the hand shower pivots at its holder. Tilt range is for display. Height is the baseline at a 400 mm rise.')}</p>`:''}
      ${f.type==='shower_arrow_cream'?`<label class="full">${tr('混水器中心离地高度','Mixer centre above floor')} (mm)<input id="fShowerMixerHeight" type="number" min="${FurnishDesign.products().fields.showerMixerHeight.min}" max="${FurnishDesign.products().fields.showerMixerHeight.max}" step="1" value="${Math.round(FurnishDesign.showerInstallation(f).mixer*100)/100}" ${lk}></label><p class="muted" style="grid-column:1/-1">${tr('安装高度以混水器中心为基准，默认 1000 mm。顶喷升降或尺寸缩放保持混水器中心离地高度；软管最低点随模型派生。','Installation height is measured to the mixer centre, default 1000 mm. Rise and resizing retain this anchor; the lowest hose point is derived.')}</p>`:''}
      ${f.type==='tripleslidingwindow'?`<label class="full">${tr('窗台高','Sill height')} (mm)<input id="fMountHeight" type="number" min="0" max="20000" value="${FurnishDesign.products().value(f,'mountHeight')}" ${lk}></label>`:''}
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <label>${tr('宽','Width')} (mm)<input type="number" id="fW" value="${f.w}" min="50" step="10" ${lk}></label>
      <label>${tr('深','Depth')} (mm)<input type="number" id="fD" value="${f.d}" min="50" step="10" ${lk}></label>
      <label>${tr('中心','Center')} X (mm)<input type="number" id="fX" value="${Math.round(f.cx)}" step="10" ${lk}></label>
      <label>${tr('中心','Center')} Y (mm)<input type="number" id="fY" value="${Math.round(f.cy)}" step="10" ${lk}></label>
      <label>${tr('旋转','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15" ${lk}></label>
      <label>${tr('单价','Unit price')} (¥)<input type="number" id="fP" value="${Math.round(priceOf(f))}" min="0" step="50"></label>
      ${f.type==='waterheater_flat'||laundry?`<label class="full">${laundry?tr('底部离地高度 Z','Bottom height above floor Z'):tr('底部离地高度','Bottom height above floor')} (mm)<input type="number" id="fMountHeight" value="${FurnishDesign.products().value(f,'mountHeight')}" min="0" max="20000" step="10" ${lk}></label><p class="muted" style="grid-column:1/-1;margin:0">${laundry?tr('Z 为地面到机身底部的距离；中心对齐叠放时，上层 Z = 下层 Z + 下层机身高度 + 上层设置的连接层高度。尺寸与离地高度随项目保存。','Z measures floor to appliance bottom. For aligned stacks, upper Z = lower Z + lower body height + the upper appliance’s connector height. Dimensions and elevation are saved with the project.'):tr('从地面到热水器最底部的距离，调整后同步到 3D 并随项目保存。','Distance from the floor to the lowest part of the heater; updates 3D and is saved with the project.')}</p>`:''}
      ${laundry?`<label class="full">${tr('连接层高度','Connector height')} (mm)<input type="number" id="fStackHeight" value="${FurnishDesign.products().value(f,'stackHeight')}" min="0" max="1000" step="1" ${lk}></label><p class="muted" style="grid-column:1/-1;margin:0">${tr('设置本设备叠放在另一台设备上方时的连接层；默认 20 mm，设为 0 可取消连接层。','Applies when this appliance is stacked above another. Defaults to 20 mm; use 0 to remove the connector.')}</p>`:''}
      ${f.type==='waterheater_flat'?`<label class="full">${tr('机身高度','Body height')} (mm)<input type="number" id="fH" value="${FurnishDesign.products().height(f)}" min="10" max="20000" step="1" ${lk}></label>`:''}
      ${custom || laundry || fridge || robotSpec || FurnishCabinet.supported(f) || ['shower_arrow_cream','mirror','sofa_yeswood_cherry','curtain','slidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f.type) ? `<label>${laundry?tr('机身高度','Body height'):tr('高度','Height')} (mm)<input type="number" id="fH" value="${f.h ?? (robotSpec?robotSpec[2]:FurnishCabinet.supported(f)?FurnishCabinet.height(f):FurnishDesign.products().height(f))}" min="50" step="${robotSpec?'0.1':'10'}" ${lk}></label>` : ''}
      ${f.type==='sofa_yeswood_cherry'?`<p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格 2160 × 892 × 895 mm，坐深 580 mm；尺寸修改仅作布局缩放。木框与软包为外观近似，价格待填写。','Nominal size 2160 × 892 × 895 mm, seat depth 580 mm; resizing is for layout only. Frame and upholstery are approximate; price needs entry.')}</p>`:''}
      ${robotSpec?`<p class="muted" style="grid-column:1/-1;margin:0">${tr('原规格','Nominal size')} ${robotSpec.join(' × ')} mm${tr('；尺寸修改仅作布局缩放，安装预留待核对，价格待填写。','; resizing is for layout only. Installation clearances and price need confirmation.')}</p>`:''}
      <label class="${custom ? '' : 'full'}">${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="swatches">${SWATCHES.map(c => `<button data-sw="${c}" class="${c === f.color ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div>
    <div class="muted desc">${tr('占地','Footprint')} ${fmt(f.kitchen?FurnishKitchen.area(f):f.w*f.d/1e6)} m² · ${tr('位于','In')} ${r ? esc(nm(state.rooms[r.id].name)) : isOutside(f) ? tr('户型外','outside') : tr('墙边 / 门口','wall / doorway')}</div>
    ${kitchenPanel(f)}
    ${waterheaterInstallationPanel(f)}
    ${window.FurnishDesignUI?.placementPanel(f)||''}
    <div class="iconrow">
      ${btn('rotL', 'rotL', tr('逆时针 90°（Shift+R）','Rotate left (Shift+R)'))}${btn('rotR', 'rotR', tr('顺时针 90°（R）','Rotate right (R)'))}
      ${btn('flip', 'flip', tr('左右镜像（H）','Mirror (H)'), f.flip)}${btn('lock', f.locked ? 'lock' : 'unlock', tr('锁定 / 解锁（L）','Lock / unlock (L)'), f.locked)}
      ${btn('front', 'front', tr('置于顶层','Bring to front'))}${btn('toBack', 'back', tr('置于底层','Send to back'))}
    </div>
    <div class="actions">
      ${f.groupId?`<button class="btn" data-act="ungroup">${tr('解组','Ungroup')}</button>`:''}
      <button class="btn" data-act="dup">${ico('copy')}${tr('复制','Duplicate')}</button>
      <button class="btn" id="full-product-details">完整家具资料</button><button class="btn" id="replace-furniture">查找并替换</button><button class="btn" data-act="resetItem">${ico('reset')}${tr('恢复默认','Reset item')}</button>
      <button class="btn" data-act="zoom">${ico('target')}${tr('定位','Zoom to')}</button>
      <button class="btn danger" data-act="del">${ico('trash')}${tr('删除','Delete')}</button>
      <button class="btn" data-act="home">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted small">${tr('拖动家具移动（会对齐其他家具并显示参考线）；拖上方圆点旋转、右侧白色手柄只改宽、下方白色手柄只改深，角落橙色方块同时改宽深；调整尺寸固定对侧边。Shift+点击可多选，右键查看更多操作。', 'Drag to move (snaps with guides); drag the top dot to rotate, the right white handle for width, the bottom white handle for depth, or the orange corner for both. Resizing fixes the opposite edge. Shift+click to multi-select; right-click for more.')}</section>`;
}
function bindFurnPanel(f){
  if(typeof bindKitchenPanel==='function')bindKitchenPanel(f);
  if(f.type==='waterheater_flat')$('#heater-ceiling-settings').onclick=()=>{const room=FurnishProject.ceilingAt(FurnishProject.effectivePlan(PLAN,state),f.cx,f.cy).room;if(room){ui.sel={kind:'room',id:room.id};renderPanel();}else FurnishWorkspace.open('settings');};
  if(FurnishCabinet.supported(f)||f.kitchen)$('#cabinet-edit').onclick=()=>FurnishCabinetEditor.open(f.id);
  window.FurnishDesignUI?.bindPlacement(f);$('#full-product-details').onclick=()=>FurnishWorkspace.open('products');
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  const socketMode=$('#heaterSocketMode');if(f.type==='waterheater_flat'&&socketMode){socketMode.onchange=e=>{if(getF(f.id).locked)return;upd(g=>{if(e.target.value==='set')g.heaterSocket={x:g.cx,y:g.cy,z:FurnishDesign.products().value(g,'mountHeight')};else delete g.heaterSocket;});};for(const key of ['x','y','z']){const el=$('#heaterSocket'+key.toUpperCase());if(el)el.onchange=e=>{try{if(getF(f.id).locked)throw Error('家具已锁定，请先解锁');const v=Number(e.target.value);if(!e.target.value.trim()||!Number.isFinite(v)||Math.abs(v)>1000000||key==='z'&&(v<0||v>20000))throw Error('请输入有效插座坐标；离地高度须为 0–20000 mm');upd(g=>g.heaterSocket={...g.heaterSocket,[key]:Math.round(v)});}catch(error){toast(error.message);renderPanel();}};}}
  if(FurnishDesign.products().supports(f,'floorTrack'))$('#fFloorTrack').onchange=e=>{if(getF(f.id).locked)return;upd(g=>g.floorTrack=e.target.value==='true');};
  if(f.type==='curtain')$('#curtainStyle').onchange=e=>{if(getF(f.id).locked)return;upd(g=>g.curtainStyle=e.target.value);};
  const centerFridge=$('#fridge-center-bay');if(centerFridge)centerFridge.onclick=()=>{try{const cabinet=getF($('#fridge-bay-target').value),next=FurnishCabinet.centerFridgeInBay(cabinet,getF(f.id));upd(g=>Object.assign(g,next));toast(tr('已在冰箱预留位左右居中，前后位置保持不变','Centered in fridge bay; front/back position unchanged'));}catch(error){toast(error.message);}};
  const num = (id, fn) => { const el = $(id); if (el) el.onchange = e => {const v=Number(e.target.value);try{if(!e.target.value.trim()||!Number.isFinite(v))throw Error('请输入有效数字');if(['#fW','#fD','#fH','#fX','#fY','#fR','#fMountHeight','#fStackHeight','#fShowerRise','#fShowerHandAngle','#fShowerMixerHeight'].includes(id)&&getF(f.id).locked)throw Error('家具已锁定，请先解锁');upd(g=>fn(g,v));}catch(error){toast(error.message);renderPanel();}}; };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fW', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{w:Math.round(v)})));
  num('#fD', (g,v) => Object.assign(g,FurnishDesign.resizeFurniture(g,{d:Math.round(v)})));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = norm(v));
  num('#fP', (g,v) => g.price = Math.max(0, Math.round(v)));
  num('#fH', (g,v) => {if(g.type==='mirror'&&v<50)throw Error('穿衣镜高度须为 50–20000 mm');Object.assign(g,FurnishDesign.resizeFurniture(g,{h:g.type.startsWith('robot_p20max')?Math.round(v*10)/10:Math.round(v)}));});
  num('#fShowerMixerHeight',(g,v)=>{FurnishDesign.products().validateField(g,'showerMixerHeight',v);g.showerMixerHeight=v;delete g.mountHeight;});
  num('#fShowerRise',(g,v)=>{FurnishDesign.products().validateField(g,'showerRise',v);g.showerRise=v;});
  num('#fShowerHandAngle',(g,v)=>{FurnishDesign.products().validateField(g,'showerHandAngle',v);g.showerHandAngle=v;});
  num('#fMountHeight',(g,v)=>{FurnishDesign.products().validateField(g,'mountHeight',v);g.mountHeight=Math.round(v);});
  num('#fStackHeight',(g,v)=>{FurnishDesign.products().validateField(g,'stackHeight',v);g.stackHeight=Math.round(v);});
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  document.querySelectorAll('#panel [data-sw]').forEach(b => b.onclick = () => upd(g => g.color = b.dataset.sw));
}
function multiPanel(items){
  const [x0,y0,x1,y1] = groupBox(items), btn = (act, icon, label) => `<button class="btn" data-act="${act}" title="${label}" aria-label="${label}">${ico(icon)}</button>`;
  const lockedAll = items.every(f => f.locked), cost = items.reduce((a, f) => a + priceOf(f), 0);
  return `<section><h3>${tr(`已选 ${items.length} 件家具`, `${items.length} items selected`)}</h3>
    <div class="stats"><div><small>${tr('整体尺寸','Group size')}</small><span class="big mid">${Math.round(x1-x0)} × ${Math.round(y1-y0)}</span></div>
      <div><small>${tr('参考价合计','Reference total')}</small><span class="big mid">${yen(cost)}</span></div></div>
    <div class="actions"><button class="btn" data-act="group">${tr('打组','Group')}</button>${items.some(f=>f.groupId)?`<button class="btn" data-act="ungroup">${tr('解组','Ungroup')}</button>`:''}</div><p class="muted">${tr(items.some(f=>f.groupId)?'点击组内任一家具会选中整组；解组后可单独调整。':'打组后可共同移动，保持相对位置。','Group members move together; ungroup to adjust individual items.')}</p>
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
    ${!isDoor ? `<div class="form"><label class="full">${tr('门扇形式','Door panels')}<select id="slidePanels"><option value="2" ${d.panels!==3?'selected':''}>${tr('双扇推拉门','Two-panel sliding door')}</option><option value="3" ${d.panels===3?'selected':''}>${tr('三联动推拉门','Three-panel telescopic door')}</option></select></label><label>${tr('地轨道','Floor track')}<select id="slideFloorTrack"><option value="false" ${(d.floorTrack??d.panels!==3)===false?'selected':''}>${tr('无地轨 · 吊轨','No floor track')}</option><option value="true" ${(d.floorTrack??d.panels!==3)===true?'selected':''}>${tr('有地轨','With floor track')}</option></select></label><label>${tr('叠合侧','Stacking side')}<select id="slideStackSide"><option value="left" ${d.stackSide!=='right'?'selected':''}>${tr('左侧','Left')}</option><option value="right" ${d.stackSide==='right'?'selected':''}>${tr('右侧','Right')}</option></select></label></div><p class="muted">${tr('进入 3D，点击门扇开关；三联动门向同一侧依次叠合。','Click the door in 3D to open or close; telescopic panels stack to one side.')}</p>` : ''}
    <div class="actions"><button class="btn" id="oback">${tr('← 返回总览','← Back')}</button></div></section>`;
}
function bindOpeningPanel(sel){
  const upd = fn => mutate(() => { state.open.d = state.open.d || {}; fn(state.open.d); });
  if(sel.kind==='slide'){for(const [id,key,parse] of [['slidePanels','panels',Number],['slideFloorTrack','floorTrack',v=>v==='true'],['slideStackSide','stackSide',v=>v]])$('#'+id).onchange=e=>mutate(()=>{const d=SLIDES[sel.id];(state.open.s ||= {})[sel.id]={panels:d.panels===3?3:2,floorTrack:d.floorTrack??d.panels!==3,stackSide:d.stackSide||'left',...(state.open.s[sel.id]||{}),[key]:parse(e.target.value)};});}
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
 return `<section><h3>窗尺寸</h3><p>窗宽 ${width} mm · 窗高 ${height} mm</p><div class="form"><label class="full">窗扇形式<select id="wPanels"><option value="0" ${w.panels!==3?'selected':''}>普通固定窗</option><option value="3" ${w.panels===3?'selected':''}>三联动推拉窗</option></select></label><label class="full">叠合侧<select id="wStackSide"><option value="left" ${w.stackSide!=='right'?'selected':''}>左侧</option><option value="right" ${w.stackSide==='right'?'selected':''}>右侧</option></select></label><label class="full">窗台高 mm<input type="number" id="wSill" min="0" max="2400" step="1" value="${Math.round(w.sill*1000)}"></label><label class="full">窗户高度 mm<input type="number" id="wHeight" min="100" max="2800" step="1" value="${height}"></label><label class="full">窗顶高（距地面）mm<input type="number" id="wHead" max="2800" step="1" value="${Math.round((w.head??2.4)*1000)}"></label></div><p>窗户高度 = 窗顶高 − 窗台高，两项自动联动；修改窗台高时保持窗户高度。</p><p>${w.bayGroup?'同一飘窗的三面窗与窗台高度同步调整。':''}内置布局窗宽按预设图纸定义；导入自定义户型可编辑窗宽。</p><p id="wError" role="alert"></p><div class="actions"><button class="btn primary" id="wApply">应用尺寸</button><button class="btn" id="wReset">重置</button><button class="btn" id="wback">返回总览</button></div></section>`;
}
function bindWinPanel(i){
  function linkHeightInputs(sill,height,head){
    const number=input=>input.value.trim()!==''&&Number.isFinite(Number(input.value))?Number(input.value):null;
    for(const input of [sill,height,head]){const previous=input.oninput;input.oninput=()=>{
      const a=number(sill),b=number(input===head?head:height),target=input===head?height:head;
      target.value=a===null||b===null?'':String(Math.round((input===head?b-a:a+b)*1000)/1000);
      previous?.();
    };}
  }
  linkHeightInputs($('#wSill'),$('#wHeight'),$('#wHead'));
 $('#wApply').onclick=()=>{const sill=Number($('#wSill').value)/1000,height=Number($('#wHeight').value)/1000;if(['wSill','wHeight','wHead'].some(id=>!$('#'+id).value.trim())||!Number.isFinite(sill)||!Number.isFinite(height)||sill<0||sill>2.4||height<.1||sill+height>2.8){$('#wError').textContent='窗高至少100 mm，窗顶不得超过2800 mm';return;}mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)state.open.w[j]={...(typeof state.open.w[j]==='object'?state.open.w[j]:{}),sill,head:sill+height,...(j===i?{panels:Number($('#wPanels').value),stackSide:$('#wStackSide').value}:{panels:w.panels??0,stackSide:w.stackSide||'left'})};});});};
 $('#wReset').onclick=()=>mutate(()=>{state.open.w=state.open.w||{};const group=WINS[i].bayGroup;WINS.forEach((w,j)=>{if(j===i||group&&w.bayGroup===group)delete state.open.w[j];});});$('#wback').onclick=()=>select(null);
}
