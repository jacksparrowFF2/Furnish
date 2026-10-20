function measurementReferenceName(m){
 if(!m)return tr('该方向无实体','No entity in this direction');
 const name=m.entity.kind==='wall'?(m.wallPriority?tr('紧邻实体墙','Adjoining solid wall'):tr('墙面／窗边','Wall / window')):m.entity.kind==='window'?tr('窗边','Window edge'):(typeof nm==='function'?nm(m.entity.name):m.entity.name);
 const pendingThickness=state.wallFinishes?.surfaces.some(s=>s.tileThickness===undefined||s.bondThickness===undefined);
 return name+(state.wallFinishes&&m.entity.kind==='wall'?(pendingThickness?tr(' · 完成面厚度待定',' · Finish thickness pending'):tr(' · 完成面',' · Finished face')):'')+(m.moduleBoundary?tr(' · 模块边界',' · Module edge'):m.surfaceBoundary?tr(' · 台面边界',' · Worktop edge'):'');
}
function measurementDirectionLabel(dir,m){
 const labels={l:tr('左','Left'),r:tr('右','Right'),t:tr('上','Up'),b:tr('下','Down')};
 return m?`${labels[dir]} ${Math.round(m.distance)} mm · ${measurementReferenceName(m)}`:'';
}
/* Classic script: SVG layer adapters read live application state on each call.
 * Declarations only; load before app.js. Selection, history and persistence
 * remain owned by the application. */
