/* Editable layout exchange: millimetres, CAD +Y up, UTF-8 DXF 2007. */
(function(root){
'use strict';
function drawing(plan,work,{furniture=true,labels=true,measurements=true,dimensions=true}={}){
 const P=root.FurnishProject||require('../core/project-core.js'),pairs=[],put=(...a)=>pairs.push(...a.map(String)),number=v=>{if(!Number.isFinite(v))throw Error('图纸包含无效坐标');return Number(v.toFixed(6));},point=p=>[number(p[0]),number(-p[1])],text=s=>String(s).replace(/[\r\n\x00-\x1f]/g,' ').slice(0,200);
 const poly=(points,layer,closed=true)=>{put(0,'LWPOLYLINE',100,'AcDbEntity',8,layer,100,'AcDbPolyline',90,points.length,70,closed?1:0);for(const p of points){const [x,y]=point(p);put(10,x,20,y);}};
 const label=(at,value,layer='LABELS',angle=0)=>{const [x,y]=point(at);put(0,'TEXT',100,'AcDbEntity',8,layer,100,'AcDbText',10,x,20,y,30,0,40,120,1,text(value),50,angle);};
 put(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1021',9,'$INSUNITS',70,4,9,'$MEASUREMENT',70,1,0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LAYER',70,11);
 for(const [name,color] of [['FLOOR_TILES',30],['WALLS',7],['WALL_FINISHES',30],['OPENINGS',4],['ROOMS',8],['FURNITURE',3],['LABELS',7],['MEASURES',2],['NOTES',6],['DIMENSIONS',8],['NORTH',1]])put(0,'LAYER',100,'AcDbSymbolTableRecord',100,'AcDbLayerTableRecord',2,name,70,0,62,color,6,'CONTINUOUS');
 put(0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
 for(const w of plan.walls){const [x,y,X,Y]=w;poly([[x,y],[X,y],[X,Y],[x,Y]],'WALLS');}
 for(const s of plan.wallFinish?.solids||[])if(s.bottom===0)poly(s.poly||[[s.rect[0],s.rect[1]],[s.rect[2],s.rect[1]],[s.rect[2],s.rect[3]],[s.rect[0],s.rect[3]]],'WALL_FINISHES');
 for(const o of [...plan.doors||[],...plan.wins||[],...plan.slides||[]]){const [x,y,X,Y]=o.rect;poly([[x,y],[X,y],[X,Y],[x,Y]],'OPENINGS');}
 for(const r of (root.FurnishWallFinish||require('../core/wall-finish-core.js')).spatial(plan).rooms){for(const ring of r.rings||[r.poly])poly(ring,'ROOMS');if(labels){const at=r.poly.reduce((n,p)=>[n[0]+p[0]/r.poly.length,n[1]+p[1]/r.poly.length],[0,0]);label(at,work.rooms?.[r.id]?.name||r.name);}}
 for(const a of (root.FurnishFloorFinish||require('../core/floor-finish-core.js')).surfaces(plan)){if(a.layout)for(const cell of (root.FurnishFloorFinish||require('../core/floor-finish-core.js')).cells(a.room,a.layout))for(const p of cell.polys)poly(p,'FLOOR_TILES');if(labels&&!a.roomId&&a.room.at)label(a.room.at,a.finishedZ===undefined?'地面标高待核对':`完成地面 ${a.finishedZ} mm`,'FLOOR_TILES');}
 if(furniture)for(const f of work.furniture){poly(P.polygon(f),'FURNITURE');if(labels)label([f.cx,f.cy],f.name);}
 if(measurements)for(const m of work.measures||[]){const points=[[m.a.x,m.a.y],[m.b.x,m.b.y]];poly(points,'MEASURES',false);label(points[0],Math.round(Math.hypot(m.a.x-m.b.x,m.a.y-m.b.y))+' mm','MEASURES');}
 if(labels)for(const n of work.notes||[])label([n.x,n.y],n.text,'NOTES');
 const D=root.FurnishDrawing||require('../core/drawing-core.js');
 if(dimensions)for(const d of D.dimensions(plan,work.drawing)){poly([d.a,d.b],'DIMENSIONS',false);for(let i=0;i<2;i++){const p=[d.a,d.b][i];poly([d.refs[i],p],'DIMENSIONS',false);poly([[p[0]-65,p[1]+65],[p[0]+65,p[1]-65]],'DIMENSIONS',false);}label([(d.a[0]+d.b[0])/2-(!d.h?70:0),(d.a[1]+d.b[1])/2-(d.h?70:0)],Math.round(d.value)+' mm','DIMENSIONS',d.h?0:90);}
 const north=D.settings(work.drawing).northAngle;if(north!==null){const box=D.drawingBounds(plan,work.drawing),tail=[box.x+box.w-500,box.y+600],v=D.rotate([0,-350],north),tip=[tail[0]+v[0],tail[1]+v[1]];poly([tail,tip],'NORTH',false);poly([D.rotate([-65,-230],north),[0,-350],D.rotate([65,-230],north)].map((p,i)=>i===1?tip:[tail[0]+p[0],tail[1]+p[1]]),'NORTH',false);label(tip,'N','NORTH');}
 put(0,'ENDSEC',0,'EOF');return pairs.join('\r\n')+'\r\n';
}
const api={drawing};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDXFExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
