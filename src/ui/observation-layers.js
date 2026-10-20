/* Named layers use the existing mutate / history / project path. */
function furnitureLocked(f){return !!f&&(!!f.locked||FurnishLayers.locked(typeof state==='undefined'?{}:state,FurnishLayers.furnitureKey(f)));}
globalThis.FurnishObservationLayers=(()=>{
 const original=new WeakMap();let selectedLayer='0',query='',objectType='all',checked=new Set(),renameId=null,renameDraft='',owner=null;
 const key=f=>FurnishLayers.furnitureKey(f),visible=f=>!!f&&FurnishLayers.visible(state,key(f));
 function setVisible(o,show){if(!show){if(!original.has(o))original.set(o,o.visible);o.visible=false;}else if(original.has(o)){o.visible=original.get(o);original.delete(o);}}
 function applyPlan(){
  if(selIds().some(id=>!visible(getF(id))))ui.sel=null;
  for(const n of document.querySelectorAll('#gFurn [data-fid]'))n.style.display=FurnishLayers.visible(state,'furniture:'+n.dataset.fid)?'':'none';
  for(const n of document.querySelectorAll('#gRooms [data-room], #gRooms [data-layer-floor]'))n.style.display=FurnishLayers.visible(state,'floor:'+(n.dataset.room||n.dataset.layerFloor))?'':'none';
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
  for(const r of plan.rooms){out.push({key:'floor:'+r.id,name:nm(state.rooms[r.id]?.name||r.name),type:'floor',detail:tr('地面 / 地砖','Floor / tiles')});out.push({key:'roomCeiling:'+r.id,name:nm(state.rooms[r.id]?.name||r.name),type:'ceiling',detail:tr('天花','Room ceiling')});}
  const faces=new Set();for(const e of plan.wallTiling?.surfaces||[]){const k=FurnishLayers.faceKey(e.face);if(faces.has(k))continue;faces.add(k);out.push({key:k,name:nm(state.rooms[e.face.roomId]?.name||e.face.roomName||e.face.wallId),type:'wallTile',detail:tr(`墙砖 · ${e.face.number||e.face.wallId}`,`Wall tiles · ${e.face.number||e.face.wallId}`)});}
  for(const c of state.ceilings?.items||[])out.push({key:'ceiling:'+c.id,name:c.name||tr('吊顶','Ceiling'),type:'ceiling',detail:tr('吊顶构件','Ceiling element')});return out;
 }
 function apply(next){mutate(()=>state.objectLayers=next.objectLayers);applyPlan();window.View3D?.refreshObservationLayers?.();}
 function run(fn){try{fn();draw();}catch(e){toast(e.message);}}
 function draw(){
  const host=document.getElementById('layer-manager');if(!host)return;
  const draftName=host.querySelector('#layer-name')?.value||'',scroll=host.closest('.layer-sidebar-body')?.scrollTop||0,active=host.contains(document.activeElement)?document.activeElement:null,focus=active?.id,selection=active?.selectionStart;
  if(owner!==PLAN.id){owner=PLAN.id;checked.clear();renameId=null;selectedLayer='0';}
  const L=FurnishLayers,layers=L.list(state),all=objects();if(!layers.some(l=>l.id===selectedLayer))selectedLayer='0';
  const rows=all.filter(o=>(objectType==='all'||o.type===objectType)&&(!query||(o.name+' '+o.detail).toLowerCase().includes(query.toLowerCase())));
  const known=new Set(all.map(o=>o.key));checked=new Set([...checked].filter(k=>known.has(k)));
  host.innerHTML=`<div class="layer-toolbar"><input id="layer-name" value="${esc(draftName)}" maxlength="80" placeholder="${tr('新图层名称','New layer name')}" aria-label="${tr('新图层名称','New layer name')}"><button class="btn" id="layer-create">＋ ${tr('新建','New')}</button><button class="btn" id="layer-show-all">${tr('全部显示','Show all')}</button><button class="btn" id="layer-undo">${tr('撤销','Undo')}</button><button class="btn" id="layer-redo">${tr('重做','Redo')}</button></div>
   <div class="layer-table-wrap"><table class="layer-table"><thead><tr><th>${tr('图层名称','Layer')}</th><th>${tr('显示','Visible')}</th><th>${tr('锁定','Locked')}</th><th>${tr('物体数','Objects')}</th><th>${tr('操作','Actions')}</th></tr></thead><tbody>${layers.map(l=>`<tr class="${selectedLayer===l.id?'on':''}"><td><button class="layer-select" data-layer-select="${esc(l.id)}" aria-pressed="${selectedLayer===l.id}">${esc(l.name)}</button></td><td><input type="checkbox" data-layer-visible="${esc(l.id)}" aria-label="${esc(l.name)} ${tr('显示','visible')}" ${l.visible?'checked':''}></td><td><input type="checkbox" data-layer-locked="${esc(l.id)}" aria-label="${esc(l.name)} ${tr('锁定','locked')}" ${l.locked?'checked':''}></td><td>${all.filter(o=>L.layerId(state,o.key)===l.id).length}</td><td>${l.id==='0'?'<span class="muted">'+tr('默认层','Default')+'</span>':`<button class="btn" data-layer-rename="${esc(l.id)}">${tr('改名','Rename')}</button> <button class="btn danger" data-layer-delete="${esc(l.id)}">${tr('删除','Delete')}</button>`}</td></tr>`).join('')}</tbody></table></div>
   <p class="muted small">${tr('未分配物体默认在 0 层，0 层不可删除或改名。删除其他层将物体移回 0 层。图层随方案保存，可撤销重做。','Unassigned objects use layer 0, which cannot be renamed or deleted. Deleting another layer moves its objects to 0. Layer edits are saved and undoable.')}</p>
   <div class="layer-toolbar"><select id="layer-target" aria-label="${tr('目标图层','Target layer')}">${layers.map(l=>`<option value="${esc(l.id)}" ${l.id===selectedLayer?'selected':''}>${esc(l.name)}</option>`).join('')}</select><button class="btn" id="layer-assign-selection" ${selIds().length?'':'disabled'}>${tr('选中家具移入此层','Move selected furniture here')}</button><button class="btn" id="layer-assign-checked" ${checked.size?'':'disabled'}>${tr(`勾选 ${checked.size} 件移入此层`,`Move ${checked.size} checked objects here`)}</button></div>
   <div class="layer-toolbar"><input id="layer-query" value="${esc(query)}" placeholder="${tr('搜索物体','Search objects')}"><select id="layer-type"><option value="all">${tr('全部物体','All objects')}</option>${[['furniture','家具 / 家电','Furniture / appliances'],['floor','地面 / 地砖','Floors / tiles'],['wallTile','墙砖','Wall tiles'],['ceiling','吊顶 / 天花','Ceilings']].map(([v,zh,en])=>`<option value="${v}" ${objectType===v?'selected':''}>${tr(zh,en)}</option>`).join('')}</select><button class="btn" id="layer-check-all">${tr('勾选筛选结果','Check filtered')}</button></div>
   <div class="layer-object-list">${rows.map(o=>`<label class="observation-row"><input type="checkbox" data-layer-object="${esc(o.key)}" ${checked.has(o.key)?'checked':''}><span>${esc(o.name)}<small>${esc(o.detail)} · ${esc(L.layer(state,o.key).name)}${L.locked(state,o.key)?' · '+tr('已锁定','Locked'):''}${L.visible(state,o.key)?'':' · '+tr('已隐藏','Hidden')}</small></span></label>`).join('')||`<p>${tr('没有符合条件的物体','No matching objects')}</p>`}</div><p id="layer-inline-edit"></p>`;
  const q=s=>host.querySelector(s),bind=(sel,fn)=>host.querySelectorAll(sel).forEach(n=>n.onclick=()=>fn(n));
  q('#layer-create').onclick=()=>run(()=>{const id='layer_'+uid();apply(L.create(state,id,q('#layer-name').value));selectedLayer=id;q('#layer-name').value='';});q('#layer-name').onkeydown=e=>{if(e.key==='Enter')q('#layer-create').click();};
  bind('[data-layer-select]',n=>{selectedLayer=n.dataset.layerSelect;draw();});
  for(const [attr,field]of [['visible','visible'],['locked','locked']])host.querySelectorAll(`[data-layer-${attr}]`).forEach(n=>n.onchange=()=>run(()=>apply(L.update(state,n.dataset['layer'+attr[0].toUpperCase()+attr.slice(1)],{[field]:n.checked}))));
  bind('[data-layer-delete]',n=>run(()=>apply(L.remove(state,n.dataset.layerDelete))));
  const renderRename=()=>{const box=q('#layer-inline-edit');if(!layers.some(l=>l.id===renameId)){renameId=null;box.innerHTML='';return;}box.innerHTML=`<label>${tr('新名称','New name')} <input id="layer-rename-name" maxlength="80" value="${esc(renameDraft)}"></label> <button class="btn" id="layer-rename-save">${tr('保存名称','Save name')}</button>`;q('#layer-rename-name').oninput=e=>renameDraft=e.target.value;q('#layer-rename-save').onclick=()=>run(()=>{apply(L.update(state,renameId,{name:renameDraft.trim()}));renameId=null;});};
  bind('[data-layer-rename]',n=>{renameId=n.dataset.layerRename;renameDraft=layers.find(l=>l.id===renameId).name;renderRename();q('#layer-rename-name').focus();});renderRename();
  q('#layer-show-all').onclick=()=>run(()=>{let next=state;for(const l of layers)if(!l.visible)next=L.update(next,l.id,{visible:true});apply(next);});
  q('#layer-undo').onclick=()=>{undo();draw();};q('#layer-redo').onclick=()=>{redo();draw();};q('#layer-target').onchange=e=>selectedLayer=e.target.value;
  q('#layer-assign-selection').onclick=()=>run(()=>apply(L.assign(state,selIds().map(id=>'furniture:'+id),q('#layer-target').value)));
  q('#layer-assign-checked').onclick=()=>run(()=>{apply(L.assign(state,[...checked],q('#layer-target').value));checked.clear();});
  q('#layer-query').oninput=e=>{query=e.target.value;const at=e.target.selectionStart;draw();q('#layer-query').focus();q('#layer-query').setSelectionRange(at,at);};q('#layer-type').onchange=e=>{objectType=e.target.value;draw();};
  host.querySelectorAll('[data-layer-object]').forEach(n=>n.onchange=()=>{n.checked?checked.add(n.dataset.layerObject):checked.delete(n.dataset.layerObject);const b=q('#layer-assign-checked');b.disabled=!checked.size;b.textContent=tr(`勾选 ${checked.size} 件移入此层`,`Move ${checked.size} checked objects here`);});
  q('#layer-check-all').onclick=()=>{const allChecked=rows.every(o=>checked.has(o.key));rows.forEach(o=>allChecked?checked.delete(o.key):checked.add(o.key));draw();};
  const body=host.closest('.layer-sidebar-body');if(body)body.scrollTop=scroll;
  const next=focus&&document.getElementById(focus);if(next&&host.contains(next)){next.focus({preventScroll:true});if(typeof selection==='number'&&next.type==='text')next.setSelectionRange(selection,selection);}
 }
 function syncSidebarButton(){const panel=document.getElementById('layer-sidebar');if(panel){panel.querySelector('.layer-sidebar-head b').textContent=tr('图层管理','Layer manager');panel.querySelector('#layer-sidebar-close').setAttribute('aria-label',tr('收起图层面板','Hide layers'));}const shown=!!document.getElementById('layer-sidebar')&&!document.getElementById('layer-sidebar').hidden,b=document.getElementById('tgLayers');document.querySelector('.app')?.classList.toggle('layers-open',shown);if(b){b.classList.toggle('on',shown);b.setAttribute('aria-expanded',String(shown));b.title=tr(shown?'收起图层面板':'展开图层面板',shown?'Hide layers':'Show layers');}}
 function ensureSidebar(){
  let panel=document.getElementById('layer-sidebar');if(panel)return panel;
  panel=document.createElement('section');panel.id='layer-sidebar';panel.className='layer-sidebar';panel.hidden=true;panel.setAttribute('aria-label',tr('图层管理','Layer manager'));
  panel.innerHTML=`<div class="layer-sidebar-head"><b>${tr('图层管理','Layer manager')}</b><button class="btn" id="layer-sidebar-close" aria-label="${tr('收起图层面板','Hide layers')}">×</button></div><div class="layer-sidebar-body"><div id="layer-manager"></div></div>`;
  document.querySelector('.app').insertBefore(panel,document.getElementById('stage'));panel.querySelector('#layer-sidebar-close').onclick=close;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();document.getElementById('tgLayers')?.focus();}});return panel;
 }
 function remember(shown){panes.showLayers=shown;try{localStorage.setItem(PANES,JSON.stringify(panes));}catch{}}
 function open(){document.getElementById('showMenu').open=false;if(narrow())closeDrawers();ensureSidebar().hidden=false;remember(true);draw();syncSidebarButton();}
 function close(){const panel=document.getElementById('layer-sidebar');if(panel)panel.hidden=true;remember(false);syncSidebarButton();}
 function toggle(){const panel=document.getElementById('layer-sidebar');if(panel&&!panel.hidden)close();else open();}
 function afterRender(){if(document.getElementById('layer-sidebar')?.hidden===false)draw();}
 if(typeof window!=='undefined')window.addEventListener('load',()=>{if(panes.showLayers)open();else syncSidebarButton();});
 return {visible,applyPlan,applyScene,open,close,toggle,afterRender,objects};
})();
