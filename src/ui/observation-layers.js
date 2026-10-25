/* Named layers use the existing mutate / history / project path. */
function furnitureLocked(f){return !!f&&(!!f.locked||FurnishLayers.locked(typeof state==='undefined'?{}:state,FurnishLayers.furnitureKey(f)));}
globalThis.FurnishObservationLayers=(()=>{
 const original=new WeakMap();let rangeAnchor=null,layerScope=null,selectedLayer='0',query='',objectType='all',checked=new Set(),renameId=null,renameDraft='',owner=null;
 const key=f=>FurnishLayers.furnitureKey(f),visible=f=>!!f&&FurnishLayers.visible(state,key(f));
 function setVisible(o,show){if(!show){if(!original.has(o))original.set(o,o.visible);o.visible=false;}else if(original.has(o)){o.visible=original.get(o);original.delete(o);}}
 function applyPlan(){
  if(ui.sel?.layerObject&&!FurnishLayers.visible(state,ui.sel.layerObject))ui.sel=null;
  if(selIds().some(id=>!visible(getF(id))))ui.sel=null;
  for(const n of document.querySelectorAll('#gFurn [data-fid]'))n.style.display=FurnishLayers.visible(state,'furniture:'+n.dataset.fid)?'':'none';
  for(const n of document.querySelectorAll('#gRooms [data-room], #gRooms [data-layer-floor]'))n.style.display=FurnishLayers.visible(state,'floor:'+(n.dataset.room||n.dataset.layerFloor))?'':'none';
  for(const n of document.querySelectorAll('#gWalls [data-layer-wall]'))n.style.display=FurnishLayers.visible(state,n.dataset.layerWall)?'':'none';
  const hidden=FurnishLayers.list(state).filter(l=>!l.visible).length,b=document.getElementById('observationLayers');if(b)b.textContent=tr('图层管理','Layer manager')+(hidden?tr(` · ${hidden} 层隐藏`,` · ${hidden} hidden`):'');
  syncSidebarButton();
 }
 function sceneKey(o){
  const d=o.userData;if(d.layerObject)return d.layerObject;if(d.fid)return 'furniture:'+d.fid;
  if(d.wallTiling)return FurnishLayers.faceKey(d.wallTiling);if(d.ceiling?.id)return 'ceiling:'+d.ceiling.id;
  if(d.floorLayer)return 'floor:'+d.floorLayer.roomId;if(d.floor&&d.room)return 'floor:'+d.room;return null;
 }
 function applyScene({furnG,archFloor,archUp,clearanceG,wallLabelG,lampG}){
  const layers=new Map(FurnishLayers.list(state).map(l=>[l.id,l])),assignments=state.objectLayers?.assignments||{},shown=k=>(layers.get(assignments[k]||'0')||layers.get('0')).visible;
  for(const group of [furnG,archFloor,archUp,...(lampG?[lampG]:[])])group.traverse(o=>{const k=sceneKey(o);if(k)setVisible(o,shown(k));});
  for(const g of clearanceG.children){const show=shown('furniture:'+g.userData.observationOwner);setVisible(g,show);if(!show)g.traverse(o=>{if(o.isCSS2DObject)o.visible=false;});}
  wallLabelG.traverse(o=>{if(o.userData.layerObject&&!shown(o.userData.layerObject)&&o.isCSS2DObject)o.visible=false;});
 }
 function objects(){
  const plan=FurnishProject.effectivePlan(PLAN,state),out=state.furniture.map(f=>({key:key(f),name:nm(f.name),type:'furniture',detail:`${f.w} × ${f.d} mm`,id:f.id}));
  for(const r of plan.rooms){out.push({key:'floor:'+r.id,name:nm(state.rooms[r.id]?.name||r.name),type:'floor',detail:r.bayId?tr('飘窗 · 台面饰材','Bay window · platform'):tr('地面 / 地砖','Floor / tiles')});if(!r.bayId)out.push({key:'roomCeiling:'+r.id,name:nm(state.rooms[r.id]?.name||r.name),type:'ceiling',detail:tr('天花','Room ceiling')});}
  const faces=new Set();for(const e of plan.wallTiling?.surfaces||[]){const k=FurnishLayers.faceKey(e.face);if(faces.has(k))continue;faces.add(k);out.push({key:k,name:nm(state.rooms[e.face.roomId]?.name||e.face.roomName||e.face.wallId),type:'wallTile',detail:tr(`墙砖 · ${e.face.number||e.face.wallId}`,`Wall tiles · ${e.face.number||e.face.wallId}`)});}
  for(const c of state.ceilings?.items||[])out.push({key:'ceiling:'+c.id,name:c.name||tr('吊顶','Ceiling'),type:'ceiling',detail:tr('吊顶构件','Ceiling element')});return out;
 }
 function bounds(objectKey){
  const plan=FurnishProject.effectivePlan(PLAN,state),[kind,...parts]=objectKey.split(':'),id=parts.join(':');let points;
  if(kind==='floor'||kind==='roomCeiling'){const r=plan.rooms.find(r=>r.id===id);points=r&&(r.polys||[r.poly]).flat();}
  else if(kind==='ceiling'){const c=state.ceilings?.items.find(c=>c.id===id);points=c?.kind==='profile'?FurnishCeiling.footprint(c):c?.polygon;}
  else if(kind==='wallTile'){const e=plan.wallTiling?.surfaces.find(e=>FurnishLayers.faceKey(e.face)===objectKey),source=e&&FurnishWallFinish.sources(plan).find(s=>s.id===e.face.wallId);if(source){const r=source.rect,a=e.axis,n=e.normal,lo=r[a]+(r[a+2]-r[a])*e.face.range[0],hi=r[a]+(r[a+2]-r[a])*e.face.range[1],p=[0,0],q=[0,0];p[a]=lo;q[a]=hi;p[n]=e.position-10;q[n]=e.position+10;points=[p,q];}}
  if(!points?.length)return null;return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
 }
 function locate(objectKey){
  if(!FurnishLayers.visible(state,objectKey))return toast(tr('所在图层已隐藏，请先显示该图层。','Show the layer before locating this object.'));
  const object=objects().find(o=>o.key===objectKey);if(!object)return;
  if(object.type==='furniture'){selectIds([object.id]);if(is3D())window.View3D?.focusSelection();else focusItem(object.id);return;}
  const plan=FurnishProject.effectivePlan(PLAN,state),box=bounds(objectKey);if(!box)return;
  const roomId=objectKey.startsWith('floor:')?objectKey.slice(6):objectKey.startsWith('roomCeiling:')?objectKey.slice(12):object.type==='wallTile'?plan.wallTiling?.surfaces.find(e=>FurnishLayers.faceKey(e.face)===objectKey)?.face.roomId:state.ceilings?.items.find(c=>'ceiling:'+c.id===objectKey)?.roomId;
  const ceiling=objectKey.startsWith('ceiling:')&&state.ceilings?.items.find(c=>'ceiling:'+c.id===objectKey);
  select(ceiling?.regionId?{kind:'ceiling',id:ceiling.id,regionId:ceiling.regionId,layerObject:objectKey}:{kind:'room',id:roomId,layerObject:objectKey});
  if(is3D())window.View3D?.focusSelection();else zoomToBox(box,600);
 }
 function apply(next){mutate(()=>state.objectLayers=next.objectLayers);applyPlan();window.View3D?.refreshObservationLayers?.();}
 function run(fn){try{fn();draw();}catch(e){toast(e.message);}}
 function draw(){
  const host=document.getElementById('layer-manager');if(!host)return;
  const draftName=host.querySelector('#layer-name')?.value||'',scroll=host.closest('.layer-sidebar-body')?.scrollTop||0,active=host.contains(document.activeElement)?document.activeElement:null,focus=active?.id,selection=active?.selectionStart;
  if(owner!==PLAN.id){owner=PLAN.id;checked.clear();rangeAnchor=null;renameId=null;selectedLayer='0';layerScope=null;}
  const L=FurnishLayers,layers=L.list(state),all=objects();if(!layers.some(l=>l.id===selectedLayer))selectedLayer='0';
  if(layerScope!==null&&!layers.some(l=>l.id===layerScope))layerScope='0';
  const rows=all.filter(o=>(layerScope===null||L.layerId(state,o.key)===layerScope)&&(objectType==='all'||o.type===objectType)&&(!query||(o.name+' '+o.detail).toLowerCase().includes(query.toLowerCase())));
  if(!rows.some(o=>o.key===rangeAnchor))rangeAnchor=null;
  const known=new Set(all.map(o=>o.key));checked=new Set([...checked].filter(k=>known.has(k)));
  host.innerHTML=`<div class="layer-toolbar"><input id="layer-name" value="${esc(draftName)}" maxlength="80" placeholder="${tr('新图层名称','New layer name')}" aria-label="${tr('新图层名称','New layer name')}"><button class="btn" id="layer-create">＋ ${tr('新建','New')}</button><button class="btn" id="layer-show-all">${tr('全部显示','Show all')}</button><button class="btn" id="layer-undo">${tr('撤销','Undo')}</button><button class="btn" id="layer-redo">${tr('重做','Redo')}</button></div>
   <div class="layer-table-wrap"><table class="layer-table"><thead><tr><th>${tr('图层名称','Layer')}</th><th>${tr('显示','Visible')}</th><th>${tr('锁定','Locked')}</th><th>${tr('物体数','Objects')}</th><th>${tr('操作','Actions')}</th></tr></thead><tbody>${layers.map(l=>`<tr class="${selectedLayer===l.id?'on':''}"><td><button class="layer-select" data-layer-select="${esc(l.id)}" aria-pressed="${selectedLayer===l.id}">${esc(l.name)}</button></td><td><input type="checkbox" data-layer-visible="${esc(l.id)}" aria-label="${esc(l.name)} ${tr('显示','visible')}" ${l.visible?'checked':''}></td><td><input type="checkbox" data-layer-locked="${esc(l.id)}" aria-label="${esc(l.name)} ${tr('锁定','locked')}" ${l.locked?'checked':''}></td><td>${all.filter(o=>L.layerId(state,o.key)===l.id).length}</td><td>${l.id==='0'?'<span class="muted">'+tr('默认层','Default')+'</span>':`<button class="btn" data-layer-rename="${esc(l.id)}">${tr('改名','Rename')}</button> <button class="btn danger" data-layer-delete="${esc(l.id)}">${tr('删除','Delete')}</button>`}</td></tr>`).join('')}</tbody></table></div>
   <p class="muted small">${tr('未分配物体默认在 0 层，0 层不可删除或改名。删除其他层将物体移回 0 层。图层随方案保存，可撤销重做。','Unassigned objects use layer 0, which cannot be renamed or deleted. Deleting another layer moves its objects to 0. Layer edits are saved and undoable.')}</p>
   <div class="layer-toolbar"><select id="layer-target" aria-label="${tr('目标图层','Target layer')}">${layers.map(l=>`<option value="${esc(l.id)}" ${l.id===selectedLayer?'selected':''}>${esc(l.name)}</option>`).join('')}</select><button class="btn" id="layer-assign-selection" ${selIds().length?'':'disabled'}>${tr('选中家具移入此层','Move selected furniture here')}</button><button class="btn" id="layer-assign-checked" ${checked.size?'':'disabled'}>${tr(`勾选 ${checked.size} 件移入此层`,`Move ${checked.size} checked objects here`)}</button></div>
   <div class="layer-toolbar"><b id="layer-current">${esc(layerScope===null?tr('全部图层','All layers'):tr('当前图层：','Current layer: ')+layers.find(l=>l.id===layerScope).name)}</b><button class="btn" id="layer-list-all" ${layerScope===null?'disabled':''}>${tr('全部图层','All layers')}</button></div>
   <div class="layer-toolbar"><input id="layer-query" value="${esc(query)}" placeholder="${tr('搜索物体','Search objects')}"><select id="layer-type"><option value="all">${tr('全部物体','All objects')}</option>${[['furniture','家具 / 家电','Furniture / appliances'],['floor','地面 / 地砖','Floors / tiles'],['wallTile','墙砖','Wall tiles'],['ceiling','吊顶 / 天花','Ceilings']].map(([v,zh,en])=>`<option value="${v}" ${objectType===v?'selected':''}>${tr(zh,en)}</option>`).join('')}</select><button class="btn" id="layer-check-all">${tr('勾选筛选结果','Check filtered')}</button></div>
   <p class="muted small">${tr('点击名称定位；按住 Shift 点击可连续勾选或取消勾选。','Click names to locate; Shift-click to check or uncheck a range.')}</p><div class="layer-object-list">${rows.map(o=>`<div class="observation-row"><input type="checkbox" aria-label="${esc(o.name)}" data-layer-object="${esc(o.key)}" ${checked.has(o.key)?'checked':''}><button type="button" class="layer-locate" data-layer-locate="${esc(o.key)}" title="${tr('在视图中定位','Locate in view')}"><span>${esc(o.name)}<small>${esc(o.detail)} · ${esc(L.layer(state,o.key).name)}${L.locked(state,o.key)?' · '+tr('已锁定','Locked'):''}${L.visible(state,o.key)?'':' · '+tr('已隐藏','Hidden')}</small></span></button></div>`).join('')||`<p>${tr('没有符合条件的物体','No matching objects')}</p>`}</div><p id="layer-inline-edit"></p>`;
  const q=s=>host.querySelector(s),bind=(sel,fn)=>host.querySelectorAll(sel).forEach(n=>n.onclick=()=>fn(n));
  q('#layer-create').onclick=()=>run(()=>{const id='layer_'+uid();apply(L.create(state,id,q('#layer-name').value));selectedLayer=id;q('#layer-name').value='';});q('#layer-name').onkeydown=e=>{if(e.key==='Enter')q('#layer-create').click();};
  bind('[data-layer-select]',n=>{selectedLayer=n.dataset.layerSelect;layerScope=selectedLayer;query='';objectType='all';checked.clear();rangeAnchor=null;draw();});
  q('#layer-list-all').onclick=()=>{layerScope=null;checked.clear();rangeAnchor=null;draw();};
  for(const [attr,field]of [['visible','visible'],['locked','locked']])host.querySelectorAll(`[data-layer-${attr}]`).forEach(n=>n.onchange=()=>run(()=>apply(L.update(state,n.dataset['layer'+attr[0].toUpperCase()+attr.slice(1)],{[field]:n.checked}))));
  bind('[data-layer-delete]',n=>run(()=>apply(L.remove(state,n.dataset.layerDelete))));
  const renderRename=()=>{const box=q('#layer-inline-edit');if(!layers.some(l=>l.id===renameId)){renameId=null;box.innerHTML='';return;}box.innerHTML=`<label>${tr('新名称','New name')} <input id="layer-rename-name" maxlength="80" value="${esc(renameDraft)}"></label> <button class="btn" id="layer-rename-save">${tr('保存名称','Save name')}</button>`;q('#layer-rename-name').oninput=e=>renameDraft=e.target.value;q('#layer-rename-save').onclick=()=>run(()=>{apply(L.update(state,renameId,{name:renameDraft.trim()}));renameId=null;});};
  bind('[data-layer-rename]',n=>{renameId=n.dataset.layerRename;renameDraft=layers.find(l=>l.id===renameId).name;renderRename();q('#layer-rename-name').focus();});renderRename();
  q('#layer-show-all').onclick=()=>run(()=>{let next=state;for(const l of layers)if(!l.visible)next=L.update(next,l.id,{visible:true});apply(next);});
  q('#layer-undo').onclick=()=>{undo();draw();};q('#layer-redo').onclick=()=>{redo();draw();};q('#layer-target').onchange=e=>selectedLayer=e.target.value;
  q('#layer-assign-selection').onclick=()=>run(()=>apply(L.assign(state,selIds().map(id=>'furniture:'+id),q('#layer-target').value)));
  q('#layer-assign-checked').onclick=()=>run(()=>{apply(L.assign(state,[...checked],q('#layer-target').value));checked.clear();rangeAnchor=null;});
  q('#layer-query').oninput=e=>{rangeAnchor=null;query=e.target.value;const at=e.target.selectionStart;draw();q('#layer-query').focus();q('#layer-query').setSelectionRange(at,at);};q('#layer-type').onchange=e=>{rangeAnchor=null;objectType=e.target.value;draw();};
  host.querySelectorAll('[data-layer-object]').forEach(n=>{
   n.closest('.observation-row').onmousedown=e=>{if(e.shiftKey)e.preventDefault();};
   n.onclick=e=>{
    const index=rows.findIndex(o=>o.key===n.dataset.layerObject),anchor=rows.findIndex(o=>o.key===rangeAnchor),value=n.checked;
    const range=e.shiftKey&&anchor>=0?rows.slice(Math.min(anchor,index),Math.max(anchor,index)+1):[rows[index]];
    for(const o of range)value?checked.add(o.key):checked.delete(o.key);
    if(!e.shiftKey||anchor<0)rangeAnchor=n.dataset.layerObject;
    host.querySelectorAll('[data-layer-object]').forEach(input=>input.checked=checked.has(input.dataset.layerObject));
    const b=q('#layer-assign-checked');b.disabled=!checked.size;b.textContent=tr(`勾选 ${checked.size} 件移入此层`,`Move ${checked.size} checked objects here`);
   };
  });
  host.querySelectorAll('[data-layer-locate]').forEach(b=>b.onclick=e=>{if(e.shiftKey)b.closest('.observation-row').querySelector('input').dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));else locate(b.dataset.layerLocate);});
  q('#layer-check-all').onclick=()=>{rangeAnchor=null;const allChecked=rows.every(o=>checked.has(o.key));rows.forEach(o=>allChecked?checked.delete(o.key):checked.add(o.key));draw();};
  const body=host.closest('.layer-sidebar-body');if(body)body.scrollTop=scroll;
  const next=focus&&document.getElementById(focus);if(next&&host.contains(next)){next.focus({preventScroll:true});if(typeof selection==='number'&&next.type==='text')next.setSelectionRange(selection,selection);}
 }
 function syncSidebarButton(){const panel=document.getElementById('layer-sidebar');if(panel){panel.querySelector('.layer-sidebar-head b').textContent=tr('图层管理','Layer manager');panel.querySelector('#layer-sidebar-close').setAttribute('aria-label',tr('收起图层面板','Hide layers'));}const shown=!!document.getElementById('layer-sidebar')&&!document.getElementById('layer-sidebar').hidden,b=document.getElementById('tgLayers');document.querySelector('.app')?.classList.toggle('layers-open',shown);if(b){b.classList.toggle('on',shown);b.setAttribute('aria-expanded',String(shown));b.title=tr(shown?'收起图层面板':'展开图层面板',shown?'Hide layers':'Show layers');}}
 function widthBounds(){
  const app=document.querySelector('.app'),css=getComputedStyle(app);
  const lib=app.classList.contains('hide-lib')?0:parseFloat(css.getPropertyValue('--lib-w'))||0;
  const right=app.classList.contains('hide-panel')?0:parseFloat(css.getPropertyValue('--panel-w'))||0;
  return {min:260,max:Math.max(260,Math.min(720,app.clientWidth-lib-right-260))};
 }
 function sidebarWidth(){const value=Number(panes.layerWidth);return Number.isFinite(value)&&value>=260?Math.min(720,value):330;}
 function setWidth(value){
  document.querySelector('.app').style.setProperty('--layer-sidebar-width',value+'px');
  const handle=document.getElementById('layer-resize');if(handle){const bounds=widthBounds();handle.setAttribute('aria-valuemin',bounds.min);handle.setAttribute('aria-valuemax',bounds.max);handle.setAttribute('aria-valuenow',Math.round(Math.min(bounds.max,Math.max(bounds.min,value))));}
 }
 function installResize(panel){
  const handle=panel.querySelector('#layer-resize'),app=document.querySelector('.app');let drag=null;
  const finish=commit=>{if(!drag)return;const current=drag;drag=null;app.classList.remove('layers-resizing');if(commit){panes.layerWidth=current.width;remember(!panel.hidden);}else setWidth(current.before);if(handle.hasPointerCapture(current.id))handle.releasePointerCapture(current.id);};
  handle.onpointerdown=e=>{if(e.button!==0||narrow())return;e.preventDefault();const width=panel.getBoundingClientRect().width+parseFloat(getComputedStyle(panel).marginRight);drag={id:e.pointerId,x:e.clientX,width,before:sidebarWidth(),start:width};app.classList.add('layers-resizing');handle.setPointerCapture(e.pointerId);handle.focus();};
  handle.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const b=widthBounds();drag.width=Math.max(b.min,Math.min(b.max,drag.start+e.clientX-drag.x));setWidth(drag.width);};
  handle.onpointerup=()=>finish(true);handle.onpointercancel=()=>finish(false);handle.onlostpointercapture=()=>finish(false);
  handle.onkeydown=e=>{if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish(false);return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||narrow())return;e.preventDefault();const b=widthBounds(),current=Math.min(b.max,sidebarWidth());panes.layerWidth=e.key==='Home'?b.min:e.key==='End'?b.max:Math.max(b.min,Math.min(b.max,current+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?50:10)));setWidth(panes.layerWidth);remember(!panel.hidden);};
  window.addEventListener('resize',()=>{finish(false);setWidth(sidebarWidth());});setWidth(sidebarWidth());
 }
 function ensureSidebar(){
  let panel=document.getElementById('layer-sidebar');if(panel)return panel;
  panel=document.createElement('section');panel.id='layer-sidebar';panel.className='layer-sidebar';panel.hidden=true;panel.setAttribute('aria-label',tr('图层管理','Layer manager'));
  panel.innerHTML=`<div class="layer-sidebar-head"><b>${tr('图层管理','Layer manager')}</b><button class="btn" id="layer-sidebar-close" aria-label="${tr('收起图层面板','Hide layers')}">×</button></div><div class="layer-sidebar-body"><div id="layer-manager"></div></div><div id="layer-resize" role="separator" tabindex="0" aria-orientation="vertical" aria-label="${tr('调整图层侧栏宽度','Resize layer sidebar')}" title="${tr('拖动调整宽度；方向键微调','Drag to resize; arrow keys to adjust')}"></div>`;
  document.querySelector('.app').insertBefore(panel,document.getElementById('stage'));panel.querySelector('#layer-sidebar-close').onclick=close;installResize(panel);panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();document.getElementById('tgLayers')?.focus();}});return panel;
 }
 function remember(shown){panes.showLayers=shown;try{localStorage.setItem(PANES,JSON.stringify(panes));}catch{}}
 function open(){document.getElementById('showMenu').open=false;if(narrow())closeDrawers();ensureSidebar().hidden=false;remember(true);draw();syncSidebarButton();}
 function close(){const panel=document.getElementById('layer-sidebar');if(panel)panel.hidden=true;remember(false);syncSidebarButton();}
 function toggle(){const panel=document.getElementById('layer-sidebar');if(panel&&!panel.hidden)close();else open();}
 function afterRender(){if(document.getElementById('layer-sidebar')?.hidden===false)draw();}
 if(typeof window!=='undefined')window.addEventListener('load',()=>{if(panes.showLayers)open();else syncSidebarButton();});
 return {visible,applyPlan,applyScene,open,close,toggle,afterRender,objects,bounds,sceneKey};
})();
