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
function renderRooms(){
  let s = '';
  ROOMS.forEach(r => s += `<path class="room" data-room="${r.id}" d="${(r.rings||[r.poly]).map(p=>'M'+p.map(p=>p.join(',')).join('L')+'Z').join(' ')}" fill-rule="evenodd" fill="url(#m-${state.rooms[r.id].mat})" ${r.zone?'stroke="#139687" stroke-width="1" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"':''}/>`);
  const sill = ([a,b,c,d], extra='') => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="${PAL.sill}" stroke="${PAL.sillLine}" stroke-width="1" vector-effect="non-scaling-stroke" ${extra}/>`;
  DOORS.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-door="${i}"`));
  SLIDES.forEach((d,i) => s += sill(d.rect, `class="sill pick" data-slide="${i}"`));
  $('#gRooms').innerHTML = s;
}

// Floor rugs and translucent pendants retain their layers; separated height
// ranges are drawn bottom to top wherever their plan footprints overlap.
const drawOrder = () => {const valid=renderableFurniture(),ids=new Set(valid.map(f=>f.id));return [...FurnishDesign.planFurnitureOrder(valid),...state.furniture.filter(f=>!ids.has(f.id))];};
function syncFurnOrder(){
 const g=$('#gFurn'),nodes=[...g.children],byId=new Map(nodes.map(node=>[node.dataset.fid,node])),order=drawOrder();
 if(order.every((f,i)=>nodes[i]?.dataset.fid===f.id))return;
 for(const f of order){const node=byId.get(f.id);if(node)g.appendChild(node);}
}
const furnT = f => `translate(${f.cx} ${f.cy}) rotate(${f.rot})`;
let clashIds = new Set();
function renderFurn(){
  furnitureRenderErrors.clear();
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  clashIds = new Set(collisions().flat());
  const servicePipes=typeof FurnishServices!=='undefined'?FurnishServices.pipes(FurnishProject.effectivePlan(PLAN,state)):[];
  g.innerHTML = drawOrder().map(f => {
    try{
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = Math.min(f.w,f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot-(globalThis.FurnishDrawing?drawingRotation():0)})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${PAL.text}" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>` : '';
    const body = furnSVG(f.type,f.w,f.d,f.color,f), mirrored = f.flip ? `<g transform="scale(-1 1)">${body}</g>` : body;
    const pipes=!furnitureError(f)&&servicePipes.length&&FurnishProducts.serviceCut(f)?servicePipes.filter(p=>FurnishServices.bodyHit(f,p,0)):[];
    const maskId='pipe-cut-'+f.id,mask=pipes.length?`<defs><mask id="${esc(maskId)}" maskUnits="userSpaceOnUse" x="${-f.w/2-100}" y="${-f.d/2-100}" width="${f.w+200}" height="${f.d+200}"><rect x="${-f.w/2-100}" y="${-f.d/2-100}" width="${f.w+200}" height="${f.d+200}" fill="white"/>${pipes.map(p=>{const local=FurnishServices.local({...f,flip:false},p);return `<circle cx="${local.at[0]}" cy="${local.at[1]}" r="${p.radius}" fill="black"/>`;}).join('')}</mask></defs>`:'';
    const flip=pipes.length?`${mask}<g mask="url(#${esc(maskId)})">${mirrored}</g>`:mirrored;
    const clash = ui.layers.collide && clashIds.has(f.id)
      ? `<rect data-edit-overlay="clash" x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="url(#clash)" stroke="#d64532" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>` : '';
    // 锁定标记：固定 150mm 的小锁，随家具一起摆放但保持正向
    const lock = f.locked ? `<g data-edit-overlay="lock" transform="translate(${f.w/2-110} ${-f.d/2+110}) rotate(${-f.rot})" pointer-events="none"><circle r="95" fill="${PAL.halo}" stroke="${PAL.ink}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <rect x="-45" y="-12" width="90" height="62" rx="12" fill="${PAL.ink}"/><path d="M-28 -12v-18a28 28 0 0 1 56 0v18" fill="none" stroke="${PAL.ink}" stroke-width="16"/></g>` : '';
    return `<g class="furn${f.locked ? ' locked' : ''}" data-fid="${f.id}"${furnitureError(f)?' data-model-error="true"':''} transform="${furnT(f)}"${f.type === 'pendant' ? ' opacity=".6"' : ''}>${flip}${clash}${label}${lock}</g>`;
    }catch(e){const message=e.message||String(e);furnitureRenderErrors.set(f.id,message);return `<g class="furn" data-fid="${esc(f.id)}" data-model-error="true" transform="${furnT(f)}">${furnitureFallbackSVG(f,message)}</g>`;}
  }).join('');
  syncFurnBadge(); syncEmpty(); syncModelErrors();
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
  DOORS.forEach(d => {
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

let roomLabelLayoutCache=null;
function roomLabelLayout(){
 const rooms=ROOMS.map(r=>({...r,name:nm(state.rooms[r.id].name)})),obstacles=ui.layers.furn?renderableFurniture().filter(f=>!['rug','pendant','curtain','wallart'].includes(f.type)).flatMap(f=>FurnishGeometry.footprints(f)):[],rotation=drawingRotation(),key=JSON.stringify([rooms.map(r=>[r.id,r.at,r.name,r.poly,r.rings,r.polys]),obstacles,rotation]);
 if(roomLabelLayoutCache?.key!==key)roomLabelLayoutCache={key,positions:new Map(FurnishDrawing.roomLabels(rooms,obstacles,{rotation}).map(v=>[v.id,v]))};return roomLabelLayoutCache.positions;
}
function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  const positions=globalThis.FurnishDrawing?roomLabelLayout():null;
  g.innerHTML = ROOMS.filter(r => r.at).map(r => {
    const chosen=positions?.get(r.id),[x,y]=chosen?.at||r.at,size=chosen?.size||1,halo = `stroke="${PAL.halo}" stroke-width="45" paint-order="stroke" stroke-linejoin="round"`;
    return `<g data-room-label="${r.id}" data-label-at="${x},${y}" transform="rotate(${globalThis.FurnishDrawing?-drawingRotation():0} ${x} ${y})"><text x="${x}" y="${y-100*size}" dominant-baseline="central" font-size="${250*size}" font-weight="600" text-anchor="middle" fill="${PAL.label}" ${halo}>${esc(nm(state.rooms[r.id].name))}</text>
      <text x="${x}" y="${y+160*size}" dominant-baseline="central" font-size="${175*size}" text-anchor="middle" fill="${PAL.labelSub}" ${halo}>${fmt(area(r.poly))} m²</text></g>`;
  }).join('');
}

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
  g.innerHTML = globalThis.FurnishDrawing?drawingDimensionsSVG(FurnishDrawing.dimensions(FurnishProject.effectivePlan(PLAN,state),state.drawing),PAL.dim,drawingRotation(),view.s):PLAN.dims.map(d => chain(d.h, d.at, d.start, d.segs)).join('');
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

function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a,b,tmp) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#0e8f83' : '#ef5a24', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="${PAL.halo}" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a,m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#0e8f83"/>`;
  $('#gMeasure').innerHTML = s;
}