function buildDefs(){
  const plank = (id,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="1800" height="360">
      <rect width="1800" height="360" fill="${base}"/>
      <path d="M0 0H1800M0 180H1800M1200 0V180M600 180V360" stroke="${line}" stroke-width="10"/>
      <path d="M100 70Q500 60 900 85T1700 75M200 260Q700 250 1100 275T1750 262" stroke="${line}" stroke-width="5" fill="none" opacity=".45"/></pattern>`;
  const tile = (id,size,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${base}"/><path d="M0 0H${size}M0 0V${size}" stroke="${line}" stroke-width="10"/></pattern>`;
  $('#defs').innerHTML =
    plank('wood','#dcc09a','#bf9d70') + plank('walnut','#a57c56','#80593a') +
    tile('tile800',800,'#ece7de','#d3cabb') + tile('tile600',600,'#e2e6e3','#c4cbc6') + tile('antislip',300,'#d6dbd7','#b3bab4') +
    `<pattern id="m-marble" patternUnits="userSpaceOnUse" width="1200" height="1200">
      <rect width="1200" height="1200" fill="#f3f0ea"/><path d="M0 0H1200M0 0V1200" stroke="#dcd5c8" stroke-width="10"/>
      <path d="M-50 300C250 260 380 520 700 470S1100 640 1260 600M200 1200C300 950 520 980 640 820" stroke="#d6cfc2" stroke-width="12" fill="none"/></pattern>
    <pattern id="m-terrazzo" patternUnits="userSpaceOnUse" width="500" height="500">
      <rect width="500" height="500" fill="#e8e1d5"/>
      <circle cx="60" cy="80" r="22" fill="#b9a58c"/><circle cx="310" cy="140" r="16" fill="#8fa3a0"/><circle cx="190" cy="330" r="26" fill="#c9b7a2"/>
      <circle cx="420" cy="400" r="18" fill="#a88f76"/><circle cx="90" cy="440" r="12" fill="#8fa3a0"/><circle cx="440" cy="40" r="10" fill="#b9a58c"/></pattern>
    <pattern id="m-carpet" patternUnits="userSpaceOnUse" width="120" height="120">
      <rect width="120" height="120" fill="#c9c3d3"/><circle cx="30" cy="30" r="8" fill="#bab3c6"/><circle cx="90" cy="90" r="8" fill="#bab3c6"/></pattern>
    <pattern id="clash" patternUnits="userSpaceOnUse" width="120" height="120" patternTransform="rotate(45)">
      <rect width="120" height="120" fill="rgba(214,69,50,.12)"/><path d="M0 0V120" stroke="#d64532" stroke-width="28" opacity=".55"/></pattern>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">
      <path d="M500 0V1000M0 500H1000" stroke="${PAL.grid1}" stroke-width="8"/><path d="M0 0V1000M0 0H1000" stroke="${PAL.grid2}" stroke-width="14"/></pattern>`;
}

/* ======================= 渲染 ======================= */
const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag'];
let furnitureLabelCache=null;
const appliedFurnitureLabels=new WeakMap();
function furnitureLabelLayout(scale=view.s,selected=selIds()){
 const items=renderableFurniture().filter(f=>!NOLABEL.includes(f.type)).map(f=>({id:f.id,type:f.type,name:nm(f.name),w:f.w,d:f.d,cx:f.cx,cy:f.cy,rot:f.rot})),rotation=drawingRotation(),key=JSON.stringify([items,rotation,scale,selected]);
 if(furnitureLabelCache?.key!==key)furnitureLabelCache={key,labels:new Map(FurnishDrawing.furnitureLabels(items,{rotation,scale,selected}).map(v=>[v.id,v]))};return furnitureLabelCache.labels;
}
function furnitureLabelSVG(f,v,palette=PAL){if(!v?.lines.length)return '';const angle=-f.rot-drawingRotation();return `<g data-furniture-label transform="rotate(${angle}) translate(${v.at[0]} ${v.at[1]})" pointer-events="none"><text font-size="${v.font}" text-anchor="middle" dominant-baseline="central" fill="${palette.text}" opacity=".85">${v.lines.map((line,i)=>`<tspan x="0" y="${(i-(v.lines.length-1)/2)*v.font*1.2}">${esc(line)}</tspan>`).join('')}</text></g>`;}
function refreshFurnitureLabels(root=svg,{scale=view.s,selected=selIds(),palette=PAL}={}){
 if(!globalThis.FurnishDrawing)return;const labels=furnitureLabelLayout(scale,selected),previous=appliedFurnitureLabels.get(root);if(previous?.labels===labels&&previous.color===palette.text)return;for(const g of root.querySelectorAll('#gFurn [data-fid]')){g.querySelector('[data-furniture-label]')?.remove();const f=getF(g.getAttribute('data-fid'));if(f&&!furnitureError(f))g.insertAdjacentHTML('beforeend',furnitureLabelSVG(f,labels.get(f.id),palette));}appliedFurnitureLabels.set(root,{labels,color:palette.text});
}
function hobOpeningsSVG({scale=view.s,palette=PAL,dimensions=ui.layers.dims,selected=selIds()}={}){
 const K=globalThis.FurnishKitchen,S=globalThis.FurnishSnapping;if(!K||!S?.surfaceOpening)return '';
 const furniture=renderableFurniture(),color='#e99028',stroke=`stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"`,fmt=v=>String(Number(v.toFixed(1)));
 return furniture.filter(f=>!globalThis.FurnishObservationLayers||FurnishObservationLayers.visible(f)).map(f=>{
  if(!selected.includes(f.id))return '';
  const opening=S.surfaceOpening(f,{...(typeof measurementScene==='function'?measurementScene():{}),furniture});if(!opening)return '';
  const {size,ring,gaps}=opening,font=scale>0?Math.min(12/scale,size.w/10,size.d/4):Math.min(36,size.w/20,size.d/10),angle=-drawingRotation();
  const text=(at,value,dx=0,dy=0)=>`<text transform="translate(${at[0]} ${at[1]}) rotate(${angle})" x="${dx}" y="${dy}" text-anchor="middle" dominant-baseline="central" font-size="${font}" font-weight="600" fill="${color}" stroke="${palette.halo}" stroke-width="${font*.22}" paint-order="stroke">${esc(value)}</text>`;
  let marks='';
  if(dimensions&&selected.includes(f.id)){
   const sizeText=`${fmt(size.w)} × ${fmt(size.d)} mm`;
   marks=scale>0&&size.w*scale<170?text([f.cx,f.cy],tr('开孔','Cutout'),0,-font*.65)+text([f.cx,f.cy],sizeText,0,font*.65):text([f.cx,f.cy],tr(`开孔 ${sizeText}`,`Cutout ${sizeText}`));
   const names={l:tr('孔左','Cutout left'),r:tr('孔右','Cutout right'),t:tr('孔后','Cutout rear'),b:tr('孔前','Cutout front')};
   for(const [dir,m] of Object.entries(gaps)){
    if(!m)continue;const {a,b}=m,L=Math.hypot(b.x-a.x,b.y-a.y),nx=L>1e-7?-(b.y-a.y)/L*font*.2:font*.2,ny=L>1e-7?(b.x-a.x)/L*font*.2:0;
    // Keep orange hole margins apart from the green footprint clearances.
    // Offsets are in drawing display axes, so they remain readable after rotation.
    const rad=drawingRotation()*Math.PI/180,horizontal=Math.abs((b.x-a.x)*Math.cos(rad)-(b.y-a.y)*Math.sin(rad))>=Math.abs((b.x-a.x)*Math.sin(rad)+(b.y-a.y)*Math.cos(rad)),dx=horizontal?0:font*7.2,dy=horizontal?font*1.1:0;
    marks+=`<g data-hob-gap="${dir}"><title>${esc(tr('产品方向 · 孔边 → ','Product axes · cutout edge → ')+measurementReferenceName(m))}</title><path d="M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-nx} ${a.y-ny}L${a.x+nx} ${a.y+ny}M${b.x-nx} ${b.y-ny}L${b.x+nx} ${b.y+ny}" fill="none" ${stroke}/>${text([(a.x+b.x)/2,(a.y+b.y)/2],`${names[dir]} ${fmt(m.distance)} mm`,dx,dy)}</g>`;
   }
  }
  return `<g data-hob-opening="${esc(f.id)}" data-surface-opening="${esc(f.id)}" pointer-events="none"><title>${esc(tr('台面开孔示意；优先量到紧邻实体墙，无墙则量到所在柜体模块边界，不是安装要求','Nominal cutout; adjoining solid wall first, otherwise the cabinet module edge; not installation requirements'))}</title><path data-hob-cutout d="M${ring.map(p=>p.join(' ')).join('L')}Z" fill="${color}" fill-opacity=".04" ${stroke} stroke-dasharray="6 4"/>${marks}</g>`;
 }).join('');
}
function refreshHobOpenings(root=svg,options={}){
 const layer=root.querySelector('#gFurn');if(!layer)return;layer.querySelector('[data-hob-openings]')?.remove();
 layer.insertAdjacentHTML('beforeend',`<g data-hob-openings pointer-events="none">${hobOpeningsSVG(options)}</g>`);
 const marked=new Set([...layer.querySelectorAll('[data-hob-opening]')].filter(g=>g.querySelector('text')).map(g=>g.getAttribute('data-hob-opening')));
 for(const g of layer.querySelectorAll('[data-fid]'))g.querySelector('[data-furniture-label]')?.setAttribute('display',(options.dimensions??ui.layers.dims)&&marked.has(g.getAttribute('data-fid'))?'none':'inline');
}
function renderRooms(){
  let s = '';
  const rooms=state.wallFinishes?FurnishWallFinish.spatial(canvasEffectivePlan()).rooms:ROOMS;
  document.querySelectorAll('#defs [data-floor-pattern]').forEach(p=>p.remove());
  const floorPlan=state.floorFinishes?canvasEffectivePlan():null;
  for(const [i,r] of rooms.entries()){
    const l=floorPlan?.floorFinish?.areas[r.id]?.layout;if(!l)continue;
    $('#defs').insertAdjacentHTML('beforeend',`<pattern data-floor-pattern id="floor-grid-${i}" patternUnits="userSpaceOnUse" width="${l.width+l.gap}" height="${l.height+l.gap}" patternTransform="translate(${l.origin.join(' ')}) rotate(${l.angle})"><rect width="${l.width+l.gap}" height="${l.height+l.gap}" fill="#817a70"/><rect width="${l.width}" height="${l.height}" fill="${MATS[state.rooms[r.id].mat]?.sw||'#e8e2d8'}"/></pattern>`);
  }
  rooms.forEach((r,i) => s += `<path class="room" data-room="${r.id}" d="${(r.rings||[r.poly]).map(p=>'M'+p.map(p=>p.join(',')).join('L')+'Z').join(' ')}" fill-rule="evenodd" fill="url(#${floorPlan?.floorFinish?.areas[r.id]?.layout?'floor-grid-'+i:'m-'+state.rooms[r.id].mat})" ${r.zone?'stroke="#139687" stroke-width="1" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"':''}/>`);
  const sill = ([a,b,c,d], extra='') => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="${PAL.sill}" stroke="${PAL.sillLine}" stroke-width="1" vector-effect="non-scaling-stroke" ${extra}/>`;
  DOORS.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-door="${i}"`));
  SLIDES.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-slide="${i}"`));
  if(floorPlan)for(const a of floorPlan.floorFinish?.doorways||[]){const i=rooms.findIndex(r=>r.id===a.roomId);s+=`<path class="sill pick" data-${a.kind}="${a.index}" data-layer-floor="${esc(a.roomId)}" d="${(a.room.polys||[a.room.poly]).map(p=>'M'+p.map(v=>v.join(',')).join('L')+'Z').join(' ')}" fill="${a.layout?'url(#floor-grid-'+i+')':MATS[state.rooms[a.roomId].mat]?.sw||PAL.sill}" stroke="none"/>`;}
  if(floorPlan)for(const r of rooms){const a=floorPlan.floorFinish?.areas[r.id];if(a&&r.at)s+=`<text data-floor-level data-layer-floor="${esc(r.id)}" x="${r.at[0]}" y="${r.at[1]+300}" font-size="105" text-anchor="middle" fill="#8b5725" pointer-events="none">${a.finishedZ===undefined?'标高待核对':`完成 ${a.finishedZ} mm`}</text>`;}
  $('#gRooms').innerHTML = s;
  globalThis.FurnishObservationLayers?.applyPlan();
}

// Floor rugs and translucent pendants retain their layers; separated height
// ranges and tucked seats are drawn bottom to top where footprints overlap.
const drawOrder = () => {const valid=renderableFurniture(),ids=new Set(valid.map(f=>f.id));return [...FurnishDesign.planFurnitureOrder(valid,FurnishProject.effectivePlan(PLAN,state)),...state.furniture.filter(f=>!ids.has(f.id))];};
// Drag feedback is derived from the current pointer operation, never saved.
function syncTuckedSeatPreview(){
 const moving=new Set(typeof drag!=='undefined'&&drag?.kind==='move'&&drag.moved?drag.ids:[]),seats=state.furniture.filter(f=>moving.has(f.id)),G=globalThis.FurnishGeometry;
 const faded=new Set(G?state.furniture.filter(table=>!moving.has(table.id)&&seats.some(seat=>G.tuckedSeatUnder(seat,table)&&G.obbOverlap(seat,table))).map(f=>f.id):[]);
 for(const node of $('#gFurn').children)node.toggleAttribute('data-seat-preview',faded.has(node.dataset.fid));
}
function syncFurnOrder(){
 const g=$('#gFurn'),nodes=[...g.children],byId=new Map(nodes.map(node=>[node.dataset.fid,node])),order=drawOrder();
 if(!order.every((f,i)=>nodes[i]?.dataset.fid===f.id))for(const f of order){const node=byId.get(f.id);if(node)g.appendChild(node);}
 if(globalThis.FurnishDrawing)refreshFurnitureLabels();
 syncTuckedSeatPreview();
 refreshHobOpenings();
}
const furnT = f => `translate(${f.cx} ${f.cy}) rotate(${f.rot})`;
let clashIds = new Set();
function renderFurn(){
  furnitureRenderErrors.clear();
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  clashIds = new Set(collisions().flat());
  const servicePipes=typeof FurnishServices!=='undefined'?FurnishServices.pipes(canvasEffectivePlan()):[];
  const labels=globalThis.FurnishDrawing?furnitureLabelLayout():null;
  g.innerHTML = drawOrder().map(f => {
    try{
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = labels?furnitureLabelSVG(f,labels.get(f.id)):(Math.min(f.w,f.d)>=380&&!NOLABEL.includes(f.type)?`<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${PAL.text}" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>`:'');
    const body = furnSVG(f.type,f.w,f.d,f.color,f), mirrored = f.flip ? `<g transform="scale(-1 1)">${body}</g>` : body;
    const pipes=!furnitureError(f)&&servicePipes.length&&FurnishProducts.serviceCut(f)?servicePipes.filter(p=>FurnishServices.bodyHit(f,p,0)):[];
    const maskId='pipe-cut-'+f.id,mask=pipes.length?`<defs><mask id="${esc(maskId)}" maskUnits="userSpaceOnUse" x="${-f.w/2-100}" y="${-f.d/2-100}" width="${f.w+200}" height="${f.d+200}"><rect x="${-f.w/2-100}" y="${-f.d/2-100}" width="${f.w+200}" height="${f.d+200}" fill="white"/>${pipes.map(p=>{const local=FurnishServices.local({...f,flip:false},p);return `<circle cx="${local.at[0]}" cy="${local.at[1]}" r="${p.radius}" fill="black"/>`;}).join('')}</mask></defs>`:'';
    const flip=pipes.length?`${mask}<g mask="url(#${esc(maskId)})">${mirrored}</g>`:mirrored;
    const clash = ui.layers.collide && clashIds.has(f.id)
      ? `<rect data-edit-overlay="clash" x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="url(#clash)" stroke="#d64532" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>` : '';
    // 锁定标记：固定 150mm 的小锁，随家具一起摆放但保持正向
    const lock = furnitureLocked(f) ? `<g data-edit-overlay="lock" transform="translate(${f.w/2-110} ${-f.d/2+110}) rotate(${-f.rot})" pointer-events="none"><circle r="95" fill="${PAL.halo}" stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <rect x="-45" y="-12" width="90" height="62" rx="12" fill="${PAL.ink}"/><path d="M-28 -12v-18a28 28 0 0 1 56 0v18" fill="none" stroke="${PAL.ink}" stroke-width="16"/></g>` : '';
    return `<g class="furn${furnitureLocked(f) ? ' locked' : ''}" data-fid="${f.id}"${furnitureError(f)?' data-model-error="true"':''} transform="${furnT(f)}"${f.type === 'pendant' ? ' opacity=".6"' : ''}><title>${esc(nm(f.name))} · ${f.w} × ${f.d} mm</title>${flip}${clash}${label}${lock}</g>`;
    }catch(e){const message=e.message||String(e);furnitureRenderErrors.set(f.id,message);return `<g class="furn" data-fid="${esc(f.id)}" data-model-error="true" transform="${furnT(f)}">${furnitureFallbackSVG(f,message)}</g>`;}
  }).join('');
  syncTuckedSeatPreview();
  refreshHobOpenings();
  syncFurnBadge(); syncEmpty(); syncModelErrors();
  globalThis.FurnishObservationLayers?.applyPlan();
}
function syncModelErrors(){
 const errors=state.furniture.filter(f=>furnitureError(f)),badge=$('#modelErrors');if(!badge)return;
 badge.hidden=!errors.length;badge.textContent=tr(`${errors.length} 件家具模型异常 · 原数据已保留 · 点击定位修复`,`${errors.length} model error(s) · data retained · click to repair`);
 badge.onclick=()=>focusItem(errors[0].id);
}
// 一件家具都没有时，画布中央给出下一步建议
function syncEmpty(){
  const el = $('#emptyHint'), show = !state.furniture.length && ui.layers.furn && !state.architecture;
  if (el.hidden === !show) return;
  el.hidden = !show;
  if (show) el.innerHTML = `<div class="eh-ico">${ico('box')}</div><b>${tr('画布还是空的', 'This plan is empty')}</b>
    <p>${tr('从左侧家具库点击或拖入家具，或者一键恢复本户型的推荐布置。', 'Click or drag furniture from the library, or restore the recommended layout for this plan.')}</p>
    <div class="actions"><button class="btn primary" data-act="defaults">${ico('reset')}${tr('恢复推荐布置', 'Restore layout')}</button>
    <button class="btn" data-act="cmd">${ico('search')}${tr('搜索家具', 'Search furniture')}</button></div>`;
}
// 家具图层被关掉时给出醒目提示，避免误以为家具「消失」
function syncFurnBadge(){ const b = $('#furnHidden'); if (b) b.hidden = ui.layers.furn; }

