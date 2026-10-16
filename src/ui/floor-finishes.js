/* All edits go through mutate(), including copying a layout basis. */
(function(){
'use strict';
const F=FurnishFloorFinish;let cancelPick=null;
function panel(room){
 if(room.counted===false)return '';
 const s=state.floorFinishes?.areas[room.id],v=s||F.defaults(room,state.rooms[room.id]),p=FurnishProject.effectivePlan(PLAN,state),a=p.floorFinish?.areas[room.id];
 const input=(key,label,value,min,max)=>`<label>${label}<input data-floor="${key}" type="number" step="any" ${min!==undefined?`min="${min}" max="${max}"`:''} value="${value??''}" placeholder="待核对"></label>`;
 const spec=state.pricing?.materialSpecs?.[state.rooms[room.id].mat],mismatch=spec&&v.layout&&!((v.layout.width===spec.length&&v.layout.height===spec.width)||(v.layout.height===spec.length&&v.layout.width===spec.width));
 const options=ROOMS.filter(r=>r.id!==room.id&&r.counted!==false).map(r=>`<option value="${esc(r.id)}" ${v.reference===r.id?'selected':''}>${esc(state.rooms[r.id]?.name||r.name)}</option>`).join('');
 return `<section id="floor-finish-panel" data-floor-room="${esc(room.id)}"><h3>地砖铺贴与地面标高</h3><label><input id="floor-enabled" type="checkbox" ${s?'checked':''}> 启用此区域地面设置</label><p class="muted">所有标高相对原毛坯测量基准，单位 mm。厚度未知请留空。应用不会移动家具、抬高设备或改变柜体配置。</p><div class="form">
 ${input('rawZ','毛坯地面标高',v.rawZ,-20000,20000)}${input('tileThickness','面层／地砖厚度',v.tileThickness,0,1000)}${input('baseThickness','粘结＋找平层厚度',v.baseThickness,0,1000)}
 <label>标高计算<select data-floor="mode"><option value="layers" ${v.mode==='layers'?'selected':''}>按各层厚度计算</option><option value="level" ${v.mode==='level'?'selected':''}>按目标标高推算找平层</option><option value="reference" ${v.mode==='reference'?'selected':''}>低于参考区域</option></select></label>
 ${input('targetZ','目标完成标高（目标模式）',v.targetZ,-20000,20000)}<label>参考区域<select data-floor="reference"><option value="">请选择</option>${options}</select></label>${input('drop','比参考区域低（卫生间默认 5）',v.drop??5,0,1000)}</div><p class="muted">目标／参考模式：找平层留空时推算；已填厚度与目标不一致会提示冲突，保留输入。毛坯标高不随高差改变。</p>
 ${F.tiled(state.rooms[room.id].mat)?`<h4>直铺参数</h4>${mismatch?'<p class="project-error">铺贴砖尺寸与已录入采购规格不同，请核对；采购数量与订单保持原设置。</p>':''}<div class="form">${input('width','砖长',v.layout?.width??800,20,6000)}${input('height','砖宽',v.layout?.height??800,20,6000)}${input('gap','砖缝',v.layout?.gap??2,0,50)}${input('angle','铺贴方向（原图角度）',v.layout?.angle??0,-360,360)}${input('originX','起铺砖角 X',v.layout?.origin[0]??0)}${input('originY','起铺砖角 Y',v.layout?.origin[1]??0)}</div><div class="actions"><button class="btn" data-floor-angle="0">0°</button><button class="btn" data-floor-angle="90">90°</button><button class="btn" id="floor-pick">图上选起铺点</button></div><label>沿用其它区域的起铺点与方向<select id="floor-copy"><option value="">独立设置</option>${options}</select></label><p class="muted">起铺点是参考整砖左上角，可在区域外；转动视图不会改变排版。材料预算仍按原面积估算，不含切砖优化。</p>`:'<p class="muted">当前材料不是瓷砖，仅设置地面标高。</p>'}
 <p data-floor-summary>${a?`毛坯 ${a.rawZ??'待定'} → 完成 ${a.finishedZ??'待定'} mm${a.requiredBase!==undefined?`；所需找平层 ${a.requiredBase} mm`:''}；完成面至天花 ${Number.isFinite(a.finishedZ)?FurnishProject.roomCeilingHeight(state,room)-a.finishedZ:'待定'} mm`: '未启用时保留旧项目的显示与高度'}</p>${a?.pending?`<p class="project-error">${esc(a.pending)}</p>`:''}<p data-floor-error class="project-error" role="alert"></p><div class="actions"><button class="btn primary" id="floor-apply">应用地面设置</button></div>${(p.floorFinish?.pending||[]).filter(v=>!ROOMS.some(r=>r.id===v.id)).map(v=>`<p class="project-error">${esc(v.id)}：${esc(v.message)} <button class="btn" data-floor-remove="${esc(v.id)}">移除失效设置</button></p>`).join('')}</section>`;
}
function bind(){
 cancelPick?.();cancelPick=null;
 const host=document.querySelector('#floor-finish-panel');if(!host)return;
 const get=k=>host.querySelector(`[data-floor="${k}"]`),num=k=>get(k)?.value.trim()===''?undefined:Number(get(k)?.value),id=host.dataset.floorRoom;
 host.querySelectorAll('[data-floor-angle]').forEach(b=>b.onclick=()=>get('angle').value=b.dataset.floorAngle);
 const copy=host.querySelector('#floor-copy');if(copy)copy.onchange=()=>{const l=state.floorFinishes?.areas[copy.value]?.layout;if(!l){if(copy.value)toast('参考区域尚未设置铺贴参数');return;}get('angle').value=l.angle;get('originX').value=l.origin[0];get('originY').value=l.origin[1];};
 const pick=host.querySelector('#floor-pick');if(pick)pick.onclick=()=>{
  toast('点击图面选择起铺砖角；靠近完成面角点会吸附，Esc 取消');
  cancelPick?.();
  const stop=()=>{cancelPick=null;svg.removeEventListener('pointerdown',choose,true);document.removeEventListener('keydown',cancel,true);},cancel=e=>{if(e.key==='Escape')stop();};
  const choose=e=>{if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const layer=document.querySelector('#gRooms'),local=new DOMPoint(e.clientX,e.clientY).matrixTransform(layer.getScreenCTM().inverse());
   let at=[local.x,local.y],distance=12/(view.s||1);const plan=FurnishWallFinish.spatial(FurnishProject.effectivePlan(PLAN,state));
   for(const r of plan.rooms)for(const q of (r.rings||[r.poly]).flat()){const d=Math.hypot(q[0]-at[0],q[1]-at[1]);if(d<distance){at=q;distance=d;}}
   get('originX').value=Number(at[0].toFixed(2));get('originY').value=Number(at[1].toFixed(2));stop();};
  cancelPick=stop;svg.addEventListener('pointerdown',choose,true);document.addEventListener('keydown',cancel,true);
 };
 host.querySelector('#floor-apply').onclick=()=>{try{
  const data=JSON.parse(JSON.stringify(state.floorFinishes||{version:1,areas:{}}));
  if(!host.querySelector('#floor-enabled').checked)delete data.areas[id];else {
   const v={mode:get('mode').value};for(const key of ['rawZ','tileThickness','baseThickness','targetZ','drop'])if(num(key)!==undefined)v[key]=num(key);
   if(get('reference').value)v.reference=get('reference').value;
   if(get('width'))v.layout={width:num('width'),height:num('height'),gap:num('gap'),angle:num('angle'),origin:[num('originX'),num('originY')]};else if(data.areas[id]?.layout)v.layout=data.areas[id].layout;data.areas[id]=v;
  }
  F.validate(data);F.derive(FurnishProject.effectivePlan(PLAN,{...state,floorFinishes:undefined}),{...state,floorFinishes:data});
  mutate(()=>{if(Object.keys(data.areas).length)state.floorFinishes=data;else delete state.floorFinishes;});
  toast('地面设置已应用；请核对家具底部、门底和完成面净高');
 }catch(e){host.querySelector('[data-floor-error]').textContent=e.message;}};
 host.querySelectorAll('[data-floor-remove]').forEach(b=>b.onclick=()=>mutate(()=>{delete state.floorFinishes.areas[b.dataset.floorRemove];if(!Object.keys(state.floorFinishes.areas).length)delete state.floorFinishes;}));
}
function furniturePanel(f){
 const p=FurnishProject.effectivePlan(PLAN,state),areas=F.at(p,[f.cx,f.cy]).filter(a=>!a.legacy);if(!areas.length)return '';
 const v=FurnishDesign.furnitureVerticalBounds(f);
 return `<section data-floor-furniture><h3>完成地面与安装高度</h3>${areas.map(a=>`<p>${esc(a.room.name)}：完成标高 ${a.finishedZ??'待核对'} mm；家具底部距完成地面 ${v&&Number.isFinite(a.finishedZ)?Number((v.bottom-a.finishedZ).toFixed(2)):'待核对'} mm</p>`).join('')}<p class="muted">现有安装高度以毛坯测量基准保留；地面变更不会自动抬高。负净距表示与完成地面重叠，请人工核对。</p></section>`;
}
window.FurnishFloorFinishUI={panel,bind,furniturePanel};
})();
