/* Orthogonal tracing geometry. No DOM or network dependencies. */
(function (root) {
  'use strict';
  const fail = message => { throw new Error(message); };
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const point = p => Array.isArray(p) && p.length === 2 && p.every(v => finite(v) && v >= 0 && v <= 4096);
  const clone = v => JSON.parse(JSON.stringify(v));
  const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
  function validate(d) {
    if (!d || d.version !== 1 || !/^custom_[a-z0-9_]+$/.test(d.id) || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80) fail('Invalid plan identity');
    if (![d.width, d.height].every(v => finite(v) && v >= 1 && v <= 4096) || !finite(d.scale) || d.scale <= 0 || Math.max(d.width, d.height) * d.scale > 100000) fail('Invalid calibration');
    if (typeof d.image !== 'string' || d.image.length > 1000000 || !(d.source === 'dxf' && d.image === '') && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.image)) fail('Invalid reference image');
    if (!Array.isArray(d.walls) || d.walls.length < 4 || d.walls.length > 100 || !Array.isArray(d.openings) || d.openings.length > 100) fail('Invalid wall count');
    const ids = new Set();
    for (const w of d.walls) {
      if (!w || typeof w.id !== 'string' || ids.has(w.id) || !point(w.a) || !point(w.b) || !['n','e','b'].includes(w.kind) || !finite(w.thickness) || w.thickness < 60 || w.thickness > 600) fail('Invalid wall');
      ids.add(w.id);
      if (w.a[0] !== w.b[0] && w.a[1] !== w.b[1]) fail('Only horizontal and vertical walls are supported');
      if (Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*d.scale < 100) fail('Wall too short');
    }
    const openingIds = new Set();
    for (const o of d.openings) {
      if (!o || typeof o.id !== 'string' || openingIds.has(o.id) || !ids.has(o.wall) || !['door','window'].includes(o.kind) || !finite(o.t) || o.t < 0 || o.t > 1 || !finite(o.length) || o.length < 300 || o.length > 6000 || ![-1,1].includes(o.side) || typeof o.entry !== 'boolean') fail('Invalid opening');
      openingIds.add(o.id);
    }
    if (d.openings.filter(o => o.kind === 'door' && o.entry).length > 1) fail('Only one entry door is supported');
    return d;
  }
  function wallRect(w, scale) {
    const a=w.a.map(v=>v*scale), b=w.b.map(v=>v*scale), h=w.thickness/2;
    return [Math.min(a[0],b[0])-h,Math.min(a[1],b[1])-h,Math.max(a[0],b[0])+h,Math.max(a[1],b[1])+h,w.kind];
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
  function build(input) {
    const d=validate(clone(input)), rects=d.walls.map(w=>wallRect(w,d.scale));
    const rooms=roomsFromWalls(rects); if(!rooms.length) fail('No enclosed room found. Close the wall outline first.');
    const walls=[],wins=[],doors=[];
    d.walls.forEach((w,i)=>{
      const r=rects[i], horizontal=w.a[1]===w.b[1], axis=horizontal?0:1, lo=r[axis], hi=r[axis+2];
      const centerA=w.a[axis]*d.scale, centerB=w.b[axis]*d.scale;
      const openings=d.openings.filter(o=>o.wall===w.id).map(o=>({...o,center:centerA+(centerB-centerA)*o.t})).sort((a,b)=>a.center-b.center);
      let pos=lo;
      for(const o of openings){
        const a=o.center-o.length/2,b=o.center+o.length/2;
        if(a<Math.min(centerA,centerB)+w.thickness/2 || b>Math.max(centerA,centerB)-w.thickness/2 || a<pos) fail('An opening overlaps another opening or a wall corner');
        if(rects.some((q,j)=>j!==i && (horizontal ? Math.min(b,q[2])-Math.max(a,q[0])>0 && Math.min(r[3],q[3])-Math.max(r[1],q[1])>0 : Math.min(r[2],q[2])-Math.max(r[0],q[0])>0 && Math.min(b,q[3])-Math.max(a,q[1])>0))) fail('An opening overlaps a wall junction');
        if(a>pos){const segment=[...r];segment[axis]=pos;segment[axis+2]=a;walls.push(segment);}
        const opening=r.slice(0,4);opening[axis]=a;opening[axis+2]=b;
        if(o.kind==='window') wins.push({rect:opening,sill:0.9,head:2.4});
        else {
          let side=o.side;
          if(o.entry){
            const center=[(opening[0]+opening[2])/2,(opening[1]+opening[3])/2],normal=horizontal?1:0;
            const probe=s=>{const p=[...center];p[normal]+=s*(w.thickness/2+50);return rooms.some(room=>inside(p,room.poly));};
            const plus=probe(1),minus=probe(-1);
            if(plus===minus) fail('The entry door must connect an enclosed room to the outside');
            side=plus?1:-1;
          }
          doors.push({name:o.entry?'入户门':'房门',rect:opening,h:horizontal?[a,side===1?r[3]:r[1]]:[side===1?r[2]:r[0],a],c:horizontal?[1,0]:[0,1],o:horizontal?[0,side]:[side,0],len:o.length,entry:o.entry});
        }
        pos=b;
      }
      if(pos<hi){const segment=[...r];segment[axis]=pos;walls.push(segment);}
    });
    const x0=Math.min(...rects.map(r=>r[0])),y0=Math.min(...rects.map(r=>r[1])),x1=Math.max(...rects.map(r=>r[2])),y1=Math.max(...rects.map(r=>r[3]));
    return {id:d.id,name:d.name.trim(),en:d.name.trim(),note:d.source==='dxf'?'自定义户型 · DXF 导入':'自定义户型 · 手工描图',noteEn:d.source==='dxf'?'Custom plan · DXF import':'Custom plan · manually traced',walls,wins,doors,slides:[],rooms,dims:[{h:1,at:y0-700,start:x0,segs:[x1-x0]},{h:0,at:x0-700,start:y0,segs:[y1-y0]}],bounds:{x:x0-1600,y:y0-1600,w:x1-x0+3200,h:y1-y0+3200},defaults:[],customDraft:d};
  }
  root.FurnishDraft={build,validate,roomsFromWalls,wallRect};
  if(typeof module!=='undefined') module.exports=root.FurnishDraft;
})(typeof window==='undefined'?globalThis:window);