function renderWalls(){
  $('#gWalls').innerHTML = WALLS.map((w,i) => {
    const [x0,y0,x1,y1,k] = w, id = 'w'+i, dem = state.demolished.includes(id);
    let fill = k==='low' ? PAL.wallLow : ui.layers.bearing&&k==='b' ? '#c8553c' : ui.layers.bearing&&k==='e' ? PAL.wallE : PAL.wallN;
    let ex = k==='low' ? `stroke="${PAL.wallLowLine}" stroke-width="1" vector-effect="non-scaling-stroke"` : ui.layers.bearing&&['b','e'].includes(k)?`stroke="${PAL.paper}" stroke-width="1.2" stroke-dasharray="${k==='b'?'3 2':'12 3'}" vector-effect="non-scaling-stroke"`:'';
    if (dem){ fill = PAL.demFill; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    return `<rect class="wall" data-wall="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${fill}" ${ex}><title>${k==='b'?tr('承重墙','Bearing wall'):k==='e'?tr('外墙','Exterior wall'):tr('非承重墙','Partition')} · ${tr('点击查看属性','Click for properties')}</title></rect>`;
  }).join('');
  if(!state.wallFinishes)return;
  const data=canvasEffectivePlan().wallFinish;
  if(data)$('#gWalls').insertAdjacentHTML('beforeend',`<g data-wall-finishes>${data.solids.filter(s=>s.bottom===0).map(s=>{
    const [x,y,X,Y]=s.rect,index=PLAN.wallRefs?PLAN.wallRefs.indexOf(s.wallId):Number(s.wallId.slice(8));let target=index>=0?`data-wall="w${index}"`:'';
    if(index<0){const o=PLAN.customDraft?.openings.find(o=>o.wall===s.wallId);if(o){const kind=o.kind==='window'?'win':o.kind,refs=kind==='win'?PLAN.winRefs:kind==='door'?PLAN.doorRefs:PLAN.slideRefs,i=kind==='win'&&o.bay?PLAN.wins.findIndex(w=>w.bayId===o.id):refs?.indexOf(o.id);if(i>=0)target=`data-${kind}="${i}"`;}}
    const poly=s.poly||[[x,y],[X,y],[X,Y],[x,Y]];return `<path class="wall" ${target} data-wall-finish="${s.index}" d="M${poly.map(p=>p.join(',')).join('L')}Z" fill="#d5c2a2"><title>${tr('墙面完成面','Finished wall face')} · ${s.tileThickness+s.bondThickness} mm</title></path>`;
  }).join('')}</g>`);
}

function offsetBayPath(points,d){
 const normals=points.slice(1).map((p,i)=>{const a=points[i],len=Math.hypot(p[0]-a[0],p[1]-a[1]);return [-(p[1]-a[1])/len,(p[0]-a[0])/len];});
 return points.map((p,i)=>{const a=normals[Math.max(0,i-1)],b=normals[Math.min(i,normals.length-1)],n=i===0||i===points.length-1?b:[a[0]+b[0],a[1]+b[1]];return [p[0]+n[0]*d,p[1]+n[1]*d];});
}
function bayAssembly(win){const group=WINS.filter(w=>win.bayId?w.bayId===win.bayId:win.bayGroup?w.bayGroup===win.bayGroup:w===win),left=group.find(w=>w.bayPart==='left'),right=group.find(w=>w.bayPart==='right');if(left?.frameLine&&right?.frameLine){const line=[left.frameLine[0],left.frameLine[1],right.frameLine[1],right.frameLine[0]];return {group,line,outline:offsetBayPath(line,30).concat(offsetBayPath(line,-30).reverse())};}return {group};}
function renderOpenings(){
  const WS = `stroke="${PAL.winLine}" stroke-width="1" vector-effect="non-scaling-stroke"`;
  let s = '';
  const drawnBays=new Set();
  WINS.forEach((win, wi) => {const [x0,y0,x1,y1]=win.rect;
    if(win.bayId&&win.frameLine){s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="transparent" class="pick" data-win="${wi}"/>`;if(!drawnBays.has(win.bayId)){drawnBays.add(win.bayId);const assembly=bayAssembly(win);s+=`<polygon points="${assembly.outline.map(p=>p.join(',')).join(' ')}" fill="${PAL.winFill}" ${WS} pointer-events="none"/>`;for(const offset of [-10,10])s+=`<polyline points="${offsetBayPath(assembly.line,offset).map(p=>p.join(',')).join(' ')}" fill="none" ${WS} stroke-linejoin="miter" pointer-events="none"/>`;}return;}
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${PAL.winFill}" class="pick" data-win="${wi}" ${WS}/>`;
    if (w >= h) [1/3,2/3].forEach(t => s += `<line x1="${x0}" y1="${y0+h*t}" x2="${x1}" y2="${y0+h*t}" ${WS}/>`);
    else [1/3,2/3].forEach(t => s += `<line x1="${x0+w*t}" y1="${y0}" x2="${x0+w*t}" y2="${y1}" ${WS}/>`);
  });
  const DS = `stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"`;
  DOORS.flatMap(d=>FurnishGeometry.doorLeaves(d)).forEach(d => {
    const [hx,hy] = d.h, L = d.len, T = 40;
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#ef5a24' : PAL.ink;
    const offset = FurnishGeometry.doorLeafOffset(d,T), normal = [-d.o[1],d.o[0]];
    const leaf = [[hx,hy,offset-T/2],[ox,oy,offset-T/2],[ox,oy,offset+T/2],[hx,hy,offset+T/2]].map(([x,y,z])=>[x+normal[0]*z,y+normal[1]*z]);
    s += `<polygon points="${leaf.map(p=>p.join(',')).join(' ')}" fill="${PAL.leaf}" stroke="${col}" stroke-width="${d.entry?1.8:1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  SLIDES.forEach(({rect:[x0,y0,x1,y1],v,panels},index)=>{
    const n=panels===3?3:2,L=v?y1-y0:x1-x0,step=L/n,depth=v?x1-x0:y1-y0;
    for(let i=0;i<n;i++){const along=(v?y0:x0)+i*step,off=(v?x0:y0)+depth*(i+.5)/n-15;
      s+=`<rect class="pick" data-slide="${index}" x="${v?off:along}" y="${v?along:off}" width="${v?30:step+15}" height="${v?step+15:30}" fill="${PAL.leaf}" ${DS}/>`;
    }
  });
  // Entry travel direction is independent of the door leaf's swing direction.
  const ed = DOORS.find(d => d.entry);
  if (ed){
    const [rx0,ry0,rx1,ry1] = ed.rect, cx = (rx0+rx1)/2, cy = (ry0+ry1)/2, [ox,oy] = ed.entryDirection || ed._base?.o || ed.o;
    const tip = [cx - ox*350, cy - oy*350], tail = [tip[0] - ox*1000, tip[1] - oy*1000];
    const px = oy, py = -ox;                                   // 垂直于行进方向
    const a1 = [tip[0] - ox*200 + px*155, tip[1] - oy*200 + py*155];
    const a2 = [tip[0] - ox*200 - px*155, tip[1] - oy*200 - py*155];
    const ap = [tip[0] + ox*50, tip[1] + oy*50];
    const anchor = Math.abs(ox) > .5 ? 'start' : 'end';
    s += `<path d="M${tail[0]} ${tail[1]}L${tip[0]} ${tip[1]}M${a1[0]} ${a1[1]}L${ap[0]} ${ap[1]}L${a2[0]} ${a2[1]}" fill="none" stroke="#ef5a24" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <text x="${tail[0] + px*160}" y="${tail[1] + py*160}" font-size="200" text-anchor="${anchor}" fill="#ef5a24">${tr('入户','Entry')}</text>`;
  }
  for(const m of typeof PLAN==='undefined'?[]:PLAN.markers||[]){const [x,y]=m.at,color=m.kind==='gas'?'#c35b20':'#087c9c',radius=FurnishDraft.serviceDiameter(m)/2;s+=`<g data-service="${esc(m.id)}" pointer-events="none"><title>${esc(m.name)} · ${esc(m.sourceLayer||'DXF')} · ${tr('图纸点位参考','CAD reference point')}</title><circle cx="${x}" cy="${y}" r="${radius}" fill="${PAL.paper}" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="M${x-radius*.7} ${y}H${x+radius*.7}M${x} ${y-radius*.7}V${y+radius*.7}" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke"/><text x="${x+radius+45}" y="${y}" font-size="130" dominant-baseline="central" fill="${color}">${esc(m.name)}</text></g>`;}
  for(const b of typeof PLAN==='undefined'?[]:PLAN.beams||[])s+=`<polygon data-beam="${esc(b.id)}" points="${b.poly.map(p=>p.join(',')).join(' ')}" fill="#9467bd" fill-opacity="0.22" stroke="none" pointer-events="none"><title>${esc(b.name)} · 顶部房梁，不分割房间；${(()=>{const v=FurnishDraft.beamVertical(b,FurnishProject.ceilingHeight(state));return v?`梁底离地 ${v.bottom} / 梁厚 ${v.top-v.bottom} mm${v.assumed?' · 默认示意待核对':''}`:'高度待核对';})()}</title></polygon>`;
  $('#gOpen').innerHTML = s;
}

// Read-only canvas derivation. Compare values because drafts and opening
// overrides can be edited in place; object identity is not a revision.
let canvasPlanCache=null,canvasPlanScope=null;
function withCanvasPlan(draw){
 if(canvasPlanScope)return draw();
 canvasPlanScope={};try{return draw();}finally{canvasPlanScope=null;}
}
function canvasEffectivePlan(){
 if(canvasPlanScope?.plan)return canvasPlanScope.plan;
 const key=JSON.stringify([state.architecture?null:PLAN,state.architecture,state.rooms,state.demolished,state.open,state.ceilingHeight,state.wallFinishes,state.floorFinishes,state.wallTiling,state.ceilings]);
 if(canvasPlanCache?.key!==key)canvasPlanCache={key,plan:FurnishProject.effectivePlan(PLAN,state)};
 if(canvasPlanScope)canvasPlanScope.plan=canvasPlanCache.plan;
 return canvasPlanCache.plan;
}
let roomLabelLayoutCache=null;
function roomLabelLayout(){
 const rooms=(state.wallFinishes?FurnishWallFinish.spatial(canvasEffectivePlan()).rooms:ROOMS).filter(r=>r.poly.length).map(r=>({...r,name:nm(state.rooms[r.id].name)})),obstacles=ui.layers.furn?renderableFurniture().filter(f=>!['rug','pendant','curtain','wallart'].includes(f.type)).flatMap(f=>FurnishGeometry.footprints(f)):[],rotation=drawingRotation(),key=JSON.stringify([rooms.map(r=>[r.id,r.at,r.name,r.poly,r.rings,r.polys]),obstacles,rotation]);
 if(roomLabelLayoutCache?.key!==key)roomLabelLayoutCache={key,positions:new Map(FurnishDrawing.roomLabels(rooms,obstacles,{rotation}).map(v=>[v.id,v]))};return roomLabelLayoutCache.positions;
}
function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  const positions=globalThis.FurnishDrawing?roomLabelLayout():null;
  const finishPlan=state.wallFinishes?canvasEffectivePlan():null;
  const rooms=finishPlan?FurnishWallFinish.spatial(finishPlan).rooms:ROOMS,finishPrefix=finishPlan?.wallFinish?.pending.length?tr('参考净 ','Provisional '):state.wallFinishes?tr('净 ','Clear '):'';
  g.innerHTML = rooms.filter(r => r.at).map(r => {
    const chosen=positions?.get(r.id),[x,y]=chosen?.at||r.at,size=chosen?.size||1,halo = `stroke="${PAL.halo}" stroke-width="45" paint-order="stroke" stroke-linejoin="round"`;
    return `<g data-room-label="${r.id}" data-label-at="${x},${y}" transform="rotate(${globalThis.FurnishDrawing?-drawingRotation():0} ${x} ${y})"><text x="${x}" y="${y-100*size}" dominant-baseline="central" font-size="${250*size}" font-weight="600" text-anchor="middle" fill="${PAL.label}" ${halo}>${esc(nm(state.rooms[r.id].name))}</text>
      <text x="${x}" y="${y+160*size}" dominant-baseline="central" font-size="${175*size}" text-anchor="middle" fill="${PAL.labelSub}" ${halo}>${finishPrefix}${fmt(area(r.poly))} m²</text></g>`;
  }).join('');
}

let canvasDimensionCache=null;
function renderDims(){
  const DC = PAL.dim, LS = `stroke="${DC}" stroke-width="1" vector-effect="non-scaling-stroke"`, TK = `stroke="${DC}" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const txt = (x,y,v,rot) => `<text x="${x}" y="${y}" font-size="${v<400?140:200}" text-anchor="middle" fill="${DC}" ${rot?`transform="rotate(-90 ${x} ${y})"`:''}>${v}</text>`;
  const chain = (horiz, at, start, segs) => {
    const pts = [start]; segs.forEach(v => pts.push(pts[pts.length-1]+v));
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-170}" x2="${p}" y2="${at+170}" ${LS}/><line x1="${p-80}" y1="${at+80}" x2="${p+80}" y2="${at-80}" ${TK}/>`
      : `<line x1="${at-170}" y1="${p}" x2="${at+170}" y2="${p}" ${LS}/><line x1="${at-80}" y1="${p+80}" x2="${at+80}" y2="${p-80}" ${TK}/>`);
    segs.forEach((v,i) => { const mid = (pts[i]+pts[i+1])/2; s += horiz ? txt(mid, at-70, v) : txt(at-70, mid, v, true); });
    return s;
  };
  const g = $('#gDims');
  if(globalThis.FurnishDrawing){
    const plan=canvasEffectivePlan(),settings=FurnishDrawing.settings(state.drawing),key=JSON.stringify([plan.walls,plan.doors,plan.wins,plan.slides,plan.dims,settings]);
    if(canvasDimensionCache?.key!==key)canvasDimensionCache={key,lines:FurnishDrawing.dimensions(plan,settings)};
    const layoutKey=JSON.stringify([PAL.dim,settings.rotation,view.s,LANG]);
    if(canvasDimensionCache.layoutKey!==layoutKey){canvasDimensionCache.html=drawingDimensionsSVG(canvasDimensionCache.lines,PAL.dim,settings.rotation,view.s);canvasDimensionCache.layoutKey=layoutKey;canvasDimensionCache.domHTML=null;}
    if(g.innerHTML!==canvasDimensionCache.domHTML){g.innerHTML=canvasDimensionCache.html;canvasDimensionCache.domHTML=g.innerHTML;}
  }else g.innerHTML=PLAN.dims.map(d => chain(d.h, d.at, d.start, d.segs)).join('');
  g.setAttribute('display', ui.layers.dims ? 'inline' : 'none');
}
function drawingDimensionsSVG(lines,color=PAL.dim,rotation=globalThis.FurnishDrawing?FurnishDrawing.settings(state.drawing).rotation:0,scale=0){
 return FurnishDrawing.dimensionLayout(lines,{scale,rotation}).map(d=>{const [x,y]=d.a,[X,Y]=d.b,tick=65,label=d.label;
 return `<g data-auto-dimension="${d.kind}" data-dimension-value="${d.value}" fill="none" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke"><path d="M${x} ${y}L${X} ${Y}${d.simple?'':[d.a,d.b].map(([a,b])=>`M${a-tick} ${b+tick}L${a+tick} ${b-tick}`).join('')}${d.simple?'':d.refs.map((p,i)=>`M${p[0]} ${p[1]}L${[d.a,d.b][i].join(' ')}`).join('')}"/>${label?`<text x="${label.at[0]}" y="${label.at[1]}" dominant-baseline="central" font-size="${label.font}" text-anchor="middle" fill="${color}" stroke="none" transform="rotate(${label.angle} ${label.at.join(' ')})">${label.text}</text>`:''}<title>${d.kind==='opening'?tr('门窗洞口宽度','Opening width'):tr('自动投影尺寸 · mm','Automatic projected dimension · mm')} ${Math.round(d.value)}</title></g>`;
 }).join('');
}

function renderGrid(){
  stageEl.classList.toggle('has-grid', ui.layers.grid);
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

function directionalEditAttributes(dir,f,label){return dir&&ui.tool==='select'&&!(Array.isArray(f)?f:[f]).some(v=>furnitureLocked(v))?`data-distance-edit="${dir}" role="button" tabindex="0" pointer-events="all" style="cursor:pointer;text-decoration:underline" aria-label="${esc(label||tr('编辑目标净距','Edit target clearance'))}"`:'';}
function sameMeasurement(a,b,m){const same=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)<.01;return same(a,m.a)&&same(b,m.b)||same(a,m.b)&&same(b,m.a);}
function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const f=selItems(),directions=f.length&&ui.layers.clear?directionalMeasurements(f):{};
  const one = (a,b,tmp,dir) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    if(globalThis.FurnishDrawing)ang=FurnishDrawing.textAngle(ang,drawingRotation());
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#0e8f83' : '#ef5a24', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text ${directionalEditAttributes(dir,f,measurementDirectionLabel(dir,directions[dir]))} x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="${PAL.halo}" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map((m,i) => {
    const selected=ui.sel?.kind==='measure'&&ui.sel.id===i;
    const direction=Object.entries(directions).find(([,d])=>d&&sameMeasurement(m.a,m.b,d))?.[0];
    const hit=`<line x1="${m.a.x}" y1="${m.a.y}" x2="${m.b.x}" y2="${m.b.y}" stroke="transparent" stroke-width="${COARSE?24:14}" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;
    return `<g data-measure="${i}" style="cursor:pointer" pointer-events="${ui.tool==='select'||ui.tool==='marquee'?'all':'none'}"><title>${direction?tr('点击数字编辑净距；点击线段可删除测量','Click the value to edit clearance; select the line to delete'):tr('测量线：选择后可删除','Measurement: select to delete')}</title>${ui.tool==='select'||ui.tool==='marquee'?hit:''}${selected?`<line data-edit-overlay="true" x1="${m.a.x}" y1="${m.a.y}" x2="${m.b.x}" y2="${m.b.y}" stroke="#0e8f83" stroke-width="6" opacity=".4" vector-effect="non-scaling-stroke"/>`:''}${one(m.a,m.b,false,direction)}</g>`;
  }).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#0e8f83"/>`;
  if(ui.tool==='measure'&&ui.mSnap){const {point:p,edge:e}=ui.mSnap;s+=`<g data-edit-overlay="true" pointer-events="none"><line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}" stroke="#0e8f83" stroke-width="3" opacity=".65" vector-effect="non-scaling-stroke"/>${ui.mSnap.kind==='corner'?`<rect data-measure-snap="corner" x="${p.x-5*k}" y="${p.y-5*k}" width="${10*k}" height="${10*k}" fill="white" stroke="#0e8f83" stroke-width="2" vector-effect="non-scaling-stroke"><title>${tr('角点吸附','Corner snap')}</title></rect>`:ui.mSnap.kind==='midpoint'?`<path data-measure-snap="midpoint" d="M${p.x} ${p.y-6*k}L${p.x+6*k} ${p.y+5*k}L${p.x-6*k} ${p.y+5*k}Z" fill="white" stroke="#0e8f83" stroke-width="2" vector-effect="non-scaling-stroke"><title>${tr('边中点吸附','Edge midpoint snap')}</title></path>`:`<circle cx="${p.x}" cy="${p.y}" r="${5*k}" fill="white" stroke="#0e8f83" stroke-width="2" vector-effect="non-scaling-stroke"/>`}</g>`;}
  $('#gMeasure').innerHTML = s;
}

