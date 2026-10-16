/* All edits go through mutate(), including copying a layout basis. */
(function(){
'use strict';
const F=FurnishFloorFinish;let cancelPick=null,preview=null;
function clearPreview(){document.querySelector('#gFloorOrigin')?.remove();preview=null;}
function redrawOrigin(){
 if(!preview)return;
 if(!preview.host.isConnected){cancelPick?.();clearPreview();return;}
 let g=document.querySelector('#gFloorOrigin');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='gFloorOrigin';g.dataset.editOverlay='true';g.setAttribute('pointer-events','none');svg.append(g);}
 g.setAttribute('transform',`rotate(${drawingRotation()})`);g.dataset.snapped=String(preview.snapped);
 const m=document.querySelector('#gRooms').getScreenCTM(),scale=Math.hypot(m.a,m.b),u=1/scale,[x,y]=preview.point,color=preview.snapped?'#087f5b':'#e8590c',screen=new DOMPoint(x,y).matrixTransform(m),bounds=svg.getBoundingClientRect(),left=screen.x>(bounds.left+bounds.right)/2,below=screen.y-32<bounds.top;
 // The crosshair and label retain their screen size through zoom and view rotation.
 g.innerHTML=`<g transform="translate(${x} ${y}) rotate(${-drawingRotation()}) scale(${u})" fill="none" stroke="${color}" stroke-width="2"><circle r="12" fill="white" fill-opacity=".85"/><circle r="5"/><path d="M-18 0H18M0-18V18"/><text x="${left?-20:20}" y="${below?30:-16}" text-anchor="${left?'end':'start'}" stroke="white" stroke-width="4" paint-order="stroke" fill="${color}" font-size="13" font-weight="700">${preview.snapped?'已吸附完成面角点':'自由选点'}${cancelPick?' · 点击确定':' · 待应用'}</text></g>`;
}
function afterRender(){refreshList();redrawOrigin();}
function bindOriginPicker(host,pick,get,saveLabel='应用地面设置'){
 const status=document.createElement('p');status.className='floor-pick-status';status.setAttribute('role','status');status.textContent='图上选点时，靠近区域完成面角点 12 像素内自动吸附。';pick.closest('.actions').after(status);
 host.addEventListener('input',()=>{if(!cancelPick){clearPreview();status.textContent=`参数已修改；点击${saveLabel}保存。`;}});
 pick.onclick=()=>{
  if(cancelPick){cancelPick();return;}clearPreview();
  const rooms=FurnishWallFinish.spatial(FurnishProject.effectivePlan(PLAN,state)).rooms;
  const stop=(keep=false)=>{cancelPick=null;svg.removeEventListener('pointerdown',choose,true);svg.removeEventListener('pointermove',move,true);document.removeEventListener('keydown',cancel,true);svg.classList.remove('floor-origin-picking');pick.classList.remove('floor-pick-active');pick.setAttribute('aria-pressed','false');pick.textContent='图上选起铺点';if(!keep){clearPreview();status.textContent='已取消选点，原起铺点保持。';}else redrawOrigin();};
  const cancel=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();}};
  const move=e=>{const matrix=document.querySelector('#gRooms').getScreenCTM(),local=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());preview={host,...F.snapOrigin([local.x,local.y],rooms,12/Math.hypot(matrix.a,matrix.b))};redrawOrigin();status.textContent=`${preview.snapped?'已吸附区域完成面角点':'自由选点'}：X ${preview.point[0].toFixed(2)}，Y ${preview.point[1].toFixed(2)} mm；点击确定，Esc 取消。`;};
  const choose=e=>{if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();move(e);get('originX').value=Number(preview.point[0].toFixed(2));get('originY').value=Number(preview.point[1].toFixed(2));status.textContent=`${preview.snapped?'已吸附区域完成面角点':'已选择起铺点'}：X ${get('originX').value}，Y ${get('originY').value} mm；点击${saveLabel}保存。`;stop(true);};
  cancelPick=stop;pick.classList.add('floor-pick-active');pick.setAttribute('aria-pressed','true');pick.textContent='取消图上选点';svg.classList.add('floor-origin-picking');status.textContent='正在选点：移动到区域完成面角点附近，绿色标记表示吸附；点击确定，Esc 取消。';
  svg.addEventListener('pointerdown',choose,true);svg.addEventListener('pointermove',move,true);document.addEventListener('keydown',cancel,true);
 };
}
function panel(room,prefix='floor'){
 if(room.counted===false)return '';
 const s=state.floorFinishes?.areas[room.id],v=s||F.defaults(room,state.rooms[room.id]),p=FurnishProject.effectivePlan(PLAN,state),a=p.floorFinish?.areas[room.id];
 const input=(key,label,value,min,max)=>`<label>${label}<input data-floor="${key}" type="number" step="any" ${min!==undefined?`min="${min}" max="${max}"`:''} value="${value??''}" placeholder="待核对"></label>`;
 const spec=state.pricing?.materialSpecs?.[state.rooms[room.id].mat],mismatch=spec&&v.layout&&!((v.layout.width===spec.length&&v.layout.height===spec.width)||(v.layout.height===spec.length&&v.layout.width===spec.width));
 const options=ROOMS.filter(r=>r.id!==room.id&&r.counted!==false).map(r=>`<option value="${esc(r.id)}" ${v.reference===r.id?'selected':''}>${esc(state.rooms[r.id]?.name||r.name)}</option>`).join('');
 const html=`<section id="floor-finish-panel" data-floor-room="${esc(room.id)}"><h3>地砖铺贴与地面标高</h3><label><input id="floor-enabled" type="checkbox" ${s&&s.enabled!==false?'checked':''}> 启用此区域地面设置</label>${prefix!=='floor'&&F.tiled(state.rooms[room.id].mat)?'<div class="floor-editor-tabs"><button class="btn on" data-floor-show="layout">铺贴参数</button><button class="btn" data-floor-show="height">地面标高</button></div>':''}<div data-floor-section="height"><p class="muted">所有标高相对原毛坯测量基准，单位 mm。厚度未知请留空。应用不会移动家具、抬高设备或改变柜体配置。</p><div class="form">
 ${input('rawZ','毛坯地面标高',v.rawZ,-20000,20000)}${input('tileThickness','面层／地砖厚度',v.tileThickness,0,1000)}${input('baseThickness','粘结＋找平层厚度',v.baseThickness,0,1000)}
 <label>标高计算<select data-floor="mode"><option value="layers" ${v.mode==='layers'?'selected':''}>按各层厚度计算</option><option value="level" ${v.mode==='level'?'selected':''}>按目标标高推算找平层</option><option value="reference" ${v.mode==='reference'?'selected':''}>低于参考区域</option></select></label>
 ${input('targetZ','目标完成标高（目标模式）',v.targetZ,-20000,20000)}<label>参考区域<select data-floor="reference"><option value="">请选择</option>${options}</select></label>${input('drop','比参考区域低（卫生间默认 5）',v.drop??5,0,1000)}</div><p class="muted">目标／参考模式：找平层留空时推算；已填厚度与目标不一致会提示冲突，保留输入。毛坯标高不随高差改变。</p>
 </div><div data-floor-section="layout">${F.tiled(state.rooms[room.id].mat)?`<h4>直铺参数</h4>${mismatch?'<p class="project-error">铺贴砖尺寸与已录入采购规格不同，请核对；采购数量与订单保持原设置。</p>':''}<div class="form">${input('width','砖长',v.layout?.width??800,20,6000)}${input('height','砖宽',v.layout?.height??800,20,6000)}${input('gap','砖缝',v.layout?.gap??2,0,50)}${input('angle','铺贴方向（原图角度）',v.layout?.angle??0,-360,360)}${input('originX','起铺砖角 X',v.layout?.origin[0]??0)}${input('originY','起铺砖角 Y',v.layout?.origin[1]??0)}</div><div class="actions"><button class="btn" data-floor-angle="0">0°</button><button class="btn" data-floor-angle="90">90°</button><button class="btn" id="floor-pick">图上选起铺点</button></div><label>沿用其它区域的起铺点与方向<select id="floor-copy"><option value="">独立设置</option>${options}</select></label><p class="muted">起铺点是参考整砖左上角，可在区域外；转动视图不会改变排版。材料预算仍按原面积估算，不含切砖优化。</p>`:'<p class="muted">当前材料不是瓷砖，仅设置地面标高。</p>'}
 </div><p data-floor-summary>${a?`毛坯 ${a.rawZ??'待定'} → 完成 ${a.finishedZ??'待定'} mm${a.requiredBase!==undefined?`；所需找平层 ${a.requiredBase} mm`:''}；完成面至天花 ${Number.isFinite(a.finishedZ)?FurnishProject.roomCeilingHeight(state,room)-a.finishedZ:'待定'} mm`: '未启用时保留旧项目的显示与高度'}</p>${a?.pending?`<p class="project-error">${esc(a.pending)}</p>`:''}<p data-floor-error class="project-error" role="alert"></p><div class="actions floor-editor-actions"><button class="btn primary" id="floor-apply">应用地面设置</button></div>${(p.floorFinish?.pending||[]).filter(v=>!ROOMS.some(r=>r.id===v.id)).map(v=>`<p class="project-error">${esc(v.id)}：${esc(v.message)} <button class="btn" data-floor-remove="${esc(v.id)}">移除失效设置</button></p>`).join('')}</section>`;
 return prefix==='floor'?html:html.replaceAll('id="floor-',`id="${prefix}-`);
}
function bind(host=document.querySelector('#floor-finish-panel'),{prefix='floor',onApplied}={}){
 cancelPick?.();clearPreview();if(!host)return;
 const q=selector=>host.querySelector(selector.replaceAll('#floor-',`#${prefix}-`));
 const get=k=>q(`[data-floor="${k}"]`),num=k=>get(k)?.value.trim()===''?undefined:Number(get(k)?.value),id=host.dataset.floorRoom;
 const showMode=()=>{for(const key of ['targetZ','reference','drop'])get(key).closest('label').hidden=key==='targetZ'?get('mode').value!=='level':get('mode').value!=='reference';queueFabPosition();};get('mode').onchange=showMode;showMode();
 host.querySelectorAll('[data-floor-show]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-floor-section]').forEach(el=>el.hidden=el.dataset.floorSection!==b.dataset.floorShow);host.querySelectorAll('[data-floor-show]').forEach(el=>el.classList.toggle('on',el===b));queueFabPosition();});host.querySelector('[data-floor-show="layout"]')?.click();
 host.querySelectorAll('[data-floor-angle]').forEach(b=>b.onclick=()=>get('angle').value=b.dataset.floorAngle);
 const copy=q('#floor-copy');if(copy)copy.onchange=()=>{const l=state.floorFinishes?.areas[copy.value]?.layout;if(!l){if(copy.value)toast('参考区域尚未设置铺贴参数');return;}get('angle').value=l.angle;get('originX').value=l.origin[0];get('originY').value=l.origin[1];};
 const pick=q('#floor-pick');if(pick)bindOriginPicker(host,pick,get);
 q('#floor-apply').onclick=()=>{try{
  const data=JSON.parse(JSON.stringify(state.floorFinishes||{version:1,areas:{}}));
  if(q('#floor-enabled').checked||data.areas[id]){
   const v={mode:get('mode').value,...(!q('#floor-enabled').checked?{enabled:false}:{})};for(const key of ['rawZ','tileThickness','baseThickness','targetZ','drop'])if(num(key)!==undefined)v[key]=num(key);
   if(get('reference').value)v.reference=get('reference').value;
   if(get('width'))v.layout={width:num('width'),height:num('height'),gap:num('gap'),angle:num('angle'),origin:[num('originX'),num('originY')]};else if(data.areas[id]?.layout)v.layout=data.areas[id].layout;data.areas[id]=v;
  }
  F.validate(data);F.derive(FurnishProject.effectivePlan(PLAN,{...state,floorFinishes:undefined}),{...state,floorFinishes:data});
  mutate(()=>{if(Object.keys(data.areas).length)state.floorFinishes=data;else delete state.floorFinishes;});
  toast('地面设置已应用；请核对家具底部、门底和完成面净高');onApplied?.();
 }catch(e){q('[data-floor-error]').textContent=e.message;}};
 host.querySelectorAll('[data-floor-remove]').forEach(b=>b.onclick=()=>mutate(()=>{delete state.floorFinishes.areas[b.dataset.floorRemove];if(!Object.keys(state.floorFinishes.areas).length)delete state.floorFinishes;}));
}
function furniturePanel(f){
 const p=FurnishProject.effectivePlan(PLAN,state),areas=F.at(p,[f.cx,f.cy]).filter(a=>!a.legacy);if(!areas.length)return '';
 const v=FurnishDesign.furnitureVerticalBounds(f);
 return `<section data-floor-furniture><h3>完成地面与安装高度</h3>${areas.map(a=>`<p>${esc(a.room.name)}：完成标高 ${a.finishedZ??'待核对'} mm；家具底部距完成地面 ${v&&Number.isFinite(a.finishedZ)?Number((v.bottom-a.finishedZ).toFixed(2)):'待核对'} mm</p>`).join('')}<p class="muted">现有安装高度以毛坯测量基准保留；地面变更不会自动抬高。负净距表示与完成地面重叠，请人工核对。</p></section>`;
}
function openFloating(tab='layout'){
 closeFabEditor(false);const room=ROOMS.find(r=>r.id===ui.sel?.id&&ui.sel.kind==='room'&&r.counted!==false);if(!room)return;
 drawer('panel',false);
 const host=mountFabEditor('floor',`${state.rooms[room.id].name} · 地砖铺贴`,panel(room,'fab-floor'),{allowCanvas:()=>!!cancelPick,dispose:()=>{cancelPick?.();clearPreview();}});
 bind(host.querySelector('[data-floor-room]'),{prefix:'fab-floor',onApplied:()=>{if(ui.sel?.kind==='room'&&ui.sel.id===room.id)openFloating(host.querySelector('[data-floor-show].on')?.dataset.floorShow||'layout');}});host.querySelector(`[data-floor-show="${tab}"]`)?.click();queueFabPosition();
}
function applyEnabled(ids,enabled){
 const next=F.setEnabled(state,FurnishProject.effectivePlan(PLAN,state),ids,enabled);
 if(JSON.stringify(next.floorFinishes)!==JSON.stringify(state.floorFinishes))mutate(()=>{if(next.floorFinishes)state.floorFinishes=next.floorFinishes;});
}
function tileRooms(){return FurnishProject.effectivePlan(PLAN,state).rooms.filter(r=>r.counted!==false&&F.tiled(state.rooms[r.id]?.mat||r.mat));}
function openUnified(){
 const rooms=tileRooms(),room=rooms.find(r=>ui.sel?.kind==='room'&&r.id===ui.sel.id)||rooms[0];if(!room){toast('当前没有瓷砖区域，请先设置区域材质');return;}
 closeDialog();closeFabEditor(false);select({kind:'room',id:room.id});drawer('panel',false);
 const layout=state.floorFinishes?.areas[room.id]?.layout||F.defaults(room,state.rooms[room.id]).layout;
 const host=mountFabEditor('floor-unified','全屋地砖 · 统一起铺点',`<section data-floor-unified><p>应用到全部 ${rooms.length} 个瓷砖区域。未启用区域仅保存参数，保持关闭；面层厚度、标高、砖尺寸及砖缝保留。</p><div class="form"><label>统一起铺砖角 X · mm<input data-floor="originX" type="number" step="any" value="${layout.origin[0]}"></label><label>统一起铺砖角 Y · mm<input data-floor="originY" type="number" step="any" value="${layout.origin[1]}"></label></div><div class="actions"><button class="btn" id="floor-unified-pick">图上选起铺点</button></div><label><input id="floor-unified-direction" type="checkbox"> 同时统一铺贴方向</label><label id="floor-unified-angle" hidden>铺贴方向（原图角度）<input data-floor="angle" type="number" min="-360" max="360" step="any" value="${layout.angle}"></label><p class="muted">一次应用，之后各区域仍可独立调整。不同砖尺寸、砖缝或方向仍可能错缝；家具和柜体配置保持。</p><p class="project-error" data-floor-error role="alert"></p><div class="actions floor-editor-actions"><button class="btn primary" id="floor-unified-apply">应用到全部瓷砖区域</button></div></section>`,{allowCanvas:()=>!!cancelPick,dispose:()=>{cancelPick?.();clearPreview();}});
 const form=host.querySelector('[data-floor-unified]'),get=k=>form.querySelector(`[data-floor="${k}"]`),number=k=>get(k).value.trim()===''?NaN:Number(get(k).value);
 bindOriginPicker(form,host.querySelector('#floor-unified-pick'),get,'应用到全部瓷砖区域');
 host.querySelector('#floor-unified-direction').onchange=e=>{host.querySelector('#floor-unified-angle').hidden=!e.target.checked;queueFabPosition();};
 host.querySelector('#floor-unified-apply').onclick=()=>{try{
  const basis={origin:[number('originX'),number('originY')],...(host.querySelector('#floor-unified-direction').checked?{angle:number('angle')}:{})},ids=tileRooms().map(r=>r.id),next=F.setLayoutBasis(state,FurnishProject.effectivePlan(PLAN,state),ids,basis);
  if(JSON.stringify(next.floorFinishes)!==JSON.stringify(state.floorFinishes))mutate(()=>state.floorFinishes=next.floorFinishes);
  closeFabEditor(false);toast(`已统一 ${ids.length} 个瓷砖区域的起铺点${basis.angle!==undefined?'及方向':''}；可撤销`);
 }catch(e){host.querySelector('[data-floor-error]').textContent=e.message;}};queueFabPosition();
}
function openList(){
 closeFabEditor(false);
 openDialog({title:'区域地砖铺贴',wide:true,body:'<p>勾选立即启用，取消勾选保留参数。未知厚度保持待核对；不会移动家具或修改柜体。非瓷砖材质仅启用地面标高。</p><div class="actions"><button class="btn" data-floor-bulk="on">全部启用</button><button class="btn" data-floor-bulk="off">全部关闭</button><button class="btn" data-floor-unify>统一起铺点</button></div><p data-floor-count role="status"></p><div id="floor-region-list"></div>',actions:[{label:'关闭'}]});
 document.querySelector('[data-floor-unify]').onclick=openUnified;
 refreshList();
}
function refreshList(){
 const host=document.querySelector('#floor-region-list');if(!host||document.querySelector('#dlg').hidden)return;
 const plan=FurnishProject.effectivePlan(PLAN,state),rooms=plan.rooms.filter(r=>r.counted!==false),active=rooms.filter(r=>state.floorFinishes?.areas[r.id]&&state.floorFinishes.areas[r.id].enabled!==false);
 document.querySelector('[data-floor-count]').textContent=`已启用 ${active.length} / ${rooms.length} 个区域`;
 host.innerHTML=rooms.map(r=>{const s=state.floorFinishes?.areas[r.id],enabled=!!s&&s.enabled!==false,a=plan.floorFinish?.areas[r.id];return `<div class="floor-region-row"><label><input type="checkbox" data-floor-enable="${esc(r.id)}" aria-label="启用 ${esc(r.name)}" ${enabled?'checked':''}><b>${esc(r.name)}</b></label><div><small>${F.tiled(state.rooms[r.id].mat)?'地砖铺贴':'非瓷砖 · 仅标高'}</small><p class="${a?.pending?'project-error':'muted'}">${enabled?(Number.isFinite(a?.finishedZ)?`完成标高 ${a.finishedZ} mm`:esc(a?.pending||'标高待核对')):s?'已关闭，参数保留':'未启用'}</p></div><button class="btn" data-floor-edit="${esc(r.id)}">编辑参数</button></div>`;}).join('');
 host.querySelectorAll('[data-floor-enable]').forEach(input=>input.onchange=()=>{try{applyEnabled([input.dataset.floorEnable],input.checked);}catch(e){toast(e.message);}refreshList();[...host.querySelectorAll('[data-floor-enable]')].find(el=>el.dataset.floorEnable===input.dataset.floorEnable)?.focus({preventScroll:true});});
 document.querySelectorAll('[data-floor-bulk]').forEach(b=>b.onclick=()=>{try{applyEnabled(rooms.map(r=>r.id),b.dataset.floorBulk==='on');}catch(e){toast(e.message);}refreshList();});
 host.querySelectorAll('[data-floor-edit]').forEach(b=>b.onclick=()=>{closeDialog();select({kind:'room',id:b.dataset.floorEdit});openFloating();});
}
document.addEventListener('click',e=>{if(e.target.closest('[data-floor-list]'))openList();});
window.addEventListener('load',()=>{const rail=document.querySelector('.canvas-rail');if(!rail||document.querySelector('#floor-regions-open'))return;const button=document.createElement('button');button.className='btn';button.id='floor-regions-open';button.dataset.floorList='';button.textContent='地砖';button.title='区域地砖铺贴';rail.append(button);});
window.FurnishFloorFinishUI={panel,bind,furniturePanel,openFloating,openList,openUnified,afterRender,afterView:redrawOrigin,picking:()=>!!cancelPick};
})();
