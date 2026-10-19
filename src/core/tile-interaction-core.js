/* The same local millimetre gesture rules serve SVG and production 3D views. */
(function(root){
'use strict';
const dep=(name,file)=>root[name]||require(file),copy=v=>JSON.parse(JSON.stringify(v));
function context(plan,work,target,bandId=''){
 const F=dep('FurnishFloorFinish','./floor-finish-core.js'),T=dep('FurnishWallTiling','./wall-tiling-core.js'),floor=dep('FurnishFloorOriginPreview','../render/floor-origin-preview.js');
 if(target.kind==='floor'){
  const area=plan.floorFinish?.areas[target.roomId];if(!area?.layout||!Number.isFinite(area.finishedZ))throw Error('请先启用地砖并确定完成标高，再调整砖缝基准');
  return {kind:'floor',target,room:area.room,layout:copy(area.layout),z:area.finishedZ,anchor:floor.anchor(area.room,area.layout)};
 }
 const saved=T.record(work,target.face);if(!saved||saved.enabled===false)throw Error('请先启用此墙排版，再调整砖缝基准');
 const face=T.faces(plan,work).find(f=>T.same(f,target.face));if(!face)throw Error('所选墙面已变化，请重新选择');
 const full=target.members?dep('FurnishTileEditor','./tile-editor-core.js').elevation(work,plan,target):T.elevation(plan,work,face),e=full.bands?T.patterns(full).find(p=>p.band?.id===bandId):full;
 if(!e)throw Error('此墙上下分带，请选择需要调整的带');
 if(![e.position,e.floorZ,e.originZ].every(Number.isFinite)||!e.sections.length)throw Error('墙面位置、完成地面或对缝条件待确定，不能调整起铺');
 const wall=dep('FurnishWallOriginPreview','../render/wall-origin-preview.js'),room=wall.space(e.sections),layout={...T.grid(e),origin:[e.layout.offset,e.originZ]};
 return {kind:'wall',target,room,e,layout,anchor:floor.anchor(room,layout),bands:saved.bands&&copy(saved.bands),bandId};
}
function snap(context,point,project,tolerance=12){
 const F=dep('FurnishFloorOriginPreview','../render/floor-origin-preview.js'),rings=context.room.rings||[context.room.poly],edges=rings.flatMap(r=>r.map((a,i)=>[a,r[(i+1)%r.length]]));
 return F.snapHandle(context.room,point,project,tolerance,edges);
}
function patch(context,point,relative=false){
 const c=context,delta=relative?point:null;let values;
 if(c.kind==='floor')return {originX:Number((relative?c.layout.origin[0]+delta[0]:point[0]).toFixed(3)),originY:Number((relative?c.layout.origin[1]+delta[1]:point[1]).toFixed(3))};
 const e=c.e,base=e.layout.reference==='floor'?e.floorZ:0;
 values={...(e.followFloor?{}:{offset:Number((relative?e.layout.offset+delta[0]:point[0]).toFixed(3))}),startHeight:Number((relative?e.layout.startHeight+delta[1]:point[1]-base).toFixed(3))};
 if(!c.bands)return values;const bands=copy(c.bands),row=bands.rows.find(r=>r.id===c.bandId);Object.assign(row.layout,values);return {bands};
}
function world(context,point){const e=context.e;if(context.kind==='floor')return [point[0],context.z,point[1]];const p=[0,point[1],0];p[e.axis===0?0:2]=e.zero+e.dir*point[0];p[e.normal===0?0:2]=e.position+e.face.side*.3;return p;}
function local(context,world){if(context.kind==='floor')return [world[0],world[2]];const e=context.e;return [(world[e.axis===0?0:2]-e.zero)*e.dir,world[1]];}
const api={context,snap,patch,world,local};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTileInteraction=api;
})(typeof globalThis!=='undefined'?globalThis:this);
