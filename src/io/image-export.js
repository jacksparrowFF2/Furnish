/* Classic script: browser image/download adapters use live app state when
 * called. Declarations only; load before app.js initialization. */
/* ======================= 导入导出 ======================= */
function download(name, blob){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function preparePlanSVG({dimensions=true,measurements=true,notes=true,light=false,visibleLayers=true,id='export-plan'}={}){
  const s=svg.cloneNode(true),D=FurnishDesign,palette=light?PAL_LIGHT:PAL;
  s.setAttribute('id',id);s.removeAttribute('style');s.removeAttribute('class');
  s.querySelectorAll('[data-seat-preview]').forEach(g=>g.removeAttribute('data-seat-preview'));
  s.querySelectorAll('#gSel,#gGrid,#gSpaceFocus,#gGuides,#gPlacement,#gWallNet,#gProposal,#gCompass,[data-edit-overlay],script,foreignObject').forEach(g=>g.remove());
  if(!visibleLayers)for(const layer of ['gRooms','gWalls','gOpen','gFurn','gLabels','gDims','gMeasure','gNotes'])s.querySelector('#'+layer)?.removeAttribute('display');
  if(!dimensions)s.querySelector('#gDims')?.remove();if(!notes)s.querySelector('#gNotes')?.remove();
  if(globalThis.FurnishDrawing)refreshFurnitureLabels(s,{scale:0,selected:[],palette});
  refreshHobOpenings(s,{scale:0,palette,dimensions:dimensions&&(!visibleLayers||ui.layers.dims)});
  const measure=s.querySelector('#gMeasure');if(measure)measure.innerHTML=measurements?(state.measures||[]).map(m=>{const v=D.measurementGeometry(m);if(!v)return '';const {a,b}=m,{nx,ny,mx,my,angle:rawAngle,textSize,length}=v,angle=globalThis.FurnishDrawing?FurnishDrawing.textAngle(rawAngle,drawingRotation()):rawAngle;return `<g data-saved-measure="true"><path d="M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-nx} ${a.y-ny}L${a.x+nx} ${a.y+ny}M${b.x-nx} ${b.y-ny}L${b.x+nx} ${b.y+ny}" fill="none" stroke="#ef5a24" stroke-width="1.5" vector-effect="non-scaling-stroke"/><text x="${mx}" y="${my-textSize*.5}" font-size="${textSize}" text-anchor="middle" fill="#ef5a24" transform="rotate(${angle} ${mx} ${my})" stroke="${palette.halo}" stroke-width="45" paint-order="stroke">${Math.round(length)} mm</text></g>`;}).join(''):'';
  if(light){
    for(const layer of ['gRooms','gWalls','gOpen','gLabels','gDims'])for(const e of s.querySelectorAll('#'+layer+' *'))for(const attr of ['fill','stroke']){const key=Object.keys(PAL).find(k=>PAL[k]===e.getAttribute(attr));if(key)e.setAttribute(attr,PAL_LIGHT[key]);}
    for(const e of s.querySelectorAll('#gFurn [stroke]'))if(e.getAttribute('stroke')===PAL.ink)e.setAttribute('stroke',PAL_LIGHT.ink);
    for(const e of s.querySelectorAll('#gFurn text'))if(e.getAttribute('fill')===PAL.text)e.setAttribute('fill',PAL_LIGHT.text);
    for(const e of s.querySelectorAll('#gWalls [data-wall]'))if(WALLS[Number(e.getAttribute('data-wall').slice(1))]?.[4]==='b'&&e.getAttribute('fill')==='#c8553c')e.setAttribute('fill',PAL_LIGHT.wallB);
  }
  if(globalThis.FurnishDrawing&&s.querySelector('#gDims'))s.querySelector('#gDims').innerHTML=drawingDimensionsSVG(FurnishDrawing.dimensions(FurnishProject.effectivePlan(PLAN,state),state.drawing),palette.dim,drawingRotation());
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;width:1200px;height:650px;visibility:hidden;pointer-events:none';host.append(s);document.body.append(host);let b;
  try{const box=s.getBBox();b=D.deliveryBounds(globalThis.FurnishDrawing?displayBounds():BOUNDS,[[box.x,box.y,box.x+box.width,box.y+box.height]]);}finally{host.remove();}
  s.setAttribute('viewBox',`${b.x} ${b.y} ${b.w} ${b.h}`);s.setAttribute('width','1200');s.setAttribute('height',String(Math.ceil(1200*b.h/b.w)));
  window.FurnishDrawingUI?.prepareExport(s,b,palette.dim);
  const bg=document.createElementNS(svg.namespaceURI,'rect');for(const [name,value] of Object.entries({x:b.x,y:b.y,width:b.w,height:b.h,fill:light?'#fffaf4':PAL.paper}))bg.setAttribute(name,value);s.insertBefore(bg,s.firstChild);
  if(visibleLayers&&ui.layers.grid){const grid=bg.cloneNode(true);grid.setAttribute('fill','url(#grid)');bg.after(grid);}
  return {svg:s,bounds:b};
}
function exportPNG(){
  if (is3D()) return window.View3D.shot();
  const {svg:clone,bounds:b}=preparePlanSVG(),{width:W,height:H}=FurnishDrawing.rasterSize(b);
  clone.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0, W, H);
    cv.toBlob(b => download(tr('户型装修方案', 'floor-plan-design') + '.png', b));
  };
  img.onerror=()=>toast(tr('图片导出失败，请重试或导出成果 SVG','Image export failed; retry or export the report SVG'));
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
