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
 const options=ROOMS.filter(r=>r.id!==room.id&&r.counted!==false).map(r=>`<option value="${esc(r.id)}" ${v.reference===r.id?'selected':''}>${esc(state.rooms[r.id]?.name||r.name)}${Number.isFinite(p.floorFinish?.areas[r.id]?.finishedZ)?` · 完成 ${p.floorFinish.areas[r.id].finishedZ} mm`:state.floorFinishes?.areas[r.id]&&state.floorFinishes.areas[r.id].enabled!==false?' · 标高待确定':' · 未启用地面'}</option>`).join('');
 const html=`<section id="floor-finish-panel" data-floor-room="${esc(room.id)}"><h3>地砖铺贴与地面标高</h3><label><input id="floor-enabled" type="checkbox" ${s&&s.enabled!==false?'checked':''}> 启用此区域地面设置</label>${prefix!=='floor'&&F.tiled(state.rooms[room.id].mat)?'<div class="floor-editor-tabs"><button class="btn on" data-floor-show="layout">铺贴参数</button><button class="btn" data-floor-show="height">地面标高</button></div>':''}<div data-floor-section="height"><p class="muted">所有标高相对原毛坯测量基准，单位 mm。厚度未知请留空。家具高度基准可在地砖区域列表设置；完成地面模式会同步抬高家具。</p><div class="form">
 ${input('rawZ','毛坯地面标高',v.rawZ,-20000,20000)}${input('tileThickness','面层／地砖厚度',v.tileThickness,0,1000)}${input('baseThickness','粘结＋找平层厚度',v.baseThickness,0,1000)}
 <label>标高计算<select data-floor="mode"><option value="layers" ${v.mode==='layers'?'selected':''}>按各层厚度计算</option><option value="level" ${v.mode==='level'?'selected':''}>按目标标高推算找平层</option><option value="reference" ${v.mode==='reference'?'selected':''}>低于参考区域</option></select></label>
 ${input('targetZ','目标完成标高（目标模式）',v.targetZ,-20000,20000)}<label>参考区域<select data-floor="reference"><option value="">请选择</option>${options}</select></label>${input('drop','比参考区域低（卫生间默认 5）',v.drop??5,0,1000)}</div><p class="muted">目标／参考模式：找平层留空时推算；已填厚度与目标不一致会提示冲突，保留输入。毛坯标高不随高差改变。</p>
 </div><div data-floor-section="layout">${F.tiled(state.rooms[room.id].mat)?`<h4>直铺参数</h4>${mismatch?'<p class="project-error">铺贴砖尺寸与已录入采购规格不同，请核对；采购数量与订单保持原设置。</p>':''}<div class="form">${input('width','砖长',v.layout?.width??800,20,6000)}${input('height','砖宽',v.layout?.height??800,20,6000)}${input('gap','砖缝',v.layout?.gap??2,0,50)}${input('angle','铺贴方向（原图角度）',v.layout?.angle??0,-360,360)}${input('originX','起铺砖角 X',v.layout?.origin[0]??0)}${input('originY','起铺砖角 Y',v.layout?.origin[1]??0)}</div><div class="actions"><button class="btn" data-floor-angle="0">0°</button><button class="btn" data-floor-angle="90">90°</button><button class="btn" id="floor-pick">图上选起铺点</button>${(state.rooms[room.id]?.use||room.use)==='bathroom'?'<button class="btn" data-floor-origin3d>3D动态调整起铺点</button>':''}</div><label>沿用其它区域的起铺点与方向<select id="floor-copy"><option value="">独立设置</option>${options}</select></label><p class="muted">起铺点是参考整砖左上角，可在区域外；转动视图不会改变排版。材料预算仍按原面积估算，不含切砖优化。</p>`:'<p class="muted">当前材料不是瓷砖，仅设置地面标高。</p>'}
 </div><p data-floor-summary>${a?`毛坯 ${a.rawZ??'待定'} → 完成 ${a.finishedZ??'待定'} mm${a.requiredBase!==undefined?`；所需找平层 ${a.requiredBase} mm`:''}；完成面至天花 ${Number.isFinite(a.finishedZ)?FurnishProject.roomCeilingHeight(state,room)-a.finishedZ:'待定'} mm`: '未启用时保留旧项目的显示与高度'}</p><p data-floor-pending class="project-error">${esc(a?.pending||'')}</p><p data-floor-error class="project-error" role="alert"></p><div class="floor-editor-actions"><p data-floor-status role="status"></p><div class="actions"><button class="btn primary" id="floor-apply">应用地面设置</button></div></div>${(p.floorFinish?.pending||[]).filter(v=>!ROOMS.some(r=>r.id===v.id)).map(v=>`<p class="project-error">${esc(v.id)}：${esc(v.message)} <button class="btn" data-floor-remove="${esc(v.id)}">移除失效设置</button></p>`).join('')}</section>`;
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
 host.querySelector('[data-floor-origin3d]')?.addEventListener('click',()=>open3DOrigin(id));
 const draft=()=>{
  const data=JSON.parse(JSON.stringify(state.floorFinishes||{version:1,areas:{}}));
  if(q('#floor-enabled').checked||data.areas[id]){
   const v={mode:get('mode').value,...(!q('#floor-enabled').checked?{enabled:false}:{})};for(const key of ['rawZ','tileThickness','baseThickness','targetZ','drop'])if(num(key)!==undefined)v[key]=num(key);
   if(get('reference').value)v.reference=get('reference').value;
   if(get('width'))v.layout={width:num('width'),height:num('height'),gap:num('gap'),angle:num('angle'),origin:[num('originX'),num('originY')]};else if(data.areas[id]?.layout)v.layout=data.areas[id].layout;data.areas[id]=v;
  }
  F.validate(data);
  const plan=F.derive(FurnishProject.effectivePlan(PLAN,{...state,floorFinishes:undefined}),{...state,floorFinishes:data});
  return {data,area:plan.floorFinish?.areas[id]};
 };
 const update=()=>{try{
  const {area:a}=draft(),room=ROOMS.find(r=>r.id===id);
  q('[data-floor-summary]').textContent=a?`预览：毛坯 ${a.rawZ??'待定'} → 完成 ${a.finishedZ??'待定'} mm${a.requiredBase!==undefined?`；所需找平层 ${a.requiredBase} mm`:''}；完成面至天花 ${Number.isFinite(a.finishedZ)?FurnishProject.roomCeilingHeight(state,room)-a.finishedZ:'待定'} mm`:'未启用地面设置；应用后保留参数并关闭此区域地面';
  q('[data-floor-pending]').textContent=a?.pending||'';q('[data-floor-error]').textContent='';
  q('[data-floor-status]').textContent='当前为输入预览；点击「应用地面设置」保存。';
 }catch(e){q('[data-floor-error]').textContent=e.message;q('[data-floor-summary]').textContent='当前输入无法计算';q('[data-floor-pending]').textContent='';q('[data-floor-status]').textContent='输入尚未保存';}};
 host.addEventListener('input',update);host.addEventListener('change',update);
 q('#floor-apply').onclick=()=>{try{
  const {data,area}=draft();
  mutate(()=>{if(Object.keys(data.areas).length)state.floorFinishes=data;else delete state.floorFinishes;});
  onApplied?.();
  const message=area?.pending?`参数已保存，完成标高仍待确定：${area.pending}`:area?`地面设置已应用，完成标高 ${area.finishedZ} mm；请核对家具底部、门底和完成面净高`:'地面设置已关闭，参数保留';
  // mutate/onApplied may replace the form; report on the newly mounted instance.
  const current=document.getElementById(host.id)?.querySelector('[data-floor-status]');if(current)current.textContent=message;
  toast(message);
 }catch(e){q('[data-floor-error]').textContent=e.message;}};
 host.querySelectorAll('[data-floor-remove]').forEach(b=>b.onclick=()=>mutate(()=>{delete state.floorFinishes.areas[b.dataset.floorRemove];if(!Object.keys(state.floorFinishes.areas).length)delete state.floorFinishes;}));
}
function furniturePanel(f){
 const p=FurnishProject.effectivePlan(PLAN,state),areas=F.at(p,[f.cx,f.cy]).filter(a=>!a.legacy);if(!areas.length)return '';
 const v=FurnishDesign.furnitureVerticalBounds(f,p,state.furniture);
 return `<section data-floor-furniture><h3>完成地面与安装高度</h3>${areas.map(a=>`<p>${esc(a.room.name)}：完成标高 ${a.finishedZ??'待核对'} mm；家具底部距完成地面 ${v&&Number.isFinite(a.finishedZ)?Number((v.bottom-a.finishedZ).toFixed(2)):'待核对'} mm</p>`).join('')}<p class="muted">${state.furnitureDatum==='finished-floor'?'家具输入高度以完成地面为基准，地面变化自动派生抬高；宿主与附属设备共用一次基准偏移。':'旧方案保留毛坯高度基准；可在地砖区域列表切换为完成地面。'}</p></section>`;
}
async function open3DOrigin(id){
 closeDialog();closeFabEditor(false);
 const room=ROOMS.find(r=>r.id===id&&r.counted!==false),plan=FurnishProject.effectivePlan(PLAN,state),area=plan.floorFinish?.areas[id];
 if(!room||!area?.layout||!Number.isFinite(area.finishedZ))return toast('请先启用本区域地砖并确定完成标高');
 const planId=PLAN.id,from2D=!is3D();select({kind:'room',id});drawer('panel',false);
 if(from2D)await setView('3d');if(PLAN.id!==planId||!is3D()||switching)return;
 if(from2D)View3D.flyToRoom(id);
 const saved=area.layout.origin.slice();let picking=false,frame=0,focusFrame=0,drag=null,pendingDrag=null,handlePoint=null;
 const scene=document.querySelector('#view3d');
 const host=mountFabEditor('floor-origin3d',`${state.rooms[id].name} · 3D起铺点`, `<section data-floor-origin3d-editor><p>拖动地面的橙色圆环，墙地砖实时重排；松手保留预览，应用后保存。起点在房间外时，圆环显示房间内同网格的砖角。</p><div class="form"><label>起铺砖角 X · mm<input type="number" step="1" data-origin3d="0" value="${saved[0]}"></label><label>起铺砖角 Y · mm<input type="number" step="1" data-origin3d="1" value="${saved[1]}"></label></div><div class="actions"><button class="btn" data-origin3d-pick aria-pressed="false">三维地面选点</button><button class="btn" data-origin3d-generate>重新生成预览</button><button class="btn" data-origin3d-top>俯视选点</button></div><div class="actions"><button class="btn" data-origin3d-nudge="0,-50">X −50</button><button class="btn" data-origin3d-nudge="0,50">X ＋50</button><button class="btn" data-origin3d-nudge="1,-50">Y −50</button><button class="btn" data-origin3d-nudge="1,50">Y ＋50</button></div><p data-origin3d-status role="status"></p><p class="project-error" data-origin3d-error role="alert"></p><div class="actions"><button class="btn" data-origin3d-reset>恢复已保存起点</button><button class="btn" data-fab-close>取消</button><button class="btn primary" data-origin3d-apply>应用起铺点</button></div><p class="muted">选点时仅接受本区域可见地面，墙面、家具及其它房间不会成为落点。圆环拖动中暂停镜头旋转，靠近墙边12像素内吸附并沿墙拖动，角点优先；向内拉离墙边可恢复自由移动；拖到区域外保留最后有效位置。Esc取消本次拖动，选点模式下Esc结束选点，再按Esc关闭预览。砖规格、地面标高和其它区域保持。</p></section>`,{allowCanvas:e=>e?.type==='keydown'?(picking||!!drag):true,dispose});
 const get=i=>host.querySelector(`[data-origin3d="${i}"]`),read=()=>[0,1].map(i=>get(i).value.trim()===''?NaN:Number(get(i).value)),status=host.querySelector('[data-origin3d-status]'),error=host.querySelector('[data-origin3d-error]'),pick=host.querySelector('[data-origin3d-pick]');
 function generate(){cancelAnimationFrame(frame);frame=0;try{const origin=read(),result=View3D.previewFloorOrigin(id,origin,handlePoint);if(!result)throw Error('三维场景尚未就绪');error.textContent='';host.dataset.origin=JSON.stringify(origin);status.textContent=`已生成三维预览：X ${origin[0]}，Y ${origin[1]} mm；地砖与 ${result.walls} 处关联墙砖同步更新，待应用。`;}catch(e){View3D.clearFloorOriginPreview();delete host.dataset.origin;error.textContent=e.message;status.textContent='当前输入无效，已恢复保存排版。';}}
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 function snapLabel(kind){return kind==='corner'?'已吸附完成面角点；':kind==='edge'?'已吸附墙边，可沿墙拖动；':'';}
 function flushDrag(){if(!pendingDrag)return;const next=pendingDrag;pendingDrag=null;handlePoint=next.handle;next.origin.forEach((v,i)=>get(i).value=Number(v.toFixed(2)));generate();if(drag){drag.snapKind=next.snapKind;status.textContent=(snapLabel(next.snapKind)||'拖动中：')+'墙地砖实时重排；松手保留预览，Esc取消本次拖动。';}}
 function move(e){
  if(!drag){if(e.target.tagName==='CANVAS')e.target.style.cursor=View3D.floorOriginHandleHit(e.clientX,e.clientY,id)?'grab':'';return;}
  if(e.pointerId!==drag.pid){consume(e);return;}consume(e);
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3&&!drag.moved)return;
  const hit=View3D.floorOriginDragPoint(e.clientX,e.clientY,id,drag.anchor.map((v,i)=>v-[drag.start.x,drag.start.y][i]),{snap:true});if(!hit)return;
  const delta=[hit.x-drag.start.x,hit.y-drag.start.y];drag.moved=true;pendingDrag={origin:drag.origin.map((v,i)=>v+delta[i]),handle:drag.anchor.map((v,i)=>v+delta[i]),snapKind:hit.snapKind};
  if(!frame)frame=requestAnimationFrame(flushDrag);
 }
 function finishDrag(cancel=false,restore=true){
  if(!drag)return;const d=drag;cancelAnimationFrame(frame);frame=0;if(!cancel)flushDrag();drag=null;pendingDrag=null;
  delete host.dataset.dragging;scene.classList.remove('floor-origin-dragging');d.canvas.style.cursor='';View3D.lockFloorOriginDrag(false);
  if(d.canvas.hasPointerCapture(d.pid))d.canvas.releasePointerCapture(d.pid);
  if(cancel&&restore){handlePoint=d.hint;d.origin.forEach((v,i)=>get(i).value=v);generate();status.textContent='已取消本次拖动，恢复拖动前预览；可继续调整。';}
  else if(restore)status.textContent=snapLabel(d.snapKind)+'拖动预览已保留；可继续拖动圆环，或应用起铺点。';
 }
 function endDrag(e){if(drag&&e.pointerId===drag.pid){consume(e);if(e.type==='pointerup')move(e);finishDrag(e.type!=='pointerup');}}
 function blur(){finishDrag(true);}
 function dispose(){cancelAnimationFrame(frame);cancelAnimationFrame(focusFrame);finishDrag(true,false);scene.removeEventListener('pointerdown',choose,true);scene.removeEventListener('pointermove',move,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.removeEventListener(type,endDrag,true);document.removeEventListener('keydown',escape,true);window.removeEventListener('blur',blur);scene.querySelector('canvas')?.style.removeProperty('cursor');scene.classList.remove('floor-origin-picking','floor-origin-dragging');View3D.clearFloorOriginPreview();}
 function setPicking(value){picking=value;pick.setAttribute('aria-pressed',String(value));pick.textContent=value?'结束地面选点':'三维地面选点';scene.classList.toggle('floor-origin-picking',value);if(value)status.textContent='正在选点：点击卫生间可见地面立即重排；靠近完成面角点可吸附。Esc结束选点。';}
 function choose(e){
  if(drag){consume(e);return;}if(e.target.tagName!=='CANVAS'||e.button!==0||e.isPrimary===false)return;
  const handle=View3D.floorOriginHandleHit(e.clientX,e.clientY,id);
  if(handle){consume(e);View3D.lockFloorOriginDrag(true);const start=View3D.floorOriginDragPoint(e.clientX,e.clientY,id,undefined,{start:true});if(!start){View3D.lockFloorOriginDrag(false);return;}drag={pid:e.pointerId,canvas:e.target,x:e.clientX,y:e.clientY,start,anchor:handle.point,origin:read(),hint:handlePoint?.slice()};e.target.setPointerCapture(e.pointerId);host.dataset.dragging='true';scene.classList.add('floor-origin-dragging');status.textContent='拖动橙色圆环，墙地砖随手势更新；Esc取消本次拖动。';return;}
  if(!picking)return;consume(e);
  const hit=View3D.floorOriginPoint(e.clientX,e.clientY,id);if(!hit){status.textContent='此处不是本区域可见地面，请避开墙体和家具后再选点。';return;}
  const room=FurnishWallFinish.spatial(FurnishProject.effectivePlan(PLAN,state)).rooms.find(r=>r.id===id),point=F.snapOrigin([hit.x,hit.y],room?[room]:[],12/Math.max(hit.s,.0001));
  handlePoint=null;point.point.forEach((v,i)=>get(i).value=Number(v.toFixed(2)));generate();if(point.snapped)status.textContent+=' 已吸附完成面角点。';
 }
 function escape(e){if(e.key!=='Escape')return;if(drag){consume(e);finishDrag(true);}else if(picking){consume(e);setPicking(false);status.textContent='已结束选点，当前预览保留；可继续旋转观察、应用或取消。';}}
 host.querySelectorAll('[data-origin3d]').forEach(input=>input.oninput=()=>{handlePoint=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(generate);});
 host.querySelector('[data-origin3d-top]').onclick=()=>View3D.focusFloorOrigin(id);
 pick.onclick=()=>setPicking(!picking);host.querySelector('[data-origin3d-generate]').onclick=generate;
 host.querySelectorAll('[data-origin3d-nudge]').forEach(b=>b.onclick=()=>{handlePoint=null;const [i,delta]=b.dataset.origin3dNudge.split(',').map(Number);get(i).value=Number(get(i).value)+delta;generate();});
 host.querySelector('[data-origin3d-reset]').onclick=()=>{handlePoint=null;saved.forEach((v,i)=>get(i).value=v);generate();};
 host.querySelector('[data-origin3d-apply]').onclick=()=>{try{const next=F.setLayoutBasis(state,FurnishProject.effectivePlan(PLAN,state),[id],{origin:read()});closeFabEditor(false);if(JSON.stringify(next.floorFinishes)!==JSON.stringify(state.floorFinishes))mutate(()=>state.floorFinishes=next.floorFinishes);toast('本区域起铺点已应用，可一次撤销；其它区域保持');}catch(e){error.textContent=e.message;}};
 scene.addEventListener('pointerdown',choose,true);scene.addEventListener('pointermove',move,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(type,endDrag,true);document.addEventListener('keydown',escape,true);window.addEventListener('blur',blur);generate();focusFrame=requestAnimationFrame(()=>{focusFrame=0;if(host.isConnected)View3D.focusFloorOrigin(id);});
}
function openFloating(tab='layout'){
 closeFabEditor(false);const room=ROOMS.find(r=>r.id===ui.sel?.id&&ui.sel.kind==='room'&&r.counted!==false);if(!room)return;
 drawer('panel',false);
 const host=mountFabEditor('floor',`${state.rooms[room.id].name} · 地砖铺贴`,panel(room,'fab-floor'),{allowCanvas:()=>!!cancelPick,dispose:()=>{cancelPick?.();clearPreview();}});
 bind(host.querySelector('[data-floor-room]'),{prefix:'fab-floor',onApplied:()=>{if(ui.sel?.kind==='room'&&ui.sel.id===room.id)openFloating(host.querySelector('[data-floor-show].on')?.dataset.floorShow||'layout');}});host.querySelector(`[data-floor-show="${tab}"]`)?.click();window.FurnishFinishGuideUI?.attachEditor(host,'floor',room.id);queueFabPosition();
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
function openLevels(){
 const plan=FurnishProject.effectivePlan(PLAN,state),rooms=plan.rooms.filter(r=>r.counted!==false);if(!rooms.length)return toast('当前没有可设置的区域');
 const common=key=>{const values=[...new Set(rooms.map(r=>state.floorFinishes?.areas[r.id]?.[key]).filter(Number.isFinite))];return values.length===1?values[0]:key==='rawZ'&&!values.length?0:'';};
 const field=(key,label,value,min,max)=>`<label>${label}<input data-floor-level="${key}" type="number" step="any" min="${min}" max="${max}" value="${value}"></label>`;
 closeFabEditor(false);openDialog({title:'批量设置地面标高',wide:true,body:`<section data-floor-level-editor><p>统一填写所选区域的各层厚度，完成标高＝毛坯标高＋面层厚度＋粘结找平层。单位 mm，毛坯标高共用同一水平基准。</p><p class="muted">应用后启用所选区域，改为按各层厚度计算；原目标标高及参考关系会移除。砖尺寸、砖缝、起铺点、家具和柜体保持。</p><div class="form">${field('rawZ','毛坯地面标高',common('rawZ'),-20000,20000)}${field('tileThickness','面层／瓷砖厚度',common('tileThickness'),0,1000)}${field('baseThickness','粘结＋找平层厚度',common('baseThickness'),0,1000)}</div><label><input type="checkbox" id="floor-level-bathroom"> 卫生间单独设置粘结＋找平层厚度</label><div class="form" id="floor-level-bathroom-fields" hidden>${field('bathroomBaseThickness','卫生间粘结＋找平层厚度','',0,1000)}</div><div class="actions"><button class="btn" data-floor-level-select="all">全选区域</button><button class="btn" data-floor-level-select="none">取消全选</button></div><div id="floor-level-rooms">${rooms.map(r=>`<div class="floor-region-row"><label><input type="checkbox" data-floor-level-room="${esc(r.id)}" checked> <b>${esc(state.rooms[r.id]?.name||r.name)}</b></label><p data-floor-level-preview="${esc(r.id)}">待填写</p></div>`).join('')}</div><p data-floor-level-error class="project-error" role="alert"></p><p class="muted">墙砖默认从各自区域的完成地面起铺；已有自定义起铺高度保持，可在墙砖列表调整。</p></section>`,actions:[{label:'返回区域列表',fn:()=>{openList();return false;}},{label:'应用并启用所选区域',cls:'primary',fn:()=>{try{const next=read();if(JSON.stringify(next.floorFinishes)!==JSON.stringify(state.floorFinishes))mutate(()=>state.floorFinishes=next.floorFinishes);openList();toast('所选区域地面标高已应用，可一次撤销');}catch(e){error.textContent=e.message;}return false;}}]});
 const body=document.querySelector('#dlgBody [data-floor-level-editor]'),error=body.querySelector('[data-floor-level-error]'),bath=body.querySelector('#floor-level-bathroom');
 function read(){const values={};for(const input of body.querySelectorAll('[data-floor-level]'))if(input.dataset.floorLevel!=='bathroomBaseThickness'||bath.checked)values[input.dataset.floorLevel]=input.value.trim()===''?NaN:Number(input.value);return F.setLayers(state,plan,[...body.querySelectorAll('[data-floor-level-room]:checked')].map(el=>el.dataset.floorLevelRoom),values);}
 function update(){body.querySelector('#floor-level-bathroom-fields').hidden=!bath.checked;try{const next=read(),p=F.derive(FurnishProject.effectivePlan(PLAN,{...state,floorFinishes:undefined}),next);error.textContent='';for(const el of body.querySelectorAll('[data-floor-level-preview]')){const id=el.dataset.floorLevelPreview,selected=[...body.querySelectorAll('[data-floor-level-room]:checked')].some(v=>v.dataset.floorLevelRoom===id);el.textContent=selected?`预览完成标高 ${p.floorFinish.areas[id].finishedZ} mm`:'保持原设置';}}catch(e){error.textContent=e.message;body.querySelectorAll('[data-floor-level-preview]').forEach(el=>el.textContent='待填写有效参数');}}
 body.addEventListener('input',update);body.addEventListener('change',update);body.querySelectorAll('[data-floor-level-select]').forEach(b=>b.onclick=()=>{body.querySelectorAll('[data-floor-level-room]').forEach(el=>el.checked=b.dataset.floorLevelSelect==='all');update();});
}
function openList(){
 closeFabEditor(false);
 openDialog({title:'区域地砖铺贴',wide:true,body:'<p>勾选立即启用，取消勾选保留参数。未知厚度保持待核对；家具按下方高度基准派生。非瓷砖材质仅启用地面标高。</p><div class="actions"><button class="btn" data-floor-bulk="on">全部启用</button><button class="btn" data-floor-bulk="off">全部关闭</button><button class="btn" data-floor-unify>统一起铺点</button><button class="btn" data-floor-levels>批量设置地面标高</button></div><label>家具高度基准<select data-furniture-datum><option value="finished-floor">完成地面（自动抬高全部家具及设备）</option><option value="survey">毛坯绝对标高（旧方案）</option></select></label><p class="muted">输入的离地／台面／混水器高度保持数值，完成地面模式叠加所属区域标高；关联设备跟随宿主，只叠加一次。未知地面暂按0显示并待核对。门窗、梁和天花仍采用毛坯绝对标高。</p><p data-floor-count role="status"></p><div id="floor-region-list"></div>',actions:[{label:'关闭'}]});
 const datum=document.querySelector('[data-furniture-datum]');datum.value=state.furnitureDatum||'survey';datum.onchange=()=>{mutate(()=>state.furnitureDatum=datum.value);toast('家具高度基准已更新，可一次撤销');refreshList();};
 document.querySelector('[data-floor-unify]').onclick=openUnified;document.querySelector('[data-floor-levels]').onclick=openLevels;
 const guide=document.createElement('button');guide.className='btn';guide.dataset.finishGuideOpen='';guide.textContent='分步设定引导';document.querySelector('[data-floor-unify]').after(guide);
 refreshList();
 window.FurnishFinishGuideUI?.attachList('floor');
}
function refreshList(){
 const host=document.querySelector('#floor-region-list');if(!host||document.querySelector('#dlg').hidden)return;
 const plan=FurnishProject.effectivePlan(PLAN,state),rooms=plan.rooms.filter(r=>r.counted!==false),active=rooms.filter(r=>state.floorFinishes?.areas[r.id]&&state.floorFinishes.areas[r.id].enabled!==false);
 document.querySelector('[data-furniture-datum]').value=state.furnitureDatum||'survey';
 document.querySelector('[data-floor-count]').textContent=`已启用 ${active.length} / ${rooms.length} 个区域`;
 host.innerHTML=rooms.map(r=>{const s=state.floorFinishes?.areas[r.id],enabled=!!s&&s.enabled!==false,a=plan.floorFinish?.areas[r.id];return `<div class="floor-region-row"><label><input type="checkbox" data-floor-enable="${esc(r.id)}" aria-label="启用 ${esc(r.name)}" ${enabled?'checked':''}><b>${esc(r.name)}</b></label><div><small>${F.tiled(state.rooms[r.id].mat)?'地砖铺贴':'非瓷砖 · 仅标高'}</small><p class="${a?.pending?'project-error':'muted'}">${enabled?(Number.isFinite(a?.finishedZ)?`完成标高 ${a.finishedZ} mm`:esc(a?.pending||'标高待核对')):s?'已关闭，参数保留':'未启用'}</p></div><div class="floor-region-actions"><button class="btn" data-floor-edit="${esc(r.id)}">编辑参数</button>${(state.rooms[r.id]?.use||r.use)==='bathroom'?`<button class="btn" data-floor-origin3d="${esc(r.id)}">3D动态调整</button>`:''}</div></div>`;}).join('');
 host.querySelectorAll('[data-floor-enable]').forEach(input=>input.onchange=()=>{try{applyEnabled([input.dataset.floorEnable],input.checked);}catch(e){toast(e.message);}refreshList();[...host.querySelectorAll('[data-floor-enable]')].find(el=>el.dataset.floorEnable===input.dataset.floorEnable)?.focus({preventScroll:true});});
 document.querySelectorAll('[data-floor-bulk]').forEach(b=>b.onclick=()=>{try{applyEnabled(rooms.map(r=>r.id),b.dataset.floorBulk==='on');}catch(e){toast(e.message);}refreshList();});
 host.querySelectorAll('[data-floor-origin3d]').forEach(b=>b.onclick=()=>open3DOrigin(b.dataset.floorOrigin3d));
 host.querySelectorAll('[data-floor-edit]').forEach(b=>b.onclick=()=>{closeDialog();select({kind:'room',id:b.dataset.floorEdit});openFloating();});
}
document.addEventListener('click',e=>{if(e.target.closest('[data-floor-list]'))openList();});
window.addEventListener('load',()=>{const rail=document.querySelector('.canvas-rail .rail-finishes');if(!rail||document.querySelector('#floor-regions-open'))return;const button=document.createElement('button');button.className='btn';button.id='floor-regions-open';button.dataset.floorList='';button.innerHTML=ico('floor-tile')+`<span data-zh="地砖" data-en="Floor tiles">${tr('地砖','Floor tiles')}</span>`;button.title='区域地砖铺贴';rail.append(button);});
window.FurnishFloorFinishUI={open3DOrigin,panel,bind,furniturePanel,openFloating,openList,openUnified,openLevels,afterRender,afterView:redrawOrigin,picking:()=>!!cancelPick};
})();
