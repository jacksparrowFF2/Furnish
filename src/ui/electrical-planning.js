/* Classic script, loaded after app.js. No additional persistence channel. */
globalThis.FurnishElectricalUI=(()=>{
 const height=v=>v===null?'待核对':Number(v.toFixed(1));
 const E=FurnishElectrical,NS='http://www.w3.org/2000/svg';
 const controlLabels={smart:['智能','Smart'],conventional:['常规','Conventional'],sensor:['感应','Sensor']};
 const linkLabels={wired:['有线双控','Wired two-way'],mijia:['米家联动','Mijia automation']};
 const gangLabels=[null,['单开','1 gang'],['双开','2 gang'],['三开','3 gang'],['四开','4 gang']];
 let adding=false,poseHost=null,relations=E.controlPairs([]);
 let contextPlan,planRoom=null,cameraRoom=null,roomScope='auto';
 const collapsed=new Set();
 function resetContext(){
  if(contextPlan===PLAN.id)return;
  contextPlan=PLAN.id;planRoom=null;cameraRoom=null;roomScope='auto';collapsed.clear();
 }
 function scopedRoom(){
  resetContext();
  const id=roomScope==='auto'?(is3D()?cameraRoom:planRoom):roomScope;
  return ROOMS.find(room=>room.id===id)||null;
 }
 function rowVisible(room){const scope=scopedRoom();return !scope||scope.id===room?.id;}
 function visibleAt(x,y){const scope=scopedRoom();return !scope||E.roomFor(ROOMS,x,y)?.id===scope.id;}
 function hiddenScenePanels(){
  const scope=scopedRoom();
  if(!scope)return null;
  return new Set([...relations.locations].filter(([,location])=>location.room?.id!==scope.id).map(([id])=>'furniture:'+id));
 }
 function updateCameraRoom(id){
  resetContext();
  if(cameraRoom===id)return false;
  cameraRoom=id;
  if(roomScope!=='auto')return false;
  refreshList();refreshInlineList();
  return true;
 }
 const active=()=>ui.planMode==='electrical';
 const physicalLocked=f=>!!f&&(!!f.locked||FurnishLayers.locked(state,'furniture:'+f.id));
 const blocked=f=>active()&&!E.panel(f);
 function assertEditable(before,after){if(active())E.assertEditable(before,after);}
 function setMode(mode){
  if(!['furniture','ceiling','electrical'].includes(mode))return;
  if(mode==='electrical'&&active())return;
  endDrag(true);closeFabEditor(false);if(!$('#dlg').hidden)closeDialog();
  globalThis.FurnishWiringUI?.leave();
  adding=false;poseHost=null;ui.sceneMove=false;ui.sel=null;ui.tool='select';ui.planMode=mode;saveUI();renderAll();applyView();
 }
 function selection(sel){
  if(!active())return sel;
  resetContext();
  const point=sel?.kind==='furn'&&getF(sel.id);
  const next=sel?.kind==='room'?sel.id:point&&E.panel(point)?E.roomFor(ROOMS,point.cx,point.cy)?.id:null;
  if(next&&next!==planRoom){planRoom=next;if(!is3D()&&roomScope==='auto')refreshList();}
  if(sel?.kind!=='furn')return null;
  const ids=(sel.ids||[sel.id]).filter(id=>E.panel(getF(id))),id=ids.includes(sel.id)?sel.id:ids[0];
  if(!ids.length){poseHost=sel.id;return null;}
  poseHost=null;return {...sel,id,ids};
 }
 function geometry(){return E.surfaces(canvasEffectivePlan(),state,selItems()[0]);}
 function refreshRelations(){relations=E.controlPairs(state.furniture,ROOMS);}
 function relatedIds(){return [...(relations.links.get(ui.sel?.kind==='furn'?ui.sel.id:null)?.keys()||[])];}
 function pairedOverlay(){
  if(!active()&&!ui.layers.furn)return '';
  const markers=relatedIds().map(getF).filter(f=>f&&(!active()||visibleAt(f.cx,f.cy))&&FurnishLayers.visible(state,FurnishLayers.furnitureKey(f)));
  return markers.map(f=>`<g transform="rotate(${drawingRotation()})" pointer-events="none"><circle data-electrical-peer="${esc(f.id)}" cx="${f.cx}" cy="${f.cy}" r="${17/view.s}" fill="none" stroke="#00877e" stroke-width="3" vector-effect="non-scaling-stroke"/></g>`).join('');
 }
 function draw(root=svg,{exporting=false,visibleLayers=true}={}){
  let g=root.querySelector('#gElectrical');
  if(!active()){g?.remove();globalThis.FurnishWiringUI?.draw(root);return;}
  if(!g){g=document.createElementNS(NS,'g');g.id='gElectrical';root.querySelector('#gSel')?.before(g);if(!g.parentNode)root.append(g);}
  g.setAttribute('transform',`rotate(${drawingRotation()})`);
  const scale=exporting ? .075 : view.s,k=1/scale,rows=E.points(state,canvasEffectivePlan()).filter(r=>(exporting||rowVisible(r.room))&&(!visibleLayers||FurnishLayers.visible(state,'furniture:'+r.id)));
  g.innerHTML=rows.map(r=>{const f=getF(r.id),selected=selIds().includes(f.id),rotation=-drawingRotation(),radius=11+Math.max(0,r.number.length-3)*3;return `<g data-electrical-symbol="${esc(f.id)}" ${exporting?'':`data-fid="${esc(f.id)}"`} transform="translate(${f.cx} ${f.cy}) rotate(${rotation})" style="cursor:move"><title>${esc([r.number,E.pointName(r.name),r.variant.label].filter(Boolean).join(' · '))} · 底部 ${height(r.finishedBottom)} mm（完成地面）</title><circle r="${radius*k}" fill="${selected?'#a64d31':'#fffaf4'}" stroke="#a64d31" stroke-width="2" vector-effect="non-scaling-stroke"/><text text-anchor="middle" dominant-baseline="central" font-size="${9*k}" font-weight="bold" fill="${selected?'white':'#783a28'}" pointer-events="none">${r.number}</text><text x="${(radius+5)*k}" y="${-5*k}" font-size="${11*k}" fill="#783a28" stroke="#fffaf4" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">${esc(r.variant.label)}</text><text x="${(radius+5)*k}" y="${10*k}" font-size="${10*k}" fill="#783a28" stroke="#fffaf4" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">底 ${height(r.finishedBottom)} / 中 ${height(r.finishedCenter)} mm</text></g>`;}).join('');
  const chosen=selItems().length===1&&selItems()[0];
  if(chosen&&E.panel(chosen)&&(exporting||visibleAt(chosen.cx,chosen.cy))){const hit=E.nearest(chosen,E.surfaces(canvasEffectivePlan(),state,chosen),1);if(hit){const s=hit.surface,n=s.normal,a=s.a,b=[s.a[0]+(s.b[0]-s.a[0])*hit.offset/s.length,s.a[1]+(s.b[1]-s.a[1])*hit.offset/s.length],d=35*k,u=[a[0]+n[0]*d,a[1]+n[1]*d],v=[b[0]+n[0]*d,b[1]+n[1]*d],mid=[(u[0]+v[0])/2,(u[1]+v[1])/2];g.insertAdjacentHTML('beforeend',`<g pointer-events="none" data-electrical-dimension><path d="M${a}L${u}L${v}L${b}" fill="none" stroke="#a64d31" stroke-width="1" vector-effect="non-scaling-stroke"/><text transform="translate(${mid}) rotate(${-drawingRotation()})" text-anchor="middle" font-size="${11*k}" fill="#783a28" stroke="#fffaf4" stroke-width="${3*k}" paint-order="stroke">中心距面起点 ${Number(hit.offset.toFixed(1))} mm</text></g>`);}}
  globalThis.FurnishWiringUI?.draw(root,{exporting,visibleLayers});
  for(const node of root.querySelectorAll('#gFurn > [data-fid]')){
   const f=getF(node.dataset.fid);
   const panel=E.panel(f);
   if(!panel)node.setAttribute('opacity','.28');
   node.setAttribute('pointer-events','none');
   node.toggleAttribute('data-electrical-outside',!exporting&&panel&&!visibleAt(f.cx,f.cy));
  }
 }
 function afterRender(){
  document.body.classList.toggle('electrical-mode',active());
  const status=$('#placement-status'),message=active()&&adding&&!is3D()?tr('点击画布放置面板，按 Esc 取消','Click the plan to place the socket. Press Esc to cancel.'):'';
  if(status.textContent!==message)status.textContent=message;
  draw();
  if(!active())for(const n of document.querySelectorAll('#gFurn > [data-fid]')){n.removeAttribute('pointer-events');n.removeAttribute('data-electrical-outside');}
  refreshList();
 }
 function pointer(e){
  if(globalThis.FurnishWiringUI?.pointer(e))return true;
  if(!active()||!adding||e.button!==0||spaceDown)return false;
  const p=toMM(e),item=LIB.flatMap(c=>c.items).find(i=>FurnishProducts.supports({type:i[0]},'panelVariant'));if(!item)return false;
  adding=false;addItem(item,p.x,p.y);return true;
 }
 function roomName(room){
  return room?nm(state.rooms[room.id]?.name||room.name):tr('未归属房间','No room assigned');
 }
 function relatedLabel(id,sourceRoom){
  const target=relations.locations.get(id);
  return target.room?.id===sourceRoom?.id?target.number:`${roomName(target.room)} ${target.number}`;
 }
 function relatedButtons(id,room){
  const links=relations.links.get(id);
  if(!links)return '';
  return `<div class="electrical-row-links">${[...links].map(([peerId,methods])=>{
   const method=methods.size===1?linkLabels[[...methods][0]]:['双控','Two-way'];
   const label=`${tr(...method)} · ${relatedLabel(peerId,room)}`;
   return `<button type="button" class="electrical-control electrical-link-tag" data-electrical-jump="${esc(peerId)}" aria-label="${esc(tr('定位 ','Locate ')+label)}">${esc(label)} <span aria-hidden="true">↗</span></button>`;
  }).join('')}</div>`;
 }
 function listRows(rows){
  rows=rows.filter(r=>rowVisible(r.room));
  if(!rows.length&&scopedRoom())return `<p class="muted">${tr('当前区域没有插座或开关面板。','No sockets or switch plates in this area.')}</p>`;
  if(!rows.length)return `<p class="muted">${tr('当前方案没有插座或开关面板。','There are no sockets or switch plates in this design.')}</p>`;
  const groups=new Map(ROOMS.map(room=>[room.id,{room,items:[]}])),current=ui.sel?.kind==='furn'?ui.sel.id:null,peers=relatedIds();
  for(const r of rows){
   const f=getF(r.id),room=r.room,key=room?.id??null;
   if(!groups.has(key))groups.set(key,{room,items:[]});
   const hidden=!FurnishLayers.visible(state,FurnishLayers.furnitureKey(f));
   const references=relations.references.get(r.id);
   const label=E.purpose(nm(r.name),[room&&nm(state.rooms[room.id]?.name),room&&nm(room.name)])
    .replace(/(?<![A-Z0-9])E\d+(?![A-Z0-9])/gi,code=>{
     const peerId=references?.get(code.toUpperCase());
     return peerId?relatedLabel(peerId,room):code;
    });
   const product=FurnishProducts.definition(f),variantLabel=nm(r.variant.label),detail=nm(r.variant.listLabel||r.variant.label);
   const series=product.panelLine&&tr(...product.panelLine);
   const model=r.variant.model?detail:series;
   const type=product.trackSocket?`${tr('轨道插座','Track socket')} · ${variantLabel}`
    :r.variant.requiresWiring===false?tr('无线开关','Wireless switch')
    :r.variant.control==='smart'?tr('墙壁开关','Wall switch')
    :r.variant.gangs?`${tr('开关','Switch')} · ${detail}`
    :r.variant.group==='插座类'?`${tr('插座','Socket')} · ${detail}`:detail;
   const control=r.variant.control||product.trackSocket?.control,category=controlLabels[control];
   const gangs=gangLabels[r.variant.gangs],amps=r.variant.ratedAmps;
   const tags=[
    category?`<span class="electrical-control" data-control="${control}">${tr(...category)}</span>`:'',
    gangs?`<span class="electrical-control">${tr(...gangs)}</span>`:'',
    amps?`<span class="electrical-control">${tr(`额定 ${amps} A`,`Rated ${amps} A`)}</span>`:''
   ].join('');
   const elevation=r.finishedBottom===null?tr('待核对','Unknown'):height(r.finishedBottom)+' mm';
   groups.get(key).items.push(`<li class="electrical-entry"><button type="button" class="btn electrical-row" data-electrical-id="${esc(r.id)}" ${current===r.id?'aria-current="true"':''} ${peers.includes(r.id)?'data-electrical-related':''}>
     <span class="electrical-row-number">${r.number}</span>
     <span class="electrical-row-description">
       <span class="electrical-row-heading"><b>${esc(type)}</b><span class="electrical-row-height"><small>${tr('底高','Bottom height')}</small> <b>${elevation}</b></span></span>
       ${label&&label!==variantLabel&&label!==type&&label!==model?`<span class="electrical-row-purpose">${esc(label)}</span>`:''}
       ${model?`<span class="electrical-row-product">${esc(model)}</span>`:''}
       ${tags?`<span class="electrical-row-tags">${tags}</span>`:''}
       ${hidden?`<small>${tr('图层已隐藏','Layer hidden')}</small>`:''}
     </span>
    </button>${relatedButtons(r.id,room)}</li>`);
  }
  return `<div class="electrical-list-groups">${[...groups.values()].filter(group=>group.items.length).map(({room,items})=>{
   const key=room?.id??'__unassigned';
   return `<details class="electrical-list-group" data-electrical-area="${esc(key)}" ${collapsed.has(key)?'':'open'}><summary>${esc(roomName(room))} <small>${items.length}</small></summary><ul>${items.join('')}</ul></details>`;
  }).join('')}</div>`;
 }
 function scopeSelector(){
  const room=scopedRoom(),auto=roomScope==='auto'&&room;
  return `<label class="electrical-scope">${tr('显示区域','Visible area')} <select data-electrical-scope>
   <option value="auto" ${roomScope==='auto'?'selected':''}>${tr('跟随当前区域','Follow current area')}${auto?' · '+esc(roomName(room)):''}</option>
   <option value="all" ${roomScope==='all'?'selected':''}>${tr('全部区域','All areas')}</option>
   ${ROOMS.map(r=>`<option value="${esc(r.id)}" ${r.id===roomScope?'selected':''}>${esc(roomName(r))}</option>`).join('')}
  </select></label>`;
 }
 const listContent=rows=>scopeSelector()+listRows(rows);
 function locate(id){
  const f=getF(id);
  if(!E.panel(f)||switching)return;
  if(!FurnishLayers.visible(state,FurnishLayers.furnitureKey(f))){
   toast(tr('所在图层已隐藏，请先在图层管理中显示。','This layer is hidden. Show it in Layer manager first.'),{label:tr('图层管理','Layers'),fn:()=>FurnishObservationLayers.open()});
   return;
  }
  const wasAdding=adding;
  adding=false;
  const room=E.roomFor(ROOMS,f.cx,f.cy);
  collapsed.delete(room?.id??'__unassigned');
  if(roomScope!=='auto'&&roomScope!=='all')roomScope=room?.id??'all';
  closeDrawers();
  selectIds([id]);
  if(is3D()&&roomScope==='auto')cameraRoom=room?.id??null;
  refreshList();refreshInlineList();
  if(wasAdding||!is3D())afterRender();
  if(is3D())window.View3D?.focusSelection({itemId:id});
  else zoomToBox(groupBox([f]),550);
  return true;
 }
 function findRow(host,id){return [...host.querySelectorAll('[data-electrical-id]')].find(b=>b.dataset.electricalId===id);}
 function bindList(host){
  const scope=host.querySelector('[data-electrical-scope]');
  if(scope)scope.onchange=()=>{
   roomScope=scope.value;
   afterRender();refreshInlineList();
   (host.isConnected?host.querySelector('[data-electrical-scope]'):null)?.focus({preventScroll:true});
   if(is3D())window.View3D?.sync();
  };
  for(const group of host.querySelectorAll('[data-electrical-area]'))group.querySelector('summary').onclick=e=>{
   e.preventDefault();
   const area=group.dataset.electricalArea;
   const open=!group.open;
   if(open)collapsed.delete(area);else collapsed.add(area);
   for(const other of document.querySelectorAll('[data-electrical-area]'))if(other.dataset.electricalArea===area)other.open=open;
  };
  host.querySelectorAll('[data-electrical-id]').forEach(b=>b.onclick=()=>locate(b.dataset.electricalId));
  host.querySelectorAll('[data-electrical-jump]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.electricalJump;
   if(!locate(id))return;
   const target=findRow(host,id);
   target?.scrollIntoView({block:'nearest',inline:'nearest'});
   target?.focus({preventScroll:true});
  });
 }
 function selectionChanged(){
  if($('#electrical-list-dock').hidden)return;
  const id=ui.sel?.kind==='furn'?ui.sel.id:null;
  const peers=relatedIds();
  for(const row of $('#electrical-list-rows').querySelectorAll('[data-electrical-id]')){
   if(row.dataset.electricalId===id)row.setAttribute('aria-current','true');
   else row.removeAttribute('aria-current');
   row.toggleAttribute('data-electrical-related',peers.includes(row.dataset.electricalId));
  }
 }
 function refreshList(){
  if($('#electrical-list-dock').hidden)return;
  const host=$('#electrical-list-rows'),scroll=host.scrollTop;
  const focused=host.contains(document.activeElement)?document.activeElement:null;
  const focus=focused?.closest('.electrical-entry')?.querySelector('[data-electrical-id]')?.dataset.electricalId;
  const area=focused?.closest('[data-electrical-area]')?.dataset.electricalArea;
  host.innerHTML=listContent(E.points(state,canvasEffectivePlan()));
  bindList(host);
  host.scrollTop=scroll;
  if(focus){
   const row=findRow(host,focus);
   const link=[...(row?.parentElement.querySelectorAll('[data-electrical-jump]')||[])].find(b=>b.dataset.electricalJump===focused.dataset.electricalJump);
   (link||row)?.focus({preventScroll:true});
  }else if(focused?.matches('[data-electrical-scope]'))host.querySelector('[data-electrical-scope]')?.focus({preventScroll:true});
  else if(area)[...host.querySelectorAll('[data-electrical-area]')].find(g=>g.dataset.electricalArea===area)?.querySelector('summary').focus({preventScroll:true});
 }
 function refreshInlineList(){
  const host=$('#electrical-inline-rows');
  if(!host)return;
  host.innerHTML=listContent(E.points(state,canvasEffectivePlan()));
  bindList(host);
 }
 const triggerNames={press:'单击',double:'双击',hold:'长按'};
 const actionNames={toggle:'切换',on:'开灯',off:'关灯',open:'打开窗帘',close:'关闭窗帘'};
 let actionsDraft=null,previewOwner=null,previewStates=new Map();
 function draftFor(f){
  const samePanel=actionsDraft?.work===state&&actionsDraft.id===f.id;
  if(!samePanel||actionsDraft.source!==f.panelActions||actionsDraft.variant!==f.panelVariant){
   actionsDraft={work:state,id:f.id,source:f.panelActions,variant:f.panelVariant,
    key:samePanel?actionsDraft.key:0,triggers:samePanel?actionsDraft.triggers:new Map(),
    showOtherTargets:samePanel&&actionsDraft.showOtherTargets,entries:structuredClone(f.panelActions||[])};
  }
  return actionsDraft;
 }
 function actionOptions(targetId,action){
  const target=getF(targetId);
  const options=FurnishProducts.panelTargetActions(target);
  const pending=options.length&&!options.includes(action)?`<option value="${action}" selected>动作待核对</option>`:'';
  return pending+(options.length?options:[action]).map(key=>`<option value="${key}" ${key===action?'selected':''}>${actionNames[key]}</option>`).join('');
 }
 function actionEditor(f){
  const keys=FurnishProducts.panelKeys(f);
  return keys.length?`<details class="property-fold" data-property-fold="electrical-actions" open><summary>按键配置</summary>
   <div data-panel-actions></div>
  </details>`:'';
 }
 function actionTargetGroups(current){
  const rooms=current?[current,...ROOMS.filter(room=>room!==current)]:ROOMS;
  const groups=new Map([...rooms,null].map(room=>[room?.id??null,{room,options:[]}]));
  const targets=state.furniture.filter(FurnishProducts.panelActionTarget)
   .sort((a,b)=>a.cy-b.cy||a.cx-b.cx||a.id.localeCompare(b.id));
  for(const target of targets){
   const room=E.roomFor(ROOMS,target.cx,target.cy);
   const label=E.actionTargetLabel(target,[room?.name,room&&state.rooms[room.id]?.name]);
   groups.get(room?.id??null).options.push({id:target.id,label:nm(label),fullName:nm(target.name)});
  }
  for(const {options} of groups.values()){
   const counts=new Map(),next=new Map();
   for(const {label} of options)counts.set(label,(counts.get(label)||0)+1);
   for(const option of options){
    const label=option.label;
    if(counts.get(label)<2)continue;
    let number=next.get(label)||0;
    do{option.label=`${label} ${++number}`;}while(counts.has(option.label));
    next.set(label,number);
   }
  }
  return [...groups.values()].filter(group=>group.options.length);
 }
 function bindActions(p,f,locked){
  const host=p.querySelector('[data-panel-actions]');
  if(!host)return;
  if(previewOwner!==state){previewOwner=state;previewStates=new Map();}
  const draft=draftFor(f),entries=draft.entries,keys=FurnishProducts.panelKeys(f),disabled=locked?'disabled':'';
  const finish=/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(f.color)?f.color:'#f5f5f2';
  const ownRoom=E.roomFor(ROOMS,f.cx,f.cy),groups=actionTargetGroups(ownRoom);
  const canLimit=ownRoom&&groups.length>1&&groups[0].room===ownRoom;
  const targetLabels=new Map(groups.flatMap(group=>group.options.map(({id,label})=>[id,label])));
  const targetOptions=selected=>{
   const missing=selected&&!targetLabels.has(selected);
   return `<option value="">请选择设备</option>${missing?`<option value="${esc(selected)}" selected>设备待核对</option>`:''}`+
    groups.map(({room,options})=>{
     const visible=!canLimit||draft.showOtherTargets||room===ownRoom?options:options.filter(option=>option.id===selected);
     return visible.length?`<optgroup label="${esc(roomName(room))}">${visible.map(({id,label,fullName})=>
      `<option value="${esc(id)}" title="${esc(fullName)}" ${id===selected?'selected':''}>${esc(label)}</option>`).join('')}</optgroup>`:'';
    }).join('');
  };
  const report=message=>{host.querySelector('[data-action-result]').textContent=message;};
  const render=()=>{
   const {key,gestures}=keys[draft.key]||keys[0];
   const savedTrigger=draft.triggers.get(key);
   const gesture=gestures.includes(savedTrigger)?savedTrigger:gestures[0];
   const slot=entries.map((entry,i)=>({entry,i})).filter(({entry})=>entry.key===key&&entry.gesture===gesture);
   host.innerHTML=`<div class="electrical-switch-face" role="group" aria-label="开关正面" style="--switch-face:${finish};--switch-keys:${keys.length}">
    ${keys.map(item=>`<button type="button" data-action-key="${item.key}" aria-pressed="${item.key===key}"><span>${item.label}</span></button>`).join('')}
   </div><label class="electrical-trigger">触发方式<select data-action-gesture>${gestures.map(option=>`<option value="${option}" ${option===gesture?'selected':''}>${triggerNames[option]}</option>`).join('')}</select></label>
   <div class="actions"><button class="btn" type="button" data-action-add="${key}:${gesture}" ${locked||!targetLabels.size?'disabled':''}>添加动作</button><button class="btn" type="button" data-action-test="${key}:${gesture}" ${slot.length?'':'disabled'}>试按</button></div>
   ${canLimit&&slot.length?`<label class="electrical-device-scope"><input type="checkbox" data-action-other-rooms ${draft.showOtherTargets?'checked':''} ${disabled}>显示其他区域设备</label>`:''}
   ${slot.map(({entry,i})=>{
     return `<div class="electrical-action-row" data-action-index="${i}">
      <label>设备<select data-action-target ${disabled}>${targetOptions(entry.targetId)}</select></label>
      <label>动作<select data-action-verb ${disabled}>${actionOptions(entry.targetId,entry.action)}</select></label>
      <button class="btn danger" type="button" data-action-remove aria-label="移除此动作" ${disabled}>移除</button>
     </div>`;
    }).join('')}<p class="muted" data-action-result role="status"></p><div class="actions"><button class="btn primary" type="button" data-actions-save ${disabled}>应用按键配置</button><button class="btn" type="button" data-actions-reset>重置试按</button></div>`;
  };
  render();
  host.onchange=e=>{
   if(e.target.matches('[data-action-other-rooms]')){
    draft.showOtherTargets=e.target.checked;
    render();host.querySelector('[data-action-other-rooms]').focus({preventScroll:true});
    return;
   }
   if(e.target.matches('[data-action-gesture]')){
    draft.triggers.set((keys[draft.key]||keys[0]).key,e.target.value);
    render();host.querySelector('[data-action-gesture]').focus({preventScroll:true});
    return;
   }
   const row=e.target.closest('[data-action-index]');
   if(!row||locked)return;
   const entry=entries[Number(row.dataset.actionIndex)];
   if(e.target.matches('[data-action-target]')){
    entry.targetId=e.target.value;
    e.target.innerHTML=targetOptions(entry.targetId);
    if(!FurnishProducts.panelTargetActions(getF(entry.targetId)).includes(entry.action))entry.action='toggle';
    row.querySelector('[data-action-verb]').innerHTML=actionOptions(entry.targetId,entry.action);
   }else if(e.target.matches('[data-action-verb]'))entry.action=e.target.value;
  };
  host.onclick=e=>{
   const btn=e.target.closest('button');
   if(!btn)return;
   const {actionKey,actionAdd,actionTest}=btn.dataset;
   try{
    if(actionKey!==undefined){
     draft.key=Number(actionKey);
     render();host.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
     return;
    }
    if(actionTest){
     const [key,gesture]=actionTest.split(':');
     const actions=entries.filter(entry=>entry.key===Number(key)&&entry.gesture===gesture);
     const lamps=FurnishDesign.sceneSettings(state.scene3d).lamps;
     const results=E.testPanelActions(f,Number(key),gesture,state.furniture,previewStates,lamps,actions);
     report(results.map(({targetId,status,value})=>{
      const name=targetLabels.get(targetId)||'设备';
      return name+' · '+(status==='unavailable'?'待核对':status==='light'?(value?'已开灯':'已关灯'):(value?'已打开':'已关闭'));
     }).join('　'));
     return;
    }
    if(btn.hasAttribute('data-actions-reset')){previewStates.clear();report('已重置模拟状态');return;}
    if(locked||physicalLocked(getF(f.id)))return;
    if(actionAdd){
     if(entries.length>=FurnishProducts.panelActions.maxActions)throw Error('已达到此面板的动作数量上限');
     const [key,gesture]=actionAdd.split(':');
     entries.push({key:Number(key),gesture,targetId:'',action:'toggle'});
     render();
     host.querySelector(`[data-action-index="${entries.length-1}"] [data-action-target]`)?.focus();
    }else if(btn.hasAttribute('data-action-remove')){
     entries.splice(Number(btn.closest('[data-action-index]').dataset.actionIndex),1);
     render();
    }else if(btn.hasAttribute('data-actions-save')){
     const current=getF(f.id),next=entries.length?FurnishProducts.validateField(current,'panelActions',entries):undefined;
     mutate(()=>{if(next)current.panelActions=next;else delete current.panelActions;},{appearanceEdit:true});
     toast('已应用按键配置');
    }
   }catch(error){report(error.message);}
  };
 }
 function setListOpen(open){
  const dock=$('#electrical-list-dock'),button=$('#electrical-list'),restoreFocus=dock.contains(document.activeElement);
  if(open)closeDrawers();
  dock.hidden=!open;
  $('.app').classList.toggle('electrical-list-open',open);
  button.setAttribute('aria-expanded',String(open));
  if(open){refreshList();$('#electrical-list-close').focus({preventScroll:true});}
  else if(restoreFocus)button.focus({preventScroll:true});
 }
 function panel(p){
  if(!active())return false;
  if(globalThis.FurnishWiringUI?.panel(p))return true;
  const f=selItems().length===1&&selItems()[0],rows=E.points(state,canvasEffectivePlan()),locked=f&&physicalLocked(f);
  const listOpen=p.querySelector('#electrical-panel-list')?.open??!f;
  p.innerHTML=`<section class="electrical-panel"><h3>插座布置 <span class="muted">${rows.length} 个点位</span></h3><p class="muted">家具、墙体和柜体结构只读。开合柜门可查看柜内点位；面板可贴墙或贴柜体板面。</p><div class="actions"><button class="btn primary" id="electrical-add">${adding?'取消放置':'＋ 添加面板'}</button><button class="btn" id="electrical-wiring">布线</button><button class="btn" id="electrical-exit">返回家具布局</button></div>${f?editor(f,rows.find(r=>r.id===f.id),locked):is3D()?'<p>从面板清单选择点位并定位。</p>':'<p>点选图中编号编辑面板，或从下方列表选择。</p>'}<details ${poseHost?'open':''}><summary>柜门／抽屉开合</summary><label>选择柜体<select id="electrical-host"><option value="">请选择</option>${state.furniture.filter(f=>(f.cabinet||f.kitchen)&&FurnishLayers.visible(state,'furniture:'+f.id)).map(f=>`<option value="${esc(f.id)}" ${poseHost===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><div class="actions"><button class="btn" id="electrical-open">全部打开</button><button class="btn" id="electrical-close">全部关闭</button><button class="btn" id="electrical-3d">三维逐扇开合</button></div><small>仅改变开启状态；柜体尺寸、位置和结构保持。原来锁定的柜体仍受保护。</small></details><details id="electrical-panel-list" ${listOpen?'open':''}><summary>面板清单</summary><div id="electrical-inline-rows">${listContent(rows)}</div></details><p id="electrical-error" class="project-error" role="alert"></p></section>`;
  p.querySelector('#electrical-add').onclick=async()=>{
   const fromScene=is3D();
   if(fromScene){await setView('2d');if(is3D()||!active())return;}
   adding=fromScene||!adding;renderPanel();afterRender();
  };p.querySelector('#electrical-exit').onclick=()=>setMode('furniture');
  p.querySelector('#electrical-wiring').onclick=()=>{adding=false;FurnishWiringUI.open();afterRender();};
  bindList(p);
  p.querySelector('#electrical-host').onchange=e=>{poseHost=e.target.value;};
  const report=fn=>{try{fn();}catch(e){p.querySelector('#electrical-error').textContent=e.message;}};
  p.querySelector('#electrical-open').onclick=()=>report(()=>opening(true));p.querySelector('#electrical-close').onclick=()=>report(()=>opening(false));
  p.querySelector('#electrical-3d').onclick=()=>{setView('3d');if(poseHost)window.View3D?.flyToRoom(roomAt(getF(poseHost).cx,getF(poseHost).cy)?.id);};
  if(f){bindEditor(p,f,report);bindActions(p,f,locked);}return true;
 }
 function editor(f,r,locked){
  const dis=locked?'disabled':'',options=Object.entries(FurnishProducts.panelOptions),surfaces=geometry();
  const variantField=FurnishProducts.supports(f,'panelVariant')?`<label class="full">面板款式<select name="variant" ${dis}>${[...new Set(options.map(([,v])=>v.group))].map(group=>`<optgroup label="${esc(group)}">${options.filter(([,v])=>v.group===group).map(([key,v])=>`<option value="${key}" ${FurnishProducts.value(f,'panelVariant')===key?'selected':''}>${esc(v.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>`:'';
  return `<form id="electrical-form">
    ${propertyObjectHeader(r.variant.label,`${r.number} · ${E.pointName(r.name)||r.variant.label}`,{meta:locked?'<p class="property-lock">已锁定</p>':''})}
    ${furniturePriceField(f,locked)}
    <h3>名称与款式</h3><div class="form"><label class="full">用途／名称<input name="name" maxlength="160" value="${esc(E.pointName(r.name)||r.variant.label)}" ${dis}></label>${variantField}${panelColorSelect(f,'name="panelColor"',dis)}</div>
    <h3>安装高度</h3>${propertyMetrics([['完成面底高',height(r.finishedBottom),r.finishedBottom===null?'':'mm'],['完成面中心高',height(r.finishedCenter),r.finishedCenter===null?'':'mm']])}
    <div class="form"><label class="full">底部离地 · 方案基准 (mm)<input name="bottom" type="number" min="0" max="20000" step="any" value="${r.bottom}" ${dis}></label></div><h3>位置与朝向</h3><div class="form"><label>中心 X (mm)<input name="cx" type="number" step="any" value="${f.cx}" ${dis}></label><label>中心 Y (mm)<input name="cy" type="number" step="any" value="${f.cy}" ${dis}></label><label>朝向 (°)<input name="rot" type="number" step="any" value="${f.rot}" ${dis}></label></div><div class="actions"><button class="btn primary" type="submit" ${dis}>应用面板属性</button></div></form>${actionEditor(f)}<details class="property-fold" data-property-fold="electrical-surface"><summary>贴墙／柜体侧面定位</summary><p class="muted">先应用高度，再选择该高度实际存在的板面。起点距离按面板中心计；放置后可继续独立调整。</p><label>安装面<select id="electrical-surface" ${dis}><option value="">请选择安装面</option>${surfaces.map((s,i)=>`<option value="${esc(s.key)}">${esc(s.label)} · 面${i+1} · ${Number(s.length.toFixed(1))} mm</option>`).join('')}</select></label><label>沿面中心距起点 mm<input id="electrical-offset" type="number" step="any" ${dis}></label><p id="electrical-surface-info" class="muted"></p><button class="btn" id="electrical-place" ${dis}>贴此面放置</button></details><div class="actions"><button class="btn" data-act="dup" ${dis}>复制面板</button><button class="btn danger" data-act="del" ${dis}>删除面板</button></div>`;
 }
 function bindEditor(p,f,report){
  const form=p.querySelector('#electrical-form');
  const price=form.querySelector('#fP'),displayedPrice=price.value;
  form.onsubmit=e=>{
   e.preventDefault();
   report(()=>{
    const current=getF(f.id);
    if(physicalLocked(current))throw Error('面板已锁定，请返回家具布局解锁');
    const data=new FormData(form),variant=data.get('variant');
    const number=key=>{
     const value=data.get(key);
     if(!String(value).trim()||!Number.isFinite(Number(value)))throw Error('请输入有效数值');
     return Number(value);
    };
    const name=E.renamePoint(current.name,data.get('name'));
    const next=variant===null?{...current}:FurnishProducts.editPanelVariant(current,variant);
    if(price.value!==displayedPrice)setFurniturePrice(next,readFurniturePrice(price));
    const color=data.get('panelColor');
    if(FurnishProducts.panelColorPresets(next).some(([hex])=>hex===color))next.color=color;
    Object.assign(next,{name,cx:number('cx'),cy:number('cy'),rot:norm(number('rot')),mountHeight:FurnishProducts.validateField(current,'mountHeight',number('bottom'))});
    mutate(()=>FurnishProducts.applyPanelEdit(current,next));
    form.elements.namedItem('name').value=E.pointName(name);
   });
  };
  const input=p.querySelector('#electrical-surface'),offset=p.querySelector('#electrical-offset');input.onchange=()=>{const s=geometry().find(s=>s.key===input.value);if(!s)return;offset.value=String(Number((s.length/2).toFixed(2)));p.querySelector('#electrical-surface-info').textContent=`起点 (${s.a.map(v=>Number(v.toFixed(1))).join(', ')}) → 终点 (${s.b.map(v=>Number(v.toFixed(1))).join(', ')})；中心距起点 ${f.w/2}～${Number((s.length-f.w/2).toFixed(1))} mm`;};
  p.querySelector('#electrical-place').onclick=()=>report(()=>{if(physicalLocked(getF(f.id)))throw Error('面板已锁定');const s=geometry().find(s=>s.key===input.value);if(!s)throw Error('请选择有效安装面');if(!offset.value.trim())throw Error('请输入中心距起点');const next=E.place(getF(f.id),s,Number(offset.value));mutate(()=>Object.assign(getF(f.id),next));});
 }
 function opening(open){
  const f=getF(poseHost);if(!f)throw Error('请先选择柜体');if(physicalLocked(f))throw Error('柜体已锁定，请返回家具布局解锁');
  const C=FurnishCabinet,B=FurnishCabinetBuilder;
  if(f.cabinet?.version===2){const next=B.setOpening(f,open);mutate(()=>Object.assign(getF(f.id),next),{sceneFirst:true});return;}
  if(f.cabinet?.version===3){const next=FurnishCornerCabinet.setOpening(f,open);mutate(()=>Object.assign(getF(f.id),next),{sceneFirst:true});return;}
  throw Error('此组合柜请使用三维逐扇开合');
 }
 window.addEventListener('load',()=>{
  document.querySelectorAll('[data-plan-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.planMode));
  const dock=$('#electrical-list-dock');
  $('#electrical-list').onclick=()=>setListOpen(dock.hidden);
  $('#electrical-list-close').onclick=()=>setListOpen(false);
  dock.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setListOpen(false);}});
  if(!repositoryBooting){refreshRelations();afterRender();if(active())renderPanel();}
 });
 document.addEventListener('keydown',e=>{if(active()&&e.key==='Escape'&&adding){adding=false;renderPanel();afterRender();}},true);
 return {active,blocked,physicalLocked,assertEditable,setMode,selection,selectionChanged,draw,refreshRelations,relatedIds,pairedOverlay,afterRender,pointer,panel,scopedRoom,visibleAt,updateCameraRoom,hiddenScenePanels};
})();
