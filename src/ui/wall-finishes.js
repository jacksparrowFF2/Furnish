/* Finish edits use the ordinary work snapshot, undo and autosave channel. */
(function(){
'use strict';
const F=FurnishWallFinish,plan=()=>FurnishProject.effectivePlan(PLAN,state);
function setting(face){return state.wallFinishes?.surfaces.find(s=>s.wallId===face.wallId&&s.side===face.side&&!!s.cross===!!face.cross&&Math.min(s.range[1],face.range[1])-Math.max(s.range[0],face.range[0])>1e-6);}
function panel(id,host){
 const index=Number(id.slice(1));wallPanel(PLAN.wallRefs?.[index]||'builtin_'+index,host);
}
function opening(sel,host){
 const p=plan(),refs=sel.kind==='win'?p.winRefs:sel.kind==='door'?p.doorRefs:p.slideRefs;
 const id=sel.kind==='win'?p.wins[sel.id]?.bayId||refs?.[sel.id]:refs?.[sel.id],o=p.customDraft?.openings.find(o=>o.id===id);
 if(o)wallPanel(o.wall,host,p);
}
function wallPanel(wallId,host,p=plan()){
 const faces=F.faces(p).filter(f=>f.wallId===wallId);
 const section=document.createElement('section');section.id='wall-finish-panel';
 section.innerHTML=`<h3>${tr('墙面贴砖与完成面','Wall tile finish')}</h3><p class="muted">${tr('毛坯墙位置与结构厚度保留。选择朝向房间的一侧；厚度只向该侧室内增加。留空表示未知，不会自动移动家具或修改柜体。','Survey walls stay fixed. Finishes extend into the selected room. Empty thickness is unknown; existing furniture and cabinets stay unchanged.')}</p>${faces.map((f,i)=>{
  const s=setting(f),label=`${state.rooms[f.roomId]?.name||f.roomName} · ${f.axis===0?(f.side===1?'下侧':'上侧'):(f.side===1?'右侧':'左侧')}`;
  return `<fieldset data-finish-face="${i}" style="min-width:0;margin:12px 0"><legend>${esc(label)}</legend><label><input type="checkbox" data-finish-enabled ${s?'checked':''}> ${tr('整面墙贴砖','Tile this wall face')}</label><div class="form"><label>${tr('瓷砖厚度 mm','Tile thickness mm')}<input data-finish-tile type="number" min="0" max="200" step="any" placeholder="${tr('待定','Unknown')}" value="${s?.tileThickness??''}" ${s?'':'disabled'}></label><label>${tr('粘结层厚度 mm','Bond thickness mm')}<input data-finish-bond type="number" min="0" max="200" step="any" placeholder="${tr('待定','Unknown')}" value="${s?.bondThickness??''}" ${s?'':'disabled'}></label></div><p data-finish-total class="muted"></p><button class="btn primary" data-finish-apply>${tr('应用此墙面','Apply wall finish')}</button></fieldset>`;
 }).join('')||`<p>${tr('此墙段没有可识别的室内墙面。','No interior face was identified.')}</p>`}<p data-finish-error class="project-error" role="alert"></p><p class="muted">${tr('墙侧方位按原图；门窗正面留洞，本阶段不做洞口侧面包砖。完成面净距不含柜体安装余量。','Sides use original plan axes. Openings remain clear; jamb finishes are not included. Cabinet installation allowance is separate.')}</p>`;
 host.append(section);
 for(const field of section.querySelectorAll('[data-finish-face]')){
  const face=faces[Number(field.dataset.finishFace)],enabled=field.querySelector('[data-finish-enabled]'),tile=field.querySelector('[data-finish-tile]'),bond=field.querySelector('[data-finish-bond]'),total=field.querySelector('[data-finish-total]');
  const update=()=>{tile.disabled=bond.disabled=!enabled.checked;total.textContent=!enabled.checked?tr('使用毛坯墙面','Using survey face'):tile.value.trim()===''||bond.value.trim()===''?tr('完成面厚度待定，净尺寸仅供参考','Finish thickness unknown; clear dimensions are provisional'):tr(`向室内增加 ${Number(tile.value)+Number(bond.value)} mm`,`Adds ${Number(tile.value)+Number(bond.value)} mm into the room`);};
  enabled.onchange=tile.oninput=bond.oninput=update;update();
  field.querySelector('[data-finish-apply]').onclick=()=>{try{
   const values=enabled.checked?{...(tile.value.trim()===''?{}:{tileThickness:Number(tile.value)}),...(bond.value.trim()===''?{}:{bondThickness:Number(bond.value)})}:null,next=F.edit(state,face,values);
   if(JSON.stringify(next.wallFinishes)===JSON.stringify(state.wallFinishes))return;
   FurnishProject.effectivePlan(PLAN,next); // Reject unsupported geometry before any history or state write.
   mutate(()=>{if(next.wallFinishes)state.wallFinishes=next.wallFinishes;else delete state.wallFinishes;});
   toast(tr('墙面饰面已应用；已有家具与柜体保持，请核对完成面净距','Wall finish applied; review clearances. Existing furniture and cabinets are unchanged.'));
  }catch(e){section.querySelector('[data-finish-error]').textContent=e.message;}};
 }
}
function roomPanel(room){
 const p=plan(),finished=F.spatial(p).rooms.find(r=>r.id===room.id),a=finished?FurnishProject.area(finished.poly):0;
 const pending=p.wallFinish?.pending.length;
 return `<section><h3>${tr('装修完成面','Finished room')}</h3><p>${tr('毛坯面积','Survey area')} ${FurnishProject.area(room.poly).toFixed(3)} m² · ${tr('完成面净面积','Finished clear area')} ${a.toFixed(3)} m²${pending?` · ${tr('厚度／关联待核对','Thickness / binding pending')}`:''}</p><p class="muted">${tr('选择墙体，在「墙面贴砖与完成面」中设置。地面预算仍按毛坯面积计算；已保存测量线端点保持不变。','Select a wall to set its finish. Flooring estimates retain survey area; saved measurement endpoints remain fixed.')}</p>${(p.wallFinish?.pending||[]).map(v=>`<p class="project-error">${esc(v.message)} <button class="btn" data-remove-finish="${v.index}">${tr('移除此项饰面','Remove this finish')}</button></p>`).join('')}</section>`;
}
function bind(){for(const button of document.querySelectorAll('[data-remove-finish]'))button.onclick=()=>mutate(()=>{state.wallFinishes.surfaces.splice(Number(button.dataset.removeFinish),1);if(!state.wallFinishes.surfaces.length)delete state.wallFinishes;});}
window.FurnishWallFinishUI={panel,opening,roomPanel,bind};
})();
