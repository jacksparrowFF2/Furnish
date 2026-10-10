/* Convert verified orthogonal filled wall outlines to rectangular centerline bands.
 * Dimensions come from geometry, not a uniform thickness guess. No DOM or I/O. */
(function(root){
 'use strict';
 const fail=m=>{throw Error(m);},EPS=.001,round=v=>Math.round(v*1e6)/1e6;
 const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS;
 const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const area=poly=>Math.abs(poly.reduce((n,a,i)=>{const b=poly[(i+1)%poly.length];return n+a[0]*b[1]-b[0]*a[1];},0))/2;
 const overlap=(a,b)=>Math.min(a[2],b[2])-Math.max(a[0],b[0])>EPS&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>EPS;
 function path(r,factor,stats){
  if(r.issue&&r.issue!=='Diagonal walls are unsupported')fail('Outline '+r.layer+' #'+r.id+': '+r.issue);
  const points=[r.segments[0]?.a,...r.segments.map(s=>s.b)].map(p=>p?.map(v=>round(v*factor)));
  if(points.some(p=>!p||!p.every(Number.isFinite)))fail('Invalid outline coordinates');
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]);
   if(Math.min(dx,dy)>EPS){
    if(Math.min(dx,dy)>2||Math.atan2(Math.min(dx,dy),Math.max(dx,dy))*180/Math.PI>.5)fail('Outline contains a diagonal exceeding 2 mm / 0.5 degrees');
    const axis=dx>dy?1:0,old=[a[axis],b[axis]],center=round((old[0]+old[1])/2);
    for(const p of points)if(old.some(v=>Math.abs(p[axis]-v)<EPS))p[axis]=center;
    stats.aligned++;stats.maxShift=Math.max(stats.maxShift,Math.abs(old[0]-old[1])/2);
   }
  }
  return points;
 }
 function cycles(points){
  const stack=[],polys=[];
  for(const p of points){const index=stack.findIndex(q=>same(p,q));if(index>=0){const poly=stack.slice(index);if(poly.length>=4&&area(poly)>EPS)polys.push(poly);stack.splice(index+1);}else stack.push(p);}
  return {polys,leftover:stack};
 }
 // Exact coordinate-grid cover by rectangles wholly inside the polygon.
 // Rectangles may overlap at corners; their union equals the source region.
 function bands(poly){
  const xs=[...new Set(poly.map(p=>p[0]))].sort((a,b)=>a-b),ys=[...new Set(poly.map(p=>p[1]))].sort((a,b)=>a-b),nx=xs.length-1,ny=ys.length-1;
  if(nx*ny>1600)fail('Outline too complex: split the polygon into smaller wall profiles');
  const cells=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(inside([(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2],poly))cells.push({x,y,area:(xs[x+1]-xs[x])*(ys[y+1]-ys[y])});
  const filled=new Set(cells.map(c=>c.y*nx+c.x)),cellAreas=new Map(cells.map(c=>[c.y*nx+c.x,c.area])),candidates=[];let attempts=0;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   if(!filled.has(y*nx+x))continue;
   for(let highY=y+1;highY<=ny;highY++)for(let highX=x+1;highX<=nx;highX++){
    if(++attempts>100000)fail('Outline rectangle search limit exceeded; split complex wall profiles');
    const w=xs[highX]-xs[x],h=ys[highY]-ys[y],thin=Math.min(w,h),long=Math.max(w,h);
    if(thin<60-EPS||thin>600+EPS||long<100-EPS)continue;
    let good=true;const own=[];
    for(let yy=y;yy<highY&&good;yy++)for(let xx=x;xx<highX;xx++){if(!filled.has(yy*nx+xx)){good=false;break;}own.push(yy*nx+xx);}
    if(good)candidates.push({rect:[xs[x],ys[y],xs[highX],ys[highY]],own,area:w*h});
   }
  }
  const left=new Set(filled),result=[];
  while(left.size){let best=null,score=0;for(const c of candidates){const added=c.own.reduce((n,k)=>n+(left.has(k)?cellAreas.get(k):0),0);if(added>score+EPS||Math.abs(added-score)<EPS&&best&&c.area>best.area){score=added;best=c;}}
   if(!best||score<=EPS)fail('Wall profile contains an unsupported thin/sliver region; inspect the source outline');
   result.push(best.rect);for(const k of best.own)left.delete(k);
  }
  return result;
 }
 function convert(parsed,{layers,mmPerUnit=parsed.mmPerUnit,layerKinds,name,id,windowLayers,serviceLayers,beamLayers,closeDoorGaps=true,windowSill=900,windowHead=2400}={}){
  if(!Number.isFinite(mmPerUnit)||mmPerUnit<=0)fail('Choose the drawing units');
  if(!Array.isArray(layers)||!layers.length)fail('Select wall outline layers');
  if(layers.some(l=>!['n','b','e'].includes(layerKinds?.[l])))fail('Assign a wall type to each selected layer');
  if(parsed.inventory?.some(l=>layers.includes(l.name)&&l.unsupportedGeometry))fail('Wall outline layers contain unsupported geometry; separate blocks, arcs and fills from wall profiles');
  const DXF=root.FurnishDXF;
  if(!DXF)fail('DXF parser must be loaded before outline conversion');
  beamLayers=beamLayers||parsed.layers.filter(l=>DXF.layerRole(l.name).role==='beam').map(l=>l.name);
  if(beamLayers.some(l=>layers.includes(l)||windowLayers?.includes(l)))fail('Beam layers must be separate from walls and windows');
  if(parsed.inventory?.some(l=>beamLayers.includes(l.name)&&l.unsupportedGeometry))fail('Beam layers contain unsupported geometry');
  windowLayers=windowLayers||parsed.layers.filter(l=>DXF.layerRole(l.name).role==='window').map(l=>l.name);
  serviceLayers=serviceLayers||parsed.inventory?.filter(l=>['drain','gas'].includes(DXF.layerRole(l.name).role)).map(l=>l.name)||[];
  const stats={polygons:0,aligned:0,maxShift:0,boundaryLines:0,windows:0,doors:0},profiles=[],boundary=[];
  const beamProfiles=[];
  for(const r of parsed.records.filter(r=>beamLayers.includes(r.layer))){
   const found=cycles(path(r,mmPerUnit,stats));
   if(!found.polys.length||found.leftover.length>1)fail('Beam #'+r.id+' must be a closed outline');
   for(const poly of found.polys)beamProfiles.push({poly,source:r});
  }
  stats.beams=beamProfiles.length;
  for(const r of parsed.records.filter(r=>layers.includes(r.layer))){
   const points=path(r,mmPerUnit,stats),found=cycles(points);
   if(found.polys.length){for(const poly of found.polys){profiles.push({poly,source:r,kind:layerKinds[r.layer]});stats.polygons++;}if(found.leftover.length>1)boundary.push({points:found.leftover,source:r});}
   else boundary.push({points,source:r});
  }
  if(!profiles.length)fail('No closed wall profiles found; use centerline mode for LINE drawings');
  const rectangles=[];
  for(const p of profiles)for(const rect of bands(p.poly)){
   if(rectangles.some(v=>v.kind!==p.kind&&overlap(v.rect,rect)))fail('Conflicting wall types on overlapping filled profiles');
   const duplicate=rectangles.find(v=>v.kind===p.kind&&v.rect.every((x,i)=>Math.abs(x-rect[i])<EPS));
   if(!duplicate)rectangles.push({rect,kind:p.kind,source:p.source});
  }
  const windows=[];
  for(const r of parsed.records.filter(r=>windowLayers.includes(r.layer))){
   const points=path(r,mmPerUnit,stats),found=cycles(points);
   if(found.polys.length!==1)fail('Window #'+r.id+' must be a closed rectangular outline');
   const poly=found.polys[0],xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),rect=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],w=rect[2]-rect[0],h=rect[3]-rect[1];
   if(Math.abs(area(poly)-w*h)>EPS||Math.min(w,h)<60||Math.min(w,h)>600||Math.max(w,h)<300||Math.max(w,h)>6000)fail('Window #'+r.id+' is not a supported rectangular opening');
   if(rectangles.some(v=>overlap(rect,v.rect)))fail('Window #'+r.id+' overlaps a filled wall profile');
   const axis=w>=h?0:1,normal=1-axis,touch=end=>rectangles.filter(v=>{const q=v.rect,edge=end?rect[axis+2]:rect[axis];return Math.abs((end?q[axis]:q[axis+2])-edge)<2&&Math.min(rect[normal+2],q[normal+2])-Math.max(rect[normal],q[normal])>Math.min(w,h)*.5;});
   const neighbors=[...touch(false),...touch(true)];
   if(!touch(false).length||!touch(true).length)fail('Window #'+r.id+' has no wall at both ends; review its placement');
   const kinds=new Set(neighbors.map(n=>n.kind)),kind=kinds.has('b')?'b':kinds.has('e')?'e':'n';
   const host={rect,kind,source:r,opening:{kind:'window',sill:windowSill,head:windowHead,review:'window-height'}};rectangles.push(host);windows.push(host);stats.windows++;
  }
  // Loose lines are accepted only when they retrace an existing profile boundary.
  // Their geometry remains in sourceGeometry; an unaccounted line blocks import.
  for(const b of boundary)for(let i=1;i<b.points.length;i++){
   const a=b.points[i-1],z=b.points[i],axis=Math.abs(a[0]-z[0])>Math.abs(a[1]-z[1])?0:1,normal=1-axis;
   if(same(a,z))continue;
   const covered=rectangles.filter(v=>Math.abs(a[normal]-v.rect[normal])<2||Math.abs(a[normal]-v.rect[normal+2])<2).map(v=>[v.rect[axis],v.rect[axis+2]]).sort((p,q)=>p[0]-q[0]);
   let end=Math.min(a[axis],z[axis]);for(const q of covered)if(q[0]<=end+2&&q[1]>end)end=q[1];
   if(end<Math.max(a[axis],z[axis])-2)fail('Unresolved loose outline edge in layer '+b.source.layer+' #'+b.source.id);
   stats.boundaryLines++;
  }
  // Collinear facing bands delimit a door-sized void. Keep it as a reviewed
  // opening, never as a solid wall. Wide passageways are deliberately untouched.
  if(closeDoorGaps){
   const candidates=[];
   for(const a of rectangles.filter(v=>!v.opening))for(const b of rectangles.filter(v=>!v.opening))for(const axis of [0,1]){
    const normal=1-axis,gap=b.rect[axis]-a.rect[axis+2],lo=Math.max(a.rect[normal],b.rect[normal]),hi=Math.min(a.rect[normal+2],b.rect[normal+2]);
    if(gap<600||gap>1400||hi-lo<60||hi-lo>600||Math.abs(a.rect[normal]-b.rect[normal])>2||Math.abs(a.rect[normal+2]-b.rect[normal+2])>2)continue;
    const rect=[];rect[axis]=a.rect[axis+2];rect[axis+2]=b.rect[axis];rect[normal]=lo;rect[normal+2]=hi;
    if(rectangles.some(v=>overlap(rect,v.rect)))continue;
    if(!candidates.some(v=>v.rect.every((x,i)=>Math.abs(x-rect[i])<EPS)))candidates.push({rect,kind:a.kind===b.kind?a.kind:'n',source:a.source,opening:{kind:'door',review:'door-gap'}});
   }
   for(const c of candidates){if(rectangles.some(v=>overlap(v.rect,c.rect)))fail('Ambiguous door-gap candidates; turn off door gap detection');rectangles.push(c);stats.doors++;}
  }
  if(rectangles.length>100)fail('Converted wall profiles exceed 100 centerline bands');
  const xs=[...rectangles.flatMap(v=>[v.rect[0],v.rect[2]]),...beamProfiles.flatMap(v=>v.poly.map(p=>p[0]))],ys=[...rectangles.flatMap(v=>[v.rect[1],v.rect[3]]),...beamProfiles.flatMap(v=>v.poly.map(p=>p[1]))],x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys),pad=600,extent=Math.max(x1-x0,y1-y0);
  if(extent>95000)fail('Maximum plan size is 95 m');
  const scale=(extent+pad*2)/1600,point=p=>[(p[0]-x0+pad)/scale,(y1-p[1]+pad)/scale];
  const walls=[],openings=[];
  for(const v of rectangles){const r=v.rect,w=r[2]-r[0],h=r[3]-r[1],horizontal=w>=h,a=horizontal?[r[0],(r[1]+r[3])/2]:[(r[0]+r[2])/2,r[1]],b=horizontal?[r[2],a[1]]:[a[0],r[3]],wallId='outline_'+walls.length;
   walls.push({id:wallId,a:point(a),b:point(b),thickness:horizontal?h:w,kind:v.kind,caps:[0,0],group:'dxf_entity_'+v.source.id,sourceLayer:v.source.layer,sourceEntity:v.source.handle||String(v.source.id)});
   if(v.opening)openings.push({id:'cad_'+v.opening.kind+'_'+v.source.id+'_'+openings.length,wall:wallId,t:.5,length:Math.max(w,h),side:1,entry:false,...v.opening,sourceLayer:v.source.layer,sourceEntity:v.source.handle||String(v.source.id)});
  }
  const markers=(parsed.references||[]).filter(r=>serviceLayers.includes(r.layer)).map(r=>{if(r.z!==0||r.radius<=0)fail('Service point must be a planar circle');return {id:r.id,kind:DXF.layerRole(r.layer).role,name:r.layer,at:point(r.at.map(v=>v*mmPerUnit)),radius:r.radius*mmPerUnit,sourceLayer:r.layer};});
  const draft={version:1,id,name,source:'dxf',image:'',scale,width:(x1-x0+pad*2)/scale,height:(y1-y0+pad*2)/scale,walls,openings,markers,sourceUnits:mmPerUnit,sourceLayers:[...layers,...windowLayers,...serviceLayers],sourceTransform:{x0,y1,pad,scale},sourceGeometry:profiles.map(p=>({layer:p.source.layer,entity:p.source.handle||String(p.source.id),poly:p.poly})),importReport:{mode:'outlines',stats,needsReview:['wall-types','window-heights',...(stats.doors?['door-gaps']:[])]}};
  draft.beams=beamProfiles.map((v,i)=>({id:'cad_beam_'+i,name:v.source.layer,poly:v.poly.map(point),sourceLayer:v.source.layer,sourceEntity:v.source.handle||String(v.source.id),review:'beam-height'}));
  draft.sourceLayers.push(...beamLayers);if(draft.beams.length)draft.importReport.needsReview.push('beam-heights');
  const Core=root.FurnishDraft||(typeof require==='function'?require('../core/floorplan-core.js'):null);
  if(Core&&stats.doors){
   const rooms=Core.roomsFromWalls(rectangles.map(v=>[...v.rect,v.kind])),entries=[];
   for(const o of openings.filter(o=>o.kind==='door')){const w=walls.find(w=>w.id===o.wall),normal=w.a[1]===w.b[1]?1:0,c=w.a.map((v,i)=>(v+w.b[i])/2),source=[c[0]*scale+x0-pad,y1+pad-c[1]*scale],probe=sign=>{const p=[...source];p[normal]+=sign*(w.thickness/2+50);return rooms.some(r=>inside(p,r.poly));};if(probe(1)!==probe(-1))entries.push(o);}
   if(entries.length===1){entries[0].entry=true;entries[0].name='入户门（断口推导）';}
   stats.entryCandidates=entries.length;
  }
  return {draft,rectangles,stats};
 }
 root.FurnishDXFOutline={convert,bands};if(typeof module!=='undefined')module.exports=root.FurnishDXFOutline;
})(typeof window==='undefined'?globalThis:window);
