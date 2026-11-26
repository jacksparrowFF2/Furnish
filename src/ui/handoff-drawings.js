/* Printable drawing set derived from a single effective project snapshot. */
(function(){
'use strict';
const P=FurnishProject,D=FurnishDraft,G=FurnishGeometry,F=FurnishFloorFinish,W=FurnishWallFinish,
 T=FurnishWallTiling,C=FurnishCeiling,Z=FurnishZoneGeometry;
const rect=([x,y,X,Y])=>[[x,y],[X,y],[X,Y],[x,Y]];
const mm=value=>Number.isFinite(value)?String(Math.round(value*10)/10):'待核对';
const outline=(poly,color='#222',fill='none')=>`<polygon points="${poly.map(([x,y])=>mm(x)+','+mm(y)).join(' ')}" fill="${fill}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;
const line=(a,b,color='#333')=>`<line x1="${mm(a[0])}" y1="${mm(a[1])}" x2="${mm(b[0])}" y2="${mm(b[1])}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;
const text=(p,value)=>`<text class="diagram-label" x="${mm(p[0])}" y="${mm(p[1])}" text-anchor="middle">${esc(value)}</text>`;
const table=(columns,rows)=>rows.length?`<table><thead><tr>${columns.map(value=>'<th>'+esc(value)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(String(value??'待核对'))+'</td>').join('')+'</tr>').join('')}</tbody></table>`:'<p>当前方案无此项记录。</p>';
function diagram(box,content){
 const [x,y,X,Y]=box,pad=Math.max(100,Math.max(X-x,Y-y)*.035);
 const labelSize=Math.max(X-x,Y-y)/48;
 return `<svg xmlns="http://www.w3.org/2000/svg" style="--diagram-label:${labelSize}px" viewBox="${[x-pad,y-pad,X-x+pad*2,Y-y+pad*2].join(' ')}">${content}</svg>`;
}
function planPaper(plan,work,extra,{rooms=true,dimensions=false}={}){
 const stage=(plan.walls||[]).map(wall=>outline(rect(wall),'#374151','#cbd5e1')).join(''),
  openings=[...(plan.doors||[]),...(plan.slides||[]),...(plan.wins||[])].map(item=>outline(rect(item.rect),'#475569')).join(''),
  labels=rooms?plan.rooms.filter(room=>room.at).map(room=>text(room.at,room.name)).join(''):'',
  drawing=FurnishDrawing.drawingBounds(plan,work.drawing);
 const dims=dimensions?FurnishDrawing.dimensions(plan,work.drawing).map(item=>
  line(item.a,item.b)+item.refs.map((ref,i)=>line(ref,[item.a,item.b][i])).join('')+
  text([(item.a[0]+item.b[0])/2,(item.a[1]+item.b[1])/2-35],mm(item.value))).join(''):'';
 return diagram([drawing.x,drawing.y,drawing.x+drawing.w,drawing.y+drawing.h],stage+openings+extra+labels+dims);
}
function ceilingSpans(plan){
 const spans=[];
 for(const item of plan.ceilings?.items||[]){
  if(item.kind==='flat'){spans.push({item,poly:item.polygon,bottom:item.height,top:item.height+item.thickness});continue;}
  for(const band of C.profileBands(item))for(const leg of band.legs)spans.push({item,poly:leg.poly,bottom:band.bottom,top:band.top});
 }
 return spans;
}
function flooring(plan,work){
 const drawn=[],rows=[],groups=new Set(),joints=plan.floorFinish?.joints||[];
 const takeoff=FurnishTileTakeoff;
 for(const surface of F.surfaces(plan)){
  if(!surface.layout)continue;
  const id=surface.roomId||surface.id;
  if(groups.has(id))continue;
  const ids=surface.roomId?[id]:takeoff.floorGroup(plan,id),merged=ids.length>1,
   {room,layout}=merged?takeoff.floorRegion(plan,ids):surface;
  if(merged)ids.forEach(value=>groups.add(value));
  for(const cell of F.cells(room,layout))for(const poly of cell.polys)drawn.push(outline(poly,'#9a7855','#f7eee4'));
 }
 for(const joint of joints){
  if(joint.active==='threshold')for(const poly of joint.thresholdRings)drawn.push(outline(poly,'#92400e','#fbbf24'));
  if(joint.active==='strip')for(const [a,b] of joint.seams)drawn.push(line(a,b,'#92400e'));
 }
 for(const room of plan.rooms.filter(room=>room.counted!==false)){
  const area=plan.floorFinish?.areas?.[room.id],layout=area?.layout,material=MATS[work.rooms[room.id]?.mat||room.mat];
  rows.push([room.name,nm(material?.name||'待选'),mm(area?.finishedZ),layout?`${layout.width} × ${layout.height}；缝 ${layout.gap}`:'未指定排版',layout?.origin.map(mm).join(' / ')]);
 }
 return planPaper(plan,work,drawn.join(''))+table(['区域','地材','完成标高','砖规格／缝宽','起铺点 x/y'],rows)+
  table(['门洞','衔接','复核项'],joints.filter(joint=>joint.mode!=='default').map(joint=>[joint.name,F.doorJointLabels[joint.mode]||joint.mode,joint.pending||'依现场复尺']));
}
function elevations(plan,work,rooms){
 const out=[];
 for(const face of W.faces(plan).filter(face=>rooms.has(face.roomId)&&!face.cross)){
  const room=plan.rooms.find(r=>r.id===face.roomId)||plan.physicalRooms?.find(r=>r.id===face.roomId);
  const view=T.elevation(plan,work,face),saved=plan.wallTiling?.surfaces.find(surface=>T.same(surface.face,face));
  const points=poly=>poly.map(([x,z])=>[x,-z]),base=view.sections.map(([a,b,c,d])=>outline(points(rect([a,b,c,d])),'#475569','#f8fafc')).join('');
  const tile=saved?T.cells(saved).flatMap(cell=>cell.polys.map(poly=>outline(points(poly),'#9a7855'))).join(''):'';
  out.push(`<article><h3>${esc(room?.name||face.roomId)} · ${esc(face.wallId)} · ${esc(T.faceTitle(face))}</h3>`+
   diagram([0,-view.height,view.width,0],base+tile)+
   `<p>墙面范围 ${mm(view.width)} mm · 原顶标高 ${mm(view.height)} mm · 完成地面 ${mm(view.floorZ)} mm</p>`+
   (saved?table(['排版','砖宽×高','缝宽','起铺标高','待复核'],T.patterns(saved).map(pattern=>[pattern.band?.name||'整面',`${pattern.layout.width} × ${pattern.layout.height}`,pattern.layout.gap,mm(pattern.originZ),pattern.pending.join('；')||'—'])):'')+'</article>');
 }
 return out.join('')||'<p>未找到可派生的墙侧立面。</p>';
}
function intervals(poly,axis,at){
 const other=1-axis,coords=[];
 for(const [i,a] of poly.entries()){
  const b=poly[(i+1)%poly.length];if((a[axis]<=at)===(b[axis]<=at))continue;
  coords.push(a[other]+(b[other]-a[other])*(at-a[axis])/(b[axis]-a[axis]));
 }
 coords.sort((a,b)=>a-b);
 const rows=[];
 for(let i=0;i+1<coords.length;i+=2)if(coords[i+1]>coords[i])rows.push([coords[i],coords[i+1]]);
 return rows;
}
function verticalCuts(plan,work,rooms,spans){
 const out=[],cutLines=[];
 for(const room of W.spatial(plan).rooms.filter(room=>rooms.has(room.id)&&room.at)){
  const [left,top,right,bottom]=G.bbox(room.poly),axis=right-left>bottom-top?1:0,at=room.at[axis],
   cut=intervals(room.poly,axis,at),level=plan.floorFinish?.areas?.[room.id]?.finishedZ,roof=room.ceilingHeight??plan.ceilingHeight;
  if(!cut.length)continue;
  const ground=Number.isFinite(level)?level:0,drawn=[],rows=[['完成地面',mm(level)],['原顶',mm(roof)]];
  for(const [a,b] of cut){
   cutLines.push(line(axis===0?[at,a]:[a,at],axis===0?[at,b]:[b,at],'#b91c1c'));
   drawn.push(outline(rect([a,-roof,b,-ground]),'#475569'));
  }
  const add=(poly,name,low,high,color)=>{
   for(const [a,b] of intervals(poly,axis,at))for(const [lo,hi] of cut){
    const x=Math.max(a,lo),X=Math.min(b,hi);if(X<=x)continue;
    rows.push([name,`${mm(low)} / ${mm(high)}`]);
    if(Number.isFinite(low)&&Number.isFinite(high))drawn.push(outline(rect([x,-high,X,-low]),color));
   }
  };
  for(const beam of plan.beams||[]){
   const range=D.beamVertical(beam,P.ceilingHeight(work));
   add(beam.poly,beam.name||beam.id,range?.assumed?undefined:range?.bottom,range?.assumed?undefined:range?.top,'#7e22ce');
  }
  for(const {poly,item,bottom,top} of spans)add(poly,item.name||item.id,bottom,top,'#a16207');
  out.push(`<article><h3>${esc(room.name)} · ${axis===0?'X':'Y'} = ${mm(at)} mm</h3>`+
   diagram([cut[0][0],-roof,cut.at(-1)[1],-Math.min(0,ground)],drawn.join(''))+table(['对象','标高／底顶标高 mm'],rows)+'</article>');
 }
 return out.length?planPaper(plan,work,cutLines.join(''))+out.join(''):'<p>未找到可派生的室内剖切线。</p>';
}
function cabinets(plan,work,ids){
 return work.furniture.filter(item=>ids.has(item.id)).map(item=>{
  const angle=(item.rot||0)*Math.PI/180,localX=([x,y])=>(x-item.cx)*Math.cos(angle)+(y-item.cy)*Math.sin(angle);
  const parts=G.bodyParts(item,plan,work.furniture).filter(part=>part.vertical&&part.p?.length);
  const rows=[],shapes=[];
  for(const [index,part] of parts.entries()){
   const xs=part.p.map(localX),x=Math.min(...xs),X=Math.max(...xs),{bottom,top}=part.vertical;
   rows.push([part.boardKey||index+1,part.boardName||'模型实体',mm(x),mm(X),mm(bottom),mm(top)]);
   shapes.push(outline(rect([x,-top,X,-bottom]),'#64748b'));
  }
  const low=parts.length?Math.min(...parts.map(part=>part.vertical.bottom)):0,
   high=parts.length?Math.max(...parts.map(part=>part.vertical.top)):item.h||100;
  return `<article><h3>${esc(item.name)} · ${esc(item.id)}</h3><p>模型外尺寸 ${mm(item.w)} × ${mm(item.d)} × ${mm(item.h)} mm。横向尺寸从柜体中心起算；竖向为模型绝对标高。</p>`+
   diagram([-item.w/2,-high,item.w/2,-low],shapes.join(''))+
   table(['组件 ID','实体','左','右','底','顶'],rows)+'</article>';
 }).join('')||'<p>当前范围没有需要出尺寸的柜体。</p>';
}
function section(title,body){return `<section><h2>${title}</h2>${body}</section>`;}
function placement(plan,work){
 const rows=[],polys=[];
 for(const [index,item] of work.furniture.entries()){
  const at=[item.cx,item.cy],vertical=FurnishDesign.furnitureVerticalBounds(item,plan,work.furniture);
  for(const poly of G.footprints(item,{plan,furniture:work.furniture}))polys.push(outline(poly,'#64748b','#e2e8f0'));
  polys.push(text(at,String(index+1)));
  rows.push([index+1,item.name,item.id,at.map(mm).join(' / '),mm(item.rot),[item.w,item.d,item.h].map(mm).join(' × '),mm(vertical?.bottom)]);
 }
 return planPaper(plan,work,polys.join(''))+table(['编号','名称','对象 ID','中心 x/y','旋转 °','宽 × 深 × 高','底标高'],rows);
}
function drawingSet({plan,work,title,revision,roomIds,cabinetIds,project}){
 const allowedRooms=new Set([...plan.rooms,...(plan.physicalRooms||[])].filter(room=>room.counted!==false).map(room=>room.id));
 const allowedCabinets=new Set(work.furniture.filter(item=>item.cabinet||item.kitchen||FurnishCabinet.supported(item)).map(item=>item.id));
 const rooms=new Set(roomIds||allowedRooms),ids=new Set(cabinetIds||allowedCabinets);
 if([...rooms].some(id=>!allowedRooms.has(id))||[...ids].some(id=>!allowedCabinets.has(id)))throw Error('交底图册包含不存在的区域或柜体 ID');
 const spans=ceilingSpans(plan),architecture=work.architecture,design=architecture?.draft,baseline=architecture?.baseline;
 let changes='';
 if(baseline){
  const diff=P.changes(baseline,design),paths=(walls,draft,color,fill)=>walls.map(wall=>outline(rect(D.wallRect(wall,draft.scale,draft.walls)),color,fill)).join('');
  changes='<p>红色为拆除或改动前范围，蓝色为新增或改动后范围。</p>'+
   planPaper(plan,work,paths(diff.removed,baseline,'#991b1b','#fecaca')+paths(diff.added,design,'#1e40af','#bfdbfe'),{dimensions:true})+
   table(['动作','墙号','墙厚 mm'],[...diff.removed.map(wall=>['拆除／改前',wall.id,wall.thickness]),...diff.added.map(wall=>['新增／改后',wall.id,wall.thickness])]);
 }else changes='<p>当前方案没有已确认的自定义原始结构基线。图中为当前结构与尺寸，拆改清单待核对。</p>'+planPaper(plan,work,'',{dimensions:true});
 const ceiling=planPaper(plan,work,spans.map(({poly})=>outline(poly,'#a16207','#fef3c7')).join(''))+
  table(['吊顶构件','底标高 mm','顶标高 mm'],spans.map(({item,bottom,top})=>[item.name||item.id,mm(bottom),mm(top)]));
 const schedule=FurnishMaterialSchedule.report(plan,work);
 const material=table(['表面','商品','规格号','净面积 m²','复核状态','来源'],schedule.items.map(row=>[
  row.target.id,row.product.name,row.product.sku,row.area?.toFixed(2),({estimated:'按面积估算','surface-missing':'表面绑定已变化',
   'appearance-changed':'搭配变更，需复核商品','needs-measurement':'工程量待复核'})[row.status],row.product.sourceUrl]))+
  table(['合并采购规格','净面积 m²','含损耗 m²','参考片数','参考箱数'],schedule.totals.map(row=>[row.sku,row.area.toFixed(2),row.estimate.required.toFixed(2),row.estimate.pieces,row.estimate.packs]));
 const issues=P.readiness(plan,work).items.filter(item=>!item.ignored);
 const survey=FurnishProjectIntake.readEvidence(work);
 const evidence=survey?table(['现场对象','字段','量房记录 mm','基准','来源','状态'],survey.measurements.map(row=>[
  row.target,row.field,row.value,row.datum,survey.sources.find(item=>item.id===row.sourceId)?.file,({verified:'已核对',estimated:'估算',pending:'待复尺'})[row.status]])):'<p>本项目尚无量房证据附件。</p>';
 const nodes=table(['位置','处理事项','已知依据'],[
  ...(plan.floorFinish?.joints||[]).filter(joint=>joint.mode!=='default').map(joint=>[joint.name,F.doorJointLabels[joint.mode],joint.pending||'按铺装图与现场高差复核']),
  ...FurnishPresentation.data(work).issues.map(issue=>[issue.assignee||'待分配',issue.text,issue.basis||'待记录'])
 ]);
 const json=JSON.stringify(project).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${esc(title)}</title>
 <style>body{font:14px/1.45 system-ui,sans-serif;color:#172033;margin:24px auto;max-width:1040px;padding:0 18px}section{margin:28px 0}article{break-inside:avoid;margin:14px 0}h2{border-bottom:1px solid #94a3b8;padding-bottom:6px}svg{display:block;width:100%;max-height:65vh;background:#fff}.diagram-label{font-size:var(--diagram-label);fill:#172033;stroke:white;stroke-width:.18em;stroke-linejoin:round;paint-order:stroke}table{width:100%;border-collapse:collapse;overflow-wrap:anywhere}td,th{border:1px solid #cbd5e1;text-align:left;padding:5px;vertical-align:top}@media print{section+section{break-before:page}thead{display:table-header-group}svg{max-height:130mm}}</style>
 <main><h1>${esc(title)}</h1><p>版本 ${esc(revision)} · 导出 ${esc(new Date().toISOString())} · 标注单位 mm</p>
 <p>依据当前模型生成的施工交底草稿。以标注尺寸和现场复尺为准，施工方需确认构造、五金、收口和安装条件。</p>
 ${section('拆改与定位',changes)}${section('家具与设备定位',placement(plan,work))}${section('地面铺装',flooring(plan,work))}${section('吊顶与构件标高',ceiling)}
 ${section('墙面立面',elevations(plan,work,rooms))}${section('房间剖面',verticalCuts(plan,work,rooms,spans))}
 ${section('柜体板件尺寸',cabinets(plan,work,ids))}${section('收口与交底事项',nodes)}
 ${section('材料选型与采购参考',material)}${section('复尺与待确认',evidence+
 table(['对象','待确认事项'],issues.map(item=>[item.name,item.message])))}</main>
 <script type="application/json" id="furnish-project">${json}</script></html>`;
}
window.FurnishHandoff={drawingSet};
})();