const ACC = '#ef5a24', TEAL = '#0e8f83';
function renderSel(){
  if(globalThis.FurnishObservationLayers&&selIds().some(id=>!FurnishObservationLayers.visible(getF(id))))ui.sel=null;
  const preview=window.FurnishWorkspace?.openingPreviewPlan?.();if(!preview)return renderSelectedGeometry();
  const actual=[WALLS,WINS,DOORS,SLIDES,ROOMS];try{({walls:WALLS,wins:WINS,doors:DOORS,slides:SLIDES,rooms:ROOMS}=preview);renderSelectedGeometry();}finally{[WALLS,WINS,DOORS,SLIDES,ROOMS]=actual;}
}
// Installation checks are advisory overlays: they never participate in picking,
// snapping, placement validation or persisted project data.
function waterheaterClearanceSVG(){
  if(!ui.layers.furn)return '';
  const heaters=state.furniture.filter(f=>f.type==='waterheater_flat'&&(!globalThis.FurnishObservationLayers||FurnishObservationLayers.visible(f)));if(!heaters.length)return '';
  const plan=canvasEffectivePlan(),k=1/view.s;
  return heaters.map(f=>{
    const c=FurnishDesign.waterheaterClearances(plan,f,{furniture:state.furniture}),sign=f.flip?-1:1;
    const frame=(kind,x,w,label)=>`<g data-edit-overlay="heater-clearance" data-heater-id="${esc(f.id)}" data-clearance-kind="${kind}" pointer-events="none" transform="${furnT(f)}"><rect x="${x}" y="${-f.d/2}" width="${w}" height="${f.d}" fill="rgba(214,69,50,.12)" stroke="#d64532" stroke-width="2" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"/><text x="${x+w/2}" y="${-f.d/2-(kind==='top'?24:8)*k}" font-size="${11*k}" text-anchor="middle" fill="#d64532" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke">${esc(label)}</text></g>`;
    let s='';if(c.top.ok===false)s+=frame('top',-f.w/2,f.w,tr('顶部预留不足','Top clearance insufficient'));
    if(c.socket.ok===false){const a=c.socket.nearest,b=c.socket.point;s+=`<g data-edit-overlay="heater-clearance" data-heater-id="${esc(f.id)}" data-clearance-kind="socket" pointer-events="none"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d64532" stroke-width="2" vector-effect="non-scaling-stroke"/><rect x="${b.x-30}" y="${b.y-30}" width="60" height="60" fill="rgba(214,69,50,.12)" stroke="#d64532" vector-effect="non-scaling-stroke"/><text x="${b.x}" y="${b.y-40*k}" font-size="${11*k}" fill="#d64532">${tr('插座净距不足','Socket clearance insufficient')}</text></g>`;}
    return s;
  }).join('');
}
function dishwasherClearanceSVG(){
 if(!ui.layers.furn)return '';const selected=new Set(selIds()),items=state.furniture.filter(f=>selected.has(f.id)&&!furnitureError(f)&&FurnishProducts.dishwasherInstallation(f));if(!items.length)return '';
 const plan=canvasEffectivePlan();
 return items.map(f=>{const result=FurnishProject.dishwasherChecks(plan,f,{furniture:state.furniture});return Object.entries(result.zones).map(([key,poly])=>{const checks=result.checks.filter(v=>v.kind==='dishwasher-'+(key==='vent'?'side':'opening')),color=checks.some(v=>v.ok===false)?'#d64532':checks.some(v=>v.ok===null)?'#b7791f':'#258072';return `<g data-edit-overlay="dishwasher-clearance" data-dishwasher-id="${esc(f.id)}" data-reservation="${key}" pointer-events="none"><title>${esc(key==='vent'?`出气侧 ${result.spec.sideClearance} mm`:`完全开门前伸 ${Math.round(result.spec.extension)} mm（保守包络）`)}</title><polygon points="${poly.map(p=>p.join(',')).join(' ')}" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/></g>`;}).join('');}).join('');
}
function kitchenRunHandleSVG(f,k,hit,hs,A,resizeCursor){
 if(!f.kitchen||!globalThis.FurnishKitchen?.shapeRules(f)?.independentResize)return null;
 let handles;try{handles=FurnishKitchen.runHandles(f);}catch{return null;}
 return handles.map(h=>{
  const thin=FurnishKitchen.extension(f,h.run).length>0,offset=thin?36:12,drawing=typeof drawingRotation==='function'?drawingRotation():0,flip=f.flip?-1:1,x=(h.x+h.dx*offset*k)*flip,y=h.y+h.dy*offset*k,angle=f.rot+drawing+Math.atan2(h.dy,h.dx*flip)*180/Math.PI;
  const px=h.x*flip,py=h.y,tx=-h.dy*flip*h.span/2,ty=h.dx*h.span/2,label=`${h.name} ${Math.round(h.length*10)/10} mm`,title=tr(`拖动调整${h.name}长度；只改变本边末端模块`,`Drag to resize run ${h.run+1}; changes its end module only`);
  return `<g data-edit-overlay="kitchen-run-handle" data-handle="kitchen-run" data-kitchen-run="${h.run}" style="cursor:${resizeCursor(angle)}"><title>${title}</title>${thin?'':`<path d="M${px-tx} ${py-ty}L${px+tx} ${py+ty}" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke"/>`}<path d="M${px-tx} ${py-ty}L${px+tx} ${py+ty}M${px} ${py}L${x} ${y}" fill="none" ${A} stroke-width="2" pointer-events="none"/><circle cx="${x}" cy="${y}" r="${hit}" fill="transparent"/><rect x="${x-6*hs*k}" y="${y-6*hs*k}" width="${12*hs*k}" height="${12*hs*k}" rx="${3*k}" fill="#fff" ${A} stroke-width="2"/><text transform="translate(${x} ${y}) rotate(${-f.rot-drawing})" y="${(thin?-32:-14)*hs*k}" text-anchor="middle" font-size="${11*k}" fill="${ACC}" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">${label}</text></g>`;
 }).join('');
}
function kitchenDividerHandleSVG(f,k,hs,A,resizeCursor){
 if(!f.kitchen||!globalThis.FurnishKitchen?.dividerHandles)return '';
 let handles;try{handles=FurnishKitchen.dividerHandles(f);}catch{return '';}
 const drawing=typeof drawingRotation==='function'?drawingRotation():0,flip=f.flip?-1:1;
 const grips=new Map(handles.map(h=>{const x=h.x*flip,y=h.y,tx=-h.dy*flip*h.span/2,ty=h.dx*h.span/2,angle=f.rot+drawing+Math.atan2(h.dy,h.dx*flip)*180/Math.PI;
  return [h.key,`<g data-edit-overlay="kitchen-divider" data-handle="kitchen-divider" data-kitchen-divider="${h.key}" data-kitchen-run="${h.run}" role="button" tabindex="0" aria-label="${esc(tr(`编辑相邻柜宽 ${Math.round(h.leftWidth)} / ${Math.round(h.rightWidth)} mm`,`Edit adjacent widths ${Math.round(h.leftWidth)} / ${Math.round(h.rightWidth)} mm`))}" style="cursor:${resizeCursor(angle)}"><title>${tr('点击输入柜宽，或拖动柜间分界线；相邻两柜一增一减，整排总长、柜深及其他模块不变','Click to enter widths or drag the divider; redistribute the adjacent widths and keep the run length fixed')}</title><path d="M${x-tx} ${y-ty}L${x+tx} ${y+ty}" fill="none" stroke="transparent" stroke-width="${COARSE?24:12}" vector-effect="non-scaling-stroke"/><path d="M${x-tx} ${y-ty}L${x+tx} ${y+ty}" fill="none" ${A} stroke-width="2" pointer-events="none"/><rect x="${x-5*hs*k}" y="${y-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" rx="${2*k}" fill="#fff" ${A}/></g>`];
 }));
 const angle=(f.rot+drawing)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),reserved=[];
 // Keep the numeric buttons clear of the floating selection toolbar.
 if(typeof document!=='undefined'&&typeof svg!=='undefined'){const fab=document.getElementById?.('fab'),matrix=svg.getScreenCTM?.();if(fab?.classList.contains('show')&&matrix){const r=fab.getBoundingClientRect(),a=drawing*Math.PI/180,x=f.cx*Math.cos(a)-f.cy*Math.sin(a),y=f.cx*Math.sin(a)+f.cy*Math.cos(a),ox=matrix.a*x+matrix.c*y+matrix.e,oy=matrix.b*x+matrix.d*y+matrix.f;reserved.push({x:r.left-ox-4,y:r.top-oy-4,w:r.width+8,h:r.height+8});}}
 for(const h of FurnishKitchen.extensionHandles(f)){const x=h.x*flip,y=h.y,text=`${h.name} ${Math.round(h.value*10)/10} mm`,w=Array.from(text).reduce((sum,ch)=>sum+(/[\u2e80-\uffff]/.test(ch)?10:6),8);reserved.push({x:(x*c-y*s)/k-w/2,y:(x*s+y*c)/k-24,w,h:16});}
 const controls=handles.map(h=>{const placed=reserved.slice(),labels=['left','right'].map(side=>{
  const sign=side==='left'?-1:1,value=Math.round(h[side+'Width']*100)/100,text=`${value} mm`,w=Math.max(58,text.length*6.5+18),height=COARSE?28:24,ux=h.dx*flip,uy=h.dy,nx=-h.dy*flip,ny=h.dx,projected=Math.abs(ux*c-uy*s)*w/2+Math.abs(ux*s+uy*c)*height/2,offset=(projected+12)*k;
  let x,y,box;for(let row=0;row<12;row++){const shift=sign*(16+(row%2?-1:1)*Math.ceil(row/2)*(height+5))*k;x=h.x*flip+sign*ux*offset+nx*shift;y=h.y+sign*uy*offset+ny*shift;const px=(x*c-y*s)/k,py=(x*s+y*c)/k;box={x:px-w/2,y:py-height/2,w,h:height};if(!placed.some(b=>box.x<b.x+b.w+4&&box.x+box.w+4>b.x&&box.y<b.y+b.h+4&&box.y+box.h+4>b.y))break;}placed.push(box);
  const name=h[side]<f.kitchen.modules.length?tr(`模块 ${h[side]+1}` ,`Module ${h[side]+1}`):tr('末端薄柜','Thin end cabinet'),title=tr(`点击修改${name}柜宽 ${value} mm，另一柜自动补差`,`Edit ${name} width ${value} mm; the adjacent cabinet compensates`);
  return `<path data-edit-overlay="kitchen-divider-width" d="M${h.x*flip+sign*ux*7*k} ${h.y+sign*uy*7*k}L${x} ${y}" fill="none" ${A} stroke-width="1" pointer-events="none"/><g data-edit-overlay="kitchen-divider-width" data-kitchen-divider-key="${h.key}" data-kitchen-divider-width="${side}" data-kitchen-module="${h[side]}" role="button" tabindex="0" aria-label="${esc(title)}" transform="translate(${x} ${y}) rotate(${-f.rot-drawing})" style="cursor:pointer"><title>${esc(title)}</title><rect x="${-w*k/2}" y="${-height*k/2}" width="${w*k}" height="${height*k}" rx="${4*k}" fill="${PAL.halo}" fill-opacity=".96" ${A} stroke-width=".7"/><text x="0" y="${4*k}" font-size="${11*k}" text-anchor="middle" fill="${ACC}" pointer-events="none">${text}</text></g>`;
 }).join('');
 const active=typeof drag!=='undefined'&&drag?.kind==='kitchen-divider'&&drag.id===f.id&&drag.divider===h.key;
 return `<g class="kitchen-divider-control" data-divider-control="${h.key}" ${active?'data-active="true"':''}>${grips.get(h.key)}<g class="kitchen-divider-labels">${labels}</g></g>`;
 }).join('');
 return controls;
}
function kitchenExtensionHandleSVG(f,k,hs,A,resizeCursor){
 if(!f.kitchen||!globalThis.FurnishKitchen?.extensionHandles)return '';
 let handles;try{handles=FurnishKitchen.extensionHandles(f);}catch{return '';}
 const drawing=typeof drawingRotation==='function'?drawingRotation():0,flip=f.flip?-1:1;
 return handles.map(h=>{const x=h.x*flip,y=h.y,tx=-h.dy*flip*h.span/2,ty=h.dx*h.span/2,angle=f.rot+drawing+Math.atan2(h.dy,h.dx*flip)*180/Math.PI;
  return `<g data-edit-overlay="kitchen-extension" data-handle="kitchen-extension" data-kitchen-run="${h.run}" data-kitchen-extension="${h.field}" style="cursor:${resizeCursor(angle)}"><title>${tr(`拖动调整${h.name}，常规模块尺寸和位置保持不变`,`Resize thin end ${h.field}; ordinary cabinets stay fixed`)}</title><path d="M${x-tx} ${y-ty}L${x+tx} ${y+ty}" stroke="transparent" stroke-width="${COARSE?24:12}" vector-effect="non-scaling-stroke"/><path d="M${x-tx} ${y-ty}L${x+tx} ${y+ty}" fill="none" ${A} stroke-width="2" pointer-events="none"/><rect x="${x-5*hs*k}" y="${y-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" rx="${2*k}" fill="#fff" ${A}/><text transform="translate(${x} ${y}) rotate(${-f.rot-drawing})" y="${-12*hs*k}" text-anchor="middle" font-size="${10*k}" fill="${ACC}" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">${h.name} ${Math.round(h.value*10)/10} mm</text></g>`;
 }).join('');
}
function kitchenGapSVG(f,k){
 if(typeof state==='undefined'||typeof FurnishSnapping==='undefined'||!FurnishSnapping.kitchenGaps||typeof drag!=='undefined'&&drag)return '';
 let rows;try{rows=FurnishSnapping.kitchenGaps(f,{furniture:state.furniture,scale:view.s});}catch{return '';}
 const drawing=typeof drawingRotation==='function'?drawingRotation():0,K=FurnishKitchen;
 return rows.filter(row=>row.kind!=='run'||row.run!==1).map(row=>{let x=0,y=0;if(row.kind==='run'){const h=K.runHandles(f).find(h=>'run:'+h.run===row.key),offset=K.extension(f,h.run).length?36:12;x=(h.x+h.dx*offset*k)*(f.flip?-1:1);y=h.y+h.dy*offset*k;}else{const edge=row.key.split(':')[1];x=edge==='left'?-f.w/2-5*k:edge==='right'?f.w/2+5*k:0;y=edge==='top'?-f.d/2-5*k:edge==='bottom'?f.d/2+5*k:0;}
  const name=Array.from(row.reference.name||'家具'),short=name.length>10?name.slice(0,9).join('')+'…':name.join(''),label=`${short} ${Math.round(row.gap*100)/100} mm`,w=Math.max(90,Array.from(label).reduce((sum,c)=>sum+(/[\u2e80-\uffff]/.test(c)?10:6),16))*k;
  return `<g data-edit-overlay="kitchen-gap" data-kitchen-gap="${row.key}" role="button" tabindex="0" aria-label="${esc(K.runName(f,row.run)+'预留间距，'+label)}" transform="translate(${x} ${y}) rotate(${-f.rot-drawing})" style="cursor:pointer"><title>${esc('点击输入与'+(row.reference.name||'家具')+'的预留间距，只调整这条边尺寸')}</title><rect x="${-w/2}" y="${9*k}" width="${w}" height="${20*k}" rx="${4*k}" fill="${PAL.halo}" fill-opacity=".92"/><text x="0" y="${23*k}" font-size="${10*k}" text-anchor="middle" fill="#008b8b" pointer-events="none">${esc(label)}</text></g>`;
 }).join('');
}
function renderSelectedGeometry(){
  const k = 1/view.s, ids = selIds(); let s = '';
  const A = `stroke="${ACC}" vector-effect="non-scaling-stroke"`;
  const halo = w => `stroke="${PAL.halo}" stroke-width="${w*k}" paint-order="stroke"`;
  if (ids.length > 1){
    const items = selItems();
    items.forEach(f => {const outline=FurnishGeometry.localOutline(f);s += `<g transform="${furnT(f)}" pointer-events="none">${outline?`<polygon points="${outline.map(([x,y])=>[x*(f.flip?-1:1),y].join(',')).join(' ')}" fill="rgba(239,90,36,.1)" ${A} stroke-width="1.5"/>`:`<rect x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="rgba(239,90,36,.1)" ${A} stroke-width="1.5"/>`}</g>`;});
    const [x0,y0,x1,y1] = groupBox(items), p = 8*k;
    s += `<rect x="${x0-p}" y="${y0-p}" width="${x1-x0+2*p}" height="${y1-y0+2*p}" fill="none" ${A} stroke-width="1.2" stroke-dasharray="6 4" pointer-events="none"/>
      <text x="${(x0+x1)/2}" y="${y1+p+18*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${tr(`已选 ${items.length} 件`, `${items.length} selected`)} · ${Math.round(x1-x0)} × ${Math.round(y1-y0)}</text>`;
    if(ui.layers.clear&&(!drag||drag.kind==='move'))s+=clearanceSVG(items,k);
  } else if (ids.length === 1){
    const f = getF(ids[0]);
    if (f){
      // 触屏上手柄更大、离家具更远，并各带一圈透明的大热区；锁定的家具不显示手柄
      const p = 5*k, hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2+p, sy = f.d/2+p, outline=FurnishGeometry.localOutline(f);
      const resizeCursor=angle=>['ew-resize','nwse-resize','ns-resize','nesw-resize'][((Math.round(angle/45)%4)+4)%4];
      const outer=!!globalThis.FurnishKitchen?.outerResizable(f),drawing=typeof drawingRotation==='function'?drawingRotation():0;
      const edgeHandle=(axis,x,y,angle,label)=>`<g data-handle="size" data-axis="${axis}" ${outer?`data-edit-overlay="kitchen-outer-edge" data-kitchen-edge="${axis==='w'?'right':'bottom'}"`:''} style="cursor:${resizeCursor(angle+drawing)}"><title>${label}</title>${outer?`<path d="${axis==='w'?`M${sx} ${-sy}L${sx} ${sy}`:`M${-sx} ${sy}L${sx} ${sy}`}" fill="none" stroke="transparent" stroke-width="${COARSE?24:12}" vector-effect="non-scaling-stroke"/>`:''}<circle cx="${x}" cy="${y}" r="${hit}" fill="transparent"/><rect x="${x-5*hs*k}" y="${y-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" rx="${2*k}" fill="#fff" ${A} stroke-width="1.5"/></g>`;
      s += `<g transform="${furnT(f)}">
        ${outline?`<polygon data-selection-outline="product" points="${outline.map(([x,y])=>[x*(f.flip?-1:1),y].join(',')).join(' ')}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`:`<rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`}`;
      if (!furnitureLocked(f)){const runGrips=kitchenRunHandleSVG(f,k,hit,hs,A,resizeCursor);
        if(outer)for(const [edge,axis,x1,y1,x2,y2] of [['left','w',-sx,-sy,-sx,sy],['top','d',-sx,-sy,sx,-sy]]){
          const canonical=f.flip?(edge==='left'?'right':edge==='right'?'left':edge):edge,target=FurnishKitchen.outerEdge(f,canonical),title=tr(FurnishKitchen.isLaundry(f)?'拖动此端调整对应模块；水槽端同步调整定制盆宽，另一端固定':`拖动整条外边，固定对侧；调整${FurnishKitchen.runName(f,target.run)}${target.kind==='depth'?'柜深（内侧固定）':'末端柜宽'}，保留薄柜尺寸`,'Drag outer edge; keep opposite edge and inner modules fixed');
          s+=`<g data-edit-overlay="kitchen-outer-edge" data-handle="size" data-axis="${axis}" data-kitchen-edge="${edge}" style="cursor:${resizeCursor(f.rot+drawing+(axis==='d'?90:0))}"><title>${title}</title><path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="transparent" stroke-width="${COARSE?24:12}" vector-effect="non-scaling-stroke"/>${edge==='left'||edge==='top'?`<rect x="${(x1+x2)/2-5*hs*k}" y="${(y1+y2)/2-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" rx="${2*k}" fill="#fff" ${A} stroke-width="1.5"/>`:''}</g>`;
        }
        s += `
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${tr('拖动旋转（Shift 自由角度）','Drag to rotate (Shift for free angle)')}</title></circle>
        ${runGrips??''}
        ${edgeHandle('w',sx,0,f.rot,outer?tr('调整这条外边，固定对侧和内侧；保留薄柜尺寸','Resize this outer edge; keep opposite edge fixed'):tr('只调整宽度（固定对侧边）','Resize width only (opposite edge stays fixed)'))}
        ${edgeHandle('d',0,sy,f.rot+90,outer?tr('调整这条外边柜深，固定对侧和内侧；保留薄柜尺寸','Resize this row depth; keep opposite and inner edges fixed'):tr('只调整深度（固定对侧边）','Resize depth only (opposite edge stays fixed)'))}
        <g data-handle="size" ${outer?'data-kitchen-edge="corner"':''} style="cursor:${resizeCursor(f.rot+drawing+45)}"><title>${tr('同时调整宽度和深度','Resize width and depth together')}</title><circle cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="${ACC}"/></g>`;}
      if(!furnitureLocked(f))s+=kitchenExtensionHandleSVG(f,k,hs,A,resizeCursor)+kitchenDividerHandleSVG(f,k,hs,A,resizeCursor);
      if(!furnitureLocked(f)&&outer)s+=kitchenGapSVG(f,k);
      s += `</g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${furnitureLocked(f) ? tr('已锁定 · ', 'Locked · ') : ''}${Math.round(f.w*10)/10} × ${Math.round(f.d*10)/10}</text>`;
      if (ui.layers.clear && (!drag || drag.kind === 'move')) s += clearanceSVG(f, k);
    }
  } else if (ui.sel?.kind === 'note' && noteBox[ui.sel.id]){
    const [x0,y0,x1,y1] = noteBox[ui.sel.id], p = 6*k;
    s += `<rect x="${x0-p}" y="${y0-p}" width="${x1-x0+2*p}" height="${y1-y0+2*p}" rx="${(y1-y0)/2+p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`;
  } else if (['door','slide','win'].includes(ui.sel?.kind)){
    const o=(ui.sel.kind==='door'?DOORS:ui.sel.kind==='slide'?SLIDES:WINS)[ui.sel.id];if(o){if(ui.sel.kind==='win'&&(o.bayId||o.bayGroup)){const assembly=bayAssembly(o),r=assembly.group.map(w=>w.rect),x0=Math.min(...r.map(q=>q[0])),y0=Math.min(...r.map(q=>q[1])),x1=Math.max(...r.map(q=>q[2])),y1=Math.max(...r.map(q=>q[3]));if(assembly.outline)s+=`<polygon data-bay-selection="whole" points="${assembly.outline.map(p=>p.join(',')).join(' ')}" fill="rgba(239,90,36,.1)" ${A} stroke-width="2" pointer-events="none"/>`;else for(const q of r)s+=`<rect data-bay-selection="whole" x="${q[0]}" y="${q[1]}" width="${q[2]-q[0]}" height="${q[3]-q[1]}" fill="none" ${A} stroke-width="2" pointer-events="none"/>`;s+=`<rect x="${x0-60}" y="${y0-60}" width="${x1-x0+120}" height="${y1-y0+120}" fill="none" ${A} stroke-width="1" stroke-dasharray="5 4" pointer-events="none"/><text x="${(x0+x1)/2}" y="${y1+60+16*k}" text-anchor="middle" fill="${ACC}" font-size="${12*k}" ${halo(3)} pointer-events="none">${o.bayType==='recessed'?'飘窗台 · 正面窗／两侧实墙':'整组飘窗 · 三面窗同步编辑'}</text>`;}else{const [x0,y0,x1,y1]=o.rect;s+=`<rect x="${x0-60}" y="${y0-60}" width="${x1-x0+120}" height="${y1-y0+120}" fill="none" ${A} stroke-width="3" pointer-events="none"/>`;}}
  } else if (ui.sel?.kind === 'wall'){
    const selected=ui.sel.wallIds?.length?WALLS.filter((_,i)=>ui.sel.wallIds.includes(PLAN.wallRefs?.[i])):[WALLS[Number(ui.sel.id.slice(1))]];for(const w of selected.filter(Boolean))s+=`<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="none" ${A} stroke-width="3" pointer-events="none"/>`;
  } else if (ui.sel?.kind === 'room'){
    const r = ROOMS.find(r => r.id === ui.sel.id);
    s += `<path d="${(r.rings||[r.poly]).map(p=>'M'+p.map(p=>p.join(',')).join('L')+'Z').join(' ')}" fill-rule="evenodd" fill="rgba(239,90,36,.08)" stroke="${ACC}" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  // 拖动时的对齐参考线
  (ui.guides || []).forEach(g => s += g.point
    ? `<g data-edit-overlay="drag-snap" data-drag-snap="${g.kind}" pointer-events="none"><line x1="${g.edge.a.x}" y1="${g.edge.a.y}" x2="${g.edge.b.x}" y2="${g.edge.b.y}" stroke="#0e8f83" stroke-width="2" opacity=".65" vector-effect="non-scaling-stroke"/>${g.kind==='midpoint'?`<path d="M${g.point.x} ${g.point.y-6*k}L${g.point.x+6*k} ${g.point.y+5*k}L${g.point.x-6*k} ${g.point.y+5*k}Z" fill="white" stroke="#0e8f83" stroke-width="2" vector-effect="non-scaling-stroke"/>`:`<rect x="${g.point.x-5*k}" y="${g.point.y-5*k}" width="${10*k}" height="${10*k}" fill="white" stroke="#0e8f83" stroke-width="2" vector-effect="non-scaling-stroke"/>`}</g>`
    : g.line
    ? `<line x1="${g.line[0].x}" y1="${g.line[0].y}" x2="${g.line[1].x}" y2="${g.line[1].y}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`
    : g.v
    ? `<line x1="${g.x}" y1="${g.a}" x2="${g.x}" y2="${g.b}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`
    : `<line x1="${g.a}" y1="${g.y}" x2="${g.b}" y2="${g.y}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
  if (ui.marq){
    const [a, b] = ui.marq;
    s += `<rect x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,b.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(b.y-a.y)}" fill="rgba(47,93,98,.08)" stroke="${TEAL}" stroke-width="1" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  $('#gSel').innerHTML = waterheaterClearanceSVG()+dishwasherClearanceSVG()+s;
  if(typeof queueFabPosition==='function')queueFabPosition();
}
// Four independent clearances along the current drawing's screen axes.
function clearanceSVG(f, k){
  const labels={l:tr('左','Left'),r:tr('右','Right'),t:tr('上','Up'),b:tr('下','Down')};
  return Object.entries(directionalMeasurements(f)).filter(([,m])=>m&&!state.measures.some(saved=>sameMeasurement(saved.a,saved.b,m))).map(([dir,m])=>{
    const {a,b}=m,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,angle=FurnishDrawing.textAngle(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,drawingRotation()),v=Math.max(m.distance,1),nx=-(b.y-a.y)/v*4*k,ny=(b.x-a.x)/v*4*k;
    return `<g data-edit-overlay="directional-distance" data-distance-dir="${dir}" pointer-events="none"><path d="M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-nx} ${a.y-ny}L${a.x+nx} ${a.y+ny}M${b.x-nx} ${b.y-ny}L${b.x+nx} ${b.y+ny}" fill="none" stroke="${TEAL}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><text ${directionalEditAttributes(dir,f,measurementDirectionLabel(dir,m))} x="${mx}" y="${my-8*k}" text-anchor="middle" font-size="${12*k}" fill="${TEAL}" transform="rotate(${angle} ${mx} ${my})" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke"><title>${tr('点击输入目标净距并移动物体','Click to enter target clearance and move this item')}</title>${labels[dir]} ${Math.round(m.distance)} mm</text></g>`;
  }).join('');
}