const ACC = '#ef5a24', TEAL = '#0e8f83';
function renderSel(){
  const preview=window.FurnishWorkspace?.openingPreviewPlan?.();if(!preview)return renderSelectedGeometry();
  const actual=[WALLS,WINS,DOORS,SLIDES,ROOMS];try{({walls:WALLS,wins:WINS,doors:DOORS,slides:SLIDES,rooms:ROOMS}=preview);renderSelectedGeometry();}finally{[WALLS,WINS,DOORS,SLIDES,ROOMS]=actual;}
}
// Installation checks are advisory overlays: they never participate in picking,
// snapping, placement validation or persisted project data.
function waterheaterClearanceSVG(){
  if(!ui.layers.furn)return '';
  const heaters=state.furniture.filter(f=>f.type==='waterheater_flat');if(!heaters.length)return '';
  const plan=FurnishProject.effectivePlan(PLAN,state),k=1/view.s;
  return heaters.map(f=>{
    const c=FurnishDesign.waterheaterClearances(plan,f,{furniture:state.furniture}),sign=f.flip?-1:1;
    const frame=(kind,x,w,label)=>`<g data-edit-overlay="heater-clearance" data-heater-id="${esc(f.id)}" data-clearance-kind="${kind}" pointer-events="none" transform="${furnT(f)}"><rect x="${x}" y="${-f.d/2}" width="${w}" height="${f.d}" fill="rgba(214,69,50,.12)" stroke="#d64532" stroke-width="2" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"/><text x="${x+w/2}" y="${-f.d/2-(kind==='top'?24:8)*k}" font-size="${11*k}" text-anchor="middle" fill="#d64532" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke">${esc(label)}</text></g>`;
    let s='';if(c.top.ok===false)s+=frame('top',-f.w/2,f.w,tr('顶部预留不足','Top clearance insufficient'));
    if(c.socket.ok===false){const a=c.socket.nearest,b=c.socket.point;s+=`<g data-edit-overlay="heater-clearance" data-heater-id="${esc(f.id)}" data-clearance-kind="socket" pointer-events="none"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d64532" stroke-width="2" vector-effect="non-scaling-stroke"/><rect x="${b.x-30}" y="${b.y-30}" width="60" height="60" fill="rgba(214,69,50,.12)" stroke="#d64532" vector-effect="non-scaling-stroke"/><text x="${b.x}" y="${b.y-40*k}" font-size="${11*k}" fill="#d64532">${tr('插座净距不足','Socket clearance insufficient')}</text></g>`;}
    return s;
  }).join('');
}
function renderSelectedGeometry(){
  const k = 1/view.s, ids = selIds(); let s = '';
  const A = `stroke="${ACC}" vector-effect="non-scaling-stroke"`;
  const halo = w => `stroke="${PAL.halo}" stroke-width="${w*k}" paint-order="stroke"`;
  if (ids.length > 1){
    const items = selItems();
    items.forEach(f => s += `<g transform="${furnT(f)}" pointer-events="none"><rect x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="rgba(239,90,36,.1)" ${A} stroke-width="1.5"/></g>`);
    const [x0,y0,x1,y1] = groupBox(items), p = 8*k;
    s += `<rect x="${x0-p}" y="${y0-p}" width="${x1-x0+2*p}" height="${y1-y0+2*p}" fill="none" ${A} stroke-width="1.2" stroke-dasharray="6 4" pointer-events="none"/>
      <text x="${(x0+x1)/2}" y="${y1+p+18*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${tr(`已选 ${items.length} 件`, `${items.length} selected`)} · ${Math.round(x1-x0)} × ${Math.round(y1-y0)}</text>`;
  } else if (ids.length === 1){
    const f = getF(ids[0]);
    if (f){
      // 触屏上手柄更大、离家具更远，并各带一圈透明的大热区；锁定的家具不显示手柄
      const p = 5*k, hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2+p, sy = f.d/2+p;
      const resizeCursor=angle=>['ew-resize','nwse-resize','ns-resize','nesw-resize'][((Math.round(angle/45)%4)+4)%4];
      const edgeHandle=(axis,x,y,angle,label)=>`<g data-handle="size" data-axis="${axis}" style="cursor:${resizeCursor(angle)}"><title>${label}</title><circle cx="${x}" cy="${y}" r="${hit}" fill="transparent"/><rect x="${x-5*hs*k}" y="${y-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" rx="${2*k}" fill="#fff" ${A} stroke-width="1.5"/></g>`;
      s += `<g transform="${furnT(f)}">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>`;
      if (!f.locked) s += `
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${tr('拖动旋转（Shift 自由角度）','Drag to rotate (Shift for free angle)')}</title></circle>
        ${edgeHandle('w',sx,0,f.rot,tr('只调整宽度（固定对侧边）','Resize width only (opposite edge stays fixed)'))}
        ${edgeHandle('d',0,sy,f.rot+90,tr('只调整深度（固定对侧边）','Resize depth only (opposite edge stays fixed)'))}
        <g data-handle="size" style="cursor:${resizeCursor(f.rot+45)}"><title>${tr('同时调整宽度和深度','Resize width and depth together')}</title><circle cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="${ACC}"/></g>`;
      s += `</g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="${ACC}" font-weight="600" pointer-events="none" ${halo(3)}>${f.locked ? tr('已锁定 · ', 'Locked · ') : ''}${Math.round(f.w*10)/10} × ${Math.round(f.d*10)/10}</text>`;
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
  (ui.guides || []).forEach(g => s += g.v
    ? `<line x1="${g.x}" y1="${g.a}" x2="${g.x}" y2="${g.b}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`
    : `<line x1="${g.a}" y1="${g.y}" x2="${g.b}" y2="${g.y}" stroke="#d6336c" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
  if (ui.marq){
    const [a, b] = ui.marq;
    s += `<rect x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,b.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(b.y-a.y)}" fill="rgba(47,93,98,.08)" stroke="${TEAL}" stroke-width="1" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  $('#gSel').innerHTML = waterheaterClearanceSVG()+s;
}
// 选中家具到四周墙面（含窗）的净距：沿 ±X / ±Y 找最近的、与家具投影有重叠的墙段
function clearanceSVG(f, k){
  const {hw, hh} = aabb(f), L = f.cx-hw, R = f.cx+hw, T = f.cy-hh, B = f.cy+hh, rects = snapRects();
  const near = (dir) => {
    let best = Infinity;
    for (const r of rects){
      if (dir === 'r' && r[0] >= R - 1 && r[1] < B && r[3] > T) best = Math.min(best, r[0] - R);
      if (dir === 'l' && r[2] <= L + 1 && r[1] < B && r[3] > T) best = Math.min(best, L - r[2]);
      if (dir === 'b' && r[1] >= B - 1 && r[0] < R && r[2] > L) best = Math.min(best, r[1] - B);
      if (dir === 't' && r[3] <= T + 1 && r[0] < R && r[2] > L) best = Math.min(best, T - r[3]);
    }
    return best;
  };
  const S = `stroke="${TEAL}" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"`, fs = 11*k;
  const txt = (x, y, v) => `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${TEAL}" font-weight="600" stroke="${PAL.halo}" stroke-width="${3*k}" paint-order="stroke" pointer-events="none">${Math.round(v)}</text>`;
  const tick = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${S}/>`;
  let s = '';
  for (const d of ['l', 'r', 't', 'b']){
    const v = near(d); if (!(v > 2 && v < 4000)) continue;
    const t = 4*k;
    if (d === 'l' || d === 'r'){ const x1 = d === 'l' ? L - v : R, x2 = x1 + v, y = f.cy;
      s += tick(x1, y, x2, y) + tick(x1, y-t, x1, y+t) + tick(x2, y-t, x2, y+t) + txt((x1+x2)/2, y - 9*k, v); }
    else { const y1 = d === 't' ? T - v : B, y2 = y1 + v, x = f.cx;
      s += tick(x, y1, x, y2) + tick(x-t, y1, x+t, y1) + tick(x-t, y2, x+t, y2) + txt(x + 16*k, (y1+y2)/2, v); }
  }
  return s;
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
  renderGrid(); renderRooms(); renderFurn(); renderWalls(); renderLabels(); renderDims(); renderMeasure(); renderNotes(); renderSel(); renderPanel(); updateHeader();
  window.View3D?.sync();
  window.FurnishWorkspace?.afterRender();
  window.FurnishWorkflowTools?.afterRender();
  window.FurnishDrawingUI?.afterRender();
}
