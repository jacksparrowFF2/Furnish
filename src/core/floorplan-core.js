/* Orthogonal tracing geometry. No DOM or network dependencies. */
(function (root) {
  'use strict';
  const fail = message => { throw new Error(message); };
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const point = p => Array.isArray(p) && p.length === 2 && p.every(v => finite(v) && v >= 0 && v <= 4096);
  const clone = v => JSON.parse(JSON.stringify(v));
  const zoneGeometry=()=>root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
  const layoutKey=walls=>JSON.stringify(walls.map(w=>[w.id,w.a,w.b,w.thickness,w.caps]));
  const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
  function validate(d) {
    if (!d || d.version !== 1 || !/^custom_[a-z0-9_]+$/.test(d.id) || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80) fail('Invalid plan identity');
    if (![d.width, d.height].every(v => finite(v) && v >= 1 && v <= 4096) || !finite(d.scale) || d.scale <= 0 || Math.max(d.width, d.height) * d.scale > 100000) fail('Invalid calibration');
    if (typeof d.image !== 'string' || d.image.length > 1000000 || !(d.source === 'dxf' && d.image === '') && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.image)) fail('Invalid reference image');
    if (!Array.isArray(d.walls) || d.walls.length < 4 || d.walls.length > 100 || !Array.isArray(d.openings) || d.openings.length > 100) fail('Invalid wall count');
    const ids = new Set();
    for (const w of d.walls) {
      if (!w || typeof w.id !== 'string' || ids.has(w.id) || !point(w.a) || !point(w.b) || !['n','e','b','low'].includes(w.kind) || !finite(w.thickness) || w.thickness < 60 || w.thickness > 600) fail('Invalid wall');
      ids.add(w.id);
      if(w.group!==undefined&&(typeof w.group!=='string'||!w.group||w.group.length>100))fail('Invalid wall group');
      if(w.caps!==undefined&&(!Array.isArray(w.caps)||w.caps.length!==2||w.caps.some(v=>!finite(v)||v<0||v>600)))fail('Invalid wall caps');
      if([w.a,w.b].some(p=>p[0]>d.width||p[1]>d.height))fail('Wall extends outside the reference canvas');
      if (w.a[0] !== w.b[0] && w.a[1] !== w.b[1]) fail('Only horizontal and vertical walls are supported');
      if (Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*d.scale < 100) fail('Wall too short');
    }
    const openingIds = new Set();
    for (const o of d.openings) {
      if (!o || typeof o.id !== 'string' || openingIds.has(o.id) || !ids.has(o.wall) || !['door','window','slide'].includes(o.kind) || !finite(o.t) || o.t < 0 || o.t > 1 || !finite(o.length) || o.length < 300 || o.length > 6000 || ![-1,1].includes(o.side) || typeof o.entry !== 'boolean') fail('Invalid opening');
      openingIds.add(o.id);
      if(o.reference!==undefined&&(typeof o.reference!=='string'||o.reference.length>200))fail('Invalid opening reference');
      if(o.review!==undefined&&!['door-gap','window-height'].includes(o.review))fail('Invalid opening review state');
      if(o.panels!==undefined&&(o.kind!=='slide'||![2,3].includes(o.panels)))fail('Invalid sliding door panels');
      if(o.hingeEnd!==undefined&&typeof o.hingeEnd!=='boolean'||o.hingeSide!==undefined&&![-1,1].includes(o.hingeSide)||o.name!==undefined&&(typeof o.name!=='string'||o.name.length>80)||o.bayGroup!==undefined&&typeof o.bayGroup!=='string')fail('Invalid opening attributes');
      if(o.sill!==undefined&&(!finite(o.sill)||o.sill<0||o.sill>2400)||o.head!==undefined&&(!finite(o.head)||o.head<=0||o.head>2800)||(o.kind==='window'&&!o.bay&&(o.head??2400)<=(o.sill??900)))fail('窗台高须为0–2400 mm，窗顶高于窗台且不超过2800 mm');
      if(o.bay!==undefined&&(!o.bay||o.kind!=='window'||!finite(o.bay.depth)||o.bay.depth<200||o.bay.depth>2000||!finite(o.bay.height)||o.bay.height<100||o.bay.height>1800||!finite(o.bay.head)||o.bay.head<=o.bay.height||o.bay.head>2800))fail('飘窗进深须为200–2000 mm，台高100–1800 mm，窗顶高于窗台且不超过2800 mm');
    }
    if (d.openings.filter(o => o.kind === 'door' && o.entry).length > 1) fail('Only one entry door is supported');
    if(d.markers!==undefined){
      if(!Array.isArray(d.markers)||d.markers.length>1000)fail('Invalid service point count');
      const markerIds=new Set();for(const m of d.markers){if(!m||typeof m.id!=='string'||!m.id||markerIds.has(m.id)||!['drain','gas'].includes(m.kind)||typeof m.name!=='string'||m.name.length>80||!point(m.at)||m.at[0]>d.width||m.at[1]>d.height||!finite(m.radius)||m.radius<=0||m.radius>1000)fail('Invalid service point');markerIds.add(m.id);}
    }
    if(d.zoneSplits!==undefined){
      if(!Array.isArray(d.zoneSplits)||d.zoneSplits.length>50)fail('功能区分界最多 50 条');
      const ids=new Set();for(const z of d.zoneSplits){if(!z||typeof z.id!=='string'||!/^zone_[a-z0-9_]+$/.test(z.id)||z.id.length>80||ids.has(z.id)||typeof z.parent!=='string'||![0,1].includes(z.axis)||!finite(z.at)||z.at<0||z.at>d[z.axis?'height':'width']||!Array.isArray(z.parts)||z.parts.length!==2||z.parts.some(p=>!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!['unassigned','living','dining','bedroom','study','kitchen','bathroom','balcony','hall','storage','other'].includes(p.use)))fail('功能区分界或名称用途无效');ids.add(z.id);}
    }
    if(d.zones!==undefined){
      if(!Array.isArray(d.zones)||d.zones.length>50)fail('指定功能区最多 50 个');
      const ids=new Set();for(const z of d.zones){if(!z||typeof z.id!=='string'||!/^area_[a-z0-9_]+$/.test(z.id)||z.id.length>80||ids.has(z.id)||typeof z.parent!=='string'||typeof z.name!=='string'||!z.name.trim()||z.name.length>80||!['unassigned','living','dining','bedroom','study','kitchen','bathroom','balcony','hall','storage','other'].includes(z.use)||!Array.isArray(z.poly)||z.poly.some(p=>!point(p)||p[0]>d.width||p[1]>d.height))fail('指定功能区属性无效');zoneGeometry().validatePolygon(z.poly);ids.add(z.id);}
      for(const z of d.zones)if(z.rings!==undefined){if(!Array.isArray(z.rings)||!z.rings.length||z.rings.length>20||z.rings.reduce((n,r)=>n+(Array.isArray(r)?r.length:101),0)>100||JSON.stringify(z.poly)!==JSON.stringify(z.rings[0]))fail('功能区多轮廓无效或超过 100 个顶点');for(const ring of z.rings){if(ring.some(p=>!point(p)||p[0]>d.width||p[1]>d.height))fail('功能区轮廓坐标无效');zoneGeometry().validatePolygon(ring);}}
    }
    if(d.beams!==undefined){
      if(!Array.isArray(d.beams)||d.beams.length>100)fail('Invalid beam count');
      const beamIds=new Set();for(const b of d.beams){if(!b||typeof b.id!=='string'||!b.id||beamIds.has(b.id)||typeof b.name!=='string'||b.name.length>80||!Array.isArray(b.poly)||b.poly.length<4||b.poly.length>200||b.poly.some(p=>!point(p)||p[0]>d.width||p[1]>d.height)||b.review!=='beam-height')fail('Invalid overhead beam');beamIds.add(b.id);}
    }
    if(d.roomLayout){const r=d.roomLayout;if(typeof r.walls!=='string'||!finite(r.scale)||!Array.isArray(r.rooms)||r.rooms.length>100||r.rooms.some(v=>!v||typeof v.id!=='string'||typeof v.name!=='string'||!Array.isArray(v.poly)||v.poly.length<4||v.poly.length>200||v.poly.some(p=>!Array.isArray(p)||p.length!==2||!p.every(finite))||!Array.isArray(v.at)||v.at.length!==2||!v.at.every(finite)))fail('Invalid original room layout');}
    return d;
  }
  function wallRect(w, scale, walls) {
    const a=w.a.map(v=>v*scale), b=w.b.map(v=>v*scale), h=w.thickness/2,axis=w.a[1]===w.b[1]?0:1;
    const cap=p=>{if(!walls)return h;const other=1-axis,neighbors=walls.filter(v=>v.id!==w.id&&(w.kind==='n'||v.kind!=='n')),junctions=neighbors.filter(v=>v.a[axis]===v.b[axis]&&Math.abs(v.a[axis]-p[axis])<1e-6&&p[other]>=Math.min(v.a[other],v.b[other])-1e-6&&p[other]<=Math.max(v.a[other],v.b[other])+1e-6);if(junctions.length)return Math.max(...junctions.map(v=>v.thickness/2));const collinear=neighbors.some(v=>v.a[other]===v.b[other]&&Math.abs(v.a[other]-p[other])<1e-6&&(v.a[axis]===p[axis]||v.b[axis]===p[axis]));return collinear?0:h;};
    const r=[Math.min(a[0],b[0])-h,Math.min(a[1],b[1])-h,Math.max(a[0],b[0])+h,Math.max(a[1],b[1])+h,w.kind],low=w.a[axis]<=w.b[axis]?w.a:w.b,high=low===w.a?w.b:w.a;r[axis]=low[axis]*scale-(w.caps?.[0]??cap(low));r[axis+2]=high[axis]*scale+(w.caps?.[1]??cap(high));return r;
  }
  function batchWalls(input,ids,values){
    if(!Array.isArray(ids)||!ids.length||ids.some(id=>!input.walls.some(w=>w.id===id)))fail('请选择有效墙段');
    const d=clone(input);
    for(const w of d.walls.filter(w=>ids.includes(w.id))){
      if(values.thickness!==undefined)w.thickness=values.thickness;
      if(values.kind!==undefined)w.kind=values.kind;
      if(values.group!==undefined){if(values.group)w.group=values.group;else delete w.group;}
    }
    build(d);return d;
  }
  // Coordinate decomposition gives exact wall-inner-face areas without a raster resolution error.
  function roomsFromWalls(rects) {
    const xs=[...new Set(rects.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b), ys=[...new Set(rects.flatMap(r=>[r[1],r[3]]))].sort((a,b)=>a-b);
    xs.unshift(xs[0]-1000); xs.push(xs.at(-1)+1000); ys.unshift(ys[0]-1000); ys.push(ys.at(-1)+1000);
    const nx=xs.length-1, ny=ys.length-1, cells=new Int32Array(nx*ny), index=(x,y)=>y*nx+x;
    for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) {
      const cx=(xs[x]+xs[x+1])/2, cy=(ys[y]+ys[y+1])/2;
      if(rects.some(r=>cx>r[0] && cx<r[2] && cy>r[1] && cy<r[3])) cells[index(x,y)]=-1;
    }
    const result=[]; let group=0;
    for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) {
      if(cells[index(x,y)]!==0) continue;
      const queue=[[x,y]], own=[]; cells[index(x,y)]=++group; let outside=false;
      for(let i=0;i<queue.length;i++) {
        const [cx,cy]=queue[i]; own.push([cx,cy]);
        if(cx===0||cy===0||cx===nx-1||cy===ny-1) outside=true;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const ax=cx+dx, ay=cy+dy;
          if(ax>=0&&ay>=0&&ax<nx&&ay<ny&&cells[index(ax,ay)]===0){cells[index(ax,ay)]=group;queue.push([ax,ay]);}
        }
      }
      if(outside) continue;
      const edges=new Map(), key=p=>p.join(',');
      const add=(a,b)=>{ if(edges.has(key(a))) fail('Room boundary touches itself; separate the wall junctions'); edges.set(key(a),[a,b]); };
      const same=(a,b)=>a>=0&&b>=0&&a<nx&&b<ny&&cells[index(a,b)]===group;
      for(const [cx,cy] of own) {
        const x0=xs[cx],x1=xs[cx+1],y0=ys[cy],y1=ys[cy+1];
        if(!same(cx,cy-1)) add([x0,y0],[x1,y0]);
        if(!same(cx+1,cy)) add([x1,y0],[x1,y1]);
        if(!same(cx,cy+1)) add([x1,y1],[x0,y1]);
        if(!same(cx-1,cy)) add([x0,y1],[x0,y0]);
      }
      const start=edges.values().next().value[0], poly=[]; let p=start;
      do { const e=edges.get(key(p)); if(!e) fail('Invalid room boundary'); edges.delete(key(p)); poly.push(p); p=e[1]; } while(key(p)!==key(start));
      if(edges.size) fail('Rooms with islands or courtyards are not supported in this version');
      const reduced=poly.filter((p,i)=>{ const a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length]; return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]); });
      const largest=own.reduce((best,c)=> (xs[c[0]+1]-xs[c[0]])*(ys[c[1]+1]-ys[c[1]])>best.area ? {area:(xs[c[0]+1]-xs[c[0]])*(ys[c[1]+1]-ys[c[1]]),c} : best,{area:0});
      const [cx,cy]=largest.c;
      result.push({id:'room'+(result.length+1),name:'房间 '+(result.length+1),poly:reduced,mat:'wood',at:[(xs[cx]+xs[cx+1])/2,(ys[cy]+ys[cy+1])/2]});
    }
    return result;
  }
  // Partition a room's exact coordinate grid. Functional boundaries have zero
  // thickness and never enter the wall/opening model or physical-room layout.
  function partitionZone(room,axis,edge){
    const coordinates=i=>[...new Set([...room.poly.map(p=>p[i]),...(i===axis?[edge]:[])])].sort((a,b)=>a-b);
    const xs=coordinates(0),ys=coordinates(1),nx=xs.length-1,ny=ys.length-1;
    if(nx*ny>20000)fail('功能区轮廓过于复杂');
    const cells=new Map();
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const p=[(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2];if(inside(p,room.poly))cells.set(y*nx+x,p[axis]<edge?0:1);}
    const result=[];
    while(cells.size){const [start,side]=cells.entries().next().value,queue=[start],own=new Set([start]);cells.delete(start);
      for(let n=0;n<queue.length;n++){const k=queue[n],x=k%nx,y=Math.floor(k/nx);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,q=yy*nx+xx;if(xx>=0&&xx<nx&&yy>=0&&yy<ny&&cells.get(q)===side){cells.delete(q);own.add(q);queue.push(q);}}}
      const edges=new Map(),key=p=>p.join(','),add=(a,b)=>{if(edges.has(key(a)))fail('功能区边界自接触，请调整分界位置');edges.set(key(a),[a,b]);};
      const has=(x,y)=>x>=0&&x<nx&&y>=0&&y<ny&&own.has(y*nx+x);let largest=null;
      for(const k of own){const x=k%nx,y=Math.floor(k/nx),a=xs[x],b=xs[x+1],c=ys[y],d=ys[y+1];
        if(!has(x,y-1))add([a,c],[b,c]);if(!has(x+1,y))add([b,c],[b,d]);if(!has(x,y+1))add([b,d],[a,d]);if(!has(x-1,y))add([a,d],[a,c]);
        if(!largest||(b-a)*(d-c)>largest.area)largest={area:(b-a)*(d-c),at:[(a+b)/2,(c+d)/2]};
      }
      const first=edges.values().next().value[0],poly=[];let p=first;
      do{const e=edges.get(key(p));if(!e)fail('功能区边界无效');edges.delete(key(p));poly.push(p);p=e[1];}while(key(p)!==key(first));
      if(edges.size)fail('功能区不能包含孤岛');
      const reduced=poly.filter((p,i)=>{const a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
      result.push({side,poly:reduced,at:largest.at});
    }
    if(result.length!==2||new Set(result.map(p=>p.side)).size!==2)fail('分界须把所选区域分成两个连续区域；请移动分界位置');
    return result.sort((a,b)=>a.side-b.side);
  }
  function applyZoneSplits(input,splits,scale){
    let rooms=clone(input);
    for(const z of splits){const index=rooms.findIndex(r=>r.id===z.parent&&r.counted!==false);if(index<0)fail('功能区对应空间不存在，请撤销或删除该分界后重新划分');
      const parent=rooms[index],parts=partitionZone(parent,z.axis,Math.round(z.at*scale*1e6)/1e6);
      const children=parts.map((p,i)=>({...parent,id:z.id+'_'+i,name:z.parts[i].name,use:z.parts[i].use,poly:p.poly,at:p.at,zone:true,splitId:z.id,parentRoom:parent.parentRoom||parent.id}));
      if(children.some(c=>rooms.some(r=>r.id===c.id)))fail('功能区编号冲突');
      rooms.splice(index,1,...children);
    }
    return rooms;
  }
  function splitZone(input,definition){const d=clone(input);(d.zoneSplits||=[]).push(clone(definition));
    if(d.zones?.some(z=>z.parent===definition.parent)){
      const children=build({...d,zones:[]}).rooms.filter(r=>r.splitId===definition.id),G=zoneGeometry();
      for(const z of d.zones.filter(z=>z.parent===definition.parent)){const poly=z.poly.map(p=>p.map(v=>v*d.scale)),child=children.find(r=>G.area(G.decompose([r.poly,poly],p=>G.inside(p,poly)&&!G.inside(p,r.poly)))<=.01);if(!child)fail('分界穿过已指定功能区，请移动分界或先调整该功能区边界');z.parent=child.id;}
    }
    build(d);return d;
  }
  function applyZones(input,zones,scale){
    if(!zones.length)return input;
    const G=zoneGeometry(),rooms=clone(input),result=[];
    if(zones.some(z=>!rooms.some(r=>r.id===z.parent&&r.counted!==false)))fail('指定功能区对应空间不存在');
    for(const room of rooms){
      const defs=zones.filter(z=>z.parent===room.id);if(!defs.length){result.push(room);continue;}
      const polys=defs.map(z=>G.ringPath(z.rings||[z.poly]).map(p=>p.map(v=>Math.round(v*scale*1e6)/1e6))),all=[room.poly,...polys];
      if(G.area(G.decompose(all,p=>polys.some(poly=>G.inside(p,poly))&&!G.inside(p,room.poly)))>.01)fail('指定区域超出原空间，不能跨越实际墙体或其他空间');
      if(G.area(G.decompose(polys,p=>polys.filter(poly=>G.inside(p,poly)).length>1))>.01)fail('功能区不能重叠，请调整边界');
      let total=0;
      defs.forEach((z,i)=>{const pieces=G.decompose([polys[i]],p=>G.inside(p,polys[i])),geometry=G.outline(pieces),area=G.area(pieces);if(area<10000)fail('功能区面积至少为 0.01 m²');total+=area;
        result.push({...room,...geometry,id:z.id,name:z.name,use:z.use,zone:true,areaId:z.id,parentArea:room.id,parentRoom:room.parentRoom||room.id});});
      const pieces=G.decompose(all,p=>G.inside(p,room.poly)&&!polys.some(poly=>G.inside(p,poly))),remaining=G.area(pieces);total+=remaining;
      if(remaining>.01)result.push({...room,...G.outline(pieces),zone:true,remainder:true,parentArea:room.id,parentRoom:room.parentRoom||room.id});
      if(Math.abs(total-Math.abs(G.signed(room.poly)))>Math.max(.1,total*1e-8))fail('功能区面积校验失败，未应用修改');
    }
    return result;
  }
  function addZone(input,definition){const d=clone(input);(d.zones||=[]).push(clone(definition));build(d);return d;}
  function editZone(input,id,values){const d=clone(input),z=d.zones?.find(z=>z.id===id);if(!z)fail('功能区不存在');for(const k of ['poly','name','use'])if(values[k]!==undefined)z[k]=clone(values[k]);if(z.rings&&values.poly)z.rings[0]=clone(z.poly);build(d);return d;}
  // Node shared edges before moving them, including partial edges and T junctions.
  // Every participant is validated as one transaction; IDs and metadata stay intact.
  function editZoneBoundary(input,id,poly,options={}){
    const d=clone(input),z=d.zones?.find(z=>z.id===id),G=zoneGeometry();if(!z)fail('功能区不存在');
    if(poly.length!==z.poly.length)fail('调整边界时不能改变顶点数量');
    const old=z.poly,eps=1e-6,near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<eps;
    const fraction=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy);return t>=-eps&&t<=1+eps&&Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<eps?t:null;};
    const moved=old.map((a,i)=>({a,b:old[(i+1)%old.length],c:poly[i],e:poly[(i+1)%old.length]})).filter(v=>!near(v.a,v.c)||!near(v.b,v.e));
    const map=p=>{for(const v of moved){const t=fraction(p,v.a,v.b);if(t!==null)return v.c.map((n,k)=>Math.round((n+t*(v.e[k]-n))*d.scale*1e6)/1e6/d.scale);}return [...p];};
    const group=[z],previous=[G.ringPath(z.rings||[old])];let shared=false;
    for(const other of d.zones.filter(o=>o.id!==id&&o.parent===z.parent)){
      const original=G.ringPath(other.rings||[other.poly]),newRings=[];let changed=false,edgeShared=false;
      for(const ring of other.rings||[other.poly]){const points=[];
      for(let i=0;i<ring.length;i++){
        const a=ring[i],b=ring[(i+1)%ring.length],cuts=[{p:a,t:0}];
        for(const p of old){const t=fraction(p,a,b);if(t!==null&&t>eps&&t<1-eps)cuts.push({p,t});}
        cuts.sort((a,b)=>a.t-b.t);
        const sharedSegment=(p,q)=>moved.some(v=>fraction(p.map((n,j)=>(n+q[j])/2),v.a,v.b)!==null);
        const push=p=>{if(!points.length||!near(points.at(-1),p))points.push([...p]);};
        for(let k=0;k<cuts.length;k++){const p=cuts[k].p,q=k+1<cuts.length?cuts[k+1].p:b,nextShared=sharedSegment(p,q),prevShared=k?sharedSegment(cuts[k-1].p,p):false;if(nextShared)edgeShared=true;const next=map(p);changed ||= !near(p,next);
          if(k&&!prevShared&&nextShared)push(p);push(next);if(k&&prevShared&&!nextShared)push(p);
        }
      }
      newRings.push(points);}
      if(changed){group.push(other);previous.push(original);other.poly=newRings[0];if(other.rings)other.rings=newRings;shared ||= edgeShared;}
    }
    z.poly=clone(poly);if(z.rings)z.rings[0]=clone(poly);build(d);
    let commonEdge=shared;
    if(Number.isInteger(options.edge)){
      const a=old[options.edge],b=old[(options.edge+1)%old.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),project=p=>((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length;
      commonEdge=previous.slice(1).some(ps=>ps.some((p,i)=>{const q=ps[(i+1)%ps.length],collinear=v=>Math.abs((v[0]-a[0])*dy-(v[1]-a[1])*dx)/length<eps;return collinear(p)&&collinear(q)&&Math.min(length,Math.max(project(p),project(q)))-Math.max(0,Math.min(project(p),project(q)))>eps;}));
    }
    if(commonEdge){const next=group.map(o=>G.ringPath(o.rings||[o.poly])),all=[...previous,...next],occupied=(p,ps)=>ps.some(poly=>G.inside(p,poly)),difference=G.area(G.decompose(all,p=>occupied(p,previous)!==occupied(p,next)))*d.scale*d.scale;if(difference>.1)fail('共用边界调整不能改变相邻区域的覆盖范围或产生缝隙；请沿原边界调整');}
    return d;
  }
  function removeZone(input,id){const d=clone(input);if(!d.zones?.some(z=>z.id===id))fail('功能区不存在');d.zones=d.zones.filter(z=>z.id!==id);build(d);return d;}
  function insertZoneVertex(input,id,edge,t=.5){
    const d=clone(input),z=d.zones?.find(z=>z.id===id);if(!z)fail('功能区不存在');
    if(!Number.isInteger(edge)||edge<0||edge>=z.poly.length||!finite(t)||t<=1e-6||t>=1-1e-6)fail('请在边的内部增加顶点');
    const a=z.poly[edge],b=z.poly[(edge+1)%z.poly.length],p=a.map((v,i)=>v+t*(b[i]-v)),eps=1e-6/d.scale;
    const same=q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=eps;
    for(const other of d.zones.filter(o=>o.parent===z.parent)){
      for(const ring of other.rings||[other.poly]){if(ring.some(same))continue;
      for(let i=0;i<ring.length;i++){const c=ring[i],e=ring[(i+1)%ring.length],dx=e[0]-c[0],dy=e[1]-c[1],u=((p[0]-c[0])*dx+(p[1]-c[1])*dy)/(dx*dx+dy*dy);
        if(u>0&&u<1&&Math.hypot(p[0]-c[0]-u*dx,p[1]-c[1]-u*dy)<=eps){ring.splice(i+1,0,[...p]);break;}
      }}
      if(other.rings)other.poly=clone(other.rings[0]);
    }
    build(d);return d;
  }
  function deleteZoneVertex(input,id,index){
    const z=input.zones?.find(z=>z.id===id);if(!z)fail('功能区不存在');
    if(!Number.isInteger(index)||index<0||index>=z.poly.length)fail('顶点不存在');
    if(z.poly.length<=3)fail('多边形至少保留三个顶点');
    const poly=clone(z.poly),old=poly[index],a=poly[(index+poly.length-1)%poly.length],b=poly[(index+1)%poly.length],l1=Math.hypot(old[0]-a[0],old[1]-a[1]),l2=Math.hypot(old[0]-b[0],old[1]-b[1]),t=l1/(l1+l2),p=a.map((v,i)=>v+t*(b[i]-v));poly[index]=p;
    // First straighten both sides atomically, then remove redundant shared nodes.
    const d=editZoneBoundary(input,id,poly),eps=1e-6/d.scale;
    const selected=d.zones.find(o=>o.id===id);selected.poly.splice(index,1);if(selected.rings)selected.rings[0]=clone(selected.poly);
    for(const other of d.zones.filter(o=>o.id!==id&&o.parent===z.parent)){
      const original=input.zones.find(o=>o.id===other.id);if(!(original.rings||[original.poly]).flat().some(q=>Math.hypot(q[0]-old[0],q[1]-old[1])<=eps))continue;
      for(const ring of other.rings||[other.poly]){const i=ring.findIndex(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<=eps);if(i<0||ring.length<=3)continue;
      const c=ring[(i+ring.length-1)%ring.length],e=ring[(i+1)%ring.length],q=ring[i];
      if(Math.abs((q[0]-c[0])*(e[1]-c[1])-(q[1]-c[1])*(e[0]-c[0]))/Math.hypot(e[0]-c[0],e[1]-c[1])<=eps)ring.splice(i,1);}
      if(other.rings)other.poly=clone(other.rings[0]);
    }
    build(d);return d;
  }
  function regionDefinition(geometry,scale,values){
    const G=zoneGeometry(),rings=geometry.rings.map(r=>r.map(p=>p.map(v=>v/scale))),outer=rings.findIndex(r=>G.signed(r)>0);if(outer<0)fail('功能区轮廓为空');if(outer)rings.unshift(rings.splice(outer,1)[0]);
    return {...values,poly:clone(rings[0]),...(rings.length>1?{rings}: {})};
  }
  function assertRegionCoverage(before,after){
    const G=zoneGeometry(),all=[...before,...after],old=p=>before.some(poly=>G.inside(p,poly)),next=p=>after.some(poly=>G.inside(p,poly));
    if(G.area(G.decompose(all,p=>old(p)!==next(p)))>.1||Math.abs(before.reduce((n,p)=>n+Math.abs(G.signed(p)),0)-after.reduce((n,p)=>n+Math.abs(G.signed(p)),0))>.1)fail('功能区覆盖范围或面积校验失败，未应用修改');
  }
  function splitRegion(input,id,definition){
    const d=clone(input),plan=build(d),room=plan.rooms.find(r=>r.id===id&&r.counted!==false);if(!room)fail('要拆分的区域不存在');
    if(!definition||!Array.isArray(definition.ids)||definition.ids.length!==2||new Set(definition.ids).size!==2||definition.ids.some(id=>plan.rooms.some(r=>r.id===id))||!Array.isArray(definition.parts)||definition.parts.length!==2)fail('请为拆分后的两个区域指定独立编号、名称和用途');
    const G=zoneGeometry(),parts=G.splitRegion(room.rings||[room.poly],definition.line?.map(p=>p.map(v=>v*d.scale))),existing=d.zones?.find(z=>z.id===id),parent=existing?.parent||room.parentArea||room.id;
    d.zones=(d.zones||[]).filter(z=>z.id!==id);for(let i=0;i<2;i++)d.zones.push(regionDefinition(parts[i],d.scale,{id:definition.ids[i],parent,...definition.parts[i]}));
    const next=build(d);assertRegionCoverage([room.poly],definition.ids.map(id=>next.rooms.find(r=>r.id===id).poly));return d;
  }
  function mergeRegions(input,ids,definition){
    let d=clone(input);const plan=build(d),G=zoneGeometry();if(!Array.isArray(ids)||ids.length!==2||new Set(ids).size!==2)fail('请选择两个不同的相邻区域');
    const rooms=ids.map(id=>plan.rooms.find(r=>r.id===id&&r.counted!==false));if(rooms.some(r=>!r))fail('要合并的区域不存在');
    if((rooms[0].parentRoom||rooms[0].id)!==(rooms[1].parentRoom||rooms[1].id)||!G.adjacent(rooms[0].rings||[rooms[0].poly],rooms[1].rings||[rooms[1].poly]))fail('只能合并同一物理空间内具有共用边的相邻区域');
    if(!definition||plan.rooms.some(r=>r.id===definition.id))fail('合并后须使用新的功能区编号');
    const parents=rooms.map(r=>d.zones?.find(z=>z.id===r.id)?.parent||r.parentArea||r.id);let parent=parents[0];
    if(parents[0]!==parents[1]){const split=d.zoneSplits?.find(z=>parents.includes(z.id+'_0')&&parents.includes(z.id+'_1'));if(!split||d.zoneSplits.some(z=>z.parent===split.id+'_0'||z.parent===split.id+'_1'))fail('请先合并同一级相邻区域，不能跨越已有的后续分界');d=removeZoneSplit(d,split.id);parent=split.parent;}
    const all=rooms.map(r=>r.poly),geometry=G.outline(G.decompose(all,p=>all.some(poly=>G.inside(p,poly))));d.zones=(d.zones||[]).filter(z=>!ids.includes(z.id));d.zones.push(regionDefinition(geometry,d.scale,{id:definition.id,parent,name:definition.name,use:definition.use}));
    const next=build(d);assertRegionCoverage(all,[next.rooms.find(r=>r.id===definition.id).poly]);return d;
  }
  function adjacentRegions(input,id){const plan=build(input),room=plan.rooms.find(r=>r.id===id&&r.counted!==false),G=zoneGeometry();return room?plan.rooms.filter(r=>r.id!==id&&r.counted!==false&&(room.parentRoom||room.id)===(r.parentRoom||r.id)&&G.adjacent(room.rings||[room.poly],r.rings||[r.poly])):[];}
  function editZoneSplit(input,id,at){const d=clone(input),z=d.zoneSplits?.find(z=>z.id===id);if(!z)fail('功能区分界不存在');z.at=at;build(d);return d;}
  function removeZoneSplit(input,id){const d=clone(input),removed=new Set([id]);if(!(d.zoneSplits||[]).some(z=>z.id===id))fail('功能区分界不存在');
    for(const z of d.zoneSplits||[])if([...removed].some(p=>z.parent===p+'_0'||z.parent===p+'_1'))removed.add(z.id);
    const parents=new Map();for(const z of d.zoneSplits.filter(z=>removed.has(z.id)))for(const side of [0,1])parents.set(z.id+'_'+side,z.parent);
    for(const z of d.zones||[])while(parents.has(z.parent))z.parent=parents.get(z.parent);
    d.zoneSplits=(d.zoneSplits||[]).filter(z=>!removed.has(z.id));build(d);return d;
  }
  function build(input) {
    // The DXF -> canvas -> mm round trip can differ by 1e-12 at shared faces.
    // Normalize below a micrometre before grid decomposition to avoid false cracks.
    const d=validate(clone(input)), rects=d.walls.map(w=>wallRect(w,d.scale,d.walls).map((v,i)=>i<4?Math.round(v*1e6)/1e6:v));
    let rooms=d.roomLayout?.walls===layoutKey(d.walls)&&d.roomLayout.scale===d.scale?clone(d.roomLayout.rooms):roomsFromWalls(rects); if(!rooms.length) fail('No enclosed room found. Close the wall outline first.');
    const walls=[],wins=[],doors=[],slides=[],wallRefs=[],doorRefs=[],winRefs=[],slideRefs=[];
    d.walls.forEach((w,i)=>{
      const r=rects[i], horizontal=w.a[1]===w.b[1], axis=horizontal?0:1, lo=r[axis], hi=r[axis+2];
      const centerA=w.a[axis]*d.scale, centerB=w.b[axis]*d.scale;
      const openings=d.openings.filter(o=>o.wall===w.id).map(o=>({...o,center:centerA+(centerB-centerA)*o.t})).sort((a,b)=>a.center-b.center);
      let pos=lo;
      for(const o of openings){
        const a=o.center-o.length/2,b=o.center+o.length/2;
        if(a<Math.min(centerA,centerB)+(w.caps?.[0]===0?0:w.thickness/2)-1e-6 || b>Math.max(centerA,centerB)-(w.caps?.[1]===0?0:w.thickness/2)+1e-6 || a<pos-1e-6) fail('An opening overlaps another opening or a wall corner');
        if(rects.some((q,j)=>j!==i && (horizontal ? Math.min(b,q[2])-Math.max(a,q[0])>1e-6 && Math.min(r[3],q[3])-Math.max(r[1],q[1])>1e-6 : Math.min(r[2],q[2])-Math.max(r[0],q[0])>1e-6 && Math.min(b,q[3])-Math.max(a,q[1])>1e-6))) fail('An opening overlaps a wall junction');
        if(a>pos){const segment=[...r];segment[axis]=pos;segment[axis+2]=a;walls.push(segment);wallRefs.push(w.id);}
        const opening=r.slice(0,4);opening[axis]=a;opening[axis+2]=b;
        if(o.kind==='window'&&o.bay){
          const normal=1-axis,c=[(opening[0]+opening[2])/2,(opening[1]+opening[3])/2];
          const probe=side=>{const p=[...c];p[normal]+=side*(w.thickness/2+50);return rooms.filter(room=>room.counted!==false).some(room=>inside(p,room.poly));};
          const plus=probe(1),minus=probe(-1);if(plus===minus)fail('飘窗必须放在房间与室外之间的外围墙上');
          const side=plus?-1:1,frame=60,base=c[normal]+side*w.thickness/2,outer=base+side*o.bay.depth,front=outer-side*frame/2,inner=c[normal]-side*w.thickness/2;
          const at=(along,out)=>{const p=[0,0];p[axis]=along;p[normal]=out;return p;};
          const box=opening.slice();box[axis]=a-frame;box[axis+2]=b+frame;box[normal]=Math.min(inner,outer);box[normal+2]=Math.max(inner,outer);
          const overlaps=(A,B)=>Math.min(A[2],B[2])-Math.max(A[0],B[0])>1e-6&&Math.min(A[3],B[3])-Math.max(A[1],B[1])>1e-6;
          const outerBox=box.slice();outerBox[normal]=Math.min(base,outer);outerBox[normal+2]=Math.max(base,outer);
          if(rects.some((q,j)=>j!==i&&(overlaps(opening,q)||overlaps(outerBox,q)))||rooms.filter(v=>v.counted===false).some(v=>overlaps(box,v.bayRect)))fail('飘窗与其他墙体或飘窗重叠');
          if(rooms.filter(v=>v.counted!==false).some(v=>inside([(outerBox[0]+outerBox[2])/2,(outerBox[1]+outerBox[3])/2],v.poly)))fail('飘窗外凸区域不能进入其他房间');
          rooms.push({id:'bay_'+o.id,name:'飘窗台',poly:[at(a,inner),at(b,inner),at(b,base),at(b+frame,base),at(b+frame,outer),at(a-frame,outer),at(a-frame,base),at(a,base)],mat:'marble',counted:false,bayRect:box,bayId:o.id,height:o.bay.height/1000});
          const frontRect=opening.slice();frontRect[axis]=a-frame;frontRect[axis+2]=b+frame;frontRect[normal]=front-frame/2;frontRect[normal+2]=front+frame/2;
          // The clear opening aligns with the side frames' inner edges;
          // each frame attaches to the exterior face of the adjoining wall end.
          const left=opening.slice(),right=opening.slice();for(const q of [left,right]){q[normal]=Math.min(base,outer);q[normal+2]=Math.max(base,outer);}
          left[axis]=a-frame;left[axis+2]=a;right[axis]=b;right[axis+2]=b+frame;
          for(const [part,q,line] of [['front',frontRect,[at(a-frame/2,front),at(b+frame/2,front)]],['left',left,[at(a-frame/2,base),at(a-frame/2,front)]],['right',right,[at(b+frame/2,base),at(b+frame/2,front)]]]){wins.push({rect:q,frameLine:line,sill:o.bay.height/1000,head:o.bay.head/1000,bayId:o.id,bayPart:part,paintRect:part==='front'?opening:null});winRefs.push(o.id+':'+part);}
        }
        else if(o.kind==='window'){wins.push({rect:opening,sill:(o.sill??900)/1000,head:(o.head??2400)/1000,...(o.bayGroup?{bayGroup:o.bayGroup}:{})});winRefs.push(o.id);}
        else if(o.kind==='slide'){slides.push({rect:opening,v:!horizontal,panels:o.panels||2});slideRefs.push(o.id);}
        else {
          let side=o.side;
          if(o.entry){
            const center=[(opening[0]+opening[2])/2,(opening[1]+opening[3])/2],normal=horizontal?1:0;
            const probe=s=>{const p=[...center];p[normal]+=s*(w.thickness/2+50);return rooms.some(room=>inside(p,room.poly));};
            const plus=probe(1),minus=probe(-1);
            if(plus===minus) fail('The entry door must connect an enclosed room to the outside');
            side=plus?1:-1;
          }
          const hinge=o.hingeEnd?b:a,sign=o.hingeEnd?-1:1,hingeSide=o.hingeSide??side;
          doors.push({name:o.name||(o.entry?'入户门':'房门'),rect:opening,h:horizontal?[hinge,hingeSide===1?r[3]:r[1]]:[hingeSide===1?r[2]:r[0],hinge],c:horizontal?[sign,0]:[0,sign],o:horizontal?[0,side]:[side,0],len:o.length,entry:o.entry,...(o.entry?{entryDirection:horizontal?[0,side]:[side,0]}:{})});doorRefs.push(o.id);
        }
        pos=b;
      }
      if(pos<hi){const segment=[...r];segment[axis]=pos;walls.push(segment);wallRefs.push(w.id);}
    });
    const extents=rects.concat(wins.map(w=>w.rect));
    const x0=Math.min(...extents.map(r=>r[0])),y0=Math.min(...extents.map(r=>r[1])),x1=Math.max(...extents.map(r=>r[2])),y1=Math.max(...extents.map(r=>r[3]));
    const physicalRooms=clone(rooms);
    rooms=applyZoneSplits(rooms,d.zoneSplits||[],d.scale);
    rooms=applyZones(rooms,d.zones||[],d.scale);
    const markers=(d.markers||[]).map(m=>({...clone(m),at:m.at.map(v=>v*d.scale)}));
    return {id:d.id,name:d.name.trim(),en:d.name.trim(),note:d.source==='dxf'?'自定义户型 · DXF 导入':'自定义户型 · 手工描图',noteEn:d.source==='dxf'?'Custom plan · DXF import':'Custom plan · manually traced',walls,wallRefs,doorRefs,winRefs,slideRefs,wins,doors,slides,rooms,physicalRooms,markers,beams:(d.beams||[]).map(b=>({...clone(b),poly:b.poly.map(p=>p.map(v=>v*d.scale))})),dims:[{h:1,at:y0-700,start:x0,segs:[x1-x0]},{h:0,at:x0-700,start:y0,segs:[y1-y0]}],bounds:{x:x0-1600,y:y0-1600,w:x1-x0+3200,h:y1-y0+3200},defaults:[],customDraft:d};
  }
  function assertWallEditable(w){if(w?.kind==='b')fail('Bearing wall is locked');}
  // Rejoin the preset's wall rectangles through their opening rectangles.
  // Explicit end caps preserve the preset's physical faces at junctions.
  function fromPlan(plan,id){
    const shift=1000,scale=10,groups=new Map();
    const add=(rect,kind,opening)=>{const h=rect[2]-rect[0]>=rect[3]-rect[1],axis=h?0:1,normal=1-axis,key=[axis,rect[normal],rect[normal+2]].join(':'),group=groups.get(key)||{axis,normal,lo:rect[normal],hi:rect[normal+2],parts:[]};group.parts.push({lo:rect[axis],hi:rect[axis+2],kind,opening});groups.set(key,group);};
    plan.walls.forEach(r=>add(r,r[4]));
    for(const [kind,list] of [['door',plan.doors],['window',plan.wins],['slide',plan.slides]])(list||[]).forEach((v,index)=>{const opening={kind,index,value:v};add(v.rect,null,opening);});
    const d={version:1,id,name:plan.name.slice(0,65)+' · 编辑副本',source:'dxf',image:'',scale,width:1,height:1,walls:[],openings:[]};
    for(const group of groups.values()){
      const sorted=group.parts.sort((a,b)=>a.lo-b.lo),runs=[];
      for(const part of sorted.filter(p=>!p.kind)){const neighbor=sorted.filter(p=>p.kind).sort((a,b)=>Math.min(Math.abs(a.hi-part.lo),Math.abs(a.lo-part.hi))-Math.min(Math.abs(b.hi-part.lo),Math.abs(b.lo-part.hi)))[0];part.kind=neighbor?.kind||'n';}
      for(const part of sorted){const last=runs.at(-1);if(last&&part.kind===last.parts[0].kind&&part.lo<=last.hi+1e-6){last.hi=Math.max(last.hi,part.hi);last.parts.push(part);}else runs.push({lo:part.lo,hi:part.hi,parts:[part]});}
      for(const run of runs){const {axis,normal}=group,center=(group.lo+group.hi)/2,a=[0,0],b=[0,0];a[axis]=(run.lo+shift)/scale;b[axis]=(run.hi+shift)/scale;a[normal]=b[normal]=(center+shift)/scale;
        const kind=run.parts[0].kind,wall={id:'preset_w'+d.walls.length,a,b,kind,thickness:group.hi-group.lo,caps:[0,0]};d.walls.push(wall);
        for(const p of run.parts.filter(p=>p.opening)){const {kind,index,value:v}=p.opening,o={id:'preset_'+kind+index,wall:wall.id,kind,t:((p.lo+p.hi)/2-run.lo)/(run.hi-run.lo),length:p.hi-p.lo,side:kind==='door'?(v.o[normal]<0?-1:1):1,entry:!!v.entry};if(kind==='door'){o.name=v.name||'房门';o.hingeEnd=v.c[axis]<0;o.hingeSide=Math.abs(v.h[normal]-group.hi)<Math.abs(v.h[normal]-group.lo)?1:-1;}if(kind==='slide')o.panels=v.panels===3?3:2;if(kind==='window'){o.sill=v.sill*1000;o.head=(v.head??2.4)*1000;if(v.bayGroup)o.bayGroup=v.bayGroup;}d.openings.push(o);}
      }
    }
    d.width=Math.max(...d.walls.flatMap(w=>[w.a[0],w.b[0]]))+100;d.height=Math.max(...d.walls.flatMap(w=>[w.a[1],w.b[1]]))+100;
    const rooms=clone(plan.rooms);for(const r of rooms){r.poly=r.poly.map(p=>p.map(v=>v+shift));r.at=(r.at||[r.poly.reduce((n,p)=>n+p[0],0)/r.poly.length-shift,r.poly.reduce((n,p)=>n+p[1],0)/r.poly.length-shift]).map(v=>v+shift);if(r.bayRect)r.bayRect=r.bayRect.map(v=>v+shift);}
    d.roomLayout={walls:layoutKey(d.walls),scale,rooms};build(d);return {draft:d,shift};
  }
  function editOpening(input,id,values){const d=clone(input),o=d.openings.find(v=>v.id===id);if(!o)fail('门窗不存在');Object.assign(o,values);if(o.review==='window-height'&&values.sill!==undefined&&values.head!==undefined||o.review==='door-gap'&&values.t!==undefined&&values.length!==undefined)delete o.review;build(d);return d;}
  function openingReferences(d,id){
    const o=d.openings.find(v=>v.id===id),w=d.walls.find(v=>v.id===o?.wall);if(!w)fail('门窗不存在');
    const axis=w.a[1]===w.b[1]?0:1,normal=1-axis,center=(w.a[axis]+(w.b[axis]-w.a[axis])*o.t)*d.scale,host=wallRect(w,d.scale,d.walls),refs=[];
    const add=(key,side,face,wallId)=>{const distance=side==='low'?center-o.length/2-face:face-center-o.length/2;if(distance<-1e-6)return;refs.push({id:key,side,face,axis,normal,wallId,distance:Math.max(0,distance),label:(axis===0?(side==='low'?'左侧':'右侧'):(side==='low'?'上侧':'下侧'))+(wallId?'墙面':'墙端')+' · '+Math.round(distance)+' mm'});};
    for(const v of d.walls){if(v.id===w.id||(v.a[1]===v.b[1]?0:1)===axis)continue;const r=wallRect(v,d.scale,d.walls);if(r[normal]>host[normal+2]+1e-6||r[normal+2]<host[normal]-1e-6)continue;if(r[axis+2]<=center)add(v.id+':low','low',r[axis+2],v.id);if(r[axis]>=center)add(v.id+':high','high',r[axis],v.id);}
    if(!refs.some(r=>r.side==='low'))add('end:low','low',host[axis],null);
    if(!refs.some(r=>r.side==='high'))add('end:high','high',host[axis+2],null);
    return refs.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
  }
  function openingPlacement(d,id,reference,distance,length){
    if(!finite(distance)||distance<0||!finite(length)||length<300||length>6000)fail('墙边净距须非负，洞口宽须为300–6000 mm');
    const ref=openingReferences(d,id).find(r=>r.id===reference);if(!ref)fail('参考墙面已改变，请重新选择');
    const o=d.openings.find(v=>v.id===id),w=d.walls.find(v=>v.id===o.wall),center=ref.face+(ref.side==='low'?1:-1)*(distance+length/2);
    return {t:(center-w.a[ref.axis]*d.scale)/((w.b[ref.axis]-w.a[ref.axis])*d.scale),length,reference};
  }
  function openingDimension(d,id,reference){
    const ref=openingReferences(d,id).find(v=>v.id===reference);if(!ref)return null;
    const o=d.openings.find(v=>v.id===id),w=d.walls.find(v=>v.id===o.wall),r=wallRect(w,d.scale,d.walls),a=[0,0],b=[0,0];
    a[ref.axis]=ref.face;b[ref.axis]=ref.face+(ref.side==='low'?1:-1)*ref.distance;a[ref.normal]=b[ref.normal]=r[ref.normal]-250;
    return {a,b,distance:ref.distance,wall:ref.wallId?wallRect(d.walls.find(w=>w.id===ref.wallId),d.scale,d.walls):null};
  }
  function assertBearingUnchanged(before,after){
    for(const w of before.walls.filter(w=>w.kind==='b')){
      const next=after.walls.find(v=>v.id===w.id);
      const physical=(v,d)=>[...v.a.map(x=>x*d.scale),...v.b.map(x=>x*d.scale),v.thickness,...(v.caps||[-1,-1])];
      if(!next||next.kind!=='b'||physical(w,before).some((v,i)=>Math.abs(v-physical(next,after)[i])>1e-6))fail('Bearing wall is locked');
      const openings=d=>JSON.stringify(d.openings.filter(o=>o.wall===w.id).sort((a,b)=>a.id.localeCompare(b.id)));
      if(openings(before)!==openings(after))fail('Bearing wall openings are locked');
    }
  }
  root.FurnishDraft={build,validate,splitZone,removeZoneSplit,applyZoneSplits,addZone,editZone,editZoneBoundary,insertZoneVertex,deleteZoneVertex,splitRegion,mergeRegions,adjacentRegions,removeZone,editZoneSplit,applyZones,roomsFromWalls,wallRect,batchWalls,fromPlan,editOpening,openingReferences,openingPlacement,openingDimension,assertWallEditable,assertBearingUnchanged};
  if(typeof module!=='undefined') module.exports=root.FurnishDraft;
})(typeof window==='undefined'?globalThis:window);
