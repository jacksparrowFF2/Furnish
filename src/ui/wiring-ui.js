/* Route drafts are local to the electrical editor until the user saves. */
globalThis.FurnishWiringUI=(()=>{
 const E=FurnishElectrical;
 const colors=Object.freeze({power:'#b84c29',network:'#175caa'});
 const kinds=Object.keys(E.wireKinds);
 const axisLabels={x:'X',y:'Y',z:'标高'};
 const mm=v=>String(Math.round(v*100)/100);
 const metres=v=>v===null?'待核对':Number.isFinite(v)?(v/1000).toFixed(2)+' m':'—';
 let opened=false,draft=null,owner=null,height=0,inspectedId=null,conduitView=false;
 const active=()=>opened&&FurnishElectricalUI.active();
 function leave(){opened=false;draft=null;owner=null;inspectedId=null;}
 function current(){
  if(owner!==state){draft=null;owner=null;}
  return draft;
 }
 function begin(route){
  endDrag(true);
  inspectedId=null;
  owner=state;
  draft=structuredClone(route);
  height=0;
  refresh();
 }
 function refresh(){renderPanel();FurnishElectricalUI.draw();if(is3D())window.View3D.sync();}
 function open(){
  opened=true;
  select(null);
 }
 const routes=()=>state.wireRoutes||[];
 const report=message=>{const el=$('#wiring-error');if(el)el.textContent=message;};
 const geometry=(route,plan=canvasEffectivePlan(),byId)=>E.routeGeometry(route,plan,state.furniture,byId);
 function sceneOverlay(){
  const plan=canvasEffectivePlan(),furniture=state.furniture,byId=new Map(furniture.map(f=>[f.id,f]));
  const routeDraft=active()?current():null,saved=routes();
  const inspected=active()&&saved.some(r=>r.id===inspectedId)?inspectedId:null;
  const paths=[];
  const visibleRoutes=[...saved.filter(r=>r.id!==routeDraft?.id),...(routeDraft?[routeDraft]:[])];
  for(const route of visibleRoutes){
   if(inspected&&route.id!==inspected)continue;
   const {path,points}=geometry(route,plan,byId);
   if(!routeDraft&&!inspected&&![points[0],points.at(-1)].some(p=>p&&FurnishElectricalUI.visibleAt(p.x,p.y)))continue;
   if(path.length&&path.every(p=>[p.x,p.y,p.z].every(Number.isFinite)))paths.push({kind:route.kind,path,editing:route===routeDraft,diameter:route.conduitDiameter});
  }
  const locations=E.pointLocations(furniture,plan.rooms);
  const markers=[];
  for(const f of furniture){
   const box=E.boxKind(f),label=locations.get(f.id)?.number||(box==='power'?'强':box==='network'?'弱':null);
   if(!label||!FurnishElectricalUI.visibleAt(f.cx,f.cy)||!FurnishLayers.visible(state,'furniture:'+f.id))continue;
   const p=E.endpoint(f,plan,furniture);
   if(Number.isFinite(p.z))markers.push({...p,label,kind:E.endpointKind(f)});
  }
  return {paths,markers,conduitView};
 }
 function apply(next){
  E.validateRoutes(next);
  mutate(()=>{if(next.length)state.wireRoutes=next;else delete state.wireRoutes;});
 }
 function addPoint(p){
  const route=current(),points=route.points,last=points.at(-1),terminal=points.length>1&&last.furnitureId;
  if(terminal&&p.furnitureId){points[points.length-1]=p;refresh();return;}
  const index=terminal?points.length-1:points.length,before=points[index-1];
  if(points.length>=E.routeLimits.points)return report('每条线路最多 100 个路径点');
  if(before&&p.x===before.x&&p.y===before.y&&p.z===before.z&&p.furnitureId===before.furnitureId)return report('相邻路径点重合，请换位置或标高');
  if(p.furnitureId&&p.furnitureId===points[0]?.furnitureId)return report('请选择不同的首尾点位');
  points.splice(index,0,p);refresh();
 }
 function pointer(e){
  if(!active()||e.button!==0||spaceDown)return false;
  const route=current();
  if(!route){
   const hit=e.target.closest('[data-wire-route]');
   if(hit){const saved=routes().find(r=>r.id===hit.dataset.wireRoute);if(saved)begin(saved);return true;}
   return false;
  }
  const id=e.target.closest('[data-wire-endpoint], [data-electrical-symbol]')?.dataset;
  const f=getF(id?.wireEndpoint||id?.electricalSymbol);
  if(f&&E.endpointKind(f)===route.kind){
   const point=E.endpoint(f,canvasEffectivePlan(),state.furniture);
   if(f.id===route.points[0]?.furnitureId){report('请选择不同的首尾点位');return true;}
   addPoint({...point,z:point.z??(Number.isFinite(height)?height:0),furnitureId:f.id});
   return true;
  }
  if(!Number.isFinite(height)||Math.abs(height)>E.routeLimits.z){report('请输入有效的新点标高');return true;}
  const point=toMM(e),resolved=geometry(route).points,last=resolved.at(resolved.length>1&&route.points.at(-1).furnitureId?-2:-1);
  let x=Math.round(point.x),y=Math.round(point.y);
  if(e.shiftKey&&last){
   if(Math.abs(x-last.x)>=Math.abs(y-last.y))y=last.y;
   else x=last.x;
  }
  addPoint({x,y,z:height});
  return true;
 }
 function draw(root,{exporting=false,visibleLayers=true}={}){
  let group=root.querySelector('#gWiring');
  if(!active()){group?.remove();return;}
  if(!group){group=document.createElementNS(svg.namespaceURI,'g');group.id='gWiring';root.querySelector('#gElectrical').before(group);}
  group.setAttribute('transform',`rotate(${drawingRotation()})`);
  const scale=exporting ? .075 : view.s,k=1/scale,routeDraft=exporting?null:current(),plan=canvasEffectivePlan();
  const byId=new Map(state.furniture.map(f=>[f.id,f])),rotation=-drawingRotation();
  const mark=(p,opts,body)=>`<g transform="translate(${p.x} ${p.y}) rotate(${rotation})" ${opts}>${body}</g>`;
  const renderRoute=(route,editing)=>{
   const {points,path,length,unresolved,reversals}=geometry(route,plan,byId);
   if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)))return '';
   const d=path.map(p=>p.x+','+p.y).join(' '),color=colors[route.kind];
   const size=editing?4:3,dash=unresolved||reversals.length?'3 4':route.kind==='network'?'8 4':'';
   const hit=exporting||editing?'':`data-wire-route="${esc(route.id)}" style="cursor:pointer"`;
   let label=points[0],longest=0;
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],span=Math.hypot(b.x-a.x,b.y-a.y);
    if(span>longest){longest=span;label={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
   }
   const title=(route.name||E.wireKinds[route.kind])+' · '+metres(length);
   const stroke=(ink,width,dashes='')=>`<polyline points="${d}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-dasharray="${dashes}" vector-effect="non-scaling-stroke"/>`;
   const markers=points.map((p,i)=>{
    if(!p.unresolved&&!editing&&i>0&&i<points.length-1)return '';
    const fill=p.unresolved||editing&&!path.includes(p)?'#fffaf4':color;
    const number=editing?`<text y="${-9*k}" text-anchor="middle" font-size="${11*k}" fill="${color}" stroke="#fffaf4" stroke-width="${4*k}" paint-order="stroke">${i+1}</text>`:'';
    return mark(p,'',`<circle r="${(editing?6:3)*k}" fill="${fill}" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>${number}`);
   }).join('');
   const caption=editing?'':mark(label,'',`<text text-anchor="middle" y="${-7*k}" font-size="${11*k}" font-weight="600" fill="${color}" stroke="#fffaf4" stroke-width="${4*k}" paint-order="stroke">${esc(title)}</text>`);
   return `<g ${hit}><title>${esc(title)}</title>${stroke('#fffaf4',size+3)}${stroke(color,size,dash)}
    ${hit?stroke('transparent',14):''}${markers}${caption}</g>`;
  };
  const boxes=state.furniture.filter(f=>E.boxKind(f)&&(!visibleLayers||FurnishLayers.visible(state,FurnishLayers.furnitureKey(f))));
  group.innerHTML=routes().filter(r=>r.id!==routeDraft?.id).map(r=>renderRoute(r,false)).join('')+
   (routeDraft?renderRoute(routeDraft,true):'')+
   boxes.map(f=>{
    const kind=E.boxKind(f),color=colors[kind],attrs=exporting?'':`data-wire-endpoint="${esc(f.id)}" style="cursor:crosshair"`;
    return mark({x:f.cx,y:f.cy},attrs,`<title>${esc(f.name)}</title><rect x="${-10*k}" y="${-10*k}" width="${20*k}" height="${20*k}" rx="${3*k}" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" fill="#fffaf4"/><text text-anchor="middle" dominant-baseline="central" font-size="${11*k}" fill="${color}" pointer-events="none">${kind==='power'?'强':'弱'}</text>`);
   }).join('');
 }
 function totals(rows){
  return kinds.map(kind=>{
   const entries=rows.filter(x=>x.route.kind===kind);
   const pending=entries.filter(x=>x.length===null).length;
   return `<span class="wiring-swatch" data-wire-kind="${kind}" aria-hidden="true"></span><strong>${E.wireKinds[kind]}</strong> ${entries.length} 条 · ${metres(entries.reduce((sum,x)=>sum+(x.length??0),0))}${pending?` · 另有 ${pending} 条待核对`:''}`;
  }).join('<br>');
 }
 function list(panel){
  const plan=canvasEffectivePlan(),byId=new Map(state.furniture.map(f=>[f.id,f]));
  const rows=routes().map(route=>({route,...geometry(route,plan,byId)}));
  panel.innerHTML=`<section class="electrical-panel"><div class="actions"><button class="btn" id="wiring-back">返回插座布置</button></div><h3>布线</h3><div class="actions"><button class="btn primary" data-wire-new="power">＋ 电线</button><button class="btn primary" data-wire-new="network">＋ 网线</button></div><p class="wiring-summary">${totals(rows)}</p><p class="muted">长度按三维路径累计。水平段接竖管时保留墙脚直角。</p>${rows.length?`<ul class="wiring-list">${rows.map(({route,length})=>`<li><button class="btn" data-wire-edit="${esc(route.id)}"><span>${esc(route.name)}</span><small>${E.wireKinds[route.kind]} · ${metres(length)}</small></button></li>`).join('')}</ul>`:'<p class="muted">选择电线或网线，在平面图上添加路径点。</p>'}</section>`;
  panel.querySelector('#wiring-back').onclick=()=>{leave();refresh();};
  for(const b of panel.querySelectorAll('[data-wire-new]'))b.onclick=()=>{const kind=b.dataset.wireNew;begin({id:uid(),kind,name:E.wireKinds[kind]+' '+(rows.filter(x=>x.route.kind===kind).length+1),points:[]});};
  for(const b of panel.querySelectorAll('[data-wire-edit]'))b.onclick=()=>begin(routes().find(r=>r.id===b.dataset.wireEdit));
 }
 const reversalMessage=indices=>'网线路径在点 '+indices.map(i=>i+1).join('、')+' 原路折返，请调整路径点。';
 const diameterText=route=>route.conduitDiameter===undefined?`预览 Ø${E.conduitDefault} mm`:`Ø${route.conduitDiameter} mm`;
 function editor(panel,route){
  const {points,length,reversals}=geometry(route),existing=routes().some(r=>r.id===route.id);
  const formRows=route.points.map((p,i)=>{
   const f=p.furnitureId&&getF(p.furnitureId),q=points[i];
   const link=p.furnitureId?`<small>${esc(E.displayName(f)||'原点位已删除')}${q.unresolved?' · 待核对':''}</small><button class="btn" type="button" data-wire-detach="${i}">解除关联</button>`:'';
   const fields=p.furnitureId?'':Object.keys(axisLabels).map(axis=>`<label>${axisLabels[axis]}<input type="number" step="any" data-wire-axis="${axis}" data-wire-index="${i}" value="${Number.isFinite(p[axis])?p[axis]:''}" required></label>`).join('');
   const riser=p.furnitureId&&!q.unresolved&&points.length>1
    ?`<button class="btn" type="button" data-wire-riser="${i}" aria-label="点 ${i+1} 改为贴墙升降">贴墙升降</button>`:'';
   return `<li><div><b>点 ${i+1}</b> <small>${p.furnitureId?`(${mm(q.x)}, ${mm(q.y)}, ${q.unresolved?'待核对':mm(q.z)}) mm`:''}</small></div><div class="wiring-point-fields">${fields}${link}${riser}<button class="btn" type="button" data-wire-remove="${i}" aria-label="移除点 ${i+1}">移除</button></div></li>`;
  }).join('');
  panel.innerHTML=`${propertyObjectHeader(E.wireKinds[route.kind],route.name||E.wireKinds[route.kind])}<section class="electrical-panel"><h3>线路设置</h3><form id="wiring-form"><div class="form"><label class="full">线路名称<input id="wiring-name" required maxlength="80" value="${esc(route.name)}"></label><label class="full">PVC-U 线管外径<select id="wiring-diameter"><option value="">未指定 · 预览 Ø${E.conduitDefault} mm</option>${E.conduitDiameters.map(d=>`<option value="${d}" ${d===route.conduitDiameter?'selected':''}>Ø${d} mm</option>`).join('')}</select></label><label class="full">新点标高（方案基准，mm）<input id="wiring-height" type="number" step="any" value="${Number.isFinite(height)?height:''}"></label></div><p class="muted">点击平面添加路径点，按住 Shift 对齐。点选对应的箱体或面板可关联首尾，末端已关联时，新点加在末端之前。「贴墙升降」按相邻点标高放置竖管的起点。${route.kind==='network'?'网线平面弯道仍自动切角，水平管接竖管保留直角。':''}</p><h3>路径点</h3><ol class="wiring-list">${formRows}</ol><p id="wiring-length">路径长度 ${route.points.length<2?'—':metres(length)}</p><p id="wiring-error" class="project-error" role="alert">${reversals.length?reversalMessage(reversals):''}</p><div class="actions"><button class="btn primary" type="submit">保存线路</button><button class="btn" type="button" id="wiring-cancel">取消</button>${existing?'<button class="btn danger" type="button" id="wiring-delete">删除线路</button>':''}</div></form></section>`;
  panel.querySelector('#wiring-diameter').onchange=e=>{
   if(e.target.value)route.conduitDiameter=Number(e.target.value);
   else delete route.conduitDiameter;
  };
  const input=panel.querySelector('#wiring-height');
  input.oninput=()=>{height=input.valueAsNumber;};
  panel.querySelector('#wiring-name').oninput=e=>{route.name=e.target.value;FurnishElectricalUI.draw();};
  for(const input of panel.querySelectorAll('[data-wire-axis]'))input.oninput=()=>{
   route.points[Number(input.dataset.wireIndex)][input.dataset.wireAxis]=input.valueAsNumber;
   const g=geometry(route);panel.querySelector('#wiring-length').textContent='路径长度 '+(g.points.length<2?'—':metres(g.length));
   report(g.reversals.length?reversalMessage(g.reversals):'');
   FurnishElectricalUI.draw();
  };
  for(const b of panel.querySelectorAll('[data-wire-remove]'))b.onclick=()=>{route.points.splice(Number(b.dataset.wireRemove),1);refresh();};
  for(const b of panel.querySelectorAll('[data-wire-detach]'))b.onclick=()=>{
   const i=Number(b.dataset.wireDetach),p=geometry(route).points[i];
   route.points[i]={x:p.x,y:p.y,z:p.z};refresh();
  };
  for(const b of panel.querySelectorAll('[data-wire-riser]'))b.onclick=()=>{
   const i=Number(b.dataset.wireRiser),{points}=geometry(route),p=points[i],adjacent=points[i===0?1:i-1];
   if(p.unresolved||![adjacent.x,adjacent.y,adjacent.z].every(Number.isFinite))return report('请先核对端点和相邻点坐标');
   if(p.z===adjacent.z)return report('相邻点和端点同高，无需竖管');
   if(p.x===adjacent.x&&p.y===adjacent.y)return report('端点已经沿竖直方向连接');
   if(points.length>=E.routeLimits.points)return report('每条线路最多 100 个路径点');
   route.points.splice(i===0?1:i,0,{x:p.x,y:p.y,z:adjacent.z});
   refresh();
  };
  const cancel=()=>{draft=null;refresh();};
  panel.querySelector('#wiring-cancel').onclick=cancel;
  const remove=panel.querySelector('#wiring-delete');
  if(remove)remove.onclick=()=>{try{apply(routes().filter(r=>r.id!==route.id));cancel();}catch(error){report(error.message);}};
  panel.querySelector('#wiring-form').onsubmit=e=>{
   e.preventDefault();
   try{
    const {reversals,unresolved}=geometry(route);
    if(reversals.length&&!unresolved)throw Error(reversalMessage(reversals));
    const saved={...route,name:route.name.trim()},next=existing?routes().map(r=>r.id===route.id?saved:r):[...routes(),saved];
    apply(next);cancel();
   }catch(error){report(error.message);}
  };
 }
 function panel(node){
  if(!active())return false;
  const route=current();
  if(is3D())scenePanel(node,route);
  else if(route)editor(node,route);else list(node);
  return true;
 }
 function scenePanel(node,routeDraft){
  const plan=canvasEffectivePlan(),byId=new Map(state.furniture.map(f=>[f.id,f]));
  const rows=routes().map(route=>({route,...geometry(route,plan,byId)}));
  node.innerHTML=`<section class="electrical-panel"><div class="actions"><button class="btn" id="wiring-back">返回插座布置</button><button class="btn primary" id="wiring-edit-2d">返回二维编辑</button></div><h3>三维布线</h3><label>显示方式<select id="wiring-scene-mode"><option value="trace">透视走线</option><option value="conduit" ${conduitView?'selected':''}>实体线管</option></select></label><p class="muted">${conduitView?'实体线管按实际外径显示，橙色标记表示弯管放不下。':'透视显示完整走线。'}点击线路可单独查看，再点恢复全部。${routeDraft?' 返回二维可继续编辑草稿。':''}</p><p class="wiring-summary">${totals(rows)}</p>${rows.length?`<ul class="wiring-list">${rows.map(({route,length})=>`<li><button class="btn" data-wire-inspect="${esc(route.id)}" aria-pressed="${route.id===inspectedId}"><span><span class="wiring-swatch" data-wire-kind="${route.kind}" aria-hidden="true"></span>${esc(route.name)}</span><small>${diameterText(route)} · ${metres(length)}</small></button></li>`).join('')}</ul>`:''}</section>`;
  node.querySelector('#wiring-back').onclick=()=>{leave();refresh();};
  node.querySelector('#wiring-edit-2d').onclick=()=>setView('2d');
  node.querySelector('#wiring-scene-mode').onchange=e=>{
   conduitView=e.target.value==='conduit';
   refresh();node.querySelector('#wiring-scene-mode').focus({preventScroll:true});
  };
  const buttons=node.querySelectorAll('[data-wire-inspect]');
  for(const button of buttons)button.onclick=()=>{
   inspectedId=inspectedId===button.dataset.wireInspect?null:button.dataset.wireInspect;
   for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.wireInspect===inspectedId));
   window.View3D.sync();
  };
 }
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&active()&&current()&&$('#dlg').hidden){e.stopImmediatePropagation();draft=null;refresh();}
 },true);
 return {open,leave,draw,pointer,panel,sceneOverlay,colors};
})();