// 文字标注：按平面尺寸（mm）绘制，随缩放 / 打印 / 导出一起变化；底色胶囊 + 左侧定位点
const noteBox = {};
function renderNotes(){
  const g = $('#gNotes');
  g.setAttribute('display', ui.layers.notes ? 'inline' : 'none');
  g.innerHTML = (state.notes || []).map(n => {
    const fs = 210*n.size, w = [...n.text].reduce((a, c) => a + (/[\u2e80-\uffff]/.test(c) ? 1 : .58), 0)*fs + fs*1.3, h = fs*1.75;
    const [bg, fg] = NOTE_COLORS[n.color] || NOTE_COLORS.accent, x0 = n.x - fs*.5, y0 = n.y - h/2;
    noteBox[n.id] = [x0, y0, x0 + w, y0 + h];
    return `<g class="note" data-note="${n.id}">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h/2}" fill="${bg}" stroke="${n.color === 'paper' ? '#2a2622' : 'none'}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle cx="${n.x}" cy="${n.y}" r="${fs*.2}" fill="${fg}" opacity=".9"/>
      <text x="${n.x + fs*.45}" y="${n.y}" font-size="${fs}" font-weight="700" dominant-baseline="central" fill="${fg}">${esc(n.text)}</text></g>`;
  }).join('');
}
function openingDimensionSVG(dimension,scale=1,font=160){
  if(!dimension)return '';
  const {a,b,wall,distance}=dimension,p=a.map(v=>v/scale),q=b.map(v=>v/scale),h=a[1]===b[1],tick=font*.35,color='#17806c';
  return `<g pointer-events="none" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke">${wall?`<rect x="${wall[0]/scale}" y="${wall[1]/scale}" width="${(wall[2]-wall[0])/scale}" height="${(wall[3]-wall[1])/scale}" fill="rgba(23,128,108,.12)"/>`:''}<path d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}M${p[0]-(h?0:tick)} ${p[1]-(h?tick:0)}L${p[0]+(h?0:tick)} ${p[1]+(h?tick:0)}M${q[0]-(h?0:tick)} ${q[1]-(h?tick:0)}L${q[0]+(h?0:tick)} ${q[1]+(h?tick:0)}"/><text x="${(p[0]+q[0])/2}" y="${(p[1]+q[1])/2-font*.6}" text-anchor="middle" fill="${color}" stroke="none" font-size="${font}">${Math.round(distance)} mm</text></g>`;
}
function renderArchitecturePreview(plan,dimension){
  const actual=[WALLS,WINS,DOORS,SLIDES,ROOMS];
  try{({walls:WALLS,wins:WINS,doors:DOORS,slides:SLIDES,rooms:ROOMS}=plan);renderWalls();renderRooms();renderOpenings();renderSel();$('#gOpen').insertAdjacentHTML('beforeend',openingDimensionSVG(dimension));}
  finally{[WALLS,WINS,DOORS,SLIDES,ROOMS]=actual;}
}
function renderAll(){
  window.FurnishWorkspace?.clearOpeningPreview(false);
  window.FurnishDesignUI?.clearPlacementGuide();
  syncCustomArchitecture();
  applyOpeningOverrides(); renderOpenings(); ui.guides = null;
  // These layers only read the design; share one derivation within this draw.
  withCanvasPlan(()=>{renderGrid(); renderRooms(); renderFurn(); renderWalls(); renderLabels(); renderDims(); renderMeasure(); renderNotes(); renderSel();});
  renderPanel(); updateHeader();
  window.View3D?.sync();
  window.FurnishWorkspace?.afterRender();
  window.FurnishWorkflowTools?.afterRender();
  window.FurnishDrawingUI?.afterRender();
  window.FurnishRoomMeasure?.afterRender();
  window.FurnishTilePresetUI?.afterRender();
  window.FurnishTileWorkspace?.afterRender();
  window.FurnishCeilingUI?.afterRender();
}
