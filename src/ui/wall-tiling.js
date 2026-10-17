/* Wall layouts share mutate/history with the ordinary wall thickness editor. */
(function(){
'use strict';
const T=FurnishWallTiling,P=FurnishProject,effective=()=>P.effectivePlan(PLAN,state),name=id=>state.rooms[id]?.name||id;
let focus=null;
function clearFocus(){focus=null;document.querySelector('#gWallTileFocus')?.remove();}
function drawFocus(){
 if(!focus)return;if(!focus.host.isConnected)return clearFocus();
 const e=focus.e,points=[0,e.width].map(u=>{const p=[0,0];p[e.axis]=e.zero+e.dir*u;p[e.normal]=e.position??focus.face.position;return p.join(',');});
 let g=document.querySelector('#gWallTileFocus');if(!g){g=document.createElementNS(svg.namespaceURI,'g');g.id='gWallTileFocus';g.dataset.editOverlay='true';g.setAttribute('pointer-events','none');svg.append(g);}g.setAttribute('transform',`rotate(${drawingRotation()})`);g.innerHTML=`<polyline points="${points.join(' ')}" fill="none" stroke="#087f5b" stroke-width="6" vector-effect="non-scaling-stroke"/>`;
}
const rooms=()=>ROOMS.filter(r=>T.eligible(r,state.rooms[r.id]));
const title=f=>`${f.cross?'墙端面 · ':''}${f.axis===0?(f.side===1?'上边墙':'下边墙'):(f.side===1?'左边墙':'右边墙')}`;
function apply(next){if(JSON.stringify(next.wallTiling)===JSON.stringify(state.wallTiling))return;if(next.wallTiling)T.validate(next.wallTiling);mutate(()=>{if(next.wallTiling)state.wallTiling=next.wallTiling;else delete state.wallTiling;});}
function svgOf(e,marker){
 const w=e.width,h=e.height,p=Number.isFinite(e.originZ),l=e.layout,margin=160,rect=([x,z,X,Z],extra='')=>`<rect x="${x}" y="${h-Z}" width="${X-x}" height="${Z-z}" ${extra}/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" class="wall-tile-elevation" role="img" aria-label="墙砖立面预览" viewBox="${-margin} -${margin} ${w+2*margin} ${h+2*margin}"><defs><pattern id="wall-tile-grid" patternUnits="userSpaceOnUse" width="${l.width+l.gap}" height="${l.height+l.gap}" patternTransform="translate(${l.offset} ${h-(e.originZ||0)}) rotate(${-l.angle})"><rect width="${l.width+l.gap}" height="${l.height+l.gap}" fill="#a49c8e"/><rect y="${l.gap}" width="${l.width}" height="${l.height}" fill="#f5eee3"/></pattern></defs><rect x="${-margin}" y="${-margin}" width="${w+2*margin}" height="${h+2*margin}" fill="#fffdf8"/><rect x="0" y="0" width="${w}" height="${h}" fill="#e8f3f7" stroke="#9eacaf" stroke-width="5"/>${e.sections.map(r=>rect(r,`fill="${p?'url(#wall-tile-grid)':'#e2ded5'}" stroke="#9b8f7d" stroke-width="3"`)).join('')}${Number.isFinite(e.floorZ)?`<path d="M0 ${h-e.floorZ}H${w}" stroke="#eb6628" stroke-width="5" stroke-dasharray="25 15"/>`:''}${p?`<path d="M0 ${h-e.originZ}H${w}" stroke="#087f5b" stroke-width="5" stroke-dasharray="18 12"/>`:''}<g fill="#514b42" font-size="75" text-anchor="middle"><text x="${w/2}" y="-50">${Number(w.toFixed(1))} mm · 面对墙面从左向右</text><text x="${w/2}" y="${h+110}">毛坯绝对标高：地面 ${e.floorZ??'待定'} ／起铺 ${e.originZ??'待定'} ／墙顶 ${h} mm</text></g>${marker?`<g stroke="${marker.snapped?'#087f5b':'#e8590c'}" stroke-width="6"><circle cx="${marker.u}" cy="${h-marker.z}" r="35" fill="white"/><path d="M${marker.u-65} ${h-marker.z}H${marker.u+65}M${marker.u} ${h-marker.z-65}V${h-marker.z+65}"/></g>`:''}</svg>`;
}
function openFace(face){
 const p=effective(),current=T.faces(p,state).find(f=>T.same(f,face));if(!current)return toast('墙侧已变化，请重新打开区域列表');
 closeDialog();closeFabEditor(false);select({kind:'room',id:face.roomId});drawer('panel',false);
 const saved=T.record(state,face),l=saved?.layout||T.defaults();
 const input=(key,label,value)=>`<label>${label}<input type="number" step="any" data-wall-layout="${key}" value="${value}"></label>`;
 const host=mountFabEditor('wall-tiles',`${name(face.roomId)} · ${title(current)} · 墙砖`, `<section data-wall-tiling><label><input type="checkbox" data-wall-layout-enabled ${saved?.enabled!==false&&saved?'checked':''}> 启用此整面墙排版</label><div class="form">${input('width','砖长 mm',l.width)}${input('height','砖宽 mm',l.height)}${input('gap','砖缝 mm',l.gap)}<label>横铺／竖铺<select data-wall-layout="angle"><option value="0" ${l.angle===0?'selected':''}>0° 横铺</option><option value="90" ${l.angle===90?'selected':''}>90° 竖铺</option></select></label>${input('offset','沿墙起铺偏移 mm',l.offset)}${input('startHeight','起铺高度 mm',l.startHeight)}<label class="full">高度基准<select data-wall-layout="reference"><option value="floor" ${l.reference==='floor'?'selected':''}>所属区域完成地面以上</option><option value="survey" ${l.reference==='survey'?'selected':''}>毛坯测量基准绝对标高</option></select></label></div><p class="muted">整面墙从所属区域完成地面铺到墙顶，门窗正面留洞。绿色虚线为起铺基准，橙色为完成地面；可在立面点选砖角。参数仅预览，应用后保存。</p><div data-wall-elevation></div><p data-wall-preview-status role="status"></p><p data-wall-pending class="project-error"></p><p class="project-error" data-wall-error role="alert"></p><div class="actions wall-tile-actions"><button class="btn" data-wall-height>统一区域起铺高度</button><button class="btn" data-wall-svg>导出立面 SVG</button><button class="btn primary" data-wall-apply>应用此墙排版</button></div><p class="muted">已有瓷砖／粘结层厚度保留，修改厚度仍使用墙面完成面属性。排版不会移动家具或修改柜体。</p></section>`,{dispose:clearFocus});
 const get=k=>host.querySelector(`[data-wall-layout="${k}"]`),read=()=>Object.fromEntries(Object.keys(T.defaults()).map(k=>[k,k==='reference'?get(k).value:get(k).value.trim()===''?NaN:Number(get(k).value)]));
 let elevation,marker=null;
 const preview=()=>{try{elevation=T.elevation(effective(),state,current,read());host.querySelector('[data-wall-elevation]').innerHTML=svgOf(elevation,marker);host.querySelector('[data-wall-pending]').textContent=elevation.pending.join('；');host.querySelector('[data-wall-error]').textContent='';focus={host,e:elevation,face:current};drawFocus();queueFabPosition();}catch(e){elevation=null;host.querySelector('[data-wall-error]').textContent=e.message;}};
 host.querySelectorAll('[data-wall-layout]').forEach(el=>el.oninput=()=>{marker=null;preview();});
 host.querySelector('[data-wall-elevation]').onpointerdown=e=>{
  if(e.button!==0||!elevation)return;const svg=host.querySelector('.wall-tile-elevation'),q=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b);let u=q.x,z=elevation.height-q.y,distance=12/scale,snapped=false;
  if(elevation.layout.reference==='floor'&&!Number.isFinite(elevation.floorZ))return toast('请先核对本区域地面标高，或改用毛坯绝对标高');
  for(const r of elevation.sections)for(const at of [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]){const d=Math.hypot(at[0]-q.x,at[1]-(elevation.height-q.y));if(d<=distance){u=at[0];z=at[1];distance=d;snapped=true;}}
  if(!snapped&&Number.isFinite(elevation.floorZ)&&Math.abs(z-elevation.floorZ)<12/scale){z=elevation.floorZ;snapped=true;}
  get('offset').value=Number(u.toFixed(2));get('startHeight').value=Number((z-(get('reference').value==='floor'?elevation.floorZ:0)).toFixed(2));marker={u,z,snapped};preview();host.querySelector('[data-wall-preview-status]').textContent=`${snapped?'已吸附墙角／地面基准':'已选起铺砖角'}，沿墙 ${u.toFixed(2)} mm，绝对标高 ${z.toFixed(2)} mm；待应用。`;
 };
 host.querySelector('[data-wall-apply]').onclick=()=>{try{const next=T.edit(state,effective(),current,{enabled:host.querySelector('[data-wall-layout-enabled]').checked,layout:read()});apply(next);openFace(current);toast('墙砖排版已应用；厚度和家具柜体保持');}catch(e){host.querySelector('[data-wall-error]').textContent=e.message;}};
 host.querySelector('[data-wall-height]').onclick=()=>openHeights(face.roomId);
 host.querySelector('[data-wall-svg]').onclick=()=>{if(!elevation)return;download(name(face.roomId)+'-墙砖立面.svg',new Blob([svgOf(elevation)],{type:'image/svg+xml;charset=utf-8'}));};preview();window.FurnishFinishGuideUI?.attachEditor(host,'wall-face',face.roomId);
}
function openHeights(roomId){
 const targets=rooms().filter(r=>!roomId||r.id===roomId);if(!targets.length)return toast('当前没有厨房、卫生间或阳台区域');
 closeDialog();closeFabEditor(false);select({kind:'room',id:targets[0].id});drawer('panel',false);
 const p=effective(),z=p.floorFinish?.areas[targets[0].id]?.finishedZ??0;
 const host=mountFabEditor('wall-height','墙砖 · 统一起铺高度',`<section data-wall-tiling><p>应用到 ${targets.map(r=>esc(name(r.id))).join('、')} 的全部可识别墙面。保留每面墙的横向起点、砖尺寸、砖缝及开关。</p><div class="form"><label class="full">高度基准<select id="wall-height-reference"><option value="survey">毛坯绝对标高（所有墙同一水平线）</option><option value="floor">各区域完成地面以上（随地面高差变化）</option></select></label><label class="full">统一起铺高度 mm<input type="number" step="any" id="wall-height-value" value="${z}"></label></div><p class="muted">卫生间地面较低时，选绝对标高可保持跨区域同一水平线；选完成地面则分别加上该区域地面标高。关闭项只保存参数，不自动启用；之后仍可单独修改。</p><p class="project-error" data-wall-error role="alert"></p><button class="btn primary" id="wall-height-apply">应用统一高度</button></section>`);
 host.querySelector('#wall-height-apply').onclick=()=>{try{const value=host.querySelector('#wall-height-value'),next=T.setHeights(state,effective(),targets.map(r=>r.id),{reference:host.querySelector('#wall-height-reference').value,startHeight:value.value.trim()===''?NaN:Number(value.value)});apply(next);closeFabEditor(false);toast('墙砖起铺高度已统一，可一次撤销');window.FurnishFinishGuideUI?.afterWallHeightApplied();}catch(e){host.querySelector('[data-wall-error]').textContent=e.message;}};
 window.FurnishFinishGuideUI?.attachEditor(host,'wall-height');
}
function openList(){
 closeFabEditor(false);openDialog({title:'墙面铺贴 · 厨房／卫生间／阳台',wide:true,body:'<p>按区域或墙面开关排版，关闭保留参数。已有墙面厚度与毛坯基准保持；不自动移动家具或修改柜体。</p><div class="actions"><button class="btn" data-wall-bulk="on">全部启用排版</button><button class="btn" data-wall-bulk="off">全部关闭排版</button><button class="btn" data-wall-unify>统一起铺高度</button><button class="btn" data-finish-guide-open>分步设定引导</button></div><div id="wall-tile-list"></div>',actions:[{label:'关闭'}]});refreshList();window.FurnishFinishGuideUI?.attachList('wall');
}
function refreshList(){
 const host=document.querySelector('#wall-tile-list');if(!host||document.querySelector('#dlg').hidden)return;
 const p=effective(),available=T.faces(p,state),all=rooms();
 host.innerHTML=all.map(room=>{const list=available.filter(f=>f.roomId===room.id),active=list.filter(f=>T.record(state,f)?.enabled!==false&&T.record(state,f));return `<section class="wall-tile-region"><div class="wall-tile-region-head"><label><input type="checkbox" data-wall-room="${esc(room.id)}" ${active.length===list.length&&list.length?'checked':''} ${list.length?'':'disabled'}> <b>${esc(name(room.id))}</b> · ${active.length}/${list.length} 面</label><button class="btn" data-wall-room-height="${esc(room.id)}">统一高度</button></div>${list.length?list.map((f,i)=>{const s=T.record(state,f);return `<div class="wall-tile-row"><label><input type="checkbox" data-wall-face="${available.indexOf(f)}" ${s&&s.enabled!==false?'checked':''}> ${title(f)} ${i+1}</label><span>${Number((f.hi-f.lo).toFixed(1))} mm${s?` · ${s.layout.width}×${s.layout.height}`:''}</span><button class="btn" data-wall-edit="${available.indexOf(f)}">编辑／立面</button></div>`;}).join(''):'<p class="muted">没有可识别的实体墙面，功能区虚拟分界不作为墙面。</p>'}</section>`;}).join('')||'<p>请先在区域属性中将用途设为厨房、卫生间或阳台。</p>';
 if(p.wallTiling?.pending.length)host.insertAdjacentHTML('beforeend',`<details><summary>待核对 ${p.wallTiling.pending.length} 项</summary>${p.wallTiling.pending.map(v=>`<p>${esc(v.message)} <button class="btn" data-wall-remove="${v.index}">移除此排版设置</button></p>`).join('')}</details>`);
 const run=fn=>{try{apply(fn());}catch(e){toast(e.message);}refreshList();};
 for(const input of host.querySelectorAll('[data-wall-room]')){const list=available.filter(f=>f.roomId===input.dataset.wallRoom),n=list.filter(f=>T.record(state,f)&&T.record(state,f).enabled!==false).length;input.indeterminate=n>0&&n<list.length;input.onchange=()=>run(()=>T.setEnabled(state,effective(),[input.dataset.wallRoom],input.checked));}
 for(const input of host.querySelectorAll('[data-wall-face]'))input.onchange=()=>run(()=>T.edit(state,effective(),available[Number(input.dataset.wallFace)],{enabled:input.checked}));
 for(const button of host.querySelectorAll('[data-wall-edit]'))button.onclick=()=>openFace(available[Number(button.dataset.wallEdit)]);
 for(const button of host.querySelectorAll('[data-wall-room-height]'))button.onclick=()=>openHeights(button.dataset.wallRoomHeight);
 for(const button of host.querySelectorAll('[data-wall-remove]'))button.onclick=()=>{const next=JSON.parse(JSON.stringify(state));next.wallTiling.surfaces.splice(Number(button.dataset.wallRemove),1);if(!next.wallTiling.surfaces.length)delete next.wallTiling;apply(next);refreshList();};
 document.querySelector('[data-wall-unify]').onclick=()=>openHeights();document.querySelectorAll('[data-wall-bulk]').forEach(b=>b.onclick=()=>run(()=>T.setEnabled(state,effective(),all.map(r=>r.id),b.dataset.wallBulk==='on')));
}
document.addEventListener('click',e=>{if(e.target.closest('[data-wall-tiles-open]'))openList();});
window.addEventListener('load',()=>{const rail=document.querySelector('.canvas-rail .rail-finishes');if(!rail)return;const b=document.createElement('button');b.className='btn';b.id='wall-tiles-open';b.dataset.wallTilesOpen='';b.innerHTML=ico('wall-tile')+`<span data-zh="墙砖" data-en="Wall tiles">${tr('墙砖','Wall tiles')}</span>`;b.title='厨房、卫生间、阳台墙面铺贴';rail.append(b);});
window.FurnishWallTilingUI={openList,openFace,openHeights,afterRender:()=>{refreshList();drawFocus();},afterView:drawFocus,svgOf};
})();
